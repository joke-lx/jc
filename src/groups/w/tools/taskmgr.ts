// src/groups/w/tools/taskmgr.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('taskmgr')
}

export const commandDef = {
  name: 'taskmgr',
  description: '任务管理器',
  handler,
  examples: ['jc w taskmgr'],
}
