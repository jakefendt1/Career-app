import type { Role } from '../../../lib/types'
import { Slider } from '../../ui/slider'
import { Input } from '../../ui/input'

type Props = {
  lifestyle: Role['lifestyle']
  onChange: (patch: Partial<Role['lifestyle']>) => void
}

export function LifestyleSection({ lifestyle, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Travel Days/Month"
          type="number"
          value={lifestyle.travelDaysPerMonth}
          onChange={e => onChange({ travelDaysPerMonth: Number(e.target.value) })}
          min={0}
          max={31}
        />
        <Input
          label="Hours/Week"
          type="number"
          value={lifestyle.hoursPerWeek}
          onChange={e => onChange({ hoursPerWeek: Number(e.target.value) })}
          min={30}
          max={80}
        />
        <Input
          label="Commute (min one-way)"
          type="number"
          value={lifestyle.commuteMinutes}
          onChange={e => onChange({ commuteMinutes: Number(e.target.value) })}
          min={0}
          max={180}
        />
        <Input
          label="Vacation Days"
          type="number"
          value={lifestyle.vacationDays}
          onChange={e => onChange({ vacationDays: Number(e.target.value) })}
          min={0}
          max={60}
        />
      </div>

      <Slider
        label="Schedule Flexibility"
        value={lifestyle.flexibilityScore}
        onChange={v => onChange({ flexibilityScore: v })}
        hint="1 = rigid 9-5 · 10 = full control of schedule"
      />
      <Slider
        label="Manager Quality"
        value={lifestyle.managerQuality}
        onChange={v => onChange({ managerQuality: v })}
        hint="1 = toxic · 10 = exceptional manager"
      />
      <Slider
        label="Team Culture"
        value={lifestyle.teamCulture}
        onChange={v => onChange({ teamCulture: v })}
        hint="1 = dysfunctional · 10 = strong cohesive team"
      />
    </div>
  )
}
