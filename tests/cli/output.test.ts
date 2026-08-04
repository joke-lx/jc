import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { CLI_TOKEN } from '../../src/shared/meta.js'

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

  it('cliText leaves a string without {cli} untouched', async () => {
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('hello world')).toBe('hello world')
  })

  it('cliText replaces {cli} with default name jc', async () => {
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('{cli} mgr list')).toBe('jc mgr list')
  })

  it('cliText replaces {cli} with configured alias bb', async () => {
    const store = await import('../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('{cli} mgr list')).toBe('bb mgr list')
    expect(cliText('cat r.json | {cli} mgr import')).toBe('cat r.json | bb mgr import')
    expect(cliText('{cli}; {cli} mgr list')).toBe('bb; bb mgr list')
  })

  it('cliText does NOT touch /jc/ paths, env names, or identifiers (no {cli} there)', async () => {
    const store = await import('../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    const { cliText } = await import('../../src/cli/output.js')
    // {cli} 不会出现在这些位置——字面替换零误伤，无需正则避让。
    expect(cliText('store in /jc/registry.json')).toBe('store in /jc/registry.json')
    expect(cliText('export JC_REGISTRY_PATH=...')).toBe('export JC_REGISTRY_PATH=...')
    expect(cliText('field jcVersion=0.1')).toBe('field jcVersion=0.1')
  })

  it('cliText handles JC_CLI_NAME env with higher priority than config', async () => {
    const store = await import('../../src/shared/config/store.js')
    store.setConfiguredCliName('bb')
    process.env.JC_CLI_NAME = 'cc'
    const { cliText } = await import('../../src/cli/output.js')
    expect(cliText('{cli} mgr list')).toBe('cc mgr list')
  })

  it('printCommandHelp replaces {cli} in helpText, examples, and related', async () => {
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
        helpText: '用法:\n  {cli} w k <PID>  - 强制结束指定 PID',
        examples: ['{cli} w k 1234'],
        related: ['{cli} w p', '{cli} w pk'],
      }, 'w')
      const joined = logs.join('\n')
      // helpText 里的 {cli} 必须被替换成 bb
      expect(joined).toContain('bb w k <PID>')
      expect(joined).not.toContain('{cli} w k <PID>')
      // examples / related 也替换
      expect(joined).toContain('bb w k 1234')
      expect(joined).toContain('bb w p')
    } finally {
      spy.mockRestore()
    }
  })

  it('CLI_TOKEN is {cli} (guard: metadata must use this placeholder)', () => {
    expect(CLI_TOKEN).toBe('{cli}')
  })
})

describe('metadata guard: no bare jc in command metadata', () => {
  // 守卫：所有命令 class 的 examples / helpText / related 必须用 {cli} 占位符，
  // 不能有裸 'jc ' token。漏过 cliText() 的字段会显示字面 {cli}（响亮失败），
  // 这条断言兜底，防止新命令手写 'jc'。
  it('every group command metadata uses {cli}, not bare jc', async () => {
    const groups = [
      await import('../../src/groups/claude/index.js'),
      await import('../../src/groups/happy/index.js'),
      await import('../../src/groups/mgr/index.js'),
      await import('../../src/groups/w/index.js'),
    ]
    const bareJcRe = /(^|\s)jc(?=\s|$)/  // 独立 jc token，前后空白/行首行尾
    const offenders: string[] = []
    for (const g of groups) {
      const group = g.claudeGroup ?? g.happyGroup ?? g.mgrGroup ?? g.wGroup
      const commands = group.categories
        ? group.categories.flatMap((c: any) => c.commands).concat(group.commands)
        : group.commands
      for (const cmd of commands) {
        for (const field of ['helpText'] as const) {
          if (cmd[field] && bareJcRe.test(cmd[field])) {
            offenders.push(`${group.name}.${cmd.name}.${field}: ${cmd[field]}`)
          }
        }
        for (const arrField of ['examples', 'related'] as const) {
          if (cmd[arrField]) {
            for (const s of cmd[arrField]) {
              if (bareJcRe.test(s)) {
                offenders.push(`${group.name}.${cmd.name}.${arrField}: ${s}`)
              }
            }
          }
        }
      }
    }
    expect(offenders).toEqual([])
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
