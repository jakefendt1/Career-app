import type { ResumeDraft } from '../../lib/types'
import { formatRelativeDate } from '../../lib/formatting'
import { useAppStore } from '../../store/useAppStore'
import { Card, CardBody } from '../ui/card'
import { Button } from '../ui/button'
import { Copy, Trash2, FileText } from 'lucide-react'

type Props = { draft: ResumeDraft }

export function DraftCard({ draft }: Props) {
  const { deleteResumeDraft, duplicateResumeDraft, setEditingDraftId, setView } = useAppStore()

  function handleOpen() {
    setEditingDraftId(draft.id)
    setView('resume-editor')
  }

  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={handleOpen}>
      <CardBody className="pt-5">
        <div className="flex items-start gap-2 mb-3">
          <FileText size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{draft.targetCompany || 'Untitled'}</h3>
            <p className="text-sm text-slate-500 truncate">{draft.targetRole || 'No role specified'}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">Updated {formatRelativeDate(draft.updatedAt)}</p>
        <div
          className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <Button variant="secondary" size="sm" onClick={handleOpen}>Open</Button>
          <Button variant="ghost" size="sm" onClick={() => duplicateResumeDraft(draft.id)}>
            <Copy size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              if (confirm('Delete this draft?')) deleteResumeDraft(draft.id)
            }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
