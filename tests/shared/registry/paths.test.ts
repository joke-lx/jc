import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('registry paths', () => {
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
  })

  afterEach(() => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdg
    if (origAppData === undefined) delete process.env.APPDATA
    else process.env.APPDATA = origAppData
  })

  it('uses XDG_CONFIG_HOME/jc/registry.json when XDG is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'jc-paths-'))
    try {
      delete process.env.APPDATA
      process.env.XDG_CONFIG_HOME = dir
      const { getRegistryPath } = await import('../../../src/shared/registry/paths.js')
      expect(getRegistryPath()).toBe(join(dir, 'jc', 'registry.json'))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('uses APPDATA/jc/registry.json on win32 when APPDATA is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'jc-paths-'))
    try {
      const origPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })
      delete process.env.XDG_CONFIG_HOME
      process.env.APPDATA = dir
      const { getRegistryPath } = await import('../../../src/shared/registry/paths.js')
      expect(getRegistryPath()).toBe(join(dir, 'jc', 'registry.json'))
      Object.defineProperty(process, 'platform', { value: origPlatform })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('ensureRegistryDir creates the parent directory', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'jc-paths-'))
    try {
      delete process.env.APPDATA
      process.env.XDG_CONFIG_HOME = dir
      const { ensureRegistryDir, getRegistryPath } = await import('../../../src/shared/registry/paths.js')
      ensureRegistryDir()
      const parent = getRegistryPath().replace(/registry\.json$/, '')
      expect(existsSync(parent)).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
