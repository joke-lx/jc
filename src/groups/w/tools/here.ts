// src/groups/w/tools/here.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('.')
}

export const commandDef = {
  name: 'here',
  description: '打开当前目录',
  handler,
  examples: ['jc w here'],
}
