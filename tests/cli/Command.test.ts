import { describe, it, expect } from 'vitest'
import { META } from '../../src/shared/meta.js'

describe('Command base class', () => {
  it('bin getter returns META.binaryName', async () => {
    const { Command } = await import('../../src/cli/Command.js')
    class Stub extends Command {
      name = 'stub'
      description = 'stub desc'
      async handler() { /* noop */ }
    }
    const s = new Stub()
    expect(s.bin).toBe(META.binaryName)
    expect(s.bin).toBe('jc')
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
    // canonical binary name 拼在字段里，运行时由 cliText 替换为用户配置
    expect(s.examples).toEqual(['jc w k 1234'])
    expect(s.helpText).toBe('用法:\n  jc w k <PID>')
  })
})
