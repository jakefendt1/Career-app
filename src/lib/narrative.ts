// Turns two roles + weights into plain-English sentences with real units,
// instead of raw score deltas like "7/10 vs. 5/10". Ranking uses each field's
// normalized (0-10) delta weighted by the user's section weight, so the
// biggest real-world drivers of the verdict surface first.

import type { Role, UserPreferences } from './types'
import { calcRealOTE } from './scoring'
import { normalizeTravelDays, normalizeHours, normalizeCommute, normalizeVacation } from './scoring'
import { formatCurrency } from './formatting'

export type NarrativeItem = {
  key: string
  sentence: string
  weightedImpact: number
  isGain: boolean
}

type UnitField = {
  key: string
  section: 'lifestyle'
  getValue: (r: Role) => number
  higherIsBetter: boolean
  normalize: (v: number) => number
  unitSentence: (absDelta: number, better: boolean) => string
}

type RatingField = {
  key: string
  section: 'career' | 'lifestyle' | 'risk' | 'personal'
  label: string
  getValue: (r: Role) => number
}

const UNIT_FIELDS: UnitField[] = [
  {
    key: 'travelDaysPerMonth', section: 'lifestyle',
    getValue: r => r.lifestyle.travelDaysPerMonth, higherIsBetter: false,
    normalize: normalizeTravelDays,
    unitSentence: (d, better) => `${d} ${d === 1 ? 'day' : 'days'} ${better ? 'less' : 'more'} travel a month`,
  },
  {
    key: 'hoursPerWeek', section: 'lifestyle',
    getValue: r => r.lifestyle.hoursPerWeek, higherIsBetter: false,
    normalize: normalizeHours,
    unitSentence: (d, better) => `${d} ${better ? 'fewer' : 'more'} hours a week`,
  },
  {
    key: 'commuteMinutes', section: 'lifestyle',
    getValue: r => r.lifestyle.commuteMinutes, higherIsBetter: false,
    normalize: normalizeCommute,
    unitSentence: (d, better) => `a ${d} min ${better ? 'shorter' : 'longer'} commute`,
  },
  {
    key: 'vacationDays', section: 'lifestyle',
    getValue: r => r.lifestyle.vacationDays, higherIsBetter: true,
    normalize: normalizeVacation,
    unitSentence: (d, better) => `${d} ${better ? 'more' : 'fewer'} vacation days`,
  },
]

const RATING_FIELDS: RatingField[] = [
  { key: 'titleTrajectory', section: 'career', label: 'title trajectory', getValue: r => r.career.titleTrajectory },
  { key: 'scopeSize', section: 'career', label: 'scope & scale', getValue: r => r.career.scopeSize },
  { key: 'skillDevelopment', section: 'career', label: 'skill development', getValue: r => r.career.skillDevelopment },
  { key: 'companyPrestige', section: 'career', label: 'company prestige', getValue: r => r.career.companyPrestige },
  { key: 'networkValue', section: 'career', label: 'network value', getValue: r => r.career.networkValue },
  { key: 'exitOptionality', section: 'career', label: 'exit optionality', getValue: r => r.career.exitOptionality },
  { key: 'flexibilityScore', section: 'lifestyle', label: 'schedule flexibility', getValue: r => r.lifestyle.flexibilityScore },
  { key: 'managerQuality', section: 'lifestyle', label: 'manager quality', getValue: r => r.lifestyle.managerQuality },
  { key: 'teamCulture', section: 'lifestyle', label: 'team culture', getValue: r => r.lifestyle.teamCulture },
  { key: 'companyHealth', section: 'risk', label: 'company stability', getValue: r => r.risk.companyHealth },
  { key: 'industryTrajectory', section: 'risk', label: 'industry trajectory', getValue: r => r.risk.industryTrajectory },
  { key: 'roleStability', section: 'risk', label: 'role stability', getValue: r => r.risk.roleStability },
  { key: 'compCeiling', section: 'risk', label: 'comp growth ceiling', getValue: r => r.risk.compCeiling },
  { key: 'cultureFitRisk', section: 'risk', label: 'culture fit', getValue: r => r.risk.cultureFitRisk },
  { key: 'excitement', section: 'personal', label: 'personal excitement', getValue: r => r.personal.excitement },
]

export function buildNarrative(
  target: Role,
  current: Role,
  weights: UserPreferences['weights'],
): { gains: NarrativeItem[]; concerns: NarrativeItem[] } {
  const items: NarrativeItem[] = []

  for (const f of UNIT_FIELDS) {
    const t = f.getValue(target)
    const c = f.getValue(current)
    if (t === c) continue
    const better = f.higherIsBetter ? t > c : t < c
    const absDelta = Math.round(Math.abs(t - c) * 10) / 10
    const normDelta = f.normalize(t) - f.normalize(c)
    const weight = weights[f.section] / 100
    items.push({
      key: f.key,
      sentence: f.unitSentence(absDelta, better),
      weightedImpact: Math.abs(normDelta) * weight,
      isGain: better,
    })
  }

  for (const f of RATING_FIELDS) {
    const t = f.getValue(target)
    const c = f.getValue(current)
    if (t === c) continue
    const better = t > c
    const weight = weights[f.section] / 100
    const capLabel = f.label.charAt(0).toUpperCase() + f.label.slice(1)
    items.push({
      key: f.key,
      sentence: `${capLabel} rated ${better ? 'higher' : 'lower'} (${t}/10 vs. ${c}/10)`,
      weightedImpact: Math.abs(t - c) * weight,
      isGain: better,
    })
  }

  const gains = items.filter(i => i.isGain).sort((a, b) => b.weightedImpact - a.weightedImpact)
  const concerns = items.filter(i => !i.isGain).sort((a, b) => b.weightedImpact - a.weightedImpact)

  return { gains, concerns }
}

/** The headline dollar sentence — "Acme pays $41,000 more a year than Globex." */
export function buildHeadline(target: Role, current: Role): { sentence: string; delta: number } {
  const targetOTE = calcRealOTE(target)
  const currentOTE = calcRealOTE(current)
  const delta = targetOTE - currentOTE

  if (Math.abs(delta) < 500) {
    return { sentence: `${target.basics.company} pays about the same as ${current.basics.company}.`, delta }
  }

  const verb = delta > 0 ? 'more' : 'less'
  return {
    sentence: `${target.basics.company} pays ${formatCurrency(Math.abs(delta))} a year ${verb} than ${current.basics.company}.`,
    delta,
  }
}
