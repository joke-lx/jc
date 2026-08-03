// src/groups/w/tools/resmon.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executeResmon(_args: string[]): Promise<void> {

  await open('resmon')

}

export class ResmonCommand extends Command {
  name = "resmon"
  description = "资源监视器"
  examples = [`${this.bin} w resmon`]

  async handler(_args: string[]): Promise<void> {
    return executeResmon(_args)
  }
}

export const commandDef = new ResmonCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
