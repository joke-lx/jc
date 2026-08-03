// src/groups/mgr/rename.ts
import { error } from '../../cli/output.js'
import { cliText } from '../../cli/output.js'
import { ALIAS_RE } from '../../shared/registry/types.js'
import { confirm } from '../../shared/registry/confirm.js'
import { getItem, listItems, renameItem } from '../../shared/registry/store.js'
import { isInteractive, prompt, NoTTYError } from '../../shared/registry/prompt.js'
import { Command } from '../../cli/Command.js'

async function executeRename(args: string[]): Promise<void> {

  let [oldAlias, newAlias] = args
  const needsInteractive = !oldAlias || !newAlias
  if (needsInteractive) {
    if (!isInteractive()) {
      console.error(error(cliText('用法: jc mgr rename <old-alias> <new-alias>')))
      console.error(error('提示: 参数不全且当前为非交互模式。请补全参数。'))
      process.exit(1)
    }
    try {
      if (!oldAlias) {
        const items = listItems()
        if (items.length === 0) { console.error(error('注册表为空')); process.exit(2) }
        console.log('已注册 alias:')
        for (const it of items) console.log(`  ${it.alias}  (${it.kind})`)
        const picked = await prompt('输入要改名的 old alias: ')
        if (!picked) { console.error(error('已取消（空输入）')); process.exit(1) }
        oldAlias = picked
      }
      if (!newAlias) {
        while (true) {
          const ans = await prompt('新 alias? (^[a-z0-9][a-z0-9_-]{0,31}$): ')
          if (ALIAS_RE.test(ans)) { newAlias = ans.toLowerCase(); break }
          console.log(`非法 alias: ${ans || '(空)'}`)
        }
      }
    } catch (e) {
      if (e instanceof NoTTYError) { console.error(error(e.message)); process.exit(2) }
      throw e
    }
  }

  const old = oldAlias!.toLowerCase()
  const next = newAlias!.toLowerCase()
  if (!ALIAS_RE.test(next)) { console.error(error(`alias 非法: ${next}`)); process.exit(1) }
  const item = getItem(old)
  if (!item) { console.error(error(`未找到 alias: ${old}`)); process.exit(2) }
  if (getItem(next)) { console.error(error(`alias 已存在: ${next}`)); process.exit(2) }
  const ok = await confirm(`确认将 "${old}" 改名为 "${next}"? (y/N) `)
  if (!ok) { console.log('已取消'); return }
  renameItem(old, next)
  console.log(`已改名: ${old} -> ${next}`)

}

export class RenameCommand extends Command {
  name = "rename"
  description = "修改已注册项的别名（需确认；缺参时交互填入）"
  examples = [`${this.bin} mgr rename tsc tscc`, `${this.bin} mgr rename   # TTY 下逐步问`]
  related = [`${this.bin} mgr rm`, `${this.bin} mgr list`]

  async handler(args: string[]): Promise<void> {
    return executeRename(args)
  }
}

export const commandDef = new RenameCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
