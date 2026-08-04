// src/shared/registry/types.ts
// jc mgr 持久化层与 handler 抽象共用的核心类型。
// 这是"状态形状"的真相来源：磁盘上的 registry.json 长什么样、handler 怎么处理、router 怎么读，
// 全部以这个文件为准。改它 = 破坏 schema，向后兼容需递增 version。
export type RegistryItemKind = 'npm' | 'py' | 'exe'

// alias 的硬约束：1-32 个字符，开头必须小写字母或数字。
// 选这个正则：1) 跨 shell 安全（无空格、无特殊字符）；2) 与 npm package name 风格相近；
// 3) 大小写归一（小写），让 store 查询与 add 输入两边都不必关心大小写。
export const ALIAS_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/

export interface RegistryItem {
  // 三种 kind 用同一形状，靠 kind 字段区分（discriminated union 而非独立 schema）。
  // 设计动机：add/list/run/rm/rename/import 等命令的代码按统一 shape 处理 kind 差异，
  // 新加 kind 只需在 handlers/ 加一个类即可，不动 commands。
  kind: RegistryItemKind
  // 用户输入的原始来源：npm 包名（含 @scope/name）、URL（http(s)://...）、或本地路径。
  // 一旦写入不修改：跨设备 import 时仍指向同一源；add 二次重验证时也对比这个。
  source: string
  // 用户起的别名（小写）；registry 永远存小写（add 强制 toLowerCase）。
  alias: string
  // 简介：list 输出表格里展示，import 时不要求有值。
  desc: string
  // add 时由 handler.validate() 推导出的最终调用词（如 npx -p <pkg> <bin>）。
  // run 时 handler.run 直接拿这个去 spawn，不重新构造。
  exec: string
  // 可选：每次 run 时附加在 user args 之前。
  // 设计意图：让 user 把"固定参数"（如 --yes、--no-color）记到 registry 里，免去每次手敲。
  args?: string[]
  // ISO 8601 时间戳；add 时写入、check 成功后刷新 sourceVerifiedAt。
  // 不存 Unix 时间戳（毫秒）是为人类可读与跨语言兼容。
  createdAt: string
  sourceVerifiedAt: string
}

export interface RegistryFile {
  // schema 版本：当前 1。
  // 任何破坏性变更（字段重命名/删除/类型变化）必须递增 version，
  // 并在 store.readRegistry() 里对不识别的 version 抛错而不是静默兜底。
  version: 1
  // 数组按 add 时间顺序保存；list 默认按数组顺序展示（即注册顺序）。
  // 不做排序索引：命令调用都是按 alias 查（O(n) 但 n 极小），不值得引入复杂度。
  items: RegistryItem[]
}
