import { Command } from '../../../cli/Command.js'
import open from 'open'

// src/groups/w/tools/taskmgr.ts

async function executeTaskmgr(_args: string[]): Promise<void> {

  await open('taskmgr')

}

export class TaskmgrCommand extends Command {
  name = "taskmgr"
  description = "任务管理器"
  examples = [`${this.bin} w taskmgr`]

  async handler(_args: string[]): Promise<void> {
    return executeTaskmgr(_args)
  }
}

export const commandDef = new TaskmgrCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
