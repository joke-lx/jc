// src/groups/w/tools/eventvwr.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('eventvwr.msc')
}

export const commandDef = {
  name: 'eventvwr',
  description: '事件查看器',
  handler,
  examples: ['jc w eventvwr'],
}
