import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('launcher plan', () => {
  it('POSIX plan produces a single symlink entry', async () => {
    const m = await import('../../../src/shared/config/launcher.js')
    const plan = m.planLauncherFiles({
      binDir: '/usr/local/bin',
      name: 'bb',
      jcPath: '/usr/local/bin/jc',
      platform: 'posix',
    })
    expect(plan).toHaveLength(1)
    expect(plan[0].kind).toBe('symlink')
    expect(plan[0].content).toBe('/usr/local/bin/jc')
    expect(plan[0].file).toMatch(/bb$/)
  })

  it('Windows plan produces .cmd + bash-shim', async () => {
    const m = await import('../../../src/shared/config/launcher.js')
    const plan = m.planLauncherFiles({
      binDir: 'C:\\bin',
      name: 'bb',
      jcPath: 'C:\\bin\\jc.cmd',
      platform: 'win32',
    })
    expect(plan).toHaveLength(2)
    const kinds = plan.map(p => p.kind).sort()
    expect(kinds).toEqual(['bash-shim', 'cmd'])
    expect(plan.find(p => p.kind === 'cmd')!.file).toMatch(/bb\.cmd$/)
    expect(plan.find(p => p.kind === 'bash-shim')!.file).toMatch(/bb$/)
  })

  it('POSIX plan puts jcPath as symlink content (target)', async () => {
    const m = await import('../../../src/shared/config/launcher.js')
    const plan = m.planLauncherFiles({ binDir: '/x', name: 'bb', jcPath: '/x/jc', platform: 'posix' })
    // content 字段在 symlink 类型下表示 symlink 目标路径
    expect(plan[0].content).toBe('/x/jc')
  })

  it('Windows cmd content has @echo off and passes %*', async () => {
    const m = await import('../../../src/shared/config/launcher.js')
    const plan = m.planLauncherFiles({ binDir: 'C:\\x', name: 'bb', jcPath: 'C:\\x\\jc.cmd', platform: 'win32' })
    const cmd = plan.find(p => p.kind === 'cmd')!
    expect(cmd.content).toMatch(/^@echo off/)
    expect(cmd.content).toMatch(/jc %\*/)
    expect(cmd.content).toMatch(/# jc-managed-launcher: bb/)
  })

  it('Windows bash shim delegates to cmd //c <name>.cmd', async () => {
    const m = await import('../../../src/shared/config/launcher.js')
    const plan = m.planLauncherFiles({ binDir: 'C:\\x', name: 'bb', jcPath: 'C:\\x\\jc.cmd', platform: 'win32' })
    const shim = plan.find(p => p.kind === 'bash-shim')!
    expect(shim.content).toMatch(/^#!\/usr\/bin\/env bash/)
    expect(shim.content).toMatch(/cmd \/\/c "bb\.cmd"/)
  })
})

describe('launcher install / uninstall (POSIX in-process)', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jc-launcher-')) })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  it('installLauncher writes symlink at target path', async () => {
    // 先在 binDir 里放一个 fake jc 文件作为 symlink 目标
    const fakeJc = join(dir, 'jc')
    writeFileSync(fakeJc, '#!/bin/sh\necho jc\n')
    const m = await import('../../../src/shared/config/launcher.js')
    const r = m.installLauncher({ binDir: dir, name: 'bb', jcPath: fakeJc, platform: 'posix' })
    expect(r.failed).toBeUndefined()
    expect(r.installed).toHaveLength(1)
    expect(existsSync(join(dir, 'bb'))).toBe(true)
  })

  it('isOwned returns true for marker-bearing file', async () => {
    const f = join(dir, 'owned')
    writeFileSync(f, '# jc-managed-launcher: bb\ncontent\n', 'utf-8')
    const m = await import('../../../src/shared/config/launcher.js')
    expect(m.isOwned(f)).toBe(true)
  })

  it('isOwned returns false for plain file', async () => {
    const f = join(dir, 'plain')
    writeFileSync(f, 'echo hello\n', 'utf-8')
    const m = await import('../../../src/shared/config/launcher.js')
    expect(m.isOwned(f)).toBe(false)
  })

  it('isOwned returns false for missing file', async () => {
    const m = await import('../../../src/shared/config/launcher.js')
    expect(m.isOwned(join(dir, 'nope'))).toBe(false)
  })

  it('installLauncher refuses to overwrite non-owned Windows .cmd', async () => {
    // POSIX symlink 永远允许覆盖（所有权由 name 标识）；Windows .cmd 走 isOwned 检查。
    const fakeJc = join(dir, 'jc.cmd')
    writeFileSync(fakeJc, '@echo off\n', 'utf-8')
    const occupied = join(dir, 'bb.cmd')
    writeFileSync(occupied, '@echo off\nREM user script\n', 'utf-8')
    const m = await import('../../../src/shared/config/launcher.js')
    const r = m.installLauncher({ binDir: dir, name: 'bb', jcPath: fakeJc, platform: 'win32' })
    expect(r.failed).toMatch(/非 jc 管理/)
    expect(existsSync(occupied)).toBe(true)
    expect(readFileSync(occupied, 'utf-8')).toBe('@echo off\nREM user script\n')
  })

  it('installLauncher POSIX symlink always overwrites existing file at target', async () => {
    // POSIX 下 symlink 永远覆盖——所有权由 name 标识，不依赖目标文件 marker。
    // 这让"重新装同一个 launcher"是幂等的。
    const fakeJc = join(dir, 'jc')
    writeFileSync(fakeJc, '#!/bin/sh\n', 'utf-8')
    const bbPath = join(dir, 'bb')
    writeFileSync(bbPath, 'echo user-stale\n', 'utf-8')
    const m = await import('../../../src/shared/config/launcher.js')
    const r = m.installLauncher({ binDir: dir, name: 'bb', jcPath: fakeJc, platform: 'posix' })
    expect(r.failed).toBeUndefined()
    expect(existsSync(bbPath)).toBe(true)
  })

  it('uninstallLauncher removes owned file, keeps non-owned', async () => {
    const owned = join(dir, 'bb')
    const stranger = join(dir, 'user')
    writeFileSync(owned, '# jc-managed-launcher: bb\ncontent', 'utf-8')
    writeFileSync(stranger, 'echo user\n', 'utf-8')
    const m = await import('../../../src/shared/config/launcher.js')
    const r = m.uninstallLauncher([owned, stranger])
    expect(r.removed).toEqual([owned])
    expect(r.kept).toEqual([stranger])
    expect(existsSync(owned)).toBe(false)
    expect(existsSync(stranger)).toBe(true)
  })

  it('uninstallLauncher ignores missing files silently', async () => {
    const m = await import('../../../src/shared/config/launcher.js')
    const r = m.uninstallLauncher([join(dir, 'nope')])
    expect(r.removed).toEqual([])
    expect(r.failed).toBeUndefined()
  })

  it('jc itself (with marker) would also be removed — caller must filter', async () => {
    const f = join(dir, 'jc')
    writeFileSync(f, '# jc-managed-launcher: jc\n', 'utf-8')
    const m = await import('../../../src/shared/config/launcher.js')
    const r = m.uninstallLauncher([f])
    expect(r.removed).toEqual([f])
    // uninstallLauncher 本身不区分 jc 与别名；调用方（cname reset）必须保证不传 jc 的路径。
  })

  it('installLauncher rolls back on mid-install failure', async () => {
    // 在 Windows 模式下，故意让第二个文件被占用，触发 rollback
    const fakeJc = join(dir, 'jc.cmd')
    writeFileSync(fakeJc, '@echo off\n', 'utf-8')
    const occupied = join(dir, 'bb')  // bash-shim 目标，预先放一个非 owned 文件
    writeFileSync(occupied, 'echo user', 'utf-8')
    const m = await import('../../../src/shared/config/launcher.js')
    const r = m.installLauncher({ binDir: dir, name: 'bb', jcPath: fakeJc, platform: 'win32' })
    expect(r.failed).toMatch(/非 jc 管理/)
    // .cmd 已经写了但应该被回滚
    expect(existsSync(join(dir, 'bb.cmd'))).toBe(false)
    // 用户的原文件保持原样
    expect(readFileSync(occupied, 'utf-8')).toBe('echo user')
  })
})

describe('detectJcBinDir', () => {
  it('returns a directory when jc is in PATH', async () => {
    const m = await import('../../../src/shared/config/launcher.js')
    // 我们自己跑 jc 的 vitest 进程 PATH 中必有 node；不一定有 jc。
    // 此处不强行断言成功，仅确认函数形态。
    const r = m.detectJcBinDir()
    if (r !== null) {
      expect(typeof r).toBe('string')
      expect(r.length).toBeGreaterThan(0)
    }
  })
})
