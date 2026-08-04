---
name: registry-and-managed-items
description: 涉及 jc mgr 组的注册、迁移、别名与跨设备同步；新增、修改或迁移 jc mgr 注册项，或为 XDG 注册表/CLI 配置做备份/恢复时加载。
---

# registry-and-managed-items

在新增、修改或迁移 `jc mgr` 组的注册项时加载本 reference。本文件锁定 XDG 配置文件位置、统一的 `RegistryItem` schema、十三条命令的语义、`confirm()` helper 的位置、CLI 自身别名机制，以及跨设备迁移流程。

## 加载时机

- 正在新增、修改、删除或重命名 `jc mgr` 注册项。
- 正在准备 `jc mgr export` / `jc mgr import` 的跨设备迁移。
- 正在审查一条改 `src/shared/registry/**`、`src/shared/config/**` 或 `src/groups/mgr/**` 的 PR。
- 正在配置 CLI 别名（`jc mgr cname`）或调试 launcher shim。

## 两套存储位置

mgr 涉及**两个独立**配置文件，刻意分离（CLI 设置不应污染工具项数据）：

### 1. 注册表 `registry.json`（工具项）

由 `src/shared/registry/paths.ts` 解析（优先级与 cname 改造对齐）：

1. `JC_REGISTRY_PATH` env —— 用户显式指定（覆盖一切）
2. `XDG_CONFIG_HOME/jc/registry.json` —— 跨平台事实标准（即便 Windows 也优先于 APPDATA）
3. Windows `%APPDATA%\jc\registry.json` / Unix `~/.config/jc/registry.json`

文件不存在时首次写入自动创建父目录（`ensureRegistryDir`）。无 lock 文件、无 sidecar、无云端副本。目录名 `'jc'` 来自 `META.dataDirName`（`src/shared/meta.ts`），与 CLI 别名解耦。

### 2. CLI 配置 `config.json`（cname 别名 + launcher 记录）

由 `src/shared/config/paths.ts` 解析（独立的 env，不复用 registry 路径）：

1. `JC_CONFIG_PATH` env —— 显式指定
2. `XDG_CONFIG_HOME/jc/config.json`
3. Windows `%APPDATA%\jc\config.json` / Unix `~/.config/jc/config.json`

`config.json` schema（`src/shared/config/types.ts`）：`{ version: 1, cliName?: string, launchers: LauncherEntry[] }`。

## RegistryItem Schema

定义在 `src/shared/registry/types.ts`：

- `RegistryItemKind = 'npm' | 'py' | 'exe'`，三种类型用 `kind` 字段统一。
- `RegistryItem`：`{ kind, source, alias, desc, exec, args?, createdAt, sourceVerifiedAt }`。
- `RegistryFile`：`{ version: 1, items: RegistryItem[] }`。
- `ALIAS_RE`：正则 `^[a-z0-9][a-z0-9_-]{0,31}$`；alias 在文件中存小写。

修改该 schema 是破坏性变更（`version` 必须递增，且 `store.ts` 的 `readRegistry` 必须在不识别的 `version` 上抛错而不是静默兜底）。CLI 配置 schema 用独立的 `CLI_CONFIG_VERSION`（`src/shared/config/types.ts`），互不影响。

## 命令语义（13 条）

所有 `commandDef` 在 `src/groups/mgr/`，全部继承 `Command` 基类（见 [[routing-and-command-authoring]]）：

**注册项管理**
- `add` —— 一次源验证（`npm view` / `fetch HEAD` / `fs.access`），失败退出 `2`；alias 已存在也退出 `2`。支持 `--install "<cmd>" --bin <name>` 一行安装+注册。
- `install` —— `add --install` 的独立 verb；委托给 add，逻辑零重复。
- `list` —— 打印表格（`console.table`）；空时打印提示。
- `run` —— 把 `item.exec` 拆成 `cmd + argv`，再 `spawn` 出去；不重验源。
- `rm` / `rename` —— 走 `confirm()` helper（`src/shared/registry/confirm.ts`）。
- `check` —— 重新跑源验证；成功时刷新 `sourceVerifiedAt`。

**迁移**
- `export` —— 把整个 `RegistryFile` 写出。支持 `--out <path>` 显式路径、位置参数、智能默认（`${REGISTRY_DIR}/exports/registry-{ISO}.json`）、`-` 强制 stdout。
- `import` —— 从文件或 stdin 读入；按 alias 去重（已存在则跳过）；`--strict` 让 `skipped` 或 `failed > 0` 退出 `2`。
- `backup` —— 把 registry 打包成 zip（含 manifest）；`--include-local` 把本地 exe/py 源一并塞进 zip（默认交互确认，`--yes` 跳过）。
- `restore` —— 从 zip 还原；三种策略 `skip`（默认）/ `--merge`（覆盖）/ `--replace`（先备份当前再清空重建）；`--dry-run` 只报告。

**工具自身配置**
- `config path` —— 打印当前 registry 解析路径 + 来源 + 状态。
- `config init --dir <path>` —— 在自定义位置初始化空 `registry.json`。
- `cname` —— 给 jc 起别名。无参打印当前名 + 来源；`cname set <name>` 或 `cname <name>` 装 launcher + 写 `config.json`；`cname reset` 清别名 + 卸 launcher。

## cname 别名机制（关键）

`jc mgr cname set bb` 做三件事：

1. **检测**：`which jc` / `where jc` 找当前 jc 的 bin 目录（`src/shared/config/launcher.ts` `detectJcBinDir`）。
2. **装 launcher**：在 bin 目录创建转发 shim
   - POSIX：符号链接 `bb → jc`
   - Windows：`bb.cmd`（`@echo off` + `jc %*`）+ `bb`（bash shim 调 `cmd //c bb.cmd`）
   - 每个文件首行带 `# jc-managed-launcher:` ownership marker；`reset` 只删带 marker 的，**绝不删 jc 自身**
3. **写 config**：`cliName=bb` 写进 `config.json`；失败则回滚 launcher

env 覆盖：`JC_CLI_NAME=bb jc ...` 临时覆盖（优先级最高）。`cname set/reset` 在 `JC_CLI_NAME` 已设时拒绝（避免误导）。

兼容性约束：`package.json` `bin.jc` **不变**；`jc` 永远可用；数据目录名、`JC_REGISTRY_PATH` 前缀、registry schema 全部不动。alias 是**附加**入口。

## 跨设备迁移

迁移是显式 `export` / `import` 或 `backup` / `restore`，无自动同步。

- `jc mgr export > registry.json` 把当前 registry 原样输出到 stdout（或 `--out`）。
- `jc mgr import registry.json` 在另一台机器落地。
- `jc mgr backup backup.zip --include-local` 把 registry + 本地源打包；`jc mgr restore backup.zip` 还原。

本地路径类项（`exe`、本地 `py`）的 `source` 跨设备后需要重新解析；`import` / `restore` 不会自动 `check`，迁移后建议跑一次 `jc mgr check <alias>`。

## 退出码契约

`0` 成功、`1` 用法错误、`2` 验证/查找/执行失败、`3` 平台门禁（如非 Windows 跑 `platform: 'win32'` 命令）。不引入新码。

## 跳转链接

- 实现：`src/shared/registry/**`、`src/shared/config/**`、`src/groups/mgr/**`
- `confirm()` helper：`src/shared/registry/confirm.ts`
- launcher 管理：`src/shared/config/launcher.ts`
- cname 别名机制（launcher shim + cliText 渲染）：见 `src/groups/mgr/cname.ts` 头部注释
- 历史设计文档已归档到 git 历史（`docs/superpowers/specs/2026-07-30-jc-mgr-design.md` 等），需要时 `git log --all` 可查。
