---
name: project-map
description: 打开任何开发任务时先加载这份 reference，用于确认包身份、运行时数据流与模块归属；阅读本 skill 的其他 reference 之前先读这一份。
---

# project-map

打开 `je-cd`（`jc`）CLI 的任何开发任务时，先读这一份：它锁定包身份、`process.argv` 到命令处理器的请求路径、`src/` 下的目录结构，以及一个会让 import 报错的 ESM 陷阱。本 skill 的其他 reference 之前先读本文件。

## 包身份

| 字段 | 值 | 来源 |
|---|---|---|
| 包名 | `je-cd` | `package.json` `name` |
| CLI 可执行名 | `jc` | `package.json` `bin.jc`（入口 `dist/index.js`） |
| 模块类型 | ESM（`"type": "module"`） | `package.json` `type` |
| Node 目标 | Node 18（构建目标） | `tsup.config.ts:6` `target: 'node18'` |
| 许可证 | MIT | `package.json` `license` |
| 仓库 | `https://github.com/joke-lx/jc.git` | `package.json` `repository.url` |

## 运行时数据流

`process.argv` 进入入口，再由 router 选定 `Group` 并派发到 `Command` 或 `Category`。按下面的流程追踪任何 `jc <group> <command>` 调用。

```text
process.argv
  -> src/index.ts:6            argv = process.argv.slice(2)
  -> src/cli/router.ts:37      route(argv)
  -> src/cli/router.ts:28-31   registerGroup(group)        // groups[name] = groups[alias] = group
  -> Group                     groups[parsed.group]
  -> Command / Category        group.commands, group.categories[*].commands
  -> src/cli/router.ts:92      await cmd.handler(parsed.args)
```

同一 router 的旁支：`parsed.command === 'l'` 打印组帮助（`src/cli/router.ts:60-63`）；`parsed.command === ''` 在 `group.defaultHandler` 已定义时调用之（`src/cli/router.ts:65-73`）；`?` / `-h` / `--help` 三个帮助标志短路到 `printCommandHelp`（`src/cli/router.ts:82-85`）；`cmd.platform === 'win32'` 强制仅限 Windows 的命令（`src/cli/router.ts:87-90`）。

## 模块归属

| 目录 | 归属职责 | 下游消费者 |
|---|---|---|
| `src/index.ts` | 单一入口：`process.argv.slice(2)` → `route(argv)`；`tsup` 的构建入口 | 由 `tsup`（`tsup.config.ts:3`）打包为 `dist/index.js` |
| `src/cli/` | router、输出格式化、类型契约（`Group` / `Category` / `Command`） | 入口、所有 group，以及 `tests/cli/router.test.ts` 都会消费 |
| `src/shared/system/` | 平台无关的 `systeminformation` 适配器；`src/shared/system/adapter.ts` 是唯一引入面 | 所有 `w` 组命令都会引入（如 `src/groups/w/proc/port.ts:2`） |
| `src/groups/w/` | Windows 命令面，按 category 组织（`proc` / `sys` / `net` / `file` / `svc` / `pwr` / `reg` / `task` / `tools` / `user` / `wsl`）；`src/groups/w/index.ts` 组装 `wGroup` | 在 router 中注册为 `wGroup`（`src/cli/router.ts:35`） |
| `src/groups/claude/` | Claude Code 启动包装（`run.ts`）以及注册 `claudeGroup` 的 `index.ts` | 在 router 中注册为 `claudeGroup`（`src/cli/router.ts:33`） |
| `src/groups/happy/` | Happy CLI 启动包装（`stop.ts`、`index.ts`）注册 `happyGroup` | 在 router 中注册为 `happyGroup`（`src/cli/router.ts:34`） |
| `tests/` | Vitest 套件；与 `src/` 布局镜像（`tests/cli/router.test.ts`、`tests/shared/system/*.test.ts`） | 通过 `npm test` 运行（`package.json` `scripts.test`） |
| `.github/workflows/` | 发布自动化：`release-please.yml`（版本管理）与 `npm-publish.yml`（发布） | 在 push 到 `main` 时触发；`npm-publish.yml` 调用 `npm publish --provenance` |

`src/` 下首方文件以 `w` 组为主：薄入口 `src/index.ts`、小型 CLI 层 `src/cli/` 与 `src/shared/system/` 适配器合计约十几份；`src/groups/w/` 贡献大约八十份首方 TypeScript 文件，分布于其 11 个 category，加上大约二十个顶层 group 索引文件（claude/happy/w）。数量为近似估计，用来衡量改动规模，而非精确计数；在对外引用任何数字前，请用 `find src -name '*.ts' | wc -l` 自校。

## ESM `.js` 导入后缀规则

TypeScript 源码是 ESM，Node 运行时不会自动补扩展名，因此每个相对导入都必须以 `.js` 结尾，即便磁盘上的文件是 `.ts`。在 `tsup` 下编译没问题，但运行时会抛 `ERR_MODULE_NOT_FOUND`。

```ts
// src/groups/w/proc/port.ts:2
import { getProcessManager } from '../../../shared/system/adapter.js'
```

## 跳转链接

- 本 skill 的设计规范：`docs/superpowers/specs/2026-07-29-jc-development-skill-design.md`
- 项目原始规范：`docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md`
- 项目原始实施计划：`docs/superpowers/plans/2026-06-20-jc-implementation.md`
