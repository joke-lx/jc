// src/groups/mgr/list.ts
import { listItems } from '../../shared/registry/store.js'
import { Command } from '../../cli/Command.js'

async function executeList(_args: string[]): Promise<void> {

  const items = listItems()
  if (items.length === 0) { console.log('(空)'); return }
  console.table(items.map(i => ({ alias: i.alias, kind: i.kind, desc: i.desc, exec: i.exec })))

}

export class ListCommand extends Command {
  name = "list"
  description = "列出已注册的项"
  examples = [`${this.bin} mgr list`]
  related = [`${this.bin} mgr add`, `${this.bin} mgr rm`]

  async handler(_args: string[]): Promise<void> {
    return executeList(_args)
  }
}

export const commandDef = new ListCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
