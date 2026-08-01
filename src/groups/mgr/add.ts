// src/groups/mgr/add.ts
import { error } from '../../cli/output.js'
import { addItem, getItem } from '../../shared/registry/store.js'
import { validateSource } from '../../shared/registry/validate.js'
import { ALIAS_RE, type RegistryItemKind } from '../../shared/registry/types.js'

const VALID_KINDS: RegistryItemKind[] = ['npm', 'py', 'exe']

function parseArgs(args: string[]): { kind: RegistryItemKind; source: string; alias: string; desc: string } | null {
  let kind: RegistryItemKind | undefined
  let source: string | undefined
  let alias: string | undefined
  let desc = ''
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--alias') { alias = args[++i] }
    else if (a === '--desc') { desc = args[++i] ?? '' }
    else if (!kind) {
      if (!VALID_KINDS.includes(a as RegistryItemKind)) { console.error(error(`未知类型: ${a}`)); process.exit(1) }
      kind = a as RegistryItemKind
    } else if (!source) { source = a }
  }
  if (!kind || !source || !alias) { console.error(error('用法: jc mgr add <npm|py|exe> <source> --alias <alias> [--desc <desc>]')); process.exit(1) }
  if (!ALIAS_RE.test(alias)) { console.error(error(`alias 非法: ${alias}（应匹配 ^[a-z0-9][a-z0-9_-]{0,31}$）`)); process.exit(1) }
  return { kind, source, alias: alias.toLowerCase(), desc }
}

export async function handler(args: string[]): Promise<void> {
  const parsed = parseArgs(args)
  if (!parsed) return
  if (getItem(parsed.alias)) { console.error(error(`alias 已存在: ${parsed.alias}`)); process.exit(2) }
  const v = await validateSource(parsed)
  if (!v.ok) { console.error(error(v.reason)); process.exit(2) }
  const now = new Date().toISOString()
  addItem({ ...parsed, exec: v.exec, createdAt: now, sourceVerifiedAt: now })
  console.log(`已注册: ${parsed.alias} -> ${v.exec}`)
}

export const commandDef = {
  name: 'add',
  description: '注册一个 npm 包 / Python 脚本 / EXE 脚本到统一管理器',
  handler,
  examples: ['jc mgr add npm typescript --alias tsc --desc "TS 编译器"'],
  related: ['jc mgr list', 'jc mgr run'],
}
