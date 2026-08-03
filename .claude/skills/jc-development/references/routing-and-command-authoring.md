---
name: routing-and-command-authoring
description: 在新增、修改或评审 jc 命令及其元数据、group 装配、router 分发、Command 基类或帮助输出时加载。
---

加载时机：只要你在新增、修改或评审 command class、group、category、router、类型契约、`Command` 基类、帮助路径或面向用户的输出，都应加载本 reference。

## 类契约与类型

命令由 `src/cli/Command.ts` 的抽象基类定义：

```ts
export abstract class Command implements CommandShape {
  get bin(): string { return META.binaryName }    // canonical 名 getter
  abstract readonly name: string
  abstract readonly description: string
  abstract handler(args: string[]): Promise<void>
  examples?: string[]
  related?: string[]
  helpText?: string
  alias?: string[]
  platform?: 'all' | 'win32'
}
```

- `bin` getter 返回 `META.binaryName`（来自 `src/shared/meta.ts`，值 `'jc'`）。子类在 metadata 模板字符串里用 `${this.bin}` 引用，源码层不硬编码 `'jc'`。
- `name` / `description` / `handler` 是 `abstract`，子类必须实现（用 class field initializer 赋值即可）。
- 可选字段保持 `undefined` 语义：**不要**给默认 `[]`（会改变 `output.ts` 的 undefined-vs-empty 守卫行为）。

`CommandShape` interface 仍在 `src/cli/types.ts:3-12`（router/output 按结构性类型消费）；`Category` / `Group` 同处定义。class `implements CommandShape` 仅作编译期检查，interface 保留不变。

## 标准命令文件形态

每个命令文件采用**双导出**模式，保留对 group index、router spy 与 `await import('{ handler }')` 测试的兼容：

```ts
// src/groups/w/proc/kill.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { error, cliText } from '../../../cli/output.js'
import { Command } from '../../../cli/Command.js'

// 1. 顶层 executor：原 handler body，不依赖 this
async function executeKill(args: string[]): Promise<void> {
  if (args.length === 0) { console.error(error('❌ 请指定 PID')); process.exit(1) }
  // ... 业务逻辑原样保留
}

// 2. class：metadata + handler method 转调 executor
export class KillCommand extends Command {
  name = 'k'
  description = '按 PID 杀进程'
  helpText = `用法:\n  ${this.bin} w k <PID>  - 强制结束指定 PID`
  examples = [`${this.bin} w k 1234`]
  related = [`${this.bin} w p`, `${this.bin} w pk`, `${this.bin} w kn`, `${this.bin} w ps`]

  async handler(args: string[]): Promise<void> {
    return executeKill(args)
  }
}

// 3. 单例 + 顶层 handler 适配器
export const commandDef = new KillCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
```

关键约束：

- **executor 不要用 `this`**。保持纯函数语义，避免解构/调用路径上的隐式绑定丢失（`cmd.handler()` 是隐式绑定，但独立引用会丢）。
- **class 名** PascalCase + `Command` 后缀（`KillCommand` / `ExportCommand`）。从文件名推导（`kill.ts` → `KillCommand`）。
- **metadata 里的 `jc` 一律写 `${this.bin}`**（模板字符串，反引号）。不要写双引号字面 `'${this.bin}'`——那不会求值。

## 路由流程

1. `parseArgs`（`src/cli/router.ts:21-25`）把 argv 转成 `{ group, command, args }` 或 `null`。
2. `registerGroup`（`src/cli/router.ts:30-33`）同时按 `group.name` 与 `group.alias` 注册每个 group（`src/cli/router.ts:35-38`）。
3. `route`（`src/cli/router.ts:54`）处理三条主分支：
   - **无参数**：打印顶层组帮助。
   - **列表/帮助**：`printGroupHelp`（`src/cli/output.ts:69`）、`printCategoryHelp`（`src/cli/output.ts:88`）、`printCommandHelp`（`src/cli/output.ts:49`）。
   - **命令解析**：展平直接挂载与 category 挂载的命令，按 `name` 或 `alias` 匹配，强制 `platform`（`src/cli/router.ts:115`）后调用 `await cmd.handler(parsed.args)`。

仅传入 group（不传子命令）时，若 `group.defaultHandler` 存在则调用之（`src/cli/router.ts:95-97`），否则打印 group 帮助。`claude` 与 `happy` group 设了默认值；`w` 与 `mgr` 未设。

## 帮助渲染层（cliText 替换）

`output.ts` 的 `cliText(template)`（`src/cli/output.ts:26-34`）在运行时把模板里的 standalone `jc` token 替换成当前 CLI 名（默认 `jc`；用户配 `JC_CLI_NAME=bb` 或 `jc mgr cname set bb` 时变 `bb`）。`printCommandHelp` 对 `helpText` / `examples` / `related` 每项过 `cliText()`。

- 因此 class 字段里写 `${this.bin} w k` → 求值成 `'jc w k'` → `cliText` 替换成 `'bb w k'`。两步串行：class 字段在 `new` 时拼成 canonical，渲染时替换为运行时名。
- `cliText` 正则 `(^|[\s|;])jc(?=[\s|;]|$)` 只匹配 standalone token，不误伤 `/jc/` 路径、`JC_REGISTRY_PATH`、`jcVersion` 等。
- handler 里直接输出的用法串（如 `error(cliText('用法: jc mgr add ...'))`）也走同一替换路径。

面向用户的状态文本用 `src/cli/output.ts:5-9` 导出的 `error` / `warning` / `success` / `cliText` token。不要在命令模块里加内联 `chalk`。

## 三级帮助

- `jc <g> l` —— group 帮助。
- `jc <g> <cat>` —— category 帮助。
- `jc <g> <cmd> ?`（或 `-h` / `--help`）—— 命令帮助。

帮助由 class metadata 生成；命令行为变化时必须同步更新 `helpText` / `examples` / `related`。

## 新增命令的步骤

1. 创建 `src/groups/<group>/<category?>/<short>.ts`；ESM 相对导入带 `.js` 后缀。
2. 按上面的标准形态写：executor 函数 + `class XxxCommand extends Command` + `commandDef = new XxxCommand()` + 顶层 `handler` 适配器。
3. 需要系统数据时，静态引入 `../../../shared/system/adapter.js` 中对应工厂。
4. 仅 Windows 时加 `platform: 'win32' as const`。缺省即跨平台。
5. 在所属 group/category 索引文件引入 `commandDef` 并加入**且仅加入**一个 `commands` 数组。
6. 三个帮助层级都应展示该命令，且元数据准确描述参数与行为。

## 正反例

**正确示例**：`src/groups/w/proc/kill.ts` 完整的双导出 class 形态；`${this.bin}` 拼模板；executor 不碰 `this`。把它作为目标模板。

**错误示例 —— 双引号字面 `${this.bin}`**：
```ts
examples = ["${this.bin} w k 1234"]   // ❌ 双引号不求值，help 显示字面 ${this.bin}
examples = [`${this.bin} w k 1234`]   // ✓ 反引号模板字符串
```

**错误示例 —— legacy hazard**：`src/groups/w/proc/mem.ts` 在 handler 内执行动态 `await import('../../../shared/system/adapter.js')`。这与兄弟命令不一致，也不是新代码模式；请改用静态顶层 adapter 引入。class 迁移保留了这个动态 import 原样（未纳入重构），新命令不要沿用。

## 注册不变量

每个新的顶层 group 都必须显式修改 router：在 `src/cli/router.ts:35-38` 引入该 group 并调用 `registerGroup`（`src/cli/router.ts:30-33`）。仅创建 group 索引无法让命令可路由。注册同时安装完整名与别名；选择不冲突的别名并验证两种形式都能工作。
