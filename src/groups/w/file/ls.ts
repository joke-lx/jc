import { Command } from '../../../cli/Command.js'
import fs from 'fs'
import path from 'path'

// src/groups/w/file/ls.ts

async function executeLs(args: string[]): Promise<void> {

  const dir = args[0] || '.'
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of items) {
      const fullPath = path.join(dir, item.name)
      let stat: fs.Stats | null = null
      try { stat = fs.statSync(fullPath) } catch { /* ignore */ }
      if (item.isDirectory()) {
        console.log(`[DIR]  ${item.name}${stat ? `  (${stat.size} bytes)` : ''}`)
      } else if (item.isSymbolicLink()) {
        const target = fs.readlinkSync(fullPath)
        console.log(`[LNK]  ${item.name} -> ${target}`)
      } else {
        console.log(`[FILE] ${item.name}${stat ? `  (${stat.size} bytes)` : ''}`)
      }
    }
  } catch (e: any) {
    console.error(`读取目录失败: ${e.message}`)
  }

}

export class LsCommand extends Command {
  name = "ls"
  description = "列出目录内容"
  examples = [`${this.bin} w ls`, `${this.bin} w ls C:\\\\`]
  related = [`${this.bin} w pwd`, `${this.bin} w dtree`, `${this.bin} w find`]

  async handler(args: string[]): Promise<void> {
    return executeLs(args)
  }
}

export const commandDef = new LsCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
