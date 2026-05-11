import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { generateResume, getResumeFilename } from '../../lib/resume-generator'
import { ResumeJobSection } from './ResumeJobSection'
import { JobEditDialog } from './JobEditDialog'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { useToast } from '../ui/toast'
import type { ResumeJob } from '../../lib/types'

export function DraftEditor() {
  const {
    resumeDrafts, editingDraftId, updateResumeDraft,
    resumeJobs, profile, setView, updateResumeJob,
  } = useAppStore()
  const { toast } = useToast()
  const draft = resumeDrafts.find(d => d.id === editingDraftId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editingJobInline, setEditingJobInline] = useState<ResumeJob | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  if (!draft) return <div className="text-slate-400 py-10 text-center">Draft not found.</div>

  function patch(update: Parameters<typeof updateResumeDraft>[1]) {
    if (!draft) return
    updateResumeDraft(draft.id, update)
  }

  function debouncedPatch(update: Parameters<typeof updateResumeDraft>[1]) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => patch(update), 500)
  }

  function handleJobContentChange(jobId: string, change: { summary?: string; bullets?: string }) {
    if (!draft) return
    const current = draft.jobContent[jobId] ?? { summary: '', bullets: '' }
    debouncedPatch({
      jobContent: {
        ...draft.jobContent,
        [jobId]: { ...current, ...change },
      },
    })
  }

  function handleLoadBase() {
    if (Object.values(draft.jobContent).some(c => c.bullets || c.summary) || draft.profileParagraph || draft.skills) {
      if (!confirm('This will overwrite your current draft content. Continue?')) return
    }

    // Find the most recently updated OTHER draft with non-empty content
    const others = resumeDrafts
      .filter(d => d.id !== draft.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    const base = others[0]
    if (!base) { toast('No other drafts to load from', 'info'); return }

    patch({
      profileParagraph: base.profileParagraph || draft.profileParagraph,
      skills: base.skills || draft.skills,
      technicalAbilities: base.technicalAbilities || draft.technicalAbilities,
      jobContent: { ...base.jobContent, ...draft.jobContent },
    })
    toast('Loaded base from most recent draft')
  }

  async function handleDownload() {
    setGenerating(true)
    try {
      // Flush any pending debounced patches first
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      const sorted = [...resumeJobs].sort((a, b) => a.order - b.order)
      const blob = await generateResume(profile, sorted, draft)
      const filename = getResumeFilename(profile, draft)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast(`Downloaded: ${filename}`)
    } catch (err) {
      console.error(err)
      toast('Failed to generate resume', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const sortedJobs = [...resumeJobs].sort((a, b) => a.order - b.order)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setView('resume')}>
          <ArrowLeft size={14} /> Drafts
        </Button>
        <h1 className="text-lg font-bold text-slate-900 flex-1 truncate">
          {draft.targetCompany || 'New Draft'}{draft.targetRole ? ` — ${draft.targetRole}` : ''}
        </h1>
      </div>

      <div className="space-y-5 mb-32">
        <div className="grid grid-cols-2 gap-4 bg-white border border-slate-200 rounded-lg p-4">
          <Input
            label="Target Company"
            defaultValue={draft.targetCompany}
            onChange={e => debouncedPatch({ targetCompany: e.target.value })}
            placeholder="Doosan Robotics"
          />
          <Input
            label="Target Role"
            defaultValue={draft.targetRole}
            onChange={e => debouncedPatch({ targetRole: e.target.value })}
            placeholder="Field Sales Engineer"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <Textarea
            label="Profile Paragraph"
            defaultValue={draft.profileParagraph}
            onChange={e => debouncedPatch({ profileParagraph: e.target.value })}
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
            onChange={e => debouncedPatch({ skills: e.target.value })}
            placeholder={`Consultative Sales & Solution Selling\nAccount Management\n...`}
            className="min-h-[140px]"
          />
          <Textarea
            label="Technical Abilities (one per line)"
            defaultValue={draft.technicalAbilities}
            onChange={e => debouncedPatch({ technicalAbilities: e.target.value })}
            placeholder={`Industrial Automation & Robotics\nCAD / SolidWorks\n...`}
            className="min-h-[140px]"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between z-40">
        <Button variant="secondary" onClick={handleLoadBase}>
          <RefreshCw size={14} /> Load Base
        </Button>
        <Button onClick={handleDownload} disabled={generating}>
          <Download size={14} /> {generating ? 'Generating...' : 'Download .docx'}
        </Button>
      </div>

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
