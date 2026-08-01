---
name: routing-and-command-authoring
description: 在新增、修改或评审 jc 命令及其元数据、group 装配、router 分发或帮助输出时加载。
---

加载时机：只要你在新增、修改或评审 `commandDef`、group、category、router、类型契约、帮助路径或面向用户的输出，都应加载本 reference。

## 类型契约

路由契约在 `src/cli/types.ts:1-27`：

- `CommandHandler` 类型为 `(args: string[]) => Promise<void>`。
- `Command` 必填 `name`、`description`、`handler`；可选 `alias?: string[]`、`helpText?: string`、`examples?: string[]`、`related?: string[]`，以及 `platform?: 'all' | 'win32'`。
- `Category` 聚合 `name`、`description` 与 `commands: Command[]`。
- `Group` 必填 `name`、`alias`、`description` 与直接的 `commands`；可选 `categories` 与 `defaultHandler`。

所有命令元数据都要与 `commandDef` 同文件存放：`name`、`description`、`helpText`、`examples`、`related`，以及适用时的 `platform`。`alias` 仍是 `Command` 契约的一部分，router 也会用 `alias` 解析命令，尽管当前的命令定义都没有用上；在检查全量命令之前，不要删除或依赖该字段。

## 路由流程

把 `parseArgs` → `route` → 输出辅助函数视作一个心智模型：

1. `parseArgs`（`src/cli/router.ts:19-24`）把 argv 转成 `{ group, command, args }` 或 `null`。
2. `registerGroup`（`src/cli/router.ts:28-31`）同时按 `group.name` 与 `group.alias` 注册每个 group。
3. `route`（`src/cli/router.ts:37-107`）处理三条主分支：
   - **无参数**：打印顶层组帮助。
   - **列表/帮助**：通过 `printCommandHelp`（`src/cli/output.ts:27-45`）、`printGroupHelp`（`src/cli/output.ts:47-64`）或 `printCategoryHelp`（`src/cli/output.ts:66-73`）打印 group、category 或命令帮助。
   - **命令解析**：展平直接挂载与 category 挂载的命令，按 `name` 或 `alias` 匹配，强制 `platform` 后再调用 handler。

仅传入 group（不传子命令）时，若 `defaultHandler` 存在则调用之，否则打印 group 帮助（`src/cli/router.ts:65-73`）。当前 `claude` 与 `happy` group 设置了默认值（`src/groups/claude/index.ts:7-11`、`src/groups/happy/index.ts:10-14`）；`w` group 未设置（`src/groups/w/index.ts:166-171`）。

## 三级帮助

公开帮助模型分三级：

- `jc <g> l` —— group 帮助，路由位置 `src/cli/router.ts:61-64`。
- `jc <g> <cat>` —— category 帮助，路由位置 `src/cli/router.ts:97-103`。
- `jc <g> <cmd> ?` —— 命令帮助，路由位置 `src/cli/router.ts:83-86`。同分支也接受 `-h` 与 `--help`。

帮助由各 handler 旁的元数据生成，因此命令行为变化时必须同步更新 `helpText`、`examples` 与 `related`。

## 新增命令的步骤

1. 在 ESM 源码树下创建 `src/groups/<group>/<category?>/<short>.ts`；TypeScript 相对导入需带 `.js` 后缀。
2. 导出 `handler(args: string[]): Promise<void>` 与 `commandDef`。在 `commandDef` 中与 `name`、`description`、`helpText`、`examples`、`related` 同文件存放。
3. 需要系统数据时，静态引入 `../../../shared/system/adapter.js` 中对应的 `getXManager` 工厂（仅当命令不在 category 下时调整相对深度）。
4. 仅 Windows 时，在 `commandDef` 中加 `platform: 'win32'`。只在显式声明有意义时用 `'all'`；缺省即视为跨平台。
5. 在所属 group/category 索引文件中引入 `commandDef`，并加入**且仅加入**一个 `commands` 数组。例如 category 化后的 `w` 命令归 `src/groups/w/index.ts:1-171`；直接挂载的 group 用自己的索引，如 `src/groups/claude/index.ts:1-11`。
6. 确认三个帮助层级都能展示该命令，且所有元数据都准确描述了实际参数与行为。

## 正反例

**正确示例**：`src/groups/w/proc/port.ts:30-37` 提供了完整、静态的 `commandDef`；其 adapter 依赖在 `src/groups/w/proc/port.ts:2` 处静态引入。把这个形态作为目标命令模板。

**错误示例 —— legacy hazard**：`src/groups/w/proc/mem.ts:3` 在 handler 内执行动态 `await import('../../../shared/system/adapter.js')`。这与兄弟命令不一致，也不是新代码的模式；请改用静态的顶层 adapter 引入。

## 输出 token 规则

面向用户的状态文本请引入并使用 `src/cli/output.ts:4-9` 导出的 `error`、`warning`、`success` 三个 token。

- 不要在命令模块里加内联 `chalk` 样式。
- 面向用户的错误不要用裸 `console.error`；用共享的 `error` token 包裹信息。
- 普通数据输出可继续按需用 `console.log` 或 `console.table`。

## 注册不变量

每个新的顶层 group 都必须显式修改 router：在 `src/cli/router.ts:33-35` 的注册位置引入该 group 并调用 `registerGroup`。仅仅创建 group 索引无法让命令可路由。注册会同时安装完整名与 group 别名（经由 `src/cli/router.ts:28-31`）；请选择不冲突的别名，并验证两种形式都能工作。
