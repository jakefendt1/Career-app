import { useState } from 'react'
import { cn } from '../../lib/cn'
import { Plus, Trash2 } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'margin' | 'revenue' | 'tiered'
type MarginSolve = 'commission' | 'deal' | 'gm' | 'rate'
type RevenueSolve = 'commission' | 'quota' | 'rate' | 'attainment'
type Tier = { id: string; thresholdPct: number; rate: number }

// ── Pure math ─────────────────────────────────────────────────────────────────

function calcMargin(deal: number, gm: number, rate: number): number {
  return deal * (gm / 100) * (rate / 100)
}

function tieredComm(quota: number, attPct: number, tiers: Tier[]): number {
  if (!tiers.length) return 0
  const revenue = quota * (attPct / 100)
  const sorted = [...tiers].sort((a, b) => a.thresholdPct - b.thresholdPct)
  let total = 0
  for (let i = 0; i < sorted.length; i++) {
    const floor = quota * (sorted[i].thresholdPct / 100)
    const ceil = i < sorted.length - 1
      ? quota * (sorted[i + 1].thresholdPct / 100)
      : revenue
    if (revenue <= floor) break
    total += (Math.min(revenue, ceil) - floor) * (sorted[i].rate / 100)
  }
  return total
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k'
  return '$' + Math.round(n)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MoneyInput({
  label, value, onChange, readOnly = false, hint, step = 10_000,
}: {
  label: string; value: number; onChange?: (n: number) => void
  readOnly?: boolean; hint?: string; step?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">$</span>
        <input
          type="number"
          value={Math.round(value)}
          step={step}
          min={0}
          readOnly={readOnly}
          onChange={e => onChange?.(parseInt(e.target.value) || 0)}
          className={cn(
            'h-9 w-full rounded-md border pl-6 pr-3 py-2 text-sm tabular-nums focus:outline-none',
            readOnly
              ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold cursor-default'
              : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          )}
        />
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function PctInput({
  label, value, onChange, readOnly = false, hint, step = 0.5, max = 100,
}: {
  label: string; value: number; onChange?: (n: number) => void
  readOnly?: boolean; hint?: string; step?: number; max?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={Math.round(value * 100) / 100}
          step={step}
          min={0}
          max={max}
          readOnly={readOnly}
          onChange={e => onChange?.(parseFloat(e.target.value) || 0)}
          className={cn(
            'h-9 w-full rounded-md border pl-3 pr-7 py-2 text-sm tabular-nums focus:outline-none',
            readOnly
              ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold cursor-default'
              : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">%</span>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function SolveBar({ options, value, onChange }: {
  options: { key: string; label: string }[]
  value: string
  onChange: (k: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solving for</p>
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        {options.map(o => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold transition-colors',
              value === o.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-1">Blue field is the output — edit the others</p>
    </div>
  )
}

// ── Attainment scenario helpers ───────────────────────────────────────────────

const ATTS = [50, 75, 80, 90, 100, 110, 125, 150]
const ATT_STYLE: Record<number, { badge: string; text: string }> = {
  50:  { badge: 'bg-red-50',     text: 'text-red-600' },
  75:  { badge: 'bg-orange-50',  text: 'text-orange-600' },
  80:  { badge: 'bg-amber-50',   text: 'text-amber-700' },
  90:  { badge: 'bg-amber-50',   text: 'text-amber-700' },
  100: { badge: 'bg-blue-50',    text: 'text-blue-700' },
  110: { badge: 'bg-emerald-50', text: 'text-emerald-700' },
  125: { badge: 'bg-green-50',   text: 'text-green-700' },
  150: { badge: 'bg-green-100',  text: 'text-green-800' },
}

const GM_STEPS = [10, 15, 20, 25, 30, 35, 40]

// ── Mode A: Margin Commission ─────────────────────────────────────────────────

function MarginMode() {
  const [solve, setSolve] = useState<MarginSolve>('commission')
  const [deal, setDeal] = useState(1_000_000)
  const [gm, setGm] = useState(25)
  const [rate, setRate] = useState(3)
  const [targetComm, setTargetComm] = useState(7_500)
  const [dealsPerYear, setDealsPerYear] = useState(12)

  function computeOutput(): number {
    switch (solve) {
      case 'commission': return calcMargin(deal, gm, rate)
      case 'deal':       return gm > 0 && rate > 0 ? targetComm / ((gm / 100) * (rate / 100)) : 0
      case 'gm':         return deal > 0 && rate > 0 ? (targetComm / deal / (rate / 100)) * 100 : 0
      case 'rate':       return deal > 0 && gm > 0 ? (targetComm / deal / (gm / 100)) * 100 : 0
    }
  }

  const output = computeOutput()

  function onSolveChange(newSolve: MarginSolve) {
    // Carry current output into the state it was being computed from
    if (solve === 'commission') setTargetComm(Math.round(output))
    if (solve === 'deal') setDeal(Math.round(output))
    if (solve === 'gm') setGm(Math.round(output * 100) / 100)
    if (solve === 'rate') setRate(Math.round(output * 100) / 100)
    setSolve(newSolve)
  }

  const displayDeal = solve === 'deal' ? output : deal
  const displayGm = solve === 'gm' ? output : gm
  const displayRate = solve === 'rate' ? output : rate
  const displayComm = solve === 'commission' ? output : targetComm
  const annualComm = displayComm * dealsPerYear

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Inputs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <SolveBar
            options={[
              { key: 'commission', label: 'Commission' },
              { key: 'deal', label: 'Deal Size' },
              { key: 'gm', label: 'GM%' },
              { key: 'rate', label: 'Comm Rate' },
            ]}
            value={solve}
            onChange={k => onSolveChange(k as MarginSolve)}
          />
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput
              label="Deal Size"
              value={displayDeal}
              readOnly={solve === 'deal'}
              onChange={setDeal}
              step={50_000}
            />
            <PctInput
              label="Gross Margin %"
              value={displayGm}
              readOnly={solve === 'gm'}
              onChange={setGm}
              hint="GM% on the deal"
            />
            <PctInput
              label="Commission Rate on GM"
              value={displayRate}
              readOnly={solve === 'rate'}
              onChange={setRate}
              step={0.25}
              max={50}
              hint="% of GM dollars paid as commission"
            />
            <MoneyInput
              label={solve === 'commission' ? 'Commission (computed)' : 'Target Commission'}
              value={displayComm}
              readOnly={solve === 'commission'}
              onChange={setTargetComm}
              step={500}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</p>
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-xs text-blue-600 mb-1">Commission per deal</p>
              <p className="text-3xl font-black text-blue-700 tabular-nums">{fmt(displayComm)}</p>
              <p className="text-xs text-blue-500 mt-1">
                {fmt(deal)} × {Math.round(displayGm * 10) / 10}% GM × {Math.round(displayRate * 100) / 100}% rate
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">GM Dollars / Deal</p>
                <p className="font-bold text-slate-900 tabular-nums">{fmt(deal * (displayGm / 100))}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Commission %  of Revenue</p>
                <p className="font-bold text-slate-900 tabular-nums">
                  {deal > 0 ? (Math.round((displayComm / deal) * 10000) / 100).toFixed(2) : '0.00'}%
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600 block mb-1">Deals / Year</label>
                <input
                  type="number"
                  value={dealsPerYear}
                  min={1}
                  max={500}
                  onChange={e => setDealsPerYear(parseInt(e.target.value) || 1)}
                  className="h-8 w-full rounded border border-slate-300 px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-[2]">
                <p className="text-xs text-slate-500 mb-1">Annual Commission</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{fmt(annualComm)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GM% scenario table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">
          GM% Scenarios — at {fmtCompact(displayDeal)} deal size, {Math.round(displayRate * 100) / 100}% commission rate
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">GM%</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">GM Dollars</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Commission / Deal</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pl-4">Annual × {dealsPerYear} deals</th>
              </tr>
            </thead>
            <tbody>
              {GM_STEPS.map(g => {
                const comm = calcMargin(displayDeal, g, displayRate)
                const isActive = Math.round(displayGm) === g
                return (
                  <tr key={g} className={cn('border-b border-slate-100 last:border-0', isActive && 'bg-blue-50/60')}>
                    <td className="py-2 pr-4">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded text-xs font-semibold',
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600',
                      )}>
                        {g}%
                      </span>
                      {isActive && <span className="ml-2 text-xs text-slate-400">← current</span>}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-slate-600">{fmt(displayDeal * (g / 100))}</td>
                    <td className={cn('py-2 px-4 text-right tabular-nums font-medium', isActive ? 'text-blue-700' : 'text-slate-900')}>
                      {fmt(comm)}
                    </td>
                    <td className={cn('py-2 pl-4 text-right tabular-nums font-semibold', isActive ? 'text-blue-700' : 'text-slate-900')}>
                      {fmt(comm * dealsPerYear)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Mode B: Revenue Commission ────────────────────────────────────────────────

function RevenueMode() {
  const [solve, setSolve] = useState<RevenueSolve>('commission')
  const [quota, setQuota] = useState(1_000_000)
  const [rate, setRate] = useState(5)
  const [att, setAtt] = useState(100)
  const [targetComm, setTargetComm] = useState(50_000)
  const [base, setBase] = useState(80_000)

  function computeOutput(): number {
    switch (solve) {
      case 'commission': return quota * (att / 100) * (rate / 100)
      case 'quota':      return att > 0 && rate > 0 ? targetComm / (att / 100) / (rate / 100) : 0
      case 'rate':       return quota > 0 && att > 0 ? (targetComm / quota / (att / 100)) * 100 : 0
      case 'attainment': return quota > 0 && rate > 0 ? (targetComm / quota / (rate / 100)) * 100 : 0
    }
  }

  const output = computeOutput()

  function onSolveChange(newSolve: RevenueSolve) {
    if (solve === 'commission') setTargetComm(Math.round(output))
    if (solve === 'quota') setQuota(Math.round(output))
    if (solve === 'rate') setRate(Math.round(output * 100) / 100)
    if (solve === 'attainment') setAtt(Math.round(output * 10) / 10)
    setSolve(newSolve)
  }

  const displayQuota = solve === 'quota' ? output : quota
  const displayRate = solve === 'rate' ? output : rate
  const displayAtt = solve === 'attainment' ? output : att
  const displayComm = solve === 'commission' ? output : targetComm

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Inputs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <SolveBar
            options={[
              { key: 'commission', label: 'Commission' },
              { key: 'quota', label: 'Quota' },
              { key: 'rate', label: 'Rate' },
              { key: 'attainment', label: 'Attainment%' },
            ]}
            value={solve}
            onChange={k => onSolveChange(k as RevenueSolve)}
          />
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput
              label="Annual Revenue Quota"
              value={displayQuota}
              readOnly={solve === 'quota'}
              onChange={setQuota}
              step={100_000}
            />
            <PctInput
              label="Commission Rate"
              value={displayRate}
              readOnly={solve === 'rate'}
              onChange={setRate}
              step={0.25}
              max={50}
              hint="% of revenue paid as commission"
            />
            <PctInput
              label="Attainment %"
              value={displayAtt}
              readOnly={solve === 'attainment'}
              onChange={setAtt}
              step={5}
              max={300}
              hint="What % of quota you expect to hit"
            />
            <MoneyInput
              label={solve === 'commission' ? 'Commission (computed)' : 'Target Commission'}
              value={displayComm}
              readOnly={solve === 'commission'}
              onChange={setTargetComm}
              step={1_000}
            />
          </div>
          <MoneyInput
            label="Base Salary (for total earnings)"
            value={base}
            onChange={setBase}
            step={5_000}
            hint="Used to show total earnings in scenario table"
          />
        </div>

        {/* Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</p>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs text-blue-600 mb-1">Annual Commission @ {Math.round(displayAtt)}% attainment</p>
            <p className="text-3xl font-black text-blue-700 tabular-nums">{fmt(displayComm)}</p>
            <p className="text-xs text-blue-500 mt-1">
              {fmtCompact(displayQuota)} quota × {Math.round(displayAtt)}% × {Math.round(displayRate * 100) / 100}%
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Revenue Hit</p>
              <p className="font-bold text-slate-900 tabular-nums">{fmt(displayQuota * (displayAtt / 100))}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Total Earnings (base + comm)</p>
              <p className="font-bold text-slate-900 tabular-nums">{fmt(base + displayComm)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attainment scenario table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">
          Attainment Scenarios — {fmtCompact(displayQuota)} quota, {Math.round(displayRate * 100) / 100}% rate
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">Attainment</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Revenue Hit</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Commission</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pl-4">Total Earnings</th>
              </tr>
            </thead>
            <tbody>
              {ATTS.map(a => {
                const comm = displayQuota * (a / 100) * (displayRate / 100)
                const revenue = displayQuota * (a / 100)
                const isTarget = a === 100
                const s = ATT_STYLE[a]
                return (
                  <tr key={a} className={cn('border-b border-slate-100 last:border-0', isTarget && 'bg-blue-50/50')}>
                    <td className="py-2.5 pr-4">
                      <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold', s.badge, s.text)}>
                        {a}%
                      </span>
                      {isTarget && <span className="ml-2 text-xs text-slate-400">target</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{fmtCompact(revenue)}</td>
                    <td className={cn('py-2.5 px-4 text-right tabular-nums font-medium', s.text)}>{fmt(comm)}</td>
                    <td className={cn('py-2.5 pl-4 text-right tabular-nums font-semibold', isTarget ? 'text-blue-700' : 'text-slate-900')}>
                      {fmt(base + comm)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Mode C: Tiered / Quota ────────────────────────────────────────────────────

const DEFAULT_TIERS: Tier[] = [
  { id: '1', thresholdPct: 0,   rate: 2 },
  { id: '2', thresholdPct: 80,  rate: 3 },
  { id: '3', thresholdPct: 100, rate: 5 },
]

function TieredMode() {
  const [quota, setQuota] = useState(1_000_000)
  const [base, setBase] = useState(80_000)
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS)

  function updateTier(id: string, patch: Partial<Tier>) {
    setTiers(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function addTier() {
    if (tiers.length >= 4) return
    const last = [...tiers].sort((a, b) => a.thresholdPct - b.thresholdPct).at(-1)!
    setTiers(ts => [...ts, { id: String(Date.now()), thresholdPct: last.thresholdPct + 20, rate: last.rate + 1 }])
  }

  function removeTier(id: string) {
    if (tiers.length <= 1) return
    setTiers(ts => ts.filter(t => t.id !== id))
  }

  const sorted = [...tiers].sort((a, b) => a.thresholdPct - b.thresholdPct)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tier builder */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput label="Annual Revenue Quota" value={quota} onChange={setQuota} step={100_000} />
            <MoneyInput label="Base Salary" value={base} onChange={setBase} step={5_000} hint="For total earnings" />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Commission Tiers</p>
            <div className="space-y-2">
              {sorted.map((tier, i) => {
                const nextThreshold = sorted[i + 1]?.thresholdPct
                const rangeLabel = nextThreshold != null
                  ? `${tier.thresholdPct}% – ${nextThreshold}%`
                  : `${tier.thresholdPct}%+`
                return (
                  <div key={tier.id} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <label className="text-xs text-slate-500 block mb-0.5">Starts at</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={tier.thresholdPct}
                              min={0}
                              max={300}
                              step={5}
                              readOnly={i === 0}
                              onChange={e => updateTier(tier.id, { thresholdPct: parseInt(e.target.value) || 0 })}
                              className={cn(
                                'h-7 w-full rounded border pl-2 pr-5 text-xs tabular-nums focus:outline-none',
                                i === 0 ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-default' : 'border-slate-300 bg-white focus:ring-1 focus:ring-blue-500',
                              )}
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 block mb-0.5">Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={tier.rate}
                              min={0}
                              max={50}
                              step={0.25}
                              onChange={e => updateTier(tier.id, { rate: parseFloat(e.target.value) || 0 })}
                              className="h-7 w-full rounded border border-slate-300 bg-white pl-2 pr-5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 whitespace-nowrap pt-4">{rangeLabel}</div>
                      </div>
                    </div>
                    {tiers.length > 1 && (
                      <button
                        onClick={() => removeTier(tier.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors shrink-0 self-end pb-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {tiers.length < 4 && (
              <button
                onClick={addTier}
                className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <Plus size={12} /> Add tier
              </button>
            )}
          </div>
        </div>

        {/* Summary at 100% attainment */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">At 100% Attainment</p>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs text-blue-600 mb-1">Total Commission</p>
            <p className="text-3xl font-black text-blue-700 tabular-nums">{fmt(tieredComm(quota, 100, tiers))}</p>
            <p className="text-xs text-blue-500 mt-1">
              Blended rate: {quota > 0 ? ((tieredComm(quota, 100, tiers) / quota) * 100).toFixed(2) : '0'}%
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tier Breakdown at 100%</p>
            {sorted.map((tier, i) => {
              const floor = quota * (tier.thresholdPct / 100)
              const nextThreshold = sorted[i + 1]?.thresholdPct
              const ceil = nextThreshold != null ? quota * (nextThreshold / 100) : quota
              const bucketRevenue = Math.max(0, ceil - floor)
              const tierComm = bucketRevenue * (tier.rate / 100)
              return (
                <div key={tier.id} className="flex justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-500">
                    {tier.thresholdPct}%{nextThreshold != null ? `–${nextThreshold}%` : '+'} at {tier.rate}%
                  </span>
                  <span className="font-medium text-slate-700 tabular-nums">{fmt(tierComm)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Attainment scenario table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">
          Attainment Scenarios — {fmtCompact(quota)} quota
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">Attainment</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Revenue Hit</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Commission</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Blended Rate</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pl-4">Total Earnings</th>
              </tr>
            </thead>
            <tbody>
              {ATTS.map(a => {
                const comm = tieredComm(quota, a, tiers)
                const revenue = quota * (a / 100)
                const blended = revenue > 0 ? (comm / revenue) * 100 : 0
                const isTarget = a === 100
                const s = ATT_STYLE[a]
                const isTierBreak = sorted.some(t => t.thresholdPct === a)
                return (
                  <tr key={a} className={cn('border-b border-slate-100 last:border-0', isTarget && 'bg-blue-50/50')}>
                    <td className="py-2.5 pr-4">
                      <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold', s.badge, s.text)}>
                        {a}%
                      </span>
                      {isTarget && <span className="ml-2 text-xs text-slate-400">target</span>}
                      {isTierBreak && !isTarget && <span className="ml-2 text-xs text-blue-400">tier ↑</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{fmtCompact(revenue)}</td>
                    <td className={cn('py-2.5 px-4 text-right tabular-nums font-medium', s.text)}>{fmt(comm)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-500">{blended.toFixed(2)}%</td>
                    <td className={cn('py-2.5 pl-4 text-right tabular-nums font-semibold', isTarget ? 'text-blue-700' : 'text-slate-900')}>
                      {fmt(base + comm)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommissionCalculator() {
  const [mode, setMode] = useState<Mode>('margin')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Commission Calculator</h1>
        <p className="text-sm text-slate-500">
          Model any commission structure — solve for any variable, see attainment scenarios
        </p>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {([
          { key: 'margin',  label: 'Margin Commission' },
          { key: 'revenue', label: 'Revenue Commission' },
          { key: 'tiered',  label: 'Tiered / Quota' },
        ] as const).map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              mode === m.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'margin'  && <MarginMode />}
      {mode === 'revenue' && <RevenueMode />}
      {mode === 'tiered'  && <TieredMode />}
    </div>
  )
}
