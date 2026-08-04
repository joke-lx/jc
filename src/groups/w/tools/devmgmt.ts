import { Command } from '../../../cli/Command.js'
import open from 'open'

// src/groups/w/tools/devmgmt.ts

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
