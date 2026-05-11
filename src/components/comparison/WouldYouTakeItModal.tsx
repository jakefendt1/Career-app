import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'

type Props = {
  open: boolean
  targetCompany: string
  onAnswer: (answer: 'yes' | 'no') => void
}

export function WouldYouTakeItModal({ open, targetCompany, onAnswer }: Props) {
  return (
    <Dialog open={open}>
      <DialogContent
        title="Honesty Check"
        description={`Before seeing the verdict — answer this honestly.`}
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <div className="mt-2 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-base font-medium text-slate-900 leading-relaxed">
            If <span className="text-blue-600 font-semibold">{targetCompany}</span> paid the exact same OTE as your current role — would you still take it?
          </p>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => onAnswer('yes')}>
            Yes — it's about more than money
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => onAnswer('no')}>
            No — comp is doing the heavy lifting
          </Button>
        </div>

        <p className="text-xs text-slate-400 mt-3 text-center">
          Your answer is shown on the verdict but doesn't change the score.
        </p>
      </DialogContent>
    </Dialog>
  )
}
