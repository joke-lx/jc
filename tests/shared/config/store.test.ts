import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('cli config store', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined
  let origJcConfig: string | undefined
  let origJcName: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    origJcConfig = process.env.JC_CONFIG_PATH
    origJcName = process.env.JC_CLI_NAME
    dir = mkdtempSync(join(tmpdir(), 'jc-cfg-store-'))
    delete process.env.JC_CLI_NAME
    process.env.JC_CONFIG_PATH = join(dir, 'config.json')
  })

  afterEach(() => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdg
    if (origAppData === undefined) delete process.env.APPDATA
    else process.env.APPDATA = origAppData
    if (origJcConfig === undefined) delete process.env.JC_CONFIG_PATH
    else process.env.JC_CONFIG_PATH = origJcConfig
    if (origJcName === undefined) delete process.env.JC_CLI_NAME
    else process.env.JC_CLI_NAME = origJcName
    rmSync(dir, { recursive: true, force: true })
  })

  it('readCliConfig returns empty config when file missing', async () => {
    const { readCliConfig } = await import('../../../src/shared/config/store.js')
    const cfg = readCliConfig()
    expect(cfg.version).toBe(1)
    expect(cfg.launchers).toEqual([])
    expect(cfg.cliName).toBeUndefined()
  })

  it('getCliNameInfo returns default jc when nothing configured', async () => {
    const { getCliNameInfo } = await import('../../../src/shared/config/store.js')
    const info = getCliNameInfo()
    expect(info).toEqual({ name: 'jc', source: 'default' })
  })

  it('setConfiguredCliName + getCliNameInfo reports config source', async () => {
    const store = await import('../../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const info = store.getCliNameInfo()
    expect(info).toEqual({ name: 'bb', source: 'config' })
  })

  it('JC_CLI_NAME env overrides config', async () => {
    const store = await import('../../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    process.env.JC_CLI_NAME = 'cc'
    const info = store.getCliNameInfo()
    expect(info).toEqual({ name: 'cc', source: 'env' })
  })

  it('setConfiguredCliName normalizes case to lowercase', async () => {
    const store = await import('../../../src/shared/config/store.js')
    store.setConfiguredCliName('BB')
    const cfg = store.readCliConfig()
    expect(cfg.cliName).toBe('bb')
  })

  it('setConfiguredCliName rejects invalid names', async () => {
    const store = await import('../../../src/shared/config/store.js')
    // CLI_NAME_RE: 首字符 [a-z0-9]，后续 0-31 个 [a-z0-9_-]
    expect(() => store.setConfiguredCliName('-abc')).toThrow()  // 开头 - 非法
    expect(() => store.setConfiguredCliName('_abc')).toThrow()  // 开头 _ 非法
    expect(() => store.setConfiguredCliName('a'.repeat(33))).toThrow()  // 33 字符超长
    expect(() => store.setConfiguredCliName('')).toThrow()
    // 合法：首字符 a-z0-0，后续可含 _ -，总长 ≤ 32
    expect(() => store.setConfiguredCliName('a-b_c')).not.toThrow()
    expect(() => store.setConfiguredCliName('1abc')).not.toThrow()  // 数字开头合法
    expect(() => store.setConfiguredCliName('a'.repeat(32))).not.toThrow()
  })

  it('setConfiguredCliName(jc) clears the field instead of storing jc', async () => {
    const store = await import('../../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    store.setConfiguredCliName('jc')
    const cfg = store.readCliConfig()
    expect(cfg.cliName).toBeUndefined()
  })

  it('resetConfiguredCliName keeps launchers but clears cliName', async () => {
    const store = await import('../../../src/shared/config/store.js')
    store.recordLauncher({ name: 'bb', paths: ['/tmp/bb'], installedAt: 'now' })
    store.setConfiguredCliName('bb')
    store.resetConfiguredCliName()
    const cfg = store.readCliConfig()
    expect(cfg.cliName).toBeUndefined()
    expect(cfg.launchers).toHaveLength(1)
    expect(cfg.launchers[0].name).toBe('bb')
  })

  it('JC_CLI_NAME with invalid value throws (does not silently fallback)', async () => {
    process.env.JC_CLI_NAME = '-bad'  // 开头 - 非法
    const store = await import('../../../src/shared/config/store.js')
    expect(() => store.getCliNameInfo()).toThrow(/JC_CLI_NAME 非法/)
  })

  it('corrupted JSON in config.json throws a clear error', async () => {
    const { writeFileSync } = await import('fs')
    const path = join(dir, 'config.json')
    writeFileSync(path, '{not valid json', 'utf-8')
    const store = await import('../../../src/shared/config/store.js')
    expect(() => store.readCliConfig()).toThrow(/JSON 解析失败/)
  })

  it('unknown version in config.json throws a clear error', async () => {
    const { writeFileSync } = await import('fs')
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ version: 99, launchers: [] }), 'utf-8')
    const store = await import('../../../src/shared/config/store.js')
    expect(() => store.readCliConfig()).toThrow(/形态错误/)
  })

  it('isCliNameLockedByEnv reflects JC_CLI_NAME presence and validity', async () => {
    const store = await import('../../../src/shared/config/store.js')
    expect(store.isCliNameLockedByEnv()).toBe(false)
    process.env.JC_CLI_NAME = 'bb'
    expect(store.isCliNameLockedByEnv()).toBe(true)
    process.env.JC_CLI_NAME = '-bad'  // 非法值不算锁定
    expect(store.isCliNameLockedByEnv()).toBe(false)
  })

  it('recordLauncher deduplicates by name', async () => {
    const store = await import('../../../src/shared/config/store.js')
    store.recordLauncher({ name: 'bb', paths: ['/a'], installedAt: 't1' })
    store.recordLauncher({ name: 'bb', paths: ['/b'], installedAt: 't2' })
    const cfg = store.readCliConfig()
    expect(cfg.launchers).toHaveLength(1)
    expect(cfg.launchers[0].paths).toEqual(['/b'])
  })

  it('removeLauncherRecord removes only the named entry', async () => {
    const store = await import('../../../src/shared/config/store.js')
    store.recordLauncher({ name: 'bb', paths: ['/a'], installedAt: 't' })
    store.recordLauncher({ name: 'cc', paths: ['/b'], installedAt: 't' })
    store.removeLauncherRecord('bb')
    const cfg = store.readCliConfig()
    expect(cfg.launchers.map(l => l.name)).toEqual(['cc'])
  })

  it('writes are atomic (no .tmp file left behind)', async () => {
    const store = await import('../../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const cfgPath = join(dir, 'config.json')
    expect(existsSync(cfgPath)).toBe(true)
    expect(existsSync(cfgPath + '.tmp')).toBe(false)
  })
})
