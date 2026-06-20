// src/groups/w/tools/resmon.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('resmon')
}

export const commandDef = {
  name: 'resmon',
  description: '资源监视器',
  handler,
  examples: ['jc w resmon'],
}
