import { describe, it, expect } from 'vitest'
import { getCapability, capabilities } from '../../src/core/capabilities.js'

describe('capabilities registry', () => {
  it('registers spawn and open', async () => {
    expect(Object.keys(capabilities).sort()).toEqual(['open', 'spawn'])
  })

  it('spawn.parse accepts { bin, args? }', async () => {
    const cap = getCapability('spawn')
    expect(cap.parse({ bin: 'claude', args: ['{{@rest}}'] })).toEqual({ bin: 'claude', args: ['{{@rest}}'] })
    expect(cap.parse({ bin: 'claude' })).toEqual({ bin: 'claude', args: undefined })
  })

  it('spawn.parse rejects missing or empty bin', async () => {
    const cap = getCapability('spawn')
    expect(() => cap.parse({})).toThrow(/with\.bin 必须是非空字符串/)
    expect(() => cap.parse({ bin: '' })).toThrow(/with\.bin/)
    expect(() => cap.parse({ bin: 42 })).toThrow(/with\.bin/)
  })

  it('spawn.parse rejects non-array args', async () => {
    const cap = getCapability('spawn')
    expect(() => cap.parse({ bin: 'x', args: 'nope' })).toThrow(/with\.args 必须是字符串数组/)
    expect(() => cap.parse({ bin: 'x', args: [1] })).toThrow(/with\.args/)
  })

  it('open.parse accepts { target }', async () => {
    const cap = getCapability('open')
    expect(cap.parse({ target: 'https://stackoverflow.com' })).toEqual({ target: 'https://stackoverflow.com' })
  })

  it('open.parse rejects missing target', async () => {
    const cap = getCapability('open')
    expect(() => cap.parse({})).toThrow(/with\.target/)
  })

  it('getCapability throws on unknown hook', async () => {
    expect(() => getCapability('no.such')).toThrow(/未知 hook: no\.such/)
  })
})
