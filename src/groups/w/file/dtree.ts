// src/groups/w/file/dtree.ts
import fs from 'fs'
import path from 'path'

function printTree(dir: string, prefix: string = ''): void {
  let items: string[] = []
  try {
    items = fs.readdirSync(dir)
  } catch { return }
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const fullPath = path.join(dir, item)
    const isLast = i === items.length - 1
    const connector = isLast ? '└── ' : '├── '
    console.log(prefix + connector + item)
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        const ext = isLast ? '    ' : '│   '
        printTree(fullPath, prefix + ext)
      }
    } catch { /* skip */ }
  }
}
import { Command } from '../../../cli/Command.js'

async function executeDtree(args: string[]): Promise<void> {

  const dir = args[0] || '.'
  console.log(dir)
  printTree(dir)

}

export class DtreeCommand extends Command {
  name = "dtree"
  description = "目录树"
  examples = [`${this.bin} w dtree`, `${this.bin} w dtree C:\\\\project`]
  related = [`${this.bin} w ls`, `${this.bin} w find`, `${this.bin} w size`]

  async handler(args: string[]): Promise<void> {
    return executeDtree(args)
  }
}

export const commandDef = new DtreeCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
