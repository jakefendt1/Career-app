import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { CommissionPlan } from '../../lib/types'
import { MoneyInput, PctInput } from '../ui/money'
import { Toggle } from './shared'

type Props = {
  plan: CommissionPlan
  onChange: (patch: Partial<CommissionPlan>) => void
  showAccelerator?: boolean
}

/** Cross-cutting terms — payout period, accelerator/cap, draw, ramp — shared
 *  by revenue, tiered, and flat modes. Collapsed by default so the base
 *  structure stays the focus; opens itself if any term is already active. */
export function PlanExtras({ plan, onChange, showAccelerator = false }: Props) {
  const activeCount = [plan.acceleratorEnabled, plan.capEnabled, plan.drawEnabled, plan.rampEnabled].filter(Boolean).length
  const [open, setOpen] = useState(activeCount > 0)

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left gap-2 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
        <span className="text-sm font-medium text-slate-700 flex-1">Draw, Ramp, Accelerators & Payout Timing</span>
        {activeCount > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold rounded-full px-2 py-0.5">{activeCount} active</span>
        )}
        <span className="text-xs text-slate-400">optional</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-4 bg-white border-t border-slate-100">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Quota Period</label>
            <div className="flex gap-1">
              {(['monthly', 'quarterly', 'annual'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => onChange({ period: p })}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors border capitalize',
                    plan.period === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Changes how the quota is shown — the annual total is unaffected</p>
          </div>

          {showAccelerator && (
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <Toggle
                checked={!!plan.acceleratorEnabled}
                onChange={v => onChange({ acceleratorEnabled: v, acceleratorThresholdPct: plan.acceleratorThresholdPct ?? 100, acceleratorRate: plan.acceleratorRate ?? 1.5 })}
                label="Accelerator above a threshold"
              />
              {plan.acceleratorEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                  <PctInput label="Kicks in above" value={plan.acceleratorThresholdPct ?? 100} onChange={v => onChange({ acceleratorThresholdPct: v })} max={300} step={5} />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">Multiplier</label>
                    <input
                      type="number" value={plan.acceleratorRate ?? 1.5} step={0.1} min={1}
                      onChange={e => onChange({ acceleratorRate: parseFloat(e.target.value) || 1 })}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              <Toggle
                checked={!!plan.capEnabled}
                onChange={v => onChange({ capEnabled: v, capAmount: plan.capAmount ?? 100_000 })}
                label="Hard cap on commission"
              />
              {plan.capEnabled && (
                <div className="pl-6">
                  <MoneyInput label="Cap amount" value={plan.capAmount ?? 0} onChange={v => onChange({ capAmount: v })} step={5_000} />
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <Toggle
              checked={!!plan.drawEnabled}
              onChange={v => onChange({ drawEnabled: v, drawAmount: plan.drawAmount ?? 4_000, drawMonths: plan.drawMonths ?? 3, drawRecoverable: plan.drawRecoverable ?? true })}
              label="Draw against commission"
            />
            {plan.drawEnabled && (
              <div className="pl-6 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MoneyInput label="Monthly draw" value={plan.drawAmount ?? 0} onChange={v => onChange({ drawAmount: v })} step={500} />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">Months</label>
                    <input
                      type="number" value={plan.drawMonths ?? 3} min={1} max={12}
                      onChange={e => onChange({ drawMonths: parseInt(e.target.value) || 1 })}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {([true, false] as const).map(rec => (
                    <button
                      key={String(rec)}
                      onClick={() => onChange({ drawRecoverable: rec })}
                      className={cn(
                        'px-3 py-1 rounded text-xs font-medium transition-colors border',
                        plan.drawRecoverable === rec ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      {rec ? 'Recoverable (advance)' : 'Non-recoverable (guarantee)'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  {plan.drawRecoverable
                    ? 'Paid up front, then deducted from commissions as you earn them.'
                    : "Paid up front and never paid back — it's a floor, not a loan."}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <Toggle
              checked={!!plan.rampEnabled}
              onChange={v => onChange({ rampEnabled: v, rampMonths: plan.rampMonths ?? 3, rampQuotaReliefPct: plan.rampQuotaReliefPct ?? 50 })}
              label="Ramping quota (new-hire relief)"
            />
            {plan.rampEnabled && (
              <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Ramp months</label>
                  <input
                    type="number" value={plan.rampMonths ?? 3} min={1} max={12}
                    onChange={e => onChange({ rampMonths: parseInt(e.target.value) || 1 })}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <PctInput
                  label="Quota relief" value={plan.rampQuotaReliefPct ?? 50}
                  onChange={v => onChange({ rampQuotaReliefPct: v })} max={100} step={5}
                  hint="Quota reduced by this much during ramp"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
