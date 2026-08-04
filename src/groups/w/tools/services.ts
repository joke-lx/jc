import { Command } from '../../../cli/Command.js'
import open from 'open'

// src/groups/w/tools/services.ts

async function executeServices(_args: string[]): Promise<void> {

  await open('services.msc')

}

export class ServicesCommand extends Command {
  name = "services"
  description = "服务管理器"
  examples = [`${this.bin} w services`]

  async handler(_args: string[]): Promise<void> {
    return executeServices(_args)
  }
}

export const commandDef = new ServicesCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
