import type { Nudge } from '../../lib/types'
import { AlertTriangle, X } from 'lucide-react'

type Props = {
  nudge: Nudge
  onDismiss: () => void
}

export function NudgeCard({ nudge, onDismiss }: Props) {
  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
      <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-900 flex-1">{nudge.message}</p>
      <button
        onClick={onDismiss}
        className="text-amber-500 hover:text-amber-700 shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
