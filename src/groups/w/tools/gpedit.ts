// src/groups/w/tools/gpedit.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('gpedit.msc')
}

export const commandDef = {
  name: 'gpedit',
  description: '组策略编辑器',
  handler,
  examples: ['jc w gpedit'],
}
