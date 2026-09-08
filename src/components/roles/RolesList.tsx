import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Role } from '../../lib/types'
import { calcRealOTE } from '../../lib/scoring'
import { RoleCard } from './RoleCard'
import { Scoreboard } from './Scoreboard'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'
import { Plus, AlertCircle, Table2, LayoutGrid } from 'lucide-react'

function createBlankRole(): Role {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    isCurrent: false,
    mode: 'exploration',
    status: 'evaluating',
    createdAt: now,
    updatedAt: now,
    basics: { company: '', title: '', companySize: 'unknown', location: '', workMode: 'hybrid' },
    comp: { base: 0, variableTarget: 0, realisticAttainment: 1.0, commissionStructure: 'unknown' },
    career: { titleTrajectory: 5, scopeSize: 5, skillDevelopment: 5, companyPrestige: 5, networkValue: 5, exitOptionality: 5 },
    lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 5, hoursPerWeek: 45, commuteMinutes: 0, vacationDays: 15, managerQuality: 5, teamCulture: 5 },
    risk: { companyHealth: 5, industryTrajectory: 5, roleStability: 5, compCeiling: 5, cultureFitRisk: 5 },
    personal: { excitement: 5 },
    confidence: { comp: 'medium', career: 'medium', lifestyle: 'medium', risk: 'medium' },
  }
}

type SortKey = 'updatedAt' | 'ote' | 'company'
type ViewMode = 'scoreboard' | 'cards'

export function RolesList() {
  const { roles, addRole, setView, setEditingRoleId, setHubRoleId, setActiveComparison } = useAppStore()
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('scoreboard')

  const hasCurrentRole = roles.some(r => r.isCurrent)
  const currentRole = roles.find(r => r.isCurrent)

  function handleOpenHub(roleId: string) {
    setHubRoleId(roleId)
    setView('role-hub')
  }

  function handleCompare(roleId: string) {
    if (!currentRole) return
    setActiveComparison({ currentRoleId: currentRole.id, targetRoleId: roleId })
    setView('comparison')
  }

  function handleAddRole() {
    const role = createBlankRole()
    addRole(role)
    setEditingRoleId(role.id)
    setView('role-editor')
  }

  const filtered = roles
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .sort((a, b) => {
      if (sortKey === 'ote') return calcRealOTE(b) - calcRealOTE(a)
      if (sortKey === 'company') return a.basics.company.localeCompare(b.basics.company)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Roles</h1>
        <Button onClick={handleAddRole}>
          <Plus size={15} /> Add Role
        </Button>
      </div>

      {!hasCurrentRole && roles.length > 0 && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0" />
          Mark one role as your current role to enable comparisons.
        </div>
      )}

      {roles.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode('scoreboard')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors', viewMode === 'scoreboard' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
            >
              <Table2 size={13} /> Scoreboard
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors', viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
            >
              <LayoutGrid size={13} /> Cards
            </button>
          </div>
          {viewMode === 'cards' && (
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="h-8 rounded border border-slate-300 px-2 text-xs text-slate-600 bg-white focus:outline-none"
            >
              <option value="updatedAt">Last updated</option>
              <option value="ote">OTE</option>
              <option value="company">Company</option>
            </select>
          )}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-8 rounded border border-slate-300 px-2 text-xs text-slate-600 bg-white focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="current">Current</option>
            <option value="evaluating">Evaluating</option>
            <option value="interviewing">Interviewing</option>
            <option value="offer">Offer</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
          <span className="text-xs text-slate-400">{filtered.length} role{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          {roles.length === 0 ? (
            <>
              <p className="text-slate-500 mb-2">No roles yet.</p>
              <p className="text-sm text-slate-400 mb-6">Add your current role first, then add roles you're evaluating.</p>
              <Button onClick={handleAddRole}><Plus size={15} /> Add Your First Role</Button>
            </>
          ) : (
            <p className="text-slate-400">No roles match this filter.</p>
          )}
        </div>
      ) : viewMode === 'scoreboard' ? (
        <Scoreboard roles={filtered} onCompare={handleCompare} onOpenHub={handleOpenHub} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(role => <RoleCard key={role.id} role={role} />)}
        </div>
      )}
    </div>
  )
}
