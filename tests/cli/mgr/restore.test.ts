// tests/cli/mgr/restore.test.ts
// 覆盖 jc mgr restore 的：
// 1. 默认 skip：重名 alias 不覆盖
// 2. --merge：重名 alias 用备份覆盖
// 3. --replace：先自动备份当前 + 清空 + 重建
// 4. --dry-run：只报告不写
// 5. execLocal + bundledAs：解压到 <JC_DATA>/sources/<alias>/ 并重写 exec/source
// 6. execLocal 但无 bundledAs：failed++，不写入坏 exec
// 7. formatVersion 拒绝
// 8. 用法错误 → exit 1
//
// 与 backup.test.ts 同样的 hermetic XDG_CONFIG_HOME。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync, statSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import AdmZip from 'adm-zip'
import { addItem, readRegistry } from '../../../src/shared/registry/store.js'
import { getRegistryPath } from '../../../src/shared/registry/paths.js'

function makeBackupZip(dir: string, items: any[], sources: Record<string, { alias: string; content: string }> = {}): string {
  const zip = new AdmZip()
  zip.addFile('registry.json', Buffer.from(JSON.stringify({ version: 1, items }), 'utf-8'))
  const manifest = {
    formatVersion: 1,
    jcVersion: '0.2.0',
    createdAt: new Date().toISOString(),
    sourceHost: 'test',
    sourceOS: process.platform,
    registryVersion: 1,
    items: items.map(it => ({
      alias: it.alias,
      kind: it.kind,
      source: it.source,
      exec: it.exec,
      desc: it.desc || '',
      args: it.args,
      createdAt: it.createdAt,
      sourceVerifiedAt: it.sourceVerifiedAt,
      execLocal: it.kind === 'exe' || it.kind === 'py',
      bundledAs: sources[it.alias] ? `sources/${it.alias}/payload` : undefined,
    })),
  }
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'))
  for (const [alias, src] of Object.entries(sources)) {
    zip.addFile(`sources/${alias}/payload`, Buffer.from(src.content, 'utf-8'))
  }
  const zipPath = join(dir, 'b.zip')
  zip.writeZip(zipPath)
  return zipPath
}

describe('mgr restore', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    dir = mkdtempSync(join(tmpdir(), 'jc-mgr-res-'))
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

  it('default skip: imports new aliases, skips conflicting ones', async () => {
    addItem({ kind: 'npm', source: 'old', alias: 'keep', desc: 'keep-desc', exec: 'old-exec', createdAt: 't1', sourceVerifiedAt: 't1' })
    const zipPath = makeBackupZip(dir, [
      { kind: 'npm', source: 'old', alias: 'keep', desc: 'keep-desc', exec: 'old-exec', createdAt: 't1', sourceVerifiedAt: 't1' },
      { kind: 'npm', source: 'new', alias: 'fresh', desc: 'fresh-desc', exec: 'new-exec', createdAt: 't2', sourceVerifiedAt: 't2' },
    ])
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    await handler([zipPath])
    const reg = readRegistry()
    const aliases = reg.items.map(i => i.alias).sort()
    expect(aliases).toEqual(['fresh', 'keep'])
    // 'keep' 的 desc 应保持原值（不被覆盖）
    const keepItem = reg.items.find(i => i.alias === 'keep')
    expect(keepItem!.desc).toBe('keep-desc')
  })

  it('--merge: overwrites conflicting aliases from backup', async () => {
    addItem({ kind: 'npm', source: 'old', alias: 'x', desc: 'old-desc', exec: 'old-exec', createdAt: 't1', sourceVerifiedAt: 't1' })
    const zipPath = makeBackupZip(dir, [
      { kind: 'npm', source: 'new', alias: 'x', desc: 'new-desc', exec: 'new-exec', createdAt: 't2', sourceVerifiedAt: 't2' },
    ])
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    await handler([zipPath, '--merge'])
    const reg = readRegistry()
    expect(reg.items).toHaveLength(1)
    expect(reg.items[0].desc).toBe('new-desc')
    expect(reg.items[0].exec).toBe('new-exec')
  })

  it('--replace: backs up current registry to .bak-* then clears and rebuilds', async () => {
    addItem({ kind: 'npm', source: 'a', alias: 'oldone', desc: '', exec: 'x', createdAt: 't', sourceVerifiedAt: 't' })
    const zipPath = makeBackupZip(dir, [
      { kind: 'npm', source: 'fresh', alias: 'newone', desc: '', exec: 'y', createdAt: 't', sourceVerifiedAt: 't' },
    ])
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    await handler([zipPath, '--replace'])
    const reg = readRegistry()
    expect(reg.items.map(i => i.alias)).toEqual(['newone'])
    // bak 应存在
    const jcDir = join(dir, 'jc')
    const baks = require('fs').readdirSync(jcDir).filter((f: string) => f.startsWith('registry.json.bak-'))
    expect(baks.length).toBe(1)
  })

  it('--dry-run: never writes to registry', async () => {
    addItem({ kind: 'npm', source: 'a', alias: 'preexisting', desc: '', exec: 'x', createdAt: 't', sourceVerifiedAt: 't' })
    const before = JSON.stringify(readRegistry())
    const zipPath = makeBackupZip(dir, [
      { kind: 'npm', source: 'a', alias: 'preexisting', desc: '', exec: 'x', createdAt: 't', sourceVerifiedAt: 't' },
      { kind: 'npm', source: 'b', alias: 'newone', desc: '', exec: 'y', createdAt: 't', sourceVerifiedAt: 't' },
    ])
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    await handler([zipPath, '--dry-run'])
    const after = JSON.stringify(readRegistry())
    expect(after).toBe(before)
  })

  it('execLocal + bundledAs: extracts source to <JC_DATA>/sources/<alias>/ and rewrites exec/source', async () => {
    const zipPath = makeBackupZip(dir, [
      { kind: 'exe', source: 'D:\\old\\tool.exe', alias: 'tl', desc: '', exec: 'D:\\old\\tool.exe', createdAt: 't', sourceVerifiedAt: 't' },
    ], { tl: { alias: 'tl', content: 'fake-binary' } })
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    await handler([zipPath])
    const reg = readRegistry()
    const it = reg.items.find(i => i.alias === 'tl')!
    expect(it.exec).toMatch(/sources[/\\]tl[/\\]payload$/)
    expect(it.source).toBe(it.exec)
    expect(existsSync(it.exec)).toBe(true)
    expect(readFileSync(it.exec, 'utf-8')).toBe('fake-binary')
  })

  it('execLocal without bundledAs: failed++, no bad exec written', async () => {
    const zipPath = makeBackupZip(dir, [
      { kind: 'exe', source: 'D:\\old\\tool.exe', alias: 'tl2', desc: '', exec: 'D:\\old\\tool.exe', createdAt: 't', sourceVerifiedAt: 't' },
    ])
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    await handler([zipPath])
    const reg = readRegistry()
    expect(reg.items.find(i => i.alias === 'tl2')).toBeUndefined()
  })

  it('rejects unknown formatVersion', async () => {
    const zip = new AdmZip()
    zip.addFile('registry.json', Buffer.from(JSON.stringify({ version: 1, items: [] }), 'utf-8'))
    zip.addFile('manifest.json', Buffer.from(JSON.stringify({ formatVersion: 99, registryVersion: 1, items: [] }), 'utf-8'))
    const zipPath = join(dir, 'bad.zip')
    zip.writeZip(zipPath)
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`exit-${code}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler([zipPath])).rejects.toThrow(/exit-1/)
    expect(spy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })

  it('missing zip path arg → exit 1', async () => {
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`exit-${code}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler([])).rejects.toThrow(/exit-1/)
    expect(spy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })

  it('non-existent zip → exit 1', async () => {
    const { handler } = await import('../../../src/groups/mgr/restore.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`exit-${code}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler([join(dir, 'nope.zip')])).rejects.toThrow(/exit-1/)
    expect(spy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })
})