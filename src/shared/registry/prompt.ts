// src/shared/registry/prompt.ts
// 交互式输入的共享 helper：prompt / promptChoice / isInteractive。
//
// 设计动机：
// 1. 各 mgr handler 在 TTY 下都可能进入"缺参"分支，逐步问用户填齐。
//    把读行的逻辑提到此处，避免在每个 handler 里复制。
// 2. 非 TTY 必须显式报错退出——CI / 管道下 readline 会 hang。
// 3. 测试可注入：handler 不直接读 process.stdin，而是用 prompt()；
//    测试用自定义 Writable 输入流喂入行数据。
//
// 实现要点：不用 readline.createInterface（它在 terminal:false 下与 push(null) 的
// 组合会出现 "readline was closed"，且多行 buffer 行为不稳定）。改用一个简单的
// "行缓冲"：每次 prompt() 调用等待下一行（包括可选 EOF 时返回剩余内容）。
import { Writable } from 'stream'

export class NoTTYError extends Error {
  constructor(msg = '非 TTY：无法交互') {
    super(msg)
    this.name = 'NoTTYError'
  }
}

/** TTY 检测：stdin + stdout 都要是 TTY；否则视为不可交互。 */
export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

// 当前输入流（生产 = process.stdin，测试 = 注入）。同一进程内允许替换。
let inputStream: NodeJS.ReadableStream & { isTTY?: boolean } = process.stdin
let outputStream: NodeJS.WritableStream = process.stdout

// 行缓冲：累积的字节 + 是否 EOF。
interface LineBuffer { pending: string; eof: boolean }
const buf: LineBuffer = { pending: '', eof: false }

// 全局监听器引用（让 _resetPromptIO 时能 removeListener）。
function onDataGlobal(chunk: unknown) {
  buf.pending += typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
}
function onEndGlobal() { buf.eof = true }
function onCloseGlobal() { buf.eof = true }

function attachInput(s: NodeJS.ReadableStream): void {
  s.setEncoding?.('utf-8')
  s.on?.('data', onDataGlobal)
  s.on?.('end', onEndGlobal)
  s.on?.('close', onCloseGlobal)
}
attachInput(inputStream)

// 测试 / 重置：替换底层流。生产代码不要调。
export function _resetPromptIO(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): void {
  // 移除旧 stream 的监听器（避免 module-init 时挂的旧 listener 继续消费 process.stdin）
  inputStream.off?.('data', onDataGlobal)
  inputStream.off?.('end', onEndGlobal)
  inputStream.off?.('close', onCloseGlobal)

  inputStream = input as any
  outputStream = output
  buf.pending = ''
  buf.eof = false
  attachInput(inputStream)
}

export function _closePromptIO(): void {
  buf.pending = ''
  buf.eof = true
}

// 等到 buffer 里有完整一行（\n）后返回它；EOF 时返回剩余内容（可能为空）。
function nextLine(): Promise<string> {
  return new Promise<string>((resolve) => {
    const tryRead = () => {
      const i = buf.pending.indexOf('\n')
      if (i >= 0) {
        const line = buf.pending.slice(0, i).replace(/\r$/, '')
        buf.pending = buf.pending.slice(i + 1)
        resolve(line)
        return true
      }
      if (buf.eof) {
        const line = buf.pending
        buf.pending = ''
        resolve(line)
        return true
      }
      return false
    }
    if (tryRead()) return
    // 还没数据：监听 data / end / close
    const onData = (chunk: unknown) => {
      const s = typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
      buf.pending += s
      if (tryRead()) cleanup()
    }
    const onEnd = () => { buf.eof = true; if (tryRead()) cleanup() }
    const onClose = () => { buf.eof = true; if (tryRead()) cleanup() }
    const cleanup = () => {
      inputStream.off?.('data', onData)
      inputStream.off?.('end', onEnd)
      inputStream.off?.('close', onClose)
    }
    inputStream.on?.('data', onData)
    inputStream.on?.('end', onEnd)
    inputStream.on?.('close', onClose)
  })
}

/** 问一个问题，返回 trim 后的用户输入。非 TTY 抛 NoTTYError。 */
export async function prompt(question: string): Promise<string> {
  if (!isInteractive()) throw new NoTTYError()
  // 把 prompt 文本写到 output（用 write 不会自动加 \n）。
  ;(outputStream as Writable).write?.(question)
  return (await nextLine()).trim()
}

/** 从给定选项里选一个。非 TTY 抛 NoTTYError。用户输入为空 → 返回 undefined。 */
export async function promptChoice<T>(
  question: string,
  choices: { label: string; value: T }[],
): Promise<T | undefined> {
  if (!isInteractive()) throw new NoTTYError()
  if (choices.length === 0) throw new Error('promptChoice: choices 不能为空')
  const numbered = choices
    .map((c, i) => `  ${i + 1}) ${c.label}`)
    .join('\n')
  ;(outputStream as Writable).write?.(`${question}\n${numbered}\n选择 [1-${choices.length}]: `)
  while (true) {
    const raw = (await nextLine()).trim()
    if (!raw) return undefined
    const n = Number(raw)
    if (Number.isInteger(n) && n >= 1 && n <= choices.length) {
      return choices[n - 1]!.value
    }
    ;(outputStream as Writable).write?.(`无效输入: ${raw}\n选择 [1-${choices.length}]: `)
  }
}

export function closePromptIO(): void {
  _closePromptIO()
}