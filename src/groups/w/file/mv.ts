// src/groups/w/file/mv.ts
import fs from 'fs'
import { cliText } from '../../../cli/output.js'
import path from 'path'
import { Command } from '../../../cli/Command.js'

async function executeMv(args: string[]): Promise<void> {

  const src = args[0]
  const dest = args[1]
  if (!src || !dest) {
    console.log(cliText('用法: jc w mv <source> <destination>'))
    return
  }
  try {
    const destDir = path.dirname(dest)
    if (destDir && !fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    fs.renameSync(src, dest)
    console.log(`已移动/重命名: ${src} -> ${dest}`)
  } catch (e: any) {
    console.error(`移动失败: ${e.message}`)
  }

}

export class MvCommand extends Command {
  name = "mv"
  description = "移动或重命名文件/目录"
  examples = [`${this.bin} w mv old.txt new.txt`, `${this.bin} w mv file.txt ./backup/`]
  related = [`${this.bin} w cp`, `${this.bin} w del`, `${this.bin} w ls`]

  async handler(args: string[]): Promise<void> {
    return executeMv(args)
  }
}

export const commandDef = new MvCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
