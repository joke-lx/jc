import chalk from 'chalk'
import type { Command, Category, Group } from './types.js'
import { getCliNameInfo } from '../shared/config/store.js'
import { META } from '../shared/meta.js'

export const groupName = chalk.yellow
export const subCmd = chalk.blue
export const error = chalk.red
export const warning = chalk.yellow
export const success = chalk.green

function padEnd(s: string, n: number): string {
  return s + ' '.repeat(Math.max(0, n - s.length))
}

// 运行时从 config + env 读取当前 CLI 名。CLI_NAME 是动态值，import-time 不能冻结。
// chalk.red 是 chalk 工厂函数（cheap），每次调用产生新 string；不在 hot path 上。
export function getStyledCliName(): string {
  return chalk.red(getCliNameInfo().name)
}

// 把模板字符串里所有 standalone canonical CLI token 替换成当前 CLI 名。
// 不替换路径中的 /jc/、JC_REGISTRY_PATH、jcVersion、jcDir、单词内的 jc。
// 匹配规则：必须在行首 / 空白 / | / ; 之后；后面必须是空白 / | / ; / 行尾。
// 模板里的 'jc' 是 canonical 名字（来自 META.binaryName），运行时按用户配置替换。
export function cliText(template: string): string {
  const name = getCliNameInfo().name
  const canonical = META.binaryName
  // 快路径：模板不含 canonical token 时直接返回，避免无谓的正则扫描。
  if (template.indexOf(canonical) === -1) return template
  // 动态构造 regex：'(^|[\\s|;])jc(?=[\\s|;]|$)'
  // 保留 prefix 字符，避免破坏缩进和管道。
  const re = new RegExp(`(^|[\\s|;])${canonical}(?=[\\s|;]|$)`, 'g')
  return template.replace(re, (m, prefix) => prefix + name)
}

export function printHeader(title: string): void {
  console.log(`===== ${chalk.yellow(title)} =====`)
}

export function printCommands(commands: Command[]): void {
  for (const cmd of commands) {
    console.log(
      `  ${getStyledCliName()} ${chalk.yellow(padEnd(cmd.name, 14))} ${cmd.description}`
    )
  }
}

export function printCommandHelp(cmd: Command, group: string, category?: string): void {
  const tag = category ? `  [${category}]` : ''
  console.log(`${chalk.yellow(`[${getCliNameInfo().name} ${group} ${cmd.name}]`)} ${cmd.description} ${chalk.blue(tag)}`)
  console.log()
  if (cmd.helpText) {
    console.log(`  ${cliText(cmd.helpText)}`)
    console.log()
  }
  if (cmd.examples && cmd.examples.length > 0) {
    console.log(`  ${chalk.red('示例')}:`)
    for (const ex of cmd.examples) {
      console.log(`    ${cliText(ex)}`)
    }
    console.log()
  }
  if (cmd.related && cmd.related.length > 0) {
    console.log(`  ${chalk.red('相关')}: ${cmd.related.map(cliText).join(' / ')}`)
  }
}

export function printGroupHelp(group: Group): void {
  console.log() // blank line before header for readability
  printHeader(group.name)
  console.log(`  ${group.description}`)
  console.log()
  // Print commands directly on the group
  printCommands(group.commands)
  // Print categories if any
  if (group.categories) {
    for (const cat of group.categories) {
      console.log() // blank line before category
      console.log(`  ${chalk.blue(`[${cat.name}]`)} — ${cat.description}`)
      printCommands(cat.commands)
    }
  }
  console.log()
  console.log(`用法: ${getStyledCliName()} ${chalk.yellow(group.name)} ${chalk.blue('<命令>')} [参数...]`)
}

export function printCategoryHelp(cat: Category): void {
  console.log()
  printHeader(cat.name)
  console.log(`  ${cat.description}`)
  console.log()
  printCommands(cat.commands)
  console.log()
}
