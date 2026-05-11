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
  TabStopPosition,
  BorderStyle,
} from 'docx'
import type { Profile, ResumeJob, ResumeDraft } from './types'
import { sanitizeFilename } from './formatting'

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
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
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

function skillRow(items: string[]): Paragraph {
  const children: (TextRun)[] = []
  items.forEach((item, i) => {
    children.push(new TextRun({ text: item, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.DARK }))
    if (i < items.length - 1) {
      children.push(new TextRun({ text: '   •   ', font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.RULE }))
    }
  })
  return new Paragraph({ spacing: { before: 40, after: 40 }, children })
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

function getLines(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.replace(/^[-•*]\s*/, '').trim())
    .filter(l => l.length > 0)
}

export async function generateResume(
  profile: Profile,
  resumeJobs: ResumeJob[],
  draft: ResumeDraft,
): Promise<Blob> {
  const c: Paragraph[] = []

  // Name + credentials
  const nameParts: TextRun[] = [
    new TextRun({
      text: profile.name.toUpperCase() || 'YOUR NAME',
      font: STYLES.FONT,
      size: STYLES.NAME_SIZE,
      bold: true,
      color: STYLES.BLUE,
    }),
  ]
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
  c.push(sHead('Profile'))
  c.push(new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text: draft.profileParagraph, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.DARK })],
  }))

  // Work History
  c.push(sHead('Work History'))

  const sortedJobs = [...resumeJobs].sort((a, b) => a.order - b.order)
  for (const job of sortedJobs) {
    const content = draft.jobContent[job.id]
    if (!content) continue
    const bullets = getLines(content.bullets)
    if (!content.summary && bullets.length === 0) continue

    c.push(...jobHeader(job.title, job.company, job.location, `${job.startDate} – ${job.endDate}`))
    if (content.summary) c.push(roleSummary(content.summary))
    bullets.forEach(b => c.push(bul(b)))
  }

  // Skills
  const skills = getLines(draft.skills)
  if (skills.length > 0) {
    c.push(sHead('Skills'))
    chunk(skills, 3).forEach(row => c.push(skillRow(row)))
  }

  // Technical Abilities
  const techAbilities = getLines(draft.technicalAbilities)
  if (techAbilities.length > 0) {
    c.push(sHead('Technical Abilities'))
    chunk(techAbilities, 3).forEach(row => c.push(skillRow(row)))
  }

  // Education
  if (profile.education.length > 0) {
    c.push(sHead('Education'))
    for (const edu of profile.education) {
      c.push(new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: edu.degree, font: STYLES.FONT, size: STYLES.BODY_SIZE, bold: true, color: STYLES.DARK }),
          new TextRun({ text: '  —  ' + edu.school + ', ' + edu.location, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.GRAY }),
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
          new TextRun({ text: '  —  ' + cert.issuer + '  |  ' + cert.date, font: STYLES.FONT, size: STYLES.BODY_SIZE, color: STYLES.GRAY }),
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
          size: { width: 12240, height: 15840 },
          margin: { top: 720, bottom: 720, left: 1080, right: 1080 },
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
