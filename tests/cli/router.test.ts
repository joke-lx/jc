import { describe, it, expect } from 'vitest'
import { parseArgs, route } from '../../src/cli/router.js'

describe('parseArgs', () => {
  it('parses "w p 3306" correctly', () => {
    expect(parseArgs(['w', 'p', '3306'])).toEqual({ group: 'w', command: 'p', args: ['3306'] })
  })

  it('parses "claude l" correctly', () => {
    expect(parseArgs(['claude', 'l'])).toEqual({ group: 'claude', command: 'l', args: [] })
  })

  it('parses "hy r abc123" correctly', () => {
    expect(parseArgs(['hy', 'r', 'abc123'])).toEqual({ group: 'hy', command: 'r', args: ['abc123'] })
  })

  it('returns null for empty args', () => {
    expect(parseArgs([])).toBeNull()
  })

  it('parses single arg as group, empty command', () => {
    expect(parseArgs(['w'])).toEqual({ group: 'w', command: '', args: [] })
  })
})

describe('route', () => {
  it('shows group listing for empty args (does not crash)', async () => {
    // Should not throw
    await expect(route([])).resolves.toBeUndefined()
  })
})
