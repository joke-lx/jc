// src/groups/mgr/export.ts
import { readRegistry } from '../../shared/registry/store.js'

export async function handler(_args: string[]): Promise<void> {
  process.stdout.write(JSON.stringify(readRegistry(), null, 2) + '\n')
}

export const commandDef = {
  name: 'export',
  description: '将注册表导出为 JSON 到 stdout',
  handler,
  examples: ['jc mgr export > registry.json'],
  related: ['jc mgr import'],
}
