import type { Role } from '../../../lib/types'
import { Input } from '../../ui/input'
import { Select } from '../../ui/select'

type Props = {
  basics: Role['basics']
  onChange: (patch: Partial<Role['basics']>) => void
}

const COMPANY_SIZE_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'sub-100', label: 'Under 100' },
  { value: '100-1k', label: '100–1,000' },
  { value: '1k-10k', label: '1,000–10,000' },
  { value: '10k+', label: '10,000+' },
]

const WORK_MODE_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
]

export function BasicsSection({ basics, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="Company"
        value={basics.company}
        onChange={e => onChange({ company: e.target.value })}
        placeholder="Acme Corp"
      />
      <Input
        label="Title"
        value={basics.title}
        onChange={e => onChange({ title: e.target.value })}
        placeholder="Account Executive"
      />
      <Input
        label="Industry (optional)"
        value={basics.industry ?? ''}
        onChange={e => onChange({ industry: e.target.value })}
        placeholder="Manufacturing"
      />
      <Select
        label="Company Size"
        value={basics.companySize}
        onChange={e => onChange({ companySize: e.target.value as Role['basics']['companySize'] })}
        options={COMPANY_SIZE_OPTIONS}
      />
      <Input
        label="Location"
        value={basics.location}
        onChange={e => onChange({ location: e.target.value })}
        placeholder="Madison, WI"
      />
      <Select
        label="Work Mode"
        value={basics.workMode}
        onChange={e => onChange({ workMode: e.target.value as Role['basics']['workMode'] })}
        options={WORK_MODE_OPTIONS}
      />
    </div>
  )
}
