// src/core/toml.ts
// builtin.toml 加载 + schema 校验。
//
// 职责：
// 1. 引入 src/core/builtin.toml（tsup loader: { '.toml': 'text' }，bundle 进 dist）。
// 2. smol-toml 解析成对象。
// 3. 对每条 [[command]] 跑 capabilities[hook].parse(with) —— 加载期全量校验
//    （= mgr doctor 的检查点），配置错误在启动时暴露，不是执行到那条命令才炸。
import { parse } from 'smol-toml'
import { getCapability } from './capabilities.js'
import type { TOMLCommand } from './types.js'

// 用 tsup 的 .toml loader 把 builtin.toml 内容作为字符串 bundle 进 dist。
// 消除了阶段 2 时"dist 目录里没有 .toml 文件"的坑（readFileSync 找不到）。
// 关键：.toml 文件必须在 src/core/ 目录（与本文件同目录），import 路径是相对文件位置。
// 注意：不需要 `with { type: 'text' }` attribute —— tsup 的 loader: { '.toml': 'text' }
// 已声明 .toml 应作为字符串导入，加 attribute 反而会让 vitest 的 rollup 解析器报
// "Unexpected character"（import attributes 是 ES2024，Vite 2.x 解析器不识别）。
import builtinText from './builtin.toml'

// 从 TOML 文档里提取 [[command]] 数组并校验。
// smol-toml 把 `[[command]]` 解析成 doc.command（数组）。
export function parseBuiltinCommands(raw: string): TOMLCommand[] {
  let doc: Record<string, unknown>
  try {
    doc = parse(raw) as Record<string, unknown>
  } catch (e) {
    throw new Error(`builtin.toml 解析失败: ${(e as Error).message}`)
  }
  const cmds = Array.isArray(doc.command) ? doc.command : []
  const result: TOMLCommand[] = []
  for (const c of cmds) {
    if (!c || typeof c !== 'object') throw new Error(`[[command]] 项必须是对象: ${JSON.stringify(c)}`)
    const cmd = c as TOMLCommand
    // 必填校验：name / group / description / hook
    if (!cmd.name || typeof cmd.name !== 'string') throw new Error(`[[command]] 缺 name`)
    if (!cmd.group || typeof cmd.group !== 'string') throw new Error(`[[command]] ${cmd.name} 缺 group`)
    if (!cmd.description || typeof cmd.description !== 'string') throw new Error(`[[command]] ${cmd.name} 缺 description`)
    if (!cmd.hook || typeof cmd.hook !== 'string') throw new Error(`[[command]] ${cmd.name} 缺 hook`)
    // hook 必须已注册 + with 通过能力自身的 parse 校验
    const cap = getCapability(cmd.hook)
    cap.parse(cmd.with)   // 加载期校验，抛错 = 配置错误
    result.push(cmd)
  }
  return result
}

// 加载 builtin.toml 内容（由 tsup 内联）并返回校验后的命令列表。
// 阶段 3 之前 L1=0；阶段 3 填充 ~40 条；阶段 5 用户配置会与 builtin 合并。
export function loadBuiltinCommands(): TOMLCommand[] {
  return parseBuiltinCommands(builtinText)
}
