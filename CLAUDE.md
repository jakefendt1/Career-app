# Agent Instructions — App Development

You're working inside an **app development project**. Your job is to build and maintain a working application: scaffolding, features, refactors, tests, and bug fixes against a live codebase. Reasoning is yours; the codebase is the source of truth.

## Hard Rules (Non-Negotiable)

- **Never store secrets in code.** No API keys, tokens, or credentials in source files, config checked into git, or commit messages. Use `.env` and add it to `.gitignore`.
- **Ask before destructive operations.** Deleting files, dropping data, force-pushing, rewriting git history, or running migrations against real data — confirm first.
- **Don't introduce new dependencies without flagging them.** New libraries change the install footprint and the security surface. Propose, get a yes, then add.
- **Don't refactor outside the scope of the current task.** If you spot something worth fixing, note it and ask. Drive-by refactors break review.
- **Never commit `.env`, `node_modules/`, build artifacts, or local database files.** These are gitignored for a reason.

## The Build Mental Model

App development is iterative against a living codebase, not orchestrated runs of standalone scripts. Three things are always true:

**1. The codebase is the source of truth.** Before writing anything, read what's there. Existing patterns, naming conventions, file structure, and state-management approach should guide new code. Consistency beats cleverness.

**2. Small, reviewable changes beat big ones.** A feature delivered in three reviewable chunks is easier to verify, easier to roll back, and less likely to ship bugs than the same feature dropped as one large diff.

**3. Working software at every checkpoint.** Don't leave the build broken between steps. If a refactor needs two passes, the first pass should still compile and pass tests. Half-finished states are how regressions slip in.

## How to Operate

**1. Read before writing.**
Before adding or changing code:
- Look at the file you're about to touch and its neighbors. Match the existing style — naming, imports, error handling, component structure.
- Check whether what you're about to build already exists somewhere (a util, a hook, a component). Reuse over duplication.
- If the project has a `CLAUDE.md`, `README.md`, or `ARCHITECTURE.md`, read it first. Decisions documented there override your defaults.

**2. Plan the change before making it.**
For anything beyond a one-line fix:
- State the plan briefly: which files you'll touch, what you'll add, what you'll change, what you'll leave alone.
- Flag assumptions you're making about scope, behavior, or edge cases. Better to ask now than to undo later.
- For larger changes, propose checkpoints — natural pause points where I can review before you continue.

**3. Test what you build.**
- Run the type checker, linter, and test suite after meaningful changes. Don't hand back work that doesn't compile or fails its own tests.
- For new behavior, add or extend tests. The bar isn't full coverage; it's "the next person changing this won't accidentally break it."
- If a test is hard to write, that's usually a signal the code is structured wrong. Surface it.

**4. Communicate clearly about what you're doing.**
- Before a change: briefly state the plan (files, scope, expected outcome).
- During: only surface things that need a decision — ambiguous requirements, missing context, choices with real tradeoffs.
- After: summarize what changed, what was tested, and what's left. Call out anything I should verify by hand.
- Never silently skip a step. If something in the plan turned out not to apply, say so and why.

**5. Learn and adapt when things fail.**
When you hit an error:
- Read the full message and stack trace before guessing.
- Fix the root cause, not the symptom. Catching an exception to make a test pass isn't a fix.
- If the failure points at a missing convention or undocumented constraint, propose adding it to `CLAUDE.md` or the relevant doc.

## The Self-Improvement Loop

Every bug, surprise, or rough edge is a chance to make the project stronger:

1. Identify what broke or was confusing
2. Fix the code
3. Verify the fix works (tests, manual check, or both)
4. Propose a doc or convention update so it doesn't recur
5. Move on with a more robust codebase

This loop is how the project sharpens over time. Don't skip step 4 — undocumented lessons get re-learned.

## File Structure

**What goes where:**
- **Source code**: lives in the project's primary source directory (`src/`, `app/`, `lib/` — match the convention already in place)
- **Tests**: alongside source files or in a parallel `tests/` tree, whichever the project uses
- **Configuration**: at project root or in `config/` per project convention
- **Build artifacts**: `dist/`, `build/`, `.next/`, etc. — never committed

**Default layout for a new project (adjust to framework conventions):**

```
src/                    # Application source
  components/           # UI components
  lib/                  # Shared utilities, helpers
  state/                # Stores, contexts, reducers
  styles/               # Global styles, design tokens
tests/                  # Test files (or colocated with source)
public/                 # Static assets served as-is
.env                    # Local environment variables (NEVER commit)
.env.example            # Committed template showing required vars
```

**Core principle:** Match the framework's conventions. A Next.js app uses `app/` and `pages/`; a Vite + React app uses `src/`. Don't impose a custom layout on a framework that has an opinion.

## What a Good Feature Plan Looks Like

Before building anything non-trivial, the plan should be skimmable and unambiguous. Example:

```markdown
## Feature: Add CSV export to the Budget tab

**Goal:** Let the user download their current budget as a CSV file.

**Files I'll touch:**
- `src/components/BudgetTab.tsx` — add export button, wire up handler
- `src/lib/exporters.ts` — new file, holds `budgetToCsv(state)` function
- `tests/exporters.test.ts` — new file, unit tests for the exporter

**Behavior:**
- Button sits in the tab header, right-aligned.
- On click, generates a CSV from current Zustand state and triggers download.
- Filename: `budget-YYYY-MM-DD.csv`.
- Empty budget exports headers only, no rows.

**Out of scope:** XLSX export, scheduled exports, server-side generation.

**Open questions:**
- Should the CSV include calculated totals as a final row, or just raw line items?
```

When the work is done, the plan converts to a short summary: what shipped, what was tested, what's open.

## Bottom Line

You're building software against a real codebase. Read before writing, plan before changing, test before handing back, and document the lessons so the project gets sharper over time.

Stay pragmatic. Stay reliable. Keep the build green.

## Project-Specific Conventions (Career Toolkit)

Established during the September 2026 interface/calculator overhaul — follow these instead of re-deriving them:

- **Commission and comp math lives in `src/lib/comp.ts` only.** Margin, revenue, tiered (marginal/retroactive), flat/SPIFF, accelerator/cap, draw/ramp, tax estimate — all pure functions, no React/store imports (a type-only import from `types.ts` is fine). If a component needs commission math, import from here; don't reimplement it inline. `estimateAnnualCommission(plan)` is the single "what would this plan pay in a normal year" entry point — both the Commission Calculator's bridge button and the Compensation section's inline builder call it.
- **`Role.comp.commissionPlan: CommissionPlan`** (in `types.ts`) replaced the old `commissionParams`. Adding a new field to `CommissionPlan` doesn't need a migration; changing the *shape* of an existing field does — extend `migrateRole()` in `types.ts` and add a case to `src/tests/migration.test.ts`. `migrateRole` runs in the store's `loadState`, `loadFromCloud`, and `importData` — all three, or old saved data breaks silently.
- **Verdict labels/colors come from `src/lib/verdict.ts`** (`VERDICT_CONFIG`, `verdictClasses`). Don't redeclare the label/color maps locally — three places did before this overhaul and drifted.
- **Plain-English comparison sentences come from `src/lib/narrative.ts`** (`buildHeadline`, `buildNarrative`), not hand-built strings against raw `FieldDelta` values. It ranks by each field's normalized (0-10) delta weighted by the user's section weight, so real-unit fields (travel days, hours, commute) and 1-10 rating fields are comparable.
- **Present Mode** (`src/components/ui/present.tsx`) is the shared primitive for "pull this up in front of someone" views: `PresentModeProvider` wraps a calculator, `usePresentMode()`/`HideWhenPresenting`/`Stat` drive the collapsed-inputs, big-numbers layout. Both calculators use it identically — reuse it before building a bespoke toggle.
- **`OteCalculator` and `CommissionCalculator` take an optional `roleId`.** When set, they read/write the matching `Role` via the store so edits survive navigating away and back; when omitted (the standalone nav-tab use), state is local and ephemeral. Don't add role-specific fields without threading them through this same persist path.
- **`MoneyInput`/`PctInput` live in `src/components/ui/money.tsx`.** Don't recreate them per-component — that happened once already and the two copies drifted.
- **Completeness signal**: `src/lib/completeness.ts` counts how many of the 15 subjective 1-10 sliders a role has moved off their default (5). An unrated role scores like a genuinely average one — this is a UI hint only, the scoring model itself is unchanged.
- **Resume paste import** (`src/lib/resume-import.ts`, spec in `ResumePasteImport_Spec.md`): `parseResumeImport` → `matchImportedJobs` → `buildImportPatch`. The patch only touches sections present in the paste. If you change the `<<<RESUME_IMPORT v1>>>` format, bump the version and update the prompt that tells Claude to emit it. `DraftEditor` uses `defaultValue` inputs, so anything that writes the draft from outside must clear the pending debounce and bump `importNonce` to remount them.
- **Resume photo**: `Profile.photoDataUrl` is a ~30 KB circle-cropped JPEG made by `lib/photo.ts` (white corners, so it reads as a circle on the white page). The generator floats it top-right from the name paragraph; `ResumeDraft.includePhoto === false` omits it. To check layout changes, render a real .docx and export it to PDF through Word COM, because the docx XML alone won't show overlap.
