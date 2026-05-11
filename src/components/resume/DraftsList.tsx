import { useAppStore } from '../../store/useAppStore'
import type { ResumeDraft } from '../../lib/types'
import { DraftCard } from './DraftCard'
import { Button } from '../ui/button'
import { Plus, History } from 'lucide-react'

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

export function DraftsList() {
  const { resumeDrafts, resumeJobs, addResumeDraft, setEditingDraftId, setView } = useAppStore()

  function handleNewDraft() {
    const draft = createBlankDraft()
    addResumeDraft(draft)
    setEditingDraftId(draft.id)
    setView('resume-editor')
  }

  const sorted = [...resumeDrafts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Resume Drafts</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setView('work-history')}>
            <History size={15} /> Edit Work History
          </Button>
          <Button onClick={handleNewDraft}>
            <Plus size={15} /> New Draft
          </Button>
        </div>
      </div>

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
          <p className="text-slate-500 mb-2">No drafts yet.</p>
          <p className="text-sm text-slate-400 mb-6">
            Create a draft for each job application. Paste tailored content, then download a .docx.
          </p>
          <Button onClick={handleNewDraft}><Plus size={15} /> Create First Draft</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(draft => <DraftCard key={draft.id} draft={draft} />)}
        </div>
      )}
    </div>
  )
}
