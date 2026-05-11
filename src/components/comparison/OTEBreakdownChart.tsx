import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { Role } from '../../lib/types'
import { calcRealOTE, calcRiskAdjustedOTE } from '../../lib/scoring'
import { formatCurrency } from '../../lib/formatting'
import { useAppStore } from '../../store/useAppStore'

type Props = {
  target: Role
  current: Role
}

export function OTEBreakdownChart({ target, current }: Props) {
  const { preferences } = useAppStore()

  function buildEntry(role: Role) {
    const base = role.comp.base
    const variable = role.comp.variableTarget * role.comp.realisticAttainment
    const equity = role.comp.equityValue ?? 0
    const perks = (role.comp.carAllowance ?? 0) + ((role.comp.retirementMatchPct ?? 0) / 100 * base)
    const riskAdj = calcRiskAdjustedOTE(role)
    return { base, variable, equity, perks, riskAdj }
  }

  const t = buildEntry(target)
  const c = buildEntry(current)

  const data = [
    {
      name: target.basics.company,
      Base: t.base,
      Variable: t.variable,
      Equity: t.equity,
      Perks: t.perks,
      'Risk-Adjusted': null,
    },
    {
      name: current.basics.company,
      Base: c.base,
      Variable: c.variable,
      Equity: c.equity,
      Perks: c.perks,
      'Risk-Adjusted': null,
    },
  ]

  const fmt = (v: number) => formatCurrency(v, preferences.currency)

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">OTE Breakdown</h3>
      <p className="text-xs text-slate-400 mb-3">
        Risk-adj: {target.basics.company} {fmt(t.riskAdj)} · {current.basics.company} {fmt(c.riskAdj)}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${Math.round(v / 1000)}k`} />
          <Tooltip formatter={(v) => fmt(v as number)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Base" stackId="a" fill="#1e40af" />
          <Bar dataKey="Variable" stackId="a" fill="#3b82f6" />
          <Bar dataKey="Equity" stackId="a" fill="#60a5fa" />
          <Bar dataKey="Perks" stackId="a" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
          <ReferenceLine y={t.riskAdj} stroke="#2563eb" strokeDasharray="4 2" label={{ value: 'RA', position: 'right', fontSize: 10 }} />
          <ReferenceLine y={c.riskAdj} stroke="#94a3b8" strokeDasharray="4 2" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
