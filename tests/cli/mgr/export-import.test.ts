import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { addItem, readRegistry } from '../../../src/shared/registry/store.js'

describe('mgr export / import', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    dir = mkdtempSync(join(tmpdir(), 'jc-mgr-expimp-'))
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

  it('export writes the registry as JSON to stdout', async () => {
    addItem({ kind: 'py', source: '/x.py', alias: 'a', desc: '', exec: 'python /x.py', createdAt: 't', sourceVerifiedAt: 't' })
    const captured: string[] = []
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((s: any) => { captured.push(String(s)); return true }) as any)
    const { handler } = await import('../../../src/groups/mgr/export.js')
    await handler([])
    const joined = captured.join('')
    expect(JSON.parse(joined).items[0].alias).toBe('a')
    writeSpy.mockRestore()
  })

  it('export --out writes to the given path without prompting', async () => {
    addItem({ kind: 'py', source: '/x.py', alias: 'a', desc: '', exec: 'python /x.py', createdAt: 't', sourceVerifiedAt: 't' })
    const out = join(dir, 'out.json')
    const { handler } = await import('../../../src/groups/mgr/export.js')
    await handler(['--out', out])
    const parsed = JSON.parse(readFileSync(out, 'utf-8'))
    expect(parsed.items[0].alias).toBe('a')
  })

  it('import reads a file, preserves fields, and reports counts', async () => {
    const file = join(dir, 'r.json')
    writeFileSync(file, JSON.stringify({ version: 1, items: [
      { kind: 'npm', source: 'pkg', alias: 'a', desc: 'd', exec: 'x', createdAt: 't', sourceVerifiedAt: 't' },
    ] }), 'utf-8')
    const { handler } = await import('../../../src/groups/mgr/import.js')
    await handler([file])
    const reg = readRegistry()
    expect(reg.items).toHaveLength(1)
    expect(reg.items[0].alias).toBe('a')
  })
})
