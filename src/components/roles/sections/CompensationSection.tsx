import { useState } from 'react'
import type { Role, CommissionPlan } from '../../../lib/types'
import { Input } from '../../ui/input'
import { Select } from '../../ui/select'
import { Slider } from '../../ui/slider'
import { calcRealOTE, calcRiskAdjustedOTE } from '../../../lib/scoring'
import { estimateAnnualCommission } from '../../../lib/comp'
import { useAppStore } from '../../../store/useAppStore'
import { formatCurrency } from '../../../lib/formatting'
import { ChevronDown, ChevronRight } from 'lucide-react'

type Props = {
  role: Role
  onChange: (patch: Partial<Role['comp']>) => void
}

const COMMISSION_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'linear', label: 'Linear' },
  { value: 'accelerator', label: 'With accelerators' },
  { value: 'capped', label: 'Capped' },
]

function CommissionBuilder({
  comp, onChange,
}: {
  comp: Role['comp']
  onChange: (patch: Partial<Role['comp']>) => void
}) {
  const [open, setOpen] = useState(false)
  const { preferences } = useAppStore()
  const plan = comp.commissionPlan
  const annual = plan ? estimateAnnualCommission(plan) : null
  const type = plan?.type === 'tiered' || plan?.type === 'flat' ? plan.type : (plan?.type ?? 'margin')
  const isAdvancedType = type === 'tiered' || type === 'flat'

  function setPlan(patch: Partial<CommissionPlan>) {
    onChange({ commissionPlan: { period: 'annual', ...plan, type, ...patch } as CommissionPlan })
  }

  function useValue() {
    if (annual != null) onChange({ variableTarget: Math.round(annual) })
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left gap-2 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
        <span className="text-sm font-medium text-slate-700 flex-1">Commission Builder</span>
        {annual != null && (
          <span className="text-xs text-blue-600 font-semibold tabular-nums">
            {formatCurrency(annual, preferences.currency)}/yr
          </span>
        )}
        <span className="text-xs text-slate-400">optional — calculate variable from deal math</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-3 bg-white border-t border-slate-100">
          {isAdvancedType ? (
            <p className="text-xs text-slate-500">
              This role's commission is set up as a <span className="font-medium text-slate-700 capitalize">{type}</span> plan
              in the full Commission Calculator (open this role's Commission Calculator tab to edit tiers, draw, ramp, etc).
              The estimate below reflects that plan at 100% attainment.
            </p>
          ) : (
            <>
              {/* Type selector */}
              <div className="flex gap-1">
                {(['margin', 'revenue'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setPlan({ type: t })}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
                      type === t
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t === 'margin' ? 'Margin-Based' : 'Revenue-Based'}
                  </button>
                ))}
              </div>

              {type === 'margin' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Avg Deal Size</label>
                    <Input
                      type="number"
                      value={plan?.avgDealSize ?? ''}
                      onChange={e => setPlan({ avgDealSize: Number(e.target.value) || 0 })}
                      placeholder="1000000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Avg Gross Margin %</label>
                    <Input
                      type="number"
                      value={plan?.avgGrossMarginPct ?? ''}
                      onChange={e => setPlan({ avgGrossMarginPct: Number(e.target.value) || 0 })}
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Commission Rate on GM %</label>
                    <Input
                      type="number"
                      value={plan?.marginRate ?? ''}
                      onChange={e => setPlan({ marginRate: Number(e.target.value) || 0 })}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Expected Deals / Year</label>
                    <Input
                      type="number"
                      value={plan?.expectedDealsPerYear ?? ''}
                      onChange={e => setPlan({ expectedDealsPerYear: Number(e.target.value) || 1 })}
                      placeholder="12"
                    />
                  </div>
                </div>
              )}

              {type === 'revenue' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Annual Revenue Quota</label>
                    <Input
                      type="number"
                      value={plan?.revenueQuota ?? ''}
                      onChange={e => setPlan({ revenueQuota: Number(e.target.value) || 0 })}
                      placeholder="1000000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Commission Rate %</label>
                    <Input
                      type="number"
                      value={plan?.revenueRate ?? ''}
                      onChange={e => setPlan({ revenueRate: Number(e.target.value) || 0 })}
                      placeholder="5"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {annual != null && annual > 0 && (
            <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
              <div>
                <p className="text-xs text-blue-600">Expected annual commission</p>
                <p className="font-bold text-blue-800 tabular-nums">{formatCurrency(Math.round(annual), preferences.currency)}</p>
              </div>
              <button
                onClick={useValue}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
              >
                Use as Variable Target
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function CompensationSection({ role, onChange }: Props) {
  const { preferences } = useAppStore()
  const { comp } = role
  const realOTE = calcRealOTE(role)
  const riskAdj = calcRiskAdjustedOTE(role)

  function numField(field: keyof Role['comp'], value: number | undefined) {
    return (
      <Input
        type="number"
        value={value ?? ''}
        onChange={e => onChange({ [field]: e.target.value === '' ? undefined : Number(e.target.value) } as Partial<Role['comp']>)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Base Salary</label>
          {numField('base', comp.base)}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Variable Target</label>
          {numField('variableTarget', comp.variableTarget)}
        </div>
        <Select
          label="Commission Structure"
          value={comp.commissionStructure}
          onChange={e => onChange({ commissionStructure: e.target.value as Role['comp']['commissionStructure'] })}
          options={COMMISSION_OPTIONS}
        />
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Equity (annualized, optional)</label>
          {numField('equityValue', comp.equityValue)}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Sign-On Bonus (optional)</label>
          {numField('signOnBonus', comp.signOnBonus)}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Car Allowance / yr (optional)</label>
          {numField('carAllowance', comp.carAllowance)}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Retirement Match % (optional)</label>
          <Input
            type="number"
            value={comp.retirementMatchPct ?? ''}
            onChange={e => onChange({ retirementMatchPct: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="4"
          />
        </div>
      </div>

      <Slider
        label="Realistic Attainment"
        value={comp.realisticAttainment * 100}
        onChange={v => onChange({ realisticAttainment: v / 100 })}
        min={50}
        max={150}
        step={5}
        formatValue={v => `${v}%`}
        hint="What % of variable target do you realistically expect to hit?"
      />

      <CommissionBuilder comp={comp} onChange={onChange} />

      <div className="mt-4 p-3 bg-slate-50 rounded-md grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500 text-xs">Real OTE</p>
          <p className="font-semibold text-slate-900">{formatCurrency(realOTE, preferences.currency)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Risk-Adjusted OTE</p>
          <p className="font-semibold text-slate-600">{formatCurrency(riskAdj, preferences.currency)}</p>
          <p className="text-xs text-slate-400">health × stability adjusted</p>
        </div>
      </div>

      {comp.signOnBonus && comp.signOnBonus > 0 && (
        <p className="text-xs text-slate-500 italic">
          Sign-on of {formatCurrency(comp.signOnBonus, preferences.currency)} shown separately (not in OTE).
        </p>
      )}
    </div>
  )
}
