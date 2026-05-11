import type { Role } from '../../../lib/types'
import { Slider } from '../../ui/slider'

type Props = {
  risk: Role['risk']
  onChange: (patch: Partial<Role['risk']>) => void
}

const FIELDS: Array<{ key: keyof Role['risk']; label: string; hint: string }> = [
  { key: 'companyHealth', label: 'Company Health', hint: '1 = shaky / burning cash · 10 = rock solid' },
  { key: 'industryTrajectory', label: 'Industry Trajectory', hint: '1 = declining market · 10 = booming sector' },
  { key: 'roleStability', label: 'Role Stability', hint: '1 = high layoff risk · 10 = won\'t be cut' },
  { key: 'compCeiling', label: 'Comp Growth Ceiling', hint: '1 = maxed out · 10 = significant upside' },
  { key: 'cultureFitRisk', label: 'Culture Fit Signal', hint: '1 = serious mismatch · 10 = strong fit signal' },
]

export function RiskSection({ risk, onChange }: Props) {
  return (
    <div className="space-y-5">
      {FIELDS.map(f => (
        <Slider
          key={f.key}
          label={f.label}
          value={risk[f.key]}
          onChange={v => onChange({ [f.key]: v })}
          min={1}
          max={10}
          step={1}
          hint={f.hint}
        />
      ))}
    </div>
  )
}
