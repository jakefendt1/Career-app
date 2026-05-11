import { useState } from 'react'
import './ote-calculator.css'

type LockMode = 'ote' | 'base' | 'free'
type QWeight = 'equal' | 'backloaded' | 'frontloaded' | 'ramp'

const Q_WEIGHTS: Record<QWeight, [number, number, number, number]> = {
  equal:       [0.25, 0.25, 0.25, 0.25],
  backloaded:  [0.20, 0.20, 0.25, 0.35],
  frontloaded: [0.35, 0.25, 0.20, 0.20],
  ramp:        [0.15, 0.20, 0.30, 0.35],
}

const SCENARIOS = [0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5] as const

const SC_COLORS: Record<number, { badge: string; text: string; bar: string }> = {
  0.5:  { badge: 'rgba(255,107,53,0.15)', text: '#ff6b35', bar: '#ff6b35' },
  0.75: { badge: 'rgba(255,107,53,0.1)',  text: '#ff8c60', bar: '#ff8c60' },
  0.9:  { badge: 'rgba(255,200,60,0.12)', text: '#ffcc3c', bar: '#ffcc3c' },
  1.0:  { badge: 'rgba(79,142,255,0.18)', text: '#4f8eff', bar: '#4f8eff' },
  1.1:  { badge: 'rgba(0,229,160,0.12)',  text: '#00e5a0', bar: '#00e5a0' },
  1.25: { badge: 'rgba(0,229,160,0.16)',  text: '#00e5a0', bar: '#00e5a0' },
  1.5:  { badge: 'rgba(0,229,160,0.22)',  text: '#00ffc8', bar: '#00ffc8' },
}

const LOCK_HINTS: Record<LockMode, string> = {
  ote:  '// OTE stays fixed — change Base or Split, the other rebalances',
  base: '// Base stays fixed — OTE recalculates from split',
  free: '// Edit anything — the split adjusts to match',
}

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function pctStr(n: number): string {
  return Math.round(n * 100) + '%'
}

function clampSplit(v: number): number {
  return Math.max(30, Math.min(90, Math.round(v)))
}

export function OteCalculator() {
  const [lockMode, setLockMode] = useState<LockMode>('ote')
  const [base, setBase] = useState(140000)
  const [ote, setOte] = useState(233316)
  const [split, setSplit] = useState(60)
  const [qWeight, setQWeight] = useState<QWeight>('equal')
  const [accelOn, setAccelOn] = useState(false)
  const [accelRate, setAccelRate] = useState(1.5)

  const variable = Math.max(0, ote - base)
  const basePct = ote > 0 ? Math.round((base / ote) * 100) : split
  const varPct = 100 - basePct
  const weights = Q_WEIGHTS[qWeight]
  const maxEarnings = accelOn
    ? base + variable + variable * 0.5 * accelRate
    : base + variable * 1.5

  function onLockMode(mode: LockMode) {
    setLockMode(mode)
    if (ote > 0) setSplit(clampSplit((base / ote) * 100))
  }

  function onBase(newBase: number) {
    if (lockMode === 'base') {
      const newOTE = split > 0 ? Math.round(newBase / (split / 100)) : ote
      setBase(newBase); setOte(newOTE)
    } else {
      const newSplit = ote > 0 ? clampSplit((newBase / ote) * 100) : split
      setBase(newBase); setSplit(newSplit)
    }
  }

  function onOTE(newOTE: number) {
    if (lockMode === 'ote') {
      setOte(newOTE); setBase(Math.round(newOTE * split / 100))
    } else {
      const newSplit = newOTE > 0 ? clampSplit((base / newOTE) * 100) : split
      setOte(newOTE); setSplit(newSplit)
    }
  }

  function onSplit(newSplit: number) {
    if (lockMode === 'base') {
      const newOTE = newSplit > 0 ? Math.round(base / (newSplit / 100)) : ote
      setSplit(newSplit); setOte(newOTE)
    } else {
      setSplit(newSplit); setBase(Math.round(ote * newSplit / 100))
    }
  }

  return (
    <div className="ote-root">
      <div className="ote-grid-bg" />
      <div className="ote-container">

        <header className="ote-header">
          <div className="ote-eyebrow">// Job Offer Evaluator</div>
          <h1 className="ote-h1">Comp Structure <span>Calculator</span></h1>
          <div className="ote-subtitle">Lock a value, change anything else, watch it rebalance</div>
        </header>

        <div className="ote-layout">

          {/* ── Inputs ── */}
          <div className="ote-card">
            <div className="ote-card-label">Inputs</div>

            <label className="ote-label" style={{ marginBottom: 8 }}>Lock Mode</label>
            <div className="ote-lock-mode">
              {(['ote', 'base', 'free'] as LockMode[]).map(mode => (
                <button
                  key={mode}
                  className={`ote-lock-btn${lockMode === mode ? ' active' : ''}`}
                  onClick={() => onLockMode(mode)}
                >
                  {mode === 'ote' ? 'Lock OTE' : mode === 'base' ? 'Lock Base' : 'Free'}
                </button>
              ))}
            </div>
            <div className="ote-lock-hint">{LOCK_HINTS[lockMode]}</div>

            <div className="ote-input-group">
              <div className="ote-input-header">
                <label className="ote-label">Base Salary</label>
                <span className={`ote-lock-badge${lockMode === 'base' ? ' locked' : ''}`}>
                  {lockMode === 'base' ? 'LOCKED' : 'DRIVER'}
                </span>
              </div>
              <div className="ote-input-wrap">
                <span className="ote-input-prefix">$</span>
                <input
                  type="number"
                  className="ote-input"
                  value={base}
                  onChange={e => onBase(parseInt(e.target.value) || 0)}
                  min={0} step={1000}
                />
              </div>
            </div>

            <div className="ote-input-group">
              <div className="ote-input-header">
                <label className="ote-label">Total OTE</label>
                <span className={`ote-lock-badge${lockMode === 'ote' ? ' locked' : lockMode === 'base' ? ' calc' : ' free'}`}>
                  {lockMode === 'ote' ? 'LOCKED' : lockMode === 'base' ? 'DERIVED' : 'FREE'}
                </span>
              </div>
              <div className="ote-input-wrap">
                <span className="ote-input-prefix">$</span>
                <input
                  type="number"
                  className={`ote-input${lockMode === 'base' ? ' derived' : ''}`}
                  value={ote}
                  onChange={e => onOTE(parseInt(e.target.value) || 0)}
                  min={0} step={1000}
                />
              </div>
            </div>

            <div className="ote-slider-group">
              <div className="ote-slider-header">
                <label className="ote-label" style={{ margin: 0 }}>Split Ratio (Base / Variable)</label>
                <span className="ote-slider-val">{split} / {100 - split}</span>
              </div>
              <input
                type="range"
                className="ote-range"
                min={30} max={90} step={1}
                value={split}
                onChange={e => onSplit(parseInt(e.target.value))}
              />
            </div>

            <div className="ote-input-group">
              <label className="ote-label" style={{ marginBottom: 6 }}>Quarterly Weighting</label>
              <select
                className="ote-select"
                value={qWeight}
                onChange={e => setQWeight(e.target.value as QWeight)}
              >
                <option value="equal">Equal (25/25/25/25)</option>
                <option value="backloaded">Back-Loaded (20/20/25/35)</option>
                <option value="frontloaded">Front-Loaded (35/25/20/20)</option>
                <option value="ramp">Ramp (15/20/30/35)</option>
              </select>
            </div>

            <div className="ote-toggle-row">
              <span className="ote-toggle-label">Accelerator above 100%</span>
              <label className="ote-toggle">
                <input type="checkbox" checked={accelOn} onChange={e => setAccelOn(e.target.checked)} />
                <span className="ote-toggle-slider" />
              </label>
            </div>

            {accelOn && (
              <div className="ote-slider-group" style={{ paddingTop: 8 }}>
                <div className="ote-slider-header">
                  <label className="ote-label" style={{ margin: 0 }}>Accelerator Rate</label>
                  <span className="ote-slider-val">{accelRate.toFixed(1)}×</span>
                </div>
                <input
                  type="range"
                  className="ote-range"
                  min={1.1} max={3} step={0.1}
                  value={accelRate}
                  onChange={e => setAccelRate(parseFloat(e.target.value))}
                />
                <div className="ote-accel-note">Multiplier on variable comp earned above 100% attainment</div>
              </div>
            )}
          </div>

          {/* ── Summary ── */}
          <div className="ote-card">
            <div className="ote-card-label">Summary</div>

            <div style={{ marginBottom: 22 }}>
              <div className="ote-big-num accent">{fmt(ote)}</div>
              <div className="ote-big-label">Total OTE</div>
            </div>
            <div style={{ marginBottom: 22 }}>
              <div className="ote-big-num green">{fmt(variable)}</div>
              <div className="ote-big-label">Variable @ 100% Attainment</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div className="ote-big-num warn">{basePct} / {varPct}</div>
              <div className="ote-big-label">Base / Variable Split</div>
            </div>

            <div className="ote-split-bar-wrap">
              <div className="ote-split-bar">
                <div className="ote-split-bar-base" style={{ width: `${basePct}%` }} />
                <div className="ote-split-bar-var" />
              </div>
            </div>

            <div className="ote-split-display">
              <div className="ote-split-half">
                <div className="ote-pct base">{basePct}%</div>
                <div className="ote-pct-label">Base</div>
              </div>
              <div className="ote-split-half">
                <div className="ote-pct var">{varPct}%</div>
                <div className="ote-pct-label">Variable</div>
              </div>
            </div>
          </div>

          {/* ── Quarterly Targets ── */}
          <div className="ote-card ote-full">
            <div className="ote-card-label">Quarterly Variable Targets</div>
            <div className="ote-q-grid">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, i) => (
                <div key={q} className="ote-q-box">
                  <div className="ote-q-label">{q}</div>
                  <div className="ote-q-val">{fmt(variable * weights[i])}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Performance Scenarios ── */}
          <div className="ote-card ote-full">
            <div className="ote-card-label">Performance Scenarios</div>
            <table className="ote-scenario-table">
              <thead>
                <tr>
                  <th>Attainment</th>
                  <th>Variable Earned</th>
                  <th className="ote-bar-cell" />
                  <th>Total Earnings</th>
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
                  const c = SC_COLORS[att]
                  const isTarget = att === 1.0

                  return (
                    <tr key={att} style={isTarget ? { background: 'rgba(79,142,255,0.06)' } : undefined}>
                      <td>
                        <span className="ote-attain-badge" style={{ background: c.badge, color: c.text }}>
                          {pctStr(att)}
                        </span>
                        {isTarget && <span className="ote-target-tag">target</span>}
                      </td>
                      <td style={{ color: c.text }}>{fmt(varEarned)}</td>
                      <td className="ote-bar-cell">
                        <div className="ote-scenario-bar-bg">
                          <div className="ote-scenario-bar-fill" style={{ width: `${barWidth}%`, background: c.bar }} />
                        </div>
                      </td>
                      <td style={{ color: isTarget ? '#4f8eff' : 'var(--ote-text)' }}>{fmt(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}
