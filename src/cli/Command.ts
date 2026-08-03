// src/cli/Command.ts
// 所有 command 的抽象基类。
//
// 设计动机：
// - 此前 111 个 command 文件用 object literal 形式（export const commandDef = {...}）。
//   字段里有 177 处字面 'jc' 散落在 examples / related / helpText 里。
// - 抽象成 class 后，子类用 `this.bin` getter（来自 META.binaryName）拼出 metadata，
//   源码层不再硬编码 binary name。
// - 运行时由 output.ts 的 cliText() 把 canonical 'jc' 替换为用户配置的 CLI 名
//   （如 bb），保证 cname 改造的承诺：用户配别名后所有 help 文本跟随变化。
//
// 与 src/cli/types.ts 的 Command interface 关系：
// - interface 保留不变（router/output 都按 structural typing 消费）。
// - 本 class `implements CommandShape` 仅作为 TypeScript 编译期检查。
// - 外部 import 用法：`import { Command } from './cli/Command.js'`（class），
//   或 `import type { Command as CommandShape } from './cli/types.js'`（interface）。
import { META } from '../shared/meta.js'
import type { Command as CommandShape } from './types.js'

export abstract class Command implements CommandShape {
  // 当前 binary 的 canonical name。子类在 metadata 模板字符串里用 `${this.bin}` 拼出。
  // 实现是 getter（每次读 META），不开销在 hot path 上。
  // 不缓存到 constructor 字段：避免 META 未来变可写时实例"陈旧"；也避免子类继承字段时
  // 容易误改。
  get bin(): string {
    return META.binaryName
  }

  // 必填契约。abstract 强制子类必须实现。
  // 用 `readonly` 表达 metadata 字段不应运行时被改。
  abstract readonly name: string
  abstract readonly description: string

  // handler 签名固定。class method 在子类里通过转调 executor 函数实现（见迁移示例）。
  abstract handler(args: string[]): Promise<void>

  // 可选字段：保持 undefined 语义（与 object literal 版本一致）。
  // 不要给默认 []：会改变 output/router 的 undefined-vs-empty 行为。
  // 不要 abstract：字段可选，子类按需覆盖。
  examples?: string[]
  related?: string[]
  helpText?: string
  alias?: string[]
  platform?: 'all' | 'win32'
}
