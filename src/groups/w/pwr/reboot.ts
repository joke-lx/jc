// src/groups/w/pwr/reboot.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  const cmd = process.platform === 'win32' ? 'shutdown /r /t 5' : 'shutdown -r now'
  execSync(cmd, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'reboot',
  description: '重启 (5s 缓冲)',
  handler,
  examples: ['jc w reboot'],
  related: ['jc w off', 'jc w cancel'],
}
