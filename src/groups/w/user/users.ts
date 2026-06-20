// src/groups/w/user/users.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  if (process.platform === 'win32') {
    execSync('net user', { stdio: 'inherit' })
  } else {
    execSync('cat /etc/passwd | cut -d: -f1,3,6,7', { stdio: 'inherit' })
  }
}

export const commandDef = {
  name: 'users',
  description: '列出系统用户',
  handler,
  examples: ['jc w users'],
}
