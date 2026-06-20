// src/groups/w/user/runas.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  if (process.platform === 'win32') {
    execSync('powershell -NoProfile "Start-Process cmd -Verb RunAs"', { stdio: 'inherit' })
  } else {
    execSync('sudo -i', { stdio: 'inherit' })
  }
}

export const commandDef = {
  name: 'runas',
  description: '以管理员/root 身份运行',
  handler,
  examples: ['jc w runas'],
}
