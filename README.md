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
jc mgr install --cmd "uv tool install <pkg>" --bin <exec> --alias <alias>  # 一行：安装+注册
jc mgr list                                       # 列出已注册的项
jc mgr check tool                                 # 重新验证源是否可达
jc mgr rm tool                                    # 按别名删除（需确认）
jc mgr rename tool t                              # 修改别名（需确认）
jc mgr export > backup.json                       # 导出注册表（旧行为：stdout）
jc mgr export backup.json                         # 或写到文件
jc mgr export --out D:\backups\r.json             # 显式指定路径（不交互）
jc mgr config path                                # 看当前 registry 解析路径
jc mgr config init --dir D:\dev\my-registry       # 在自定义位置初始化空 registry
jc mgr cname                                      # 看当前 jc CLI 名 + 来源
jc mgr cname bb                                   # 给 jc 起别名 bb（自动装 launcher，原名 jc 仍可用）
jc mgr cname reset                                # 恢复 jc（卸 launcher）
jc mgr import backup.json                         # 导入注册表
jc mgr backup backup.zip                          # 打包 registry → zip
jc mgr backup backup.zip --include-local          # 同时拷贝本地 exe / py 源（交互确认）
jc mgr restore backup.zip                         # 从 zip 还原（默认 skip）
jc mgr restore backup.zip --dry-run               # 只报告不写
jc mgr restore backup.zip --merge                 # 已存在 alias 用备份覆盖
jc mgr restore backup.zip --replace               # 先自动备份当前 + 清空重建

# 已有工具时的 --install 模式（add 的别名）：注册已有路径/包名为 alias
jc mgr add py --install "uv tool install <pkg>" --bin <exec> --alias <alias>
jc mgr add npm --install "npm install -g <pkg>" --bin <exec> --alias <alias>

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
| mgr | m | 统一管理器：注册 npm / py / exe 项并通过别名调用 | 13 |

> 每个命令由 `src/cli/Command.ts` 的抽象基类 `Command` 派生；命令元数据（examples / helpText / related）用 `${this.bin}` 引用 canonical 名（来自 `src/shared/meta.ts` 的 `META.binaryName`），运行时由输出层替换为当前 CLI 名。

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

## CLI 别名（jc mgr cname）

jc 默认入口叫 `jc`。如果你更习惯叫它 `bb`、`j`、或别的名字，可以给 jc 起别名 —— 原名 `jc` 始终保留，两边都能用。

```bash
jc mgr cname                  # 查看当前 CLI 名 + 来源
jc mgr cname bb               # 设别名为 bb（等价于 jc mgr cname set bb）
jc mgr cname set bb           # 同上，语义更显式
jc mgr cname reset            # 恢复 jc
```

### 行为

- **`jc mgr cname set bb`** 会自动在你 jc 所在的 bin 目录里创建一个 launcher：
  - POSIX：符号链接 `bb → jc`
  - Windows：`bb.cmd` + `bb`（Git Bash 用的 bash shim），转发到 `jc %*`
  - launcher 文件首行带 `# jc-managed-launcher:` 标记；`reset` 只删带标记的
  - **不会**触碰 `jc` 自身的 npm shim —— 即使 reset 也不会让 jc 不可用
- 同时把 `cliName=bb` 写进 `config.json`（路径见下）
- 装 launcher 失败 → config 不写；写 config 失败 → launcher 已回滚
- 不存在的 launcher 目标（如用户环境里没有 PATH）→ 报错并提示手动加 shell alias 作为回退

### 配置文件

| 项 | 位置 | 说明 |
|---|---|---|
| `config.json` | `${JC_CONFIG_PATH}` 或 `${XDG_CONFIG_HOME}/jc/config.json` 或 `${APPDATA}/jc/config.json` | 存 cliName + launcher 元数据 |
| env 覆盖 | `JC_CLI_NAME=bb jc ...` | 临时覆盖，优先级最高 |

`jc mgr cname set bb` 在 `JC_CLI_NAME` 已设时拒绝修改（避免误导：env 优先级高，写了 config 也不会生效）。

### 兼容性约束

- `package.json` 的 `bin: "jc"` **不变** —— npm 全局装出来的可执行名永远是 `jc`
- 数据目录（`%APPDATA%\jc\registry.json`）**不变**
- env 前缀（`JC_REGISTRY_PATH` 等）**不变**
- 所有 examples 字面量仍是 `jc` —— README 不应该跟着用户本机配置变；renderer 在运行时把帮助文本里的 `jc` 替换成当前配置名

### 用法举例

```bash
# 配别名后
bb mgr list                  # 跟 jc mgr list 完全等价
jc mgr list                  # 原名仍然可用

# 帮助文本也跟着变
bb mgr config path
# → bb
#   (来源: config)
```

## Registry 位置与 export 默认

默认 registry 路径由 `getRegistryPath()` 解析，优先级：

1. **`JC_REGISTRY_PATH` env 变量**（最高）—— 一旦设置就用它，忽略其他来源
2. `XDG_CONFIG_HOME/jc/registry.json`（即便 Windows 也优先于 APPDATA，跨平台 CI 友好）
3. Windows `%APPDATA%\jc\registry.json` / Unix `~/.config/jc/registry.json`

```bash
# 看当前路径 + 来源 + 状态
jc mgr config path
# → <APPDATA>\jc\registry.json          # Windows
# → ~/.config/jc/registry.json         # Linux / macOS
#   (来源: <平台> 默认值)
#   (状态: 已存在，含 N 项)

# 自定义位置（持久生效；新 shell 才看得到）
setx JC_REGISTRY_PATH "D:\path\to\registry.json"   # Windows
export JC_REGISTRY_PATH="$HOME/.local/jc/registry.json"  # POSIX

# 在自定义位置初始化一个空 registry
jc mgr config init --dir D:\path\to\dir
# → 已初始化: D:\path\to\dir\registry.json
#   临时使用: $env:JC_REGISTRY_PATH = "..."; jc ...
#   永久生效: setx JC_REGISTRY_PATH "..."
```

### `jc mgr export` 的默认行为变化

无参数 + TTY 时现在不再问"stdout / 文件"，而是：

1. 计算 `${REGISTRY_DIR}/exports/registry-{ISO}.json` 作为建议路径
2. 提示用户：回车接受，或输入新路径，或输入 `-` 走 stdout

非 TTY 下保持旧行为（直接输出到 stdout，方便管道重定向）。

```bash
jc mgr export                              # 交互：接受默认 / 改写 / 走 stdout
jc mgr export --out D:\r.json              # 显式：不交互，写到指定路径
jc mgr export -                            # 强制 stdout
jc mgr export D:\r.json                    # 位置参数（向后兼容）
```

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

## 安装外部工具并注册 alias

很多工具是"装到 PATH 就有"的模式：`uv tool install`、`pip install`、`npm install -g`、`cargo install` 等。`jc mgr install` 把"装 + 注册"压成一行：

```bash
jc mgr install --cmd "uv tool install <pkg>"   --bin <exec>        --alias <alias>
jc mgr install --cmd "npm install -g <pkg>" --bin <exec> --alias <alias> --kind npm
jc mgr install --cmd "pipx install ruff"            --bin ruff               --alias ruff
jc mgr install --cmd "cargo install fd-find"        --bin fd                 --alias fd
```

参数：

| flag | 必填 | 说明 |
|---|---|---|
| `--cmd` | ✅ | 任意 shell 命令；jc 只负责运行它（stdio 透传，用户看到输出） |
| `--bin` | ✅ | 安装后要在 PATH 里定位的可执行名（Windows 用 `where`，POSIX 用 `which`） |
| `--alias` | ✅ | 注册到 registry 的别名 |
| `--kind` |  | `exe`（默认） / `py` / `npm` |
| `--desc` |  | 简介 |

### 流程与失败语义

1. 跑 `--cmd`（`spawnSync` + `shell:true`）
2. `which <bin>` / `where <bin>` 找路径
3. 找到 → 写入 registry：`exec=<绝对路径>`, `source=<cmd>`（audit 用），`sourceVerifiedAt=now`
4. **任何一步失败 → exit 2，不写 registry**（不留下"alias 名占位但 bin 找不到"的脏数据）

### `install` vs `add --install`

| 写法 | 用法 |
|---|---|
| `jc mgr install --cmd "..." --bin x --alias x` | 一行安装+注册，常见工作流 |
| `jc mgr add <kind> --install "..." --bin x --alias x` | 显式给 kind 的同一行为 |

`install` 内部委托给 `add --install`，逻辑零重复，bug 修复自动跟随。

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
jc mgr export           # 提议 ${REGISTRY_DIR}/exports/registry-{ISO}.json，回车确认或改写
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

## 扩展 jc（新增命令）

每个命令由 `src/cli/Command.ts` 的抽象基类派生。开发约定：

```ts
// src/groups/<group>/<short>.ts
import { cliText } from '../../../cli/output.js'
import { Command } from '../../../cli/Command.js'

// 1. executor：原 handler body，不依赖 this（解构/独立引用不会丢 this）
async function executeXxx(args: string[]): Promise<void> {
  // ... 业务逻辑
}

// 2. class：metadata + handler 转调 executor
export class XxxCommand extends Command {
  name = 'xxx'
  description = '...'
  helpText = `用法:\n  ${this.bin} ...`        // 模板字符串；不是双引号
  examples = [`${this.bin} xxx ...`]
  related = [`${this.bin} yyy`]

  async handler(args: string[]): Promise<void> {
    return executeXxx(args)
  }
}

// 3. 单例 + 顶层 handler 适配器（保持测试 `await import(...).then(m => m.handler)` 兼容）
export const commandDef = new XxxCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
```

要点：

- **metadata 中的 `jc` 一律用 `${this.bin}`**：模板字符串，反引号。`${this.bin}` 来自基类 `Command` 的 `bin` getter（`src/cli/Command.ts`），返回 `META.binaryName`（`src/shared/meta.ts`，值 `'jc'`）。双引号不会求值，help 会显示字面 `${this.bin}`。
- **import 必须全部在文件顶部**：迁移脚本会留下 import 在文件中间——避免这种情况。
- **executor 不要用 `this`**：保持纯函数语义。
- **`${this.bin}` 在 helpText / examples / related 三个字段里都生效**，由 `output.ts` 的 `cliText()` 运行时替换成当前 CLI 名（用户配的别名如 `bb`）。
- **完整规范**：参考 `.claude/skills/jc-development/references/routing-and-command-authoring.md`。

## 构建

```bash
npm run build   # tsup 打包
npm test        # Vitest 测试
```

## 许可证

MIT
