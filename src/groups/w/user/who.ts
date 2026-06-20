// src/groups/w/user/who.ts
import os from 'os'

export async function handler(_args: string[]): Promise<void> {
  const info = os.userInfo()
  console.log(`用户名: ${info.username}`)
  console.log(`用户目录: ${info.homedir}`)
  console.log(`Shell: ${info.shell}`)
}

export const commandDef = {
  name: 'who',
  description: '当前用户信息',
  handler,
  examples: ['jc w who'],
}
