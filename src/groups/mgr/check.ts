import { Command } from '../../cli/Command.js'
import { error } from '../../cli/output.js'
import { cliText } from '../../cli/output.js'
import { isInteractive, prompt, promptChoice, NoTTYError } from '../../shared/registry/prompt.js'
import { getItem, listItems, updateItemVerifiedAt } from '../../shared/registry/store.js'
import { validateSource } from '../../shared/registry/validate.js'

// src/groups/mgr/check.ts
// 重写以支持"无 alias → 单/全选 → 全选批量检查 → 失败项问重试"。
//
// 设计动机：用户最常见的真实场景不是"我有目的地 check 一个"，而是"我刚切机，
// 想看看哪些还能跑"。原版只能"提供 alias 才能用"——很糟糕。

type Scope = 'one' | 'all'

async function resolveScope(): Promise<Scope> {
  const items = listItems()
  if (items.length === 0) {
    console.error(error('注册表为空；请先 jc mgr add'))
    process.exit(2)
  }
  const v = await promptChoice<Scope>('检查范围？', [
    { label: '单个 alias（随后会问）', value: 'one' },
    { label: '全部已注册 alias', value: 'all' },
  ])
  if (!v) { console.error(error('已取消（空输入）')); process.exit(1) }
  return v
}

async function checkOne(alias: string): Promise<{ ok: boolean; reason?: string; exec?: string }> {
  const item = getItem(alias.toLowerCase())
  if (!item) return { ok: false, reason: `未找到 alias: ${alias}` }
  const v = await validateSource(item)
  if (!v.ok) return { ok: false, reason: v.reason }
  updateItemVerifiedAt(item.alias, new Date().toISOString())
  return { ok: true, exec: v.exec }
}

async function executeCheck(args: string[]): Promise<void> {

  let [alias] = args

  if (!alias) {
    if (!isInteractive()) {
      console.error(error(cliText('用法: {cli} mgr check <alias>')))
      console.error(error('提示: 缺 alias 且当前为非交互模式。请提供 alias 或加 --yes 后跟值。'))
      process.exit(1)
    }
    try {
      const scope = await resolveScope()
      if (scope === 'one') {
        const items = listItems()
        console.log('已注册 alias:')
        for (const it of items) console.log(`  ${it.alias}  (${it.kind})`)
        const picked = await prompt('输入 alias: ')
        if (!picked) { console.error(error('已取消（空输入）')); process.exit(1) }
        alias = picked
      } else {
        // 全选：逐项检查，汇总失败的，问是否重试。
        const items = listItems()
        console.log(`检查全部 ${items.length} 项...`)
        const failed: { alias: string; reason: string }[] = []
        for (const it of items) {
          const r = await checkOne(it.alias)
          if (r.ok) console.log(`  OK   ${it.alias}`)
          else { console.log(`  FAIL ${it.alias}: ${r.reason}`); failed.push({ alias: it.alias, reason: r.reason! }) }
        }
        if (failed.length === 0) { console.log('全部 OK'); return }
        const retry = await prompt(`${failed.length} 项失败；重试？ [y/N] `)
        if (retry.toLowerCase() !== 'y') { console.log('已取消（不重试）'); process.exit(1) }
        for (const f of failed) {
          const r = await checkOne(f.alias)
          console.log(`  ${r.ok ? 'OK  ' : 'FAIL'} ${f.alias}${r.ok ? '' : `: ${r.reason}`}`)
        }
        return
      }
    } catch (e) {
      if (e instanceof NoTTYError) { console.error(error(e.message)); process.exit(2) }
      throw e
    }
  }

  const r = await checkOne(alias)
  if (!r.ok) { console.error(error(`${alias} 不可达: ${r.reason}`)); process.exit(2) }
  console.log(`OK: ${alias} (${r.exec})`)

}

export class CheckCommand extends Command {
  name = "check"
  description = "重新验证已注册项的源是否可达（无 alias 时交互选单个/全部）"
  examples = [`${this.bin} mgr check tsc`, `${this.bin} mgr check   # TTY 下选单个/全部`]
  related = [`${this.bin} mgr add`, `${this.bin} mgr list`]

  async handler(args: string[]): Promise<void> {
    return executeCheck(args)
  }
}

export const commandDef = new CheckCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
