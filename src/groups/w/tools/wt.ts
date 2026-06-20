// src/groups/w/tools/wt.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('wt')
}

export const commandDef = {
  name: 'wt',
  description: '打开 Windows Terminal',
  handler,
  examples: ['jc w wt'],
}
