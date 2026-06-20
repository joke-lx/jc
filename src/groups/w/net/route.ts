// src/groups/w/net/route.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  try {
    const cmd = process.platform === 'win32' ? 'route print' : 'netstat -rn'
    const output = execSync(cmd, { encoding: 'utf8' })
    console.log(output)
  } catch (e: any) {
    console.error(`获取路由表失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'route',
  description: '路由表',
  handler,
  examples: ['jc w route'],
  related: ['jc w trace', 'jc w ip'],
}
