// Parses the <<<RESUME_IMPORT v1>>> block Claude outputs for a tailored
// resume, and matches its [JOB: ...] blocks to saved work-history jobs.
// Forgiving by design — the text gets copied out of a chat window.
// Spec: ResumePasteImport_Spec.md

import type { ResumeJob, ResumeDraft } from './types'

export type ImportedJob = { company: string; title?: string; summary?: string; bullets: string }

export type ParsedResumeImport = {
  targetCompany?: string
  targetRole?: string
  profileParagraph?: string
  jobs: ImportedJob[]
  skills?: string
  technicalAbilities?: string
  warnings: string[]
}

// Glyphs need trailing whitespace (except •) so "3.5x growth" or "-5% cost"
// keep their leading characters.
const BULLET_GLYPH = /^\s*(?:[-*–—]\s+|•\s*|\d+[.)]\s+)/

function cleanLine(line: string): string {
  return line.replace(/\*\*|__/g, '').trimEnd()
}

function stripGlyph(line: string): string {
  return line.replace(BULLET_GLYPH, '').trim()
}

function nonEmpty(lines: string[]): string[] {
  return lines.map(l => l.trim()).filter(l => l.length > 0)
}

type Section =
  | { kind: 'preamble' }
  | { kind: 'profile' }
  | { kind: 'skills' }
  | { kind: 'tech' }
  | { kind: 'job'; company: string; title?: string }
  | { kind: 'unknown'; name: string }

function parseHeader(line: string): Section | null {
  const m = line.trim().match(/^\[\s*([^\]]+?)\s*\]$/)
  if (!m) return null
  const inner = m[1]!
  const job = inner.match(/^job\s*:\s*(.+)$/i)
  if (job) {
    const [company, title] = job[1]!.split('|').map(s => s.trim())
    return { kind: 'job', company: company!, title: title || undefined }
  }
  const name = inner.toLowerCase().replace(/\s+/g, ' ')
  if (name === 'profile') return { kind: 'profile' }
  if (name === 'skills') return { kind: 'skills' }
  if (name === 'technical abilities' || name === 'technical' || name === 'tech abilities') return { kind: 'tech' }
  return { kind: 'unknown', name: inner }
}

export function parseResumeImport(text: string): ParsedResumeImport {
  let body = text.replace(/\r\n?/g, '\n')

  const start = body.search(/<<<\s*RESUME_IMPORT[^>]*>>>/i)
  if (start >= 0) body = body.slice(start).replace(/^<<<[^>]*>>>/, '')
  const end = body.search(/<<<\s*END\s*>>>/i)
  if (end >= 0) body = body.slice(0, end)

  const lines = body.split('\n').filter(l => !/^\s*```/.test(l)).map(cleanLine)

  const result: ParsedResumeImport = { jobs: [], warnings: [] }
  let section: Section = { kind: 'preamble' }
  let buffer: string[] = []

  function flush() {
    switch (section.kind) {
      case 'profile': {
        const text = nonEmpty(buffer).join(' ')
        if (text) result.profileParagraph = text
        break
      }
      case 'skills':
        result.skills = nonEmpty(buffer).map(stripGlyph).filter(Boolean).join('\n')
        break
      case 'tech':
        result.technicalAbilities = nonEmpty(buffer).map(stripGlyph).filter(Boolean).join('\n')
        break
      case 'job': {
        let summary: string | undefined
        const bullets: string[] = []
        for (const line of nonEmpty(buffer)) {
          const s = line.match(/^summary\s*:\s*(.*)$/i)
          if (s) summary = s[1]!.trim() || undefined
          else {
            const b = stripGlyph(line)
            if (b) bullets.push(b)
          }
        }
        result.jobs.push({ company: section.company, title: section.title, summary, bullets: bullets.join('\n') })
        break
      }
      case 'unknown':
        result.warnings.push(`Ignored unknown section [${section.name}]`)
        break
      case 'preamble':
        break
    }
    buffer = []
  }

  for (const line of lines) {
    const header = parseHeader(line)
    if (header) {
      flush()
      section = header
      continue
    }
    if (section.kind === 'preamble') {
      const kv = line.match(/^\s*target[_ ](company|role)\s*:\s*(.*)$/i)
      if (kv) {
        const value = kv[2]!.trim()
        if (kv[1]!.toLowerCase() === 'company') result.targetCompany = value
        else result.targetRole = value
      }
      continue
    }
    buffer.push(line)
  }
  flush()

  return result
}

// ── Job matching ─────────────────────────────────────────────────────────────

const COMPANY_SUFFIXES = new Set(['inc', 'llc', 'corp', 'co', 'corporation', 'company', 'ltd'])

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !COMPANY_SUFFIXES.has(w))
    .join(' ')
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

export type MatchedImportJob = { jobId: string; summary?: string; bullets: string }

export function matchImportedJobs(
  parsed: ParsedResumeImport,
  jobs: ResumeJob[],
): { matched: MatchedImportJob[]; unmatched: ImportedJob[]; warnings: string[] } {
  const matched: MatchedImportJob[] = []
  const unmatched: ImportedJob[] = []
  const warnings: string[] = []

  for (const imp of parsed.jobs) {
    let candidates = jobs.filter(j => namesMatch(j.company, imp.company))
    if (imp.title) candidates = candidates.filter(j => namesMatch(j.title, imp.title!))

    if (candidates.length === 0) {
      unmatched.push(imp)
      continue
    }
    const sorted = [...candidates].sort((a, b) => a.order - b.order)
    if (sorted.length > 1) {
      warnings.push(`"${imp.company}" matched ${sorted.length} jobs — used ${sorted[0]!.title}. Add "| Title" to pick a different one.`)
    }
    matched.push({ jobId: sorted[0]!.id, summary: imp.summary, bullets: imp.bullets })
  }

  return { matched, unmatched, warnings }
}

// ── Merging into a draft ─────────────────────────────────────────────────────
// Only sections present in the paste are written; absent ones leave the draft
// alone. Only incoming jobs are written; other jobs keep their content.

export type ImportPatch = Partial<Pick<ResumeDraft,
  'targetCompany' | 'targetRole' | 'profileParagraph' | 'skills' | 'technicalAbilities' | 'jobContent'>>

export function buildImportPatch(
  draft: ResumeDraft,
  parsed: ParsedResumeImport,
  matched: MatchedImportJob[],
): { patch: ImportPatch; overwritesExisting: boolean; summary: string } {
  const patch: ImportPatch = {}
  let overwritesExisting = false

  const scalarFields = ['targetCompany', 'targetRole', 'profileParagraph', 'skills', 'technicalAbilities'] as const
  for (const field of scalarFields) {
    const value = parsed[field]
    if (value === undefined) continue
    if (draft[field].trim() && draft[field] !== value) overwritesExisting = true
    patch[field] = value
  }

  if (matched.length > 0) {
    const jobContent = { ...draft.jobContent }
    for (const m of matched) {
      const existing = jobContent[m.jobId]
      if (existing && (existing.summary.trim() || existing.bullets.trim())) overwritesExisting = true
      jobContent[m.jobId] = { summary: m.summary ?? '', bullets: m.bullets }
    }
    patch.jobContent = jobContent
  }

  const count = (s?: string) => (s ? s.split('\n').filter(Boolean).length : 0)
  const parts: string[] = []
  if (parsed.profileParagraph !== undefined) parts.push('profile')
  if (matched.length) parts.push(`${matched.length} job${matched.length === 1 ? '' : 's'}`)
  if (parsed.skills !== undefined) parts.push(`${count(parsed.skills)} skills`)
  if (parsed.technicalAbilities !== undefined) parts.push(`${count(parsed.technicalAbilities)} technical abilities`)
  const summary = parts.length ? `Imported ${parts.join(', ')}` : 'Nothing to import'

  return { patch, overwritesExisting, summary }
}
