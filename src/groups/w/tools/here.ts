// src/groups/w/tools/here.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executeHere(_args: string[]): Promise<void> {

  await open('.')

}

export class HereCommand extends Command {
  name = "here"
  description = "打开当前目录"
  examples = [`${this.bin} w here`]

  async handler(_args: string[]): Promise<void> {
    return executeHere(_args)
  }
}

export const commandDef = new HereCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
