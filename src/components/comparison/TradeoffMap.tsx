import type { ComparisonResult, Role } from '../../lib/types'
import { formatCurrency } from '../../lib/formatting'
import { useAppStore } from '../../store/useAppStore'
import { TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  result: ComparisonResult
  target: Role
  current: Role
}

function humanizeDelta(delta: FieldDelta, currency: string): string {
  if (delta.label === 'risk-adjusted comp') {
    const sign = delta.delta >= 0 ? '+' : ''
    return `${sign}${formatCurrency(delta.delta, currency)} risk-adjusted comp vs. current role`
  }
  const bigger = delta.delta >= 0 ? 'higher' : 'lower'
  return `${delta.label}: ${delta.targetValue}/10 vs. ${delta.currentValue}/10 (${bigger})`
}

type FieldDelta = ComparisonResult['topGains'][0]

export function TradeoffMap({ result, target: _target, current: _current }: Props) {
  const { preferences } = useAppStore()

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-green-600" />
          <h3 className="font-semibold text-green-800 text-sm">What you'd gain</h3>
        </div>
        {result.topGains.length === 0 ? (
          <p className="text-sm text-green-600 italic">No clear advantages over current role.</p>
        ) : (
          <ul className="space-y-2">
            {result.topGains.map((d, i) => (
              <li key={i} className="text-sm text-green-800">
                • {humanizeDelta(d, preferences.currency)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={16} className="text-red-600" />
          <h3 className="font-semibold text-red-800 text-sm">What you'd give up</h3>
        </div>
        {result.topConcerns.length === 0 ? (
          <p className="text-sm text-red-600 italic">No clear downsides vs. current role.</p>
        ) : (
          <ul className="space-y-2">
            {result.topConcerns.map((d, i) => (
              <li key={i} className="text-sm text-red-800">
                • {humanizeDelta(d, preferences.currency)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
