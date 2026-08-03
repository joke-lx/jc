// src/groups/mgr/rm.ts
import { error } from '../../cli/output.js'
import { cliText } from '../../cli/output.js'
import { confirm } from '../../shared/registry/confirm.js'
import { getItem, listItems, removeItem } from '../../shared/registry/store.js'
import { isInteractive, prompt, NoTTYError } from '../../shared/registry/prompt.js'
import { Command } from '../../cli/Command.js'

async function executeRm(args: string[]): Promise<void> {

  let [alias] = args
  if (!alias) {
    if (!isInteractive()) {
      console.error(error(cliText('用法: jc mgr rm <alias>')))
      console.error(error('提示: 缺 alias 且当前为非交互模式。请提供 alias 或加 --yes 后跟值。'))
      process.exit(1)
    }
    const items = listItems()
    if (items.length === 0) {
      console.error(error('注册表为空'))
      process.exit(2)
    }
    console.log('已注册 alias:')
    for (const it of items) console.log(`  ${it.alias}  (${it.kind})`)
    try {
      const picked = await prompt('输入要删除的 alias: ')
      if (!picked) { console.error(error('已取消（空输入）')); process.exit(1) }
      alias = picked
    } catch (e) {
      if (e instanceof NoTTYError) { console.error(error(e.message)); process.exit(2) }
      throw e
    }
  }

  const item = getItem(alias.toLowerCase())
  if (!item) { console.error(error(`未找到 alias: ${alias}`)); process.exit(2) }
  const ok = await confirm(`确认删除 alias "${item.alias}"? (y/N) `)
  if (!ok) { console.log('已取消'); return }
  removeItem(item.alias)
  console.log(`已删除: ${item.alias}`)

}

export class RmCommand extends Command {
  name = "rm"
  description = "按别名删除已注册的项（需确认；缺 alias 时交互选择）"
  examples = [`${this.bin} mgr rm tsc`, `${this.bin} mgr rm   # TTY 下选 alias`]
  related = [`${this.bin} mgr list`, `${this.bin} mgr rename`]

  async handler(args: string[]): Promise<void> {
    return executeRm(args)
  }
}

export const commandDef = new RmCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
