// src/groups/w/tools/devmgmt.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executeDevmgmt(_args: string[]): Promise<void> {

  await open('devmgmt.msc')

}

export class DevmgmtCommand extends Command {
  name = "devmgmt"
  description = "设备管理器"
  examples = [`${this.bin} w devmgmt`]

  async handler(_args: string[]): Promise<void> {
    return executeDevmgmt(_args)
  }
}

export const commandDef = new DevmgmtCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
