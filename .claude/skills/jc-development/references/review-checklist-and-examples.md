---
name: review-checklist-and-examples
description: 仅在评审时加载：按 jc-development 的 reference 检查 PR，并查阅常用的好/坏例子目录。
---

加载时机：当你准备评审一个触及 `jc` CLI 的 PR，或者在提 PR 前做自检时，打开本 reference。它汇总了连接其他六份 reference 的预合并检查清单，以及评审员最常引用的一套好/坏例子目录。**不要**在初次开发时加载本文件；按面拆分的 reference 才是写作时的真理来源。

## 预合并检查清单

把下列问题对每个 PR 都跑一遍。每一项都链接到解释"为什么重要"的 reference；批准前先打开链接。

- 是否新增或修改了 router 面向的面（`commandDef`、group、category、help、输出 token）？→ 见 [routing-and-command-authoring](routing-and-command-authoring.md)。
- 是否新增或触及 router 测试？触及的面与测试必须在同一次提交中落地。→ 见 [testing-and-verification](testing-and-verification.md)。
- handler 是否派生过子进程、是否插值过用户参数、是否门禁过平台、是否设置过退出码，或提示过确认？→ 见 [execution-safety-and-platforms](execution-safety-and-platforms.md)。
- 是否新增了系统资源，或 handler 是否直接触达 `systeminformation`？→ 见 [system-adapters](system-adapters.md)。
- 是否改了 workflow 文件（`release-please.yml`、`npm-publish.yml`），或动了 `package.json` 的 `name` / `repository` / `version`？→ 见 [release-and-publishing](release-and-publishing.md) 与 `.claude/skills/gh-action/SKILL.md` 的 `npm-publish` ref（`references/npm-publish.md`）。
- 本会话是第一次打开本项目？请先读 [project-map](project-map.md) 复习包身份、运行时数据流以及 ESM `.js` 导入后缀规则。

若任一项适用而对应 reference 未被遵守，驳回 PR，并要求在同一次提交中修复。"follow-up issue" 不是可接受的替代。

## 好/坏例子对照

下列对照都标注了精确的 `file:line` 区间。当评审员问"正确写法是什么？"时，可以直接引用作一行答复。

### 命令编写

**好**：`src/groups/w/proc/port.ts:30-37` 提供完整、静态的 `commandDef`，含 `name`、`description`、`handler`、`helpText`、`examples`、`related`。adapter 依赖是一处静态引入，在 `src/groups/w/proc/port.ts:2`。

**坏（legacy hazard）**：`src/groups/w/proc/mem.ts:3` 在 handler 内执行动态 `await import('../../../shared/system/adapter.js')`。与兄弟命令不一致，也不是新代码的模式；改用静态的顶层 adapter 引入。

### 破坏性操作的确认

**好**：`src/groups/w/file/rm.ts:5-13` 定义了一个基于 `readline` 的独立 `confirm()` helper。每条路径都会关闭接口、接受大小写不敏感的 `y`，且可以独立单元测试。在 `src/groups/w/file/rm.ts:26` 处使用。

**坏（legacy hazard）**：`src/groups/w/reg/regdel.ts:13-18` 使用裸 `process.stdin.once('data', d => resolve(d.toString().trim().toLowerCase()))`。stdin 流只消费了一半（没有 `pause`/`resume`、没有 close），提示也不回显，且不可独立测试。改用 `rm.ts:5-13` 的 helper。

### 用户参数注入

**坏**：`src/groups/w/svc/svcstart.ts:7` 把 `name = args[0]` 插值进 shell 字符串：`execSync(`net start "${name}"`, { stdio: 'inherit' })`。任何对 `cmd.exe` 有意义的字符都会原样流入。

**好（目标形态）**：把参数作为数组传给 `spawn`，并设 `shell: false`，让 Node 的 argv 转义接管。示意：

```ts
// Pattern A: arg-array spawn, no shell
import { spawn } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  const argv = ['start', args[0] ?? '']
  await new Promise<void>((resolve, reject) => {
    const child = spawn('net', argv, { stdio: 'inherit', windowsHide: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })
}
```

对于没有稳定二进制名的 PowerShell cmdlet，通过 stdin 用 `ArgumentList` 驱动 `powershell -NoProfile -Command -`，让用户输入永远不带上命令行。

### Windows 平台门禁

**好**：`src/groups/w/net/wifipwd.ts:23` 在 `commandDef` 上声明 `platform: 'win32'`。router 在 `src/cli/router.ts:88-91` 强制该门禁；handler 端无需再检查。

**坏（legacy hazard —— 重复门禁）**：router 已经强制门禁，但下面这些 handler 又自己检查一遍：

- `src/groups/w/reg/reg.ts:4-6` —— 在 router 门禁之后再写 `function requireWin()`。
- `src/groups/w/task/task.ts:5` —— handler 顶部内联 `if (process.platform !== 'win32')`。
- `src/groups/w/wsl/wsl.ts:5` —— 同样的内联检查。

这三处都早于声明式 `platform: 'win32'` 字段的出现；下次触及对应命令时一并清理。

### 系统信息访问

**好**：handler 从 `src/shared/system/adapter.ts` 引入 adapter 工厂，并消费返回的 `*Manager` 形态。`src/groups/w/proc/port.ts:2` 处静态引入的示例：`import { getProcessManager } from '../../../shared/system/adapter.js'`。

**坏（legacy hazard）**：`src/groups/w/sys/bat.ts:2` 直接引入 `systeminformation`：`import si from 'systeminformation'`。新 handler 在 `src/groups/**` 下不得新增直接 `si` 引入；若没有现成 adapter 暴露所需数据，先把它加进 `src/shared/system/`，再扩展工厂。

### 面向用户的输出

**好**：用 `src/cli/output.ts:7` 导出的共享 `error` token（`export const error = chalk.red`）来包装面向用户的状态文本。handler 内的使用示例：在引入 error token 后调用 `console.error(error('...'))`；普通数据输出可继续用 `console.log` 或 `console.table`。

**坏（legacy hazard）**：裸 `console.error('...')` 不经 token 包裹，或在命令模块内内联 `chalk.red(...)`。两种都绕过了集中化输出约定，将来改样式得对每条命令都扫一遍。

## 评审员口诀

触及某个面却没有测试，那是缺陷，不是欠账。
