import { Command } from '../../../cli/Command.js'
import { cliText } from '../../../cli/output.js'
import fs from 'fs'

// src/groups/w/file/del.ts

async function executeDel(args: string[]): Promise<void> {

  const file = args[0]
  if (!file) {
    console.log(cliText('用法: jc w del <file>'))
    return
  }
  try {
    fs.unlinkSync(file)
    console.log(`已删除: ${file}`)
  } catch (e: any) {
    console.error(`删除失败: ${e.message}`)
  }

}

export class DelCommand extends Command {
  name = "del"
  description = "删除文件"
  examples = [`${this.bin} w del ./temp.txt`]
  related = [`${this.bin} w rm`, `${this.bin} w cp`, `${this.bin} w mv`]

  async handler(args: string[]): Promise<void> {
    return executeDel(args)
  }
}

export const commandDef = new DelCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
