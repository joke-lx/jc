import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('mgr add handler', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    dir = mkdtempSync(join(tmpdir(), 'jc-mgr-add-'))
    delete process.env.APPDATA
    process.env.XDG_CONFIG_HOME = dir
  })

  afterEach(() => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdg
    if (origAppData === undefined) delete process.env.APPDATA
    else process.env.APPDATA = origAppData
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('writes a registry item on a successful local exe', async () => {
    const exe = join(dir, 'tool.exe')
    require('fs').writeFileSync(exe, 'MZ')
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await handler(['exe', exe, '--alias', 'tool'])
    const reg = JSON.parse(readFileSync(join(dir, 'jc', 'registry.json'), 'utf-8'))
    expect(reg.items[0].alias).toBe('tool')
    expect(reg.items[0].kind).toBe('exe')
    exit.mockRestore()
  })

  it('exits 2 when the source cannot be validated', async () => {
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await expect(handler(['exe', '/no/such/file', '--alias', 'x'])).rejects.toThrow('exit')
    expect(exit).toHaveBeenCalledWith(2)
    exit.mockRestore()
  })

  it('exits 2 when the alias already exists', async () => {
    const { addItem } = await import('../../../src/shared/registry/store.js')
    addItem({ kind: 'py', source: '/tmp/x.py', alias: 'foo', desc: '', exec: 'python /tmp/x.py', createdAt: 't', sourceVerifiedAt: 't' })
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await expect(handler(['py', '/tmp/x.py', '--alias', 'foo'])).rejects.toThrow('exit')
    expect(exit).toHaveBeenCalledWith(2)
    exit.mockRestore()
  })
})
