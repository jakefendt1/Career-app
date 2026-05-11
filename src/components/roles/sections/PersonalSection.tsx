import type { Role } from '../../../lib/types'
import { Slider } from '../../ui/slider'
import { Textarea } from '../../ui/textarea'

type Props = {
  personal: Role['personal']
  onChange: (patch: Partial<Role['personal']>) => void
}

export function PersonalSection({ personal, onChange }: Props) {
  return (
    <div className="space-y-5">
      <Slider
        label="Excitement / Gut Score"
        value={personal.excitement}
        onChange={v => onChange({ excitement: v })}
        hint="1 = dread · 10 = genuinely excited"
      />
      <Textarea
        label="What excites you about this role? (optional)"
        value={personal.whatExcitesYou ?? ''}
        onChange={e => onChange({ whatExcitesYou: e.target.value })}
        placeholder="The product, the market, the team..."
        className="min-h-[80px]"
      />
      <Textarea
        label="What worries you? (optional)"
        value={personal.whatWorriesYou ?? ''}
        onChange={e => onChange({ whatWorriesYou: e.target.value })}
        placeholder="Concerns about culture, role stability, comp structure..."
        className="min-h-[80px]"
      />
      <Textarea
        label="Open questions (optional)"
        value={personal.openQuestions ?? ''}
        onChange={e => onChange({ openQuestions: e.target.value })}
        placeholder="Things you still need to find out..."
        className="min-h-[80px]"
      />
    </div>
  )
}
