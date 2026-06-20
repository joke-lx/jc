// src/groups/w/reg/regfind.ts
import { execSync } from 'child_process'

function requireWin() {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
}

export async function handler(args: string[]): Promise<void> {
  requireWin()
  execSync(`reg query HKCU /s /f "${args[0] || ''}"`, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'regfind',
  description: '搜注册表值名',
  handler,
  platform: 'win32' as const,
}
