// src/groups/w/pwr/off.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  const cmd = process.platform === 'win32' ? 'shutdown /s /t 5' : 'shutdown -h now'
  execSync(cmd, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'off',
  description: '关机 (5s 缓冲)',
  handler,
  examples: ['jc w off'],
  related: ['jc w reboot', 'jc w cancel'],
}
