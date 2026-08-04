import { describe, it, expect } from 'vitest'
import { CLI_TOKEN } from '../../src/shared/meta.js'

describe('Command base class', () => {
  it('bin getter returns the {cli} placeholder', async () => {
    const { Command } = await import('../../src/cli/Command.js')
    class Stub extends Command {
      name = 'stub'
      description = 'stub desc'
      async handler() { /* noop */ }
    }
    const s = new Stub()
    // bin getter 返回渲染占位符 {cli}，渲染时由 cliText() 替换成当前 CLI 名。
    expect(s.bin).toBe(CLI_TOKEN)
    expect(s.bin).toBe('{cli}')
  })

  it('subclass instance satisfies structural Command interface', async () => {
    const { Command } = await import('../../src/cli/Command.js')
    // 关键：class 实例能赋给 structural interface（router/output 消费方式不变）
    const { Command: CommandShape } = await import('../../src/cli/types.js')
    class Stub extends Command {
      name = 'stub'
      description = 'stub desc'
      examples = ['stub example']
      related = ['stub related']
      async handler() { /* noop */ }
    }
    const instance: CommandShape = new Stub()
    expect(instance.name).toBe('stub')
    expect(instance.description).toBe('stub desc')
    expect(instance.examples).toEqual(['stub example'])
    expect(instance.related).toEqual(['stub related'])
    expect(typeof instance.handler).toBe('function')
  })

  it('subclass can use ${this.bin} in metadata', async () => {
    const { Command } = await import('../../src/cli/Command.js')
    class Stub extends Command {
      name = 'stub'
      description = 'stub desc'
      examples = [`${this.bin} w k 1234`]
      helpText = `用法:\n  ${this.bin} w k <PID>`
      async handler() { /* noop */ }
    }
    const s = new Stub()
    // ${this.bin} 求值成占位符 {cli}，运行时由 cliText 替换为用户配置
    expect(s.examples).toEqual(['{cli} w k 1234'])
    expect(s.helpText).toBe('用法:\n  {cli} w k <PID>')
  })
})
