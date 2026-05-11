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

export type View = 'roles' | 'role-editor' | 'comparison' | 'resume' | 'resume-editor' | 'work-history' | 'settings' | 'ote-calculator';
