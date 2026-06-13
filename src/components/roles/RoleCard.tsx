import { useAppStore } from '../../store/useAppStore'
import type { Role } from '../../lib/types'
import { calcRealOTE } from '../../lib/scoring'
import { formatCurrency, formatRelativeDate } from '../../lib/formatting'
import { Card, CardBody } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Copy, Trash2, Star, BarChart2, FileText } from 'lucide-react'
import { cn } from '../../lib/cn'

const STATUS_VARIANTS: Record<Role['status'], 'default' | 'blue' | 'green' | 'yellow' | 'slate' | 'red'> = {
  current: 'green',
  evaluating: 'blue',
  interviewing: 'yellow',
  offer: 'orange' as 'default',
  accepted: 'green',
  declined: 'red',
}

type RoleCardProps = {
  role: Role
}

export function RoleCard({ role }: RoleCardProps) {
  const { deleteRole, markRoleCurrent, duplicateRole, setView, setHubRoleId, setActiveComparison, roles } = useAppStore()
  const realOTE = calcRealOTE(role)
  const currentRole = roles.find(r => r.isCurrent)

  function handleOpenHub() {
    setHubRoleId(role.id)
    setView('role-hub')
  }

  function handleCompare() {
    if (!currentRole) return
    setActiveComparison({ currentRoleId: currentRole.id, targetRoleId: role.id })
    setView('comparison')
  }

  const canCompare = currentRole && !role.isCurrent

  return (
    <Card
      className={cn('group transition-shadow hover:shadow-md cursor-pointer', role.isCurrent && 'ring-2 ring-green-400')}
      onClick={handleOpenHub}
    >
      <CardBody className="pt-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 truncate">{role.basics.company}</h3>
              <Badge variant={STATUS_VARIANTS[role.status] as 'default'}>
                {role.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 truncate">{role.basics.title}</p>
          </div>
          {role.isCurrent && <Star size={16} className="text-green-500 fill-green-400 shrink-0" />}
        </div>

        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-lg font-bold text-slate-900">{formatCurrency(realOTE)}</span>
          <span className="text-xs text-slate-500">OTE</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 mb-4 flex-wrap">
          <span>{role.basics.workMode}</span>
          <span>•</span>
          <span>{role.basics.location}</span>
          <span>•</span>
          <span>Updated {formatRelativeDate(role.updatedAt)}</span>
          {(role.attachedDraftIds?.length ?? 0) > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-blue-500">
                <FileText size={11} />
                {role.attachedDraftIds!.length} resume{role.attachedDraftIds!.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {canCompare && (
            <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); handleCompare() }}>
              <BarChart2 size={13} /> Compare
            </Button>
          )}
          {!role.isCurrent && (
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); markRoleCurrent(role.id) }}>
              <Star size={13} /> Mark Current
            </Button>
          )}
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); duplicateRole(role.id) }}>
              <Copy size={13} />
            </Button>
            <Button variant="ghost" size="sm" onClick={e => {
              e.stopPropagation()
              if (confirm(`Delete ${role.basics.company} – ${role.basics.title}?`)) deleteRole(role.id)
            }} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
