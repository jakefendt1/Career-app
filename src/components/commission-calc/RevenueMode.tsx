import { useState } from 'react'
import { cn } from '../../lib/cn'
import type { CommissionPlan } from '../../lib/types'
import { calcRevenueCommission, yearOneVsSteadyState, periodizeAmount, periodLabel } from '../../lib/comp'
import { formatCurrency, formatCompactCurrency } from '../../lib/formatting'
import { MoneyInput, PctInput } from '../ui/money'
import { Stat, HideWhenPresenting, usePresentMode } from '../ui/present'
import { SolveBar, ATTS, AttainmentBadge } from './shared'
import { PlanExtras } from './PlanExtras'

type RevenueSolve = 'commission' | 'quota' | 'rate' | 'attainment'

type Props = {
  plan: CommissionPlan
  onChange: (patch: Partial<CommissionPlan>) => void
}

export function RevenueMode({ plan, onChange }: Props) {
  const { presentMode } = usePresentMode()
  const [solve, setSolve] = useState<RevenueSolve>('commission')
  const [targetComm, setTargetComm] = useState(50_000)
  const [base, setBase] = useState(80_000)
  const [showYearOne, setShowYearOne] = useState(true)

  const quota = plan.revenueQuota ?? 1_000_000
  const rate = plan.revenueRate ?? 5
  // Attainment is a scenario dial, not something worth persisting to the plan — keep it local.
  const [localAtt, setLocalAtt] = useState(100)

  const accel = plan.acceleratorEnabled
    ? { enabled: true, thresholdPct: plan.acceleratorThresholdPct ?? 100, rate: plan.acceleratorRate ?? 1.5 }
    : undefined
  const cap = plan.capEnabled ? { enabled: true, amount: plan.capAmount ?? 0 } : undefined

  function computeOutput(): number {
    switch (solve) {
      case 'commission': return calcRevenueCommission(quota, localAtt, rate, accel, cap)
      case 'quota':      return localAtt > 0 && rate > 0 ? targetComm / (localAtt / 100) / (rate / 100) : 0
      case 'rate':       return quota > 0 && localAtt > 0 ? (targetComm / quota / (localAtt / 100)) * 100 : 0
      case 'attainment': return quota > 0 && rate > 0 ? (targetComm / quota / (rate / 100)) * 100 : 0
    }
  }

  const output = computeOutput()

  function onSolveChange(newSolve: RevenueSolve) {
    if (solve === 'commission') setTargetComm(Math.round(output))
    if (solve === 'quota') onChange({ revenueQuota: Math.round(output) })
    if (solve === 'rate') onChange({ revenueRate: Math.round(output * 100) / 100 })
    if (solve === 'attainment') setLocalAtt(Math.round(output * 10) / 10)
    setSolve(newSolve)
  }

  const displayQuota = solve === 'quota' ? output : quota
  const displayRate = solve === 'rate' ? output : rate
  const displayAtt = solve === 'attainment' ? output : localAtt
  const displayComm = solve === 'commission' ? output : targetComm

  const periodQuota = periodizeAmount(displayQuota, plan.period ?? 'annual')

  const yos = yearOneVsSteadyState(
    base,
    q => calcRevenueCommission(q, displayAtt, displayRate, accel, cap),
    displayQuota,
    { enabled: !!plan.rampEnabled, months: plan.rampMonths ?? 0, quotaReliefPct: plan.rampQuotaReliefPct ?? 0 },
    { enabled: !!plan.drawEnabled, amount: plan.drawAmount ?? 0, months: plan.drawMonths ?? 0, recoverable: plan.drawRecoverable ?? true },
  )
  const hasYearOneEffects = !!plan.drawEnabled || !!plan.rampEnabled

  return (
    <div className="space-y-4">
      <div className={cn('grid grid-cols-1 gap-4', !presentMode && 'lg:grid-cols-2')}>
        <HideWhenPresenting>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <SolveBar
              options={[
                { key: 'commission', label: 'Commission' },
                { key: 'quota', label: 'Quota' },
                { key: 'rate', label: 'Rate' },
                { key: 'attainment', label: 'Attainment%' },
              ]}
              value={solve}
              onChange={k => onSolveChange(k as RevenueSolve)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MoneyInput
                label="Annual Revenue Quota" value={displayQuota} readOnly={solve === 'quota'}
                onChange={v => onChange({ revenueQuota: v })} step={100_000}
                hint={plan.period && plan.period !== 'annual' ? `≈ ${formatCurrency(periodQuota)} / ${periodLabel(plan.period)}` : undefined}
              />
              <PctInput label="Commission Rate" value={displayRate} readOnly={solve === 'rate'} onChange={v => onChange({ revenueRate: v })} step={0.25} max={50} hint="% of revenue paid as commission" />
              <PctInput label="Attainment %" value={displayAtt} readOnly={solve === 'attainment'} onChange={setLocalAtt} step={5} max={300} hint="What % of quota you expect to hit" />
              <MoneyInput
                label={solve === 'commission' ? 'Commission (computed)' : 'Target Commission'}
                value={displayComm} readOnly={solve === 'commission'} onChange={setTargetComm} step={1_000}
              />
            </div>
            <MoneyInput label="Base Salary (for total earnings)" value={base} onChange={setBase} step={5_000} hint="Used to show total earnings below and in the scenario table" />
            <PlanExtras plan={plan} onChange={onChange} showAccelerator />
          </div>
        </HideWhenPresenting>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</p>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <Stat label={`Annual Commission @ ${Math.round(displayAtt)}% attainment`} value={formatCurrency(displayComm)} tone="accent" />
            <p className="text-xs text-blue-500 mt-2 text-center">
              {formatCompactCurrency(displayQuota)} quota × {Math.round(displayAtt)}% × {Math.round(displayRate * 100) / 100}%
              {accel && displayAtt > accel.thresholdPct && ` (${accel.rate}× accelerator above ${accel.thresholdPct}%)`}
              {cap && displayComm >= cap.amount && cap.amount > 0 && ' — capped'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Revenue Hit</p>
              <p className="font-bold text-slate-900 tabular-nums">{formatCurrency(displayQuota * (displayAtt / 100))}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Total Earnings (base + comm)</p>
              <p className="font-bold text-slate-900 tabular-nums">{formatCurrency(base + displayComm)}</p>
            </div>
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
              {showYearOne && plan.rampEnabled && (
                <p className="text-xs text-slate-400 mt-1 text-center">
                  Reflects {plan.rampMonths} ramp {plan.rampMonths === 1 ? 'month' : 'months'} at {plan.rampQuotaReliefPct}% quota relief
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <HideWhenPresenting>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">
            Attainment Scenarios — {formatCompactCurrency(displayQuota)} quota, {Math.round(displayRate * 100) / 100}% rate
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">Attainment</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Revenue Hit</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Commission</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pl-4">Total Earnings</th>
                </tr>
              </thead>
              <tbody>
                {ATTS.map(a => {
                  const comm = calcRevenueCommission(displayQuota, a, displayRate, accel, cap)
                  const revenue = displayQuota * (a / 100)
                  const isTarget = a === 100
                  return (
                    <tr key={a} className={cn('border-b border-slate-100 last:border-0', isTarget && 'bg-blue-50/50')}>
                      <td className="py-2.5 pr-4"><AttainmentBadge att={a} isTarget={isTarget} /></td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{formatCompactCurrency(revenue)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium text-slate-900">{formatCurrency(comm)}</td>
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
