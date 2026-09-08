import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { CommissionPlan } from '../../lib/types'
import { calcTieredCommission, yearOneVsSteadyState } from '../../lib/comp'
import { formatCurrency, formatCompactCurrency } from '../../lib/formatting'
import { MoneyInput } from '../ui/money'
import { Stat, HideWhenPresenting, usePresentMode } from '../ui/present'
import { ATTS, AttainmentBadge } from './shared'
import { PlanExtras } from './PlanExtras'

type Props = {
  plan: CommissionPlan
  onChange: (patch: Partial<CommissionPlan>) => void
}

const DEFAULT_TIERS: NonNullable<CommissionPlan['tiers']> = [
  { id: '1', thresholdPct: 0, rate: 2 },
  { id: '2', thresholdPct: 80, rate: 3 },
  { id: '3', thresholdPct: 100, rate: 5 },
]

export function TieredMode({ plan, onChange }: Props) {
  const { presentMode } = usePresentMode()
  const [base, setBase] = useState(80_000)
  const [showYearOne, setShowYearOne] = useState(true)

  const quota = plan.revenueQuota ?? 1_000_000
  const tiers = plan.tiers ?? DEFAULT_TIERS
  const tierMode = plan.tierMode ?? 'marginal'
  const sorted = [...tiers].sort((a, b) => a.thresholdPct - b.thresholdPct)

  function updateTier(id: string, patch: Partial<{ thresholdPct: number; rate: number }>) {
    onChange({ tiers: tiers.map(t => t.id === id ? { ...t, ...patch } : t) })
  }
  function addTier() {
    if (tiers.length >= 5) return
    const last = sorted.at(-1)!
    onChange({ tiers: [...tiers, { id: String(Date.now()), thresholdPct: last.thresholdPct + 20, rate: last.rate + 1 }] })
  }
  function removeTier(id: string) {
    if (tiers.length <= 1) return
    onChange({ tiers: tiers.filter(t => t.id !== id) })
  }

  const commAt100 = calcTieredCommission(quota, 100, tiers, tierMode)

  const yos = yearOneVsSteadyState(
    base,
    q => calcTieredCommission(q, 100, tiers, tierMode),
    quota,
    { enabled: !!plan.rampEnabled, months: plan.rampMonths ?? 0, quotaReliefPct: plan.rampQuotaReliefPct ?? 0 },
    { enabled: !!plan.drawEnabled, amount: plan.drawAmount ?? 0, months: plan.drawMonths ?? 0, recoverable: plan.drawRecoverable ?? true },
  )
  const hasYearOneEffects = !!plan.drawEnabled || !!plan.rampEnabled

  return (
    <div className="space-y-4">
      <div className={cn('grid grid-cols-1 gap-4', !presentMode && 'lg:grid-cols-2')}>
        <HideWhenPresenting>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MoneyInput label="Annual Revenue Quota" value={quota} onChange={v => onChange({ revenueQuota: v })} step={100_000} />
              <MoneyInput label="Base Salary" value={base} onChange={setBase} step={5_000} hint="For total earnings" />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tier Calculation</p>
              <div className="flex gap-1">
                {(['marginal', 'retroactive'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => onChange({ tierMode: m })}
                    className={cn(
                      'px-3 py-1.5 rounded text-xs font-medium transition-colors border capitalize',
                      tierMode === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {tierMode === 'marginal'
                  ? 'Each tier only rates the revenue in its own band.'
                  : 'Crossing a tier re-rates ALL revenue at that tier — usually a much bigger jump.'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Commission Tiers</p>
              <div className="space-y-2">
                {sorted.map((tier, i) => {
                  const nextThreshold = sorted[i + 1]?.thresholdPct
                  const rangeLabel = nextThreshold != null ? `${tier.thresholdPct}% – ${nextThreshold}%` : `${tier.thresholdPct}%+`
                  return (
                    <div key={tier.id} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-24">
                            <label className="text-xs text-slate-500 block mb-0.5">Starts at</label>
                            <div className="relative">
                              <input
                                type="number" value={tier.thresholdPct} min={0} max={300} step={5} readOnly={i === 0}
                                onChange={e => updateTier(tier.id, { thresholdPct: parseInt(e.target.value) || 0 })}
                                className={cn(
                                  'h-7 w-full rounded border pl-2 pr-5 text-xs tabular-nums focus:outline-none',
                                  i === 0 ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-default' : 'border-slate-300 bg-white focus:ring-1 focus:ring-blue-500',
                                )}
                              />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-[80px]">
                            <label className="text-xs text-slate-500 block mb-0.5">Rate</label>
                            <div className="relative">
                              <input
                                type="number" value={tier.rate} min={0} max={50} step={0.25}
                                onChange={e => updateTier(tier.id, { rate: parseFloat(e.target.value) || 0 })}
                                className="h-7 w-full rounded border border-slate-300 bg-white pl-2 pr-5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 whitespace-nowrap pt-4">{rangeLabel}</div>
                        </div>
                      </div>
                      {tiers.length > 1 && (
                        <button onClick={() => removeTier(tier.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0 self-end pb-0.5">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {tiers.length < 5 && (
                <button onClick={addTier} className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  <Plus size={12} /> Add tier
                </button>
              )}
            </div>

            <PlanExtras plan={plan} onChange={onChange} />
          </div>
        </HideWhenPresenting>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">At 100% Attainment</p>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <Stat label="Total Commission" value={formatCurrency(commAt100)} tone="accent" />
            <p className="text-xs text-blue-500 mt-2 text-center">
              Blended rate: {quota > 0 ? ((commAt100 / quota) * 100).toFixed(2) : '0'}% · {tierMode} tiers
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tier Breakdown at 100%</p>
            {sorted.map((tier, i) => {
              const floor = quota * (tier.thresholdPct / 100)
              const nextThreshold = sorted[i + 1]?.thresholdPct
              const ceil = nextThreshold != null ? quota * (nextThreshold / 100) : quota
              const bucketRevenue = Math.max(0, ceil - floor)
              const tierComm = tierMode === 'marginal' ? bucketRevenue * (tier.rate / 100) : null
              return (
                <div key={tier.id} className="flex justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-500">{tier.thresholdPct}%{nextThreshold != null ? `–${nextThreshold}%` : '+'} at {tier.rate}%</span>
                  {tierComm != null && <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(tierComm)}</span>}
                </div>
              )
            })}
            {tierMode === 'retroactive' && (
              <p className="text-xs text-slate-400 mt-2 italic">Retroactive: the highest tier reached applies to all revenue, so there's no per-band breakdown.</p>
            )}
          </div>

          {hasYearOneEffects && (
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Year One vs. Steady State</p>
                <HideWhenPresenting>
                  <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs">
                    <button onClick={() => setShowYearOne(true)} className={cn('px-2 py-1 font-medium', showYearOne ? 'bg-slate-700 text-white' : 'bg-white text-slate-500')}>Year One</button>
                    <button onClick={() => setShowYearOne(false)} className={cn('px-2 py-1 font-medium', !showYearOne ? 'bg-slate-700 text-white' : 'bg-white text-slate-500')}>Steady State</button>
                  </div>
                </HideWhenPresenting>
              </div>
              <Stat
                label={showYearOne ? 'Year-one gross pay' : 'Steady-state annual pay'}
                value={formatCurrency(showYearOne ? yos.yearOneTotal : yos.steadyStateTotal)}
                size="sm"
              />
              {showYearOne && plan.drawEnabled && plan.drawRecoverable && yos.drawBalance > 0 && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  Includes {formatCurrency(yos.drawBalance)} of recoverable draw not yet earned back
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <HideWhenPresenting>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Attainment Scenarios — {formatCompactCurrency(quota)} quota</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">Attainment</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Revenue Hit</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Commission</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Blended Rate</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pl-4">Total Earnings</th>
                </tr>
              </thead>
              <tbody>
                {ATTS.map(a => {
                  const comm = calcTieredCommission(quota, a, tiers, tierMode)
                  const revenue = quota * (a / 100)
                  const blended = revenue > 0 ? (comm / revenue) * 100 : 0
                  const isTarget = a === 100
                  const isTierBreak = sorted.some(t => t.thresholdPct === a)
                  return (
                    <tr key={a} className={cn('border-b border-slate-100 last:border-0', isTarget && 'bg-blue-50/50')}>
                      <td className="py-2.5 pr-4">
                        <AttainmentBadge att={a} isTarget={isTarget} />
                        {isTierBreak && !isTarget && <span className="ml-2 text-xs text-blue-400">tier ↑</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{formatCompactCurrency(revenue)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium text-slate-900">{formatCurrency(comm)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-500">{blended.toFixed(2)}%</td>
                      <td className={cn('py-2.5 pl-4 text-right tabular-nums font-semibold', isTarget ? 'text-blue-700' : 'text-slate-900')}>{formatCurrency(base + comm)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </HideWhenPresenting>
    </div>
  )
}
