// src/groups/w/pwr/lock.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  const cmd = process.platform === 'win32'
    ? 'rundll32.exe user32.dll,LockWorkStation'
    : 'loginctl lock-session'
  execSync(cmd, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'lock',
  description: '锁定屏幕',
  handler,
  examples: ['jc w lock'],
}
