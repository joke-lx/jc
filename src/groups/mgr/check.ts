// src/groups/mgr/check.ts
import { error } from '../../cli/output.js'
import { getItem, updateItemVerifiedAt } from '../../shared/registry/store.js'
import { validateSource } from '../../shared/registry/validate.js'

export async function handler(args: string[]): Promise<void> {
  const [alias] = args
  if (!alias) { console.error(error('用法: jc mgr check <alias>')); process.exit(1) }
  const item = getItem(alias.toLowerCase())
  if (!item) { console.error(error(`未找到 alias: ${alias}`)); process.exit(2) }
  const v = await validateSource(item)
  if (!v.ok) { console.error(error(`${item.alias} 不可达: ${v.reason}`)); process.exit(2) }
  updateItemVerifiedAt(item.alias, new Date().toISOString())
  console.log(`OK: ${item.alias} (${v.exec})`)
}

export const commandDef = {
  name: 'check',
  description: '重新验证已注册项的源是否可达',
  handler,
  examples: ['jc mgr check tsc'],
  related: ['jc mgr add', 'jc mgr list'],
}