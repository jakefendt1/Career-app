import type { Role, UserPreferences, RoleScore, ComparisonResult, VerdictLabel, FieldDelta } from './types'

export function calcRealOTE(role: Role): number {
  const { base, variableTarget, realisticAttainment, equityValue, carAllowance, retirementMatchPct } = role.comp
  return (
    base +
    variableTarget * realisticAttainment +
    (equityValue ?? 0) +
    (carAllowance ?? 0) +
    ((retirementMatchPct ?? 0) / 100) * base
  )
}

export function calcRiskAdjustedOTE(role: Role): number {
  const realOTE = calcRealOTE(role)
  const riskFactor = (role.risk.companyHealth + role.risk.roleStability) / 20
  return realOTE * riskFactor
}

function avg(...values: number[]): number {
  if (values.length === 0) return 5
  return values.reduce((a, b) => a + b, 0) / values.length
}

function scale1to10to100(avg10: number): number {
  return ((avg10 - 1) / 9) * 100
}

function careerScore(role: Role): number {
  const { titleTrajectory, scopeSize, skillDevelopment, companyPrestige, networkValue, exitOptionality } = role.career
  return scale1to10to100(avg(titleTrajectory, scopeSize, skillDevelopment, companyPrestige, networkValue, exitOptionality))
}

function lifestyleScore(role: Role): number {
  const { flexibilityScore, managerQuality, teamCulture } = role.lifestyle
  // Travel (inverted — less travel = better lifestyle), hours (inverted), commute (inverted)
  const travelNorm = Math.max(0, Math.min(10, 10 - role.lifestyle.travelDaysPerMonth / 3))
  const hoursNorm = Math.max(0, Math.min(10, 10 - (role.lifestyle.hoursPerWeek - 40) / 4))
  const commuteNorm = Math.max(0, Math.min(10, 10 - role.lifestyle.commuteMinutes / 12))
  const vacNorm = Math.min(10, role.lifestyle.vacationDays / 3)
  return scale1to10to100(avg(travelNorm, flexibilityScore, hoursNorm, commuteNorm, vacNorm, managerQuality, teamCulture))
}

function riskScore(role: Role): number {
  const { companyHealth, industryTrajectory, roleStability, compCeiling, cultureFitRisk } = role.risk
  return scale1to10to100(avg(companyHealth, industryTrajectory, roleStability, compCeiling, cultureFitRisk))
}

function personalScore(role: Role): number {
  return scale1to10to100(role.personal.excitement)
}

function compScoreFromDelta(targetRiskOTE: number, currentRiskOTE: number): number {
  if (currentRiskOTE === 0) return 50
  const delta = (targetRiskOTE - currentRiskOTE) / currentRiskOTE
  // parity = 50, +30% = 90, -30% = 10
  // linear mapping: score = 50 + delta * (40 / 0.30)
  const score = 50 + delta * (40 / 0.30)
  return Math.max(0, Math.min(100, score))
}

type BaseRoleScore = Omit<RoleScore, 'compScore' | 'totalScore'> & { riskAdjustedOTE: number }

export function scoreRole(role: Role): BaseRoleScore {
  return {
    realOTE: calcRealOTE(role),
    riskAdjustedOTE: calcRiskAdjustedOTE(role),
    careerScore: careerScore(role),
    lifestyleScore: lifestyleScore(role),
    riskScore: riskScore(role),
    personalScore: personalScore(role),
  }
}

export function compareRoles(
  target: Role,
  current: Role,
  prefs: UserPreferences,
): ComparisonResult {
  const { weights } = prefs

  const targetBase = scoreRole(target)
  const currentBase = scoreRole(current)

  const targetCompScore = compScoreFromDelta(targetBase.riskAdjustedOTE, currentBase.riskAdjustedOTE)
  const currentCompScore = 50 // current role anchors at parity

  function weightedTotal(comp: number, career: number, lifestyle: number, risk: number, personal: number): number {
    return (
      comp * weights.comp / 100 +
      career * weights.career / 100 +
      lifestyle * weights.lifestyle / 100 +
      risk * weights.risk / 100 +
      personal * weights.personal / 100
    )
  }

  const targetScore: RoleScore = {
    ...targetBase,
    compScore: targetCompScore,
    totalScore: weightedTotal(targetCompScore, targetBase.careerScore, targetBase.lifestyleScore, targetBase.riskScore, targetBase.personalScore),
  }

  const currentScore: RoleScore = {
    ...currentBase,
    compScore: currentCompScore,
    totalScore: weightedTotal(currentCompScore, currentBase.careerScore, currentBase.lifestyleScore, currentBase.riskScore, currentBase.personalScore),
  }

  const scoreDelta = targetScore.totalScore - currentScore.totalScore
  const verdict = computeVerdict(scoreDelta, prefs.verdictThresholds)

  const fieldDeltas = computeFieldDeltas(target, current, targetBase.riskAdjustedOTE, currentBase.riskAdjustedOTE)
  const topGains = fieldDeltas.filter(d => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3)
  const topConcerns = fieldDeltas.filter(d => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3)

  return { target: targetScore, current: currentScore, scoreDelta, verdict, topGains, topConcerns }
}

function computeVerdict(
  delta: number,
  thresholds: UserPreferences['verdictThresholds'],
): VerdictLabel {
  if (delta >= thresholds.strongMove) return 'strong-move'
  if (delta >= thresholds.softMove) return 'soft-move'
  if (delta > thresholds.softStay) return 'lateral'
  if (delta > thresholds.strongStay) return 'soft-stay'
  return 'strong-stay'
}

const FIELD_LABELS: Record<string, string> = {
  titleTrajectory: 'title trajectory',
  scopeSize: 'scope & scale',
  skillDevelopment: 'skill development',
  companyPrestige: 'company prestige',
  networkValue: 'network value',
  exitOptionality: 'exit optionality',
  flexibilityScore: 'schedule flexibility',
  managerQuality: 'manager quality',
  teamCulture: 'team culture',
  companyHealth: 'company stability',
  industryTrajectory: 'industry trajectory',
  roleStability: 'role stability',
  compCeiling: 'comp growth ceiling',
  cultureFitRisk: 'culture fit',
  excitement: 'personal excitement',
  riskAdjustedOTE: 'risk-adjusted comp',
}

function computeFieldDeltas(
  target: Role,
  current: Role,
  targetRiskOTE: number,
  currentRiskOTE: number,
): FieldDelta[] {
  const deltas: FieldDelta[] = []

  function add(label: string, section: string, t: number, c: number) {
    deltas.push({ label, section, targetValue: t, currentValue: c, delta: t - c })
  }

  // Comp: OTE delta
  add(FIELD_LABELS['riskAdjustedOTE']!, 'comp', targetRiskOTE, currentRiskOTE)

  // Career
  for (const k of ['titleTrajectory', 'scopeSize', 'skillDevelopment', 'companyPrestige', 'networkValue', 'exitOptionality'] as const) {
    add(FIELD_LABELS[k]!, 'career', target.career[k], current.career[k])
  }

  // Lifestyle (normalized fields)
  add(FIELD_LABELS['flexibilityScore']!, 'lifestyle', target.lifestyle.flexibilityScore, current.lifestyle.flexibilityScore)
  add(FIELD_LABELS['managerQuality']!, 'lifestyle', target.lifestyle.managerQuality, current.lifestyle.managerQuality)
  add(FIELD_LABELS['teamCulture']!, 'lifestyle', target.lifestyle.teamCulture, current.lifestyle.teamCulture)

  // Risk
  for (const k of ['companyHealth', 'industryTrajectory', 'roleStability', 'compCeiling', 'cultureFitRisk'] as const) {
    add(FIELD_LABELS[k]!, 'risk', target.risk[k], current.risk[k])
  }

  // Personal
  add(FIELD_LABELS['excitement']!, 'personal', target.personal.excitement, current.personal.excitement)

  return deltas
}

export function computeCompScoreForSensitivity(
  targetOTE: number,
  currentOTE: number,
  targetRisk: { companyHealth: number; roleStability: number },
  currentRisk: { companyHealth: number; roleStability: number },
  attainmentMultiplier: number,
): number {
  const adjustedTargetOTE = targetOTE * attainmentMultiplier * (targetRisk.companyHealth + targetRisk.roleStability) / 20
  const adjustedCurrentOTE = currentOTE * (currentRisk.companyHealth + currentRisk.roleStability) / 20
  return compScoreFromDelta(adjustedTargetOTE, adjustedCurrentOTE)
}
