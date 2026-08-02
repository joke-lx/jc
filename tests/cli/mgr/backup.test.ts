// tests/cli/mgr/backup.test.ts
// 覆盖 jc mgr backup 的：
// 1. 默认（仅 registry + manifest）
// 2. --include-local：把本地 exe / py 源拷进 zip
// 3. --include-local 但本地文件不存在：跳过 + warning
// 4. --include-local + --yes：跳过交互确认
// 5. 用法错误：exit 1
//
// 与 export-import.test.ts 同样用 hermetic XDG_CONFIG_HOME。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import AdmZip from 'adm-zip'
import { addItem, readRegistry } from '../../../src/shared/registry/store.js'

describe('mgr backup', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    dir = mkdtempSync(join(tmpdir(), 'jc-mgr-bak-'))
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

  it('writes a zip containing registry.json and manifest.json', async () => {
    addItem({ kind: 'npm', source: 'typescript', alias: 'tsc', desc: 'tsc', exec: 'npx -p typescript tsc', createdAt: 't', sourceVerifiedAt: 't' })
    const { handler } = await import('../../../src/groups/mgr/backup.js')
    const zipPath = join(dir, 'b.zip')
    await handler([zipPath])
    expect(existsSync(zipPath)).toBe(true)
    const zip = new AdmZip(zipPath)
    expect(zip.getEntry('registry.json')).not.toBeNull()
    expect(zip.getEntry('manifest.json')).not.toBeNull()
    const manifest = JSON.parse(zip.getEntry('manifest.json')!.getData().toString('utf-8'))
    expect(manifest.formatVersion).toBe(1)
    expect(manifest.items).toHaveLength(1)
    expect(manifest.items[0].alias).toBe('tsc')
    expect(manifest.items[0].execLocal).toBe(false)
    expect(manifest.items[0].bundledAs).toBeUndefined()
    // npm 项不应带 sources/
    expect(zip.getEntry('sources/tsc/tsc')).toBeNull()
  })

  it('--include-local bundles an existing exe and rewrites bundledAs in manifest', async () => {
    const exe = join(dir, 'mytool.exe')
    writeFileSync(exe, 'binary-stub')
    addItem({ kind: 'exe', source: exe, alias: 'mt', desc: '', exec: exe, createdAt: 't', sourceVerifiedAt: 't' })
    const { handler } = await import('../../../src/groups/mgr/backup.js')
    const zipPath = join(dir, 'b.zip')
    await handler([zipPath, '--include-local', '--yes'])
    const zip = new AdmZip(zipPath)
    const entry = zip.getEntry('sources/mt/mytool.exe')
    expect(entry).not.toBeNull()
    expect(entry!.getData().toString('utf-8')).toBe('binary-stub')
    const manifest = JSON.parse(zip.getEntry('manifest.json')!.getData().toString('utf-8'))
    expect(manifest.items[0].execLocal).toBe(true)
    expect(manifest.items[0].bundledAs).toBe('sources/mt/mytool.exe')
  })

  it('--include-local skips items whose local source no longer exists', async () => {
    const exe = join(dir, 'gone.exe')
    writeFileSync(exe, 'tmp')
    addItem({ kind: 'exe', source: exe, alias: 'gone', desc: '', exec: exe, createdAt: 't', sourceVerifiedAt: 't' })
    // 再让文件消失
    rmSync(exe)
    const { handler } = await import('../../../src/groups/mgr/backup.js')
    const zipPath = join(dir, 'b.zip')
    await handler([zipPath, '--include-local', '--yes'])
    const zip = new AdmZip(zipPath)
    expect(zip.getEntry('sources/gone/gone.exe')).toBeNull()
    const manifest = JSON.parse(zip.getEntry('manifest.json')!.getData().toString('utf-8'))
    expect(manifest.items[0].bundledAs).toBeUndefined()
  })

  it('missing zip path arg → exit 1', async () => {
    const { handler } = await import('../../../src/groups/mgr/backup.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`exit-${code}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(handler([])).rejects.toThrow(/exit-1/)
    expect(spy).toHaveBeenCalledWith(1)
    errSpy.mockRestore()
  })

  it('parent directory missing → exit 2', async () => {
    addItem({ kind: 'npm', source: 'pkg', alias: 'p', desc: '', exec: 'x', createdAt: 't', sourceVerifiedAt: 't' })
    const { handler } = await import('../../../src/groups/mgr/backup.js')
    const spy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`exit-${code}`) }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const zipPath = join(dir, 'does', 'not', 'exist', 'b.zip')
    await expect(handler([zipPath])).rejects.toThrow(/exit-2/)
    expect(spy).toHaveBeenCalledWith(2)
    errSpy.mockRestore()
  })
})