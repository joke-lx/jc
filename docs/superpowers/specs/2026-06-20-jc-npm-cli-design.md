# Design Spec: `jc` — npm CLI Package

> 将 `C:\Users\joke\bin\` 下的 `j` 命令套件（batch 版）移植为跨平台 npm CLI 包。
> 命令格式：`jc <组> <命令> [参数...]`

---

## 1. 项目概述

### 1.1 目标

在 `D:\DevProjects\my\npm\jc\` 创建一个 npm CLI 包，完整复刻现有 Windows batch 版 `j` 命令套件的全部功能，并用 TypeScript 原生实现确保跨平台（Windows / macOS / Linux）可用。

### 1.2 核心原则

- **功能一致**：命令名称、参数格式、输出风格与 batch 版保持一致
- **跨平台**：所有命令用 JS/TS 原生实现，不依赖系统 shell 命令
- **中文界面**：命令描述、帮助文本均为中文
- **零配置**：`npm install -g jc` 即可使用
- **轻依赖**：仅依赖成熟的系统信息库，不引入臃肿框架

### 1.3 交付标准

- 包名：`jc`，CLI 命令：`jc`
- 构建工具：TypeScript + tsup
- 输出：`dist/index.js`（单文件 bundle）
- 发布：npm，版本 `0.1.0` 起
- 测试：Vitest 单元测试

---

## 2. CLI 交互设计

### 2.1 命令格式

```
jc                              → 显示帮助/用法
jc l                            → 列出所有组
jc <组> l                       → 列出某组全部命令
jc <组>                         → 执行组默认命令
jc <组> <命令>                   → 执行具体命令
jc <组> <命令> [参数...]         → 带参数执行
jc <组> <命令> ?                 → 查看命令详细帮助
```

### 2.2 组定义

| 组名 | 别名 | 来源目录 | 说明 |
|------|------|----------|------|
| `claude` | `c` | `src/groups/claude/` | Claude Code CLI 包装器 |
| `happy` | `hy` | `src/groups/happy/` | Happy mobile Claude 包装器 |
| `w` | `w` | `src/groups/w/` | Windows 系统快捷命令集（核心，87 命令） |

### 2.3 别名映射

为了复刻 batch 版 `j c`、`j hy` 的体验，支持简写：
- `jc c` ≡ `jc claude`
- `jc hy` ≡ `jc happy`
- `jc w` ≡ `jc w`（w 本身已是短名，无需别名）

### 2.4 输出格式

- 命令列表：ANSI 彩色输出，红(`91m`) = `jc` 前缀，黄(`93m`) = 组名，蓝(`94m`) = 子命令
- 信息输出：表格格式（`console.table` 或自定义格式化）
- 错误输出：红色，带 `❌` 前缀
- 警告：黄色，带 `⚠️` 前缀

### 2.5 退出码

| 场景 | 退出码 |
|------|--------|
| 成功 | `0` |
| 未知命令/参数错误 | `1` |
| 执行失败（如杀进程失败） | `2` |
| 系统不支持（非 Win 执行 reg 命令） | `3` |

---

## 3. 项目结构

```
jc/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── src/
│   ├── index.ts                  # CLI 入口
│   ├── cli/
│   │   ├── router.ts             # 命令路由（自定义轻量解析）
│   │   └── output.ts             # 彩色输出格式化
│   ├── groups/
│   │   ├── claude/
│   │   │   ├── index.ts          # 组注册 + l 命令（列表）
│   │   │   ├── run.ts            # `jc claude` / `jc c`
│   │   │   ├── bypass.ts         # `jc claude b`
│   │   │   ├── resume.ts         # `jc claude r`
│   │   │   └── ultracode.ts      # `jc claude e`
│   │   ├── happy/
│   │   │   ├── index.ts          # 组注册 + l 命令
│   │   │   ├── run.ts            # `jc happy`
│   │   │   ├── claude.ts         # `jc happy c`
│   │   │   ├── codex.ts          # `jc happy k`
│   │   │   ├── resume.ts         # `jc happy r <id>`
│   │   │   ├── daemon.ts         # `jc happy d`
│   │   │   ├── doctor.ts         # `jc happy o`
│   │   │   └── stop.ts           # `jc happy x`
│   │   └── w/
│   │       ├── index.ts          # 组注册 + 11 类分类系统
│   │       ├── proc/             # 进程 (8 命令)
│   │       │   ├── port.ts       # p  - 查端口占用
│   │       │   ├── portkill.ts   # pk - 查并杀端口进程
│   │       │   ├── kill.ts       # k  - 按 PID 杀
│   │       │   ├── killname.ts   # kn - 按进程名杀
│   │       │   ├── ps.ts         # ps - 查进程
│   │       │   ├── top.ts        # top - CPU 占用 Top20
│   │       │   ├── mem.ts        # mem - 内存占用 Top20
│   │       │   └── psg.ts        # psg - 进程统计概览
│   │       ├── net/              # 网络 (15 命令)
│   │       │   ├── ip.ts         # ip - 网络配置
│   │       │   ├── ip4.ts        # ip4 - 仅 IPv4
│   │       │   ├── dns.ts        # dns - 清 DNS 缓存
│   │       │   ├── ns.ts         # ns - DNS 查询
│   │       │   ├── ping.ts       # ping - ping 主机
│   │       │   ├── trace.ts      # trace - 路由跟踪
│   │       │   ├── route.ts      # route - 路由表
│   │       │   ├── conn.ts       # conn - TCP 连接
│   │       │   ├── wifi.ts       # wifi - Wi-Fi 信息
│   │       │   ├── wifipwd.ts    # wifipwd - Wi-Fi 密码
│   │       │   ├── wifiexp.ts    # wifiexp - 导出 Wi-Fi
│   │       │   ├── proxy.ts      # proxy - 系统代理
│   │       │   ├── portscan.ts   # portscan - 端口测试
│   │       │   ├── mac.ts        # mac - MAC 地址
│   │       │   └── share.ts      # share - 共享列表
│   │       ├── file/             # 文件/目录 (13 命令)
│   │       │   ├── ls.ts         # ls
│   │       │   ├── pwd.ts        # pwd
│   │       │   ├── cd.ts         # cd
│   │       │   ├── rm.ts         # rm
│   │       │   ├── del.ts        # del
│   │       │   ├── mkdir.ts      # mkdir
│   │       │   ├── touch.ts      # touch
│   │       │   ├── cp.ts         # cp
│   │       │   ├── mv.ts         # mv
│   │       │   ├── find.ts       # find
│   │       │   ├── size.ts       # size
│   │       │   ├── dtree.ts      # dtree
│   │       │   └── ln.ts         # ln
│   │       ├── sys/              # 系统信息 (12 命令)
│   │       │   ├── sysinfo.ts    # sysinfo
│   │       │   ├── host.ts       # host
│   │       │   ├── uptime.ts     # uptime
│   │       │   ├── cpu.ts        # cpu
│   │       │   ├── meminfo.ts    # meminfo
│   │       │   ├── disk.ts       # disk
│   │       │   ├── diskfull.ts   # diskfull
│   │       │   ├── gpu.ts        # gpu
│   │       │   ├── bios.ts       # bios
│   │       │   ├── bat.ts        # bat（电池）
│   │       │   ├── mon.ts        # mon（显示器）
│   │       │   └── powercfg.ts   # powercfg
│   │       ├── svc/              # 服务 (5 命令)
│   │       │   ├── svc.ts        # 查服务
│   │       │   ├── svcstart.ts   # 启动服务
│   │       │   ├── svcstop.ts    # 停止服务
│   │       │   ├── svcrestart.ts # 重启服务
│   │       │   └── svcdelayed.ts # 延迟自启
│   │       ├── pwr/              # 电源 (6 命令)
│   │       │   ├── off.ts        # 关机
│   │       │   ├── reboot.ts     # 重启
│   │       │   ├── logout.ts     # 注销
│   │       │   ├── lock.ts       # 锁屏
│   │       │   ├── sleep.ts      # 休眠
│   │       │   └── cancel.ts     # 取消计划操作
│   │       ├── reg/              # 注册表 (4 命令, Win only)
│   │       │   ├── reg.ts        # 查
│   │       │   ├── regset.ts     # 写
│   │       │   ├── regdel.ts     # 删
│   │       │   └── regfind.ts    # 搜
│   │       ├── task/             # 计划任务 (3 命令)
│   │       │   ├── task.ts       # 列出
│   │       │   ├── taskrun.ts    # 立即执行
│   │       │   └── taskstop.ts   # 停止
│   │       ├── tools/            # 系统工具 (14 命令)
│   │       │   ├── taskmgr.ts    # 任务管理器
│   │       │   ├── resmon.ts     # 资源监视器
│   │       │   ├── perfmon.ts    # 性能监视器
│   │       │   ├── eventvwr.ts   # 事件查看器
│   │       │   ├── devmgmt.ts    # 设备管理器
│   │       │   ├── diskmgmt.ts   # 磁盘管理
│   │       │   ├── msconfig.ts   # 系统配置
│   │       │   ├── reged.ts      # 注册表编辑器
│   │       │   ├── gpedit.ts     # 组策略
│   │       │   ├── control.ts    # 控制面板
│   │       │   ├── services.ts   # 服务面板
│   │       │   ├── here.ts       # 资源管理器
│   │       │   ├── wt.ts         # Windows Terminal
│   │       │   └── code.ts       # VS Code
│   │       ├── user/             # 用户/权限 (4 命令)
│   │       │   ├── who.ts        # 当前用户
│   │       │   ├── users.ts      # 用户列表
│   │       │   ├── admin.ts      # 检查管理员
│   │       │   └── runas.ts      # 提权
│   │       └── wsl/              # WSL/Docker (3 命令, Win only)
│   │           ├── wsl.ts        # WSL 列表
│   │           ├── wslkill.ts    # 关闭 WSL
│   │           └── docker.ts     # Docker 容器
│   └── shared/
│       ├── system/               # 跨平台系统 API 抽象
│       │   ├── adapter.ts        # 适配器工厂（根据 platform 选择实现）
│       │   ├── process.ts        # 进程管理接口 + 各平台实现
│       │   ├── network.ts        # 网络信息接口 + 各平台实现
│       │   ├── disk.ts           # 磁盘信息接口 + 各平台实现
│       │   ├── cpu.ts            # CPU 信息接口 + 各平台实现
│       │   ├── memory.ts         # 内存信息接口 + 各平台实现
│       │   ├── gpu.ts            # 显卡信息接口 + 各平台实现
│       │   ├── service.ts        # 服务管理接口 + 各平台实现
│       │   ├── registry.ts       # 注册表（仅 Win 实现）
│       │   ├── power.ts          # 电源管理接口 + 各平台实现
│       │   ├── os.ts             # OS 信息接口 + 各平台实现
│       │   └── wsl.ts            # WSL 接口（仅 Win 实现）
│       └── utils/
│           ├── error.ts          # 自定义错误类型
│           └── help.ts           # 帮助信息生成器
├── test/
│   ├── cli/
│   │   └── router.test.ts
│   └── groups/
│       ├── claude.test.ts
│       ├── happy.test.ts
│       └── w/
│           ├── proc.test.ts
│           ├── net.test.ts
│           └── ...
└── README.md
```

---

## 4. 核心模块设计

### 4.1 路由系统 (`src/cli/router.ts`)

自定义轻量路由，核心逻辑：

```typescript
// 命令处理器签名
type CommandHandler = (args: string[]) => Promise<void>

// 命令定义
interface Command {
  name: string        // 命令名
  description: string  // 中文描述
  handler: CommandHandler
  alias?: string[]    // 别名
  help?: string       // 详细帮助文本
}

// 分类（仅 w 组使用）
interface Category {
  name: string
  description: string
  commands: Command[]
}

// 组定义
interface Group {
  name: string
  alias: string
  description: string
  defaultCommand?: string    // 无子命令时执行
  commands: Command[]
  categories?: Category[]    // 仅 w 组有分类
}

// 路由逻辑
function route(argv: string[]): void {
  // argv = ['jc', 'w', 'p', '3306']
  // 1. 解析组名
  // 2. 解析子命令名
  // 3. 查找并调用 handler
  // 4. '?' / '-h' / '--help' → 显示帮助
}
```

### 4.2 跨平台系统抽象 (`src/shared/system/`)

采用 Adapter 模式，每个子系统一个接口，平台实现通过工厂函数选择：

```typescript
// adapter.ts
export function getProcessManager(): ProcessManager {
  switch (process.platform) {
    case 'win32': return new WinProcessManager()
    case 'darwin': return new MacProcessManager()
    case 'linux': return new LinuxProcessManager()
    default: throw new Error(`Unsupported platform: ${process.platform}`)
  }
}
```

**依赖库**：

| 库 | 用途 | 替代方案 | 理由 |
|----|------|----------|------|
| `systeminformation` | CPU/内存/磁盘/网络/进程/GPU | 手写各平台解析 | 成熟、维护活跃、API 统一 |
| `pidusage` | 进程级 CPU/内存 | systeminformation 的 process 接口 | 更精准，低开销 |
| `open` | 跨平台打开 URL/文件 | 手写 spawn | 处理了各平台 edge case |
| `chalk` | ANSI 彩色输出 | 原生 escape codes | Tree-shaking 友好，类型安全 |

**平台适配策略**：

| 子系统 | Win | Mac | Linux | 依赖 |
|--------|-----|-----|-------|------|
| 进程 | `systeminformation` + `pidusage` | 同 Win | 同 Win | si, pidusage |
| 网络 | `systeminformation` | `systeminformation` | `systeminformation` | si |
| 磁盘 | `systeminformation` | `systeminformation` | `systeminformation` | si |
| CPU | `systeminformation` | `systeminformation` | `systeminformation` | si |
| 内存 | `systeminformation` | `systeminformation` | `systeminformation` | si |
| GPU | `systeminformation` | `systeminformation` | `systeminformation` | si |
| 服务 | `sc` / WMI | `launchctl` | `systemctl` | 手写 spawn |
| 注册表 | `reg.exe` | ❌ 不支持 | ❌ 不支持 | 手写 spawn |
| 电源 | WMI | `pmset` | `systemd-logind` | 手写 |
| WSL | `wsl.exe` | ❌ 不支持 | ❌ 不支持 | 手写 spawn |
| OS | `systeminformation` | `systeminformation` | `systeminformation` | si |

### 4.3 W 组分类帮助系统

三级帮助，完全复刻原版体验：

```
# 一级：分类概览
$ jc w l
===== Windows 快捷命令集 =====
  proc   进程 ( 8)    jc w l proc
  net    网络 (15)    jc w l net
  file   文件/目录 (13) jc w l file
  sys    系统信息 (12) jc w l sys
  ... (共 11 类)

# 二级：类别内命令列表
$ jc w l proc
===== 进程 (proc) =====
  jc w p         查端口占用的进程
  jc w pk        一键查并杀端口进程
  jc w k         按 PID 杀进程
  ... (共 8 个)

# 三级：单个命令帮助
$ jc w p ?
[jc w p] 查端口占用的进程  [proc]

用法:
  jc w p [无参]  - 列所有监听端口
  jc w p <PORT> - 查指定端口

示例:
  jc w p
  jc w p 3306

相关: jc w pk / jc w portscan / jc w k
```

### 4.4 Claude / Happy 组

这两组作为 CLI 包装器，通过 `child_process.spawn()` 启动外部程序：

```typescript
// claude/run.ts
import { spawn } from 'child_process'

export async function runClaude(args: string[]): Promise<void> {
  const claudeArgs = args.length > 0 ? args : []
  await spawn('claude', claudeArgs, { stdio: 'inherit', shell: true })
}

// claude/bypass.ts
export async function bypassPermissions(): Promise<void> {
  await spawn('claude', ['--permission-mode', 'bypassPermissions'], { stdio: 'inherit', shell: true })
}
```

Happy 组同理，调用 `happy` 命令。

---

## 5. 构建与发布

### 5.1 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src"]
}
```

### 5.2 tsup.config.ts

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,        // CLI 不需要类型声明
  minify: false,      // 保持可读性
  bundle: true,       // 打包所有依赖
  platform: 'node',
})
```

### 5.3 package.json

```json
{
  "name": "jc",
  "version": "0.1.0",
  "description": "j 命令套件 — 跨平台系统快捷命令集 / Cross-platform system utility CLI",
  "type": "module",
  "bin": {
    "jc": "dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "systeminformation": "^5.x",
    "pidusage": "^3.x",
    "open": "^10.x",
    "chalk": "^5.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsup": "^8.x",
    "vitest": "^2.x",
    "@types/node": "^20.x",
    "@types/pidusage": "^2.x"
  }
}
```

### 5.4 发布策略

| 版本 | 阶段 | 内容 |
|------|------|------|
| 0.1.0 | MVP | CLI 框架 + 路由 + 部分 w 核心命令（proc 8 + sys 12 + net 15 + file 13 = 48 命令） |
| 0.2.0 | 扩展 | w 其余类别（svc/pwr/reg/task/tools/user/wsl = 39 命令）+ claude + happy |
| 0.3.0 | 完善 | 跨平台优化 + 测试全覆盖 + 文档完善 |
| 1.0.0 | 稳定 | API 稳定，全部命令覆盖，CI/CD |

---

## 6. 平台支持分级

| 平台 | 支持程度 | 命令覆盖 |
|------|----------|----------|
| Windows 10/11 | ✅ 完整支持 | 100%（87/87） |
| macOS | ⚠️ 核心支持 | ~80%（不含 reg/wsl/wifi 等 Win-only 命令） |
| Linux | ⚠️ 核心支持 | ~80%（不含 reg/wsl/wifi 等 Win-only 命令） |

**Win-only 命令列表**（共 ~12 个，非 Win 显示降级提示）：
- `reg`, `regset`, `regdel`, `regfind`（注册表）
- `wsl`, `wslkill`, `docker`（WSL/容器）
- `wifipwd`, `wifiexp`（Wi-Fi 密码导出）
- `gpedit`, `msconfig`, `powercfg`（Windows 特有系统工具）
- `eventvwr`（Windows 事件查看器）

---

## 7. 错误处理策略

```typescript
// 自定义错误类型
class JcError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
    public platform?: string   // 需要特定平台但当前不是
  ) {}
}

class PlatformNotSupportedError extends JcError {
  constructor(command: string, requiredPlatform: string) {
    super(
      `此命令仅支持 ${requiredPlatform}`, 
      3,
      requiredPlatform
    )
  }
}
```

- 所有命令统一 try/catch
- 非预期错误打印 stack trace（`--verbose` 模式）
- 预期错误（如端口无进程）友好提示，不崩

---

## 8. 测试策略

| 层级 | 内容 | 工具 |
|------|------|------|
| 单元测试 | 路由解析、输出格式化、帮助生成 | Vitest |
| 命令测试 | mock 系统 API 接口，验证各命令 handler | Vitest + vi.mock |
| 集成测试 | 实际执行少量安全命令（如 `jc w host`） | Vitest |
| 跨平台测试 | CI 矩阵（ubuntu/macos/windows） | GitHub Actions |

---

## 9. 里程碑

```
Phase 1: 项目初始化 & 路由 & 核心命令 (0.1.0)
  Day 1:  项目脚手架 + CLI 路由 + 输出格式化
  Day 2:  proc 类全部 8 命令
  Day 3:  sys 类全部 12 命令
  Day 4:  net + file 类全部 28 命令
  Day 5:  测试 + 发布 0.1.0

Phase 2: 剩余类别 & claude/happy (0.2.0)
  Day 6:  svc/pwr/reg/task 类
  Day 7:  tools/user/wsl + claude/happy 组
  Day 8:  跨平台适配 + 测试

Phase 3: 完善 (0.3.0 → 1.0.0)
  Day 9:  文档 + CI/CD + 发布
```
