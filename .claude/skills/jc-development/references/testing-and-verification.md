---
name: testing-and-verification
description: 在新增/修改测试，或在 CI/本地为 jc CLI 断言新行为时加载。
---

# testing-and-verification

新增测试、修改测试、在 CI 中断言新行为，或为发布做本地验证时，加载本 reference。本文件锁定测试清单、运行器配置、规范的验证命令集、本项目**未运行**的检查、按面拆分的覆盖缺口矩阵，以及对触达 system adapter 的测试的 mock 策略。

## 加载时机

- 你正在新增测试文件或扩展现有测试文件。
- 你正在新增或修改 `commandDef`，需要知道对应的测试义务。
- 你正在通过 `src/shared/system/**` 接入新系统资源，需要知道如何 mock 新工厂。
- 你正在跑测试、调试失败，或准备发布。
- 你正在评审一个新增了 `commandDef` 却没匹配测试的 PR，需要一行规则作为依据。

## 当前测试清单

| 测试文件 | 断言内容 | 来源 |
|---|---|---|
| `tests/cli/router.test.ts` | `parseArgs` 与 `route` 对四种参数形态的派发，以及空 argv 帮助分支。 | `tests/cli/router.test.ts:1-31` |
| `tests/shared/system/process.test.ts` | `getProcessByName` 能拿到 `node` 的实时数据；`killProcess` 对不存在的 PID 拒绝；`getTopProcesses('cpu', 5)` 最多返回 5 条（最后一项被吞错处理包裹——见 mock 策略）。 | `tests/shared/system/process.test.ts:1-27` |
| `tests/shared/system/cpu.test.ts` | `getCpuManager().getInfo()` 返回正值的物理/逻辑核心数，以及非空 `brand` 字符串。 | `tests/shared/system/cpu.test.ts:1-11` |
| `tests/shared/system/disk.test.ts` | `getDiskManager().getInfo()` 至少返回一条记录，`drive` 非空且 `sizeGB` 为正。 | `tests/shared/system/disk.test.ts:1-11` |

以上四份文件即当前的完整测试面。清单短是有意为之：本 CLI 是 adapter 调用与 router 的薄封装，下文的矩阵是要补的缺口，而不是已经充分覆盖的快照。

## 测试运行器配置

`vitest` 2.1.x，配 `globals: true` 与 `environment: 'node'`：

```ts
// vitest.config.ts:1-8
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
```

`npm test` 与 `npm run test:watch` 是两个运行器入口：

```json
// package.json:15-16
"test": "vitest run",
"test:watch": "vitest",
```

`npm test` 是 CI/一次性验证路径；`npm run test:watch` 是本地 TDD 路径（变更后自动重跑）。两者都消费同一份 `vitest.config.ts`；不要新增第二份配置文件或 per-suite 覆盖，除非现有全局配置确实阻挡了某个 suite。

## 验证命令

按顺序的完整预发布本地序列。每条命令只做一件事，不要合并。

| 命令 | 目的 | 来源 |
|---|---|---|
| `npm test` | 跑一次 vitest 套件。 | `package.json:15` |
| `npm run build` | 通过 `tsup` 把 `src/index.ts` 打包为 `dist/index.js`。 | `package.json:13` |
| `node dist/index.js` | 冒烟测试产物包：必须打印顶层帮助并以 0 退出。 | `package.json:6-7`（入口） |
| `npm view je-cd@$(node -p "require('./package.json').version") version` | 确认 registry 看到的版本与 `package.json` 一致。在 `npm publish` 前抓出陈旧 tag 与未发布的预发布版本。 | n/a（CLI 组合） |
| `npm publish --provenance --dry-run` | 验证发布负载（文件、完整性、provenance 附加），不实际推送。dry-run 通过后，CI 的真实 `npm publish` 才算低风险。 | `package.json:12-18`（scripts） |

`npm run build` 必须在 `node dist/index.js` 之前；冒烟测试跑的是产物包，不是源码。`npm view` 一行用 `node -p` 从 `package.json` 读出版本号；这是有意的，不要把版本内联进去。

## 明确未启用的检查

本仓库**没有** lint、**没有** formatter、**没有** coverage 阈值、也**没有** `tsc --noEmit` 脚本。不要声称这些检查存在；在 PR 描述里如实说明它们缺失。

具体来说：

- 没有 ESLint、Biome 或 Prettier。`.tsup` 构建是 CI 中唯一运行的静态检查。
- `package.json:12-18` 中没有 coverage 门禁，也没有 `vitest --coverage` 调用。
- 没有 `tsc --noEmit` 脚本；类型错误只通过 `tsup` 的构建失败暴露。若要在脚本集里加 `tsc --noEmit`，在同一份改动里同步更新本清单与上文的验证表。

若有评审员问为什么一个拼写错误或未使用 import 会溜进来，指向本列表即可，这就是完整的答案。

## 目标覆盖矩阵

下表列出 CLI 中每个行为面，以及当前测试集合留下的缺口。每一行都是一项开放义务：触及某个面却不加测试是缺陷，不是欠账（参见下文"评审员规则"）。

| 面 | 当前缺口 | 新测试义务 |
|---|---|---|
| 除 `route([])` 之外的 router 分支 | `tests/cli/router.test.ts:27-30` 仅覆盖空 argv 分支；未知 group、未知命令、help 标志短路、category 派发与 `defaultHandler` 调用都没有测试。 | 为未知 group、未知命令、`?` / `-h` / `--help` 短路、category 派发，以及 `defaultHandler` 分支补 `route` 用例。 |
| `src/cli/router.ts:80` 的命令别名解析 | `c.name === parsed.command \|\| c.alias?.includes(parsed.command)` 没有测试；目前还没有带别名的 `Command` 定义，所以测试需要顺带至少加一个别名来触发该分支。 | 注册一个 `alias: ['x']` 的命令，断言 `route(['<g>', 'x'])` 能调用它。 |
| 平台门禁路径 | `src/cli/router.ts:88-91` 以退出码 3 强制 `platform === 'win32'`；没有测试覆盖 `process.exit(3)` 调用或成功路径。 | 加测试，断言在非 win32 主机上 `process.exit(3)` 分支、以及 win32 上的 no-op 路径。 |
| `output.ts` 的 chalk 封装 | `src/cli/output.ts:4-9` 导出 `jc`、`groupName`、`subCmd`、`error`、`warning`、`success`；没有测试断言它们是函数，或断言 `printCommandHelp` / `printGroupHelp` / `printCategoryHelp` 产出稳定输出。 | 加测试，捕获每个 printer 的 stdout，断言 fixture `Command` / `Group` / `Category` 渲染出的帮助文本。 |
| `adapter.ts` 工厂 | `src/shared/system/adapter.ts:16-26` 暴露七个工厂；现有测试只触达 `getCpuManager`、`getDiskManager` 与 `getProcessManager`。 | 加测试，调用每个工厂，断言返回的实例实现了文档化的 `*Manager` 接口形态。 |
| 进程成功路径 | `tests/shared/system/process.test.ts:13-16` 只覆盖 `killProcess` 的失败路径；对真实 PID 的 `killProcess`、`getProcessByPort`、`getListeningPorts` 都没有验证。 | 加测试，`spawn` 出一个一次性子进程，按端口找到它，断言 `killProcess` resolve。 |
| 每个新增/触及的 `commandDef` | 当前没有测试义务，因为该面尚未声明。 | 新增或修改任一 `commandDef` 时，至少加一个 vitest 用例：引入命令模块，mock 它依赖的 system adapter，用 fixture 参数向量调用 handler，断言用户可见输出（或在非 `win32` 主机上不发生 `process.exit`）。 |

触及上表任一行时，在同一份 PR 里把该行标为已关闭。除非生产改动必须先合入，否则不要把补缺口的测试拆成独立提交。

## Mock 策略

mock 的是 adapter 工厂，而不是底层的 `systeminformation` 库。mock 库会把测试与 `si` 的形态耦合，导致每次归一化调整都要级联到 fixture。adapter 才是 handler 实际消费的契约，因此测试 mock 的也应该是它。

推荐形态（整模块 mock）：

```ts
// tests/shared/system/example.test.ts
import { vi } from 'vitest'

vi.mock('../../src/shared/system/adapter.js', () => ({
  getCpuManager: () => ({
    getInfo: async () => ({
      manufacturer: 'test', brand: 'test',
      physicalCores: 4, logicalCores: 8,
      speedGHz: 3.0, loadPercent: 12.3,
    }),
  }),
}))
```

mock 路径使用 `.js` 后缀，即使源文件是 `.ts`；vitest 走与运行时相同的 ESM 解析规则。`tests/` 下的相对深度要与 `src/` 下的源码布局对应。

**错误示例** —— 用吞错处理掩盖测试缺口：

```ts
// tests/shared/system/process.test.ts:21-25
const top = await pm.getTopProcesses('cpu', 5)
expect(top.length).toBeLessThanOrEqual(5)
// (wrapped in try { ... } catch { ... } above)
```

`tests/shared/system/process.test.ts:21-25`（包裹 `getTopProcesses` 断言的 `try { ... } catch { ... }`）是 **Bad example**：空 `catch` 会吞掉环境相关失败，`expect` 只在 happy path 上跑。把吞错换成对 `getProcessManager` 的 `vi.mock`，让测试断言确定性的形态。不要把这种模式复制到新测试中。

对于 router 与 output 测试，无需 mock：这些模块不调用 `systeminformation`。上述 mock 策略仅在测试引入了 `get*Manager` 工厂或间接调用其中一个时适用。

## 评审员规则

触及某个面却不加测试是缺陷，不是欠账。上文的目标覆盖矩阵就是缺口台账；唯一可接受的扩展方式，是在触及该面的同一份改动里补齐缺失的测试。单独的 "follow-up" issue 不是可接受的替代——评审员应驳回 PR，并要求把测试加在同一次提交里。

评审时跑这份检查清单：

1. 本 diff 是否触及目标覆盖矩阵中的某一行？若是，是否在同一份 diff 中关闭？
2. 本 diff 是否新增了没有测试的 `commandDef`？驳回 PR。
3. 本 diff 是否引入了新的吞错处理？驳回 PR，并指向 `process.test.ts:21-25`。
4. 本 diff 是否新增了直接 `systeminformation` 引入？驳回 PR，并指向 `references/system-adapters.md` 中的 adapter 策略。

## 跳转链接

- Adapter 契约（mock 策略所针对的系统）：`references/system-adapters.md`。
- Router 与 command authoring 规则（多数测试会触达的面）：`references/routing-and-command-authoring.md`。
- 历史设计文档已归档到 git 历史（`docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md` 等），需要时 `git log --all` 可查。
