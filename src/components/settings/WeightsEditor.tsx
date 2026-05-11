import { useAppStore } from '../../store/useAppStore'
import type { UserPreferences } from '../../lib/types'
import { Slider } from '../ui/slider'
import { Card, CardBody, CardHeader } from '../ui/card'

type WeightKey = keyof UserPreferences['weights']
const WEIGHT_KEYS: WeightKey[] = ['comp', 'career', 'lifestyle', 'risk', 'personal']
const WEIGHT_LABELS: Record<WeightKey, string> = {
  comp: 'Compensation',
  career: 'Career & Growth',
  lifestyle: 'Lifestyle',
  risk: 'Risk',
  personal: 'Personal Excitement',
}

export function WeightsEditor() {
  const { preferences, updatePreferences } = useAppStore()
  const { weights } = preferences

  const total = Object.values(weights).reduce((a, b) => a + b, 0)

  function handleWeightChange(key: WeightKey, newValue: number) {
    const others = WEIGHT_KEYS.filter(k => k !== key)
    const remaining = 100 - newValue
    const currentOthersTotal = others.reduce((a, k) => a + weights[k], 0)

    const newWeights = { ...weights, [key]: newValue }

    if (currentOthersTotal > 0) {
      const scale = remaining / currentOthersTotal
      for (const k of others) {
        newWeights[k] = Math.max(0, Math.round(weights[k] * scale))
      }
      // Fix rounding drift
      const drift = 100 - Object.values(newWeights).reduce((a, b) => a + b, 0)
      const adjustKey = others.find(k => newWeights[k] + drift >= 0) ?? others[0]
      newWeights[adjustKey!] = (newWeights[adjustKey!] ?? 0) + drift
    }

    updatePreferences({ weights: newWeights })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Scoring Weights</h3>
          <span className={`text-xs font-medium ${total === 100 ? 'text-green-600' : 'text-red-600'}`}>
            Total: {total}/100
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Adjust how much each category matters to you. Weights auto-balance to sum to 100.
        </p>
      </CardHeader>
      <CardBody>
        <div className="space-y-5">
          {WEIGHT_KEYS.map(key => (
            <Slider
              key={key}
              label={WEIGHT_LABELS[key]}
              value={weights[key]}
              onChange={v => handleWeightChange(key, v)}
              min={0}
              max={80}
              step={1}
              formatValue={v => `${v}%`}
            />
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
