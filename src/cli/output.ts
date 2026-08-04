import chalk from 'chalk'
import type { Command, Category, Group } from './types.js'
import { getCliNameInfo } from '../shared/config/store.js'
import { CLI_TOKEN } from '../shared/meta.js'

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

// 把模板里的 {cli} 占位符替换成当前 CLI 名。
// 占位符来自 CLI_TOKEN（src/shared/meta.ts）；class 字段 `${this.bin}` 求值成 `{cli}`，
// handler 用法串里也写 `{cli}` 字面。两者进入 renderer 前形态相同。
// 漏过本函数的字段会显示字面 `{cli}`——响亮失败，一眼是 bug。
// 用 replaceAll 字面替换，无需正则 token 边界判断（{cli} 不会出现在 /jc/ 路径、
// JC_REGISTRY_PATH、jcVersion 等位置）。
export function cliText(template: string): string {
  return template.replaceAll(CLI_TOKEN, getCliNameInfo().name)
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
