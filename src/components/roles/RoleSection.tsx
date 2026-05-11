import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Role } from '../../lib/types'

type Confidence = 'high' | 'medium' | 'low'
type SectionKey = keyof Role['confidence']

type RoleSectionProps = {
  title: string
  sectionKey?: SectionKey
  confidence?: Confidence
  onConfidenceChange?: (c: Confidence) => void
  defaultOpen?: boolean
  children: React.ReactNode
}

export function RoleSection({
  title,
  sectionKey,
  confidence,
  onConfidenceChange,
  defaultOpen = false,
  children,
}: RoleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  const confidenceColors: Record<Confidence, string> = {
    high: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    low: 'text-red-600 bg-red-50 border-red-200',
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-slate-800">{title}</span>
        <div className="flex items-center gap-2">
          {sectionKey && confidence && onConfidenceChange && (
            <div onClick={e => e.stopPropagation()}>
              <select
                value={confidence}
                onChange={e => onConfidenceChange(e.target.value as Confidence)}
                className={cn(
                  'text-xs font-medium rounded border px-2 py-0.5 focus:outline-none',
                  confidenceColors[confidence],
                )}
              >
                <option value="high">High confidence</option>
                <option value="medium">Medium confidence</option>
                <option value="low">Low confidence</option>
              </select>
            </div>
          )}
          {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}
