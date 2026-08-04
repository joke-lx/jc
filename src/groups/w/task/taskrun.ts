import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/task/taskrun.ts

async function executeTaskrun(args: string[]): Promise<void> {

  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  const name = args[0]
  if (!name) { console.error('❌ 请指定任务名'); process.exit(1) }
  execSync(`powershell -NoProfile "Start-ScheduledTask -TaskPath '\\' -TaskName '${name}'"`, { stdio: 'inherit' })

}

export class TaskrunCommand extends Command {
  name = "taskrun"
  description = "运行计划任务"
  platform = 'win32' as const

  async handler(args: string[]): Promise<void> {
    return executeTaskrun(args)
  }
}

export const commandDef = new TaskrunCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
