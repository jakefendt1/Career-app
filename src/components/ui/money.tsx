import { cn } from '../../lib/cn'

type MoneyInputProps = {
  label: string
  value: number
  onChange?: (n: number) => void
  readOnly?: boolean
  hint?: string
  step?: number
  min?: number
  size?: 'md' | 'lg'
}

export function MoneyInput({
  label, value, onChange, readOnly = false, hint, step = 1000, min = 0, size = 'md',
}: MoneyInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <span className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none',
          size === 'lg' ? 'text-base' : 'text-sm',
        )}>$</span>
        <input
          type="number"
          value={Math.round(value)}
          step={step}
          min={min}
          readOnly={readOnly}
          onChange={e => onChange?.(parseInt(e.target.value) || 0)}
          className={cn(
            'w-full rounded-md border pl-6 pr-3 py-2 tabular-nums focus:outline-none',
            size === 'lg' ? 'h-11 text-base font-semibold' : 'h-9 text-sm',
            readOnly
              ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold cursor-default'
              : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          )}
        />
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

type PctInputProps = {
  label: string
  value: number
  onChange?: (n: number) => void
  readOnly?: boolean
  hint?: string
  step?: number
  max?: number
  min?: number
}

export function PctInput({
  label, value, onChange, readOnly = false, hint, step = 0.5, max = 100, min = 0,
}: PctInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={Math.round(value * 100) / 100}
          step={step}
          min={min}
          max={max}
          readOnly={readOnly}
          onChange={e => onChange?.(parseFloat(e.target.value) || 0)}
          className={cn(
            'h-9 w-full rounded-md border pl-3 pr-7 py-2 text-sm tabular-nums focus:outline-none',
            readOnly
              ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold cursor-default'
              : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">%</span>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
