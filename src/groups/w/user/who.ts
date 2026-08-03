// src/groups/w/user/who.ts
import os from 'os'
import { Command } from '../../../cli/Command.js'

async function executeWho(_args: string[]): Promise<void> {

  const info = os.userInfo()
  console.log(`用户名: ${info.username}`)
  console.log(`用户目录: ${info.homedir}`)
  console.log(`Shell: ${info.shell}`)

}

export class WhoCommand extends Command {
  name = "who"
  description = "当前用户信息"
  examples = [`${this.bin} w who`]

  async handler(_args: string[]): Promise<void> {
    return executeWho(_args)
  }
}

export const commandDef = new WhoCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
