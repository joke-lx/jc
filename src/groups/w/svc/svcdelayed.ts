// src/groups/w/svc/svcdelayed.ts
import { execSync } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  const name = args[0]
  if (!name) { console.error('❌ 请指定服务名'); process.exit(1) }
  execSync(`sc config "${name}" start=delayed-auto`, { stdio: 'inherit' })
}

export const commandDef = {
  name: 'svcdelayed',
  description: '设置服务为延迟自启',
  handler,
  examples: ['jc w svcdelayed w32time'],
}
