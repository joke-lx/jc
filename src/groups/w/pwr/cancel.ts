// src/groups/w/pwr/cancel.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  const cmd = process.platform === 'win32' ? 'shutdown /a' : 'shutdown -c'
  execSync(cmd, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'cancel',
  description: '取消关机/重启',
  handler,
  examples: ['jc w cancel'],
  related: ['jc w off', 'jc w reboot'],
}
