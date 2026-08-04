// src/core/types.ts
// TOML 化声明式命令模型的共享类型。
//
// 这是"命令注册表"的真相来源：builtin.toml 里的 [[command]] 记录长什么样、
// dispatch 怎么消费、Capability 的 run 拿到的 Ctx 是什么，全部以这个文件为准。
//
// 与 src/cli/types.ts 的 Command 的关系：
// - Command 是当前 class 形态（阶段 3-4 会消亡）。
// - TOMLCommand 是未来声明式形态，metadata 进 TOML，执行逻辑指向 Capability。
// 两者暂时并存（阶段 3-4 过渡期），最终 TOMLCommand 取代 Command 的 metadata 部分。

export interface Param {
  name: string
  type: 'string' | 'int'
  required?: boolean
}

export interface TOMLCommand {
  // 必填：命令名 + 所属 group + 一句话描述。
  name: string
  group: string
  description: string
  // 执行逻辑的插槽：指向 capabilities 注册表里的能力名。
  // hook 是能力名（如 'spawn' / 'proc.kill'），与命令位置（group/name）解耦。
  hook: string
  // hook 的配置。形态由 hook 决定（spawn 读 { bin, args }，open 读 { target }），
  // 但字段名固定为 with，校验只有一条路径 capability.parse(cmd.with)。
  with?: unknown
  // 展示元数据：含 {cli} 占位符，渲染时由 output.ts 的 cliText() 替换。
  examples?: string[]
  helpText?: string
  // 命名参数绑定。无 params = argv 全量透传；有 params = named 绑定 + {{@rest}} 兜底。
  params?: Param[]
  // 附加命令名（router 按 name 或 alias 匹配）。
  alias?: string[]
  // 危险级别：'destructive' 触发 ctx.confirm（dispatch 统一拦截，Capability 无机会绕过）。
  danger?: 'safe' | 'destructive'
  // 平台门禁：如 ['win32']；空 = 全平台。
  platform?: string[]
  // 禁用：false 时 dispatch 拒绝执行。
  enabled?: boolean
}

// dispatch 的上下文：Capability.run 唯一能接触的外部契约。
// dryRun / confirm / audit 由 dispatch 注入，Capability 不自己实现。
export type Ctx = {
  dryRun: boolean
  confirm: (msg: string) => Promise<boolean>
  audit: (hook: string, args: string[]) => void
}
