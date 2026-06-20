// src/groups/w/sys/meminfo.ts
import { getMemoryManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const mem = await getMemoryManager().getInfo()
  console.log(`总计: ${mem.totalGB}GB`)
  console.log(`已用: ${mem.usedGB}GB (${mem.percentUsed}%)`)
  console.log(`剩余: ${mem.freeGB}GB`)
  if (mem.swapTotalGB > 0) {
    console.log(`交换: ${mem.swapUsedGB}GB / ${mem.swapTotalGB}GB`)
  }
}

export const commandDef = {
  name: 'meminfo',
  description: '内存信息',
  handler,
  examples: ['jc w meminfo'],
  related: ['jc w cpu', 'jc w disk', 'jc w sysinfo'],
}
