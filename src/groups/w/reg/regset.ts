// src/groups/w/reg/regset.ts
import { execSync } from 'child_process'

function requireWin() {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
}

export async function handler(args: string[]): Promise<void> {
  requireWin()
  const path = args[0]
  const name = args[1]
  const value = args.slice(2).join(' ')
  if (!path || !name) { console.error('❌ 用法: jc w regset <path> <name> <value>'); process.exit(1) }
  execSync(`reg add "${path}" /v "${name}" /d "${value}" /f`, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'regset',
  description: '写注册表值',
  handler,
  platform: 'win32' as const,
}
