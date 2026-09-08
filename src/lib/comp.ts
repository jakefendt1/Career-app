// Pure compensation math — commission structures, tax estimate, draw/ramp scheduling.
// No React, no store access (type-only import from types.ts aside).
// Everything here is unit-testable in isolation.

import type { CommissionPlan } from './types'

export type Tier = { id: string; thresholdPct: number; rate: number }
export type TierMode = 'marginal' | 'retroactive'

export type Accelerator = { enabled: boolean; thresholdPct: number; rate: number }
export type Cap = { enabled: boolean; amount: number }

export type Spiff = { id: string; label: string; amount: number }

export type RampPlan = { enabled: boolean; months: number; quotaReliefPct: number }
export type DrawPlan = { enabled: boolean; amount: number; months: number; recoverable: boolean }

// ── Margin-based commission (per deal) ──────────────────────────────────────

export function calcMarginCommission(dealSize: number, gmPct: number, rate: number): number {
  return dealSize * (gmPct / 100) * (rate / 100)
}

// ── Revenue-based commission (quota × attainment × rate), with optional
//    accelerator above a threshold and an optional hard cap ─────────────────

export function calcRevenueCommission(
  quota: number,
  attPct: number,
  rate: number,
  accel?: Accelerator,
  cap?: Cap,
): number {
  let commission: number

  if (accel?.enabled && attPct > accel.thresholdPct) {
    const normalRevenue = quota * (accel.thresholdPct / 100)
    const excessRevenue = quota * ((attPct - accel.thresholdPct) / 100)
    commission = normalRevenue * (rate / 100) + excessRevenue * (rate / 100) * accel.rate
  } else {
    commission = quota * (attPct / 100) * (rate / 100)
  }

  if (cap?.enabled && cap.amount > 0) commission = Math.min(commission, cap.amount)
  return commission
}

// ── Tiered / quota commission — marginal (each tier only taxes revenue in its
//    band) or retroactive (the highest tier reached applies to ALL revenue) ─

export function calcTieredCommission(
  quota: number,
  attPct: number,
  tiers: Tier[],
  mode: TierMode = 'marginal',
): number {
  if (!tiers.length || quota <= 0) return 0
  const revenue = quota * (attPct / 100)
  const sorted = [...tiers].sort((a, b) => a.thresholdPct - b.thresholdPct)

  if (mode === 'retroactive') {
    let applicableRate = sorted[0]!.rate
    for (const tier of sorted) {
      if (attPct >= tier.thresholdPct) applicableRate = tier.rate
      else break
    }
    return revenue * (applicableRate / 100)
  }

  let total = 0
  for (let i = 0; i < sorted.length; i++) {
    const floor = quota * (sorted[i]!.thresholdPct / 100)
    const ceil = i < sorted.length - 1 ? quota * (sorted[i + 1]!.thresholdPct / 100) : revenue
    if (revenue <= floor) break
    total += (Math.min(revenue, ceil) - floor) * (sorted[i]!.rate / 100)
  }
  return total
}

// ── Flat per-deal / per-unit commission + one-off SPIFF bonuses ─────────────

export function calcFlatCommission(perDealAmount: number, units: number, spiffs: Spiff[] = []): number {
  const spiffTotal = spiffs.reduce((sum, s) => sum + s.amount, 0)
  return perDealAmount * units + spiffTotal
}

// ── Ramp: quota is relieved (reduced) for the first N months ────────────────
// annualCommissionAtQuota(quota) recomputes the annual commission a mode would
// pay if its annual quota/units figure were `quota` instead of the real one —
// callers pass in a closure over their mode's own rate/tier/etc inputs.

export function buildRampedMonthlySchedule(
  annualCommissionAtQuota: (quota: number) => number,
  baseAnnualQuota: number,
  ramp: RampPlan,
): number[] {
  const schedule: number[] = []
  for (let m = 0; m < 12; m++) {
    if (ramp.enabled && m < ramp.months) {
      const relievedQuota = baseAnnualQuota * (1 - ramp.quotaReliefPct / 100)
      schedule.push(annualCommissionAtQuota(relievedQuota) / 12)
    } else {
      schedule.push(annualCommissionAtQuota(baseAnnualQuota) / 12)
    }
  }
  return schedule
}

// ── Draw: a monthly floor paid regardless of commission earned. Recoverable
//    draw is an advance against future commission (tracked as a balance);
//    non-recoverable draw is a guarantee that's never paid back. ────────────

export function applyDraw(
  monthlySchedule: number[],
  draw: DrawPlan,
): { total: number; drawBalance: number; monthly: number[] } {
  let total = 0
  let drawBalance = 0
  const monthly: number[] = []

  monthlySchedule.forEach((earned, m) => {
    if (draw.enabled && m < draw.months) {
      const payout = Math.max(earned, draw.amount)
      monthly.push(payout)
      total += payout
      if (draw.recoverable) drawBalance += Math.max(0, draw.amount - earned)
    } else {
      monthly.push(earned)
      total += earned
    }
  })

  return { total, drawBalance, monthly }
}

// ── Composite: year-one (ramp + draw affected) vs. steady-state earnings ────

export type YearOneResult = {
  steadyStateTotal: number
  yearOneTotal: number
  drawBalance: number
  monthly: number[]
}

export function yearOneVsSteadyState(
  base: number,
  annualCommissionAtQuota: (quota: number) => number,
  baseAnnualQuota: number,
  ramp: RampPlan,
  draw: DrawPlan,
  extraFlat = 0, // e.g. SPIFFs — paid once, not scaled by ramp
): YearOneResult {
  const steadyStateCommission = annualCommissionAtQuota(baseAnnualQuota)
  const schedule = buildRampedMonthlySchedule(annualCommissionAtQuota, baseAnnualQuota, ramp)
  const { total: yearOneCommission, drawBalance, monthly } = applyDraw(schedule, draw)

  return {
    steadyStateTotal: base + steadyStateCommission + extraFlat,
    yearOneTotal: base + yearOneCommission + extraFlat,
    drawBalance,
    monthly,
  }
}

// ── Estimate annual commission at 100% attainment for any plan shape ────────
// Single source of truth for "what would this plan pay in a normal year" —
// used both by the Commission Calculator's "use as variable target" bridge
// and by the Compensation section's inline commission builder.

export function estimateAnnualCommission(plan: CommissionPlan): number {
  switch (plan.type) {
    case 'margin': {
      const { avgDealSize = 0, avgGrossMarginPct = 0, marginRate = 0, expectedDealsPerYear = 1 } = plan
      return calcMarginCommission(avgDealSize, avgGrossMarginPct, marginRate) * expectedDealsPerYear
    }
    case 'revenue': {
      const accel: Accelerator | undefined = plan.acceleratorEnabled
        ? { enabled: true, thresholdPct: plan.acceleratorThresholdPct ?? 100, rate: plan.acceleratorRate ?? 1.5 }
        : undefined
      const cap: Cap | undefined = plan.capEnabled ? { enabled: true, amount: plan.capAmount ?? 0 } : undefined
      return calcRevenueCommission(plan.revenueQuota ?? 0, 100, plan.revenueRate ?? 0, accel, cap)
    }
    case 'tiered':
      return calcTieredCommission(plan.revenueQuota ?? 0, 100, plan.tiers ?? [], plan.tierMode ?? 'marginal')
    case 'flat':
      return calcFlatCommission(plan.perDealAmount ?? 0, plan.expectedUnitsPerYear ?? 0, plan.spiffs ?? [])
    default:
      return 0
  }
}

// ── Quota period conversion ──────────────────────────────────────────────────

export type QuotaPeriod = 'monthly' | 'quarterly' | 'annual'

const PERIOD_DIVISOR: Record<QuotaPeriod, number> = { monthly: 12, quarterly: 4, annual: 1 }
const PERIOD_LABEL: Record<QuotaPeriod, string> = { monthly: 'month', quarterly: 'quarter', annual: 'year' }

export function periodizeAmount(annual: number, period: QuotaPeriod): number {
  return annual / PERIOD_DIVISOR[period]
}

export function periodLabel(period: QuotaPeriod): string {
  return PERIOD_LABEL[period]
}

// ── Federal tax estimate (rough — 2024 brackets, federal only) ──────────────

export type Filing = 'single' | 'married'

export const TAX_YEAR = 2024

const TAX_BRACKETS: Record<Filing, [number, number][]> = {
  single: [
    [11600, 0.10], [47150, 0.12], [100525, 0.22],
    [191950, 0.24], [243725, 0.32], [609350, 0.35], [Infinity, 0.37],
  ],
  married: [
    [23200, 0.10], [94300, 0.12], [201050, 0.22],
    [383900, 0.24], [487450, 0.32], [731200, 0.35], [Infinity, 0.37],
  ],
}
const STD_DEDUCTION: Record<Filing, number> = { single: 14600, married: 29200 }

export function estimateFederalTax(income: number, filing: Filing, stateTaxPct = 0): number {
  const taxable = Math.max(0, income - STD_DEDUCTION[filing])
  const brackets = TAX_BRACKETS[filing]
  let tax = 0
  let prev = 0
  for (const [cap, rate] of brackets) {
    if (taxable <= prev) break
    tax += (Math.min(taxable, cap) - prev) * rate
    prev = cap
  }
  const stateTax = Math.max(0, income) * (stateTaxPct / 100)
  return Math.round(tax + stateTax)
}
