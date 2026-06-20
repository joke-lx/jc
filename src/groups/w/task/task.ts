// src/groups/w/task/task.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  execSync('schtasks /query /fo TABLE /nh', { stdio: 'inherit' })
}

export const commandDef = {
  name: 'task',
  description: '列出计划任务',
  handler,
  platform: 'win32' as const,
}
