// Parses the <<<RESUME_IMPORT v1>>> block Claude outputs for a tailored
// resume, and matches its [JOB: ...] blocks to saved work-history jobs.
// Forgiving by design — the text gets copied out of a chat window.
// Spec: ResumePasteImport_Spec.md

import type { ResumeJob, ResumeDraft } from './types'
import { cleanInline, stripListGlyph, splitListItems } from './resume-text'

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

type Section =
  | { kind: 'preamble' }
  | { kind: 'profile' }
  | { kind: 'skills' }
  | { kind: 'tech' }
  | { kind: 'job'; company: string; title?: string }
  | { kind: 'unknown'; name: string }

const KNOWN_SECTIONS: Record<string, Section['kind']> = {
  'profile': 'profile',
  'summary': 'profile',
  'professional summary': 'profile',
  'skills': 'skills',
  'core skills': 'skills',
  'technical abilities': 'tech',
  'technical': 'tech',
  'tech abilities': 'tech',
  'technical skills': 'tech',
}

/** Recognize a section header. Canonical form is "[SKILLS]" / "[JOB: X]",
 *  but Markdown headings ("## Skills"), bold, and a trailing colon are
 *  tolerated for known names. Bare (unbracketed) lines only count when they
 *  are exactly a known section name, so ordinary text is never mistaken. */
function parseHeader(rawLine: string): Section | null {
  const line = rawLine.trim().replace(/^#{1,6}\s*/, '')
  const bracketed = line.match(/^\[\s*([^\]]+?)\s*\]\s*:?$/)
  const inner = bracketed ? bracketed[1]! : line.replace(/:$/, '').trim()

  const job = inner.match(/^job\s*:\s*(.+)$/i)
  if (job && (bracketed || rawLine.trim().startsWith('#'))) {
    const [company, title] = job[1]!.split('|').map(x => x.trim())
    if (!company) return null
    return { kind: 'job', company, title: title || undefined }
  }

  const name = inner.toLowerCase().replace(/\s+/g, ' ')
  const kind = KNOWN_SECTIONS[name]
  if (kind && kind !== 'job' && kind !== 'unknown' && kind !== 'preamble') return { kind } as Section
  if (bracketed && !/^job\b/i.test(inner)) return { kind: 'unknown', name: inner }
  return null
}

const TARGET_KV = /^\s*target[_ ]?(company|role)\s*:\s*(.*)$/i
const SUMMARY_KV = /^summary\s*:\s*(.*)$/i
const HAS_GLYPH = /^\s*(?:[-*–—]\s+|[•·▪◦‣]\s*|\d+[.)]\s+)/

export function parseResumeImport(text: string): ParsedResumeImport {
  let body = text.replace(/\r\n?/g, '\n')

  const prelude: string[] = []
  const startMatch = body.match(/<<<\s*RESUME_IMPORT([^>]*)>>>/i)
  if (startMatch) {
    body = body.slice(startMatch.index! + startMatch[0].length)
    const version = startMatch[1]!.trim().toLowerCase()
    if (version && version !== 'v1') prelude.push(`Block says "${version}" — parsed it as v1`)
  }
  const end = body.search(/<<<\s*END\s*>>>/i)
  if (end >= 0) body = body.slice(0, end)

  const lines = body
    .split('\n')
    .filter(l => !/^\s*```/.test(l))
    .map(l => cleanInline(l))

  const result: ParsedResumeImport = { jobs: [], warnings: prelude }
  let section: Section = { kind: 'preamble' }
  let buffer: string[] = []

  function setList(field: 'skills' | 'technicalAbilities', label: string) {
    const items = splitListItems(buffer.join('\n'))
    if (result[field] !== undefined) {
      result.warnings.push(`${label} appeared twice — combined them`)
      const merged = splitListItems([result[field], ...items].join('\n'))
      result[field] = merged.join('\n')
    } else {
      result[field] = items.join('\n')
    }
  }

  function flush() {
    switch (section.kind) {
      case 'profile': {
        const paragraph = buffer.filter(Boolean).join(' ')
        if (paragraph) {
          if (result.profileParagraph !== undefined) {
            result.warnings.push('[PROFILE] appeared twice — used the last one')
          }
          result.profileParagraph = paragraph
        }
        break
      }
      case 'skills':
        setList('skills', '[SKILLS]')
        break
      case 'tech':
        setList('technicalAbilities', '[TECHNICAL ABILITIES]')
        break
      case 'job':
        result.jobs.push(parseJobBlock(section.company, section.title, buffer))
        break
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
    // TARGET_* lines are honored anywhere, not just at the top.
    const kv = line.match(TARGET_KV)
    if (kv) {
      const value = kv[2]!.trim()
      if (kv[1]!.toLowerCase() === 'company') result.targetCompany = value
      else result.targetRole = value
      continue
    }
    if (section.kind === 'preamble') continue
    if (line) buffer.push(line)
  }
  flush()

  return result
}

/** A job block: optional SUMMARY line, then bullets. When the block uses
 *  bullet glyphs, a line *without* one is a hard-wrapped continuation of the
 *  previous bullet (or of the summary) — common when copying from chat. */
function parseJobBlock(company: string, title: string | undefined, lines: string[]): ImportedJob {
  const usesGlyphs = lines.some(l => HAS_GLYPH.test(l))
  let summary: string | undefined
  const bullets: string[] = []

  for (const line of lines) {
    const s = line.match(SUMMARY_KV)
    if (s) {
      summary = s[1]!.trim() || undefined
      continue
    }
    const isNewBullet = !usesGlyphs || HAS_GLYPH.test(line)
    const text = stripListGlyph(line)
    if (!text) continue
    if (isNewBullet) bullets.push(text)
    else if (bullets.length > 0) bullets[bullets.length - 1] += ' ' + text
    else summary = summary ? `${summary} ${text}` : text
  }

  return { company, title, summary, bullets: bullets.join('\n') }
}

// ── Job matching ─────────────────────────────────────────────────────────────

const COMPANY_SUFFIXES = new Set(['inc', 'llc', 'corp', 'co', 'corporation', 'company', 'ltd'])

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Körber → Korber
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

  const taken = new Set<string>()

  for (const imp of parsed.jobs) {
    const byCompany = jobs.filter(j => namesMatch(j.company, imp.company))
    let candidates = byCompany
    if (imp.title) {
      const byTitle = byCompany.filter(j => namesMatch(j.title, imp.title!))
      if (byTitle.length > 0) candidates = byTitle
      else if (byCompany.length > 0) {
        warnings.push(`No "${imp.company}" job titled "${imp.title}" — matched on company only.`)
      }
    }

    if (candidates.length === 0) {
      unmatched.push(imp)
      continue
    }

    // Most recent first; skip jobs an earlier block already filled, so two
    // [JOB: Intralox] blocks land on two different Intralox positions.
    const sorted = [...candidates].sort((a, b) => a.order - b.order)
    const pick = sorted.find(j => !taken.has(j.id)) ?? sorted[0]!
    if (taken.has(pick.id)) {
      warnings.push(`"${imp.company}" appears more than once — the later block replaced the earlier one.`)
    } else if (sorted.length > 1 && !imp.title) {
      warnings.push(`"${imp.company}" matched ${sorted.length} jobs — used ${pick.title}. Add "| Title" to pick a different one.`)
    }
    taken.add(pick.id)
    matched.push({ jobId: pick.id, summary: imp.summary, bullets: imp.bullets })
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
