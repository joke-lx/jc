// src/groups/w/file/touch.ts
import fs from 'fs'
import { cliText } from '../../../cli/output.js'
import path from 'path'
import { Command } from '../../../cli/Command.js'

async function executeTouch(args: string[]): Promise<void> {

  const file = args[0]
  if (!file) {
    console.log(cliText('用法: jc w touch <file>'))
    return
  }
  try {
    if (fs.existsSync(file)) {
      const now = new Date()
      fs.utimesSync(file, now, now)
      console.log(`已更新: ${file}`)
    } else {
      const dir = path.dirname(file)
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(file, '', 'utf8')
      console.log(`已创建: ${file}`)
    }
  } catch (e: any) {
    console.error(`操作失败: ${e.message}`)
  }

}

export class TouchCommand extends Command {
  name = "touch"
  description = "创建空文件或更新文件时间戳"
  examples = [`${this.bin} w touch ./newfile.txt`]
  related = [`${this.bin} w mkdir`, `${this.bin} w del`]

  async handler(args: string[]): Promise<void> {
    return executeTouch(args)
  }
}

export const commandDef = new TouchCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
