import { describe, it, expect } from 'vitest'
import { parseBuiltinCommands } from '../../src/core/toml.js'

describe('parseBuiltinCommands', () => {
  it('empty doc returns empty list', () => {
    expect(parseBuiltinCommands('')).toEqual([])
  })

  it('comment-only doc returns empty list', () => {
    expect(parseBuiltinCommands('# nothing here')).toEqual([])
  })

  it('parses a [[command]] with spawn hook', () => {
    const toml = `
[[command]]
name = "run"
group = "claude"
description = "启动 Claude Code"
examples = ["{cli} c run"]
hook = "spawn"
with = { bin = "claude", args = ["{{@rest}}"] }
danger = "safe"
`
    const cmds = parseBuiltinCommands(toml)
    expect(cmds).toHaveLength(1)
    expect(cmds[0]).toMatchObject({
      name: 'run',
      group: 'claude',
      hook: 'spawn',
      danger: 'safe',
    })
    expect(cmds[0].with).toEqual({ bin: 'claude', args: ['{{@rest}}'] })
  })

  it('rejects a [[command]] missing required name', () => {
    const toml = `
[[command]]
group = "w"
description = "x"
hook = "spawn"
with = { bin = "node" }
`
    expect(() => parseBuiltinCommands(toml)).toThrow(/缺 name/)
  })

  it('rejects unknown hook', () => {
    const toml = `
[[command]]
name = "x"
group = "w"
description = "x"
hook = "no.such"
`
    expect(() => parseBuiltinCommands(toml)).toThrow(/未知 hook: no\.such/)
  })

  it('rejects invalid with (spawn without bin)', () => {
    const toml = `
[[command]]
name = "x"
group = "w"
description = "x"
hook = "spawn"
with = {}
`
    expect(() => parseBuiltinCommands(toml)).toThrow(/with\.bin/)
  })

  it('invalid TOML syntax throws a parse error', () => {
    expect(() => parseBuiltinCommands('[[command]\nname =')).toThrow(/解析失败/)
  })
})
