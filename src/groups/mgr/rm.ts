// src/groups/mgr/rm.ts
import { error } from '../../cli/output.js'
import { confirm } from '../../shared/registry/confirm.js'
import { getItem, removeItem } from '../../shared/registry/store.js'

export async function handler(args: string[]): Promise<void> {
  const [alias] = args
  if (!alias) { console.error(error('用法: jc mgr rm <alias>')); process.exit(1) }
  const item = getItem(alias.toLowerCase())
  if (!item) { console.error(error(`未找到 alias: ${alias}`)); process.exit(2) }
  const ok = await confirm(`确认删除 alias "${item.alias}"? (y/N) `)
  if (!ok) { console.log('已取消'); return }
  removeItem(item.alias)
  console.log(`已删除: ${item.alias}`)
}

export const commandDef = {
  name: 'rm',
  description: '按别名删除已注册的项（需确认）',
  handler,
  examples: ['jc mgr rm tsc'],
  related: ['jc mgr list', 'jc mgr rename'],
}