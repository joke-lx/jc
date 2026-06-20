// src/groups/w/task/taskstop.ts
import { execSync } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  const name = args[0]
  if (!name) { console.error('❌ 请指定任务名'); process.exit(1) }
  execSync(`powershell -NoProfile "Stop-ScheduledTask -TaskPath '\\' -TaskName '${name}'"`, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'taskstop',
  description: '停止计划任务',
  handler,
  platform: 'win32' as const,
}
