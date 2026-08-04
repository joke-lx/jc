import { Command } from '../../../cli/Command.js'
import { cliText } from '../../../cli/output.js'
import fs from 'fs'
import path from 'path'

// src/groups/w/file/find.ts

function searchDir(dir: string, pattern: string, results: string[]): void {
  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      try {
        const stat = fs.statSync(fullPath)
        if (item.toLowerCase().includes(pattern.toLowerCase())) {
          results.push(fullPath)
        }
        if (stat.isDirectory()) {
          searchDir(fullPath, pattern, results)
        }
      } catch { /* skip unreadable */ }
    }
  } catch { /* skip unreadable */ }
}

async function executeFind(args: string[]): Promise<void> {

  const pattern = args[0]
  const rootDir = args[1] || '.'
  if (!pattern) {
    console.log(cliText('用法: jc w find <pattern> [rootDir]'))
    return
  }
  console.log(`在 ${rootDir} 中搜索 "${pattern}"...`)
  const results: string[] = []
  searchDir(rootDir, pattern, results)
  if (results.length === 0) {
    console.log('未找到匹配项')
    return
  }
  for (const r of results) {
    console.log(r)
  }
  console.log(`\n共 ${results.length} 个匹配`)

}

export class FindCommand extends Command {
  name = "find"
  description = "递归搜索文件"
  examples = [`${this.bin} w find .ts`, `${this.bin} w find node_modules C:\\\\project`]
  related = [`${this.bin} w ls`, `${this.bin} w dtree`]

  async handler(args: string[]): Promise<void> {
    return executeFind(args)
  }
}

export const commandDef = new FindCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
