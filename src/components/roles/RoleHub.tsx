import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { OteCalculator } from '../ote-calculator/OteCalculator'
import { CommissionCalculator } from '../commission-calc/CommissionCalculator'
import { DraftsList } from '../resume/DraftsList'
import { calcRealOTE, calcRiskAdjustedOTE, compareRoles } from '../../lib/scoring'
import { formatCurrency } from '../../lib/formatting'
import type { ComparisonResult, Role } from '../../lib/types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ArrowLeft, Edit2, BarChart2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type HubTab = 'overview' | 'ote' | 'commission' | 'resumes'

const STATUS_VARIANTS: Record<Role['status'], string> = {
  current: 'green',
  evaluating: 'blue',
  interviewing: 'yellow',
  offer: 'default',
  accepted: 'green',
  declined: 'red',
}

const VERDICT_LABELS: Record<string, string> = {
  'strong-move': 'Strong Move',
  'soft-move': 'Soft Move',
  'lateral': 'Lateral',
  'soft-stay': 'Soft Stay',
  'strong-stay': 'Strong Stay',
}

const VERDICT_COLORS: Record<string, string> = {
  'strong-move': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'soft-move': 'text-blue-700 bg-blue-50 border-blue-200',
  'lateral': 'text-slate-600 bg-slate-100 border-slate-200',
  'soft-stay': 'text-orange-700 bg-orange-50 border-orange-200',
  'strong-stay': 'text-red-700 bg-red-50 border-red-200',
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  role, comparison, currentRole, onEdit, onCompare,
}: {
  role: Role
  comparison: ComparisonResult | null
  currentRole: Role | null
  onEdit: () => void
  onCompare: () => void
}) {
  const { preferences } = useAppStore()
  const realOTE = calcRealOTE(role)
  const riskAdj = calcRiskAdjustedOTE(role)

  return (
    <div className="space-y-4">
      {/* Comp summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Base',           value: formatCurrency(role.comp.base, preferences.currency) },
          { label: 'Variable Target', value: formatCurrency(role.comp.variableTarget, preferences.currency) },
          { label: 'Real OTE',       value: formatCurrency(realOTE, preferences.currency) },
          { label: 'Risk-Adj OTE',   value: formatCurrency(riskAdj, preferences.currency) },
        ].map(tile => (
          <div key={tile.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{tile.label}</p>
            <p className="font-bold text-slate-900 tabular-nums">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Score comparison (only when a current role exists and this isn't it) */}
      {comparison && currentRole && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">vs. {currentRole.basics.company}</p>
            <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border', VERDICT_COLORS[comparison.verdict])}>
              {VERDICT_LABELS[comparison.verdict]}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">This Role</p>
              <p className="text-2xl font-black text-slate-900">{Math.round(comparison.target.totalScore)}</p>
            </div>
            <div className="flex-1 text-center">
              <p className={cn('text-sm font-bold', comparison.scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {comparison.scoreDelta >= 0 ? '+' : ''}{Math.round(comparison.scoreDelta)} pts
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">Current</p>
              <p className="text-2xl font-black text-slate-400">{Math.round(comparison.current.totalScore)}</p>
            </div>
          </div>

          {/* Section bars */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            {([
              { label: 'Comp',      target: comparison.target.compScore,      current: comparison.current.compScore },
              { label: 'Career',    target: comparison.target.careerScore,    current: comparison.current.careerScore },
              { label: 'Lifestyle', target: comparison.target.lifestyleScore, current: comparison.current.lifestyleScore },
              { label: 'Risk',      target: comparison.target.riskScore,      current: comparison.current.riskScore },
              { label: 'Personal',  target: comparison.target.personalScore,  current: comparison.current.personalScore },
            ] as const).map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16 shrink-0">{row.label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', row.target >= row.current ? 'bg-blue-500' : 'bg-orange-400')}
                    style={{ width: `${row.target}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700 tabular-nums w-8 text-right">
                  {Math.round(row.target)}
                </span>
                <span className={cn('text-xs tabular-nums w-10 text-right font-medium', row.target >= row.current ? 'text-emerald-600' : 'text-red-500')}>
                  {row.target >= row.current ? '+' : ''}{Math.round(row.target - row.current)}
                </span>
              </div>
            ))}
          </div>

          <Button variant="secondary" size="sm" onClick={onCompare} className="w-full">
            <BarChart2 size={13} /> Open Full Comparison
          </Button>
        </div>
      )}

      {!comparison && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          {role.isCurrent ? (
            <p className="text-sm text-slate-500">This is your current role — score comparisons appear when viewing a target role.</p>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-1">No current role set.</p>
              <p className="text-xs text-slate-400">Go to Role Compare and use "Mark Current" on your active role to see a score comparison here.</p>
            </>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onEdit}>
          <Edit2 size={13} /> Edit Role Details
        </Button>
        {comparison && (
          <Button onClick={onCompare}>
            <BarChart2 size={13} /> Full Comparison
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Hub ───────────────────────────────────────────────────────────────────────

const TABS: { key: HubTab; label: string }[] = [
  { key: 'overview',    label: 'Overview' },
  { key: 'ote',        label: 'OTE Calculator' },
  { key: 'commission', label: 'Commission Calculator' },
  { key: 'resumes',    label: 'Resumes' },
]

export function RoleHub() {
  const { roles, hubRoleId, preferences, setView, setEditingRoleId, setActiveComparison } = useAppStore()
  const [activeTab, setActiveTab] = useState<HubTab>('overview')

  const role = roles.find(r => r.id === hubRoleId)
  const currentRole = roles.find(r => r.isCurrent)

  if (!role) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">Role not found.</p>
        <Button variant="secondary" onClick={() => setView('roles')}><ArrowLeft size={14} /> Back to Roles</Button>
      </div>
    )
  }

  function handleEdit() {
    setEditingRoleId(role!.id)
    setView('role-editor')
  }

  function handleCompare() {
    if (!currentRole) return
    setActiveComparison({ currentRoleId: currentRole.id, targetRoleId: role!.id })
    setView('comparison')
  }

  const canCompare = !!currentRole && !role.isCurrent
  const comparison = canCompare ? compareRoles(role, currentRole!, preferences) : null

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setView('roles')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0"
        >
          <ArrowLeft size={14} /> Roles
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 truncate">{role.basics.company}</h1>
            <Badge variant={STATUS_VARIANTS[role.status] as 'default'}>{role.status}</Badge>
          </div>
          <p className="text-sm text-slate-500 truncate">{role.basics.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={handleEdit}>
            <Edit2 size={13} /> Edit Role
          </Button>
          {canCompare && (
            <Button size="sm" onClick={handleCompare}>
              <BarChart2 size={13} /> Compare
            </Button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-slate-200 mb-5">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'text-blue-700 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          role={role}
          comparison={comparison}
          currentRole={currentRole ?? null}
          onEdit={handleEdit}
          onCompare={handleCompare}
        />
      )}
      {activeTab === 'ote' && (
        <OteCalculator
          initialBase={role.comp.base}
          initialOte={role.comp.base + role.comp.variableTarget}
        />
      )}
      {activeTab === 'commission' && (
        <CommissionCalculator initialParams={role.comp.commissionParams} />
      )}
      {activeTab === 'resumes' && (
        <DraftsList companyFilter={role.basics.company} />
      )}
    </div>
  )
}
