# Career Toolkit — Product Spec

A web app for managing two adjacent job-search workflows in one place: evaluating roles against your current role with a weighted scoring engine, and generating tailored resume `.docx` files from per-application content. Same data layer, same persistence, same Profile.

This spec is the source of truth for v1. Build to it, flag deviations, and update it when scope changes.

## App Features

The app contains two surfaces that share a common data model and Profile:

- **Role Compare** — evaluate a target role against your current role across comp, career, lifestyle, risk, and personal axes. Output a weighted verdict and tradeoff map.
- **Resume Builder** — paste in tailored Profile, role bullets, and Skills text per application. Generate a styled `.docx` resume with locked formatting. Work history is editable (add / remove / reorder roles) so the tool grows with the user's career.

Both features write to the same localStorage namespace and share a single Profile (name, contact info, education, certifications). Don't duplicate that data across surfaces.

## Reference Materials

The project includes `Resume_Builder.html` — a working single-file prototype of the Resume Builder. Use it as the source of truth for:

- Visual styling of the generated `.docx` (fonts, colors, sizes, section headers, layout)
- The exact `docx` library API calls and document structure
- The "Load Base" UX pattern
- ATS-clean formatting decisions (no tables, no graphics, no headers/footers in body)

Do not change the visual output of the resume in v1. The prototype's output has been ATS-tested in real applications. Match it. Where the React port differs from the prototype, it's only because the work history is now dynamic and the contact/education/certs come from Profile instead of being hardcoded.

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
- **docx** — client-side Word document generation for the Resume Builder. Use the same export structure as the existing prototype HTML — proven to produce ATS-clean output.
- **@dnd-kit/core + @dnd-kit/sortable** — drag-and-drop reordering for the Work History Manager. Lighter than react-dnd, modern API.
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

// Profile is shared across Role Compare and Resume Builder.
// Single source of truth for personal info, education, and certifications.
type Profile = {
  name: string;                    // e.g. "Jacob Fendt"
  credentials?: string;            // e.g. "MBA" — appears after name on resume
  email: string;
  phone: string;
  city: string;
  state: string;
  postalCode?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  education: EducationEntry[];     // ordered, most recent first
  certifications: CertificationEntry[];  // ordered, most recent first
};

type EducationEntry = {
  id: string;
  degree: string;                  // e.g. "MBA, Business Administration & Management"
  school: string;                  // e.g. "University of Wisconsin – Whitewater"
  location: string;                // e.g. "Whitewater, WI"
  graduationYear?: number;
};

type CertificationEntry = {
  id: string;
  name: string;
  issuer: string;
  date: string;                    // freeform, e.g. "10/2025"
};

// Resume Builder — work history is dynamic per the user's actual career.
// ResumeJob is the canonical, editable job entry. ResumeDraft holds per-application
// tailored content (Profile paragraph, summaries, bullets, Skills) referencing those jobs.
type ResumeJob = {
  id: string;
  title: string;                   // e.g. "Account Manager"
  company: string;                 // e.g. "Intralox"
  location: string;                // e.g. "New Orleans, LA (Remote)"
  startDate: string;               // freeform, e.g. "2024" or "Jan 2024"
  endDate: string;                 // freeform, e.g. "Present" or "2024"
  order: number;                   // for sort ordering, lowest = most recent
};

type ResumeDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Application target
  targetCompany: string;           // used in download filename
  targetRole: string;              // used in download filename

  // Tailored content
  profileParagraph: string;        // the Profile section paragraph

  // Per-job tailored content. Keyed by ResumeJob.id so adding/removing/reordering
  // jobs in the master list propagates cleanly. Drafts created before a job was
  // added simply have no entry for that job.id and skip rendering it.
  jobContent: Record<string, {
    summary: string;               // optional italic line under job header
    bullets: string;               // raw textarea content, one bullet per line
  }>;

  skills: string;                  // raw textarea, one per line
  technicalAbilities: string;      // raw textarea, one per line
};

type AppState = {
  // Role Compare
  roles: Role[];
  activeComparison: { currentRoleId: string; targetRoleId: string } | null;

  // Resume Builder
  profile: Profile;
  resumeJobs: ResumeJob[];         // canonical work history, edited rarely
  resumeDrafts: ResumeDraft[];     // per-application drafts, created often

  // Shared
  preferences: UserPreferences;
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

## Role Compare Views

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

## Settings (app-wide)

Settings is shared across both features. Reachable from top-level nav.

- **Profile** — name, credentials, contact info, education entries (add/edit/remove/reorder), certifications (add/edit/remove/reorder). This data flows into resume generation and is the master record.
- **Personal weights** — five sliders for Role Compare scoring. Must sum to 100. UI enforces this with auto-balancing or hard validation, dev preference.
- **Honesty nudge toggle** — on/off
- **Verdict threshold customization** — for power users who want different sensitivity
- **Currency selector**
- **Export data** — downloads a JSON of all roles, drafts, jobs, profile, and preferences
- **Import data** — accepts a JSON, merges or replaces (with confirm)
- **Clear all data** — destructive, requires double confirm

## Resume Builder Feature

The Resume Builder generates a styled, ATS-clean `.docx` resume from per-application tailored content. It uses the [`docx`](https://docx.js.org) library to produce the file client-side. No server roundtrip.

The generated resume layout is fixed in v1 — Calibri body, blue (#2B6CB0) section heads with bottom rule, name + credentials in larger blue text, contact line below, then Profile → Work History → Skills → Technical Abilities → Education → Certifications. Footer with name, phone, email centered on every page. This layout is the existing prototype's output and should not be changed without an explicit scope discussion.

What's NEW vs. the prototype: work history is dynamic. The user can add, remove, edit, and reorder jobs in their canonical work history. The prototype hardcoded four roles; v1 doesn't.

### Resume Builder Views

#### View 1: Drafts List (Resume Builder home)

Card grid of all `ResumeDraft` records. Each card shows:

- Target company + target role (from the draft, not the user's actual role)
- Last updated
- Hover reveals: open, duplicate, delete

Top of view:

- "New draft" button (primary CTA)
- "Edit work history" button (secondary, opens View 3)

Empty state when no drafts: large "Start your first draft" CTA + a link to set up the canonical work history first if it's empty.

#### View 2: Draft Editor

Single-column form, similar UX to the prototype HTML but rendered in React.

Top of form:

- Target Company input
- Target Role input
- These two values feed the download filename and serve as the draft's display title in the Drafts List

Then sections in order:

1. **Profile** — single textarea for the 2-3 sentence summary paragraph
2. **Work History** — one section per job in the user's canonical work history, in order. Each section has:
   - Read-only header showing job title, company, location, dates (sourced from `ResumeJob`)
   - Role Summary textarea (optional italic line under the job header in the output)
   - Bullets textarea (one bullet per line, no dashes needed — the renderer adds them)
   - "Edit job details" link → opens View 3 in a side panel for that specific job
3. **Skills** — textarea, one per line
4. **Technical Abilities** — textarea, one per line

Sticky bottom bar with two actions:

- "Load Base" — populates the entire form with the user's last-used non-empty values for each field. Lets the user start from their previous draft and adjust per application. Confirm dialog if current form has unsaved content.
- "Download .docx" — generates the resume using the `docx` library, saves to `Jacob_Fendt_<TargetCompany>_<TargetRole>.docx` (filename adapts to the user's name from Profile). Shows a success toast on completion.

Auto-save to localStorage on every field change with 500ms debounce.

UX notes:

- If the user adds a job to their canonical work history AFTER creating a draft, the draft editor surfaces it as an empty section the next time it's opened. Doesn't block the flow.
- If the user removes a job from canonical work history, drafts that referenced it skip it on render. The draft data is retained (so re-adding the job restores the content) but doesn't appear in the editor.

#### View 3: Work History Manager

The canonical list of `ResumeJob` records. Reachable from the Drafts List ("Edit work history" button) and from the Draft Editor ("Edit job details" inline links).

- Card list of jobs, ordered by `order` (most recent first)
- Each card shows title, company, location, dates
- Card actions: edit, delete, drag handle for reorder
- "Add job" button at top
- Add/Edit opens an inline form with: title, company, location, start date, end date

Deletion confirms with a warning that drafts referencing this job will skip it on render (but won't lose the bullet content).

Reorder via drag-and-drop. Persists the new `order` values to localStorage.

### Resume Generation Logic

Place the docx generation in `src/lib/resume-generator.ts` as a pure function that takes `(profile, resumeJobs, draft)` and returns a Blob. Keep all docx styling constants at the top of the file:

```typescript
const STYLES = {
  BLUE: '2B6CB0',
  DARK: '1A202C',
  GRAY: '4A5568',
  RULE: 'A0C4E0',
  BODY_SIZE: 22,         // half-points, so 11pt
  NAME_SIZE: 48,         // 24pt
  HEAD_SIZE: 23,         // 11.5pt
  FONT: 'Calibri',
};
```

Document structure (in order):

1. Name + credentials line (e.g. "JACOB FENDT, MBA")
2. Contact line (city, state | phone | email)
3. LinkedIn line (if present in Profile)
4. Horizontal rule
5. Profile section header + paragraph
6. Work History section header
7. For each `ResumeJob` (in order), if the draft has content:
   - Job header (title bold + dates right-aligned via tab stop)
   - Company + location line (company in blue bold)
   - Optional summary line (italic gray)
   - Bullets (one Paragraph per non-empty line, automatic dash/bullet symbol)
8. Skills section header + skill list (3 per row, separated by spaced bullets)
9. Technical Abilities section header + tech list (same format as Skills)
10. Education section header + entries
11. Certifications section header + entries
12. Footer on every page: name, credentials, phone, email centered

Filename: `<FirstName>_<LastName>_<TargetCompany>_<TargetRole>.docx` with all non-alphanumeric chars replaced by underscores.

### Resume Builder — Out of Scope for v1

- PDF export (docx only in v1)
- Custom layouts or template selection
- AI-assisted bullet rewriting (the user pastes pre-tailored content; tailoring happens elsewhere)
- Resume version history / diff between drafts
- Multi-page resume layout decisions (let the docx library wrap naturally)
- Photo/headshot insertion (intentionally — ATS-hostile)
- Cover letter generation

## Component Hierarchy

```
src/
  App.tsx
  main.tsx
  
  components/
    ui/                    # shadcn primitives
    layout/
      AppShell.tsx
      Nav.tsx               # top-level nav: Role Compare | Resume Builder | Settings
    
    # ── Role Compare feature ──
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
    
    # ── Resume Builder feature ──
    resume/
      DraftsList.tsx
      DraftCard.tsx
      DraftEditor.tsx
      WorkHistoryManager.tsx
      JobCard.tsx
      JobEditDialog.tsx
      ResumeJobSection.tsx  # per-job draft editor section
    
    # ── Settings (app-wide) ──
    settings/
      SettingsPanel.tsx
      ProfileEditor.tsx     # name, contact, education, certs
      WeightsEditor.tsx
      DataManagement.tsx    # export, import, clear
  
  lib/
    scoring.ts              # pure scoring logic
    nudges.ts               # pure nudge rules
    storage.ts              # localStorage wrapper
    formatting.ts           # currency, percentages, dates
    resume-generator.ts     # pure docx generation
    types.ts                # all shared types
  
  store/
    useAppStore.ts          # Zustand store
  
  tests/
    scoring.test.ts
    nudges.test.ts
    storage.test.ts
    resume-generator.test.ts
```

## MVP Acceptance Criteria

The v1 build is done when all of these are true.

**Role Compare:**

1. User can create, edit, and delete a Role through the editor
2. User can mark exactly one Role as their current role
3. User can switch between Exploration and Decision modes per Role
4. User can launch a comparison between current Role and any other Role
5. The comparison dashboard renders the verdict, tradeoff map, all three charts, and the section breakdown
6. The scoring engine matches the formulas in this spec — verified by tests
7. At least 4 of the 6 honesty nudges are implemented and trigger correctly — verified by tests
8. Sensitivity analysis sliders update the verdict live without a page reload
9. The "would I take it at same comp" modal fires before verdict in Decision mode

**Resume Builder:**

10. User can create, edit, delete, and reorder `ResumeJob` records
11. User can create, edit, duplicate, and delete `ResumeDraft` records
12. Draft Editor renders one section per current `ResumeJob`, in the correct order
13. Profile data populates the resume header automatically — no duplicate entry in the draft
14. Education and certifications come from Profile, not the draft
15. Generated `.docx` matches the prototype's visual output (same fonts, sizes, colors, section heads, layout, footer) for the same input content
16. Adding a new job to work history surfaces it in existing drafts as an empty section
17. Removing a job from work history hides it from drafts on render but retains the underlying bullet content
18. "Load Base" populates the draft editor with the user's last-used non-empty values per field
19. Download filename adapts to user's actual name and target company/role

**App-wide:**

20. All data persists across page reloads via localStorage
21. Export to JSON and import from JSON both work for the full app state (roles, drafts, jobs, profile, preferences)
22. Settings page allows weight adjustment, nudge toggle, currency change, and full Profile editing
23. Top-level navigation switches cleanly between Role Compare and Resume Builder without losing in-progress edits
24. The app passes `tsc --noEmit`, the linter, and all tests with no warnings

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

**Recommended build order — phases:**

**Phase 1: Foundation (shared)**
- Types and Zustand store
- localStorage wrapper with namespaced keys for `roles`, `resumeDrafts`, `resumeJobs`, `profile`, `preferences`
- App shell with top-level nav (Role Compare | Resume Builder | Settings)
- Profile editor in Settings — gets the user's name, contact, education, certs in early so resume work has data to render

**Phase 2: Role Compare core**
- Scoring engine (`src/lib/scoring.ts`) — pure function, no UI dependencies. Get it tested and correct before any component imports it.
- Role editor with all six sections
- Roles list + ability to mark current role
- Comparison dashboard: verdict card, tradeoff map, section breakdown
- Charts: radar → bar → OTE breakdown
- Sensitivity analysis last (complex, lowest MVP priority within Role Compare)

**Phase 3: Resume Builder core**
- `ResumeJob` types and Work History Manager with reorder
- Resume generator (`src/lib/resume-generator.ts`) — pure function that takes profile + jobs + draft and returns a Blob. Test it independently against the prototype's output.
- Draft editor with dynamic per-job sections
- Drafts list
- "Load Base" feature — populates fields from last-used values per field

**Phase 4: Polish layer**
- Honesty nudges (4 of 6 for MVP)
- "Would you take it at same comp" modal
- Export / import JSON
- Empty states, loading states, error toasts

**Build the scoring engine and resume generator in isolation.** Both are pure functions with no UI dependencies. Get them tested and correct before any component imports them. These two are the differentiated, hard-to-get-right pieces — everything else is glue.

**Checkpoint after each phase.** Don't try to ship the whole app in one pass. Working software at every checkpoint, per the build mental model. After Phase 1, the user should be able to enter their Profile and navigate the empty shells of both features. After Phase 2, Role Compare should be fully usable. After Phase 3, both features work end to end. Phase 4 is the polish that makes it actually pleasant.

## Self-Improvement Loop Specific to This Project

When you hit a real edge case during build, log it. Examples likely to come up:

- A role with no variable comp (pure base) — does the engine handle it cleanly?
- A current role marked but then deleted — what happens to active comparisons?
- A user who hasn't set weights yet — what defaults render?
- A nudge that fires on a Role the user hasn't finished editing — does the timing make sense?
- A resume draft that references a job ID that no longer exists in canonical work history — does the renderer skip it cleanly?
- A user with an empty Profile generating a resume — does it render gracefully or blow up?
- A draft with bullets but no role summary — does the docx still produce correctly?
- A user who renames a job in canonical work history after creating drafts — do the drafts pick up the new name on next render?

Each of these should be either solved in code (with a test) or documented as a known limitation in `CLAUDE.md`. Don't let edge cases live as TODOs in code — either solve them or document them.
