// src/groups/mgr/rename.ts
import { error } from '../../cli/output.js'
import { ALIAS_RE } from '../../shared/registry/types.js'
import { confirm } from '../../shared/registry/confirm.js'
import { getItem, renameItem } from '../../shared/registry/store.js'

export async function handler(args: string[]): Promise<void> {
  const [oldAlias, newAlias] = args
  if (!oldAlias || !newAlias) { console.error(error('用法: jc mgr rename <old-alias> <new-alias>')); process.exit(1) }
  if (!ALIAS_RE.test(newAlias)) { console.error(error(`alias 非法: ${newAlias}`)); process.exit(1) }
  const old = oldAlias.toLowerCase()
  const next = newAlias.toLowerCase()
  const item = getItem(old)
  if (!item) { console.error(error(`未找到 alias: ${old}`)); process.exit(2) }
  if (getItem(next)) { console.error(error(`alias 已存在: ${next}`)); process.exit(2) }
  const ok = await confirm(`确认将 "${old}" 改名为 "${next}"? (y/N) `)
  if (!ok) { console.log('已取消'); return }
  renameItem(old, next)
  console.log(`已改名: ${old} -> ${next}`)
}

export const commandDef = {
  name: 'rename',
  description: '修改已注册项的别名（需确认）',
  handler,
  examples: ['jc mgr rename tsc tscc'],
  related: ['jc mgr rm', 'jc mgr list'],
}