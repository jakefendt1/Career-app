import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { CommissionPlan } from '../../lib/types'
import { calcFlatCommission, yearOneVsSteadyState } from '../../lib/comp'
import { formatCurrency } from '../../lib/formatting'
import { MoneyInput } from '../ui/money'
import { Stat, HideWhenPresenting, usePresentMode } from '../ui/present'
import { PlanExtras } from './PlanExtras'

type Props = {
  plan: CommissionPlan
  onChange: (patch: Partial<CommissionPlan>) => void
}

const UNIT_SCENARIOS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export function FlatMode({ plan, onChange }: Props) {
  const { presentMode } = usePresentMode()
  const [base, setBase] = useState(60_000)
  const [showYearOne, setShowYearOne] = useState(true)

  const perDeal = plan.perDealAmount ?? 500
  const units = plan.expectedUnitsPerYear ?? 100
  const spiffs = plan.spiffs ?? []

  function updateSpiff(id: string, patch: Partial<{ label: string; amount: number }>) {
    onChange({ spiffs: spiffs.map(s => s.id === id ? { ...s, ...patch } : s) })
  }
  function addSpiff() {
    onChange({ spiffs: [...spiffs, { id: String(Date.now()), label: 'New SPIFF', amount: 500 }] })
  }
  function removeSpiff(id: string) {
    onChange({ spiffs: spiffs.filter(s => s.id !== id) })
  }

  const spiffTotal = spiffs.reduce((sum, s) => sum + s.amount, 0)
  const annualComm = calcFlatCommission(perDeal, units, spiffs)

  const yos = yearOneVsSteadyState(
    base,
    u => perDeal * u,
    units,
    { enabled: !!plan.rampEnabled, months: plan.rampMonths ?? 0, quotaReliefPct: plan.rampQuotaReliefPct ?? 0 },
    { enabled: !!plan.drawEnabled, amount: plan.drawAmount ?? 0, months: plan.drawMonths ?? 0, recoverable: plan.drawRecoverable ?? true },
    spiffTotal,
  )
  const hasYearOneEffects = !!plan.drawEnabled || !!plan.rampEnabled

  return (
    <div className="space-y-4">
      <div className={cn('grid grid-cols-1 gap-4', !presentMode && 'lg:grid-cols-2')}>
        <HideWhenPresenting>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MoneyInput label="Per Deal / Per Unit" value={perDeal} onChange={v => onChange({ perDealAmount: v })} step={50} hint="Fixed $ paid per closed deal or unit sold" />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Expected Units / Year</label>
                <input
                  type="number" value={units} min={0} max={5000}
                  onChange={e => onChange({ expectedUnitsPerYear: parseInt(e.target.value) || 0 })}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <MoneyInput label="Base Salary" value={base} onChange={setBase} step={5_000} hint="For total earnings" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SPIFFs & Bonuses</p>
                <button onClick={addSpiff} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  <Plus size={12} /> Add
                </button>
              </div>
              {spiffs.length === 0 ? (
                <p className="text-xs text-slate-400">No SPIFFs added — optional one-off bonus kickers.</p>
              ) : (
                <div className="space-y-2">
                  {spiffs.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <input
                        type="text" value={s.label} onChange={e => updateSpiff(s.id, { label: e.target.value })}
                        className="h-8 flex-1 min-w-0 rounded border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="SPIFF name"
                      />
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
                        <input
                          type="number" value={s.amount} onChange={e => updateSpiff(s.id, { amount: parseInt(e.target.value) || 0 })}
                          className="h-8 w-full rounded border border-slate-300 bg-white pl-5 pr-2 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button onClick={() => removeSpiff(s.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <PlanExtras plan={plan} onChange={onChange} />
          </div>
        </HideWhenPresenting>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</p>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <Stat label={`Annual Commission @ ${units} units/yr`} value={formatCurrency(annualComm)} tone="accent" />
            <p className="text-xs text-blue-500 mt-2 text-center">
              {formatCurrency(perDeal)} × {units} units{spiffTotal > 0 && ` + ${formatCurrency(spiffTotal)} SPIFFs`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">SPIFF Total</p>
              <p className="font-bold text-slate-900 tabular-nums">{formatCurrency(spiffTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Total Earnings (base + comm)</p>
              <p className="font-bold text-slate-900 tabular-nums">{formatCurrency(base + annualComm)}</p>
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
            </div>
          )}
        </div>
      </div>

      <HideWhenPresenting>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Unit Volume Scenarios — {formatCurrency(perDeal)}/unit</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">Units</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Commission</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pl-4">Total Earnings</th>
                </tr>
              </thead>
              <tbody>
                {UNIT_SCENARIOS.map(mult => {
                  const u = Math.round(units * mult)
                  const comm = calcFlatCommission(perDeal, u, spiffs)
                  const isTarget = mult === 1
                  return (
                    <tr key={mult} className={cn('border-b border-slate-100 last:border-0', isTarget && 'bg-blue-50/50')}>
                      <td className="py-2.5 pr-4">
                        <span className="tabular-nums text-slate-700 font-medium">{u}</span>
                        {isTarget && <span className="ml-2 text-xs text-slate-400">target</span>}
                      </td>
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
