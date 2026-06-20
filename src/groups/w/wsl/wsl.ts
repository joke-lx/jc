// src/groups/w/wsl/wsl.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  execSync('wsl --list --verbose', { stdio: 'inherit' })
}

export const commandDef = {
  name: 'wsl',
  description: '列出 WSL 发行版',
  handler,
  platform: 'win32' as const,
}
