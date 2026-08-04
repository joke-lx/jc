// src/core/capabilities.ts
// Capability 接口 + 注册表 + 首批实现。
//
// Capability 与 Command 是不同轴的抽象（spec docs/specs/2026-08-04-jc-toml-design.md）：
// - Command 是声明（metadata），未来被 TOML 记录取代。
// - Capability 是算法（唯一的副作用边界），长期存在。
//
// 本文件是"能力域"注册表：hook 名 → 实现。hook 是能力名（spawn / open / proc.kill），
// 与命令位置（group/name）解耦——同一条 hook 可被多条命令引用。
//
// 不变量：
// - parse 在 TOML 加载时全量跑一遍（= mgr doctor 的检查点）。失败即抛错，启动期暴露。
// - run 拿到的 cfg 已定型（parse 产物），零非空断言。
// - Capability 只暴露 parse + run；danger confirm / platform / dryRun / audit 由 dispatch
//   收敛（见 dispatch.ts），Capability 结构上无机会绕过。
import { spawn } from 'child_process'
import open from 'open'
import type { Ctx } from './types.js'

export interface Capability<C = unknown> {
  // 加载期校验 + 定型。raw 是 TOML 里 with 字段的原始值。
  // 抛 Error = 配置错误（加载期报错，不是执行到那条命令才炸）。
  parse(raw: unknown): C
  // 执行。cfg 已定型，args 已绑定（dispatch.bindParams 产物）。
  run(cfg: C, args: string[], ctx: Ctx): Promise<void>
}

// ---- 预置能力 ----

interface SpawnCfg { bin: string; args?: string[] }

function assertObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`with 必须是对象，得到: ${JSON.stringify(raw)}`)
  }
  return raw as Record<string, unknown>
}

function assertString(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`with.${field} 必须是非空字符串，得到: ${JSON.stringify(v)}`)
  }
  return v
}

function assertStringArray(v: unknown, field: string): string[] | undefined {
  if (v === undefined) return undefined
  if (!Array.isArray(v) || v.some(x => typeof x !== 'string')) {
    throw new Error(`with.${field} 必须是字符串数组，得到: ${JSON.stringify(v)}`)
  }
  return v as string[]
}

// spawn：启一个外部二进制并透传参数。
// 覆盖 L1 的 ~40 条 spawn 命令（claude/happy 全量 + w 的 reg/ping/ipconfig 等）。
//
// with 形态：{ bin: string, args?: string[] }。其中 args 是模板
// （如 ["{{@rest}}"] / ["--file", "{{file}}", "{{@rest}}"]），由 dispatch 展开后
// 以参数形式传给 run。run 收到的 args 已是最终 argv，不再碰 cfg.args（模板本身）。
const spawnCap: Capability<SpawnCfg> = {
  parse(raw) {
    const o = assertObject(raw)
    return {
      bin: assertString(o.bin, 'bin'),
      args: assertStringArray(o.args, 'args'),   // 校验模板形状；实际消费在 dispatch
    }
  },
  run(cfg, args, _ctx) {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(cfg.bin, args, { stdio: 'inherit', shell: true, windowsHide: true })
      child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)))
      child.on('error', reject)
    })
  },
}

// open：打开一个 URL / 路径（默认浏览器 / 关联应用）。
// 覆盖 w/tools 全家（code / msconfig / eventvwr 等 ~14 条）。
interface OpenCfg { target: string }

const openCap: Capability<OpenCfg> = {
  parse(raw) {
    const o = assertObject(raw)
    return { target: assertString(o.target, 'target') }
  },
  run(cfg) {
    return open(cfg.target)
  },
}

// ---- 注册表 ----

// hook 名 → Capability。新能力在此注册一行；阶段 4 提炼真逻辑命令时逐个补充。
export const capabilities: Record<string, Capability> = {
  spawn: spawnCap,
  open: openCap,
}

export function getCapability(hook: string): Capability {
  const cap = capabilities[hook]
  if (!cap) throw new Error(`未知 hook: ${hook}`)
  return cap
}
