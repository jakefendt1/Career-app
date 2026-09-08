import { useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { Dialog, DialogContent } from '../ui/dialog'

type Props = {
  title: string
  compactHeight: number
  expandedHeight: number
  children: (height: number) => React.ReactNode
}

export function ExpandableChartCard({ title, compactHeight, expandedHeight, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="relative bg-white border border-slate-200 rounded-lg p-4 group">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          <button
            onClick={() => setOpen(true)}
            title="Expand"
            className="text-slate-300 hover:text-slate-600 transition-colors -m-1 p-1"
          >
            <Maximize2 size={13} />
          </button>
        </div>
        {children(compactHeight)}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={title} className="max-w-3xl">
          {children(expandedHeight)}
        </DialogContent>
      </Dialog>
    </>
  )
}
