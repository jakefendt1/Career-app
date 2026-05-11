import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Role } from '../../lib/types'
import { RoleSection } from './RoleSection'
import { BasicsSection } from './sections/BasicsSection'
import { CompensationSection } from './sections/CompensationSection'
import { CareerSection } from './sections/CareerSection'
import { LifestyleSection } from './sections/LifestyleSection'
import { RiskSection } from './sections/RiskSection'
import { PersonalSection } from './sections/PersonalSection'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { ArrowLeft, Star } from 'lucide-react'
import { useToast } from '../ui/toast'

const MODE_OPTIONS = [
  { value: 'exploration', label: 'Exploration — estimating, considering applying' },
  { value: 'decision', label: 'Decision — offer in hand or near-offer' },
]

const STATUS_OPTIONS = [
  { value: 'evaluating', label: 'Evaluating' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer Received' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'current', label: 'Current Role' },
]

export function RoleEditor() {
  const { roles, editingRoleId, updateRole, markRoleCurrent, setView } = useAppStore()
  const { toast } = useToast()
  const role = roles.find(r => r.id === editingRoleId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  if (!role) {
    return <div className="text-slate-400 py-10 text-center">Role not found.</div>
  }

  function patch<K extends keyof Role>(key: K, value: Role[K]) {
    if (!role) return
    updateRole(role.id, { [key]: value } as Partial<Role>)
    setSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 500)
  }

  const title = role.basics.company
    ? `${role.basics.company} — ${role.basics.title || 'New Role'}`
    : 'New Role'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setView('roles')}>
          <ArrowLeft size={14} /> Roles
        </Button>
        <h1 className="text-lg font-bold text-slate-900 flex-1 truncate">{title}</h1>
        {!role.isCurrent && (
          <Button variant="ghost" size="sm" onClick={() => { markRoleCurrent(role.id); toast('Marked as current role') }}>
            <Star size={14} /> Mark Current
          </Button>
        )}
        {role.isCurrent && <span className="text-xs text-green-600 font-medium">Current Role</span>}
      </div>

      <div className="flex gap-4 mb-4">
        <Select
          label="Mode"
          value={role.mode}
          onChange={e => patch('mode', e.target.value as Role['mode'])}
          options={MODE_OPTIONS}
          className="flex-1"
        />
        <Select
          label="Status"
          value={role.status}
          onChange={e => patch('status', e.target.value as Role['status'])}
          options={STATUS_OPTIONS}
          className="flex-1"
        />
      </div>

      <div className="space-y-3 mb-24">
        <RoleSection title="Basics" defaultOpen>
          <BasicsSection
            basics={role.basics}
            onChange={v => patch('basics', { ...role.basics, ...v })}
          />
        </RoleSection>

        <RoleSection
          title="Compensation"
          sectionKey="comp"
          confidence={role.confidence.comp}
          onConfidenceChange={c => patch('confidence', { ...role.confidence, comp: c })}
        >
          <CompensationSection role={role} onChange={v => patch('comp', { ...role.comp, ...v })} />
        </RoleSection>

        <RoleSection
          title="Career & Growth"
          sectionKey="career"
          confidence={role.confidence.career}
          onConfidenceChange={c => patch('confidence', { ...role.confidence, career: c })}
        >
          <CareerSection career={role.career} onChange={v => patch('career', { ...role.career, ...v })} />
        </RoleSection>

        <RoleSection
          title="Lifestyle"
          sectionKey="lifestyle"
          confidence={role.confidence.lifestyle}
          onConfidenceChange={c => patch('confidence', { ...role.confidence, lifestyle: c })}
        >
          <LifestyleSection lifestyle={role.lifestyle} onChange={v => patch('lifestyle', { ...role.lifestyle, ...v })} />
        </RoleSection>

        <RoleSection
          title="Risk"
          sectionKey="risk"
          confidence={role.confidence.risk}
          onConfidenceChange={c => patch('confidence', { ...role.confidence, risk: c })}
        >
          <RiskSection risk={role.risk} onChange={v => patch('risk', { ...role.risk, ...v })} />
        </RoleSection>

        <RoleSection title="Personal Notes">
          <PersonalSection personal={role.personal} onChange={v => patch('personal', { ...role.personal, ...v })} />
        </RoleSection>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between z-40">
        <span className="text-xs text-slate-400">
          {saved ? '✓ Saved' : 'Auto-saves as you type'}
        </span>
        <Button onClick={() => setView('roles')}>← Back to Roles</Button>
      </div>
    </div>
  )
}
