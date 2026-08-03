import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync, chmodSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('mgr cname', () => {
  let dir: string
  let origJcName: string | undefined
  let origJcConfig: string | undefined
  let origPath: string | undefined
  let origPlatform: NodeJS.Platform
  let stdoutLogs: string[]
  let stderrLogs: string[]
  let logSpy: ReturnType<typeof vi.spyOn>
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    origJcName = process.env.JC_CLI_NAME
    origJcConfig = process.env.JC_CONFIG_PATH
    origPath = process.env.PATH
    origPlatform = process.platform
    dir = mkdtempSync(join(tmpdir(), 'jc-cname-'))
    delete process.env.JC_CLI_NAME
    process.env.JC_CONFIG_PATH = join(dir, 'cfg', 'config.json')

    stdoutLogs = []
    stderrLogs = []
    logSpy = vi.spyOn(console, 'log').mockImplementation((s: unknown) => { stdoutLogs.push(String(s)) })
    errSpy = vi.spyOn(console, 'error').mockImplementation((s: unknown) => { stderrLogs.push(String(s)) })
  })

  afterEach(() => {
    logSpy.mockRestore()
    errSpy.mockRestore()
    if (origJcName === undefined) delete process.env.JC_CLI_NAME
    else process.env.JC_CLI_NAME = origJcName
    if (origJcConfig === undefined) delete process.env.JC_CONFIG_PATH
    else process.env.JC_CONFIG_PATH = origJcConfig
    process.env.PATH = origPath
    Object.defineProperty(process, 'platform', { value: origPlatform })
    rmSync(dir, { recursive: true, force: true })
  })

  it('no args prints default jc + source', async () => {
    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await handler([])
    expect(stdoutLogs[0]).toBe('jc')
    expect(stdoutLogs.some(s => s.includes('默认'))).toBe(true)
  })

  it('no args prints configured name when set', async () => {
    const store = await import('../../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await handler([])
    expect(stdoutLogs[0]).toBe('bb')
    expect(stdoutLogs.some(s => s.includes('config'))).toBe(true)
  })

  it('env override is reflected in get', async () => {
    process.env.JC_CLI_NAME = 'cc'
    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await handler([])
    expect(stdoutLogs[0]).toBe('cc')
    expect(stdoutLogs.some(s => s.includes('env'))).toBe(true)
  })

  it('rejects multi-arg shorthand', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await expect(handler(['bb', 'extra'])).rejects.toThrow(/exit-1/)
    expect(stderrLogs.some(s => s.includes('参数过多'))).toBe(true)
    exitSpy.mockRestore()
  })

  it('rejects invalid name in set', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await expect(handler(['set', '-bad'])).rejects.toThrow(/exit-1/)
    expect(stderrLogs.some(s => s.includes('名称非法'))).toBe(true)
    exitSpy.mockRestore()
  })

  it('reset extra args are rejected', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await expect(handler(['reset', 'extra'])).rejects.toThrow(/exit-1/)
    exitSpy.mockRestore()
  })

  it('set refuses mutation when JC_CLI_NAME env is locked', async () => {
    process.env.JC_CLI_NAME = 'cc'
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await expect(handler(['set', 'bb'])).rejects.toThrow(/exit-2/)
    expect(stderrLogs.some(s => s.includes('JC_CLI_NAME'))).toBe(true)
    exitSpy.mockRestore()
  })

  it('set bb with no jc in PATH exits 2', async () => {
    // 让 PATH 指向临时空目录，确保找不到 jc
    const emptyDir = join(dir, 'empty-bin')
    mkdirSync(emptyDir, { recursive: true })
    process.env.PATH = emptyDir
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw new Error(`exit-${c}`) }) as any)
    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await expect(handler(['set', 'bb'])).rejects.toThrow(/exit-2/)
    expect(stderrLogs.some(s => s.includes('未在 PATH 中找到'))).toBe(true)
    exitSpy.mockRestore()
  })

  it('set bb with faked jc in PATH installs launcher and writes config', async () => {
    const fakeBin = join(dir, 'fake-bin')
    mkdirSync(fakeBin, { recursive: true })
    const fakeJc = process.platform === 'win32' ? 'jc.cmd' : 'jc'
    writeFileSync(join(fakeBin, fakeJc), 'echo fake-jc\n', 'utf-8')
    if (process.platform !== 'win32') chmodSync(join(fakeBin, fakeJc), 0o755)
    process.env.PATH = fakeBin

    // 直接 stub detectJcBinDir，避免依赖 which/where 的实际 PATH 查找行为
    const launcherMod = await import('../../../src/shared/config/launcher.js')
    const spy = vi.spyOn(launcherMod, 'detectJcBinDir').mockReturnValue(fakeBin)

    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await handler(['set', 'bb'])

    // launcher 应已安装
    const expectedLauncher = process.platform === 'win32' ? 'bb.cmd' : 'bb'
    expect(existsSync(join(fakeBin, expectedLauncher))).toBe(true)
    // config 应已写入
    const store = await import('../../../src/shared/config/store.js')
    const cfg = store.readCliConfig()
    expect(cfg.cliName).toBe('bb')
    expect(cfg.launchers).toHaveLength(1)
    expect(cfg.launchers[0].name).toBe('bb')
    expect(stdoutLogs.some(s => s.includes('已设置'))).toBe(true)
    spy.mockRestore()
  })

  it('set bb (shorthand) behaves like set bb', async () => {
    const fakeBin = join(dir, 'fake-bin')
    mkdirSync(fakeBin, { recursive: true })
    const fakeJc = process.platform === 'win32' ? 'jc.cmd' : 'jc'
    writeFileSync(join(fakeBin, fakeJc), 'echo fake-jc\n', 'utf-8')
    if (process.platform !== 'win32') chmodSync(join(fakeBin, fakeJc), 0o755)
    process.env.PATH = fakeBin

    const launcherMod = await import('../../../src/shared/config/launcher.js')
    const spy = vi.spyOn(launcherMod, 'detectJcBinDir').mockReturnValue(fakeBin)

    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await handler(['bb'])

    const store = await import('../../../src/shared/config/store.js')
    expect(store.readCliConfig().cliName).toBe('bb')
    spy.mockRestore()
  })

  it('set jc is equivalent to reset', async () => {
    const fakeBin = join(dir, 'fake-bin')
    mkdirSync(fakeBin, { recursive: true })
    const fakeJc = process.platform === 'win32' ? 'jc.cmd' : 'jc'
    writeFileSync(join(fakeBin, fakeJc), 'echo fake-jc\n', 'utf-8')
    if (process.platform !== 'win32') chmodSync(join(fakeBin, fakeJc), 0o755)
    process.env.PATH = fakeBin

    const launcherMod = await import('../../../src/shared/config/launcher.js')
    vi.spyOn(launcherMod, 'detectJcBinDir').mockReturnValue(fakeBin)

    const store = await import('../../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')

    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await handler(['set', 'jc'])
    expect(store.readCliConfig().cliName).toBeUndefined()
  })

  it('reset clears cliName and uninstalls launchers', async () => {
    const fakeBin = join(dir, 'fake-bin')
    mkdirSync(fakeBin, { recursive: true })
    const fakeJc = process.platform === 'win32' ? 'jc.cmd' : 'jc'
    writeFileSync(join(fakeBin, fakeJc), 'echo fake-jc\n', 'utf-8')
    if (process.platform !== 'win32') chmodSync(join(fakeBin, fakeJc), 0o755)
    process.env.PATH = fakeBin

    const launcherMod = await import('../../../src/shared/config/launcher.js')
    vi.spyOn(launcherMod, 'detectJcBinDir').mockReturnValue(fakeBin)

    // 装一个 bb
    const store = await import('../../../src/shared/config/store.js')
    const { handler } = await import('../../../src/groups/mgr/cname.js')
    await handler(['set', 'bb'])
    expect(existsSync(join(fakeBin, process.platform === 'win32' ? 'bb.cmd' : 'bb'))).toBe(true)

    // 重置
    await handler(['reset'])
    expect(store.readCliConfig().cliName).toBeUndefined()
    expect(store.readCliConfig().launchers).toHaveLength(0)
    expect(existsSync(join(fakeBin, process.platform === 'win32' ? 'bb.cmd' : 'bb'))).toBe(false)
    // jc 自身保留
    expect(existsSync(join(fakeBin, fakeJc))).toBe(true)
  })
})
