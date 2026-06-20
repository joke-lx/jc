// src/groups/w/pwr/sleep.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  const cmd = process.platform === 'win32' ? 'shutdown /h' : 'systemctl suspend'
  execSync(cmd, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'sleep',
  description: '休眠',
  handler,
  examples: ['jc w sleep'],
}
