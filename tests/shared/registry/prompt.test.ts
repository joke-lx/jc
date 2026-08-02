// tests/shared/registry/prompt.test.ts
// 覆盖 prompt.ts：
// - isInteractive() TTY 检测
// - prompt() 读单行 + trim
// - prompt() NoTTYError
// - promptChoice() 合法编号 / 空输入
// - 非交互命令不会被 prompt 模块的 stdin 监听器吊住（进程能正常退出）
//
// 不测多行序列（涉及 stream push 时机，生产路径走 process.stdin 直接没问题）。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Readable, Writable } from 'stream'
import { spawnSync } from 'child_process'
import { join } from 'path'

function fakeTTY(inputs: string[]) {
  const stdin = new Readable({ read() {} })
  for (const s of inputs) stdin.push(s + '\n')
  stdin.push(null)
  const stdout = new Writable({ write(_c, _e, cb) { cb() } })
  return { stdin, stdout }
}

describe('prompt', () => {
  let origStdinIsTTY: boolean | undefined
  let origStdoutIsTTY: boolean | undefined

  beforeEach(() => {
    origStdinIsTTY = process.stdin.isTTY
    origStdoutIsTTY = process.stdout.isTTY
  })

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: origStdinIsTTY, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: origStdoutIsTTY, configurable: true })
    vi.restoreAllMocks()
  })

  it('isInteractive true when both TTY', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    const { isInteractive } = await import('../../../src/shared/registry/prompt.js')
    expect(isInteractive()).toBe(true)
  })

  it('isInteractive false when stdin not TTY', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    const { isInteractive } = await import('../../../src/shared/registry/prompt.js')
    expect(isInteractive()).toBe(false)
  })

  it('prompt throws NoTTYError when not interactive', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    const { prompt, NoTTYError } = await import('../../../src/shared/registry/prompt.js')
    await expect(prompt('q? ')).rejects.toBeInstanceOf(NoTTYError)
  })

  it('prompt reads one line and trims', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    const { prompt, _resetPromptIO } = await import('../../../src/shared/registry/prompt.js')
    const { stdin, stdout } = fakeTTY(['  hello world  '])
    _resetPromptIO(stdin, stdout)
    const ans = await prompt('q? ')
    expect(ans).toBe('hello world')
  })

  it('promptChoice returns value for valid number', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    const { promptChoice, _resetPromptIO } = await import('../../../src/shared/registry/prompt.js')
    const { stdin, stdout } = fakeTTY(['2'])
    _resetPromptIO(stdin, stdout)
    const v = await promptChoice('Pick:', [{ label: 'a', value: 'A' }, { label: 'b', value: 'B' }])
    expect(v).toBe('B')
  })

  it('promptChoice returns undefined on empty input', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    const { promptChoice, _resetPromptIO } = await import('../../../src/shared/registry/prompt.js')
    const { stdin, stdout } = fakeTTY([''])
    _resetPromptIO(stdin, stdout)
    const v = await promptChoice('Pick:', [{ label: 'a', value: 'A' }])
    expect(v).toBeUndefined()
  })
})

// 回归测试：非交互命令不能被 prompt 模块的 stdin 监听器吊住。
// 现象（fixed）：prompt.ts 模块顶层曾无条件 attachInput(process.stdin)，
// 任何 import 了它的命令（如 jc l）打印完输出后，进程因 stdin 有活动监听器而无法空转退出。
// 断言：子进程在 timeout 内正常 exit 0。
describe('prompt module does not keep the process alive', () => {
  it('jc l exits cleanly (stdin listeners are not attached at import time)', () => {
    const dist = join(process.cwd(), 'dist', 'index.js')
    const r = spawnSync(process.execPath, [dist, 'l'], {
      encoding: 'utf-8',
      timeout: 10000, // 10s 内必须退出
    })
    expect(r.status).toBe(0)
    expect(r.error).toBeUndefined()
    expect(r.stdout).toContain('j 命令套件')
  })

  it('jc m list exits cleanly (non-interactive mgr command)', () => {
    const dist = join(process.cwd(), 'dist', 'index.js')
    const r = spawnSync(process.execPath, [dist, 'm', 'list'], {
      encoding: 'utf-8',
      timeout: 10000,
    })
    expect(r.status).toBe(0)
    expect(r.error).toBeUndefined()
  })
})