import type { VerdictLabel } from './types'

export type VerdictConfig = {
  label: string
  shortLabel: string
  color: string
  bg: string
  border: string
}

export const VERDICT_CONFIG: Record<VerdictLabel, VerdictConfig> = {
  'strong-move': { label: 'Strong Move', shortLabel: 'Strong Move', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  'soft-move': { label: 'Soft Move', shortLabel: 'Soft Move', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  'lateral': { label: 'Lateral / Wash', shortLabel: 'Lateral', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300' },
  'soft-stay': { label: 'Soft Stay', shortLabel: 'Soft Stay', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  'strong-stay': { label: 'Strong Stay', shortLabel: 'Strong Stay', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
}

/** Combined text+bg+border class string, matching the older inline maps. */
export function verdictClasses(v: VerdictLabel): string {
  const c = VERDICT_CONFIG[v]
  return `${c.color} ${c.bg} ${c.border}`
}
