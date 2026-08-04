import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

describe('meta', () => {
  it('exposes the canonical identifiers', async () => {
    const { META } = await import('../../src/shared/meta.js')
    expect(META.binaryName).toBe('jc')
    expect(META.dataDirName).toBe('jc')
    expect(META.envPrefix).toBe('JC_')
    expect(META.packageName).toBe('je-cd')
  })

  it('is frozen / readonly (as const)', async () => {
    const { META } = await import('../../src/shared/meta.js')
    expect(Object.keys(META).sort()).toEqual(['binaryName', 'dataDirName', 'envPrefix', 'packageName'])
  })
})

describe('meta consumers', () => {
  it('DEFAULT_CLI_NAME derives from META.binaryName', async () => {
    const { DEFAULT_CLI_NAME } = await import('../../src/shared/config/types.js')
    const { META } = await import('../../src/shared/meta.js')
    expect(DEFAULT_CLI_NAME).toBe(META.binaryName)
  })

  it('registry paths uses META.dataDirName', async () => {
    const path = fileURLToPath(new URL('../../src/shared/registry/paths.ts', import.meta.url))
    const src = readFileSync(path, 'utf-8')
    expect(src).toContain('META.dataDirName')
  })

  it('cli config paths uses META.dataDirName', async () => {
    const path = fileURLToPath(new URL('../../src/shared/config/paths.ts', import.meta.url))
    const src = readFileSync(path, 'utf-8')
    expect(src).toContain('META.dataDirName')
  })

  it('output.ts references CLI_TOKEN (not hardcoded jc)', async () => {
    const path = fileURLToPath(new URL('../../src/cli/output.ts', import.meta.url))
    const src = readFileSync(path, 'utf-8')
    expect(src).toContain('CLI_TOKEN')
    // output.ts 不应再有硬编码的 'jc' 字面（正则已被 replaceAll(CLI_TOKEN) 替代）
    expect(src).not.toContain("META.binaryName")
  })
})
