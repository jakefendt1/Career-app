import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardPaste } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { parseResumeImport, matchImportedJobs, type ParsedResumeImport, type MatchedImportJob } from '../../lib/resume-import'
import { Dialog, DialogContent } from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'

type Props = {
  open: boolean
  onClose: () => void
  onApply: (parsed: ParsedResumeImport, matched: MatchedImportJob[]) => void
  applyLabel?: string
}

const SKIP = '__skip__'

function countLines(s?: string): number {
  return s ? s.split('\n').filter(Boolean).length : 0
}

/** Paste the <<<RESUME_IMPORT v1>>> block from Claude, preview how it maps
 *  onto the draft and work history, then apply it in one shot. */
export function PasteImportDialog({ open, onClose, onApply, applyLabel = 'Apply Import' }: Props) {
  const { resumeJobs } = useAppStore()
  const [text, setText] = useState('')
  const [assignments, setAssignments] = useState<Record<number, string>>({})

  const parsed = useMemo(() => (text.trim() ? parseResumeImport(text) : null), [text])
  const matchResult = useMemo(() => (parsed ? matchImportedJobs(parsed, resumeJobs) : null), [parsed, resumeJobs])

  const jobLabel = (id: string) => {
    const j = resumeJobs.find(r => r.id === id)
    return j ? `${j.title} — ${j.company}` : 'Unknown job'
  }

  const assignedFromUnmatched: MatchedImportJob[] = (matchResult?.unmatched ?? [])
    .map((imp, i) => ({ imp, jobId: assignments[i] }))
    .filter(({ jobId }) => jobId && jobId !== SKIP)
    .map(({ imp, jobId }) => ({ jobId: jobId!, summary: imp.summary, bullets: imp.bullets }))

  const allMatched = [...(matchResult?.matched ?? []), ...assignedFromUnmatched]

  const hasContent = !!parsed && (
    parsed.targetCompany !== undefined || parsed.targetRole !== undefined ||
    parsed.profileParagraph !== undefined || parsed.skills !== undefined ||
    parsed.technicalAbilities !== undefined || allMatched.length > 0
  )

  const warnings = [...(parsed?.warnings ?? []), ...(matchResult?.warnings ?? [])]

  // Manually assigning a block to a job that's already filled replaces it.
  const autoMatchedIds = new Set((matchResult?.matched ?? []).map(m => m.jobId))
  const seenAssigned = new Set<string>()
  for (const m of assignedFromUnmatched) {
    if (autoMatchedIds.has(m.jobId) || seenAssigned.has(m.jobId)) {
      warnings.push(`${jobLabel(m.jobId)} is getting two blocks; the last one wins.`)
    }
    seenAssigned.add(m.jobId)
  }

  const looksLikeWrongFormat = !!parsed && !hasContent && parsed.jobs.length === 0

  function reset() {
    setText('')
    setAssignments({})
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleApply() {
    if (!parsed || !hasContent) return
    onApply(parsed, allMatched)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose() }}>
      <DialogContent
        title="Paste Import"
        description="Paste the whole RESUME_IMPORT block from Claude — surrounding chat text is fine."
        className="max-w-3xl"
      >
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'<<<RESUME_IMPORT v1>>>\nTARGET_COMPANY: ...\n...\n<<<END>>>'}
          className="min-h-[180px] font-mono text-xs"
          autoFocus
        />

        {looksLikeWrongFormat && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Couldn't find any resume sections in that text. Paste the block that starts with
            <code className="mx-1 text-xs">&lt;&lt;&lt;RESUME_IMPORT v1&gt;&gt;&gt;</code>, or at least
            <code className="mx-1 text-xs">[PROFILE]</code>/<code className="mx-1 text-xs">[JOB: …]</code>/<code className="mx-1 text-xs">[SKILLS]</code> headers.
          </p>
        )}

        {parsed && !looksLikeWrongFormat && resumeJobs.length === 0 && parsed.jobs.length > 0 && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Your work history is empty, so job bullets have nowhere to go. Add your jobs under
            Resume Builder → Edit Work History first; profile and skills will still import.
          </p>
        )}

        {parsed && !looksLikeWrongFormat && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PreviewRow label="Target company" value={parsed.targetCompany} />
              <PreviewRow label="Target role" value={parsed.targetRole} />
            </div>
            <PreviewRow
              label="Profile"
              value={parsed.profileParagraph && (parsed.profileParagraph.length > 90 ? parsed.profileParagraph.slice(0, 90) + '…' : parsed.profileParagraph)}
            />

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {(matchResult?.matched ?? []).map((m, i) => (
                <div key={`m${i}`} className="flex items-center gap-2 px-3 py-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-slate-700">{jobLabel(m.jobId)}</span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {m.summary ? 'summary + ' : ''}{countLines(m.bullets)} bullets
                  </span>
                </div>
              ))}
              {(matchResult?.unmatched ?? []).map((imp, i) => (
                <div key={`u${i}`} className="flex items-center gap-2 px-3 py-2 bg-amber-50/60">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-slate-700">
                    "{imp.company}{imp.title ? ` | ${imp.title}` : ''}" — no match in work history
                  </span>
                  <select
                    value={assignments[i] ?? SKIP}
                    onChange={e => setAssignments(a => ({ ...a, [i]: e.target.value }))}
                    className="h-8 rounded border border-slate-300 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[220px]"
                  >
                    <option value={SKIP}>Skip</option>
                    {resumeJobs.map(j => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
                  </select>
                </div>
              ))}
              {parsed.jobs.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400">No [JOB: …] blocks found.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <PreviewRow label="Skills" value={parsed.skills !== undefined ? `${countLines(parsed.skills)} items` : undefined} />
              <PreviewRow label="Technical abilities" value={parsed.technicalAbilities !== undefined ? `${countLines(parsed.technicalAbilities)} items` : undefined} />
            </div>

            {warnings.length > 0 && (
              <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!hasContent}>
            <ClipboardPaste size={14} /> {applyLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PreviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="text-xs text-slate-500 shrink-0">{label}:</span>
      {value
        ? <span className="text-slate-800 truncate">{value}</span>
        : <span className="text-xs text-slate-300 italic">not in paste — unchanged</span>}
    </div>
  )
}
