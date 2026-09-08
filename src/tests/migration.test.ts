import { describe, it, expect } from 'vitest'
import { migrateRole } from '../lib/types'
import type { Role } from '../lib/types'

function makeRole(comp: Partial<Role['comp']> & Record<string, unknown> = {}): Role {
  return {
    id: 'test',
    isCurrent: false,
    mode: 'exploration',
    status: 'evaluating',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    basics: { company: 'Test Co', title: 'AE', companySize: 'unknown', location: 'Remote', workMode: 'remote' },
    comp: { base: 100_000, variableTarget: 50_000, realisticAttainment: 1.0, commissionStructure: 'linear', ...comp },
    career: { titleTrajectory: 5, scopeSize: 5, skillDevelopment: 5, companyPrestige: 5, networkValue: 5, exitOptionality: 5 },
    lifestyle: { travelDaysPerMonth: 0, flexibilityScore: 5, hoursPerWeek: 45, commuteMinutes: 0, vacationDays: 15, managerQuality: 5, teamCulture: 5 },
    risk: { companyHealth: 5, industryTrajectory: 5, roleStability: 5, compCeiling: 5, cultureFitRisk: 5 },
    personal: { excitement: 5 },
    confidence: { comp: 'medium', career: 'medium', lifestyle: 'medium', risk: 'medium' },
  } as Role
}

describe('migrateRole', () => {
  it('leaves a role with no commission data untouched', () => {
    const role = makeRole()
    const migrated = migrateRole(role)
    expect(migrated).toEqual(role)
  })

  it('leaves an already-migrated role (commissionPlan present) untouched', () => {
    const role = makeRole({ commissionPlan: { type: 'revenue', period: 'annual', revenueQuota: 1_000_000, revenueRate: 5 } })
    const migrated = migrateRole(role)
    expect(migrated.comp.commissionPlan).toEqual(role.comp.commissionPlan)
  })

  it('converts legacy margin commissionParams into commissionPlan', () => {
    const role = makeRole({
      commissionParams: { type: 'margin', avgDealSize: 1_000_000, avgGrossMarginPct: 25, marginRate: 3, expectedDealsPerYear: 12 },
    } as Partial<Role['comp']>)

    const migrated = migrateRole(role)

    expect(migrated.comp.commissionPlan).toEqual({
      type: 'margin',
      period: 'annual',
      avgDealSize: 1_000_000,
      avgGrossMarginPct: 25,
      marginRate: 3,
      expectedDealsPerYear: 12,
      revenueQuota: undefined,
      revenueRate: undefined,
      tierMode: 'marginal',
      tiers: undefined,
    })
    expect((migrated.comp as Record<string, unknown>).commissionParams).toBeUndefined()
  })

  it('converts legacy tiered commissionParams, assigning ids to tiers', () => {
    const role = makeRole({
      commissionParams: {
        type: 'tiered',
        revenueQuota: 1_000_000,
        tiers: [{ thresholdPct: 0, rate: 2 }, { thresholdPct: 100, rate: 5 }],
      },
    } as Partial<Role['comp']>)

    const migrated = migrateRole(role)

    expect(migrated.comp.commissionPlan?.tierMode).toBe('marginal')
    expect(migrated.comp.commissionPlan?.tiers).toEqual([
      { id: '1', thresholdPct: 0, rate: 2 },
      { id: '2', thresholdPct: 100, rate: 5 },
    ])
  })

  it('is idempotent — migrating twice gives the same result', () => {
    const role = makeRole({
      commissionParams: { type: 'revenue', revenueQuota: 500_000, revenueRate: 4 },
    } as Partial<Role['comp']>)

    const once = migrateRole(role)
    const twice = migrateRole(once)
    expect(twice).toEqual(once)
  })
})
