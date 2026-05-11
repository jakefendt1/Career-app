import type { Role } from '../../../lib/types'
import { Slider } from '../../ui/slider'

type Props = {
  career: Role['career']
  onChange: (patch: Partial<Role['career']>) => void
}

const FIELDS: Array<{ key: keyof Role['career']; label: string; hint: string }> = [
  { key: 'titleTrajectory', label: 'Title Trajectory', hint: '1 = capped here · 10 = clear path up' },
  { key: 'scopeSize', label: 'Scope & Scale', hint: '1 = small team/territory · 10 = enterprise' },
  { key: 'skillDevelopment', label: 'Skill Development', hint: '1 = stagnant · 10 = accelerated growth' },
  { key: 'companyPrestige', label: 'Company Prestige', hint: '1 = low name recognition · 10 = marquee brand' },
  { key: 'networkValue', label: 'Network Value', hint: '1 = isolated role · 10 = high-value connections' },
  { key: 'exitOptionality', label: 'Exit Optionality', hint: '1 = hard to parlay · 10 = strong resume builder' },
]

export function CareerSection({ career, onChange }: Props) {
  return (
    <div className="space-y-5">
      {FIELDS.map(f => (
        <Slider
          key={f.key}
          label={f.label}
          value={career[f.key]}
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
