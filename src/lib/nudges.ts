import type { Role, UserPreferences, Nudge } from './types'

export function checkHaloEffect(target: Role): Nudge | null {
  const scores = [
    ...Object.values(target.career),
    target.lifestyle.flexibilityScore,
    target.lifestyle.managerQuality,
    target.lifestyle.teamCulture,
    ...Object.values(target.risk),
    target.personal.excitement,
  ].filter(v => typeof v === 'number') as number[]

  const allHigh = scores.every(s => s >= 9)
  if (!allHigh) return null

  return {
    type: 'halo-effect',
    message: `Every section of ${target.basics.company} scored 9 or 10. Few real roles are that good across the board. Worth revisiting one section critically?`,
  }
}

export function checkCompTunnelVision(
  target: Role,
  current: Role,
  weights: UserPreferences['weights'],
): Nudge | null {
  if (weights.comp <= 50) return null

  // Check if target wins on comp (higher excitement for comp)
  const targetRealOTE =
    target.comp.base +
    target.comp.variableTarget * target.comp.realisticAttainment +
    (target.comp.equityValue ?? 0)

  const currentRealOTE =
    current.comp.base +
    current.comp.variableTarget * current.comp.realisticAttainment +
    (current.comp.equityValue ?? 0)

  if (targetRealOTE <= currentRealOTE) return null

  // Count sections where target loses
  let losses = 0
  const lostSections: string[] = []

  const targetCareer = avg(Object.values(target.career) as number[])
  const currentCareer = avg(Object.values(current.career) as number[])
  if (targetCareer < currentCareer - 0.5) { losses++; lostSections.push('career growth') }

  const targetLifestyle = avg([
    target.lifestyle.flexibilityScore,
    target.lifestyle.managerQuality,
    target.lifestyle.teamCulture,
  ])
  const currentLifestyle = avg([
    current.lifestyle.flexibilityScore,
    current.lifestyle.managerQuality,
    current.lifestyle.teamCulture,
  ])
  if (targetLifestyle < currentLifestyle - 0.5) { losses++; lostSections.push('lifestyle') }

  const targetRisk = avg(Object.values(target.risk) as number[])
  const currentRisk = avg(Object.values(current.risk) as number[])
  if (targetRisk < currentRisk - 0.5) { losses++; lostSections.push('risk') }

  if (target.personal.excitement < current.personal.excitement - 1) { losses++; lostSections.push('personal fit') }

  if (losses < 3) return null

  return {
    type: 'comp-tunnel-vision',
    section: 'comp',
    message: `Comp is winning this comparison, but ${target.basics.company} loses on ${lostSections.slice(0, 3).join(', ')}. Is the comp delta really worth those tradeoffs?`,
  }
}

export function checkIgnoredLowConfidence(role: Role): Nudge[] {
  const nudges: Nudge[] = []

  const sectionMap: Array<{ section: keyof typeof role.confidence; scores: number[]; label: string }> = [
    {
      section: 'career',
      scores: Object.values(role.career) as number[],
      label: 'career growth',
    },
    {
      section: 'lifestyle',
      scores: [role.lifestyle.flexibilityScore, role.lifestyle.managerQuality, role.lifestyle.teamCulture],
      label: 'lifestyle',
    },
    {
      section: 'risk',
      scores: Object.values(role.risk) as number[],
      label: 'risk',
    },
  ]

  for (const { section, scores, label } of sectionMap) {
    if (role.confidence[section] !== 'low') continue
    const sectionAvg = avg(scores)
    if (sectionAvg <= 2 || sectionAvg >= 9) {
      nudges.push({
        type: 'ignored-low-confidence',
        section,
        message: `You marked ${label} confidence as low but scored it ${sectionAvg.toFixed(1)}/10. Strong scores on weak data drive bad decisions.`,
      })
    }
  }

  return nudges
}

export function checkSymmetryFlag(target: Role, current: Role): Nudge[] {
  const nudges: Nudge[] = []
  const threshold = 3

  const pairs: Array<{ label: string; t: number; c: number; hasSignal: boolean }> = [
    {
      label: 'manager quality',
      t: target.lifestyle.managerQuality,
      c: current.lifestyle.managerQuality,
      hasSignal: !!target.personal.whatExcitesYou || !!target.personal.openQuestions,
    },
    {
      label: 'team culture',
      t: target.lifestyle.teamCulture,
      c: current.lifestyle.teamCulture,
      hasSignal: !!target.personal.whatExcitesYou,
    },
    {
      label: 'company stability',
      t: target.risk.companyHealth,
      c: current.risk.companyHealth,
      hasSignal: !!target.personal.openQuestions,
    },
  ]

  for (const { label, t, c, hasSignal } of pairs) {
    if (t - c >= threshold && !hasSignal) {
      nudges.push({
        type: 'symmetry-flag',
        message: `You scored ${target.basics.company}'s ${label} as ${t} vs. ${current.basics.company}'s ${c}. What's the source of that signal?`,
      })
    }
  }

  return nudges
}

export function computeAllNudges(
  target: Role,
  current: Role,
  prefs: UserPreferences,
): Nudge[] {
  if (!prefs.honestyNudgesEnabled) return []

  const nudges: Nudge[] = []

  const halo = checkHaloEffect(target)
  if (halo) nudges.push(halo)

  const tunnelVision = checkCompTunnelVision(target, current, prefs.weights)
  if (tunnelVision) nudges.push(tunnelVision)

  nudges.push(...checkIgnoredLowConfidence(target))
  nudges.push(...checkSymmetryFlag(target, current))

  return nudges
}

function avg(values: number[]): number {
  if (values.length === 0) return 5
  return values.reduce((a, b) => a + b, 0) / values.length
}
