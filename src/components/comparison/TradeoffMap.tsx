import type { Role } from '../../lib/types'
import { buildNarrative } from '../../lib/narrative'
import { useAppStore } from '../../store/useAppStore'
import { TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  target: Role
  current: Role
}

/** Plain-English gain/concern sentences with real units, ranked by each
 *  field's normalized delta weighted by the user's section weights. */
export function TradeoffMap({ target, current }: Props) {
  const { preferences } = useAppStore()
  const { gains, concerns } = buildNarrative(target, current, preferences.weights)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-green-600" />
          <h3 className="font-semibold text-green-800 text-sm">What you'd gain</h3>
        </div>
        {gains.length === 0 ? (
          <p className="text-sm text-green-600 italic">No clear advantages over current role.</p>
        ) : (
          <ul className="space-y-2">
            {gains.slice(0, 6).map(g => (
              <li key={g.key} className="text-sm text-green-800">• {g.sentence}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={16} className="text-red-600" />
          <h3 className="font-semibold text-red-800 text-sm">What you'd give up</h3>
        </div>
        {concerns.length === 0 ? (
          <p className="text-sm text-red-600 italic">No clear downsides vs. current role.</p>
        ) : (
          <ul className="space-y-2">
            {concerns.slice(0, 6).map(c => (
              <li key={c.key} className="text-sm text-red-800">• {c.sentence}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
