// tests/cli/mgr/install.test.ts
// 覆盖 jc mgr install（独立 verb 形式）：
// 1. install cmd exit 0 + which 命中 → 写入 registry（委托给 add handler）
// 2. install cmd 失败 → 不写 registry，exit 2
// 3. 缺参 → exit 1
// 4. --kind 非法值 → exit 1
// 5. 未知 flag → exit 1
//
// install handler 内部委托给 add；mock spawnSync 与 add-install.test.ts 同样的思路。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process')
  return { ...actual, spawnSync: vi.fn() }
})

import * as cp from 'child_process'
import { readRegistry } from '../../../src/shared/registry/store.js'

describe('mgr install (verb)', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    dir = mkdtempSync(join(tmpdir(), 'jc-mgr-install-'))
    delete process.env.APPDATA
    process.env.XDG_CONFIG_HOME = dir
  })

  afterEach(() => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdg
    if (origAppData === undefined) delete process.env.APPDATA
    else process.env.APPDATA = origAppData
    if (dir) rmSync(dir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  function mockInstallSuccess(binPath: string) {
    vi.mocked(cp.spawnSync).mockImplementation(((cmd: any) => {
      const s = String(cmd)
      if (s.includes('uv tool install') || s.includes('pip') || s.includes('npm install')) {
        return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as any
      }
      if (s === 'where' || s === 'which') {
        return { status: 0, stdout: Buffer.from(binPath + '\n'), stderr: Buffer.from('') } as any
      }
      return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as any
    }) as any)
  }

  it('install cmd exit 0 + which hit: writes registry via add delegation', async () => {
    mockInstallSuccess('/usr/local/bin/sql-harness')
    const { handler } = await import('../../../src/groups/mgr/install.js')
    await handler(['--cmd', 'uv tool install sql-harness', '--bin', 'sql-harness', '--alias', 'sh'])
    const reg = readRegistry()
    expect(reg.items).toHaveLength(1)
    expect(reg.items[0].alias).toBe('sh')
    expect(reg.items[0].exec).toBe('/usr/local/bin/sql-harness')
    expect(reg.items[0].source).toBe('uv tool install sql-harness')
  })

  it('install cmd fails: exit 2, no registry write', async () => {
    vi.mocked(cp.spawnSync).mockImplementation(((cmd: any) => {
      if (String(cmd).includes('uv tool install')) {
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from('failed') } as any
      }
      return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as any
    }) as any)
    const { handler } = await import('../../../src/groups/mgr/install.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      handler(['--cmd', 'uv tool install nope', '--bin', 'nope', '--alias', 'n']),
    ).rejects.toThrow(/exit-2/)
    expect(readRegistry().items).toHaveLength(0)
    errSpy.mockRestore()
  })

  it('which miss: exit 2, no registry write', async () => {
    vi.mocked(cp.spawnSync).mockImplementation(((cmd: any) => {
      const s = String(cmd)
      if (s.includes('uv tool install')) {
        return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as any
      }
      return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from('not found') } as any
    }) as any)
    const { handler } = await import('../../../src/groups/mgr/install.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      handler(['--cmd', 'uv tool install foo', '--bin', 'foo', '--alias', 'f']),
    ).rejects.toThrow(/exit-2/)
    expect(readRegistry().items).toHaveLength(0)
    errSpy.mockRestore()
  })

  it('missing --cmd/--bin/--alias: exit 1', async () => {
    const { handler } = await import('../../../src/groups/mgr/install.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler(['--cmd', 'x'])).rejects.toThrow(/exit-1/)
    errSpy.mockRestore()
  })

  it('--kind invalid: exit 1', async () => {
    const { handler } = await import('../../../src/groups/mgr/install.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      handler(['--cmd', 'x', '--bin', 'x', '--alias', 'x', '--kind', 'rust']),
    ).rejects.toThrow(/exit-1/)
    errSpy.mockRestore()
  })

  it('unknown flag: exit 1', async () => {
    const { handler } = await import('../../../src/groups/mgr/install.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      handler(['--cmd', 'x', '--bin', 'x', '--alias', 'x', '--bogus', 'y']),
    ).rejects.toThrow(/exit-1/)
    errSpy.mockRestore()
  })

  it('--kind npm: registers as npm with kind=npm', async () => {
    mockInstallSuccess('/usr/local/bin/ts-ls')
    const { handler } = await import('../../../src/groups/mgr/install.js')
    await handler([
      '--cmd', 'npm install -g ts-ls',
      '--bin', 'ts-ls',
      '--alias', 'tsls',
      '--kind', 'npm',
      '--desc', 'TS LS',
    ])
    const reg = readRegistry()
    expect(reg.items).toHaveLength(1)
    expect(reg.items[0].kind).toBe('npm')
    expect(reg.items[0].desc).toBe('TS LS')
  })
})