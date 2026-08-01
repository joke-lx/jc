// src/shared/registry/handlers/index.ts
// 工厂表 + getHandler(kind) 派发函数。
// 选用"全局表 + 延迟初始化"而不是"调用点 switch"：让新增 kind 只需要
// 在表里加一行、调用点零改动。TypeScript 的 Record<RegistryItemKind, ...>
// 会在编译期挡住"忘了加表项"的 bug（少一个 kind 就报错）。
import type { RegistryItemKind } from '../types.js'
import { ItemHandler } from './base.js'
import { NpmItemHandler } from './npm.js'
import { PyItemHandler } from './py.js'
import { ExeItemHandler } from './exe.js'

// 重新导出 ItemHandler 类，让外部只需 import './handlers/index.js' 一次。
export { ItemHandler } from './base.js'

// 工厂表：key 必须是 RegistryItemKind 的三个字面量之一。
// 延迟初始化（每次 getHandler 都 new）保证 handler 内部状态不被跨调用共享。
// 后续若发现 handler 内部无状态，可改成模块级单例以减少分配；目前不需要。
const HANDLERS: Record<RegistryItemKind, () => ItemHandler> = {
  npm: () => new NpmItemHandler(),
  py: () => new PyItemHandler(),
  exe: () => new ExeItemHandler(),
}

export function getHandler(kind: RegistryItemKind): ItemHandler {
  const factory = HANDLERS[kind]
  // 防御性抛出：类型系统已挡住"未知 kind"，但运行时（import 字符串等场景）仍可能传入脏值。
  if (!factory) throw new Error(`未实现的 kind: ${String(kind)}`)
  return factory()
}