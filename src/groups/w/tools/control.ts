// src/groups/w/tools/control.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executeControl(_args: string[]): Promise<void> {

  await open('control')

}

export class ControlCommand extends Command {
  name = "control"
  description = "控制面板"
  examples = [`${this.bin} w control`]

  async handler(_args: string[]): Promise<void> {
    return executeControl(_args)
  }
}

export const commandDef = new ControlCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
