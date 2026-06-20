// src/groups/w/reg/reg.ts
import { execSync } from 'child_process'

function requireWin() {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
}

export async function handler(args: string[]): Promise<void> {
  requireWin()
  const path = args[0] || 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
  try {
    console.log(execSync(`reg query "${path}"`, { encoding: 'utf8' }))
  } catch {
    console.log(`路径不存在: ${path}`)
  }
}

export const commandDef = {
  name: 'reg',
  description: '查注册表项',
  handler,
  platform: 'win32' as const,
  examples: ['jc w reg "HKCU\\Software\\..."'],
  related: ['jc w regset', 'jc w regdel'],
}
