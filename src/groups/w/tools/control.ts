// src/groups/w/tools/control.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('control')
}

export const commandDef = {
  name: 'control',
  description: '控制面板',
  handler,
  examples: ['jc w control'],
}
