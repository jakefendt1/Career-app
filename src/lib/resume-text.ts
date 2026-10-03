// Shared text cleanup for the resume builder — used by both the paste
// parser and the .docx generator, so a skill list or bullet block is
// interpreted the same way whether it was pasted, typed, or imported.

/** Leading list markers. Dashes/stars/numbers need trailing whitespace so
 *  "3.5x growth" or "-5% cost" keep their first character; • and · don't. */
const LIST_GLYPH = /^\s*(?:[-*–—]\s+|[•·▪◦‣]\s*|\d+[.)]\s+)/

/** Strip Markdown emphasis, zero-width chars, and normalize odd spaces. */
export function cleanInline(s: string): string {
  return s
    .replace(/[​-‍﻿]/g, '')
    .replace(/[   \t]/g, ' ')
    .replace(/\*\*|__/g, '')
    .replace(/ {2,}/g, ' ')
    .trim()
}

export function stripListGlyph(s: string): string {
  return s.replace(LIST_GLYPH, '').trim()
}

/** Split text into lines with CRLF normalized. */
export function toLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n')
}

/** Bullets: one per non-empty line, glyphs and Markdown stripped. */
export function splitBullets(text: string): string[] {
  return toLines(text)
    .map(l => stripListGlyph(cleanInline(l)))
    .filter(l => l.length > 0)
}

/** Split on a separator character, but never inside parentheses —
 *  "AutoCAD (2D, 3D)" stays one item. */
function splitOutsideParens(line: string, separators: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of line) {
    if (ch === '(' || ch === '[') depth++
    else if ((ch === ')' || ch === ']') && depth > 0) depth--
    if (depth === 0 && separators.includes(ch)) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts
}

/**
 * Skills / technical abilities: one item per line is the normal format, but
 * this also auto-detects lists pasted on one line separated by •, ·, |, ;
 * or commas (commas only when the line clearly is a list — 2+ commas, or
 * the whole input is a single line). Strips glyphs, trailing periods, a
 * leading "and", and drops case-insensitive duplicates.
 */
export function splitListItems(text: string): string[] {
  const lines = toLines(text).map(cleanInline).filter(Boolean)
  const singleLine = lines.length === 1
  const items: string[] = []

  for (const raw of lines) {
    const line = stripListGlyph(raw)
    let parts = splitOutsideParens(line, '•·|;▪')
    parts = parts.flatMap(p => {
      const commas = splitOutsideParens(p, ',')
      return commas.length >= 3 || (singleLine && commas.length >= 2) ? commas : [p]
    })
    for (const p of parts) {
      const item = stripListGlyph(p)
        .replace(/^(?:and|&)\s+/i, '')
        .replace(/[.:]+$/, '')
        .trim()
      if (item) items.push(item)
    }
  }

  const seen = new Set<string>()
  return items.filter(i => {
    const key = i.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Text width estimation (Calibri) ──────────────────────────────────────────
// Advance widths in 1/1000 em, close to Calibri's real metrics. Used to pack
// skills onto lines without Word wrapping an item mid-row.

const CALIBRI: Record<string, number> = {
  ' ': 226, '!': 326, '"': 401, '#': 498, '$': 507, '%': 715, '&': 682, "'": 221,
  '(': 303, ')': 303, '*': 498, '+': 498, ',': 250, '-': 306, '.': 252, '/': 386,
  '0': 507, '1': 507, '2': 507, '3': 507, '4': 507, '5': 507, '6': 507, '7': 507, '8': 507, '9': 507,
  ':': 268, ';': 268, '<': 498, '=': 498, '>': 498, '?': 463, '@': 894,
  A: 579, B: 544, C: 533, D: 615, E: 488, F: 459, G: 631, H: 623, I: 252, J: 319, K: 520, L: 420, M: 855,
  N: 646, O: 662, P: 517, Q: 673, R: 543, S: 459, T: 487, U: 642, V: 567, W: 890, X: 519, Y: 487, Z: 468,
  a: 479, b: 525, c: 423, d: 525, e: 498, f: 305, g: 471, h: 525, i: 229, j: 239, k: 455, l: 229, m: 799,
  n: 525, o: 527, p: 525, q: 525, r: 349, s: 391, t: 335, u: 525, v: 452, w: 715, x: 433, y: 453, z: 395,
  '•': 354, '–': 498, '—': 905,
}
const CALIBRI_FALLBACK = 560 // unknown glyphs (accented letters, symbols) — err wide

export function estimateTextWidthPt(text: string, fontSizePt: number): number {
  let units = 0
  for (const ch of text) units += CALIBRI[ch] ?? CALIBRI_FALLBACK
  return (units / 1000) * fontSizePt
}

/**
 * Greedy line packing: as many whole items per row as fit in maxWidthPt,
 * given the width of the separator drawn between items. An item wider than
 * a full line gets a row to itself (Word wraps it).
 */
export function packIntoRows(
  items: string[],
  maxWidthPt: number,
  fontSizePt: number,
  separator: string,
): string[][] {
  const sepWidth = estimateTextWidthPt(separator, fontSizePt)
  const rows: string[][] = []
  let row: string[] = []
  let rowWidth = 0

  for (const item of items) {
    const w = estimateTextWidthPt(item, fontSizePt)
    const needed = row.length === 0 ? w : rowWidth + sepWidth + w
    if (row.length > 0 && needed > maxWidthPt) {
      rows.push(row)
      row = [item]
      rowWidth = w
    } else {
      row.push(item)
      rowWidth = needed
    }
  }
  if (row.length) rows.push(row)
  return rows
}
