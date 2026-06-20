// src/groups/w/pwr/logout.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  const cmd = process.platform === 'win32' ? 'shutdown /l' : 'pkill -KILL -u $USER'
  execSync(cmd, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'logout',
  description: '注销当前用户',
  handler,
  examples: ['jc w logout'],
}
