---
name: registry-and-managed-items
description: 涉及 jc mgr 组的注册、迁移与跨设备同步；新增、修改或迁移 `jc mgr` 注册项，或为 XDG 注册表做备份/恢复时加载。
---

# registry-and-managed-items

在新增、修改或迁移 `jc mgr` 组的注册项时加载本 reference。本文件锁定 XDG 配置文件位置、统一的 `RegistryItem` schema、八条命令的语义、`confirm()` helper 的位置，以及跨设备迁移流程。

## 加载时机

- 正在新增、修改、删除或重命名 `jc mgr` 注册项。
- 正在准备 `jc mgr export` / `jc mgr import` 的跨设备迁移。
- 正在审查一条改 `src/shared/registry/**` 或 `src/groups/mgr/**` 的 PR。
- 正在调试 `confirm()` helper 在多处共享后的行为。

## 存储位置

XDG 路径由 `src/shared/registry/paths.ts` 解析：

- Linux / macOS：`<XDG_CONFIG_HOME 或 ~/.config>/jc/registry.json`。
- Windows：`<APPDATA 或 ~/AppData/Roaming>/jc/registry.json`。

文件不存在时首次写入会自动创建父目录（`src/shared/registry/paths.ts` 的 `ensureRegistryDir`）。状态文件是单一 JSON，没有 lock 文件、没有 sidecar、没有云端副本。

## Schema

定义在 `src/shared/registry/types.ts`：

- `RegistryItemKind = 'npm' | 'py' | 'exe'`，三种类型用 `kind` 字段统一。
- `RegistryItem`：`{ kind, source, alias, desc, exec, args?, createdAt, sourceVerifiedAt }`。
- `RegistryFile`：`{ version: 1, items: RegistryItem[] }`。
- `ALIAS_RE`：正则 `^[a-z0-9][a-z0-9_-]{0,31}$`；alias 在文件中存小写。

修改该 schema 是一次破坏性变更（`version` 必须递增，且 `store.ts` 的 `readRegistry` 必须在不识别的 `version` 上抛错而不是静默兜底）。

## 命令语义

八条 `commandDef` 在 `src/groups/mgr/`：

- `add` —— 一次源验证（`npm view` / `fetch HEAD` / `fs.access`），失败退出 `2`；alias 已存在也退出 `2`。
- `list` —— 打印表格（`console.table`）；空时打印 `(空)`。
- `run` —— 把 `item.exec` 拆成 `cmd + argv`，再 `spawn` 出去；不重验源。
- `rm` / `rename` —— 走 `confirm()` helper（位于 `src/shared/registry/confirm.ts`，从 `src/groups/w/file/rm.ts:5-13` 提升而来）。
- `check` —— 重新跑源验证；成功时刷新 `sourceVerifiedAt`。
- `export` —— 把整个 `RegistryFile` JSON 写到 stdout。
- `import` —— 从文件或 stdin 读入；按 alias 去重（已存在则跳过），保留 `createdAt` 与 `sourceVerifiedAt`；`--strict` 标志让 `skipped` 或 `failed > 0` 退出 `2`。

退出码遵守现有契约：`0` 成功、`1` 用法错误、`2` 验证/查找/执行失败。不引入新码。

## 跨设备迁移

迁移是显式 `export` / `import`，无自动同步。`jc mgr export > registry.json` 把当前 XDG 文件原样输出；`jc mgr import registry.json` 在另一台机器上落地。本地路径类项（`exe`、本地 `py`）的 `source` 跨设备后需要重新解析；`import` 不会自动 `check`，迁移后建议跑一次 `jc mgr check <alias>`。

## 跳转链接

- 本 skill 的设计规范：`docs/superpowers/specs/2026-07-30-jc-mgr-design.md`。
- 实现：`src/shared/registry/**`、`src/groups/mgr/**`。
- `confirm()` helper：`src/shared/registry/confirm.ts`。
- 项目原始规范：`docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md`。