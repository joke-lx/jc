// src/groups/w/file/mkdir.ts
import fs from 'fs'
import { cliText } from '../../../cli/output.js'
import { Command } from '../../../cli/Command.js'

async function executeMkdir(args: string[]): Promise<void> {

  const dir = args[0]
  if (!dir) {
    console.log(cliText('用法: jc w mkdir <directory>'))
    return
  }
  try {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`已创建目录: ${dir}`)
  } catch (e: any) {
    console.error(`创建目录失败: ${e.message}`)
  }

}

export class MkdirCommand extends Command {
  name = "mkdir"
  description = "创建目录"
  examples = [`${this.bin} w mkdir ./newdir`, `${this.bin} w mkdir ./a/b/c`]
  related = [`${this.bin} w rm`, `${this.bin} w touch`]

  async handler(args: string[]): Promise<void> {
    return executeMkdir(args)
  }
}

export const commandDef = new MkdirCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
