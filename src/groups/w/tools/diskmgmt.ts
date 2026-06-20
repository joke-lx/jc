// src/groups/w/tools/diskmgmt.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('diskmgmt.msc')
}

export const commandDef = {
  name: 'diskmgmt',
  description: '磁盘管理',
  handler,
  examples: ['jc w diskmgmt'],
}
