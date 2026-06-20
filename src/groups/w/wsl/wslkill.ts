// src/groups/w/wsl/wslkill.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  execSync('wsl --shutdown', { stdio: 'inherit' })
}

export const commandDef = {
  name: 'wslkill',
  description: '关闭所有 WSL 实例',
  handler,
  platform: 'win32' as const,
}
