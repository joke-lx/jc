// src/groups/mgr/add.ts
import { error } from '../../cli/output.js'
import { addItem, getItem } from '../../shared/registry/store.js'
import { validateSource } from '../../shared/registry/validate.js'
import { ALIAS_RE, type RegistryItemKind } from '../../shared/registry/types.js'
import { isInteractive, prompt, NoTTYError } from '../../shared/registry/prompt.js'

const VALID_KINDS: RegistryItemKind[] = ['npm', 'py', 'exe']

interface ParsedArgs {
  kind?: RegistryItemKind
  source?: string
  alias?: string
  desc: string
}

// 解析 argv。argv 为空数组 → 不报错，返回空对象，由调用方决定是否走交互。
function parseArgs(args: string[]): ParsedArgs {
  let kind: RegistryItemKind | undefined
  let source: string | undefined
  let alias: string | undefined
  let desc = ''
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--alias') { alias = args[++i] }
    else if (a === '--desc') { desc = args[++i] ?? '' }
    else if (!kind) {
      // 非法 kind 直接报错（与旧行为一致）；合法的传下来。
      if (!VALID_KINDS.includes(a as RegistryItemKind)) {
        console.error(error(`未知类型: ${a}`))
        process.exit(1)
      }
      kind = a as RegistryItemKind
    } else if (!source) { source = a }
  }
  return { kind, source, alias, desc }
}

// 交互式收集缺失字段。完全 TTY 假设已通过。
async function collectInteractive(current: ParsedArgs): Promise<Required<ParsedArgs>> {
  let kind = current.kind
  let source = current.source
  let alias = current.alias
  let desc = current.desc

  if (!kind) {
    while (true) {
      const ans = await prompt('kind? [npm/py/exe]: ')
      if (VALID_KINDS.includes(ans as RegistryItemKind)) { kind = ans as RegistryItemKind; break }
      console.log(`无效 kind: ${ans || '(空)'}`)
    }
  }
  if (!source) {
    source = await prompt('source? (npm 包名 / URL / 本地路径): ')
  }
  if (!alias) {
    while (true) {
      const ans = await prompt('alias? (^[a-z0-9][a-z0-9_-]{0,31}$): ')
      if (ALIAS_RE.test(ans)) { alias = ans.toLowerCase(); break }
      console.log(`非法 alias: ${ans || '(空)'}`)
    }
  }
  if (!desc) {
    desc = await prompt('desc? (空跳过): ')
  }
  return { kind: kind!, source: source!, alias: alias!, desc }
}

export async function handler(args: string[]): Promise<void> {
  let parsed = parseArgs(args)
  const incomplete = !parsed.kind || !parsed.source || !parsed.alias

  if (incomplete) {
    if (!isInteractive()) {
      console.error(error('用法: jc mgr add <npm|py|exe> <source> --alias <alias> [--desc <desc>]'))
      console.error(error('提示: 缺少参数且当前为非交互模式（管道/CI）。请补全参数或加 --yes 后跟值。'))
      process.exit(1)
    }
    try {
      parsed = await collectInteractive(parsed)
    } catch (e) {
      if (e instanceof NoTTYError) {
        console.error(error(e.message))
        process.exit(2)
      }
      throw e
    }
  }

  // 至此 parsed 必有完整字段；做旧路径的强校验（alias 正则在 collectInteractive 已验，这里兜底）。
  const { kind, source, alias, desc } = parsed
  if (!kind || !source || !alias) {
    console.error(error('用法: jc mgr add <npm|py|exe> <source> --alias <alias> [--desc <desc>]'))
    process.exit(1)
  }
  if (!ALIAS_RE.test(alias)) { console.error(error(`alias 非法: ${alias}（应匹配 ^[a-z0-9][a-z0-9_-]{0,31}$）`)); process.exit(1) }
  const normalizedAlias = alias.toLowerCase()
  if (getItem(normalizedAlias)) { console.error(error(`alias 已存在: ${normalizedAlias}`)); process.exit(2) }
  const v = await validateSource({ kind, source, alias: normalizedAlias, desc })
  if (!v.ok) { console.error(error(v.reason)); process.exit(2) }
  const now = new Date().toISOString()
  addItem({ kind, source, alias: normalizedAlias, desc, exec: v.exec, createdAt: now, sourceVerifiedAt: now })
  console.log(`已注册: ${normalizedAlias} -> ${v.exec}`)
}

export const commandDef = {
  name: 'add',
  description: '注册一个 npm 包 / Python 脚本 / EXE 脚本到统一管理器（缺参时逐步交互）',
  handler,
  examples: ['jc mgr add npm typescript --alias tsc --desc "TS 编译器"', 'jc mgr add   # TTY 下逐步问'],
  related: ['jc mgr list', 'jc mgr run'],
}