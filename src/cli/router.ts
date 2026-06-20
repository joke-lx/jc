import chalk from 'chalk'
import type { Group } from './types.js'
import { claudeGroup } from '../groups/claude/index.js'
import { happyGroup } from '../groups/happy/index.js'
import { wGroup } from '../groups/w/index.js'
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

export async function route(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv)

  if (!parsed) {
    // Show top-level help: list all groups
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
    return
  }

  const group = groups[parsed.group]
  if (!group) {
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

  // Find command in group
  const cmd = group.commands.find(c => c.name === parsed.command || c.alias?.includes(parsed.command))
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

  console.error(`错误: 未知命令: ${parsed.group} ${parsed.command}`)
  process.exit(1)
}
