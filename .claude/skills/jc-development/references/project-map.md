---
name: project-map
description: 打开任何开发任务时先加载这份 reference，用于确认包身份、运行时数据流与模块归属；阅读本 skill 的其他 reference 之前先读这一份。
---

# project-map

打开 `je-cd`（`jc`）CLI 的任何开发任务时，先读这一份：它锁定包身份、`process.argv` 到命令处理器的请求路径、`src/` 下的目录结构、CLI 名解析链，以及一个会让 import 报错的 ESM 陷阱。本 skill 的其他 reference 之前先读本文件。

## 包身份

| 字段 | 值 | 来源 |
|---|---|---|
| 包名 | `je-cd` | `package.json` `name` |
| CLI 可执行名 | `jc`（用户可通过 `jc mgr cname` 起别名） | `package.json` `bin.jc`（入口 `dist/index.js`）；canonical 名集中在 `src/shared/meta.ts:21` `META.binaryName` |
| 模块类型 | ESM（`"type": "module"`） | `package.json` `type` |
| Node 目标 | Node 18（构建目标） | `tsup.config.ts:6` `target: 'node18'` |
| 许可证 | MIT | `package.json` `license` |
| 仓库 | `https://github.com/joke-lx/jc.git` | `package.json` `repository.url` |

## 运行时数据流

`process.argv` 进入入口，再由 router 选定 `Group` 并派发到 `Command` 或 `Category`。按下面的流程追踪任何 `jc <group> <command>` 调用。

```text
process.argv
  -> src/index.ts:6            argv = process.argv.slice(2)
  -> src/cli/router.ts:54      route(argv)
  -> src/cli/router.ts:30-33   registerGroup(group)        // groups[name] = groups[alias] = group
  -> Group                     groups[parsed.group]
  -> Command / Category        group.commands, group.categories[*].commands
  -> src/cli/router.ts         await cmd.handler(parsed.args)
```

router 旁支：`parsed.command === 'l'` 打印组帮助；`parsed.command === ''` 在 `group.defaultHandler` 已定义时调用之（`src/cli/router.ts:95-97`）；`?` / `-h` / `--help` 短路到 `printCommandHelp`（`src/cli/output.ts:49`）；`cmd.platform === 'win32'` 强制仅限 Windows 的命令（`src/cli/router.ts:115`）。

## CLI 名解析链（canonical → 运行时名）

源码层不再硬编码 `'jc'`。所有面向用户的文本通过两步渲染：

```text
src/shared/meta.ts:21     META.binaryName = 'jc'                    ← 唯一 canonical 字面
        ↓
src/cli/Command.ts:25     get bin(): string { return META.binaryName }   ← 基类 getter
        ↓
命令 class 字段             examples = [`${this.bin} w k 1234`]      ← new 时拼成 'jc w k 1234'
        ↓
src/cli/output.ts:26-34   cliText(template)                          ← 运行时把 'jc' 替换成当前名
        ↓
用户配 JC_CLI_NAME=bb 或 jc mgr cname set bb → 输出变 'bb w k 1234'
```

- `getCliNameInfo()`（`src/shared/config/store.ts`）解析当前名：优先级 `JC_CLI_NAME` env > `config.json` `cliName` > `META.binaryName`。
- `output.ts` 的 `getStyledCliName()`（`src/cli/output.ts:18`）+ `cliText()`（`src/cli/output.ts:26`）是渲染层；所有 `print*` 函数都走它们。

## 模块归属

| 目录 | 归属职责 | 下游消费者 |
|---|---|---|
| `src/index.ts` | 单一入口：`process.argv.slice(2)` → `route(argv)`；`tsup` 构建入口 | 由 `tsup` 打包为 `dist/index.js` |
| `src/cli/` | router、输出渲染、类型契约、**Command 抽象基类**（`src/cli/Command.ts`） | 入口、所有 group、`tests/cli/*.test.ts` |
| `src/shared/meta.ts` | 工具标识元数据集中地：`binaryName` / `dataDirName` / `envPrefix` / `packageName` | 所有需要 canonical 名的模块 |
| `src/shared/config/` | CLI 自身配置（cname 别名 + launcher）：`paths.ts`（`JC_CONFIG_PATH` 解析）、`store.ts`（原子读写 + `getCliNameInfo`）、`launcher.ts`（POSIX symlink / Windows shim 安装）、`types.ts` | `cname` 命令、`output.ts`、`Command.ts` |
| `src/shared/registry/` | `jc mgr` 注册表：XDG 路径、schema、`confirm()` helper | 所有 `mgr` 命令 |
| `src/shared/backup/` | zip 备份/恢复：manifest + adm-zip 包装 | `mgr backup` / `mgr restore` |
| `src/shared/system/` | 平台无关的 `systeminformation` 适配器；`adapter.ts` 是唯一引入面 | 所有 `w` 组命令 |
| `src/groups/w/` | Windows 命令面，按 11 个 category 组织；`src/groups/w/index.ts` 组装 `wGroup` | router 注册为 `wGroup` |
| `src/groups/claude/` `src/groups/happy/` `src/groups/mgr/` | 三个顶层 group 包装；各自 `index.ts` 注册 | router 注册为 `*Group` |
| `tests/` | Vitest 套件；与 `src/` 布局镜像 | 通过 `npm test` 运行 |
| `.github/workflows/` | 发布自动化：`release-please.yml`（版本）与 `npm-publish.yml`（发布） | push 到 `main` 时触发；调用 `npm publish --provenance` |

`src/` 共约 146 份 `.ts`：薄入口 `index.ts` + CLI 层 `cli/`（4 份）+ `shared/`（meta + config + registry + backup + system）；`src/groups/w/` 贡献约 87 份命令文件（11 个 category）。数量为近似估计；对外引用前请用 `find src -name '*.ts' | wc -l` 自校。

## 命令总数

- `claude` 4、`happy` 7、`mgr` 13、`w` 87（11 个 category 合计）→ **共 111 个命令**，全部为继承 `Command` 基类的 class。每个文件采用双导出：`class XxxCommand` + `export const commandDef = new XxxCommand()` + 顶层 `handler` 适配器（详见 [[routing-and-command-authoring]]）。

## ESM `.js` 导入后缀规则

TypeScript 源码是 ESM，Node 运行时不会自动补扩展名，因此每个相对导入都必须以 `.js` 结尾，即便磁盘上的文件是 `.ts`。`tsup` 下编译没问题，但运行时直接跑会抛 `ERR_MODULE_NOT_FOUND`。

```ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'
```

## 跳转链接

- 相关 reference：`routing-and-command-authoring.md`（命令 authoring 规范）、`registry-and-managed-items.md`（mgr / cname）
- 历史设计文档已归档到 git 历史（`docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md` 等），需要时 `git log --all` 可查。
