/** How the rep gets paid, plus the cross-cutting terms (accelerators, caps,
 *  draw, ramp, payout period) that apply on top of the base structure. */
export type CommissionPlan = {
  type: 'margin' | 'revenue' | 'tiered' | 'flat';
  period: 'monthly' | 'quarterly' | 'annual';

  // margin mode
  avgDealSize?: number;
  avgGrossMarginPct?: number;
  marginRate?: number;
  expectedDealsPerYear?: number;

  // revenue mode
  revenueQuota?: number;
  revenueRate?: number;
  acceleratorEnabled?: boolean;
  acceleratorThresholdPct?: number;
  acceleratorRate?: number;
  capEnabled?: boolean;
  capAmount?: number;

  // tiered mode
  tierMode?: 'marginal' | 'retroactive';
  tiers?: { id: string; thresholdPct: number; rate: number }[];

  // flat mode
  perDealAmount?: number;
  expectedUnitsPerYear?: number;
  spiffs?: { id: string; label: string; amount: number }[];

  // draw & ramp — apply to revenue, tiered, and flat modes
  drawEnabled?: boolean;
  drawAmount?: number;
  drawMonths?: number;
  drawRecoverable?: boolean;
  rampEnabled?: boolean;
  rampMonths?: number;
  rampQuotaReliefPct?: number;
};

export type Role = {
  id: string;
  isCurrent: boolean;
  mode: 'exploration' | 'decision';
  status: 'evaluating' | 'interviewing' | 'offer' | 'declined' | 'accepted' | 'current';
  createdAt: string;
  updatedAt: string;

  basics: {
    company: string;
    title: string;
    industry?: string;
    companySize: 'sub-100' | '100-1k' | '1k-10k' | '10k+' | 'unknown';
    location: string;
    workMode: 'remote' | 'hybrid' | 'onsite';
  };

  comp: {
    base: number;
    variableTarget: number;
    realisticAttainment: number;
    commissionStructure: 'linear' | 'accelerator' | 'capped' | 'unknown';
    equityValue?: number;
    signOnBonus?: number;
    retirementMatchPct?: number;
    carAllowance?: number;
    otherPerks?: string;
    commissionPlan?: CommissionPlan;
  };

  career: {
    titleTrajectory: number;
    scopeSize: number;
    skillDevelopment: number;
    companyPrestige: number;
    networkValue: number;
    exitOptionality: number;
  };

  lifestyle: {
    travelDaysPerMonth: number;
    flexibilityScore: number;
    hoursPerWeek: number;
    commuteMinutes: number;
    vacationDays: number;
    managerQuality: number;
    teamCulture: number;
  };

  risk: {
    companyHealth: number;
    industryTrajectory: number;
    roleStability: number;
    compCeiling: number;
    cultureFitRisk: number;
  };

  personal: {
    excitement: number;
    whatExcitesYou?: string;
    whatWorriesYou?: string;
    openQuestions?: string;
  };

  attachedDraftIds?: string[];

  confidence: {
    comp: 'high' | 'medium' | 'low';
    career: 'high' | 'medium' | 'low';
    lifestyle: 'high' | 'medium' | 'low';
    risk: 'high' | 'medium' | 'low';
  };
};

export type UserPreferences = {
  weights: {
    comp: number;
    career: number;
    lifestyle: number;
    risk: number;
    personal: number;
  };
  currency: string;
  honestyNudgesEnabled: boolean;
  verdictThresholds: {
    strongMove: number;
    softMove: number;
    softStay: number;
    strongStay: number;
  };
};

export type Profile = {
  name: string;
  credentials?: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  postalCode?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  education: EducationEntry[];
  certifications: CertificationEntry[];
};

export type EducationEntry = {
  id: string;
  degree: string;
  school: string;
  location: string;
  graduationYear?: number;
};

export type CertificationEntry = {
  id: string;
  name: string;
  issuer: string;
  date: string;
};

export type ResumeJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  order: number;
};

export type ResumeDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  targetCompany: string;
  targetRole: string;
  profileParagraph: string;
  jobContent: Record<string, {
    summary: string;
    bullets: string;
  }>;
  skills: string;
  technicalAbilities: string;
};

export type AppState = {
  roles: Role[];
  activeComparison: { currentRoleId: string; targetRoleId: string } | null;
  profile: Profile;
  resumeJobs: ResumeJob[];
  resumeDrafts: ResumeDraft[];
  preferences: UserPreferences;
};

export type VerdictLabel = 'strong-move' | 'soft-move' | 'lateral' | 'soft-stay' | 'strong-stay';

export type FieldDelta = {
  label: string;
  section: string;
  targetValue: number;
  currentValue: number;
  delta: number;
};

export type RoleScore = {
  realOTE: number;
  riskAdjustedOTE: number;
  compScore: number;
  careerScore: number;
  lifestyleScore: number;
  riskScore: number;
  personalScore: number;
  totalScore: number;
};

export type ComparisonResult = {
  target: RoleScore;
  current: RoleScore;
  scoreDelta: number;
  verdict: VerdictLabel;
  topGains: FieldDelta[];
  topConcerns: FieldDelta[];
};

export type NudgeType =
  | 'halo-effect'
  | 'comp-tunnel-vision'
  | 'ignored-low-confidence'
  | 'symmetry-flag';

export type Nudge = {
  type: NudgeType;
  message: string;
  section?: string;
};

export type View = 'roles' | 'role-editor' | 'comparison' | 'resume' | 'resume-editor' | 'work-history' | 'settings' | 'ote-calculator' | 'commission-calc' | 'role-hub';

// ── Migration: old `comp.commissionParams` (margin/revenue/tiered only, no
//    period/accelerator/draw/ramp) → the current `comp.commissionPlan` shape.
//    Safe to call on already-migrated or commission-less roles (no-op). ─────

type LegacyCommissionParams = {
  type: 'margin' | 'revenue' | 'tiered';
  avgDealSize?: number;
  avgGrossMarginPct?: number;
  marginRate?: number;
  expectedDealsPerYear?: number;
  revenueQuota?: number;
  revenueRate?: number;
  tiers?: { thresholdPct: number; rate: number }[];
};

export function migrateRole(role: Role): Role {
  const comp = role.comp as Role['comp'] & { commissionParams?: LegacyCommissionParams };
  if (!comp.commissionParams || comp.commissionPlan) {
    // Nothing to migrate, but drop a stray legacy key if it snuck in alongside a plan.
    if (comp.commissionParams && comp.commissionPlan) {
      const { commissionParams: _drop, ...rest } = comp;
      return { ...role, comp: rest };
    }
    return role;
  }

  const p = comp.commissionParams;
  const commissionPlan: CommissionPlan = {
    type: p.type,
    period: 'annual',
    avgDealSize: p.avgDealSize,
    avgGrossMarginPct: p.avgGrossMarginPct,
    marginRate: p.marginRate,
    expectedDealsPerYear: p.expectedDealsPerYear,
    revenueQuota: p.revenueQuota,
    revenueRate: p.revenueRate,
    tierMode: 'marginal',
    tiers: p.tiers?.map((t, i) => ({ id: String(i + 1), ...t })),
  };

  const { commissionParams: _drop, ...restComp } = comp;
  return { ...role, comp: { ...restComp, commissionPlan } };
}
