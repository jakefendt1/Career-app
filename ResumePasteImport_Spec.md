# Resume Paste Import — Spec

## Goal
Today, filling a tailored resume draft means pasting into every box by hand: profile, each job's role summary and bullets, skills, technical abilities. Add a **Paste Import** that takes one block of text (produced by Claude in a fixed format) and fills the whole draft in one shot.

No new dependencies. Follow CLAUDE.md. Deliver in two checkpoints (parser + tests first, then UI) and stop for review between them.

## Relevant existing code (read first)
- `src/lib/types.ts` — `ResumeDraft` (`targetCompany`, `targetRole`, `profileParagraph`, `jobContent: Record<jobId, { summary, bullets }>`, `skills`, `technicalAbilities`) and `ResumeJob` (`id`, `title`, `company`, ...). `bullets`, `skills`, `technicalAbilities` are newline-separated strings.
- `src/components/resume/DraftEditor.tsx` — the editor; bottom bar has Load Base / Download.
- `src/components/resume/DraftsList.tsx` — creates new drafts (`handleNewDraft`).
- `src/components/resume/ResumeJobSection.tsx` — per-job summary/bullets fields.
- `src/store/useAppStore.ts` — `updateResumeDraft`, `addResumeDraft`.
- `src/components/ui/dialog.tsx`, `textarea.tsx`, `button.tsx`, `select.tsx`, `toast.tsx` — reuse these.

## The paste format (v1)
This is exactly what Claude will output. The parser must accept it.

```
<<<RESUME_IMPORT v1>>>
TARGET_COMPANY: ifm
TARGET_ROLE: Food & Beverage Industry Business Development

[PROFILE]
Mechanical engineer who moved into sales and kept the engineering. Second sentence. Third sentence.

[JOB: Intralox]
SUMMARY: Carried a direct quota selling engineered conveyance into bakery and snack plants across a six-state territory.
- First bullet
- Second bullet

[JOB: MWES]
SUMMARY: Carried a direct quota selling capital equipment automation...
- First bullet
- Second bullet

[JOB: Turn-Key Solutions]
- Bullet with no summary line

[SKILLS]
Consultative Sales
Account Planning

[TECHNICAL ABILITIES]
Hygienic Conveyor Design
Autodesk Inventor
<<<END>>>
```

### Parsing rules (be forgiving — this gets copied out of a chat window)
1. Ignore everything before `<<<RESUME_IMPORT` and after `<<<END>>>`. If the start marker is missing, parse the whole input anyway. Strip Markdown code fences (```` ``` ````) if present.
2. Section headers are case-insensitive, whitespace-tolerant: `[PROFILE]`, `[SKILLS]`, `[TECHNICAL ABILITIES]` (also accept `[TECHNICAL]`, `[TECH ABILITIES]`), `[JOB: <company>]`.
3. Optional title disambiguator for the same company held twice: `[JOB: Intralox | Conveyance Specialist]`.
4. `TARGET_COMPANY:` / `TARGET_ROLE:` are single-line key/values at the top (also accept `TARGET COMPANY:`).
5. Inside a JOB block: a line starting with `SUMMARY:` is the role summary (optional). Every other non-empty line is a bullet. Strip leading bullet glyphs: `-`, `*`, `•`, `–`, `—`, `1.`, `1)`. Store bullets newline-joined, no glyphs.
6. `[PROFILE]`: join all lines with single spaces into one paragraph.
7. `[SKILLS]` / `[TECHNICAL ABILITIES]`: one item per line, strip bullet glyphs, drop blank lines, newline-joined.
8. Strip Markdown bold/italic markers (`**`, `__`) everywhere. Trim trailing whitespace. Normalize `\r\n`.
9. Unknown sections: collect as warnings, don't throw.

### Job matching
Match each `[JOB: ...]` block to an existing `ResumeJob`:
- Normalize both sides: lowercase, strip punctuation, collapse whitespace, drop suffixes like `inc`, `llc`, `corp`, `co`.
- Match if normalized company equals or either contains the other.
- If a title disambiguator is given, require the title to match the same way.
- If more than one job matches and no title is given, take the one with the lowest `order` (most recent) and add a warning.
- Unmatched blocks are not dropped silently — they show in the preview (see UI).

## Implementation

### Checkpoint 1 — parser (pure, tested)
New file `src/lib/resume-import.ts`:
```ts
export type ParsedResumeImport = {
  targetCompany?: string
  targetRole?: string
  profileParagraph?: string
  jobs: { company: string; title?: string; summary?: string; bullets: string }[]
  skills?: string
  technicalAbilities?: string
  warnings: string[]
}
export function parseResumeImport(text: string): ParsedResumeImport
export function matchImportedJobs(parsed: ParsedResumeImport, jobs: ResumeJob[]):
  { matched: { jobId: string; summary?: string; bullets: string }[]; unmatched: ParsedResumeImport['jobs']; warnings: string[] }
```
Field is `undefined` when its section is absent (so absent ≠ "clear it").

New test file `src/tests/resume-import.test.ts` (vitest, match existing test style). Cover: the full sample above; text surrounded by chat prose; code fences; missing start marker; `•`/numbered/`**bold**` bullets; `\r\n`; job with no SUMMARY; title disambiguator; company match with "Inc." suffix and case differences; unmatched company; missing sections stay `undefined`.

Run typecheck + tests. Stop for review.

### Checkpoint 2 — UI
New component `src/components/resume/PasteImportDialog.tsx`:
1. Large textarea: "Paste the block from Claude".
2. **Preview** (live as you paste): target company/role, profile (first ~80 chars), each job block → which work-history job it matched to + bullet count, skills count, technical abilities count, warnings.
3. Unmatched job blocks get a `select` to assign to an existing job or "Skip".
4. **Apply** button, disabled when nothing parsed.

Apply behavior (merge, not wipe):
- Only overwrite fields that are present in the paste. Absent sections leave the draft as is.
- For `jobContent`, only overwrite the jobs that came in; other jobs keep their content.
- If any field being overwritten already has content, show one confirm before applying (same pattern as `handleLoadBase`).
- Toast a summary: "Imported profile, 3 jobs, 14 skills, 9 technical abilities".

Entry points:
- `DraftEditor.tsx`: add a **Paste Import** button to the fixed bottom bar, next to Load Base.
- `DraftsList.tsx`: add **New from Paste** next to the new-draft button. It creates the draft the same way `handleNewDraft` does, applies the import, then opens it in the editor. Target company/role come from the paste.

### Gotchas — must handle
- **Uncontrolled inputs won't refresh.** `DraftEditor` uses `defaultValue` for Target Company, Target Role, Profile, Skills, Technical Abilities. After an import the store changes but those fields keep showing old text. Fix by remounting the form after import (e.g. an `importNonce` in local state used as a `key` on the form container). Don't convert the whole editor to controlled inputs; that's out of scope.
- **Pending debounce can clobber the import.** If a debounced patch is in flight when Apply is clicked, it fires 500 ms later and overwrites imported fields with stale values. Clear `debounceRef` before applying (same as `handleDownload` does).
- Apply the import as a single `updateResumeDraft` call so cloud sync gets one write.

### Possible existing bug — check, don't fix without asking
`ResumeJobSection` uses controlled `value={...}` but the parent only writes to the store after a 500 ms debounce. Typing more than one character quickly may revert. Confirm whether this happens; if so, report it and propose a fix as a separate change.

## Done when
- Pasting the sample above into a new draft fills every box correctly and Download .docx produces the right resume.
- Typecheck, lint and all tests pass.
- No new dependencies.
