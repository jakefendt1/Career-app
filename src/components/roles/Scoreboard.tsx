import { useState } from 'react'
import { Star, ArrowUpDown, BarChart2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Role } from '../../lib/types'
import { calcRealOTE, calcRiskAdjustedOTE, compareRoles } from '../../lib/scoring'
import { formatCurrency } from '../../lib/formatting'
import { ratedFieldCount, TOTAL_OPINION_FIELDS } from '../../lib/completeness'
import { cn } from '../../lib/cn'

type SortKey =
  | 'company' | 'realOTE' | 'riskAdjOTE' | 'totalScore'
  | 'comp' | 'career' | 'lifestyle' | 'risk' | 'personal'
  | 'travel' | 'hours' | 'commute' | 'vacation'

type Props = {
  roles: Role[]
  onCompare: (roleId: string) => void
  onOpenHub: (roleId: string) => void
}

type RoleRow = {
  role: Role
  realOTE: number
  riskAdjOTE: number
  totalScore: number | null
  compScore: number | null
  careerScore: number | null
  lifestyleScore: number | null
  riskScore: number | null
  personalScore: number | null
}

function RowHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap',
        active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800',
      )}
      title="Click to sort roles by this row"
    >
      {label}
      <ArrowUpDown size={11} className={cn(active ? 'opacity-100' : 'opacity-30', active && dir === 'asc' && 'rotate-180')} />
    </button>
  )
}

function ScoreBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-300 text-xs">—</span>
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="tabular-nums text-xs font-medium text-slate-700">{Math.round(value)}</span>
    </div>
  )
}

export function Scoreboard({ roles, onCompare, onOpenHub }: Props) {
  const { preferences } = useAppStore()
  const current = roles.find(r => r.isCurrent)
  const [sortKey, setSortKey] = useState<SortKey>('totalScore')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const rows: RoleRow[] = roles.map(role => {
    const realOTE = calcRealOTE(role)
    const riskAdjOTE = calcRiskAdjustedOTE(role)
    if (current) {
      const result = compareRoles(role, current, preferences)
      return {
        role, realOTE, riskAdjOTE,
        totalScore: result.target.totalScore,
        compScore: result.target.compScore,
        careerScore: result.target.careerScore,
        lifestyleScore: result.target.lifestyleScore,
        riskScore: result.target.riskScore,
        personalScore: result.target.personalScore,
      }
    }
    return { role, realOTE, riskAdjOTE, totalScore: null, compScore: null, careerScore: null, lifestyleScore: null, riskScore: null, personalScore: null }
  })

  function sortValue(r: RoleRow): number | string {
    switch (sortKey) {
      case 'company': return r.role.basics.company.toLowerCase()
      case 'realOTE': return r.realOTE
      case 'riskAdjOTE': return r.riskAdjOTE
      case 'totalScore': return r.totalScore ?? -Infinity
      case 'comp': return r.compScore ?? -Infinity
      case 'career': return r.careerScore ?? -Infinity
      case 'lifestyle': return r.lifestyleScore ?? -Infinity
      case 'risk': return r.riskScore ?? -Infinity
      case 'personal': return r.personalScore ?? -Infinity
      case 'travel': return r.role.lifestyle.travelDaysPerMonth
      case 'hours': return r.role.lifestyle.hoursPerWeek
      case 'commute': return r.role.lifestyle.commuteMinutes
      case 'vacation': return r.role.lifestyle.vacationDays
    }
  }

  const sorted = [...rows].sort((a, b) => {
    if (a.role.isCurrent) return -1
    if (b.role.isCurrent) return 1
    const av = sortValue(a), bv = sortValue(b)
    const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number)
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function bestRoleId(getValue: (r: RoleRow) => number | null, higherIsBetter: boolean): string | null {
    const withValues = rows.filter(r => getValue(r) != null)
    if (withValues.length < 2) return null
    let best = withValues[0]!
    for (const r of withValues) {
      const v = getValue(r)!, bv = getValue(best)!
      if (higherIsBetter ? v > bv : v < bv) best = r
    }
    return best.role.id
  }

  const best = {
    realOTE: bestRoleId(r => r.realOTE, true),
    riskAdjOTE: bestRoleId(r => r.riskAdjOTE, true),
    totalScore: bestRoleId(r => r.totalScore, true),
    comp: bestRoleId(r => r.compScore, true),
    career: bestRoleId(r => r.careerScore, true),
    lifestyle: bestRoleId(r => r.lifestyleScore, true),
    risk: bestRoleId(r => r.riskScore, true),
    personal: bestRoleId(r => r.personalScore, true),
    travel: bestRoleId(r => r.role.lifestyle.travelDaysPerMonth, false),
    hours: bestRoleId(r => r.role.lifestyle.hoursPerWeek, false),
    commute: bestRoleId(r => r.role.lifestyle.commuteMinutes, false),
    vacation: bestRoleId(r => r.role.lifestyle.vacationDays, true),
  }

  const scoreRows: { key: SortKey; label: string; value: (r: RoleRow) => number | null }[] = [
    { key: 'comp', label: 'Compensation', value: r => r.compScore },
    { key: 'career', label: 'Career & Growth', value: r => r.careerScore },
    { key: 'lifestyle', label: 'Lifestyle', value: r => r.lifestyleScore },
    { key: 'risk', label: 'Risk', value: r => r.riskScore },
    { key: 'personal', label: 'Personal', value: r => r.personalScore },
  ]

  const factRows: { key: SortKey; label: string; value: (r: RoleRow) => number; unit: string }[] = [
    { key: 'travel', label: 'Travel Days / mo', value: r => r.role.lifestyle.travelDaysPerMonth, unit: '' },
    { key: 'hours', label: 'Hours / Week', value: r => r.role.lifestyle.hoursPerWeek, unit: '' },
    { key: 'commute', label: 'Commute (min)', value: r => r.role.lifestyle.commuteMinutes, unit: '' },
    { key: 'vacation', label: 'Vacation Days', value: r => r.role.lifestyle.vacationDays, unit: '' },
  ]

  return (
    <div className="space-y-3">
      {!current && roles.length > 1 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Mark a role as current to see scores and comparisons here — until then this shows raw comp and lifestyle facts only.
        </p>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="sticky left-0 bg-white z-10 text-left px-4 py-3 w-44 min-w-[176px]" />
              {sorted.map(r => (
                <th key={r.role.id} className="px-4 py-3 text-left align-top min-w-[168px]">
                  <div className="flex items-center gap-1.5">
                    {r.role.isCurrent && <Star size={13} className="text-green-500 fill-green-400 shrink-0" />}
                    <button
                      onClick={() => onOpenHub(r.role.id)}
                      className="font-semibold text-slate-900 hover:text-blue-700 truncate text-left transition-colors"
                    >
                      {r.role.basics.company || 'Untitled'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{r.role.basics.title || 'No title yet'}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{ratedFieldCount(r.role)} of {TOTAL_OPINION_FIELDS} rated</p>
                  {current && !r.role.isCurrent && (
                    <button
                      onClick={() => onCompare(r.role.id)}
                      className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      <BarChart2 size={11} /> Compare
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="sticky left-0 bg-white z-10 px-4 py-2.5">
                <RowHeader label="Real OTE" active={sortKey === 'realOTE'} dir={sortDir} onClick={() => toggleSort('realOTE')} />
              </td>
              {sorted.map(r => (
                <td key={r.role.id} className={cn('px-4 py-2.5 tabular-nums font-semibold', r.role.id === best.realOTE ? 'text-emerald-700 bg-emerald-50/60' : 'text-slate-800')}>
                  {formatCurrency(r.realOTE, preferences.currency)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100">
              <td className="sticky left-0 bg-white z-10 px-4 py-2.5">
                <RowHeader label="Risk-Adjusted OTE" active={sortKey === 'riskAdjOTE'} dir={sortDir} onClick={() => toggleSort('riskAdjOTE')} />
              </td>
              {sorted.map(r => (
                <td key={r.role.id} className={cn('px-4 py-2.5 tabular-nums', r.role.id === best.riskAdjOTE ? 'text-emerald-700 bg-emerald-50/60 font-semibold' : 'text-slate-600')}>
                  {formatCurrency(r.riskAdjOTE, preferences.currency)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <td className="sticky left-0 bg-slate-50 z-10 px-4 py-2.5">
                <RowHeader label="Total Score" active={sortKey === 'totalScore'} dir={sortDir} onClick={() => toggleSort('totalScore')} />
              </td>
              {sorted.map(r => (
                <td key={r.role.id} className={cn('px-4 py-2.5 tabular-nums font-bold', r.role.id === best.totalScore ? 'text-blue-700' : 'text-slate-800')}>
                  {r.totalScore != null ? Math.round(r.totalScore) : '—'}
                </td>
              ))}
            </tr>

            {scoreRows.map(row => (
              <tr key={row.key} className="border-b border-slate-100">
                <td className="sticky left-0 bg-white z-10 px-4 py-2.5">
                  <RowHeader label={row.label} active={sortKey === row.key} dir={sortDir} onClick={() => toggleSort(row.key)} />
                </td>
                {sorted.map(r => (
                  <td key={r.role.id} className={cn('px-4 py-2.5', r.role.id === best[row.key as keyof typeof best] && 'bg-emerald-50/40')}>
                    <ScoreBar value={row.value(r)} />
                  </td>
                ))}
              </tr>
            ))}

            {factRows.map((row, i) => (
              <tr key={row.key} className={cn('border-b border-slate-100', i === 0 && 'border-t-2 border-t-slate-200')}>
                <td className="sticky left-0 bg-white z-10 px-4 py-2.5">
                  <RowHeader label={row.label} active={sortKey === row.key} dir={sortDir} onClick={() => toggleSort(row.key)} />
                </td>
                {sorted.map(r => (
                  <td key={r.role.id} className={cn('px-4 py-2.5 tabular-nums text-slate-700', r.role.id === best[row.key as keyof typeof best] && 'text-emerald-700 font-semibold bg-emerald-50/60')}>
                    {row.value(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
