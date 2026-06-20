// src/groups/w/proc/top.ts
import { getProcessManager } from '../../../shared/system/adapter.js'

export async function handler(args: string[]): Promise<void> {
  const pm = getProcessManager()
  const limit = parseInt(args[0], 10) || 20
  const procs = await pm.getTopProcesses('cpu', limit)
  console.table(procs.map(p => ({
    PID: p.pid,
    名称: p.name,
    CPU: `${p.cpu}%`,
    内存: `${p.memory}MB`,
  })))
}

export const commandDef = {
  name: 'top',
  description: 'CPU 占用 Top20',
  handler,
  helpText: '用法:\n  jc w top [N]  - CPU 降序前 N (默认 20)',
  examples: ['jc w top'],
  related: ['jc w mem', 'jc w ps', 'jc w psg'],
}
