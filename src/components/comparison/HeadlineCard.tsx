import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ComparisonResult, Role } from '../../lib/types'
import { formatCurrency } from '../../lib/formatting'
import { buildHeadline } from '../../lib/narrative'
import { VERDICT_CONFIG } from '../../lib/verdict'
import { cn } from '../../lib/cn'
import { useAppStore } from '../../store/useAppStore'

type Props = {
  result: ComparisonResult
  target: Role
  current: Role
  wouldTakeItSameComp?: 'yes' | 'no' | null
}

/** Leads with dollars and plain English; the 0-100 score is a secondary
 *  chip with an expandable breakdown, rather than the headline itself. */
export function HeadlineCard({ result, target, current, wouldTakeItSameComp }: Props) {
  const { preferences } = useAppStore()
  const [showMath, setShowMath] = useState(false)
  const cfg = VERDICT_CONFIG[result.verdict]
  const headline = buildHeadline(target, current)

  const sectionRows = [
    { label: 'Compensation', target: result.target.compScore, current: result.current.compScore, weight: preferences.weights.comp },
    { label: 'Career & Growth', target: result.target.careerScore, current: result.current.careerScore, weight: preferences.weights.career },
    { label: 'Lifestyle', target: result.target.lifestyleScore, current: result.current.lifestyleScore, weight: preferences.weights.lifestyle },
    { label: 'Risk', target: result.target.riskScore, current: result.current.riskScore, weight: preferences.weights.risk },
    { label: 'Personal', target: result.target.personalScore, current: result.current.personalScore, weight: preferences.weights.personal },
  ]

  return (
    <div className={cn('rounded-xl border-2 p-6', cfg.bg, cfg.border)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
        {target.basics.company} vs. {current.basics.company}
      </p>
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">{headline.sentence}</h2>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border bg-white/70', cfg.color, cfg.border)}>
          {cfg.label}
        </span>
        <button
          onClick={() => setShowMath(v => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          Score {Math.round(result.target.totalScore)} vs. {Math.round(result.current.totalScore)}
          {showMath ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          how this is calculated
        </button>
      </div>

      {showMath && (
        <div className="mt-4 bg-white/70 rounded-lg p-4 space-y-2">
          <p className="text-xs text-slate-500 mb-2">
            Each section is scored 0–100, then blended by your weights (adjust these in Settings → Scoring Weights):
          </p>
          {sectionRows.map(row => (
            <div key={row.label} className="flex items-center justify-between text-xs">
              <span className="text-slate-600">{row.label} <span className="text-slate-400">({row.weight}%)</span></span>
              <span className="tabular-nums font-medium text-slate-800">{Math.round(row.target)} vs. {Math.round(row.current)}</span>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Risk-adjusted OTE (drives comp score)</span>
            <span className="tabular-nums font-medium text-slate-800">
              {formatCurrency(result.target.riskAdjustedOTE, preferences.currency)} vs. {formatCurrency(result.current.riskAdjustedOTE, preferences.currency)}
            </span>
          </div>
          <p className="text-xs text-slate-400 italic pt-1">
            Risk-adjusted OTE = real OTE × (company health + role stability) ÷ 20. It's what feeds the comp score above — the headline
            dollar figure at the top uses real OTE with no risk adjustment.
          </p>
        </div>
      )}

      {wouldTakeItSameComp !== null && wouldTakeItSameComp !== undefined && (
        <div className="bg-white/60 rounded-lg p-3 flex items-center gap-2 mt-4">
          <span className="text-xs text-slate-500">Would you take it at same comp?</span>
          <span className={cn('font-semibold text-sm', wouldTakeItSameComp === 'yes' ? 'text-green-700' : 'text-red-600')}>
            {wouldTakeItSameComp === 'yes' ? "Yes — it's about more than money" : 'No — the comp is doing the heavy lifting'}
          </span>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3 italic">
        This verdict is a synthesis tool, not a decision-maker. You make the call.
      </p>
    </div>
  )
}
