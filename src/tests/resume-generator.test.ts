import { describe, it, expect } from 'vitest'
import { generateResume, getResumeFilename, formatDateRange, preflightResume } from '../lib/resume-generator'
import type { Profile, ResumeJob, ResumeDraft } from '../lib/types'

const PROFILE: Profile = {
  name: 'Jacob Fendt',
  credentials: 'MBA',
  email: 'jacob.fendt@gmail.com',
  phone: '262-388-9688',
  city: 'Sun Prairie',
  state: 'WI',
  linkedinUrl: 'linkedin.com/in/jake-fendt',
  education: [
    { id: '1', degree: 'MBA, Business Administration', school: 'UW–Whitewater', location: 'Whitewater, WI' },
  ],
  certifications: [
    { id: '1', name: 'Hygienic Design Training', issuer: 'CFS', date: '10/2025' },
  ],
}

const JOBS: ResumeJob[] = [
  { id: 'j1', title: 'Account Manager', company: 'Intralox', location: 'Remote', startDate: '2024', endDate: 'Present', order: 0 },
  { id: 'j2', title: 'Sales Engineer', company: 'MWES', location: 'Pewaukee, WI', startDate: '2022', endDate: '2024', order: 1 },
]

const DRAFT: ResumeDraft = {
  id: 'd1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  targetCompany: 'Doosan Robotics',
  targetRole: 'Field Sales Engineer',
  profileParagraph: 'A sales professional with 8+ years driving revenue in automation.',
  jobContent: {
    j1: { summary: 'Own $7M+ B2B territory', bullets: 'Grew territory 23% YoY\nLanded 4 net-new accounts' },
    j2: { summary: '', bullets: 'Closed $4M pipeline in 18 months' },
  },
  skills: 'Consultative Sales\nAccount Management',
  technicalAbilities: 'Industrial Automation\nCAD / SolidWorks',
}

describe('generateResume', () => {
  it('returns a Blob', async () => {
    const blob = await generateResume(PROFILE, JOBS, DRAFT)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(1000)
  })

  it('does not throw when profile is minimal', async () => {
    const emptyProfile: Profile = {
      name: '', email: '', phone: '', city: '', state: '', education: [], certifications: [],
    }
    await expect(generateResume(emptyProfile, JOBS, DRAFT)).resolves.toBeInstanceOf(Blob)
  })

  it('skips jobs with no content cleanly', async () => {
    const emptyDraft: ResumeDraft = { ...DRAFT, jobContent: {} }
    const blob = await generateResume(PROFILE, JOBS, emptyDraft)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(100)
  })

  it('handles jobs not in draft (draft added before new job)', async () => {
    const newJob: ResumeJob = { id: 'j99', title: 'New Role', company: 'New Co', location: 'Remote', startDate: '2026', endDate: 'Present', order: 0 }
    const jobsWithExtra = [newJob, ...JOBS]
    const blob = await generateResume(PROFILE, jobsWithExtra, DRAFT)
    expect(blob).toBeInstanceOf(Blob)
  })
})

describe('getResumeFilename', () => {
  it('builds correct filename from profile and draft', () => {
    const filename = getResumeFilename(PROFILE, DRAFT)
    expect(filename).toBe('Jacob_Fendt_Doosan_Robotics_Field_Sales_Engineer.docx')
  })

  it('replaces special chars with underscores', () => {
    const draft = { ...DRAFT, targetCompany: 'Acme & Co.', targetRole: 'Sales (AE)' }
    const filename = getResumeFilename(PROFILE, draft)
    // sanitizeFilename collapses consecutive underscores
    expect(filename).toContain('Acme_Co')
    expect(filename).toContain('Sales_AE')
    expect(filename).toContain('.docx')
  })

  it('handles empty profile name gracefully', () => {
    const emptyProfile = { ...PROFILE, name: '' }
    const filename = getResumeFilename(emptyProfile, DRAFT)
    expect(filename).toContain('.docx')
  })
})

describe('formatDateRange', () => {
  it('joins both ends, or shows whichever exists', () => {
    expect(formatDateRange('2019', '2022')).toBe('2019 – 2022')
    expect(formatDateRange('2022', '')).toBe('2022')
    expect(formatDateRange('', 'Present')).toBe('Present')
    expect(formatDateRange('', '')).toBe('')
  })
})

describe('preflightResume', () => {
  it('passes a complete draft cleanly', () => {
    expect(preflightResume(PROFILE, JOBS, DRAFT)).toEqual({ errors: [], warnings: [] })
  })

  it('blocks an empty draft', () => {
    const empty: ResumeDraft = { ...DRAFT, profileParagraph: '', jobContent: {}, skills: '', technicalAbilities: '' }
    expect(preflightResume(PROFILE, JOBS, empty).errors).toHaveLength(1)
  })

  it('warns about a missing name and content for jobs no longer in work history', () => {
    const draft: ResumeDraft = { ...DRAFT, jobContent: { ...DRAFT.jobContent, gone: { summary: '', bullets: 'Old bullet' } } }
    const { errors, warnings } = preflightResume({ ...PROFILE, name: '' }, JOBS, draft)
    expect(errors).toEqual([])
    expect(warnings.some(w => w.includes('YOUR NAME'))).toBe(true)
    expect(warnings.some(w => w.includes('no longer in your work history'))).toBe(true)
  })
})

describe('generateResume — resilience', () => {
  it('still produces a resume when the photo data is corrupt', async () => {
    const blob = await generateResume({ ...PROFILE, photoDataUrl: 'data:image/jpeg;base64,@@@not-base64@@@' }, JOBS, DRAFT)
    expect(blob.size).toBeGreaterThan(1000)
  })

  it('handles a draft with only skills', async () => {
    const draft: ResumeDraft = { ...DRAFT, profileParagraph: '', jobContent: {}, technicalAbilities: '' }
    await expect(generateResume(PROFILE, JOBS, draft)).resolves.toBeInstanceOf(Blob)
  })
})
