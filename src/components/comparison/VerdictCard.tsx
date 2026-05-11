import type { ComparisonResult, Role, VerdictLabel } from '../../lib/types'
import { formatCurrency } from '../../lib/formatting'
import { cn } from '../../lib/cn'
import { useAppStore } from '../../store/useAppStore'

const VERDICT_CONFIG: Record<VerdictLabel, { label: string; color: string; bg: string; border: string }> = {
  'strong-move': { label: 'Strong Move', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  'soft-move': { label: 'Soft Move', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  'lateral': { label: 'Lateral / Wash', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300' },
  'soft-stay': { label: 'Soft Stay', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  'strong-stay': { label: 'Strong Stay', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
}

type Props = {
  result: ComparisonResult
  target: Role
  current: Role
  wouldTakeItSameComp?: 'yes' | 'no' | null
}

export function VerdictCard({ result, target, current, wouldTakeItSameComp }: Props) {
  const { preferences } = useAppStore()
  const cfg = VERDICT_CONFIG[result.verdict]
  const deltaStr = result.scoreDelta >= 0 ? `+${result.scoreDelta.toFixed(1)}` : result.scoreDelta.toFixed(1)

  return (
    <div className={cn('rounded-xl border-2 p-6', cfg.bg, cfg.border)}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Verdict</p>
          <h2 className={cn('text-3xl font-black', cfg.color)}>{cfg.label}</h2>
          <p className="text-sm text-slate-600 mt-1">
            {target.basics.company} vs. {current.basics.company}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-1">Score Delta</p>
          <p className={cn('text-2xl font-bold', result.scoreDelta >= 0 ? 'text-green-700' : 'text-red-700')}>
            {deltaStr}
          </p>
          <p className="text-xs text-slate-400">pts</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-xs text-slate-500">{target.basics.company} score</p>
          <p className="text-xl font-bold text-slate-900">{result.target.totalScore.toFixed(1)}</p>
          <p className="text-xs text-slate-400">
            OTE: {formatCurrency(result.target.realOTE, preferences.currency)}
          </p>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-xs text-slate-500">{current.basics.company} score (current)</p>
          <p className="text-xl font-bold text-slate-900">{result.current.totalScore.toFixed(1)}</p>
          <p className="text-xs text-slate-400">
            OTE: {formatCurrency(result.current.realOTE, preferences.currency)}
          </p>
        </div>
      </div>

      {wouldTakeItSameComp !== null && wouldTakeItSameComp !== undefined && (
        <div className="bg-white/60 rounded-lg p-3 flex items-center gap-2">
          <span className="text-xs text-slate-500">Would you take it at same comp?</span>
          <span className={cn('font-semibold text-sm', wouldTakeItSameComp === 'yes' ? 'text-green-700' : 'text-red-600')}>
            {wouldTakeItSameComp === 'yes' ? 'Yes — it\'s about more than money' : 'No — the comp is doing the heavy lifting'}
          </span>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3 italic">
        This verdict is a synthesis tool, not a decision-maker. You make the call.
      </p>
    </div>
  )
}
