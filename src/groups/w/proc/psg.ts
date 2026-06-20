// src/groups/w/proc/psg.ts
import { getProcessManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const pm = getProcessManager()
  const stats = await pm.getProcessStats()
  console.log(`进程总数: ${stats.total}`)
  console.log(`运行中:   ${stats.running}`)
  console.log(`CPU 占用: ${stats.cpuPercent}%`)
  console.log(`内存占用: ${stats.memoryGB}GB`)
}

export const commandDef = {
  name: 'psg',
  description: '进程统计概览',
  handler,
  helpText: '用法:\n  jc w psg [无参] - 进程统计概览',
  examples: ['jc w psg'],
  related: ['jc w ps', 'jc w top', 'jc w mem'],
}
