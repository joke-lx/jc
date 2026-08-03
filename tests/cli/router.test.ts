import { describe, it, expect, vi } from 'vitest'
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

  it('rewrites "r <alias> [args...]" into the mgr run command', async () => {
    // Capture the mgr run handler invocation without spawning a real process.
    const mgr = await import('../../src/groups/mgr/index.js')
    const runCmd = mgr.mgrGroup.commands.find(c => c.name === 'run')
    expect(runCmd).toBeDefined()
    if (!runCmd) return
    const spy = vi.spyOn(runCmd, 'handler').mockResolvedValue()
    try {
      await route(['r', 'tsc', '--version'])
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(['tsc', '--version'])
    } finally {
      spy.mockRestore()
    }
  })

  it('leaves "r" alone (no alias to rewrite to)', async () => {
    // `jc r` is not registered as a group, so the existing "unknown group" branch fires.
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    try {
      await expect(route(['r'])).rejects.toThrow('exit')
      expect(exit).toHaveBeenCalledWith(1)
    } finally {
      exit.mockRestore()
    }
  })

  it('mgr group exposes cname as a top-level command', async () => {
    const mgr = await import('../../src/groups/mgr/index.js')
    const cname = mgr.mgrGroup.commands.find(c => c.name === 'cname')
    expect(cname).toBeDefined()
    expect(typeof cname?.handler).toBe('function')
    // cname 不应暴露为 group alias（避免与已注册 tool alias 冲突）
    expect(mgr.mgrGroup.alias).toBe('m')
  })
})
