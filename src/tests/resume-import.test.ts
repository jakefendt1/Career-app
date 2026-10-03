import { describe, it, expect } from 'vitest'
import { parseResumeImport, matchImportedJobs, buildImportPatch } from '../lib/resume-import'
import type { ResumeJob, ResumeDraft } from '../lib/types'

const SAMPLE = `<<<RESUME_IMPORT v1>>>
TARGET_COMPANY: ifm
TARGET_ROLE: Food & Beverage Industry Business Development

[PROFILE]
Mechanical engineer who moved into sales and kept the engineering.
Second sentence. Third sentence.

[JOB: Intralox]
SUMMARY: Carried a direct quota selling engineered conveyance into bakery and snack plants.
- First bullet
- Second bullet

[JOB: MWES]
SUMMARY: Carried a direct quota selling capital equipment automation.
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
<<<END>>>`

function job(id: string, company: string, title: string, order: number): ResumeJob {
  return { id, company, title, order, location: 'X', startDate: '2020', endDate: '2021' }
}

const JOBS: ResumeJob[] = [
  job('j1', 'Intralox, LLC', 'Conveyance Specialist', 0),
  job('j2', 'MWES', 'Sales Engineer', 1),
  job('j3', 'Turn-Key Solutions Inc.', 'Project Engineer', 2),
  job('j4', 'Signicast', 'Manufacturing Engineer', 3),
]

describe('parseResumeImport', () => {
  it('parses the full sample', () => {
    const p = parseResumeImport(SAMPLE)
    expect(p.targetCompany).toBe('ifm')
    expect(p.targetRole).toBe('Food & Beverage Industry Business Development')
    expect(p.profileParagraph).toBe('Mechanical engineer who moved into sales and kept the engineering. Second sentence. Third sentence.')
    expect(p.jobs).toHaveLength(3)
    expect(p.jobs[0]).toEqual({
      company: 'Intralox',
      title: undefined,
      summary: 'Carried a direct quota selling engineered conveyance into bakery and snack plants.',
      bullets: 'First bullet\nSecond bullet',
    })
    expect(p.jobs[2]!.summary).toBeUndefined()
    expect(p.jobs[2]!.bullets).toBe('Bullet with no summary line')
    expect(p.skills).toBe('Consultative Sales\nAccount Planning')
    expect(p.technicalAbilities).toBe('Hygienic Conveyor Design\nAutodesk Inventor')
    expect(p.warnings).toEqual([])
  })

  it('ignores chat prose around the block and strips code fences', () => {
    const p = parseResumeImport(`Here's your import block:\n\n\`\`\`\n${SAMPLE}\n\`\`\`\n\nLet me know if you want changes.`)
    expect(p.targetCompany).toBe('ifm')
    expect(p.jobs).toHaveLength(3)
    expect(p.technicalAbilities).toBe('Hygienic Conveyor Design\nAutodesk Inventor')
  })

  it('parses without the start marker', () => {
    const p = parseResumeImport(SAMPLE.replace('<<<RESUME_IMPORT v1>>>\n', ''))
    expect(p.targetCompany).toBe('ifm')
    expect(p.jobs).toHaveLength(3)
  })

  it('normalizes CRLF line endings', () => {
    const p = parseResumeImport(SAMPLE.replace(/\n/g, '\r\n'))
    expect(p.skills).toBe('Consultative Sales\nAccount Planning')
    expect(p.jobs[0]!.bullets).toBe('First bullet\nSecond bullet')
  })

  it('strips glyph, numbered, and bold markers from bullets and lists', () => {
    const p = parseResumeImport(`[JOB: Intralox]
• Dot bullet
1. Numbered bullet
2) Paren bullet
* **Bold** bullet
– En dash bullet
- 3.5x growth in key accounts
[SKILLS]
- **Negotiation**
• Forecasting`)
    expect(p.jobs[0]!.bullets).toBe('Dot bullet\nNumbered bullet\nParen bullet\nBold bullet\nEn dash bullet\n3.5x growth in key accounts')
    expect(p.skills).toBe('Negotiation\nForecasting')
  })

  it('reads a title disambiguator', () => {
    const p = parseResumeImport('[JOB: Intralox | Conveyance Specialist]\n- x')
    expect(p.jobs[0]!.company).toBe('Intralox')
    expect(p.jobs[0]!.title).toBe('Conveyance Specialist')
  })

  it('accepts header and key variants case-insensitively', () => {
    const p = parseResumeImport('target company: Acme\n[ profile ]\nHi.\n[Tech Abilities]\nCAD')
    expect(p.targetCompany).toBe('Acme')
    expect(p.profileParagraph).toBe('Hi.')
    expect(p.technicalAbilities).toBe('CAD')
  })

  it('leaves missing sections undefined', () => {
    const p = parseResumeImport('[PROFILE]\nOnly a profile.')
    expect(p.profileParagraph).toBe('Only a profile.')
    expect(p.targetCompany).toBeUndefined()
    expect(p.targetRole).toBeUndefined()
    expect(p.skills).toBeUndefined()
    expect(p.technicalAbilities).toBeUndefined()
    expect(p.jobs).toEqual([])
  })

  it('warns on unknown sections instead of throwing', () => {
    const p = parseResumeImport('[PROFILE]\nHi.\n[AWARDS]\nBest rep')
    expect(p.profileParagraph).toBe('Hi.')
    expect(p.warnings).toEqual(['Ignored unknown section [AWARDS]'])
  })
})

describe('matchImportedJobs', () => {
  it('matches companies across case, punctuation, and Inc./LLC suffixes', () => {
    const { matched, unmatched } = matchImportedJobs(parseResumeImport(SAMPLE), JOBS)
    expect(unmatched).toEqual([])
    expect(matched.map(m => m.jobId)).toEqual(['j1', 'j2', 'j3'])
    expect(matched[0]!.bullets).toBe('First bullet\nSecond bullet')
  })

  it('reports unmatched companies instead of dropping them', () => {
    const { matched, unmatched } = matchImportedJobs(parseResumeImport('[JOB: Rockwell]\n- x'), JOBS)
    expect(matched).toEqual([])
    expect(unmatched[0]!.company).toBe('Rockwell')
  })

  it('uses the title disambiguator when the same company appears twice', () => {
    const jobs = [...JOBS, job('j5', 'Intralox', 'Regional Sales Manager', 5)]
    const { matched } = matchImportedJobs(parseResumeImport('[JOB: Intralox | Regional Sales Manager]\n- x'), jobs)
    expect(matched[0]!.jobId).toBe('j5')
  })

  it('takes the most recent job and warns when several match without a title', () => {
    const jobs = [...JOBS, job('j5', 'Intralox', 'Regional Sales Manager', 5)]
    const { matched, warnings } = matchImportedJobs(parseResumeImport('[JOB: Intralox]\n- x'), jobs)
    expect(matched[0]!.jobId).toBe('j1')
    expect(warnings).toHaveLength(1)
  })
})

describe('buildImportPatch', () => {
  function draft(over: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
      id: 'd', createdAt: '', updatedAt: '', targetCompany: '', targetRole: '', profileParagraph: '',
      jobContent: {}, skills: '', technicalAbilities: '', ...over,
    }
  }

  it('fills an empty draft without flagging an overwrite', () => {
    const parsed = parseResumeImport(SAMPLE)
    const { matched } = matchImportedJobs(parsed, JOBS)
    const { patch, overwritesExisting, summary } = buildImportPatch(draft(), parsed, matched)
    expect(overwritesExisting).toBe(false)
    expect(patch.targetCompany).toBe('ifm')
    expect(patch.jobContent!['j1']!.bullets).toBe('First bullet\nSecond bullet')
    expect(patch.jobContent!['j3']!.summary).toBe('')
    expect(summary).toBe('Imported profile, 3 jobs, 2 skills, 2 technical abilities')
  })

  it('leaves absent sections and untouched jobs alone', () => {
    const existing = draft({ skills: 'Keep me', jobContent: { j4: { summary: 'S', bullets: 'Keep' } } })
    const parsed = parseResumeImport('[JOB: Intralox]\n- New')
    const { matched } = matchImportedJobs(parsed, JOBS)
    const { patch } = buildImportPatch(existing, parsed, matched)
    expect(patch.skills).toBeUndefined()
    expect(patch.jobContent!['j4']).toEqual({ summary: 'S', bullets: 'Keep' })
    expect(patch.jobContent!['j1']!.bullets).toBe('New')
  })

  it('flags overwriting existing content', () => {
    const parsed = parseResumeImport('[PROFILE]\nNew profile.')
    const { overwritesExisting } = buildImportPatch(draft({ profileParagraph: 'Old profile.' }), parsed, [])
    expect(overwritesExisting).toBe(true)
  })
})
