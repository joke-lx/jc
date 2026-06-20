// src/groups/w/tools/code.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('code .')
}

export const commandDef = {
  name: 'code',
  description: '打开 VS Code (当前目录)',
  handler,
  examples: ['jc w code'],
}
