// src/groups/w/tools/msconfig.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executeMsconfig(_args: string[]): Promise<void> {

  await open('msconfig')

}

export class MsconfigCommand extends Command {
  name = "msconfig"
  description = "系统配置"
  examples = [`${this.bin} w msconfig`]

  async handler(_args: string[]): Promise<void> {
    return executeMsconfig(_args)
  }
}

export const commandDef = new MsconfigCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
