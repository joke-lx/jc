// src/groups/w/tools/msconfig.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('msconfig')
}

export const commandDef = {
  name: 'msconfig',
  description: '系统配置',
  handler,
  examples: ['jc w msconfig'],
}
