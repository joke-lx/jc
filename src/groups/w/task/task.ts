import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/task/task.ts

async function executeTask(_args: string[]): Promise<void> {

  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  execSync('schtasks /query /fo TABLE /nh', { stdio: 'inherit' })

}

export class TaskCommand extends Command {
  name = "task"
  description = "列出计划任务"
  platform = 'win32' as const

  async handler(_args: string[]): Promise<void> {
    return executeTask(_args)
  }
}

export const commandDef = new TaskCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
