import { describe, it, expect } from 'vitest'
import { calcRealOTE, calcRiskAdjustedOTE, compareRoles } from '../lib/scoring'
import type { Role, UserPreferences } from '../lib/types'

const DEFAULT_PREFS: UserPreferences = {
  weights: { comp: 30, career: 25, lifestyle: 20, risk: 15, personal: 10 },
  currency: 'USD',
  honestyNudgesEnabled: true,
  verdictThresholds: { strongMove: 15, softMove: 5, softStay: -5, strongStay: -15 },
}

function makeRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'test',
    isCurrent: false,
    mode: 'exploration',
    status: 'evaluating',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    basics: { company: 'Test Co', title: 'AE', companySize: 'unknown', location: 'Remote', workMode: 'remote' },
    comp: { base: 100_000, variableTarget: 50_000, realisticAttainment: 1.0, commissionStructure: 'linear' },
    career: { titleTrajectory: 5, scopeSize: 5, skillDevelopment: 5, companyPrestige: 5, networkValue: 5, exitOptionality: 5 },
    lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 5, hoursPerWeek: 45, commuteMinutes: 0, vacationDays: 15, managerQuality: 5, teamCulture: 5 },
    risk: { companyHealth: 5, industryTrajectory: 5, roleStability: 5, compCeiling: 5, cultureFitRisk: 5 },
    personal: { excitement: 5 },
    confidence: { comp: 'medium', career: 'medium', lifestyle: 'medium', risk: 'medium' },
    ...overrides,
  }
}

describe('calcRealOTE', () => {
  it('base only (zero variable)', () => {
    const role = makeRole({ comp: { base: 80_000, variableTarget: 0, realisticAttainment: 1.0, commissionStructure: 'linear' } })
    expect(calcRealOTE(role)).toBe(80_000)
  })

  it('base + variable at 100% attainment', () => {
    const role = makeRole()
    expect(calcRealOTE(role)).toBe(150_000)
  })

  it('variable at 80% attainment', () => {
    const role = makeRole({ comp: { base: 100_000, variableTarget: 50_000, realisticAttainment: 0.8, commissionStructure: 'linear' } })
    expect(calcRealOTE(role)).toBe(140_000)
  })

  it('includes equity and car allowance', () => {
    const role = makeRole({ comp: { base: 100_000, variableTarget: 0, realisticAttainment: 1.0, commissionStructure: 'linear', equityValue: 20_000, carAllowance: 6_000 } })
    expect(calcRealOTE(role)).toBe(126_000)
  })

  it('includes retirement match', () => {
    const role = makeRole({ comp: { base: 100_000, variableTarget: 0, realisticAttainment: 1.0, commissionStructure: 'linear', retirementMatchPct: 4 } })
    expect(calcRealOTE(role)).toBe(104_000)
  })

  it('sign-on bonus excluded from OTE', () => {
    const role = makeRole({ comp: { base: 100_000, variableTarget: 0, realisticAttainment: 1.0, commissionStructure: 'linear', signOnBonus: 10_000 } })
    expect(calcRealOTE(role)).toBe(100_000)
  })
})

describe('calcRiskAdjustedOTE', () => {
  it('perfect health and stability = same as realOTE', () => {
    const role = makeRole({ risk: { companyHealth: 10, industryTrajectory: 5, roleStability: 10, compCeiling: 5, cultureFitRisk: 5 } })
    expect(calcRiskAdjustedOTE(role)).toBeCloseTo(calcRealOTE(role))
  })

  it('half health and stability = 50% of realOTE', () => {
    const role = makeRole({ risk: { companyHealth: 5, industryTrajectory: 5, roleStability: 5, compCeiling: 5, cultureFitRisk: 5 } })
    expect(calcRiskAdjustedOTE(role)).toBeCloseTo(calcRealOTE(role) * 0.5)
  })

  it('zero health with average stability = 25% of realOTE', () => {
    const role = makeRole({ risk: { companyHealth: 0, industryTrajectory: 5, roleStability: 5, compCeiling: 5, cultureFitRisk: 5 } })
    expect(calcRiskAdjustedOTE(role)).toBeCloseTo(calcRealOTE(role) * 0.25)
  })
})

describe('compareRoles', () => {
  it('identical roles produce lateral verdict', () => {
    const role = makeRole()
    const result = compareRoles(role, role, DEFAULT_PREFS)
    expect(result.verdict).toBe('lateral')
    expect(result.scoreDelta).toBeCloseTo(0)
  })

  it('target with much higher comp produces strong-move', () => {
    const current = makeRole({ comp: { base: 80_000, variableTarget: 20_000, realisticAttainment: 1.0, commissionStructure: 'linear' } })
    const target = makeRole({ comp: { base: 150_000, variableTarget: 50_000, realisticAttainment: 1.0, commissionStructure: 'linear' } })
    const result = compareRoles(target, current, { ...DEFAULT_PREFS, weights: { comp: 80, career: 5, lifestyle: 5, risk: 5, personal: 5 } })
    expect(result.verdict).toBe('strong-move')
    expect(result.scoreDelta).toBeGreaterThan(15)
  })

  it('target with much lower comp produces strong-stay', () => {
    const current = makeRole({ comp: { base: 150_000, variableTarget: 50_000, realisticAttainment: 1.0, commissionStructure: 'linear' } })
    const target = makeRole({ comp: { base: 80_000, variableTarget: 20_000, realisticAttainment: 1.0, commissionStructure: 'linear' } })
    const result = compareRoles(target, current, { ...DEFAULT_PREFS, weights: { comp: 80, career: 5, lifestyle: 5, risk: 5, personal: 5 } })
    expect(result.verdict).toBe('strong-stay')
  })

  it('top gains and concerns are non-empty when roles differ', () => {
    const current = makeRole()
    const target = makeRole({ career: { titleTrajectory: 9, scopeSize: 9, skillDevelopment: 9, companyPrestige: 9, networkValue: 9, exitOptionality: 9 } })
    const result = compareRoles(target, current, DEFAULT_PREFS)
    expect(result.topGains.length).toBeGreaterThan(0)
  })

  it('score delta matches totalScore difference', () => {
    const current = makeRole()
    const target = makeRole({ personal: { excitement: 9 } })
    const result = compareRoles(target, current, DEFAULT_PREFS)
    expect(result.scoreDelta).toBeCloseTo(result.target.totalScore - result.current.totalScore, 5)
  })

  it('handles attainment of 1.5 cleanly', () => {
    const current = makeRole()
    const target = makeRole({ comp: { base: 100_000, variableTarget: 50_000, realisticAttainment: 1.5, commissionStructure: 'linear' } })
    const result = compareRoles(target, current, DEFAULT_PREFS)
    expect(result.target.realOTE).toBe(175_000)
    expect(result).toBeDefined()
  })
})
