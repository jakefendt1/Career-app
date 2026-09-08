import { useState } from 'react'
import type { Role, UserPreferences } from '../../lib/types'
import { compareRoles } from '../../lib/scoring'
import { Slider } from '../ui/slider'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'
import { VERDICT_CONFIG, verdictClasses } from '../../lib/verdict'

type Props = {
  target: Role
  current: Role
  preferences: UserPreferences
}

export function SensitivityPanel({ target, current, preferences }: Props) {
  const [attainmentPct, setAttainmentPct] = useState(target.comp.realisticAttainment * 100)
  const [baseDeltaPct, setBaseDeltaPct] = useState(0)
  const [compWeightOverride, setCompWeightOverride] = useState(preferences.weights.comp)
  const [travelDays, setTravelDays] = useState(target.lifestyle.travelDaysPerMonth)
  const [managerQuality, setManagerQuality] = useState(target.lifestyle.managerQuality)

  function buildAdjustedRole(): Role {
    const baseMultiplier = 1 + baseDeltaPct / 100
    return {
      ...target,
      comp: {
        ...target.comp,
        base: target.comp.base * baseMultiplier,
        realisticAttainment: attainmentPct / 100,
      },
      lifestyle: {
        ...target.lifestyle,
        travelDaysPerMonth: travelDays,
        managerQuality,
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
  const verdictLabel = VERDICT_CONFIG[result.verdict].shortLabel

  function reset() {
    setAttainmentPct(target.comp.realisticAttainment * 100)
    setBaseDeltaPct(0)
    setCompWeightOverride(preferences.weights.comp)
    setTravelDays(target.lifestyle.travelDaysPerMonth)
    setManagerQuality(target.lifestyle.managerQuality)
  }

  const isDefault =
    Math.abs(attainmentPct - target.comp.realisticAttainment * 100) < 1 &&
    baseDeltaPct === 0 &&
    compWeightOverride === preferences.weights.comp &&
    travelDays === target.lifestyle.travelDaysPerMonth &&
    managerQuality === target.lifestyle.managerQuality

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-800">Sensitivity Analysis</h3>
        {!isDefault && (
          <Button variant="ghost" size="sm" onClick={reset}>Reset to actuals</Button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">Drag any assumption to see how much it would take to flip the verdict.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-5">
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
        <Slider
          label="What if travel was..."
          value={travelDays}
          onChange={setTravelDays}
          min={0}
          max={20}
          step={1}
          formatValue={v => `${v} days/mo`}
        />
        <Slider
          label="What if the manager rated..."
          value={managerQuality}
          onChange={setManagerQuality}
          min={1}
          max={10}
          step={1}
          formatValue={v => `${v}/10`}
        />
      </div>

      <div className={cn('rounded-lg border px-4 py-3 flex items-center justify-between', verdictClasses(result.verdict))}>
        <span className="text-sm font-semibold">{verdictLabel}</span>
        <span className="text-sm">
          Score delta: {result.scoreDelta >= 0 ? '+' : ''}{result.scoreDelta.toFixed(1)} pts
        </span>
      </div>
    </div>
  )
}
