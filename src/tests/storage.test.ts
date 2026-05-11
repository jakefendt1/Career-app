import { describe, it, expect, beforeEach } from 'vitest'
import { getItem, setItem, removeItem, clearAll, KEYS } from '../lib/storage'

beforeEach(() => {
  localStorage.clear()
})

describe('storage', () => {
  it('round-trips a simple object', () => {
    setItem('test', { foo: 'bar', n: 42 })
    expect(getItem('test')).toEqual({ foo: 'bar', n: 42 })
  })

  it('returns null for missing key', () => {
    expect(getItem('missing')).toBeNull()
  })

  it('uses namespaced keys (career_ prefix)', () => {
    setItem('roles', [])
    expect(localStorage.getItem('career_roles')).toBe('[]')
  })

  it('removeItem deletes the key', () => {
    setItem('roles', [1, 2, 3])
    removeItem(KEYS.roles)
    expect(getItem(KEYS.roles)).toBeNull()
  })

  it('clearAll removes only career_ prefixed keys', () => {
    setItem('roles', [])
    setItem('profile', { name: 'Jake' })
    localStorage.setItem('other_app_key', 'preserved')
    clearAll()
    expect(getItem('roles')).toBeNull()
    expect(getItem('profile')).toBeNull()
    expect(localStorage.getItem('other_app_key')).toBe('preserved')
  })

  it('handles malformed JSON gracefully', () => {
    localStorage.setItem('career_bad', 'not-json{{{')
    expect(getItem('bad')).toBeNull()
  })
})
