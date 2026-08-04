// src/shared/registry/confirm.ts
// 破坏性操作确认提示的独立 helper。
// 提升位置：本函数原在 src/groups/w/file/rm.ts:5-13 私有定义；mgr 组（rm / rename）需要复用时
// 提到此处，避免在两个 handler 中各复制一份（也避免每加一条破坏性命令就 copy 一份）。
//
// 实现：复用 prompt.ts 的行读取 + TTY 检测，避免在测试中需要单独 mock 第二个 readline 实例。
// 设计要点：
// 1. 严格 y-only：只 'y'（小写）算 yes。其他任何输入都视为 no。
// 2. 复用 prompt 的非 TTY 语义：管道 / CI 下 confirm 也立即抛 NoTTYError，
//    调用方应先确保 isInteractive() 或显式参数足够。
import { isInteractive, prompt, NoTTYError } from './prompt.js'

export { NoTTYError }

export async function confirm(promptText: string): Promise<boolean> {
  if (!isInteractive()) throw new NoTTYError()
  const answer = await prompt(promptText)
  return answer.toLowerCase() === 'y'
}