import { useState } from 'react'
import { cn } from '../../lib/cn'
import { Slider } from '../ui/slider'
import { Select } from '../ui/select'

type LockMode = 'ote' | 'base' | 'free'
type QWeight = 'equal' | 'backloaded' | 'frontloaded' | 'ramp'
type Filing = 'single' | 'married'

const Q_WEIGHTS: Record<QWeight, [number, number, number, number]> = {
  equal:       [0.25, 0.25, 0.25, 0.25],
  backloaded:  [0.20, 0.20, 0.25, 0.35],
  frontloaded: [0.35, 0.25, 0.20, 0.20],
  ramp:        [0.15, 0.20, 0.30, 0.35],
}

const SCENARIOS = [0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5] as const

const SC_STYLES: Record<number, { badgeBg: string; badgeText: string; barColor: string }> = {
  0.5:  { badgeBg: 'bg-red-50',     badgeText: 'text-red-600',     barColor: '#dc2626' },
  0.75: { badgeBg: 'bg-orange-50',  badgeText: 'text-orange-600',  barColor: '#ea580c' },
  0.9:  { badgeBg: 'bg-amber-50',   badgeText: 'text-amber-700',   barColor: '#d97706' },
  1.0:  { badgeBg: 'bg-blue-50',    badgeText: 'text-blue-700',    barColor: '#2563eb' },
  1.1:  { badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', barColor: '#059669' },
  1.25: { badgeBg: 'bg-green-50',   badgeText: 'text-green-700',   barColor: '#16a34a' },
  1.5:  { badgeBg: 'bg-green-100',  badgeText: 'text-green-800',   barColor: '#15803d' },
}

const TAX_BRACKETS: Record<Filing, [number, number][]> = {
  single: [
    [11600, 0.10], [47150, 0.12], [100525, 0.22],
    [191950, 0.24], [243725, 0.32], [609350, 0.35], [Infinity, 0.37],
  ],
  married: [
    [23200, 0.10], [94300, 0.12], [201050, 0.22],
    [383900, 0.24], [487450, 0.32], [731200, 0.35], [Infinity, 0.37],
  ],
}
const STD_DEDUCTION: Record<Filing, number> = { single: 14600, married: 29200 }

const LOCK_HINTS: Record<LockMode, string> = {
  ote:  'OTE locked — adjust base or split, the other rebalances',
  base: 'Base locked — OTE recalculates from split',
  free: 'Free mode — split updates to match',
}

const ARC_LEN = Math.PI * 60

// ── Pure helpers ─────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function fmtDelta(n: number): string {
  const abs = '$' + Math.abs(Math.round(n)).toLocaleString('en-US')
  return n >= 0 ? `+${abs}` : `-${abs}`
}

function pctStr(n: number): string {
  return Math.round(n * 100) + '%'
}

function clampSplit(v: number): number {
  return Math.max(30, Math.min(90, Math.round(v)))
}

function estimateFederalTax(income: number, filing: Filing): number {
  const taxable = Math.max(0, income - STD_DEDUCTION[filing])
  const brackets = TAX_BRACKETS[filing]
  let tax = 0, prev = 0
  for (const [cap, rate] of brackets) {
    if (taxable <= prev) break
    tax += (Math.min(taxable, cap) - prev) * rate
    prev = cap
  }
  return Math.round(tax)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OfferGauge({ ote, target }: { ote: number; target: number }) {
  const pct = target > 0 ? Math.round((ote / target) * 100) : 0
  const displayPct = Math.min(pct, 100)
  const offset = ARC_LEN * (1 - displayPct / 100)
  const color = pct >= 95 ? '#16a34a' : pct >= 80 ? '#d97706' : '#dc2626'
  const label = pct > 100 ? `${pct}% — above target` : pct >= 95 ? `${pct}% — nearly there` : pct >= 80 ? `${pct}% — close` : `${pct}% — below target`

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 140 82" className="w-44">
        <path d="M 10 75 A 60 60 0 0 1 130 75" stroke="#e2e8f0" fill="none" strokeWidth={10} strokeLinecap="round" />
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          stroke={color}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={ARC_LEN}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
        />
        <text x="70" y="61" textAnchor="middle" fontSize="21" fontWeight="800" fill="#0f172a" fontFamily="system-ui, sans-serif">
          {pct > 100 ? '>100' : pct}%
        </text>
        <text x="70" y="74" textAnchor="middle" fontSize="8" fill="#94a3b8" letterSpacing="1" fontFamily="system-ui, sans-serif">
          OF TARGET
        </text>
      </svg>
      <p className="text-xs text-slate-400 text-center">{label}</p>
    </div>
  )
}

function TogglePill({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border',
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      {active ? '✓ ' : ''}{label}
    </button>
  )
}

function MoneyInput({
  label, value, onChange, hint, step = 1000,
}: {
  label: string; value: number; onChange: (n: number) => void; hint?: string; step?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">$</span>
        <input
          type="number"
          value={value}
          step={step}
          min={0}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="h-9 w-full rounded-md border border-slate-300 bg-white pl-6 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function LockBar({ mode, onChange }: { mode: LockMode; onChange: (m: LockMode) => void }) {
  return (
    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
      {(['ote', 'base', 'free'] as LockMode[]).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            'flex-1 py-1.5 text-xs font-semibold transition-colors',
            mode === m ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          {m === 'ote' ? 'Lock OTE' : m === 'base' ? 'Lock Base' : 'Free'}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface OteCalculatorProps {
  initialBase?: number
  initialOte?: number
}

export function OteCalculator({ initialBase = 140_000, initialOte = 233_316 }: OteCalculatorProps) {
  // Core inputs
  const [lockMode, setLockMode] = useState<LockMode>('ote')
  const [base, setBase] = useState(initialBase)
  const [ote, setOte] = useState(initialOte)
  const [split, setSplit] = useState(60)
  const [qWeight, setQWeight] = useState<QWeight>('equal')
  const [accelOn, setAccelOn] = useState(false)
  const [accelRate, setAccelRate] = useState(1.5)

  // Gauge
  const [targetOte, setTargetOte] = useState(250000)

  // Feature toggles
  const [showTotalComp, setShowTotalComp] = useState(false)
  const [showCounter, setShowCounter] = useState(false)
  const [showTakeHome, setShowTakeHome] = useState(false)

  // Total comp extras
  const [equity, setEquity] = useState(0)
  const [signOn, setSignOn] = useState(0)
  const [matchPct, setMatchPct] = useState(0)

  // Counter offer
  const [counterLock, setCounterLock] = useState<LockMode>('ote')
  const [counterBase, setCounterBase] = useState(155000)
  const [counterOte, setCounterOte] = useState(250000)
  const [counterSplit, setCounterSplit] = useState(62)

  // Take-home
  const [filing, setFiling] = useState<Filing>('single')

  // ── Derived ──
  const variable = Math.max(0, ote - base)
  const basePct = ote > 0 ? Math.round((base / ote) * 100) : split
  const varPct = 100 - basePct
  const weights = Q_WEIGHTS[qWeight]
  const maxEarnings = accelOn ? base + variable + variable * 0.5 * accelRate : base + variable * 1.5
  const totalComp = ote + equity + signOn / 4 + (matchPct / 100) * base

  const counterVariable = Math.max(0, counterOte - counterBase)
  const counterBasePct = counterOte > 0 ? Math.round((counterBase / counterOte) * 100) : counterSplit

  const tax = estimateFederalTax(ote, filing)
  const netAnnual = ote - tax
  const counterTax = estimateFederalTax(counterOte, filing)
  const counterNet = counterOte - counterTax

  // ── Core lock handlers ──
  function onLockMode(mode: LockMode) {
    setLockMode(mode)
    if (ote > 0) setSplit(clampSplit((base / ote) * 100))
  }
  function onBase(n: number) {
    if (lockMode === 'base') { setBase(n); setOte(split > 0 ? Math.round(n / (split / 100)) : ote) }
    else { const s = ote > 0 ? clampSplit((n / ote) * 100) : split; setBase(n); setSplit(s) }
  }
  function onOTE(n: number) {
    if (lockMode === 'ote') { setOte(n); setBase(Math.round(n * split / 100)) }
    else { const s = n > 0 ? clampSplit((base / n) * 100) : split; setOte(n); setSplit(s) }
  }
  function onSplit(n: number) {
    if (lockMode === 'base') { setSplit(n); setOte(n > 0 ? Math.round(base / (n / 100)) : ote) }
    else { setSplit(n); setBase(Math.round(ote * n / 100)) }
  }

  // ── Counter lock handlers ──
  function onCounterLock(mode: LockMode) {
    setCounterLock(mode)
    if (counterOte > 0) setCounterSplit(clampSplit((counterBase / counterOte) * 100))
  }
  function onCounterBase(n: number) {
    if (counterLock === 'base') { setCounterBase(n); setCounterOte(counterSplit > 0 ? Math.round(n / (counterSplit / 100)) : counterOte) }
    else { const s = counterOte > 0 ? clampSplit((n / counterOte) * 100) : counterSplit; setCounterBase(n); setCounterSplit(s) }
  }
  function onCounterOTE(n: number) {
    if (counterLock === 'ote') { setCounterOte(n); setCounterBase(Math.round(n * counterSplit / 100)) }
    else { const s = n > 0 ? clampSplit((counterBase / n) * 100) : counterSplit; setCounterOte(n); setCounterSplit(s) }
  }

  const takeHomeRows = [
    { label: 'Gross OTE',    offer: ote,         counter: counterOte,  isNeg: false, bold: false },
    { label: 'Fed Tax (est.)', offer: tax,        counter: counterTax,  isNeg: true,  bold: false },
    { label: 'Net Annual',   offer: netAnnual,    counter: counterNet,  isNeg: false, bold: true  },
    { label: 'Monthly',      offer: netAnnual / 12, counter: counterNet / 12, isNeg: false, bold: false },
    { label: 'Biweekly',     offer: netAnnual / 26, counter: counterNet / 26, isNeg: false, bold: false },
  ]

  const deltaRows = [
    { label: 'Base',       delta: counterBase - base,              isSplit: false },
    { label: 'OTE',        delta: counterOte - ote,                isSplit: false },
    { label: 'Variable',   delta: counterVariable - variable,      isSplit: false },
    { label: 'Split (Base%)', delta: counterBasePct - basePct,     isSplit: true  },
  ]

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Comp Structure Calculator</h1>
        <p className="text-sm text-slate-500">Lock a value, change anything else, watch it rebalance</p>
      </div>

      {/* Feature toggle bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Features:</span>
        <TogglePill label="Total Comp" active={showTotalComp} onToggle={() => setShowTotalComp(v => !v)} />
        <TogglePill label="Counter Offer" active={showCounter} onToggle={() => setShowCounter(v => !v)} />
        <TogglePill label="Take-Home" active={showTakeHome} onToggle={() => setShowTakeHome(v => !v)} />
        <TogglePill label="Accelerator" active={accelOn} onToggle={() => setAccelOn(v => !v)} />
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Inputs card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Lock Mode</p>
            <LockBar mode={lockMode} onChange={onLockMode} />
            <p className="text-xs text-slate-400 mt-1.5">{LOCK_HINTS[lockMode]}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MoneyInput label="Base Salary" value={base} onChange={onBase} />
            <MoneyInput label="Total OTE" value={ote} onChange={onOTE} />
          </div>

          <Slider
            label={`Base / Variable Split`}
            value={split}
            min={30} max={90} step={1}
            onChange={onSplit}
            formatValue={v => `${v} / ${100 - v}`}
          />

          <Select
            label="Quarterly Weighting"
            value={qWeight}
            onChange={e => setQWeight(e.target.value as QWeight)}
            options={[
              { value: 'equal',       label: 'Equal (25/25/25/25)' },
              { value: 'backloaded',  label: 'Back-Loaded (20/20/25/35)' },
              { value: 'frontloaded', label: 'Front-Loaded (35/25/20/20)' },
              { value: 'ramp',        label: 'Ramp (15/20/30/35)' },
            ]}
          />

          {accelOn && (
            <Slider
              label="Accelerator Rate"
              value={accelRate}
              min={1.1} max={3} step={0.1}
              onChange={setAccelRate}
              formatValue={v => `${v.toFixed(1)}×`}
              hint="Multiplier on variable comp earned above 100% attainment"
            />
          )}
        </div>

        {/* Gauge + summary card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <MoneyInput
            label="Your Target OTE"
            value={targetOte}
            onChange={setTargetOte}
            hint="Your walk-away number — sets the gauge benchmark"
          />

          <OfferGauge ote={ote} target={targetOte} />

          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">OTE</p>
              <p className="font-bold text-slate-900 text-sm tabular-nums">{fmt(ote)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">Variable</p>
              <p className="font-bold text-blue-600 text-sm tabular-nums">{fmt(variable)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">Split</p>
              <p className="font-bold text-slate-900 text-sm">{basePct}/{varPct}</p>
            </div>
          </div>

          <div>
            <div className="flex rounded-full overflow-hidden h-2 bg-slate-100">
              <div className="bg-blue-500 transition-all duration-300" style={{ width: `${basePct}%` }} />
              <div className="bg-emerald-400 flex-1" />
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-400">
              <span>Base {basePct}%</span>
              <span>Variable {varPct}%</span>
            </div>
          </div>

          {showTotalComp && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-1.5 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">True Total Comp</p>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">OTE</span>
                <span className="tabular-nums font-medium">{fmt(ote)}</span>
              </div>
              {equity > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Annual Equity (RSU)</span>
                  <span className="tabular-nums font-medium text-emerald-700">+{fmt(equity)}</span>
                </div>
              )}
              {signOn > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Sign-On ÷ 4</span>
                  <span className="tabular-nums font-medium text-emerald-700">+{fmt(signOn / 4)}</span>
                </div>
              )}
              {matchPct > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">401k Match</span>
                  <span className="tabular-nums font-medium text-emerald-700">+{fmt((matchPct / 100) * base)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-blue-200 pt-1.5 mt-1">
                <span className="text-blue-700">Total Annual Comp</span>
                <span className="text-blue-700 tabular-nums">{fmt(totalComp)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Total Comp inputs panel */}
      {showTotalComp && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Total Comp Inputs</p>
          <div className="grid grid-cols-3 gap-4">
            <MoneyInput label="Annual Equity (RSU)" value={equity} onChange={setEquity} hint="Annual vesting value" step={5000} />
            <MoneyInput label="Sign-On Bonus" value={signOn} onChange={setSignOn} hint="Shown amortized over 4 years" step={5000} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">401k Match %</label>
              <div className="relative">
                <input
                  type="number"
                  value={matchPct}
                  min={0} max={20} step={0.5}
                  onChange={e => setMatchPct(parseFloat(e.target.value) || 0)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white pl-3 pr-6 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">%</span>
              </div>
              <p className="text-xs text-slate-500">Applied to base salary</p>
            </div>
          </div>
        </div>
      )}

      {/* Counter Offer panel */}
      {showCounter && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm font-semibold text-slate-700">Counter Offer</p>
            <p className="text-sm">
              {counterOte > ote
                ? <span className="text-emerald-600 font-semibold">Asking {fmtDelta(counterOte - ote)} OTE ({Math.round(((counterOte - ote) / ote) * 100)}% more)</span>
                : counterOte < ote
                  ? <span className="text-red-600 font-semibold">Counter is {fmtDelta(counterOte - ote)} OTE below offer</span>
                  : <span className="text-slate-400">Counter matches offer</span>
              }
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Their offer */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Their Offer</p>
              <div className="space-y-0.5 text-sm">
                {[
                  { label: 'Base',     val: fmt(base) },
                  { label: 'OTE',      val: fmt(ote) },
                  { label: 'Variable', val: fmt(variable) },
                  { label: 'Split',    val: `${basePct}/${varPct}` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{r.label}</span>
                    <span className="font-medium tabular-nums text-slate-900">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Your ask */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Ask</p>
              <div className="flex rounded-md border border-slate-200 overflow-hidden mb-3">
                {(['ote', 'base', 'free'] as LockMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => onCounterLock(m)}
                    className={cn(
                      'flex-1 py-1 text-xs font-semibold transition-colors',
                      counterLock === m ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    {m === 'ote' ? 'OTE' : m === 'base' ? 'Base' : 'Free'}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <MoneyInput label="Base" value={counterBase} onChange={onCounterBase} step={5000} />
                <MoneyInput label="OTE" value={counterOte} onChange={onCounterOTE} step={5000} />
              </div>
            </div>

            {/* Delta */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Ask − Offer</p>
              <div className="space-y-0.5 text-sm">
                {deltaRows.map(r => (
                  <div key={r.label} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{r.label}</span>
                    <span className={cn('font-semibold tabular-nums',
                      r.delta > 0 ? 'text-emerald-600' : r.delta < 0 ? 'text-red-600' : 'text-slate-400',
                    )}>
                      {r.delta === 0
                        ? '—'
                        : r.isSplit
                          ? `${r.delta > 0 ? '+' : ''}${r.delta}pp`
                          : fmtDelta(r.delta)
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Take-Home panel */}
      {showTakeHome && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <p className="text-sm font-semibold text-slate-700">Take-Home Estimate</p>
            <Select
              value={filing}
              onChange={e => setFiling(e.target.value as Filing)}
              options={[
                { value: 'single',  label: 'Filing: Single' },
                { value: 'married', label: 'Filing: Married' },
              ]}
              className="w-44"
            />
            <p className="text-xs text-slate-400 ml-auto">Federal tax only · 2024 brackets · rough estimate</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-6" />
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Their Offer</th>
                  {showCounter && <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Your Ask</th>}
                </tr>
              </thead>
              <tbody>
                {takeHomeRows.map(r => (
                  <tr key={r.label} className={cn('border-b border-slate-100 last:border-0', r.bold && 'font-semibold bg-slate-50')}>
                    <td className="py-2 pr-6 text-slate-600">{r.label}</td>
                    <td className={cn('py-2 px-4 text-right tabular-nums', r.isNeg ? 'text-red-600' : 'text-slate-900')}>
                      {r.isNeg ? `(${fmt(r.offer)})` : fmt(r.offer)}
                    </td>
                    {showCounter && (
                      <td className={cn('py-2 px-4 text-right tabular-nums', r.isNeg ? 'text-red-600' : 'text-slate-900')}>
                        {r.isNeg ? `(${fmt(r.counter)})` : fmt(r.counter)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quarterly Targets */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Quarterly Variable Targets</p>
        <div className="grid grid-cols-4 gap-3">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, i) => (
            <div key={q} className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-1">{q}</p>
              <p className="font-bold text-slate-900 tabular-nums">{fmt(variable * weights[i])}</p>
              <p className="text-xs text-slate-400 mt-0.5">{Math.round(weights[i] * 100)}% of variable</p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Scenarios */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Performance Scenarios</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">Attainment</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4">Variable Earned</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 px-4 w-32">Progress</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pl-4">Total Earnings</th>
                {showTakeHome && <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pl-4">Take-Home</th>}
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map(att => {
                const varEarned = att <= 1.0
                  ? variable * att
                  : accelOn
                    ? variable + variable * (att - 1.0) * accelRate
                    : variable * att
                const total = base + varEarned
                const barWidth = maxEarnings > 0 ? Math.min((total / maxEarnings) * 100, 100) : 0
                const s = SC_STYLES[att]
                const isTarget = att === 1.0
                const scTakeHome = estimateFederalTax(total, filing)

                return (
                  <tr key={att} className={cn('border-b border-slate-100 last:border-0', isTarget && 'bg-blue-50/50')}>
                    <td className="py-2.5 pr-4">
                      <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold', s.badgeBg, s.badgeText)}>
                        {pctStr(att)}
                      </span>
                      {isTarget && <span className="ml-2 text-xs text-slate-400">target</span>}
                    </td>
                    <td className={cn('py-2.5 px-4 text-right tabular-nums font-medium', s.badgeText)}>
                      {fmt(varEarned)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-28">
                        <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, background: s.barColor }} />
                      </div>
                    </td>
                    <td className={cn('py-2.5 pl-4 text-right tabular-nums font-semibold', isTarget ? 'text-blue-700' : 'text-slate-900')}>
                      {fmt(total)}
                    </td>
                    {showTakeHome && (
                      <td className="py-2.5 pl-4 text-right tabular-nums text-slate-500">
                        ~{fmt(total - scTakeHome)}
                      </td>
                    )}
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
