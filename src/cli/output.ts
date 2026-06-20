import chalk from 'chalk'
import type { Command, Category, Group } from './types.js'

export const jc = chalk.red('jc')
export const groupName = chalk.yellow
export const subCmd = chalk.blue
export const error = chalk.red
export const warning = chalk.yellow
export const success = chalk.green

function padEnd(s: string, n: number): string {
  return s + ' '.repeat(Math.max(0, n - s.length))
}

export function printHeader(title: string): void {
  console.log(`===== ${chalk.yellow(title)} =====`)
}

export function printCommands(commands: Command[]): void {
  for (const cmd of commands) {
    console.log(
      `  ${chalk.red('jc')} ${chalk.yellow(padEnd(cmd.name, 14))} ${cmd.description}`
    )
  }
}

export function printCommandHelp(cmd: Command, group: string, category?: string): void {
  const tag = category ? `  [${category}]` : ''
  console.log(`${chalk.yellow(`[jc ${group} ${cmd.name}]`)} ${cmd.description} ${chalk.blue(tag)}`)
  console.log()
  if (cmd.helpText) {
    console.log(`  ${cmd.helpText}`)
    console.log()
  }
  if (cmd.examples && cmd.examples.length > 0) {
    console.log(`  ${chalk.red('示例')}:`)
    for (const ex of cmd.examples) {
      console.log(`    ${ex}`)
    }
    console.log()
  }
  if (cmd.related && cmd.related.length > 0) {
    console.log(`  ${chalk.red('相关')}: ${cmd.related.join(' / ')}`)
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
  console.log(`用法: jc ${chalk.yellow(group.name)} ${chalk.blue('<命令>')} [参数...]`)
}

export function printCategoryHelp(cat: Category): void {
  console.log()
  printHeader(cat.name)
  console.log(`  ${cat.description}`)
  console.log()
  printCommands(cat.commands)
  console.log()
}
