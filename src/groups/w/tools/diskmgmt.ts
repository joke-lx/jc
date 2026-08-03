// src/groups/w/tools/diskmgmt.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executeDiskmgmt(_args: string[]): Promise<void> {

  await open('diskmgmt.msc')

}

export class DiskmgmtCommand extends Command {
  name = "diskmgmt"
  description = "磁盘管理"
  examples = [`${this.bin} w diskmgmt`]

  async handler(_args: string[]): Promise<void> {
    return executeDiskmgmt(_args)
  }
}

export const commandDef = new DiskmgmtCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
