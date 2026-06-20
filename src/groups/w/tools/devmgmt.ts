// src/groups/w/tools/devmgmt.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('devmgmt.msc')
}

export const commandDef = {
  name: 'devmgmt',
  description: '设备管理器',
  handler,
  examples: ['jc w devmgmt'],
}
