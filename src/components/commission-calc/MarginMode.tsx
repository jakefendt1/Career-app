import { useState } from 'react'
import { cn } from '../../lib/cn'
import type { CommissionPlan } from '../../lib/types'
import { calcMarginCommission } from '../../lib/comp'
import { formatCurrency, formatCompactCurrency } from '../../lib/formatting'
import { MoneyInput, PctInput } from '../ui/money'
import { Stat, HideWhenPresenting, usePresentMode } from '../ui/present'
import { SolveBar } from './shared'

type MarginSolve = 'commission' | 'deal' | 'gm' | 'rate'

type Props = {
  plan: CommissionPlan
  onChange: (patch: Partial<CommissionPlan>) => void
}

const GM_STEPS = [10, 15, 20, 25, 30, 35, 40]

export function MarginMode({ plan, onChange }: Props) {
  const { presentMode } = usePresentMode()
  const [solve, setSolve] = useState<MarginSolve>('commission')
  const [targetComm, setTargetComm] = useState(7_500)

  const deal = plan.avgDealSize ?? 1_000_000
  const gm = plan.avgGrossMarginPct ?? 25
  const rate = plan.marginRate ?? 3
  const dealsPerYear = plan.expectedDealsPerYear ?? 12

  function computeOutput(): number {
    switch (solve) {
      case 'commission': return calcMarginCommission(deal, gm, rate)
      case 'deal':       return gm > 0 && rate > 0 ? targetComm / ((gm / 100) * (rate / 100)) : 0
      case 'gm':         return deal > 0 && rate > 0 ? (targetComm / deal / (rate / 100)) * 100 : 0
      case 'rate':       return deal > 0 && gm > 0 ? (targetComm / deal / (gm / 100)) * 100 : 0
    }
  }

  const output = computeOutput()

  function onSolveChange(newSolve: MarginSolve) {
    if (solve === 'commission') setTargetComm(Math.round(output))
    if (solve === 'deal') onChange({ avgDealSize: Math.round(output) })
    if (solve === 'gm') onChange({ avgGrossMarginPct: Math.round(output * 100) / 100 })
    if (solve === 'rate') onChange({ marginRate: Math.round(output * 100) / 100 })
    setSolve(newSolve)
  }

  const displayDeal = solve === 'deal' ? output : deal
  const displayGm = solve === 'gm' ? output : gm
  const displayRate = solve === 'rate' ? output : rate
  const displayComm = solve === 'commission' ? output : targetComm
  const annualComm = displayComm * dealsPerYear

  return (
    <div className="space-y-4">
      <div className={cn('grid grid-cols-1 gap-4', !presentMode && 'lg:grid-cols-2')}>
        <HideWhenPresenting>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <SolveBar
              options={[
                { key: 'commission', label: 'Commission' },
                { key: 'deal', label: 'Deal Size' },
                { key: 'gm', label: 'GM%' },
                { key: 'rate', label: 'Comm Rate' },
              ]}
              value={solve}
              onChange={k => onSolveChange(k as MarginSolve)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MoneyInput label="Deal Size" value={displayDeal} readOnly={solve === 'deal'} onChange={v => onChange({ avgDealSize: v })} step={50_000} />
              <PctInput label="Gross Margin %" value={displayGm} readOnly={solve === 'gm'} onChange={v => onChange({ avgGrossMarginPct: v })} hint="GM% on the deal" />
              <PctInput label="Commission Rate on GM" value={displayRate} readOnly={solve === 'rate'} onChange={v => onChange({ marginRate: v })} step={0.25} max={50} hint="% of GM dollars paid as commission" />
              <MoneyInput
                label={solve === 'commission' ? 'Commission (computed)' : 'Target Commission'}
                value={displayComm} readOnly={solve === 'commission'} onChange={setTargetComm} step={500}
              />
            </div>
          </div>
        </HideWhenPresenting>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</p>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <Stat label="Commission per deal" value={formatCurrency(displayComm)} tone="accent" />
            <p className="text-xs text-blue-500 mt-2 text-center">
              {formatCurrency(deal)} × {Math.round(displayGm * 10) / 10}% GM × {Math.round(displayRate * 100) / 100}% rate
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">GM Dollars / Deal</p>
              <p className="font-bold text-slate-900 tabular-nums">{formatCurrency(deal * (displayGm / 100))}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Commission % of Revenue</p>
              <p className="font-bold text-slate-900 tabular-nums">
                {deal > 0 ? (Math.round((displayComm / deal) * 10000) / 100).toFixed(2) : '0.00'}%
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-end gap-3">
              <HideWhenPresenting>
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-600 block mb-1">Deals / Year</label>
                  <input
                    type="number" value={dealsPerYear} min={1} max={500}
                    onChange={e => onChange({ expectedDealsPerYear: parseInt(e.target.value) || 1 })}
                    className="h-8 w-full rounded border border-slate-300 px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </HideWhenPresenting>
              <div className="flex-[2]">
                <p className="text-xs text-slate-500 mb-1">Annual Commission ({dealsPerYear} deals/yr)</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{formatCurrency(annualComm)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <HideWhenPresenting>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">
            GM% Scenarios — at {formatCompactCurrency(displayDeal)} deal size, {Math.round(displayRate * 100) / 100}% commission rate
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">GM%</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">GM Dollars</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Commission / Deal</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pl-4">Annual × {dealsPerYear} deals</th>
                </tr>
              </thead>
              <tbody>
                {GM_STEPS.map(g => {
                  const comm = calcMarginCommission(displayDeal, g, displayRate)
                  const isActive = Math.round(displayGm) === g
                  return (
                    <tr key={g} className={cn('border-b border-slate-100 last:border-0', isActive && 'bg-blue-50/60')}>
                      <td className="py-2 pr-4">
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold', isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>
                          {g}%
                        </span>
                        {isActive && <span className="ml-2 text-xs text-slate-400">← current</span>}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-slate-600">{formatCurrency(displayDeal * (g / 100))}</td>
                      <td className={cn('py-2 px-4 text-right tabular-nums font-medium', isActive ? 'text-blue-700' : 'text-slate-900')}>{formatCurrency(comm)}</td>
                      <td className={cn('py-2 pl-4 text-right tabular-nums font-semibold', isActive ? 'text-blue-700' : 'text-slate-900')}>{formatCurrency(comm * dealsPerYear)}</td>
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
