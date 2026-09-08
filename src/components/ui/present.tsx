// Present Mode — one primitive shared by the OTE and Commission calculators
// so "pull this up in front of a hiring manager" means one click: inputs
// collapse, headline numbers blow up, everything stays live-editable.

import { createContext, useContext, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type PresentModeContextValue = { presentMode: boolean; togglePresentMode: () => void }
const PresentModeContext = createContext<PresentModeContextValue | null>(null)

export function PresentModeProvider({ children }: { children: React.ReactNode }) {
  const [presentMode, setPresentMode] = useState(false)
  return (
    <PresentModeContext.Provider value={{ presentMode, togglePresentMode: () => setPresentMode(v => !v) }}>
      {children}
    </PresentModeContext.Provider>
  )
}

export function usePresentMode(): PresentModeContextValue {
  const ctx = useContext(PresentModeContext)
  if (!ctx) return { presentMode: false, togglePresentMode: () => {} }
  return ctx
}

export function PresentModeToggle() {
  const { presentMode, togglePresentMode } = usePresentMode()
  return (
    <button
      onClick={togglePresentMode}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors shrink-0',
        presentMode
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      {presentMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      {presentMode ? 'Exit Present Mode' : 'Present Mode'}
    </button>
  )
}

/** Big number tile — normal size by default, blown up when presenting. */
export function Stat({
  label, value, sublabel, tone = 'default', size = 'md',
}: {
  label: string
  value: string
  sublabel?: string
  tone?: 'default' | 'accent' | 'muted'
  size?: 'sm' | 'md'
}) {
  const { presentMode } = usePresentMode()
  const toneClasses = tone === 'accent' ? 'text-blue-700' : tone === 'muted' ? 'text-slate-500' : 'text-slate-900'

  return (
    <div className="text-center">
      <p className={cn('text-slate-500 mb-1', presentMode ? 'text-sm font-medium' : 'text-xs')}>{label}</p>
      <p className={cn(
        'font-black tabular-nums leading-none',
        toneClasses,
        presentMode ? (size === 'sm' ? 'text-3xl' : 'text-5xl') : (size === 'sm' ? 'text-base' : 'text-2xl'),
      )}>
        {value}
      </p>
      {sublabel && <p className={cn('text-slate-400 mt-1.5', presentMode ? 'text-sm' : 'text-[11px]')}>{sublabel}</p>}
    </div>
  )
}

/** Hides its children while presenting — for input builders and raw controls. */
export function HideWhenPresenting({ children }: { children: React.ReactNode }) {
  const { presentMode } = usePresentMode()
  if (presentMode) return null
  return <>{children}</>
}
