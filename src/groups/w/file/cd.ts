// src/groups/w/file/cd.ts
import { Command } from '../../../cli/Command.js'

async function executeCd(args: string[]): Promise<void> {

  const dir = args[0]
  if (!dir) {
    console.log(`当前目录: ${process.cwd()}`)
    return
  }
  try {
    process.chdir(dir)
    console.log(`已切换到: ${process.cwd()}`)
  } catch (e: any) {
    console.error(`切换目录失败: ${e.message}`)
  }

}

export class CdCommand extends Command {
  name = "cd"
  description = "切换目录 (仅当前会话)"
  examples = [`${this.bin} w cd C:\\\\`, `${this.bin} w cd ..`]
  related = [`${this.bin} w pwd`, `${this.bin} w ls`]

  async handler(args: string[]): Promise<void> {
    return executeCd(args)
  }
}

export const commandDef = new CdCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
