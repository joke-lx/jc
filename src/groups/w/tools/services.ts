// src/groups/w/tools/services.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('services.msc')
}

export const commandDef = {
  name: 'services',
  description: '服务管理器',
  handler,
  examples: ['jc w services'],
}
