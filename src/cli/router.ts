import chalk from 'chalk'
import type { Group } from './types.js'
import { claudeGroup } from '../groups/claude/index.js'
import { happyGroup } from '../groups/happy/index.js'
import { wGroup } from '../groups/w/index.js'
import { mgrGroup } from '../groups/mgr/index.js'
import { getItem } from '../shared/registry/store.js'
import {
  jc,
  printGroupHelp,
  printCategoryHelp,
  printCommandHelp,
} from './output.js'

interface ParsedArgs {
  group: string
  command: string
  args: string[]
}

export function parseArgs(argv: string[]): ParsedArgs | null {
  if (argv.length === 0) return null
  if (argv.length === 1) return { group: argv[0], command: '', args: [] }
  if (argv.length === 2 && argv[1] === 'l') return { group: argv[0], command: 'l', args: [] }
  return { group: argv[0], command: argv[1], args: argv.slice(2) }
}

const groups: Record<string, Group> = {}

function registerGroup(group: Group): void {
  groups[group.name] = group
  groups[group.alias] = group
}

registerGroup(claudeGroup)
registerGroup(happyGroup)
registerGroup(wGroup)
registerGroup(mgrGroup)

function printTopLevelHelp(): void {
  console.log(`${jc} — j 命令套件`)
  console.log()
  for (const [key, g] of Object.entries(groups)) {
    if (key === g.name) {
      console.log(`  ${jc} ${chalk.yellow(g.name.padEnd(14))} ${g.description}`)
    }
  }
  console.log()
  console.log(`用法: ${jc} ${chalk.yellow('<组>')} ${chalk.blue('<命令>')} [参数...]`)
  console.log(`查看组详情: ${jc} ${chalk.yellow('<组>')} l`)
  console.log(`直接执行已注册 alias: ${jc} ${chalk.yellow('<alias>')} [args...]`)
}

export async function route(argv: string[]): Promise<void> {
  // Shortcut: `jc r <alias> [args...]` is sugar for `jc mgr run <alias> [args...]`.
  // Resolved at the router boundary so the mgr group's command contract is unchanged.
  if (argv.length >= 2 && argv[0] === 'r') {
    argv = ['mgr', 'run', ...argv.slice(1)]
  }

  // Top-level help shortcuts: `jc l` and `jc ?` print the same listing as bare `jc`.
  // Group resolution (below) always wins, so `jc m l` etc. are unaffected.
  if (argv.length === 1 && (argv[0] === 'l' || argv[0] === '?' || argv[0] === 'help')) {
    printTopLevelHelp()
    return
  }

  const parsed = parseArgs(argv)

  if (!parsed) {
    printTopLevelHelp()
    return
  }

  const group = groups[parsed.group]
  if (!group) {
    // Group resolution lost — check whether `parsed.group` is actually a registered
    // mgr alias. If so, dispatch as `mgr run <alias> [args...]`. Group name (above)
    // always takes precedence, so this fallback only fires for plain `jc <alias>`.
    if (argv.length >= 1 && getItem(parsed.group.toLowerCase())) {
      argv = ['mgr', 'run', ...argv]
      return route(argv)
    }
    console.error(`错误: 未知命令: ${parsed.group}`)
    process.exit(1)
  }

  if (parsed.command === 'l') {
    printGroupHelp(group)
    return
  }

  if (parsed.command === '' || !parsed.command) {
    // Default handler
    if (group.defaultHandler) {
      await group.defaultHandler(parsed.args)
    } else {
      printGroupHelp(group)
    }
    return
  }

  // Find command in group or categories
  const allCmds = group.categories
    ? group.categories.flatMap(c => c.commands).concat(group.commands)
    : group.commands
  const cmd = allCmds.find(c => c.name === parsed.command || c.alias?.includes(parsed.command))
  if (cmd) {
    // Check for help flag
    if (parsed.args[0] === '?' || parsed.args[0] === '-h' || parsed.args[0] === '--help') {
      printCommandHelp(cmd, parsed.group)
      return
    }
    // Check platform support
    if (cmd.platform === 'win32' && process.platform !== 'win32') {
      console.error('错误: 此命令仅支持 Windows')
      process.exit(3)
    }
    await cmd.handler(parsed.args)
    return
  }

  // Maybe it's a category? (w group has categories)
  if (group.categories) {
    const cat = group.categories.find(c => c.name === parsed.command)
    if (cat) {
      printCategoryHelp(cat)
      return
    }
  }

  // Selection-style fallback for mgr group: when the typed "command" is not a known
  // mgr command but is a registered alias, treat the whole argv as `mgr run <rest>`.
  // Only enabled for mgr so other groups keep their strict "未知命令" error contract.
  if (group === mgrGroup && getItem(parsed.command.toLowerCase())) {
    argv = ['mgr', 'run', parsed.command, ...parsed.args]
    return route(argv)
  }

  console.error(`错误: 未知命令: ${parsed.group} ${parsed.command}`)
  process.exit(1)
}
