import { describe, it, expect } from 'vitest'
import { portraitSquare, dataUrlToBytes } from '../lib/photo'

describe('portraitSquare', () => {
  it('uses the full width of a tall portrait and keeps the top (head) in frame', () => {
    // 1000×1062 — the real LinkedIn headshot's dimensions
    const { x, y, side } = portraitSquare(1000, 1062)
    expect(side).toBe(1000)
    expect(x).toBe(0)
    expect(y).toBeCloseTo(62 * 0.15) // trims mostly from the bottom
  })

  it('centers horizontally on a wide image', () => {
    const { x, y, side } = portraitSquare(1600, 900)
    expect(side).toBe(900)
    expect(x).toBe(350)
    expect(y).toBe(0)
  })

  it('is a no-op crop for a square image', () => {
    expect(portraitSquare(500, 500)).toEqual({ x: 0, y: 0, side: 500 })
  })
})

describe('dataUrlToBytes', () => {
  it('decodes a base64 data URL', () => {
    expect(Array.from(dataUrlToBytes('data:image/jpeg;base64,AQID'))).toEqual([1, 2, 3])
  })
})
