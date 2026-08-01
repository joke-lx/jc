// src/groups/mgr/list.ts
import { listItems } from '../../shared/registry/store.js'

export async function handler(_args: string[]): Promise<void> {
  const items = listItems()
  if (items.length === 0) { console.log('(空)'); return }
  console.table(items.map(i => ({ alias: i.alias, kind: i.kind, desc: i.desc, exec: i.exec })))
}

export const commandDef = {
  name: 'list',
  description: '列出已注册的项',
  handler,
  examples: ['jc mgr list'],
  related: ['jc mgr add', 'jc mgr rm'],
}
