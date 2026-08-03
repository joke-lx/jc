// src/groups/w/file/pwd.ts
import { Command } from '../../../cli/Command.js'

async function executePwd(_args: string[]): Promise<void> {

  console.log(process.cwd())

}

export class PwdCommand extends Command {
  name = "pwd"
  description = "显示当前目录"
  examples = [`${this.bin} w pwd`]
  related = [`${this.bin} w ls`, `${this.bin} w cd`]

  async handler(_args: string[]): Promise<void> {
    return executePwd(_args)
  }
}

export const commandDef = new PwdCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
