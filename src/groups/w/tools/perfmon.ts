// src/groups/w/tools/perfmon.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executePerfmon(_args: string[]): Promise<void> {

  await open('perfmon /report')

}

export class PerfmonCommand extends Command {
  name = "perfmon"
  description = "性能监视器"
  examples = [`${this.bin} w perfmon`]

  async handler(_args: string[]): Promise<void> {
    return executePerfmon(_args)
  }
}

export const commandDef = new PerfmonCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
