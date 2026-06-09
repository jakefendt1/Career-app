import { useState } from 'react'
import type { Role } from '../../../lib/types'
import { Input } from '../../ui/input'
import { Select } from '../../ui/select'
import { Slider } from '../../ui/slider'
import { calcRealOTE, calcRiskAdjustedOTE } from '../../../lib/scoring'
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

function calcCommissionParams(params: Role['comp']['commissionParams']): number | null {
  if (!params) return null
  if (params.type === 'margin') {
    const { avgDealSize = 0, avgGrossMarginPct = 0, marginRate = 0, expectedDealsPerYear = 1 } = params
    return avgDealSize * (avgGrossMarginPct / 100) * (marginRate / 100) * expectedDealsPerYear
  }
  if (params.type === 'revenue') {
    const { revenueQuota = 0, revenueRate = 0 } = params
    return revenueQuota * (revenueRate / 100)
  }
  return null
}

function CommissionBuilder({
  comp, onChange,
}: {
  comp: Role['comp']
  onChange: (patch: Partial<Role['comp']>) => void
}) {
  const [open, setOpen] = useState(false)
  const { preferences } = useAppStore()
  const params = comp.commissionParams
  const annual = calcCommissionParams(params)
  const type = params?.type ?? 'margin'

  function setParams(patch: Partial<NonNullable<Role['comp']['commissionParams']>>) {
    onChange({ commissionParams: { ...params, type, ...patch } as Role['comp']['commissionParams'] })
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
          {/* Type selector */}
          <div className="flex gap-1">
            {(['margin', 'revenue'] as const).map(t => (
              <button
                key={t}
                onClick={() => setParams({ type: t })}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Avg Deal Size</label>
                <Input
                  type="number"
                  value={params?.avgDealSize ?? ''}
                  onChange={e => setParams({ avgDealSize: Number(e.target.value) || 0 })}
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Avg Gross Margin %</label>
                <Input
                  type="number"
                  value={params?.avgGrossMarginPct ?? ''}
                  onChange={e => setParams({ avgGrossMarginPct: Number(e.target.value) || 0 })}
                  placeholder="25"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Commission Rate on GM %</label>
                <Input
                  type="number"
                  value={params?.marginRate ?? ''}
                  onChange={e => setParams({ marginRate: Number(e.target.value) || 0 })}
                  placeholder="3"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Expected Deals / Year</label>
                <Input
                  type="number"
                  value={params?.expectedDealsPerYear ?? ''}
                  onChange={e => setParams({ expectedDealsPerYear: Number(e.target.value) || 1 })}
                  placeholder="12"
                />
              </div>
            </div>
          )}

          {type === 'revenue' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Annual Revenue Quota</label>
                <Input
                  type="number"
                  value={params?.revenueQuota ?? ''}
                  onChange={e => setParams({ revenueQuota: Number(e.target.value) || 0 })}
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Commission Rate %</label>
                <Input
                  type="number"
                  value={params?.revenueRate ?? ''}
                  onChange={e => setParams({ revenueRate: Number(e.target.value) || 0 })}
                  placeholder="5"
                />
              </div>
            </div>
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
      <div className="grid grid-cols-2 gap-4">
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
