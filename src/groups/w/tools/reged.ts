// src/groups/w/tools/reged.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('regedit')
}

export const commandDef = {
  name: 'reged',
  description: '注册表编辑器',
  handler,
  examples: ['jc w reged'],
}
