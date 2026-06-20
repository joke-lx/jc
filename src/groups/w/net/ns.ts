// src/groups/w/net/ns.ts
import { execSync } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  const host = args[0]
  if (!host) {
    console.log('用法: jc w ns <hostname>')
    return
  }
  try {
    const output = execSync(`nslookup ${host}`, { encoding: 'utf8', timeout: 10000 })
    console.log(output)
  } catch (e: any) {
    console.error(`DNS 查询失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'ns',
  description: 'DNS 查询 (nslookup)',
  handler,
  examples: ['jc w ns google.com'],
  related: ['jc w dns', 'jc w ping'],
}
