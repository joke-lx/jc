import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { addItem } from '../../../src/shared/registry/store.js'

const spawnMock = vi.fn()

vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process')
  return {
    ...actual,
    spawn: (...args: unknown[]) => spawnMock(...args),
  }
})

// Per-test access result: 'ok' | 'fail'. Default 'ok' so the happy-path
// and spaced-path tests pass preflight. The preflight-rejection test
// flips this to 'fail' in its body.
let accessResult: 'ok' | 'fail' = 'ok'

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    access: (_p: unknown, _m: unknown, cb: unknown) => {
      const c = cb as (e: NodeJS.ErrnoException | null) => void
      if (accessResult === 'ok') c(null)
      else c(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }) as NodeJS.ErrnoException)
    },
  }
})

describe('mgr run handler', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    dir = mkdtempSync(join(tmpdir(), 'jc-mgr-run-'))
    delete process.env.APPDATA
    process.env.XDG_CONFIG_HOME = dir
    spawnMock.mockReset()
    accessResult = 'ok'
  })

  afterEach(() => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdg
    if (origAppData === undefined) delete process.env.APPDATA
    else process.env.APPDATA = origAppData
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('spawns the registered exec with merged args', async () => {
    const exe = join(dir, 'echo.exe')
    writeFileSync(exe, '')
    addItem({ kind: 'exe', source: exe, alias: 'echo', desc: '', exec: exe, createdAt: 't', sourceVerifiedAt: 't' })
    spawnMock.mockImplementation(((_cmd: string, _args: unknown[], _opts: unknown) => {
      const child = new (require('events').EventEmitter)() as any
      process.nextTick(() => child.emit('close', 0))
      return child
    }) as any)
    const { handler } = await import('../../../src/groups/mgr/run.js')
    await handler(['echo', 'extra'])
    expect(spawnMock).toHaveBeenCalled()
    const call = spawnMock.mock.calls[0]
    expect(call[0]).toBe(exe)
    expect(call[1]).toEqual(['extra'])
    expect(call[2]).toMatchObject({ shell: true, windowsHide: true })
  })

  it('preserves paths containing spaces in exec', async () => {
    const spacedDir = join(dir, 'Program Files', 'tool')
    mkdirSync(spacedDir, { recursive: true })
    const spacedExe = join(spacedDir, 'mytool.exe')
    writeFileSync(spacedExe, '')
    addItem({ kind: 'exe', source: spacedExe, alias: 'spaced', desc: '', exec: spacedExe, createdAt: 't', sourceVerifiedAt: 't' })
    spawnMock.mockImplementation(((_cmd: string, _args: unknown[], _opts: unknown) => {
      const child = new (require('events').EventEmitter)() as any
      process.nextTick(() => child.emit('close', 0))
      return child
    }) as any)
    const { handler } = await import('../../../src/groups/mgr/run.js')
    await handler(['spaced', '--flag', 'value with space'])
    expect(spawnMock).toHaveBeenCalled()
    const call = spawnMock.mock.calls[0]
    expect(call[0]).toBe(spacedExe)
    expect(call[1]).toEqual(['--flag', 'value with space'])
    expect(call[2]).toMatchObject({ shell: true, windowsHide: true })
  })

  it('exits 2 when the alias is missing', async () => {
    const { handler } = await import('../../../src/groups/mgr/run.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await expect(handler(['nope'])).rejects.toThrow('exit')
    expect(exit).toHaveBeenCalledWith(2)
    exit.mockRestore()
  })

  it('exits 2 when preflight rejects (source deleted between add and run)', async () => {
    accessResult = 'fail'
    addItem({ kind: 'exe', source: '/tmp/will-be-deleted.exe', alias: 'gone', desc: '', exec: '/tmp/will-be-deleted.exe', createdAt: 't', sourceVerifiedAt: 't' })
    const { handler } = await import('../../../src/groups/mgr/run.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await expect(handler(['gone'])).rejects.toThrow('exit')
    expect(exit).toHaveBeenCalledWith(2)
    exit.mockRestore()
  })
})