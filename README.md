# jc — j 命令套件

> 跨平台系统快捷命令集。将 Windows batch 版 `j` 命令套件移植为纯 TypeScript 跨平台 npm CLI。

## 安装

```bash
npm install -g je-cd
```

## 用法

```bash
jc                    # 显示帮助（列出所有组）
jc l                  # 同上，等价于 jc / jc ? / jc help
jc ?                  # 同上
jc help               # 同上

jc claude             # 启动 Claude Code
jc claude b           # 跳过权限模式
jc claude r           # 恢复上次会话

jc happy              # 启动 Happy Claude
jc happy daemon       # Happy 守护进程模式

jc w l                # 列出 w 组 11 个类别
jc w l proc           # 进程类命令列表
jc w p 3306           # 查 3306 端口占用
jc w pk 8080          # 一键查杀 8080 端口进程
jc w k 1234           # 按 PID 杀进程
jc w top              # CPU 占用 Top20
jc w sysinfo          # 系统详细信息
jc w cpu              # CPU 信息
jc w disk             # 磁盘卷信息
jc w ip               # 网络接口信息
jc w wifi             # Wi-Fi 连接信息
jc w mac              # MAC 地址
jc w who              # 当前用户信息
jc w ?                # 命令帮助

# 统一管理器（mgr）— 注册 npm / py / exe 项并通过别名调用
jc mgr add exe "C:\path\to\tool.exe" --alias tool # 注册一个 exe
jc mgr list                                       # 列出已注册的项
jc mgr check tool                                 # 重新验证源是否可达
jc mgr rm tool                                    # 按别名删除（需确认）
jc mgr rename tool t                              # 修改别名（需确认）
jc mgr export > backup.json                       # 导出注册表
jc mgr import backup.json                         # 导入注册表
jc mgr backup backup.zip                          # 打包 registry → zip
jc mgr backup backup.zip --include-local          # 同时拷贝本地 exe / py 源（交互确认）
jc mgr restore backup.zip                         # 从 zip 还原（默认 skip）
jc mgr restore backup.zip --dry-run               # 只报告不写
jc mgr restore backup.zip --merge                 # 已存在 alias 用备份覆盖
jc mgr restore backup.zip --replace               # 先自动备份当前 + 清空重建

# 已注册 alias 的选择式调用（四种写法等价）
jc tool                       # 直接执行：等价于 jc mgr run tool
jc m tool                     # 通过组别名
jc mgr tool                   # 通过组全名
jc tool --version             # 透传参数
jc r tool --version           # jc r <alias> 是历史快捷方式
```

## 分组

| 组 | 别名 | 说明 | 命令数 |
|----|------|------|--------|
| claude | c | Claude Code CLI 包装 | 4 |
| happy | hy | Happy mobile Claude 包装 | 7 |
| w | w | 系统快捷命令集 | 87 |
| mgr | m | 统一管理器：注册 npm / py / exe 项并通过别名调用 | 10 |

## 顶层帮助

下列写法都打印相同的"所有组"列表：

```bash
jc           # 无参数
jc l
jc ?
jc help
```

组级别的帮助照旧用 `jc <组> l`（或 `jc <组> ?`）。

## 选择式调用已注册 alias

`mgr` 组把任何 npm / py / exe 包脚本注册为一个短 alias 后，可以用以下四种写法执行 —— 完全等价：

```bash
jc <alias> [args...]         # 直接执行（最简）
jc m <alias> [args...]       # 通过组别名
jc mgr <alias> [args...]     # 通过组全名
jc r <alias> [args...]       # 历史快捷方式（jc r 是 jc mgr run 的简写）
```

例如注册 `tool` 后：

```bash
jc tool --version             # 等价于 jc mgr run tool --version
```

**路由优先级**：group 名 → group 别名 → 已注册 alias 回落。

- `jc claude` 走 claude 组，不会去查 alias
- `jc m list` 走 mgr 的 `list` 子命令，不会被当成 alias
- `jc m tool` 走 mgr 的选择式回落，等价于 `jc mgr run tool`
- `jc tool` 先查组名失败，再查 registry 命中 alias，路由到 mgr run

未注册的名字仍按 `未知命令: <name>` 报错。

## 备份 / 恢复（换设备一键导入）

把当前 registry 打包成 zip，拷到新机器解压即可恢复：

```bash
jc mgr backup backup.zip                       # 仅 registry + manifest
jc mgr backup backup.zip --include-local       # 同时打包本地 exe / py 源（默认交互确认）
jc mgr backup backup.zip --include-local --yes # CI 场景跳过确认

jc mgr restore backup.zip                      # 默认 skip：已存在 alias 不动
jc mgr restore backup.zip --dry-run            # 只打印将做什么，不写盘
jc mgr restore backup.zip --merge              # 同名 alias 用备份覆盖当前
jc mgr restore backup.zip --replace            # 先自动备份当前 registry 再清空重建
```

### zip 包结构

```
backup.zip
├── registry.json     # 当前 registry 的快照
├── manifest.json     # 审计清单（含每个本地源被拷进的绝对路径）
└── sources/          # 仅 --include-local 时存在
    └── <alias>/<basename>
```

### 还原时的 exec / source 处理

- **远端 / npm / URL 项**：`exec` 与 `source` 不动；restore 后跑 `jc mgr check <alias>` 重装到新机器。
- **本地 exe / py + zip 带源**：解压到 `<JC_DATA>/sources/<alias>/<basename>`，写回 `exec` 与 `source` 为新路径。
- **本地 exe / py + zip 未带源**：`failed++`，提示用户跑 `jc mgr check <alias>` 修复（不会写入一个在新机器必然失败的 exec）。

### 隐私 / 安全

- **本地源严格 opt-in**：`jc mgr backup` 默认不拷贝任何本地文件；必须显式 `--include-local`。
- **交互确认**：`--include-local` 默认会列出将被拷贝的每个绝对路径，询问 `Proceed? [y/N]`；CI 用 `--yes` 跳过。
- **manifest 审计**：zip 内的 `manifest.json` 始终记录每个本地源的**绝对路径**，从 zip 内容就能审计。
- **不联网**：所有读写都只在本机进行。restore 只做 zip 解压 + JSON 解析，不执行 zip 内的可执行文件。
- **`--replace` 自动回退**：执行前先把当前 `registry.json` 备份为 `registry.json.bak-<ISO>`，失败可人工恢复。

### 与 `export` / `import` 的关系

`backup` / `restore` 是 `export` / `import` 的超集：相同 JSON 格式，外加 zip 容器 + manifest + 可选本地源附件。两个旧命令保留不动。

## 交互模式

在真正的 TTY 终端（PowerShell / Windows Terminal / bash / zsh）下，任何 mgr 命令**参数不全时会逐步问用户补齐**，而不是直接退出：

```bash
jc mgr add              # 依次问 kind / source / alias / desc
jc mgr rm               # 列出所有 alias 后问要删哪个
jc mgr rename           # 问 old + new alias
jc mgr check            # 问"单个 / 全部"；选全部时检查所有项并对失败项问"重试？"
jc mgr run              # 列出所有 alias 后问跑哪个
jc mgr import           # 问 stdin / 文件；跳过后问"切换 --merge 重新跑？"
jc mgr restore          # 问 zip 路径 + 策略（skip / merge / replace / dry-run）
jc mgr export           # 问 stdout / 文件
```

### 非 TTY 行为

管道 / CI / 重定向场景下 stdin 不是 TTY，**所有交互式命令立即报错并退出**（exit 1 或 2），附带明确提示：

```
用法: jc mgr add <npm|py|exe> <source> --alias <alias> [--desc <desc>]
提示: 缺少参数且当前为非交互模式（管道/CI）。请补全参数或加 --yes 后跟值。
```

这避免了 readline 在管道下 hang（导致 CI 永远卡死）。

### 确认（y/N）严格 y-only

任何 `Proceed? [y/N]` 或 `确认 ... ? (y/N)` 提示都**只接受小写 `y`**——其它任何输入（含 `Y`、`yes`、空串、`n`）都视为"否"。这是 conservative 选择：避免误操作。

## w 组 11 个类别

| 类别 | 命令数 | 说明 |
|------|--------|------|
| proc | 8 | 进程管理（端口/查杀/Top） |
| net | 15 | 网络（IP/DNS/WiFi/路由） |
| file | 13 | 文件操作（ls/cd/find/size） |
| sys | 12 | 系统信息（CPU/内存/磁盘/GPU） |
| svc | 5 | 服务管理 |
| pwr | 6 | 电源（关机/重启/锁屏/休眠） |
| reg | 4 | 注册表（仅 Windows） |
| task | 3 | 计划任务（仅 Windows） |
| tools | 14 | 系统工具（任务管理器/控制面板等） |
| user | 4 | 用户/权限 |
| wsl | 3 | WSL/Docker（仅 Windows） |

## 跨平台

- **Windows**: 全部 98 命令完整支持
- **macOS / Linux**: 核心命令支持（~80%），注册表/WSL/WiFi密码等 Windows 特有命令会提示"此命令仅支持 Windows"

## 构建

```bash
npm run build   # tsup 打包
npm test        # Vitest 测试
```

## 许可证

MIT
