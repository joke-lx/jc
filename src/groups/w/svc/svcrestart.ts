// src/groups/w/svc/svcrestart.ts
import { execSync } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  const name = args[0]
  if (!name) { console.error('❌ 请指定服务名'); process.exit(1) }
  execSync(`net stop "${name}"`, { stdio: 'inherit' })
  execSync(`net start "${name}"`, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'svcrestart',
  description: '重启服务',
  handler,
  examples: ['jc w svcrestart w32time'],
}
