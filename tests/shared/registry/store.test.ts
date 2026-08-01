import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('registry store', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    dir = mkdtempSync(join(tmpdir(), 'jc-store-'))
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

  it('readRegistry returns an empty file when none exists', async () => {
    const { readRegistry } = await import('../../../src/shared/registry/store.js')
    expect(readRegistry()).toEqual({ version: 1, items: [] })
  })

  it('addItem / getItem / listItems round-trip', async () => {
    const { addItem, getItem, listItems } = await import('../../../src/shared/registry/store.js')
    addItem({
      kind: 'npm', source: 'pkg', alias: 'foo', desc: 'd', exec: 'npx -p pkg foo',
      createdAt: '2026-07-30T00:00:00Z', sourceVerifiedAt: '2026-07-30T00:00:00Z',
    })
    expect(getItem('foo')?.source).toBe('pkg')
    expect(listItems()).toHaveLength(1)
  })

  it('removeItem drops the entry', async () => {
    const { addItem, removeItem, listItems } = await import('../../../src/shared/registry/store.js')
    addItem({ kind: 'py', source: '/tmp/x.py', alias: 'a', desc: '', exec: 'python /tmp/x.py', createdAt: 't', sourceVerifiedAt: 't' })
    removeItem('a')
    expect(listItems()).toHaveLength(0)
  })

  it('renameItem renames and preserves fields', async () => {
    const { addItem, renameItem, getItem } = await import('../../../src/shared/registry/store.js')
    addItem({ kind: 'exe', source: '/x.exe', alias: 'old', desc: 'd', exec: '/x.exe', createdAt: 't', sourceVerifiedAt: 't' })
    renameItem('old', 'new')
    expect(getItem('old')).toBeUndefined()
    expect(getItem('new')?.source).toBe('/x.exe')
  })

  it('updateItemDesc mutates only desc', async () => {
    const { addItem, updateItemDesc, getItem } = await import('../../../src/shared/registry/store.js')
    addItem({ kind: 'npm', source: 'pkg', alias: 'a', desc: 'old', exec: 'x', createdAt: 't', sourceVerifiedAt: 't' })
    updateItemDesc('a', 'new')
    expect(getItem('a')?.desc).toBe('new')
    expect(getItem('a')?.exec).toBe('x')
  })

  it('writeRegistry is atomic (no .tmp left behind)', async () => {
    const { writeRegistry, getRegistryPath } = await import('../../../src/shared/registry/store.js')
    writeRegistry({ version: 1, items: [] })
    expect(existsSync(getRegistryPath() + '.tmp')).toBe(false)
  })
})