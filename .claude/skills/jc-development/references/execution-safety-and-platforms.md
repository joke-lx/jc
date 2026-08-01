---
name: execution-safety-and-platforms
description: 在修改子进程执行、Shell 处理、信号、平台门禁、退出码或破坏性操作确认逻辑时加载。
---

加载时机：只要你要派生子进程、调用 `execSync`、发送信号、按 `process.platform` 决定行为、设置退出码，或对破坏性操作要求确认时，就应加载本 reference。本文件锁定仓库已有的三种执行模式、用户参数处理规则、平台门禁决策树、退出码契约以及破坏性操作确认 helper 的形态。在新增或评审上述任一场景前先读本文件。

## 决策顺序

先选定执行模式，再决定如何处理用户参数，再决定如何门禁平台支持，再决定退出码，最后再考虑是否需要确认提示。之所以强调顺序，正是因为下面这些 legacy hazard 大多源自决策顺序颠倒。

## 1. 执行模式

仓库有三种执行模式，每种都有典型规范位置与决策规则。

### 1.1 `child_process.spawn` 包装（交互式长时子进程首选）

当子进程需要独占终端（`stdio: 'inherit'`），或需要真实转发信号与退出码时，使用 `spawn`。handler 在 `code === 0` 时 resolve，其他情况或 `error` 时 reject。

**正确示例 —— 规范位置**：`src/groups/claude/run.ts:3-9`

```ts
// src/groups/claude/run.ts:3-9
export async function handler(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { stdio: 'inherit', shell: true })
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`claude exit code ${code}`)))
    child.on('error', (e) => reject(e))
  })
}
```

**正确示例 —— 第二规范位置**：`src/groups/happy/daemon.ts:3-9`

```ts
// src/groups/happy/daemon.ts:3-9
export async function handler(_args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('happy', ['daemon'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })
}
```

两处都用 `shell: true`，因为子进程是已知的启动器二进制（`claude`、`happy`），且包装层不需要防御 `args[0]` 被攻击者控制的情况；命令字符串是固定的。当用户参数需要流入命令时，去掉 `shell: true` 并把 `args` 作为数组传入——见第 2 节。

### 1.2 `child_process.execSync`（同步 Shell 动作）

当命令很短、能一次性跑完，调用方在它运行期间也没有其他工作可做时，使用 `execSync`（Windows 服务控制、shutdown、lock 等）。继承 stdio 以让输出直达用户。

**正确示例 —— 规范位置**：`src/groups/w/pwr/off.ts:5`

```ts
// src/groups/w/pwr/off.ts:5
const cmd = process.platform === 'win32' ? 'shutdown /s /t 5' : 'shutdown -h now'
execSync(cmd, { stdio: 'inherit' })
```

这里的 `execSync` 是安全的，因为命令字符串完全字面；唯一的插值是 `process.platform`，不是用户输入。一旦开始把用户参数插进字符串，就应当改用带参数数组的 `spawn`——见第 2 节。

### 1.3 直接的 `process.kill` 信号

当你需要向某个 PID 发送信号、且不需要与目标进程做其他交互时，使用 `process.kill`。仓库里有两种模式：adapter 管理的 SIGTERM→SIGKILL 升级，以及由用户标志驱动的 SIGTERM（软）/ SIGKILL（硬）切换。

**正确示例 —— adapter 升级**：`src/shared/system/process.ts:104-111`

```ts
// src/shared/system/process.ts:104-111
async killProcess(pid: number): Promise<void> {
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // If SIGTERM fails, try SIGKILL
    process.kill(pid, 'SIGKILL')
  }
}
```

这是 try/catch 升级逻辑的合适位置，因为它是被所有调用方共用的单点；不要在每个命令 handler 里再复制一遍 SIGTERM→SIGKILL。

**正确示例 —— 用户标志切换**：`src/groups/w/proc/portkill.ts:23-29`

```ts
// src/groups/w/proc/portkill.ts:23-29
const isListOnly = args.includes('--list')
const isSoft = args.includes('--soft')

console.log(`端口 ${port} 被以下进程占用:`)
procs.forEach(p => console.log(`  PID: ${p.pid}, 名称: ${p.name}`))

if (isListOnly) return
```

接下来在 33-37 行根据 `SIGTERM`（`--soft`）与 `SIGKILL`（默认）选择信号。`--list` 与 `--soft` 的语义见第 7 节。

## 2. 用户参数处理

**规则**：用户参数绝不能被插值进 Shell 命令字符串。两种可接受的替代：

1. **带参数数组的 `spawn`，且不开 shell**。构造 `['arg1', 'arg2', ...]` 作为第二个参数传入；不要传 `shell: true`。剩下的由 Node 的 argv 转义处理。
2. **`powershell -NoProfile -Command -` 配合 stdin 输入的 `ArgumentList`**。当必须调用一个没有稳定二进制名的 Windows cmdlet 时，通过 stdin 驱动 `powershell`，让命令文本永远不把用户输入带上命令行。

示意（拆为两个代码块以保持单块 ≤ 30 行）：

```ts
// Pattern A: arg-array spawn, no shell
import { spawn } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  const cmd = 'reg'
  const argv = ['add', args[0] ?? '', '/v', args[1] ?? '', '/d', args.slice(2).join(' '), '/f']
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, argv, { stdio: 'inherit', windowsHide: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })
}
```

```ts
// Pattern B: PowerShell via stdin with ArgumentList
import { spawn } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  const psArgs = ['-NoProfile', '-Command', '-']
  const script = `
    $path = $args[0]
    $name = $args[1]
    $value = $args[2]
    Set-ItemProperty -Path $path -Name $name -Value $value
  `
  await new Promise<void>((resolve, reject) => {
    const child = spawn('powershell', psArgs, { stdio: ['pipe', 'inherit', 'inherit'] })
    child.stdin.write(script)
    child.stdin.end()
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })
}
```

### 明确的错误位置（legacy hazard —— 不要新增同类）

以下每处都把用户传入的 `args[i]` 插值进 Shell 命令字符串。这里列出来是为了让评审员能识别同形态的新增。

- **`src/groups/w/svc/svcstart.ts:7`** —— **Bad example**：`execSync(`net start "${name}"`, ...)`，其中 `name = args[0]`。
- **`src/groups/w/task/taskrun.ts:8`** —— **Bad example**：`execSync(`powershell -NoProfile "Start-ScheduledTask -TaskPath '\\' -TaskName '${name}'"`, ...)`，把 `name = args[0]` 原样插进 PowerShell 单引号字符串。
- **`src/groups/w/reg/regset.ts:14`** —— **Bad example**：`execSync(`reg add "${path}" /v "${name}" /d "${value}" /f`, ...)`，插入了三个用户参数。
- **`src/groups/w/reg/regdel.ts:13`** —— **Bad example**：`execSync(`reg delete "${path}" /f`, ...)`，把 `path = args[0]` 插值。
- **`src/groups/w/reg/regfind.ts`** —— **Bad example**：任何插值位置；搜索关键字 `args[0]` 直接流入 `reg query HKCU /s /f "${args[0] || ''}"`（第 10 行）。

评审新命令时，凡是发现 handler 通过模板字符串引用 `args[*]` 来拼命令，都应驳回。

## 3. 平台门禁决策树

三种情形，三条规则。

### 3.1 声明式仅 Windows 命令

在 `commandDef` 上设置 `platform: 'win32'`。router 在 `src/cli/router.ts:88-91` 执行门禁：

```ts
// src/cli/router.ts:88-91
if (cmd.platform === 'win32' && process.platform !== 'win32') {
  console.error('错误: 此命令仅支持 Windows')
  process.exit(3)
}
```

handler 内不需要再写任何平台检查。

**正确示例**：`src/groups/w/net/wifipwd.ts:23`

```ts
// src/groups/w/net/wifipwd.ts:23
platform: 'win32',
```

### 3.2 跨平台且两个分支都有意义的命令

用 `process.platform === 'win32'` 三元在 handler 体内选择分支；遇到没有合适分支的情况时，向用户报错。规范把这个模式描述为"行内 `process.platform` 检查 + `console.error` + `return`"；目前最接近该形态的实例是 lock 命令。

**正确示例**：`src/groups/w/pwr/lock.ts:5-7`

```ts
// src/groups/w/pwr/lock.ts:5-7
const cmd = process.platform === 'win32'
  ? 'rundll32.exe user32.dll,LockWorkStation'
  : 'loginctl lock-session'
```

注意：`lock.ts` 在单个三元里选出对应平台的命令，并未走 `console.error` + `return` 兜底，因为两个分支都覆盖了仓库支持的系统。若你的跨平台命令存在"不适用"的兜底（例如"本系统不适用"），按规范补上 `console.error` + `return`；**不要**在分支内部 `process.exit`（那是 router 的职责）。

### 3.3 已被声明式门禁覆盖的硬不兼容命令

**不要**重复平台门禁。router 已经在 `src/cli/router.ts:88-91` 强制 `platform: 'win32'`；handler 内再写一遍，在 win32 上是死代码，在非 win32 上又走不到。

**Legacy hazard —— 重复门禁**：

- `src/groups/w/reg/regset.ts:4-6` —— `function requireWin()` 在 router 已门禁后再次检查 `process.platform`。
- `src/groups/w/reg/regdel.ts:4-6` —— 同一 `requireWin()` helper 的复制。
- `src/groups/w/reg/regfind.ts:4-6` —— 同一 `requireWin()` helper 的复制。
- `src/groups/w/task/taskrun.ts:5` —— router 门禁后再加行内 `if (process.platform !== 'win32')`；同时也是 handler 内提前 `process.exit(3)` 的 **Bad example**。
- `src/groups/w/task/taskstop.ts:5` —— 同样的行内检查。
- `src/groups/w/task/task.ts:5` —— 同样的行内检查。
- `src/groups/w/wsl/wsl.ts:5`、`src/groups/w/wsl/wslkill.ts:5`、`src/groups/w/wsl/docker.ts:5` —— 同样的行内检查。

这些都早于声明式 `platform: 'win32'` 字段的出现；下次触及对应命令时应一并清理。

## 4. 退出码契约

退出码契约是固定的，不要新增。

| Code | 含义 | 真理来源 |
|---|---|---|
| `0` | 成功 | `docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md:69-75` |
| `1` | 未知命令 / 用法错误 | `docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md:69-75` |
| `2` | 执行失败（如 kill 进程失败） | `docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md:69-75` |
| `3` | 平台不支持 | `docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md:69-75` |

执行点：

- `src/cli/router.ts:58` —— 未知 group → `process.exit(1)`。
- `src/cli/router.ts:90` —— win32 门禁失败 → `process.exit(3)`。
- `src/cli/router.ts:106` —— 未知命令兜底 → `process.exit(1)`。
- `src/groups/w/proc/kill.ts:20` —— 执行失败 → `process.exit(2)`。

新增命令时不要自创新码。若需要表达第四类失败，先在设计规范里修改契约并同步所有 reference；不要把一次性改动带进主分支。

## 5. 破坏性操作的确认

破坏性操作的提示（删除目录、删除注册表项、批量结束进程等）必须走一个独立的 helper，而不是行内的 `process.stdin.once('data', ...)`。

**正确示例 —— 独立 helper**：`src/groups/w/file/rm.ts:5-13`

```ts
// src/groups/w/file/rm.ts:5-13
function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}
```

在 `src/groups/w/file/rm.ts:26` 的用法：`const ok = await confirm(`确认删除目录 "${dir}"? (y/N) `)`。该 helper 在每条路径上都关闭 readline 接口，处理大小写，且可以独立进行单元测试。

**错误示例 —— legacy hazard**：`src/groups/w/reg/regdel.ts:13-18`

```ts
// src/groups/w/reg/regdel.ts:13-18
const answer = await new Promise<string>(resolve => process.stdin.once('data', d => resolve(d.toString().trim().toLowerCase())))
if (answer === 'y') {
  execSync(`reg delete "${path}" /f`, { stdio: 'inherit' })
} else {
  console.log('已取消')
}
```

裸 `process.stdin.once('data', ...)` 模式让 stdin 流只消费一半（没有 `pause`/`resume` 配对，没有 close），不回显提示，且不可独立测试。下次触及该命令时，改用 `rm.ts:5-13` 中的 `confirm()` helper。

## 6. 平台门禁总结

- 声明式门禁（在 `commandDef` 上设 `platform: 'win32'`）→ 由 router 强制，handler 保持干净。
- 跨平台 handler → handler 顶部单个三元；若分支为 no-op，再加 `console.error` + `return`。
- 已被声明式门禁覆盖的硬不兼容 handler → 不要重复检查。
- 仅在 router 无法产生正确退出码时，handler 内才允许 `process.exit`；win32 门禁由 router 负责。

## 7. 软/硬 kill 标志

参考模型是 `src/groups/w/proc/portkill.ts`：

- `--list` —— 只查询，不杀。`src/groups/w/proc/portkill.ts:29` 的 `if (isListOnly) return` 强制该行为。
- `--soft` —— 发送 `SIGTERM` 而非 `SIGKILL`；`src/groups/w/proc/portkill.ts:33-34` 选择该路径。
- 默认（无标志）—— 发送 `SIGKILL`；`src/groups/w/proc/portkill.ts:35-37` 选择该路径。

新增 kill 风格命令时，复制这套标志与帮助文本格式（`用法: jc w <cmd> <target> [--list|--soft]`），让用户能跨命令预测行为。

## 跳转链接

- 本 skill 的设计规范：`docs/superpowers/specs/2026-07-29-jc-development-skill-design.md`
- 项目原始规范（退出码契约）：`docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md`
- 项目原始实施计划：`docs/superpowers/plans/2026-06-20-jc-implementation.md`
