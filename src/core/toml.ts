// src/core/toml.ts
// builtin.toml 加载 + schema 校验。
//
// 职责：
// 1. 读 src/core/builtin.toml（声明式命令注册表）。
// 2. smol-toml 解析成对象。
// 3. 对每条 [[command]] 跑 capabilities[hook].parse(with) —— 加载期全量校验
//    （= mgr doctor 的检查点），配置错误在启动时暴露，不是执行到那条命令才炸。
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { parse } from 'smol-toml'
import { getCapability } from './capabilities.js'
import type { TOMLCommand } from './types.js'

// builtin.toml 与当前文件同目录（src/core/）。
const builtinPath = join(dirname(new URL(import.meta.url).pathname), 'builtin.toml')

export function getBuiltinPath(): string {
  return builtinPath
}

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

// 加载 builtin.toml 文件并返回校验后的命令列表。
export function loadBuiltinCommands(): TOMLCommand[] {
  return parseBuiltinCommands(readFileSync(builtinPath, 'utf-8'))
}
