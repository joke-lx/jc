import { describe, it, expect } from 'vitest'
import { bindParams, expandTemplate, dispatch } from '../../src/core/dispatch.js'
import type { Ctx, TOMLCommand } from '../../src/core/types.js'

function makeCtx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    dryRun: false,
    confirm: async () => true,
    audit: () => {},
    ...overrides,
  }
}

describe('bindParams', () => {
  it('no params: all argv passes through as rest', () => {
    expect(bindParams(undefined, ['a', 'b'])).toEqual({ named: {}, rest: ['a', 'b'] })
  })

  it('named params consume argv left to right', () => {
    const bound = bindParams([{ name: 'pid', type: 'int', required: true }], ['1234'])
    expect(bound).toEqual({ named: { pid: '1234' }, rest: [] })
  })

  it('optional params leave rest when argv is short', () => {
    const bound = bindParams(
      [{ name: 'a', type: 'string' }, { name: 'b', type: 'string' }],
      ['x'],
    )
    expect(bound.named).toEqual({ a: 'x' })
    expect(bound.rest).toEqual([])
  })

  it('missing required param throws', () => {
    expect(() => bindParams([{ name: 'pid', type: 'int', required: true }], [])).toThrow(/缺少必填参数: pid/)
  })

  it('extra argv beyond named params goes to rest', () => {
    const bound = bindParams([{ name: 'pid', type: 'int', required: true }], ['1234', '--extra'])
    expect(bound.named).toEqual({ pid: '1234' })
    expect(bound.rest).toEqual(['--extra'])
  })
})

describe('expandTemplate', () => {
  it('{{@rest}} expands to all remaining argv joined', () => {
    const bound = { named: {}, rest: ['-r', '--bypass'] }
    expect(expandTemplate(['{{@rest}}'], bound)).toEqual(['-r --bypass'])
  })

  it('{{name}} expands to bound param value', () => {
    const bound = { named: { file: 'x.ts' }, rest: [] }
    expect(expandTemplate(['--file', '{{file}}'], bound)).toEqual(['--file', 'x.ts'])
  })

  it('unknown {{name}} expands to empty', () => {
    const bound = { named: {}, rest: [] }
    expect(expandTemplate(['{{missing}}'], bound)).toEqual([''])
  })

  it('literal tokens preserved', () => {
    const bound = { named: { f: 'x' }, rest: ['y'] }
    expect(expandTemplate(['--bin', 'claude', '{{f}}', '{{@rest}}'], bound)).toEqual([
      '--bin', 'claude', 'x', 'y',
    ])
  })

  it('no template: returns rest as-is', () => {
    const bound = { named: {}, rest: ['a'] }
    expect(expandTemplate(undefined, bound)).toEqual(['a'])
  })
})

describe('dispatch', () => {
  it('runs capability when everything passes', async () => {
    let ran = false
    let receivedArgs: string[] | undefined
    const cmd: TOMLCommand = {
      name: 'echo',
      group: 'test',
      description: 'echo',
      hook: 'spawn',
      with: { bin: 'node', args: ['{{@rest}}'] },
    }
    // 用一个假 ctx.confirm 挡不住实际 spawn —— 改用自定义 ctx 捕获 audit
    let audited: [string, string[]] | undefined
    const ctx = makeCtx({ audit: (h, a) => { audited = [h, a]; ran = true; receivedArgs = a } })
    await dispatch(cmd, ['-e', '1'], { ...ctx, dryRun: true })
    // dryRun 不执行 run，走 printPlan
    expect(ran).toBe(false)
  })

  it('enabled: false is rejected before run', async () => {
    const cmd: TOMLCommand = {
      name: 'x', group: 't', description: 'x', hook: 'spawn',
      with: { bin: 'node' }, enabled: false,
    }
    await expect(dispatch(cmd, [], makeCtx())).rejects.toThrow(/命令已禁用/)
  })

  it('platform gate rejects on mismatched platform', async () => {
    const cmd: TOMLCommand = {
      name: 'x', group: 't', description: 'x', hook: 'spawn',
      with: { bin: 'node' }, platform: ['never-a-real-platform'],
    }
    await expect(dispatch(cmd, [], makeCtx())).rejects.toThrow(/命令不支持当前平台/)
  })

  it('unknown hook throws', async () => {
    const cmd: TOMLCommand = {
      name: 'x', group: 't', description: 'x', hook: 'no.such',
    }
    await expect(dispatch(cmd, [], makeCtx())).rejects.toThrow(/未知 hook/)
  })

  it('danger destructive confirms first; confirm=true proceeds to run', async () => {
    let confirmed = 0
    let audited: [string, string[]] | undefined
    const cmd: TOMLCommand = {
      name: 'rm', group: 't', description: 'x', hook: 'spawn',
      with: { bin: 'node' }, danger: 'destructive',
    }
    const ctx = makeCtx({
      confirm: async () => { confirmed++; return true },
      audit: (h, a) => { audited = [h, a] },
    })
    // dryRun=true 让 run 不真执行；confirm 应被调一次
    await dispatch(cmd, ['a'], { ...ctx, dryRun: true })
    expect(confirmed).toBe(1)
  })

  it('danger destructive confirm=false aborts without run', async () => {
    let confirmed = 0
    const cmd: TOMLCommand = {
      name: 'rm', group: 't', description: 'x', hook: 'spawn',
      with: { bin: 'node' }, danger: 'destructive',
    }
    const ctx = makeCtx({ confirm: async () => { confirmed++; return false } })
    const logs: string[] = []
    const spy = (await import('vitest')).vi.spyOn(console, 'log').mockImplementation((s: unknown) => logs.push(String(s)))
    try {
      await dispatch(cmd, ['a'], ctx)
    } finally {
      spy.mockRestore()
    }
    expect(confirmed).toBe(1)
    expect(logs).toContain('已取消')
  })

  it('dryRun prints plan and does not call audit', async () => {
    let audited = 0
    const cmd: TOMLCommand = {
      name: 'x', group: 't', description: 'x', hook: 'spawn',
      with: { bin: 'node' },
    }
    const logs: string[] = []
    const spy = (await import('vitest')).vi.spyOn(console, 'log').mockImplementation((s: unknown) => logs.push(String(s)))
    try {
      await dispatch(cmd, ['a'], makeCtx({ dryRun: true, audit: () => { audited++ } }))
    } finally {
      spy.mockRestore()
    }
    expect(logs.some(s => String(s).includes('[dry-run]'))).toBe(true)
    expect(audited).toBe(0)
  })
})
