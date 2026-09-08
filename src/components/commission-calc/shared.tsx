import { cn } from '../../lib/cn'

// ── Solve-for bar — used by every mode that supports reverse-solving ────────

export function SolveBar({ options, value, onChange }: {
  options: { key: string; label: string }[]
  value: string
  onChange: (k: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solving for</p>
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        {options.map(o => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold transition-colors',
              value === o.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-1">Blue field is the output — edit the others</p>
    </div>
  )
}

// ── Attainment scenario scale — shared by revenue, tiered, and flat modes ───

export const ATTS = [50, 75, 80, 90, 100, 110, 125, 150] as const

export const ATT_STYLE: Record<number, { badge: string; text: string }> = {
  50:  { badge: 'bg-red-50',     text: 'text-red-600' },
  75:  { badge: 'bg-orange-50',  text: 'text-orange-600' },
  80:  { badge: 'bg-amber-50',   text: 'text-amber-700' },
  90:  { badge: 'bg-amber-50',   text: 'text-amber-700' },
  100: { badge: 'bg-blue-50',    text: 'text-blue-700' },
  110: { badge: 'bg-emerald-50', text: 'text-emerald-700' },
  125: { badge: 'bg-green-50',   text: 'text-green-700' },
  150: { badge: 'bg-green-100',  text: 'text-green-800' },
}

export function AttainmentBadge({ att, isTarget }: { att: number; isTarget: boolean }) {
  const s = ATT_STYLE[att] ?? { badge: 'bg-slate-50', text: 'text-slate-600' }
  return (
    <>
      <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold', s.badge, s.text)}>{att}%</span>
      {isTarget && <span className="ml-2 text-xs text-slate-400">target</span>}
    </>
  )
}

// ── Simple checkbox toggle — used throughout PlanExtras ─────────────────────

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      {label}
    </label>
  )
}
