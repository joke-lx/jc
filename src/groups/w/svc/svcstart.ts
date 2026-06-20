// src/groups/w/svc/svcstart.ts
import { execSync } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  const name = args[0]
  if (!name) { console.error('❌ 请指定服务名'); process.exit(1) }
  execSync(`net start "${name}"`, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'svcstart',
  description: '启动服务',
  handler,
  examples: ['jc w svcstart w32time'],
  related: ['jc w svc', 'jc w svcstop'],
}
