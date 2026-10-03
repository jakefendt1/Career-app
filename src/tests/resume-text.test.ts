import { describe, it, expect } from 'vitest'
import { splitListItems, splitBullets, cleanInline, estimateTextWidthPt, packIntoRows } from '../lib/resume-text'

describe('splitListItems', () => {
  it('reads one item per line', () => {
    expect(splitListItems('Contract Negotiation\nCRM Systems')).toEqual(['Contract Negotiation', 'CRM Systems'])
  })

  it('splits a single line on bullets, pipes, and semicolons', () => {
    expect(splitListItems('SolidWorks • Autodesk Inventor | AutoCAD; Power BI'))
      .toEqual(['SolidWorks', 'Autodesk Inventor', 'AutoCAD', 'Power BI'])
  })

  it('splits a comma list on a single line, dropping a leading "and"', () => {
    expect(splitListItems('SolidWorks, Autodesk Inventor, and AutoCAD'))
      .toEqual(['SolidWorks', 'Autodesk Inventor', 'AutoCAD'])
  })

  it('keeps a single comma inside a multi-line list as part of the item', () => {
    expect(splitListItems('Sales, Marketing Alignment\nCRM Systems'))
      .toEqual(['Sales, Marketing Alignment', 'CRM Systems'])
  })

  it('never splits inside parentheses', () => {
    expect(splitListItems('AutoCAD (2D, 3D), SolidWorks, Inventor'))
      .toEqual(['AutoCAD (2D, 3D)', 'SolidWorks', 'Inventor'])
  })

  it('strips glyphs, bold, trailing periods, and blank lines', () => {
    expect(splitListItems('- **Negotiation**.\n\n• Forecasting\n2) Pipeline Management'))
      .toEqual(['Negotiation', 'Forecasting', 'Pipeline Management'])
  })

  it('drops case-insensitive duplicates, keeping the first', () => {
    expect(splitListItems('CRM Systems\ncrm systems\nPower BI')).toEqual(['CRM Systems', 'Power BI'])
  })

  it('handles CRLF and non-breaking spaces', () => {
    expect(splitListItems('Robotics Integration\r\nConveyor Systems')).toEqual(['Robotics Integration', 'Conveyor Systems'])
  })
})

describe('splitBullets', () => {
  it('strips list glyphs but keeps numbers that are part of the text', () => {
    expect(splitBullets('- Grew revenue\n• 3.5x pipeline growth\n1. Closed deals')).toEqual(['Grew revenue', '3.5x pipeline growth', 'Closed deals'])
  })
})

describe('cleanInline', () => {
  it('removes zero-width characters and collapses spaces', () => {
    expect(cleanInline('  AGV​  and   AMR  ')).toBe('AGV and AMR')
  })
})

describe('packIntoRows', () => {
  const SEP = '   •   '

  it('fits short items onto one row', () => {
    expect(packIntoRows(['SolidWorks', 'Autodesk Inventor', 'AutoCAD', 'CRM Systems'], 474, 11, SEP)).toHaveLength(1)
  })

  it('never splits an item and never exceeds the width', () => {
    const items = [
      'Warehouse Automation and Material Handling Sales', 'Consultative and Value Based Selling',
      'Full Sales Cycle from Discovery to Close', 'New Market and Pipeline Development',
      'Proposal Development and Pricing Strategy', 'Economic Justification and ROI Analysis',
      'Contract Negotiation', 'Sales Forecasting and CRM Pipeline Management',
      'International and Cross-Cultural Collaboration', 'Plant Floor to C-Suite Communication',
    ]
    const rows = packIntoRows(items, 474, 11, SEP)
    expect(rows.flat()).toEqual(items)
    for (const row of rows) {
      if (row.length > 1) expect(estimateTextWidthPt(row.join(SEP), 11)).toBeLessThanOrEqual(474)
    }
  })

  it('gives an over-long item its own row', () => {
    const long = 'x'.repeat(200)
    expect(packIntoRows(['A', long, 'B'], 474, 11, SEP)).toEqual([['A'], [long], ['B']])
  })

  it('returns no rows for no items', () => {
    expect(packIntoRows([], 474, 11, SEP)).toEqual([])
  })
})
