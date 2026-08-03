import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('cli config paths', () => {
  let origXdg: string | undefined
  let origAppData: string | undefined
  let origJcConfig: string | undefined
  let dir: string

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    origJcConfig = process.env.JC_CONFIG_PATH
    dir = mkdtempSync(join(tmpdir(), 'jc-cfg-paths-'))
  })

  afterEach(() => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdg
    if (origAppData === undefined) delete process.env.APPDATA
    else process.env.APPDATA = origAppData
    if (origJcConfig === undefined) delete process.env.JC_CONFIG_PATH
    else process.env.JC_CONFIG_PATH = origJcConfig
    rmSync(dir, { recursive: true, force: true })
  })

  it('uses JC_CONFIG_PATH verbatim when set', async () => {
    process.env.JC_CONFIG_PATH = join(dir, 'explicit.json')
    const { getCliConfigPath } = await import('../../../src/shared/config/paths.js')
    expect(getCliConfigPath()).toBe(join(dir, 'explicit.json'))
  })

  it('falls back to XDG_CONFIG_HOME/jc/config.json when XDG is set', async () => {
    process.env.XDG_CONFIG_HOME = dir
    const { getCliConfigPath } = await import('../../../src/shared/config/paths.js')
    expect(getCliConfigPath()).toBe(join(dir, 'jc', 'config.json'))
  })

  it('falls back to APPDATA on win32 when neither JC_CONFIG_PATH nor XDG is set', async () => {
    const origPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32' })
    delete process.env.XDG_CONFIG_HOME
    process.env.APPDATA = dir
    const { getCliConfigPath } = await import('../../../src/shared/config/paths.js')
    expect(getCliConfigPath()).toBe(join(dir, 'jc', 'config.json'))
    Object.defineProperty(process, 'platform', { value: origPlatform })
  })

  it('ensureCliConfigDir creates the parent directory', async () => {
    process.env.JC_CONFIG_PATH = join(dir, 'nested', 'config.json')
    const { ensureCliConfigDir, getCliConfigPath } = await import('../../../src/shared/config/paths.js')
    ensureCliConfigDir()
    expect(existsSync(getCliConfigPath().replace(/config\.json$/, ''))).toBe(true)
  })

  it('JC_CONFIG_PATH overrides XDG and APPDATA', async () => {
    const explicit = join(dir, 'my-cfg.json')
    process.env.JC_CONFIG_PATH = explicit
    process.env.XDG_CONFIG_HOME = dir
    process.env.APPDATA = dir
    const { getCliConfigPath } = await import('../../../src/shared/config/paths.js')
    expect(getCliConfigPath()).toBe(explicit)
  })
})
