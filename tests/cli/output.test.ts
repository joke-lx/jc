import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('cli output token replacement', () => {
  let dir: string
  let origJcName: string | undefined
  let origJcConfig: string | undefined

  beforeEach(() => {
    origJcName = process.env.JC_CLI_NAME
    origJcConfig = process.env.JC_CONFIG_PATH
    dir = mkdtempSync(join(tmpdir(), 'jc-output-'))
    delete process.env.JC_CLI_NAME
    process.env.JC_CONFIG_PATH = join(dir, 'config.json')
  })

  afterEach(() => {
    if (origJcName === undefined) delete process.env.JC_CLI_NAME
    else process.env.JC_CLI_NAME = origJcName
    if (origJcConfig === undefined) delete process.env.JC_CONFIG_PATH
    else process.env.JC_CONFIG_PATH = origJcConfig
    rmSync(dir, { recursive: true, force: true })
  })

  it('cliText leaves a string without jc untouched', async () => {
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('hello world')).toBe('hello world')
  })

  it('cliText replaces standalone jc token (default name)', async () => {
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('jc mgr list')).toBe('jc mgr list')  // 默认名就是 jc
  })

  it('cliText replaces standalone jc with configured alias bb', async () => {
    const store = await import('../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('jc mgr list')).toBe('bb mgr list')
    expect(cliText('cat r.json | jc mgr import')).toBe('cat r.json | bb mgr import')
    expect(cliText('jc; jc mgr list')).toBe('bb; bb mgr list')
  })

  it('cliText does NOT replace jc inside /jc/ paths', async () => {
    const store = await import('../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('store in /jc/registry.json')).toBe('store in /jc/registry.json')
    expect(cliText('C:\\jc\\app\\config')).toBe('C:\\jc\\app\\config')
  })

  it('cliText does NOT replace jc in env var names', async () => {
    const store = await import('../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('export JC_REGISTRY_PATH=...')).toBe('export JC_REGISTRY_PATH=...')
  })

  it('cliText does NOT replace jc inside longer identifiers', async () => {
    const store = await import('../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('field jcVersion=0.1')).toBe('field jcVersion=0.1')
    expect(cliText('var jcDir')).toBe('var jcDir')
  })

  it('cliText handles JC_CLI_NAME env with higher priority than config', async () => {
    const store = await import('../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    process.env.JC_CLI_NAME = 'cc'
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('jc mgr list')).toBe('cc mgr list')
  })

  it('printCommandHelp replaces jc in helpText, examples, and related', async () => {
    const store = await import('../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const { printCommandHelp } = await import('../../src/cli/output.js')
    const logs: string[] = []
    const spy = (await import('vitest')).vi.spyOn(console, 'log').mockImplementation((s: unknown) => { logs.push(String(s)) })
    try {
      printCommandHelp({
        name: 'k',
        description: '按 PID 杀进程',
        handler: async () => {},
        helpText: '用法:\n  jc w k <PID>  - 强制结束指定 PID',
        examples: ['jc w k 1234'],
        related: ['jc w p', 'jc w pk'],
      }, 'w')
      const joined = logs.join('\n')
      // helpText 里的 jc 必须被替换成 bb
      expect(joined).toContain('bb w k <PID>')
      expect(joined).not.toMatch(/jc w k <PID>/)
      // examples / related 也替换
      expect(joined).toContain('bb w k 1234')
      expect(joined).toContain('bb w p')
    } finally {
      spy.mockRestore()
    }
  })
})

describe('output helpers export shape', () => {
  it('exports getStyledCliName and cliText', async () => {
    const mod = await import('../../src/cli/output.js')
    expect(typeof mod.getStyledCliName).toBe('function')
    expect(typeof mod.cliText).toBe('function')
    expect(typeof mod.printGroupHelp).toBe('function')
    expect(typeof mod.printCommandHelp).toBe('function')
  })
})
