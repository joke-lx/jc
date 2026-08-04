import { Command } from '../../../cli/Command.js'
import open from 'open'

// src/groups/w/tools/eventvwr.ts

async function executeEventvwr(_args: string[]): Promise<void> {

  await open('eventvwr.msc')

}

export class EventvwrCommand extends Command {
  name = "eventvwr"
  description = "事件查看器"
  examples = [`${this.bin} w eventvwr`]

  async handler(_args: string[]): Promise<void> {
    return executeEventvwr(_args)
  }
}

export const commandDef = new EventvwrCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
