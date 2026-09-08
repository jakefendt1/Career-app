import type { Role } from './types'

// Every role field defaults to 5 (RolesList.createBlankRole) — a role nobody
// has touched scores exactly like a genuinely middling one. This counts how
// many of the 15 subjective 1-10 sliders have actually been moved off that
// default, so the UI can say "7 of 15 rated" instead of implying precision
// that isn't there.

const OPINION_FIELDS: Array<(r: Role) => number> = [
  r => r.career.titleTrajectory,
  r => r.career.scopeSize,
  r => r.career.skillDevelopment,
  r => r.career.companyPrestige,
  r => r.career.networkValue,
  r => r.career.exitOptionality,
  r => r.lifestyle.flexibilityScore,
  r => r.lifestyle.managerQuality,
  r => r.lifestyle.teamCulture,
  r => r.risk.companyHealth,
  r => r.risk.industryTrajectory,
  r => r.risk.roleStability,
  r => r.risk.compCeiling,
  r => r.risk.cultureFitRisk,
  r => r.personal.excitement,
]

export const TOTAL_OPINION_FIELDS = OPINION_FIELDS.length

export function ratedFieldCount(role: Role): number {
  return OPINION_FIELDS.filter(get => get(role) !== 5).length
}

export function completenessRatio(role: Role): number {
  return ratedFieldCount(role) / TOTAL_OPINION_FIELDS
}
