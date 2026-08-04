# jc TOML 化设计（builtin commands → declarative config + Capability hooks）

日期：2026-08-04
状态：Draft — 待 plan 模式过一遍后实施
决策者：joke-lx / Claude Code

## Context

jc 的 111 条命令（claude 4 / happy 7 / mgr 13 / w 87）现在是 TS class（`class XxxCommand extends Command`），每条约 30-50 行。其中：

- **~42 条是纯"启外部进程 / 打开东西"**（`spawn` / `open`）——本质是 KV，不需要 class
- **~45 条是真逻辑**（`w proc.kill`、`w sys.cpu`、mgr add/import 等）——需要 TS 实现，但 metadata 仍该配置化
- **~24 条是 fs 操作**（cp/mv/rm/ls/find）——真逻辑

现状的问题：
1. 用户要增删改一条命令，必须改 TS、重 build、发版
2. metadata（name/description/examples/helpText）和实现（handler body）耦合在同一 class
3. 无法"禁用"一条命令、无法热重配 platform/alias

目标：**把 metadata 全部声明化（TOML），实现收敛到少数 Capability，让 111 条命令无例外地可寻址、可禁用、可重配。**

## 核心概念：两个槽，各归其位

| 槽 | 用途 | 归属 | 谁消费 |
|---|---|---|---|
| `{cli}` | 显示文本里的命令名占位 | examples / helpText | `cliText()` 渲染层 |
| `hook` | 执行逻辑的插槽 | 每条命令指向一个 Capability | `capabilities` 注册表 |

- `{cli}` 是**文本槽**：TOML 是数据，没有插值，所以写 `{cli}` 字面，渲染层单次 `replaceAll` 替换成当前 CLI 名。
- `hook` 是**逻辑槽**：不写实现，只写"用哪个 Capability"。

## TOML schema

```toml
[[command]]
name        = "kill"
group       = "w"
description = "按 PID 杀进程"
helpText    = "用法:\n  {cli} w k <PID>  - 强制结束指定 PID"
examples    = ["{cli} w k 1234"]
params      = [{ name = "pid", type = "int", required = true }]
hook        = "proc.kill"
danger      = "destructive"
platform    = ["win32"]

[[command]]
name        = "run"
group       = "claude"
description = "启动 Claude Code"
examples    = ["{cli} c run"]
hook        = "spawn"
with        = { bin = "claude", args = ["{{@rest}}"] }
danger      = "safe"
```

字段：

| 字段 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `name` | ✅ | string | 命令名 |
| `group` | ✅ | string | 所属 group（claude/happy/mgr/w） |
| `description` | ✅ | string | 列表展示 |
| `hook` | ✅ | string | Capability 名（能力域命名，见下） |
| `with` | ❌ | any | hook 的配置，形态由 hook 决定，位置固定 |
| `examples` | ❌ | string[] | 含 `{cli}` 占位 |
| `helpText` | ❌ | string | 含 `{cli}` 占位 |
| `params` | ❌ | Param[] | 参数声明（named 绑定） |
| `alias` | ❌ | string[] | 附加命令名 |
| `danger` | ❌ | `"safe"` \| `"destructive"` | 默认 safe；destructive 触发 confirm |
| `platform` | ❌ | string[] | 如 `["win32"]`；空 = 全平台 |
| `enabled` | ❌ | boolean | 默认 true；false = 禁用 |

`with` 用**统一键**而非多态兄弟表：`hook` 决定 `with` 的形态，但字段名固定。校验只有一条路径 `capability.parse(cmd.with)`。

## Capability 接口

```ts
interface Capability<C = unknown> {
  // 加载期校验 + 定型。TOML 加载时全量跑一遍（= mgr doctor）。
  parse(raw: unknown): C
  // 执行。cfg 已定型，args 已绑定，零断言。
  run(cfg: C, args: string[], ctx: Ctx): Promise<void>
}

type Ctx = {
  dryRun: boolean
  confirm: (msg: string) => Promise<boolean>
  audit: (hook: string, args: string[]) => void
}
```

`parse` 的价值：
- 配置错误在**启动时**暴露，不是执行到那条命令才炸
- `run` 拿到的 `cfg` 已校验，不再有 `cmd.spawn!` 类非空断言
- `parse` 全量跑 = `mgr doctor` 的检查点

预置 Capability（阶段 1）：

```ts
export const capabilities: Record<string, Capability> = {
  spawn: {
    parse: (raw) => validate({ bin: str, args: str[]? }, raw),
    run: (cfg, args) => spawn(cfg.bin, bindArgs(cfg.args, args), { stdio: 'inherit' }),
  },
  open: {
    parse: (raw) => validate({ target: str }, raw),
    run: (cfg) => open(cfg.target),
  },
  'proc.kill': {
    parse: () => null,
    run: (_cfg, args) => killProcess(parseInt(args[0]!, 10)),
  },
  // ... 阶段 2 按需补充
}
```

## dispatch：唯一调用点（模板方法）

不变量全部收敛到 dispatch，Capability 只剩 `run` —— **结构上不可能跳过 confirm**（它没有机会）。

```ts
async function dispatch(cmd: TOMLCommand, argv: string[], ctx: Ctx) {
  const cap = capabilities[cmd.hook]               // 未知 hook → 加载期报错
  if (!cap) throw new Error(`未知 hook: ${cmd.hook}`)
  const cfg = cap.parse(cmd.with)                  // with 形态由 hook 决定

  if (cmd.enabled === false) throw new Disabled(cmd)
  if (cmd.platform?.length && !cmd.platform.includes(process.platform))
    throw new Unsupported(cmd)

  const args = bindParams(cmd.params, argv)        // 含 {{@rest}} / {{name}} 插值
  if (cmd.danger !== 'safe') await ctx.confirm(...)
  if (ctx.dryRun) return printPlan(cmd, args)
  ctx.audit(cmd.hook, args)
  return cap.run(cfg, args, ctx)                   // 只有这一行进入 hook
}
```

TS 没有 `final`，抽象基类挡不住覆写；把不变量放在唯一调用点是最可靠的做法。

## params / `{{@rest}}` 消费规则

`params` 和 `with.args` 里的 `{{@rest}}` 都消费 argv，规则必须钉死：

```
params 先按 named 绑定消费 argv（从左到右，required 在前）
余下的 argv → {{@rest}}
{{name}} → 绑定的参数值；字面文本保留
```

```toml
# w.kill：params 消费 pid，无 @rest
params = [{ name = "pid", type = "int", required = true }]

# claude run：无 params，全量透传
with = { bin = "claude", args = ["{{@rest}}"] }
```

`bindParams` 在 dispatch 里完成参数绑定 + `{{@rest}}`/`{{name}}` 插值，`cap.run` 拿到的是**已绑定的 args**，不再碰 argv。

## hook 命名：能力域，不镜像命令路径

```toml
name = "kill"; group = "w"; hook = "proc.kill"   # ✓ 不是 w.proc.kill
```

hook 是能力名，与命令位置解耦。同一 hook 被两条命令引用（`w kill` 和 `w k`）不别扭。按能力域：`proc.kill` / `net.portkill` / `fs.copy` / `spawn` / `open`。

## 三层 hook 强度

| 层 | 覆盖 | 用户能改 | 说明 |
|---|---|---|---|
| **L1** | ~42 条 spawn/open 命令 | 配置全量（with/params/description） | 用户加命令 = 填 toml，不写代码 |
| **L2** | ~45 条真逻辑命令 | description/alias/enabled/platform，**不能改算法** | 可寻址性，非 DRY |
| **L3** | — | **不做** | 见决策记录 |

## L3 决策记录：不做

L3（用户自定义 hook，`~/.config/jc/hooks/*.ts`）被 L1 覆盖：

```toml
[[command]]
name = "build"
hook = "spawn"
with = { bin = "node", args = ["~/scripts/build.mjs", "{{@rest}}"] }
```

用户插逻辑写个脚本用 `spawn` 拉起即可。L3 的成本：
- ESM 打包的 CLI 无法 `import .ts`，内置 tsx +30MB 或只允许 `.mjs`
- 配置目录变代码执行入口，jc 权限 = 用户代码权限（信任模型崩塌）
- `Ctx` 形态一变，所有用户 hook 全挂（版本契约锁死内部接口）

换来的进程内毫秒级收益不值。若将来做：限定 `.mjs` + 只传 `(cfg, args)` 纯数据、不暴露 `Ctx`。

## 迁移阶段

### 阶段 0：基线（当前）
- 170/170 测试通过
- 生成 `.snap/*.help` 快照（见门禁）

### 阶段 1：切换 `{cli}` 占位符
- `meta.ts` 加 `CLI_TOKEN = '{cli}'`
- 111 个命令的 examples/helpText/related 里 `jc` → `{cli}`（codemod，只碰 metadata）
- `cliText()` 从正则 `(^|[\s|;])jc(?=[\s|;]|$)` 换成 `replaceAll(CLI_TOKEN, name)`，删正则
- `Command.bin` getter 返回 `CLI_TOKEN` 而非 `META.binaryName`（TS 类与 TOML 共用同一渲染出口）
- 守卫测试：metadata 不得含裸 `jc`；漏过 cliText 的地方会显示 `{cli}`（响亮失败）
- 重新生成 `.snap/*.help`，与阶段 0 对比应**字节级相同**（占位符在渲染后等价）

### 阶段 2：建内核
- `src/core/capabilities.ts`：Capability 接口 + spawn/open + 首批真逻辑 hook
- `src/core/dispatch.ts`：唯一调用点
- `src/core/toml.ts`：TOML 解析 + `parse` 全量校验
- **Capability 是新文件、新继承树，不要 `extends Command`**

### 阶段 3：迁移 metadata
- `builtin.toml`：claude/happy 全量 + w 的 spawn/open 命令 + mgr 简单命令
- 对应 class 文件删除（metadata 移到 toml，executor 提炼为 Capability.run）
- `.snap/*.help` 对比保持字节级相同

### 阶段 4：迁移真逻辑命令
- 45 条真逻辑命令的 metadata 进 toml，executor 进 capabilities 注册表
- 111 条命令**无例外**全部可寻址、可禁用、可重配

### 阶段 5：用户配置层
- 用户配置 `~/.config/jc/aliases.toml` 与 builtin 合并，用户条目覆盖内置
- `jc mgr add` 写用户配置
- `jc mgr list` / `check` / `doctor` 基于合并后的注册表

### 阶段 6：清理 + 文档
- 删一次性脚本 / 旧 class 残留
- 更新 skill reference（routing-and-command-authoring 重写为 TOML 视角）
- 更新 README（"扩展 jc"章节改为填 toml 示例）

## 门禁

每个阶段结束必须跑：

```bash
# 1. 单元测试
npm run test                # 期望 170+ 全过（新增不降）

# 2. 快照对比（阶段 1-4 的核心门禁）
mkdir -p .snap
for g in c hy w m; do node dist/index.js $g --help > .snap/$g.help; done
# 阶段 0 存基线；之后每阶段重新生成并与基线 diff，期望字节级相同
git diff --exit-code .snap/

# 3. 构建
npm run build
```

`.snap/` 基线必须在 `${this.bin}` → `{cli}` 切换后、TOML 迁移前生成，否则记录的是中间态。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| `{cli}` 切换引入回归 | 阶段 1 结束时快照对比，字节级相同才进阶段 2 |
| TOML 解析器选择（@iarna/toml vs smol-toml） | 阶段 2 定；偏好无依赖的 smol-toml |
| 45 条真逻辑命令提炼时行为漂移 | executor 原样搬进 Capability.run，diff 只改包装 |
| 用户配置覆盖内置的冲突语义 | 阶段 5 定：用户条目优先，warning 提示 |
| hook 名称与命令路径混淆 | 能力域命名，spec 明示禁止 group 前缀 |
| `platform` 从标量改数组是破坏性变更 | 现在就定数组，不留升级债 |

## 与现存代码的关系

| 现物 | 去向 |
|---|---|
| `src/cli/Command.ts` 基类 | 阶段 3-4 后废弃（metadata 进 toml）；executor 提炼为 Capability.run |
| `src/groups/**/*.ts` 111 个 class | 阶段 3-4 逐批删除 |
| `src/shared/config/*`（cname launcher） | 保留 —— 那是 jc 自身入口别名，与命令注册表正交 |
| `src/cli/output.ts` cliText | 保留，改为 replaceAll(CLI_TOKEN) |
| `Command.bin` getter | 返回 CLI_TOKEN（阶段 1） |
