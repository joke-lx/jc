// src/groups/w/tools/perfmon.ts
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('perfmon /report')
}

export const commandDef = {
  name: 'perfmon',
  description: '性能监视器',
  handler,
  examples: ['jc w perfmon'],
}
