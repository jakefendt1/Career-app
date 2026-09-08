import { useState } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../ui/toast'
import type { CommissionPlan } from '../../lib/types'
import { estimateAnnualCommission } from '../../lib/comp'
import { formatCurrency } from '../../lib/formatting'
import { cn } from '../../lib/cn'
import { PresentModeProvider, PresentModeToggle, HideWhenPresenting } from '../ui/present'
import { MarginMode } from './MarginMode'
import { RevenueMode } from './RevenueMode'
import { TieredMode } from './TieredMode'
import { FlatMode } from './FlatMode'

type PlanType = CommissionPlan['type']

const MODE_OPTIONS: { key: PlanType; label: string; description: string }[] = [
  { key: 'margin', label: 'Margin-Based', description: 'You earn a % of the gross margin (profit) on each deal you close.' },
  { key: 'revenue', label: 'Revenue-Based', description: 'You earn a flat % of the total revenue you close against a quota.' },
  { key: 'tiered', label: 'Tiered / Quota', description: 'Your rate increases in steps as you cross quota milestones.' },
  { key: 'flat', label: 'Flat Per-Deal', description: "You're paid a fixed $ amount per deal or unit, plus one-off bonuses." },
]

function defaultPlan(type: PlanType): CommissionPlan {
  return { type, period: 'annual' }
}

interface CommissionCalculatorProps {
  /** When set, the plan reads from and writes to this role's comp.commissionPlan
   *  so edits survive navigating away and back. Omit for the standalone,
   *  scratch-pad use of this calculator from the main nav. */
  roleId?: string
  initialPlan?: CommissionPlan
}

function CommissionCalculatorInner({ roleId, initialPlan }: CommissionCalculatorProps) {
  const { roles, updateRole } = useAppStore()
  const { toast } = useToast()
  const role = roleId ? roles.find(r => r.id === roleId) : undefined

  const [scratchPlan, setScratchPlan] = useState<CommissionPlan>(() => initialPlan ?? defaultPlan('margin'))

  const plan: CommissionPlan = role ? (role.comp.commissionPlan ?? defaultPlan(initialPlan?.type ?? 'margin')) : scratchPlan

  function handlePlanChange(patch: Partial<CommissionPlan>) {
    const next = { ...plan, ...patch }
    if (role) {
      updateRole(role.id, { comp: { ...role.comp, commissionPlan: next } })
    } else {
      setScratchPlan(next)
    }
  }

  function useAsVariableTarget() {
    if (!role) return
    const estimate = Math.round(estimateAnnualCommission(plan))
    updateRole(role.id, { comp: { ...role.comp, variableTarget: estimate, commissionPlan: plan } })
    toast(`Set ${role.basics.company}'s variable target to ${formatCurrency(estimate)}`, 'success')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Commission Calculator</h1>
          <p className="text-sm text-slate-500">
            Model any commission structure — solve for any variable, see attainment scenarios
          </p>
        </div>
        <PresentModeToggle />
      </div>

      <HideWhenPresenting>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">How do you get paid?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {MODE_OPTIONS.map(m => (
              <button
                key={m.key}
                onClick={() => handlePlanChange({ type: m.key })}
                className={cn(
                  'text-left rounded-lg border p-3 transition-colors',
                  plan.type === m.key
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {plan.type === m.key && <Check size={13} className="text-blue-600 shrink-0" />}
                  <span className={cn('text-sm font-semibold', plan.type === m.key ? 'text-blue-700' : 'text-slate-800')}>{m.label}</span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">{m.description}</p>
              </button>
            ))}
          </div>
        </div>
      </HideWhenPresenting>

      {plan.type === 'margin' && <MarginMode plan={plan} onChange={handlePlanChange} />}
      {plan.type === 'revenue' && <RevenueMode plan={plan} onChange={handlePlanChange} />}
      {plan.type === 'tiered' && <TieredMode plan={plan} onChange={handlePlanChange} />}
      {plan.type === 'flat' && <FlatMode plan={plan} onChange={handlePlanChange} />}

      {role && (
        <HideWhenPresenting>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">
              Like these numbers? Push the estimate into <span className="font-medium text-slate-700">{role.basics.company}</span>'s variable target.
            </p>
            <button
              onClick={useAsVariableTarget}
              className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors"
            >
              Use as Variable Target <ArrowRight size={12} />
            </button>
          </div>
        </HideWhenPresenting>
      )}
    </div>
  )
}

export function CommissionCalculator(props: CommissionCalculatorProps) {
  return (
    <PresentModeProvider>
      <CommissionCalculatorInner {...props} />
    </PresentModeProvider>
  )
}
