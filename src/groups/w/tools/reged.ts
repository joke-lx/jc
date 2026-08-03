// src/groups/w/tools/reged.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executeReged(_args: string[]): Promise<void> {

  await open('regedit')

}

export class RegedCommand extends Command {
  name = "reged"
  description = "注册表编辑器"
  examples = [`${this.bin} w reged`]

  async handler(_args: string[]): Promise<void> {
    return executeReged(_args)
  }
}

export const commandDef = new RegedCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
