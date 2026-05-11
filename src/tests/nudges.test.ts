import { describe, it, expect } from 'vitest'
import {
  checkHaloEffect,
  checkCompTunnelVision,
  checkIgnoredLowConfidence,
  checkSymmetryFlag,
} from '../lib/nudges'
import type { Role, UserPreferences } from '../lib/types'

function makeRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'test',
    isCurrent: false,
    mode: 'exploration',
    status: 'evaluating',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    basics: { company: 'Target Co', title: 'AE', companySize: 'unknown', location: 'Remote', workMode: 'remote' },
    comp: { base: 100_000, variableTarget: 50_000, realisticAttainment: 1.0, commissionStructure: 'linear' },
    career: { titleTrajectory: 5, scopeSize: 5, skillDevelopment: 5, companyPrestige: 5, networkValue: 5, exitOptionality: 5 },
    lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 5, hoursPerWeek: 45, commuteMinutes: 0, vacationDays: 15, managerQuality: 5, teamCulture: 5 },
    risk: { companyHealth: 5, industryTrajectory: 5, roleStability: 5, compCeiling: 5, cultureFitRisk: 5 },
    personal: { excitement: 5 },
    confidence: { comp: 'medium', career: 'medium', lifestyle: 'medium', risk: 'medium' },
    ...overrides,
  }
}

const DEFAULT_WEIGHTS: UserPreferences['weights'] = { comp: 30, career: 25, lifestyle: 20, risk: 15, personal: 10 }

describe('checkHaloEffect', () => {
  it('fires when all numeric scores are 9 or 10', () => {
    const role = makeRole({
      career: { titleTrajectory: 9, scopeSize: 10, skillDevelopment: 9, companyPrestige: 10, networkValue: 9, exitOptionality: 10 },
      lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 9, hoursPerWeek: 40, commuteMinutes: 0, vacationDays: 20, managerQuality: 10, teamCulture: 9 },
      risk: { companyHealth: 9, industryTrajectory: 10, roleStability: 9, compCeiling: 10, cultureFitRisk: 9 },
      personal: { excitement: 10 },
    })
    expect(checkHaloEffect(role)).not.toBeNull()
  })

  it('does not fire when one score is 7', () => {
    const role = makeRole({
      career: { titleTrajectory: 9, scopeSize: 10, skillDevelopment: 7, companyPrestige: 10, networkValue: 9, exitOptionality: 10 },
      lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 9, hoursPerWeek: 40, commuteMinutes: 0, vacationDays: 20, managerQuality: 10, teamCulture: 9 },
      risk: { companyHealth: 9, industryTrajectory: 10, roleStability: 9, compCeiling: 10, cultureFitRisk: 9 },
      personal: { excitement: 10 },
    })
    expect(checkHaloEffect(role)).toBeNull()
  })
})

describe('checkCompTunnelVision', () => {
  it('fires when target wins on comp, loses 3+ sections, comp weight >50%', () => {
    const current = makeRole({
      basics: { company: 'Current Co', title: 'AE', companySize: 'unknown', location: 'Remote', workMode: 'remote' },
      comp: { base: 80_000, variableTarget: 20_000, realisticAttainment: 1.0, commissionStructure: 'linear' },
      career: { titleTrajectory: 8, scopeSize: 8, skillDevelopment: 8, companyPrestige: 8, networkValue: 8, exitOptionality: 8 },
      lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 8, hoursPerWeek: 40, commuteMinutes: 0, vacationDays: 20, managerQuality: 8, teamCulture: 8 },
      risk: { companyHealth: 8, industryTrajectory: 8, roleStability: 8, compCeiling: 8, cultureFitRisk: 8 },
      personal: { excitement: 8 },
    })
    const target = makeRole({
      comp: { base: 200_000, variableTarget: 0, realisticAttainment: 1.0, commissionStructure: 'linear' },
      career: { titleTrajectory: 3, scopeSize: 3, skillDevelopment: 3, companyPrestige: 3, networkValue: 3, exitOptionality: 3 },
      lifestyle: { travelDaysPerMonth: 10, flexibilityScore: 3, hoursPerWeek: 60, commuteMinutes: 60, vacationDays: 10, managerQuality: 3, teamCulture: 3 },
      risk: { companyHealth: 3, industryTrajectory: 3, roleStability: 3, compCeiling: 3, cultureFitRisk: 3 },
      personal: { excitement: 4 },
    })
    const nudge = checkCompTunnelVision(target, current, { ...DEFAULT_WEIGHTS, comp: 60, career: 10, lifestyle: 10, risk: 10, personal: 10 })
    expect(nudge).not.toBeNull()
    expect(nudge?.type).toBe('comp-tunnel-vision')
  })

  it('does not fire when comp weight is 40%', () => {
    const current = makeRole()
    const target = makeRole({ comp: { base: 200_000, variableTarget: 0, realisticAttainment: 1.0, commissionStructure: 'linear' } })
    const nudge = checkCompTunnelVision(target, current, DEFAULT_WEIGHTS)
    expect(nudge).toBeNull()
  })
})

describe('checkIgnoredLowConfidence', () => {
  it('fires when low confidence + extreme high score', () => {
    const role = makeRole({
      career: { titleTrajectory: 10, scopeSize: 10, skillDevelopment: 10, companyPrestige: 10, networkValue: 10, exitOptionality: 10 },
      confidence: { comp: 'medium', career: 'low', lifestyle: 'medium', risk: 'medium' },
    })
    const nudges = checkIgnoredLowConfidence(role)
    expect(nudges.length).toBeGreaterThan(0)
    expect(nudges[0]?.type).toBe('ignored-low-confidence')
  })

  it('fires when low confidence + extreme low score', () => {
    const role = makeRole({
      career: { titleTrajectory: 1, scopeSize: 1, skillDevelopment: 1, companyPrestige: 1, networkValue: 1, exitOptionality: 1 },
      confidence: { comp: 'medium', career: 'low', lifestyle: 'medium', risk: 'medium' },
    })
    const nudges = checkIgnoredLowConfidence(role)
    expect(nudges.length).toBeGreaterThan(0)
  })

  it('does not fire when confidence is medium and score is extreme', () => {
    const role = makeRole({
      career: { titleTrajectory: 10, scopeSize: 10, skillDevelopment: 10, companyPrestige: 10, networkValue: 10, exitOptionality: 10 },
      confidence: { comp: 'medium', career: 'medium', lifestyle: 'medium', risk: 'medium' },
    })
    const nudges = checkIgnoredLowConfidence(role)
    expect(nudges.length).toBe(0)
  })
})

describe('checkSymmetryFlag', () => {
  it('fires when target manager quality is 3+ higher with no signal', () => {
    const current = makeRole({ lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 5, hoursPerWeek: 40, commuteMinutes: 0, vacationDays: 15, managerQuality: 4, teamCulture: 5 } })
    const target = makeRole({ lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 5, hoursPerWeek: 40, commuteMinutes: 0, vacationDays: 15, managerQuality: 9, teamCulture: 5 }, personal: { excitement: 5 } })
    const nudges = checkSymmetryFlag(target, current)
    expect(nudges.length).toBeGreaterThan(0)
    expect(nudges[0]?.type).toBe('symmetry-flag')
  })

  it('does not fire when signal text is present', () => {
    const current = makeRole()
    const target = makeRole({
      lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 5, hoursPerWeek: 40, commuteMinutes: 0, vacationDays: 15, managerQuality: 9, teamCulture: 5 },
      personal: { excitement: 5, whatExcitesYou: 'Met the manager — she was incredible' },
    })
    const nudges = checkSymmetryFlag(target, current)
    expect(nudges.length).toBe(0)
  })

  it('does not fire when delta is under threshold', () => {
    const current = makeRole({ lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 5, hoursPerWeek: 40, commuteMinutes: 0, vacationDays: 15, managerQuality: 6, teamCulture: 5 } })
    const target = makeRole({ lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 5, hoursPerWeek: 40, commuteMinutes: 0, vacationDays: 15, managerQuality: 8, teamCulture: 5 } })
    const nudges = checkSymmetryFlag(target, current)
    expect(nudges.length).toBe(0)
  })
})
