import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Footer,
  AlignmentType,
  LevelFormat,
  ExternalHyperlink,
  TabStopType,
  BorderStyle,
  ImageRun,
  HorizontalPositionRelativeFrom,
  HorizontalPositionAlign,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  TextWrappingSide,
} from 'docx'
import type { Profile, ResumeJob, ResumeDraft } from './types'
import { sanitizeFilename } from './formatting'
import { dataUrlToBytes } from './photo'
import { splitBullets, splitListItems, packIntoRows } from './resume-text'

// Letter page, 0.75" side margins → 7.0" (504pt / 10080 twips) of text width.
const PAGE = { WIDTH: 12240, HEIGHT: 15840, MARGIN_X: 1080, MARGIN_Y: 720 }
const TEXT_WIDTH_TWIPS = PAGE.WIDTH - 2 * PAGE.MARGIN_X
const TEXT_WIDTH_PT = TEXT_WIDTH_TWIPS / 20

const STYLES = {
  BLUE: '2B6CB0',
  DARK: '1A202C',
  GRAY: '4A5568',
  RULE: 'A0C4E0',
  BODY_SIZE: 22,   // half-points = 11pt
  NAME_SIZE: 48,   // 24pt
  HEAD_SIZE: 23,   // 11.5pt
  FONT: 'Calibri',
}

function sHead(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: STYLES.BLUE, space: 3 },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: STYLES.FONT,
        size: STYLES.HEAD_SIZE,
        bold: true,
        color: STYLES.BLUE,
        characterSpacing: 60,
      }),
    ],
  })
}

const NUM_CONFIG = [{
  reference: 'bullets',
  levels: [{
    level: 0,
    format: LevelFormat.BULLET,
    text: '•',
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 360, hanging: 200 } } },
  }],
}]

function bul(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.DARK })],
  })
}

function jobHeader(title: string, company: string, location: string, dates: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 200, after: 0 },
      tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH_TWIPS }],
      children: [
        new TextRun({ text: title, font: STYLES.FONT, size: STYLES.HEAD_SIZE, bold: true, color: STYLES.DARK }),
        new TextRun({ text: '\t' + dates, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.GRAY }),
      ],
    }),
    new Paragraph({
      spacing: { before: 20, after: 40 },
      children: [
        new TextRun({ text: company, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.BLUE, bold: true }),
        new TextRun({ text: '  |  ' + location, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.GRAY }),
      ],
    }),
  ]
}

function roleSummary(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 20, after: 60 },
    children: [new TextRun({ text, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.GRAY, italics: true })],
  })
}

const SKILL_SEPARATOR = '   •   '

/** Skills/technical abilities: as many whole items per line as actually fit,
 *  measured in Calibri, so nothing wraps mid-row and short items share a line.
 *  6% headroom absorbs small metric differences between our table and Word. */
function skillRows(text: string): Paragraph[] {
  const items = splitListItems(text)
  const fontPt = STYLES.BODY_SIZE / 2
  return packIntoRows(items, TEXT_WIDTH_PT * 0.94, fontPt, SKILL_SEPARATOR).map(skillRow)
}

function skillRow(items: string[]): Paragraph {
  const children: (TextRun)[] = []
  items.forEach((item, i) => {
    children.push(new TextRun({ text: item, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.DARK }))
    if (i < items.length - 1) {
      children.push(new TextRun({ text: SKILL_SEPARATOR, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.RULE }))
    }
  })
  return new Paragraph({ spacing: { before: 40, after: 40 }, children })
}

// Headshot, top-right. Floats beside the name/contact block: sits slightly up
// into the top margin and ends before the horizontal rule, so text wraps to
// its left and the rule stays full width.
const EMU_PER_INCH = 914400
const PHOTO_PX = 86            // ~0.9" at 96 dpi
const PHOTO_TOP_IN = 0.35      // from the top edge of the page

function headshot(dataUrl: string): ImageRun {
  return new ImageRun({
    data: dataUrlToBytes(dataUrl),
    transformation: { width: PHOTO_PX, height: PHOTO_PX },
    altText: { name: 'Headshot', description: 'Profile photo', title: 'Headshot' },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, align: HorizontalPositionAlign.RIGHT },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: Math.round(PHOTO_TOP_IN * EMU_PER_INCH) },
      wrap: { type: TextWrappingType.SQUARE, side: TextWrappingSide.LEFT },
      margins: { left: Math.round(0.15 * EMU_PER_INCH) },
      allowOverlap: false,
    },
  })
}

/** "2019 – 2022", "2022 – Present", or just whichever side exists. */
export function formatDateRange(start: string, end: string): string {
  const a = (start ?? '').trim()
  const b = (end ?? '').trim()
  return a && b ? `${a} – ${b}` : a || b
}

/** "  —  School, City  |  Date" with blank parts dropped. */
function joinDetail(parts: string[]): string {
  const kept = parts.map(p => (p ?? '').trim()).filter(Boolean)
  return kept.length ? '  —  ' + kept.join('  |  ') : ''
}

export async function generateResume(
  profile: Profile,
  resumeJobs: ResumeJob[],
  draft: ResumeDraft,
): Promise<Blob> {
  const c: Paragraph[] = []

  // Name + credentials
  const nameParts: (TextRun | ImageRun)[] = []
  if (profile.photoDataUrl && draft.includePhoto !== false) {
    // A damaged photo shouldn't sink the whole resume — skip it instead.
    try { nameParts.push(headshot(profile.photoDataUrl)) } catch (err) { console.warn('Skipping resume photo:', err) }
  }
  nameParts.push(
    new TextRun({
      text: profile.name.toUpperCase() || 'YOUR NAME',
      font: STYLES.FONT,
      size: STYLES.NAME_SIZE,
      bold: true,
      color: STYLES.BLUE,
    }),
  )
  if (profile.credentials) {
    nameParts.push(new TextRun({
      text: ', ' + profile.credentials,
      font: STYLES.FONT,
      size: STYLES.NAME_SIZE,
      bold: false,
      color: STYLES.GRAY,
    }))
  }
  c.push(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 0 }, children: nameParts }))

  // Contact line
  const contactParts: TextRun[] = []
  const contactItems = [
    [profile.city, profile.state].filter(Boolean).join(', ') + (profile.postalCode ? ' ' + profile.postalCode : ''),
    profile.phone,
    profile.email,
  ].filter(Boolean)
  contactItems.forEach((item, i) => {
    if (i > 0) contactParts.push(new TextRun({ text: '   |   ', font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.RULE }))
    contactParts.push(new TextRun({ text: item, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.GRAY }))
  })
  if (contactParts.length > 0) {
    c.push(new Paragraph({ spacing: { before: 60, after: 0 }, children: contactParts }))
  }

  // LinkedIn
  if (profile.linkedinUrl) {
    c.push(new Paragraph({
      spacing: { before: 20, after: 0 },
      children: [new ExternalHyperlink({
        children: [new TextRun({ text: profile.linkedinUrl, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.BLUE, style: 'Hyperlink' })],
        link: profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : 'https://' + profile.linkedinUrl,
      })],
    }))
  }

  // Horizontal rule
  c.push(new Paragraph({
    spacing: { before: 80, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: STYLES.RULE, space: 1 } },
    children: [],
  }))

  // Profile section
  const profileText = draft.profileParagraph.replace(/\s+/g, ' ').trim()
  if (profileText) {
    c.push(sHead('Profile'))
    c.push(new Paragraph({
      spacing: { before: 60, after: 100 },
      children: [new TextRun({ text: profileText, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.DARK })],
    }))
  }

  // Work History
  const workHistory: Paragraph[] = []
  const sortedJobs = [...resumeJobs].sort((a, b) => a.order - b.order)
  for (const job of sortedJobs) {
    const content = draft.jobContent[job.id]
    if (!content) continue
    const summary = (content.summary ?? '').replace(/\s+/g, ' ').trim()
    const bullets = splitBullets(content.bullets ?? '')
    if (!summary && bullets.length === 0) continue

    workHistory.push(...jobHeader(job.title, job.company, job.location, formatDateRange(job.startDate, job.endDate)))
    if (summary) workHistory.push(roleSummary(summary))
    bullets.forEach(b => workHistory.push(bul(b)))
  }
  if (workHistory.length > 0) {
    c.push(sHead('Work History'))
    c.push(...workHistory)
  }

  // Skills
  const skills = skillRows(draft.skills ?? '')
  if (skills.length > 0) {
    c.push(sHead('Skills'))
    c.push(...skills)
  }

  // Technical Abilities
  const techAbilities = skillRows(draft.technicalAbilities ?? '')
  if (techAbilities.length > 0) {
    c.push(sHead('Technical Abilities'))
    c.push(...techAbilities)
  }

  // Education
  if (profile.education.length > 0) {
    c.push(sHead('Education'))
    for (const edu of profile.education) {
      c.push(new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: edu.degree, font: STYLES.FONT, size: STYLES.BODY_SIZE, bold: true, color: STYLES.DARK }),
          new TextRun({ text: joinDetail([[edu.school, edu.location].filter(Boolean).join(', ')]), font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.GRAY }),
        ],
      }))
    }
  }

  // Certifications
  if (profile.certifications.length > 0) {
    c.push(sHead('Certifications'))
    for (const cert of profile.certifications) {
      c.push(new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: cert.name, font: STYLES.FONT, size: STYLES.BODY_SIZE, bold: true, color: STYLES.DARK }),
          new TextRun({ text: joinDetail([cert.issuer, cert.date]), font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.GRAY }),
        ],
      }))
    }
  }

  // Footer text
  const footerParts = [profile.name, profile.credentials].filter(Boolean).join(', ')
  const footerText = [footerParts, profile.phone, profile.email].filter(Boolean).join('  |  ')

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.DARK } },
      },
    },
    numbering: { config: NUM_CONFIG },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE.WIDTH, height: PAGE.HEIGHT },
          margin: { top: PAGE.MARGIN_Y, bottom: PAGE.MARGIN_Y, left: PAGE.MARGIN_X, right: PAGE.MARGIN_X },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: footerText, font: STYLES.FONT, size: 18, color: STYLES.GRAY })],
          })],
        }),
      },
      children: c,
    }],
  })

  return Packer.toBlob(doc)
}

export function getResumeFilename(profile: Profile, draft: ResumeDraft): string {
  const nameParts = profile.name.split(' ')
  const first = sanitizeFilename(nameParts[0] ?? 'Resume')
  const last = sanitizeFilename(nameParts.slice(1).join(' ') || '')
  const company = sanitizeFilename(draft.targetCompany || 'Tailored')
  const role = sanitizeFilename(draft.targetRole || 'Resume')
  return [first, last, company, role].filter(Boolean).join('_') + '.docx'
}

// ── Pre-download checks ──────────────────────────────────────────────────────
// Errors block the download (nothing useful would come out); warnings are
// shown so the user can fix them or download anyway.

export type ResumePreflight = { errors: string[]; warnings: string[] }

export function preflightResume(profile: Profile, resumeJobs: ResumeJob[], draft: ResumeDraft): ResumePreflight {
  const errors: string[] = []
  const warnings: string[] = []

  const jobIds = new Set(resumeJobs.map(j => j.id))
  const filledJobs = resumeJobs.filter(j => {
    const c = draft.jobContent[j.id]
    return c && ((c.summary ?? '').trim() || splitBullets(c.bullets ?? '').length > 0)
  })
  const orphaned = Object.entries(draft.jobContent).filter(([id, c]) =>
    !jobIds.has(id) && ((c.summary ?? '').trim() || (c.bullets ?? '').trim()))

  const hasProfile = draft.profileParagraph.trim().length > 0
  const skills = splitListItems(draft.skills ?? '')
  const tech = splitListItems(draft.technicalAbilities ?? '')

  if (!hasProfile && filledJobs.length === 0 && skills.length === 0 && tech.length === 0) {
    errors.push('This draft is empty — add content or use Paste Import first.')
  }
  if (!profile.name.trim()) warnings.push('Your name is blank (Settings → Profile), so the resume will say "YOUR NAME".')
  if (!profile.email.trim() && !profile.phone.trim()) warnings.push('No email or phone in your profile — the contact line will be empty.')
  if (resumeJobs.length === 0) warnings.push('Your work history is empty, so no jobs can appear on the resume.')
  else if (filledJobs.length === 0) warnings.push('No job has a summary or bullets yet — Work History will be left off.')
  if (orphaned.length > 0) {
    warnings.push(`${orphaned.length} job${orphaned.length === 1 ? ' has' : 's have'} content but ${orphaned.length === 1 ? 'is' : 'are'} no longer in your work history, so ${orphaned.length === 1 ? 'it' : 'they'} won't print.`)
  }
  if (!hasProfile) warnings.push('Profile paragraph is empty — the Profile section will be left off.')

  for (const job of filledJobs) {
    for (const b of splitBullets(draft.jobContent[job.id]!.bullets ?? '')) {
      if (b.length > 320) {
        warnings.push(`A ${job.company} bullet is very long (${b.length} characters) — it may be two bullets pasted together.`)
        break
      }
    }
  }

  const rawSkillLines = (draft.skills ?? '').split('\n').filter(l => l.trim()).length
  if (rawSkillLines > skills.length && skills.length > 0) warnings.push('Duplicate skills were found and will only print once.')

  return { errors, warnings }
}
