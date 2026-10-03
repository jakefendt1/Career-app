import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { generateResume, getResumeFilename, preflightResume } from '../../lib/resume-generator'
import { ResumeJobSection } from './ResumeJobSection'
import { JobEditDialog } from './JobEditDialog'
import { PasteImportDialog } from './PasteImportDialog'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { ArrowLeft, Download, RefreshCw, ClipboardPaste } from 'lucide-react'
import { useToast } from '../ui/toast'
import type { ResumeJob, ResumeDraft } from '../../lib/types'
import { buildImportPatch, type ParsedResumeImport, type MatchedImportJob } from '../../lib/resume-import'

type ScalarField = 'targetCompany' | 'targetRole' | 'profileParagraph' | 'skills' | 'technicalAbilities'
type PendingEdits = {
  fields: Partial<Pick<ResumeDraft, ScalarField>>
  jobs: Record<string, { summary?: string; bullets?: string }>
}
const SAVE_DELAY_MS = 500

export function DraftEditor() {
  const {
    resumeDrafts, editingDraftId, updateResumeDraft,
    resumeJobs, profile, setView, updateResumeJob,
  } = useAppStore()
  const { toast } = useToast()
  const draft = resumeDrafts.find(d => d.id === editingDraftId)
  const [editingJobInline, setEditingJobInline] = useState<ResumeJob | null>(null)
  const [generating, setGenerating] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  // Bumped whenever the draft is written from outside the inputs (import,
  // Load Base) so the uncontrolled (defaultValue) inputs remount with it.
  const [importNonce, setImportNonce] = useState(0)

  // Edits are batched, not replaced: every keystroke merges into `pending`,
  // and one save writes them all against the *latest* stored draft. (The old
  // single-timer version dropped an edit whenever a second field was touched
  // within 500 ms, and Download/Back discarded the last unsaved keystrokes.)
  const pendingRef = useRef<PendingEdits>({ fields: {}, jobs: {} })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftIdRef = useRef(editingDraftId)
  draftIdRef.current = editingDraftId

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const id = draftIdRef.current
    const { fields, jobs } = pendingRef.current
    pendingRef.current = { fields: {}, jobs: {} }
    if (!id || (Object.keys(fields).length === 0 && Object.keys(jobs).length === 0)) return

    const latest = useAppStore.getState().resumeDrafts.find(d => d.id === id)
    if (!latest) return
    const update: Partial<ResumeDraft> = { ...fields }
    if (Object.keys(jobs).length > 0) {
      const jobContent = { ...latest.jobContent }
      for (const [jobId, change] of Object.entries(jobs)) {
        jobContent[jobId] = { ...(jobContent[jobId] ?? { summary: '', bullets: '' }), ...change }
      }
      update.jobContent = jobContent
    }
    useAppStore.getState().updateResumeDraft(id, update)
  }, [])

  // Save whatever is pending when leaving the editor or closing the tab.
  useEffect(() => {
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [flush])

  if (!draft) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">This draft no longer exists.</p>
        <Button variant="secondary" onClick={() => setView('resume')}><ArrowLeft size={14} /> Back to Drafts</Button>
      </div>
    )
  }

  function schedule() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  function queueField(update: Partial<Pick<ResumeDraft, ScalarField>>) {
    Object.assign(pendingRef.current.fields, update)
    schedule()
  }

  function handleJobContentChange(jobId: string, change: { summary?: string; bullets?: string }) {
    pendingRef.current.jobs[jobId] = { ...pendingRef.current.jobs[jobId], ...change }
    schedule()
  }

  /** Save pending edits, then return the freshly stored draft. */
  function flushAndRead(): ResumeDraft | undefined {
    flush()
    return useAppStore.getState().resumeDrafts.find(d => d.id === draftIdRef.current)
  }

  function handleLoadBase() {
    const current = flushAndRead()
    if (!current) return

    // Most recently updated other draft that actually has content.
    const base = resumeDrafts
      .filter(d => d.id !== current.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .find(d => d.profileParagraph.trim() || d.skills.trim() || d.technicalAbilities.trim() ||
        Object.values(d.jobContent).some(c => c.summary?.trim() || c.bullets?.trim()))
    if (!base) { toast('No other draft with content to load from', 'info'); return }

    // Fill only what's empty here; Load Base never overwrites your edits.
    const jobContent = { ...current.jobContent }
    let filled = 0
    for (const [jobId, c] of Object.entries(base.jobContent)) {
      const mine = jobContent[jobId]
      if (!mine || (!mine.summary?.trim() && !mine.bullets?.trim())) {
        if (c.summary?.trim() || c.bullets?.trim()) { jobContent[jobId] = { ...c }; filled++ }
      }
    }
    const update: Partial<ResumeDraft> = { jobContent }
    for (const f of ['profileParagraph', 'skills', 'technicalAbilities'] as const) {
      if (!current[f].trim() && base[f].trim()) { update[f] = base[f]; filled++ }
    }
    if (filled === 0) { toast('Nothing to load, every section already has content', 'info'); return }

    updateResumeDraft(current.id, update)
    setImportNonce(n => n + 1)
    toast(`Filled ${filled} empty section${filled === 1 ? '' : 's'} from "${base.targetCompany || 'Untitled'}"`)
  }

  function handleImport(parsed: ParsedResumeImport, matched: MatchedImportJob[]) {
    const current = flushAndRead()
    if (!current) return
    const { patch: importPatch, overwritesExisting, summary } = buildImportPatch(current, parsed, matched)
    if (overwritesExisting && !confirm('This will overwrite existing content in this draft. Continue?')) return
    updateResumeDraft(current.id, importPatch)
    setImportNonce(n => n + 1)
    setPasteOpen(false)
    toast(summary)
  }

  async function handleDownload() {
    const current = flushAndRead()
    if (!current) return
    const sorted = [...resumeJobs].sort((a, b) => a.order - b.order)

    const { errors, warnings } = preflightResume(profile, sorted, current)
    if (errors.length > 0) { toast(errors[0]!, 'error'); return }
    if (warnings.length > 0 && !confirm(`Before you download:\n\n- ${warnings.join('\n- ')}\n\nDownload anyway?`)) return

    setGenerating(true)
    try {
      const blob = await generateResume(profile, sorted, current)
      const filename = getResumeFilename(profile, current)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoke after the browser has started the download; some browsers
      // cancel it if the URL is revoked synchronously.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast(`Downloaded: ${filename}`)
    } catch (err) {
      console.error(err)
      toast(`Could not generate the resume: ${err instanceof Error ? err.message : 'unknown error'}`, 'error')
    } finally {
      setGenerating(false)
    }
  }

  function patch(update: Partial<ResumeDraft>) {
    flush()
    updateResumeDraft(draft!.id, update)
  }

  const sortedJobs = [...resumeJobs].sort((a, b) => a.order - b.order)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => { flush(); setView('resume') }}>
          <ArrowLeft size={14} /> Drafts
        </Button>
        <h1 className="text-lg font-bold text-slate-900 flex-1 truncate">
          {draft.targetCompany || 'New Draft'}{draft.targetRole ? ` — ${draft.targetRole}` : ''}
        </h1>
      </div>

      <div key={importNonce} className="space-y-5 mb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-lg p-4">
          <Input
            label="Target Company"
            defaultValue={draft.targetCompany}
            onChange={e => queueField({ targetCompany: e.target.value })}
            placeholder="Doosan Robotics"
          />
          <Input
            label="Target Role"
            defaultValue={draft.targetRole}
            onChange={e => queueField({ targetRole: e.target.value })}
            placeholder="Field Sales Engineer"
          />
          {profile.photoDataUrl && (
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.includePhoto !== false}
                onChange={e => patch({ includePhoto: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <img src={profile.photoDataUrl} alt="" className="w-6 h-6 rounded-full" />
              Include photo on this resume
            </label>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <Textarea
            label="Profile Paragraph"
            defaultValue={draft.profileParagraph}
            onChange={e => queueField({ profileParagraph: e.target.value })}
            placeholder="Paste your tailored 2-3 sentence summary here..."
            className="min-h-[100px]"
            hint="This appears at the top of the resume under your name."
          />
        </div>

        {sortedJobs.length === 0 && (
          <div className="text-center py-8 bg-white border border-dashed border-slate-300 rounded-lg">
            <p className="text-slate-500 text-sm mb-2">No jobs in your work history yet.</p>
            <Button variant="secondary" size="sm" onClick={() => setView('work-history')}>
              Set up work history
            </Button>
          </div>
        )}

        {sortedJobs.map(job => (
          <ResumeJobSection
            key={job.id}
            job={job}
            content={draft.jobContent[job.id]}
            onChange={change => handleJobContentChange(job.id, change)}
            onEditJob={() => setEditingJobInline(job)}
          />
        ))}

        <div className="grid grid-cols-2 gap-4 bg-white border border-slate-200 rounded-lg p-4">
          <Textarea
            label="Skills (one per line)"
            defaultValue={draft.skills}
            onChange={e => queueField({ skills: e.target.value })}
            placeholder={`Consultative Sales & Solution Selling\nAccount Management\n...`}
            className="min-h-[140px]"
          />
          <Textarea
            label="Technical Abilities (one per line)"
            defaultValue={draft.technicalAbilities}
            onChange={e => queueField({ technicalAbilities: e.target.value })}
            placeholder={`Industrial Automation & Robotics\nCAD / SolidWorks\n...`}
            className="min-h-[140px]"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between z-40">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleLoadBase}>
            <RefreshCw size={14} /> Load Base
          </Button>
          <Button variant="secondary" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste size={14} /> Paste Import
          </Button>
        </div>
        <Button onClick={handleDownload} disabled={generating}>
          <Download size={14} /> {generating ? 'Generating...' : 'Download .docx'}
        </Button>
      </div>

      <PasteImportDialog open={pasteOpen} onClose={() => setPasteOpen(false)} onApply={handleImport} />

      {editingJobInline && (
        <JobEditDialog
          job={editingJobInline}
          open
          onClose={() => setEditingJobInline(null)}
          onSave={data => {
            updateResumeJob(editingJobInline.id, data)
            setEditingJobInline(null)
          }}
        />
      )}
    </div>
  )
}
