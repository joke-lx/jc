// tests/cli/mgr/interactive.test.ts
// 覆盖 mgr 命令的交互式 fallback：
// - 非 TTY 下缺参 → exit 1
// - TTY 下 prompt 一次能拿到用户输入（避免在测试里堆多行 prompt 的 stream 时机问题；
//   多行 prompt 由 prompt.test.ts 的多行测试保证 handler 层只是调用 prompt）
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Readable, Writable } from 'stream'
import { addItem, listItems } from '../../../src/shared/registry/store.js'

function fakeTTY(inputs: string[]) {
  const stdin = new Readable({ read() {} })
  const stdout = new Writable({ write(_c, _e, cb) { cb() } })
  // 立即把所有行 + null 推入。fakeTTY 用于"只调一次 prompt"的测试，
  // 多行序列在 prompt.test.ts 里覆盖。
  for (const s of inputs) stdin.push(s + '\n')
  stdin.push(null)
  return { stdin, stdout }
}

describe('mgr interactive fallbacks', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined
  let origStdinIsTTY: boolean | undefined
  let origStdoutIsTTY: boolean | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    dir = mkdtempSync(join(tmpdir(), 'jc-mgr-int-'))
    delete process.env.APPDATA
    process.env.XDG_CONFIG_HOME = dir
    origStdinIsTTY = process.stdin.isTTY
    origStdoutIsTTY = process.stdout.isTTY
  })

  afterEach(async () => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdg
    if (origAppData === undefined) delete process.env.APPDATA
    else process.env.APPDATA = origAppData
    if (dir) rmSync(dir, { recursive: true, force: true })
    Object.defineProperty(process.stdin, 'isTTY', { value: origStdinIsTTY, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: origStdoutIsTTY, configurable: true })
    vi.restoreAllMocks()
  })

  function makeTTY() {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
  }

  function killTTY() {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true })
  }

  async function resetIO(inputs: string[]) {
    const prompt = await import('../../../src/shared/registry/prompt.js')
    const { stdin, stdout } = fakeTTY(inputs)
    prompt._resetPromptIO(stdin, stdout)
    return prompt
  }

  it('add: non-TTY with missing args → exit 1', async () => {
    killTTY()
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler([])).rejects.toThrow(/exit-1/)
    expect(spy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })

  it('add: TTY + prompts user for kind/source/alias/desc', async () => {
    makeTTY()
    const exe = join(dir, 'tool.exe')
    writeFileSync(exe, 'x')
    await resetIO(['exe', exe, 'tool', 'my tool'])
    const { handler } = await import('../../../src/groups/mgr/add.js')
    await handler([])
    const items = listItems()
    expect(items).toHaveLength(1)
    expect(items[0].alias).toBe('tool')
    expect(items[0].kind).toBe('exe')
    expect(items[0].source).toBe(exe)
    expect(items[0].desc).toBe('my tool')
  })

  it('rm: TTY + empty registry → exit 2', async () => {
    makeTTY()
    await resetIO([])
    const { handler } = await import('../../../src/groups/mgr/rm.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler([])).rejects.toThrow(/exit-2/)
    spy.mockRestore()
    errSpy.mockRestore()
  })

  it('rm: TTY + prompts for alias then confirms delete', async () => {
    makeTTY()
    const exe = join(dir, 'r.exe')
    writeFileSync(exe, 'x')
    addItem({ kind: 'exe', source: exe, alias: 'tsc', desc: '', exec: exe, createdAt: 't', sourceVerifiedAt: 't' })
    await resetIO(['tsc', 'y'])
    const { handler } = await import('../../../src/groups/mgr/rm.js')
    await handler([])
    expect(listItems()).toHaveLength(0)
  })

  it('rename: TTY + prompts old/new then confirms', async () => {
    makeTTY()
    const exe = join(dir, 't.exe')
    writeFileSync(exe, 'x')
    addItem({ kind: 'exe', source: exe, alias: 'tsc', desc: '', exec: exe, createdAt: 't', sourceVerifiedAt: 't' })
    await resetIO(['tsc', 'tscc', 'y'])
    const { handler } = await import('../../../src/groups/mgr/rename.js')
    await handler([])
    const items = listItems()
    expect(items.map(i => i.alias)).toEqual(['tscc'])
  })

  it('rename: non-TTY + missing args → exit 1', async () => {
    killTTY()
    const { handler } = await import('../../../src/groups/mgr/rename.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler([])).rejects.toThrow(/exit-1/)
    expect(spy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })

  it('check: non-TTY + no alias → exit 1', async () => {
    killTTY()
    const { handler } = await import('../../../src/groups/mgr/check.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler([])).rejects.toThrow(/exit-1/)
    expect(spy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })

  it('add: full CLI args still works (no behavior change)', async () => {
    killTTY()
    const exe = join(dir, 't.exe')
    writeFileSync(exe, 'x')
    const { handler } = await import('../../../src/groups/mgr/add.js')
    await handler(['exe', exe, '--alias', 'tool', '--desc', 'tool'])
    expect(listItems()[0].alias).toBe('tool')
  })

  it('restore: non-TTY + no zip arg → exit 1', async () => {
    killTTY()
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler([])).rejects.toThrow(/exit-1/)
    expect(spy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })
})