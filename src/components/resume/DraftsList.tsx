import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { ResumeDraft } from '../../lib/types'
import { DraftCard } from './DraftCard'
import { PasteImportDialog } from './PasteImportDialog'
import { buildImportPatch, type ParsedResumeImport, type MatchedImportJob } from '../../lib/resume-import'
import { useToast } from '../ui/toast'
import { Button } from '../ui/button'
import { Plus, History, ClipboardPaste } from 'lucide-react'

function createBlankDraft(): ResumeDraft {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    targetCompany: '',
    targetRole: '',
    profileParagraph: '',
    jobContent: {},
    skills: '',
    technicalAbilities: '',
  }
}

interface DraftsListProps {
  companyFilter?: string
}

export function DraftsList({ companyFilter }: DraftsListProps) {
  const { resumeDrafts, resumeJobs, addResumeDraft, setEditingDraftId, setView } = useAppStore()
  const { toast } = useToast()
  const [pasteOpen, setPasteOpen] = useState(false)

  // New draft straight from a pasted RESUME_IMPORT block — paste, apply, then
  // it's open in the editor ready for Download .docx.
  function handleNewFromPaste(parsed: ParsedResumeImport, matched: MatchedImportJob[]) {
    const blank = { ...createBlankDraft(), targetCompany: companyFilter ?? '' }
    const { patch, summary } = buildImportPatch(blank, parsed, matched)
    const draft = { ...blank, ...patch }
    addResumeDraft(draft)
    setPasteOpen(false)
    setEditingDraftId(draft.id)
    setView('resume-editor')
    toast(summary)
  }

  function handleNewDraft() {
    const draft = { ...createBlankDraft(), targetCompany: companyFilter ?? '' }
    addResumeDraft(draft)
    setEditingDraftId(draft.id)
    setView('resume-editor')
  }

  const filtered = companyFilter
    ? resumeDrafts.filter(d => d.targetCompany.toLowerCase() === companyFilter.toLowerCase())
    : resumeDrafts

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  const newLabel = companyFilter ? `New Resume for ${companyFilter}` : 'New Draft'
  const emptyHeading = companyFilter
    ? `No resumes yet for ${companyFilter}.`
    : 'No drafts yet.'
  const emptyBody = companyFilter
    ? 'Create one to get started — it will be pre-filled with this company.'
    : 'Create a draft for each job application. Paste tailored content, then download a .docx.'

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="text-xl font-bold text-slate-900">
          {companyFilter ? `Resumes — ${companyFilter}` : 'Resume Drafts'}
        </h1>
        <div className="flex gap-2 flex-wrap">
          {!companyFilter && (
            <Button variant="secondary" onClick={() => setView('work-history')}>
              <History size={15} /> Edit Work History
            </Button>
          )}
          <Button variant="secondary" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste size={15} /> New from Paste
          </Button>
          <Button onClick={handleNewDraft}>
            <Plus size={15} /> {newLabel}
          </Button>
        </div>
      </div>

      <PasteImportDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onApply={handleNewFromPaste}
        applyLabel="Create Draft"
      />

      {resumeJobs.length === 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Set up your{' '}
          <button className="underline font-medium" onClick={() => setView('work-history')}>
            work history
          </button>{' '}
          first — drafts pull job details from there.
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 mb-2">{emptyHeading}</p>
          <p className="text-sm text-slate-400 mb-6">{emptyBody}</p>
          <Button onClick={handleNewDraft}><Plus size={15} /> {newLabel}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(draft => <DraftCard key={draft.id} draft={draft} />)}
        </div>
      )}
    </div>
  )
}
