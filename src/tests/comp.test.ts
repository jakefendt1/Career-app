import { describe, it, expect } from 'vitest'
import {
  calcMarginCommission,
  calcRevenueCommission,
  calcTieredCommission,
  calcFlatCommission,
  buildRampedMonthlySchedule,
  applyDraw,
  yearOneVsSteadyState,
  periodizeAmount,
  estimateFederalTax,
  estimateAnnualCommission,
} from '../lib/comp'
import type { CommissionPlan } from '../lib/types'

describe('calcMarginCommission', () => {
  it('multiplies deal size by GM% and rate', () => {
    // $1,000,000 deal * 25% GM * 3% rate = $7,500
    expect(calcMarginCommission(1_000_000, 25, 3)).toBeCloseTo(7_500)
  })
})

describe('calcRevenueCommission', () => {
  it('pays quota * attainment * rate with no accelerator', () => {
    expect(calcRevenueCommission(1_000_000, 100, 5)).toBeCloseTo(50_000)
  })

  it('applies an accelerator only above the threshold', () => {
    // 100k quota, 5% rate, 2x accelerator above 100%, at 120% attainment:
    // normal: 100k * 5% = 5,000; excess: 20k * 5% * 2 = 2,000 → 7,000
    const accel = { enabled: true, thresholdPct: 100, rate: 2 }
    const result = calcRevenueCommission(100_000, 120, 5, accel)
    expect(result).toBeCloseTo(7_000)
  })

  it('does not apply the accelerator below its threshold', () => {
    const accel = { enabled: true, thresholdPct: 100, rate: 2 }
    const result = calcRevenueCommission(100_000, 80, 5, accel)
    expect(result).toBeCloseTo(4_000) // 80k * 5%, no accelerator
  })

  it('caps commission at the configured amount', () => {
    const cap = { enabled: true, amount: 40_000 }
    const result = calcRevenueCommission(1_000_000, 100, 5, undefined, cap)
    expect(result).toBe(40_000)
  })
})

describe('calcTieredCommission — marginal vs. retroactive', () => {
  const tiers = [
    { id: '1', thresholdPct: 0, rate: 2 },
    { id: '2', thresholdPct: 80, rate: 3 },
    { id: '3', thresholdPct: 100, rate: 5 },
  ]

  it('marginal mode only rates revenue within each band', () => {
    // At 110%: 0-80% @ 2% (800k*2%=16k) + 80-100% @ 3% (200k*3%=6k) + 100-110% @ 5% (100k*5%=5k) = 27k
    const result = calcTieredCommission(1_000_000, 110, tiers, 'marginal')
    expect(result).toBeCloseTo(27_000)
  })

  it('retroactive mode applies the highest tier reached to ALL revenue', () => {
    // At 110%, highest tier reached is the 100% tier (5%) → 1.1M revenue * 5% = 55k
    const result = calcTieredCommission(1_000_000, 110, tiers, 'retroactive')
    expect(result).toBeCloseTo(55_000)
  })

  it('retroactive pays strictly more than marginal once a higher tier is crossed', () => {
    const marginal = calcTieredCommission(1_000_000, 110, tiers, 'marginal')
    const retroactive = calcTieredCommission(1_000_000, 110, tiers, 'retroactive')
    expect(retroactive).toBeGreaterThan(marginal)
  })
})

describe('calcFlatCommission', () => {
  it('multiplies per-deal amount by units and adds SPIFFs', () => {
    const spiffs = [{ id: '1', label: 'Q1 kicker', amount: 1_000 }, { id: '2', label: 'New logo', amount: 500 }]
    expect(calcFlatCommission(500, 100, spiffs)).toBe(500 * 100 + 1_500)
  })

  it('handles zero SPIFFs', () => {
    expect(calcFlatCommission(500, 100)).toBe(50_000)
  })
})

describe('ramp — quota relief for the first N months', () => {
  it('relieves the quota during ramp months, full quota after', () => {
    const annualAtQuota = (q: number) => q * 0.1 // trivial 10% "commission" function
    const schedule = buildRampedMonthlySchedule(annualAtQuota, 120_000, { enabled: true, months: 3, quotaReliefPct: 50 })
    expect(schedule).toHaveLength(12)
    // First 3 months: relieved quota = 60,000 → annual comm on that = 6,000 → /12 = 500
    expect(schedule[0]).toBeCloseTo(500)
    expect(schedule[2]).toBeCloseTo(500)
    // Remaining months: full quota 120,000 → annual comm 12,000 → /12 = 1,000
    expect(schedule[3]).toBeCloseTo(1_000)
    expect(schedule[11]).toBeCloseTo(1_000)
  })

  it('is a no-op when ramp is disabled', () => {
    const annualAtQuota = (q: number) => q * 0.1
    const schedule = buildRampedMonthlySchedule(annualAtQuota, 120_000, { enabled: false, months: 3, quotaReliefPct: 50 })
    expect(schedule.every(m => Math.abs(m - 1_000) < 0.001)).toBe(true)
  })
})

describe('draw — recoverable vs. non-recoverable', () => {
  it('floors monthly pay at the draw amount and tracks a recoverable balance', () => {
    const schedule = [1_000, 2_000, 5_000] // months earning less/more than draw
    const draw = { enabled: true, amount: 3_000, months: 3, recoverable: true }
    const { total, drawBalance, monthly } = applyDraw(schedule, draw)
    expect(monthly).toEqual([3_000, 3_000, 5_000])
    expect(total).toBe(11_000)
    // Balance owed: (3000-1000) + (3000-2000) + 0 = 3,000
    expect(drawBalance).toBe(3_000)
  })

  it('non-recoverable draw floors pay but tracks no balance', () => {
    const schedule = [1_000, 2_000, 5_000]
    const draw = { enabled: true, amount: 3_000, months: 3, recoverable: false }
    const { drawBalance } = applyDraw(schedule, draw)
    expect(drawBalance).toBe(0)
  })

  it('does not affect months beyond the draw window', () => {
    const schedule = [1_000, 1_000, 1_000, 1_000]
    const draw = { enabled: true, amount: 3_000, months: 2, recoverable: true }
    const { monthly } = applyDraw(schedule, draw)
    expect(monthly).toEqual([3_000, 3_000, 1_000, 1_000])
  })
})

describe('yearOneVsSteadyState', () => {
  it('year one and steady state diverge when draw/ramp are active', () => {
    const base = 60_000
    const annualAtQuota = (q: number) => q * 0.05
    const result = yearOneVsSteadyState(
      base, annualAtQuota, 1_000_000,
      { enabled: true, months: 3, quotaReliefPct: 50 },
      { enabled: true, amount: 4_000, months: 3, recoverable: true },
    )
    expect(result.steadyStateTotal).toBeCloseTo(base + 50_000)
    expect(result.yearOneTotal).not.toBeCloseTo(result.steadyStateTotal, 0)
  })

  it('year one equals steady state when neither draw nor ramp is active', () => {
    const base = 60_000
    const annualAtQuota = (q: number) => q * 0.05
    const result = yearOneVsSteadyState(
      base, annualAtQuota, 1_000_000,
      { enabled: false, months: 0, quotaReliefPct: 0 },
      { enabled: false, amount: 0, months: 0, recoverable: true },
    )
    expect(result.yearOneTotal).toBeCloseTo(result.steadyStateTotal)
    expect(result.drawBalance).toBe(0)
  })

  it('includes a one-time flat addition (e.g. SPIFFs) in both totals', () => {
    const result = yearOneVsSteadyState(
      0, () => 0, 100,
      { enabled: false, months: 0, quotaReliefPct: 0 },
      { enabled: false, amount: 0, months: 0, recoverable: true },
      2_500,
    )
    expect(result.steadyStateTotal).toBe(2_500)
    expect(result.yearOneTotal).toBe(2_500)
  })
})

describe('periodizeAmount', () => {
  it('divides annual by the right factor for each period', () => {
    expect(periodizeAmount(120_000, 'monthly')).toBeCloseTo(10_000)
    expect(periodizeAmount(120_000, 'quarterly')).toBeCloseTo(30_000)
    expect(periodizeAmount(120_000, 'annual')).toBeCloseTo(120_000)
  })
})

describe('estimateFederalTax', () => {
  it('returns 0 below the standard deduction', () => {
    expect(estimateFederalTax(10_000, 'single')).toBe(0)
  })

  it('increases with income', () => {
    const lower = estimateFederalTax(80_000, 'single')
    const higher = estimateFederalTax(200_000, 'single')
    expect(higher).toBeGreaterThan(lower)
  })

  it('adds flat state tax on top of federal', () => {
    const withoutState = estimateFederalTax(150_000, 'single')
    const withState = estimateFederalTax(150_000, 'single', 5)
    expect(withState).toBeGreaterThan(withoutState)
  })
})

describe('estimateAnnualCommission — dispatches by plan type', () => {
  it('margin plan', () => {
    const plan: CommissionPlan = { type: 'margin', period: 'annual', avgDealSize: 1_000_000, avgGrossMarginPct: 25, marginRate: 3, expectedDealsPerYear: 12 }
    expect(estimateAnnualCommission(plan)).toBeCloseTo(7_500 * 12)
  })

  it('revenue plan at 100% attainment', () => {
    const plan: CommissionPlan = { type: 'revenue', period: 'annual', revenueQuota: 1_000_000, revenueRate: 5 }
    expect(estimateAnnualCommission(plan)).toBeCloseTo(50_000)
  })

  it('tiered plan', () => {
    const plan: CommissionPlan = {
      type: 'tiered', period: 'annual', revenueQuota: 1_000_000, tierMode: 'marginal',
      tiers: [{ id: '1', thresholdPct: 0, rate: 2 }, { id: '2', thresholdPct: 100, rate: 5 }],
    }
    expect(estimateAnnualCommission(plan)).toBeCloseTo(20_000) // 100% @ 2% since 100% tier only applies above it
  })

  it('flat plan', () => {
    const plan: CommissionPlan = { type: 'flat', period: 'annual', perDealAmount: 500, expectedUnitsPerYear: 100, spiffs: [{ id: '1', label: 'x', amount: 1_000 }] }
    expect(estimateAnnualCommission(plan)).toBe(51_000)
  })
})
