# Role Compare — Product Spec

A web app for evaluating a job role against your current role. Inputs comp, scope, lifestyle, risk, and excitement signals on both sides. Outputs a weighted comparison, surfaces real tradeoffs, and gives a clear verdict on whether the move makes sense.

This spec is the source of truth for v1. Build to it, flag deviations, and update it when scope changes.

## Hard Rules (Non-Negotiable)

- **No backend in v1.** Everything runs client-side. No API keys, no auth, no cloud sync.
- **No PII or comp data leaves the browser.** All persistence is localStorage. Make this visible to the user — they should know their data is local-only.
- **Currency and ranges are user-locale aware.** Default to USD but don't hardcode the symbol. Numbers display with locale-aware formatting.
- **The honesty nudge system is opt-out, not opt-in.** Default ON. The whole point of the tool is to prevent self-deception during a job search; making it default off defeats the design.
- **Never auto-submit a recommendation.** The verdict is a synthesis tool, not a decision-maker. The UI must reinforce that the user is making the call.

## What This Tool Is For

The tool serves two related but distinct use cases. The user toggles between them per-comparison.

**Mode A: Exploration** — User is considering whether to apply or interview for a role. Comp numbers are estimates, lifestyle/culture signals are mostly inferred from posting + research. The tool's job is to surface whether the role is worth the time investment to pursue.

**Mode B: Decision** — User has an offer in hand or is in late-stage negotiation. Numbers are real, signals from interviews are direct. The tool's job is to surface tradeoffs the user might be glossing over.

Both modes use the same scoring engine but adjust:
- Required vs. optional fields (Decision mode requires more signal)
- Confidence indicators (Exploration shows "based on partial data" caveats)
- Honesty nudge intensity (Decision mode nudges harder, since the stakes are real)

## The Build Mental Model

**1. The user is using this to make a real decision.** Every UX choice should reinforce clarity over cleverness. A score that looks impressive but hides the tradeoff is worse than a plain table that surfaces it.

**2. Honesty is the differentiator.** Comp calculators exist. Pros/cons lists exist. What's missing is a tool that pushes back when the user is rationalizing. That's the value prop. Don't water down the nudge system to make the UX feel friendlier.

**3. Weighted scoring is a means, not an end.** The total score gets attention but the tradeoff narrative does the work. If we had to cut one, we'd cut the score before the tradeoff surface.

**4. Generalization without genericness.** The tool should work for any knowledge-economy job (sales, engineering, ops, marketing, exec) without requiring the user to fill in 80 fields. Smart defaults, progressive disclosure, optional sections.

## Tech Stack

- **React 18 + Vite** — fast dev loop, modern, no SSR overhead needed
- **TypeScript** — required, not optional. Comp data has too many shapes to ship without types.
- **TailwindCSS** — utility-first, matches user's existing artifact patterns
- **shadcn/ui** — component library for forms, dialogs, sliders, tabs, cards
- **Recharts** — radar charts, bar charts, sensitivity analysis charts
- **Zustand** — state management. Simpler than Redux, more structured than raw context. Good fit for this app's complexity.
- **localStorage** — the only persistence layer
- **Vitest + React Testing Library** — unit + component tests

No router needed for v1. Single-page with view switching via Zustand state.

## Data Model

The Role object is the central type. Both sides of any comparison are Roles.

```typescript
type Role = {
  id: string;                    // uuid
  isCurrent: boolean;            // exactly one Role across all stored Roles is true
  mode: 'exploration' | 'decision';
  status: 'evaluating' | 'interviewing' | 'offer' | 'declined' | 'accepted' | 'current';
  createdAt: string;             // ISO timestamp
  updatedAt: string;

  // Basics
  basics: {
    company: string;
    title: string;
    industry?: string;           // free text, suggested from common list
    companySize: 'sub-100' | '100-1k' | '1k-10k' | '10k+' | 'unknown';
    location: string;
    workMode: 'remote' | 'hybrid' | 'onsite';
  };

  // Compensation — all amounts in user's currency
  comp: {
    base: number;
    variableTarget: number;      // commission/bonus at 100% attainment
    realisticAttainment: number; // 0.5 - 1.5, default 1.0
    commissionStructure: 'linear' | 'accelerator' | 'capped' | 'unknown';
    equityValue?: number;        // annualized
    signOnBonus?: number;        // one-time
    retirementMatchPct?: number; // % of base
    carAllowance?: number;       // annualized
    otherPerks?: string;         // free text
  };

  // Career & Growth — all 1-10 scales
  career: {
    titleTrajectory: number;     // 1 = capped here, 10 = clear path up
    scopeSize: number;           // 1 = small, 10 = enterprise
    skillDevelopment: number;
    companyPrestige: number;
    networkValue: number;
    exitOptionality: number;     // 1 = hard to leave, 10 = easy to parlay
  };

  // Lifestyle
  lifestyle: {
    travelDaysPerMonth: number;
    flexibilityScore: number;    // 1-10, captures WFH + schedule control
    hoursPerWeek: number;
    commuteMinutes: number;      // one-way; 0 if remote
    vacationDays: number;
    managerQuality: number;      // 1-10, optional in Exploration mode
    teamCulture: number;         // 1-10, optional in Exploration mode
  };

  // Risk
  risk: {
    companyHealth: number;       // 1-10, 10 = rock solid
    industryTrajectory: number;  // 1-10, 10 = booming
    roleStability: number;       // 1-10, 10 = won't be cut
    compCeiling: number;         // 1-10, 10 = can grow comp here
    cultureFitRisk: number;      // 1-10, 10 = strong fit signal
  };

  // Excitement / Personal
  personal: {
    excitement: number;          // 1-10 gut score
    whatExcitesYou?: string;
    whatWorriesYou?: string;
    openQuestions?: string;
  };

  // Confidence — how solid is each section's data
  confidence: {
    comp: 'high' | 'medium' | 'low';
    career: 'high' | 'medium' | 'low';
    lifestyle: 'high' | 'medium' | 'low';
    risk: 'high' | 'medium' | 'low';
  };
};

type UserPreferences = {
  weights: {
    comp: number;        // 0-100, all five must sum to 100
    career: number;
    lifestyle: number;
    risk: number;
    personal: number;
  };
  currency: string;      // ISO code, default 'USD'
  honestyNudgesEnabled: boolean;  // default true
  // Threshold deltas for verdict logic — exposed for power users in settings
  verdictThresholds: {
    strongMove: number;  // default 15 (%)
    softMove: number;    // default 5 (%)
    softStay: number;    // default -5 (%)
    strongStay: number;  // default -15 (%)
  };
};

type AppState = {
  roles: Role[];
  preferences: UserPreferences;
  activeComparison: { currentRoleId: string; targetRoleId: string } | null;
};
```

## Scoring Engine

The scoring engine is the heart of the tool. It must be deterministic, testable, and inspectable. Build it as a pure function in `src/lib/scoring.ts` with no React dependencies. Test it independently.

**Step 1: Real OTE calculation**

```
realOTE = base 
        + (variableTarget × realisticAttainment)
        + (equityValue ?? 0)
        + (carAllowance ?? 0)
        + ((retirementMatchPct ?? 0) / 100 × base)
```

Sign-on is excluded from realOTE because it's one-time. It surfaces separately in the comparison view.

**Step 2: Risk-adjusted real OTE**

```
riskAdjustedOTE = realOTE × (companyHealth / 10) × (roleStability / 10)
```

This is the comparison number that should anchor the comp section of the dashboard. Stated OTE is shown but de-emphasized.

**Step 3: Section subscores**

Each non-comp section produces a 0-100 subscore by averaging its 1-10 fields and scaling. Comp is its own beast — handled separately by the riskAdjustedOTE delta.

**Step 4: Weighted total score**

```
totalScore = (compScore × weights.comp / 100)
           + (careerScore × weights.career / 100)
           + (lifestyleScore × weights.lifestyle / 100)
           + (riskScore × weights.risk / 100)
           + (personalScore × weights.personal / 100)
```

The compScore is itself a function of the riskAdjustedOTE delta vs. current role, normalized to a 0-100 scale where parity with current = 50, +30% = 90, -30% = 10.

**Step 5: Verdict**

The total score delta between the target role and the current role drives the verdict, against the user's configurable thresholds:

- delta ≥ strongMove threshold → "Strong Move" (green)
- softMove ≤ delta < strongMove → "Soft Move" (light green)
- softStay < delta < softMove → "Lateral / Wash" (yellow)
- strongStay < delta ≤ softStay → "Soft Stay" (orange)
- delta ≤ strongStay → "Strong Stay" (red)

The verdict is always paired with the top 3 reasons (positive deltas) and top 3 concerns (negative deltas) so the user can't anchor on the color alone.

## Honesty Nudge System

This is the differentiated feature. Nudges fire on specific patterns and surface as inline warnings, not blocking modals. Default state ON. Toggle in settings.

Nudge triggers (build each as a pure rule in `src/lib/nudges.ts`):

**1. Recency bias on current role**
If the user scores their current role meaningfully lower on culture/manager/team than a recent past edit suggested, flag it. "You scored your current role's culture at 4. Two weeks ago it was 7. Did something change, or is the search shifting your read?"

**2. Halo on the target role**
If the target role scores 9-10 on every section, flag it. "Every section of [role] scored 9 or 10. Few real roles are that good across the board. Worth revisiting one section critically?"

**3. Comp tunnel vision**
If the target role wins on comp but loses on 3+ other sections AND the user weights comp >50%, flag it. "Comp is winning this comparison, but [role] loses on lifestyle, risk, and culture fit. Is the comp delta really worth those tradeoffs?"

**4. Ignored low confidence**
If a section's confidence is "low" but the user's score for that section is at the extremes (≤2 or ≥9), flag it. "You marked [section] confidence as low but scored it [score]. Strong scores on weak data drive bad decisions."

**5. Symmetry check**
If any field on the target role is meaningfully better than the same field on the current role AND the user has no signal explaining why, flag it. "You scored [target]'s manager quality as 9 vs. [current]'s 5. What's the source of that signal?"

**6. The "would I take this role at the same comp" test**
On Decision mode, before the verdict renders, the tool asks one final question in a modal: "If this role paid the same OTE as your current role, would you still take it?" The answer is captured but not used in the score — it's there to surface the comp-vs-fit honesty test for the user explicitly. Their answer appears on the verdict card next to the score.

Nudges should be dismissible per-comparison but persist if the user re-opens the comparison. They are not blocking.

## Views

### View 1: Roles List (default landing view)

Card grid of all roles. Each card shows:
- Company + title
- Status badge (current / evaluating / offer / accepted / declined)
- Real OTE
- Last updated
- Hover reveals: edit, duplicate, delete, mark as current

Top of view:
- "Add new role" button (primary CTA)
- Filter by status
- Sort by score, real OTE, updated date

If no current role is marked, the top of the view shows a banner: "Mark one role as your current role to enable comparisons."

### View 2: Role Editor

Single-column form with collapsible sections. Each section header shows the confidence indicator (high/medium/low dropdown) and a section completion percentage.

Sections in order:
1. Basics (always expanded on open)
2. Compensation
3. Career & Growth
4. Lifestyle
5. Risk
6. Personal Notes

Sticky save bar at bottom. Auto-save to localStorage on every field change with a 500ms debounce.

Field UX rules:
- 1-10 scales render as sliders with current value displayed
- Currency fields format on blur, accept raw numbers during entry
- Required fields differ by mode — Decision mode requires comp + risk fully completed; Exploration mode allows looser entry
- Tooltips on every numeric field explaining what the score means at the extremes

### View 3: Comparison Dashboard

Top of page — the verdict card:
- Color-coded verdict (Strong Move / Soft Move / Wash / Soft Stay / Strong Stay)
- One-sentence summary
- The "would I take it at the same comp" answer if Decision mode
- Total weighted score for both roles, large
- Score delta percentage

Below verdict — the tradeoff map:
- "What you'd gain" — top 3 positive deltas in plain English
- "What you'd give up" — top 3 negative deltas in plain English
- Each phrased as a sentence, not a metric

Below tradeoff — the visualizations row:
- **Radar chart** with 5 axes (comp, career, lifestyle, risk, personal). Both roles overlaid.
- **Bar chart** comparing weighted section scores
- **Real OTE comparison** with stacked bars showing base / variable / equity / perks for each role, plus the risk-adjusted line

Below visualizations — section-by-section breakdown:
- One row per section
- Side-by-side scores
- Delta indicator
- Click to expand for line-item detail

Bottom — the sensitivity analysis card:
- Three sliders: "What if attainment came in at X%?", "What if base was Y% higher/lower?", "What if I weighted comp at Z%?"
- Verdict updates live as sliders move
- "Reset to actual values" button

Honesty nudges appear inline as yellow callout cards positioned near the relevant section.

### View 4: Settings

- Personal weights — five sliders for the five categories, must sum to 100. UI enforces this with auto-balancing or hard validation, dev preference.
- Honesty nudge toggle — on/off
- Verdict threshold customization — for power users who want different sensitivity
- Currency selector
- Export data — downloads a JSON of all roles + preferences
- Import data — accepts a JSON, merges or replaces (with confirm)
- Clear all data — destructive, requires double confirm

## Component Hierarchy

```
src/
  App.tsx
  main.tsx
  
  components/
    ui/                    # shadcn primitives
    layout/
      AppShell.tsx
      Nav.tsx
    roles/
      RoleCard.tsx
      RolesList.tsx
      RoleEditor.tsx
      RoleSection.tsx       # collapsible section wrapper
      sections/
        BasicsSection.tsx
        CompensationSection.tsx
        CareerSection.tsx
        LifestyleSection.tsx
        RiskSection.tsx
        PersonalSection.tsx
    comparison/
      ComparisonDashboard.tsx
      VerdictCard.tsx
      TradeoffMap.tsx
      RadarChart.tsx
      ScoreBarChart.tsx
      OTEBreakdownChart.tsx
      SectionBreakdown.tsx
      SensitivityPanel.tsx
      WouldYouTakeItModal.tsx
    nudges/
      NudgeCard.tsx
      NudgeProvider.tsx     # context for nudge state
    settings/
      SettingsPanel.tsx
      WeightsEditor.tsx
      DataManagement.tsx
  
  lib/
    scoring.ts              # pure scoring logic
    nudges.ts               # pure nudge rules
    storage.ts              # localStorage wrapper
    formatting.ts           # currency, percentages, dates
    types.ts                # all shared types
  
  store/
    useAppStore.ts          # Zustand store
  
  tests/
    scoring.test.ts
    nudges.test.ts
    storage.test.ts
```

## MVP Acceptance Criteria

The v1 build is done when all of these are true:

1. User can create, edit, and delete a Role through the editor
2. User can mark exactly one Role as their current role
3. User can switch between Exploration and Decision modes per Role
4. User can launch a comparison between current Role and any other Role
5. The comparison dashboard renders the verdict, tradeoff map, all three charts, and the section breakdown
6. The scoring engine matches the formulas in this spec — verified by tests
7. At least 4 of the 6 honesty nudges are implemented and trigger correctly — verified by tests
8. Sensitivity analysis sliders update the verdict live without a page reload
9. The "would I take it at same comp" modal fires before verdict in Decision mode
10. All data persists across page reloads via localStorage
11. Export to JSON and import from JSON both work
12. Settings page allows weight adjustment, nudge toggle, and currency change
13. The app passes `tsc --noEmit`, the linter, and all tests with no warnings

## Out of Scope for v1

Document these as v2 candidates so they don't sneak in mid-build:

- Cloud sync, auth, multi-device support
- Sharing comparisons with others (e.g. spouse, mentor)
- Multi-currency support beyond display formatting (no FX conversion)
- Resume / job description parsing to auto-populate fields
- AI-generated nudges beyond the 6 hardcoded rules
- Decision journal (saved verdicts + retrospective view)
- Mobile-optimized layout — v1 is desktop-first, mobile-functional but not polished
- Comparison of more than two roles at once
- Historical comparison (track how scores change over time on the same role)

## How to Build This

Follow the operating principles in `CLAUDE.md`. A few specifics for this project:

**Build the scoring engine first, in isolation.** It's a pure function with no UI dependencies. Get it tested and correct before any component imports it. The scoring formulas are the differentiator and the easiest thing to get subtly wrong.

**Build the data layer second.** Types, store, localStorage wrapper. Once roles can be created, persisted, and read back reliably, the UI is straightforward.

**Build the editor before the dashboard.** No comparison is possible without two complete Role records. The editor is also the most surface area, so building it first surfaces UX questions early.

**Build the dashboard in layers.** Verdict card and tradeoff map first (those are the high-value pieces). Then the radar chart. Then the bar charts. Then sensitivity analysis last — it's the most complex and the lowest-priority for an MVP.

**Build the nudges last.** They're additive. The app should be usable without them, then the nudges layer on top. Build 4 of the 6 for MVP, ship, add the rest in v1.1.

**Checkpoint after each layer.** Don't try to ship the whole app in one pass. Working software at every checkpoint, per the build mental model.

## Self-Improvement Loop Specific to This Project

When you hit a real edge case during build, log it. Examples likely to come up:

- A role with no variable comp (pure base) — does the engine handle it cleanly?
- A current role marked but then deleted — what happens to active comparisons?
- A user who hasn't set weights yet — what defaults render?
- A nudge that fires on a Role the user hasn't finished editing — does the timing make sense?

Each of these should be either solved in code (with a test) or documented as a known limitation in `CLAUDE.md`. Don't let edge cases live as TODOs in code — either solve them or document them.
