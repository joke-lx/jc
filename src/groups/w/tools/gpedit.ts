// src/groups/w/tools/gpedit.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executeGpedit(_args: string[]): Promise<void> {

  await open('gpedit.msc')

}

export class GpeditCommand extends Command {
  name = "gpedit"
  description = "组策略编辑器"
  examples = [`${this.bin} w gpedit`]

  async handler(_args: string[]): Promise<void> {
    return executeGpedit(_args)
  }
}

export const commandDef = new GpeditCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
