import { Command } from '../../../cli/Command.js'
import open from 'open'

// src/groups/w/tools/wt.ts

async function executeWt(_args: string[]): Promise<void> {

  await open('wt')

}

export class WtCommand extends Command {
  name = "wt"
  description = "打开 Windows Terminal"
  examples = [`${this.bin} w wt`]

  async handler(_args: string[]): Promise<void> {
    return executeWt(_args)
  }
}

export const commandDef = new WtCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
