// src/groups/w/user/admin.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  if (process.platform === 'win32') {
    try {
      execSync('net session', { stdio: 'ignore' })
      console.log('✅ 以管理员身份运行')
    } catch {
      console.log('⚠️ 非管理员身份运行')
    }
  } else {
    console.log(process.getuid?.() === 0 ? '✅ 以 root 身份运行' : '⚠️ 以普通用户身份运行')
  }
}

export const commandDef = {
  name: 'admin',
  description: '检查是否管理员/root',
  handler,
  examples: ['jc w admin'],
}
