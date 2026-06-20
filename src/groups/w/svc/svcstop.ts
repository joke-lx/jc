// src/groups/w/svc/svcstop.ts
import { execSync } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  const name = args[0]
  if (!name) { console.error('❌ 请指定服务名'); process.exit(1) }
  execSync(`net stop "${name}"`, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'svcstop',
  description: '停止服务',
  handler,
  examples: ['jc w svcstop w32time'],
  related: ['jc w svc', 'jc w svcstart'],
}
