// src/shared/registry/confirm.ts
// 破坏性操作确认提示的独立 helper。
// 设计动机见 docs/superpowers/specs/2026-07-30-jc-mgr-design.md section 5.1 + 后续 Task 3 重构。
// 提升位置：本函数原在 src/groups/w/file/rm.ts:5-13 私有定义；mgr 组（rm / rename）需要复用时
// 提到此处，避免在两个 handler 中各复制一份（也避免每加一条破坏性命令就 copy 一份）。
import { createInterface } from 'readline'

// 在 stdio 上问一句 y/N，返回 boolean。
// 设计要点：
// 1. rl.close() 必调，否则 readline 不会释放 stdin，进程 hang。
// 2. 大小写归一（toLowerCase === 'y'）：与 npm、rm -i 等工具的惯例一致。
// 3. 不读 echo：Linux/macOS 的 readline 默认回显；Windows 上 createInterface 也会回显。
//    若需要密码模式（无回显），要换实现；当前没这需求。
// 4. 只接受 'y'：其它任何输入（含 'Y'、'yes'、''、'n'）都视为"否"。
//    这是 conservative 选择：用户必须明确回答 'y' 才继续。
export function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}