import { useState } from 'react'
import type { Role, UserPreferences } from '../../lib/types'
import { compareRoles } from '../../lib/scoring'
import { Slider } from '../ui/slider'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'

type Props = {
  target: Role
  current: Role
  preferences: UserPreferences
}

const VERDICT_COLORS: Record<string, string> = {
  'strong-move': 'text-green-700 bg-green-50 border-green-300',
  'soft-move': 'text-emerald-700 bg-emerald-50 border-emerald-300',
  'lateral': 'text-yellow-700 bg-yellow-50 border-yellow-300',
  'soft-stay': 'text-orange-700 bg-orange-50 border-orange-300',
  'strong-stay': 'text-red-700 bg-red-50 border-red-300',
}

const VERDICT_LABELS: Record<string, string> = {
  'strong-move': 'Strong Move',
  'soft-move': 'Soft Move',
  'lateral': 'Lateral / Wash',
  'soft-stay': 'Soft Stay',
  'strong-stay': 'Strong Stay',
}

export function SensitivityPanel({ target, current, preferences }: Props) {
  const [attainmentPct, setAttainmentPct] = useState(target.comp.realisticAttainment * 100)
  const [baseDeltaPct, setBaseDeltaPct] = useState(0)
  const [compWeightOverride, setCompWeightOverride] = useState(preferences.weights.comp)

  function buildAdjustedRole(): Role {
    const baseMultiplier = 1 + baseDeltaPct / 100
    return {
      ...target,
      comp: {
        ...target.comp,
        base: target.comp.base * baseMultiplier,
        realisticAttainment: attainmentPct / 100,
      },
    }
  }

  function buildAdjustedPrefs(): UserPreferences {
    const others = (['career', 'lifestyle', 'risk', 'personal'] as const)
    const remaining = 100 - compWeightOverride
    const currentOthersTotal = others.reduce((a, k) => a + preferences.weights[k], 0)
    const newWeights = { ...preferences.weights, comp: compWeightOverride }
    if (currentOthersTotal > 0) {
      const scale = remaining / currentOthersTotal
      for (const k of others) newWeights[k] = Math.max(0, Math.round(preferences.weights[k] * scale))
    }
    return { ...preferences, weights: newWeights }
  }

  const adjustedRole = buildAdjustedRole()
  const adjustedPrefs = buildAdjustedPrefs()
  const result = compareRoles(adjustedRole, current, adjustedPrefs)
  const verdictCfg = VERDICT_COLORS[result.verdict] ?? ''

  function reset() {
    setAttainmentPct(target.comp.realisticAttainment * 100)
    setBaseDeltaPct(0)
    setCompWeightOverride(preferences.weights.comp)
  }

  const isDefault =
    Math.abs(attainmentPct - target.comp.realisticAttainment * 100) < 1 &&
    baseDeltaPct === 0 &&
    compWeightOverride === preferences.weights.comp

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Sensitivity Analysis</h3>
        {!isDefault && (
          <Button variant="ghost" size="sm" onClick={reset}>Reset to actuals</Button>
        )}
      </div>

      <div className="space-y-5 mb-5">
        <Slider
          label="What if attainment came in at..."
          value={attainmentPct}
          onChange={setAttainmentPct}
          min={50}
          max={150}
          step={5}
          formatValue={v => `${v}%`}
        />
        <Slider
          label="What if base was..."
          value={baseDeltaPct}
          onChange={setBaseDeltaPct}
          min={-30}
          max={30}
          step={5}
          formatValue={v => v >= 0 ? `+${v}%` : `${v}%`}
        />
        <Slider
          label="What if I weighted comp at..."
          value={compWeightOverride}
          onChange={setCompWeightOverride}
          min={0}
          max={80}
          step={5}
          formatValue={v => `${v}%`}
        />
      </div>

      <div className={cn('rounded-lg border px-4 py-3 flex items-center justify-between', verdictCfg)}>
        <span className="text-sm font-semibold">{VERDICT_LABELS[result.verdict]}</span>
        <span className="text-sm">
          Score delta: {result.scoreDelta >= 0 ? '+' : ''}{result.scoreDelta.toFixed(1)} pts
        </span>
      </div>
    </div>
  )
}
