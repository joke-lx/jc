// src/core/dispatch.ts
// 声明式命令模型的唯一调用点（模板方法）。
//
// 所有不变量在这里收敛（spec docs/specs/2026-08-04-jc-toml-design.md）：
//   enabled 门禁 / platform 数组门禁 / bindParams 参数绑定 /
//   danger 危险确认 / dryRun / audit —— 全部在 dispatch，Capability 只剩 run。
//
// 为什么不把这些交给每个 hook 自己处理：TS 没有 final，抽象基类挡不住覆写。
// 把不变量放在唯一调用点，Capability 结构上不可能跳过 confirm（它没有机会）。
//
// 参数消费规则（spec 钉死）：
//   params 先按 named 绑定消费 argv（从左到右，required 在前）
//   余下的 argv → {{@rest}}
//   {{name}} → 绑定的参数值；字面文本保留
//
// 模板来源：cmd.with.args（spawn 等 hook 的 with 配置）。dispatch 读它做插值，
// 产出的 args 传给 cap.run。无模板（如 proc.kill 用 params）则传剩余 argv。
import { getCapability } from './capabilities.js'
import type { Ctx, Param, TOMLCommand } from './types.js'

interface BoundArgs {
  named: Record<string, string>
  rest: string[]
}

// 把 argv 按 params 声明消费成 named + rest。无 params → 全部进 rest。
export function bindParams(params: Param[] | undefined, argv: string[]): BoundArgs {
  const named: Record<string, string> = {}
  let cursor = 0
  for (const p of params ?? []) {
    if (cursor < argv.length) {
      named[p.name] = argv[cursor]!
      cursor++
    } else if (p.required) {
      throw new Error(`缺少必填参数: ${p.name}`)
    }
  }
  return { named, rest: argv.slice(cursor) }
}

// 展开模板 token：{{@rest}} → 剩余 argv 拼接；{{name}} → 绑定值；否则字面保留。
// 模板来自 cmd.with.args（spawn 等）。spawn 场景典型：
//   args = ["{{@rest}}"]                     → 全量透传
//   args = ["--file", "{{file}}", "{{@rest}}"] → 命名参数 + 剩余
export function expandTemplate(template: string[] | undefined, bound: BoundArgs): string[] {
  if (!template) return bound.rest
  return template.map((tok) => {
    if (tok === '{{@rest}}') return bound.rest.join(' ')
    const m = tok.match(/^\{\{(\w+)\}\}$/)
    if (m) return bound.named[m[1]!] ?? ''
    return tok
  })
}

// 提取 with.args 模板（若 with 是带 args 数组的对象）。其它形态返回 undefined。
function extractTemplate(withVal: unknown): string[] | undefined {
  if (!withVal || typeof withVal !== 'object') return undefined
  const args = (withVal as Record<string, unknown>).args
  if (Array.isArray(args) && args.every(x => typeof x === 'string')) return args as string[]
  return undefined
}

// 模板方法：唯一调用点。所有副作用边界在此，Capability 只提供 run。
export async function dispatch(cmd: TOMLCommand, argv: string[], ctx: Ctx): Promise<void> {
  const cap = getCapability(cmd.hook)   // 未知 hook → 抛错
  const cfg = cap.parse(cmd.with)        // with 形态由 hook 决定，加载期校验

  if (cmd.enabled === false) throw new Error(`命令已禁用: ${cmd.name}`)
  if (cmd.platform?.length && !cmd.platform.includes(process.platform)) {
    throw new Error(`命令不支持当前平台: ${process.platform}（仅 ${cmd.platform.join('/')}）`)
  }

  const bound = bindParams(cmd.params, argv)
  const template = extractTemplate(cmd.with)
  const args = expandTemplate(template, bound)

  if (cmd.danger !== 'safe') {
    const ok = await ctx.confirm(`确认执行 ${cmd.name}? (y/N) `)
    if (!ok) { console.log('已取消'); return }
  }

  if (ctx.dryRun) {
    console.log(`[dry-run] ${cmd.name} ${args.join(' ')} (hook: ${cmd.hook})`)
    return
  }

  ctx.audit(cmd.hook, args)
  return cap.run(cfg, args, ctx)
}
