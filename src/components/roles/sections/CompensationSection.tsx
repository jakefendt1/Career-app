import type { Role } from '../../../lib/types'
import { Input } from '../../ui/input'
import { Select } from '../../ui/select'
import { Slider } from '../../ui/slider'
import { calcRealOTE, calcRiskAdjustedOTE } from '../../../lib/scoring'
import { useAppStore } from '../../../store/useAppStore'
import { formatCurrency } from '../../../lib/formatting'

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
