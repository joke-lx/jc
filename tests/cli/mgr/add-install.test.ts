// tests/cli/mgr/add-install.test.ts
// 覆盖 jc mgr add 的 --install 模式：
// 1. install 命令 exit 0 + which 命中 → 写入 registry
// 2. install 命令失败（exit != 0） → 不写 registry，exit 2
// 3. which 找不到 bin → 不写 registry，exit 2
// 4. --install 与 source 互斥 → exit 1
// 5. --install 缺 --bin → exit 1
// 6. 常规路径（不带 --install）仍走 validateSource
//
// vi.mock('child_process') 提供 spawnSync：每个测试 mockImplementation 设置期望。
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

describe('mgr add --install mode', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    dir = mkdtempSync(join(tmpdir(), 'jc-mgr-addinst-'))
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

  // 让 spawnSync 按命令分发：install cmd 成功 + which 命中。
  function mockInstallSuccess(binPath: string) {
    const calls: Array<{ cmd: string; args?: string[] }> = []
    vi.mocked(cp.spawnSync).mockImplementation(((cmd: any, args?: any, _opts?: any) => {
      calls.push({ cmd: String(cmd), args })
      if (String(cmd).includes('uv tool install') || String(cmd).includes('npm install')) {
        return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as any
      }
      // which / where
      if (String(cmd) === 'where' || String(cmd) === 'which') {
        return { status: 0, stdout: Buffer.from(binPath + '\n'), stderr: Buffer.from('') } as any
      }
      return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as any
    }) as any)
    return calls
  }

  it('install success + which hits: writes registry', async () => {
    mockInstallSuccess('/usr/local/bin/sql-harness')
    const { handler } = await import('../../../src/groups/mgr/add.js')
    await handler(['py', '--install', 'uv tool install sql-harness', '--bin', 'sql-harness', '--alias', 'sh'])
    const reg = readRegistry()
    expect(reg.items).toHaveLength(1)
    expect(reg.items[0].alias).toBe('sh')
    expect(reg.items[0].kind).toBe('py')
    expect(reg.items[0].source).toBe('uv tool install sql-harness')
    expect(reg.items[0].exec).toBe('/usr/local/bin/sql-harness')
  })

  it('install command fails (exit != 0): no registry write, exit 2', async () => {
    vi.mocked(cp.spawnSync).mockImplementation(((cmd: any) => {
      if (String(cmd).includes('uv tool install')) {
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from('failed') } as any
      }
      return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as any
    }) as any)
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      handler(['py', '--install', 'uv tool install nope', '--bin', 'nope', '--alias', 'n']),
    ).rejects.toThrow(/exit-2/)
    expect(exitSpy).toHaveBeenCalledWith(2)
    expect(readRegistry().items).toHaveLength(0)
    errSpy.mockRestore()
  })

  it('which returns empty: no registry write, exit 2', async () => {
    vi.mocked(cp.spawnSync).mockImplementation(((cmd: any) => {
      if (String(cmd).includes('uv tool install')) {
        return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') } as any
      }
      // which/where returns empty
      return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from('not found') } as any
    }) as any)
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      handler(['py', '--install', 'uv tool install foo', '--bin', 'foo', '--alias', 'f']),
    ).rejects.toThrow(/exit-2/)
    expect(exitSpy).toHaveBeenCalledWith(2)
    expect(readRegistry().items).toHaveLength(0)
    errSpy.mockRestore()
  })

  it('--install with --bin missing: exit 1', async () => {
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      handler(['py', '--install', 'uv tool install x', '--alias', 'x']),
    ).rejects.toThrow(/exit-1/)
    expect(exitSpy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })

  it('--install and source both given: exit 1', async () => {
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      handler(['py', 'some-source', '--install', 'uv tool install x', '--bin', 'x', '--alias', 'x']),
    ).rejects.toThrow(/exit-1/)
    expect(exitSpy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })

  it('regular mode (no --install) still works through validateSource', async () => {
    // 不走 install 路径。给一个无效 source 让 validateSource 报错，验证未走 install。
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // invalid npm 包名 → validateSource 失败
    await expect(handler(['npm', '', '--alias', 'x'])).rejects.toThrow(/exit/)
    expect(readRegistry().items).toHaveLength(0)
    errSpy.mockRestore()
  })
})