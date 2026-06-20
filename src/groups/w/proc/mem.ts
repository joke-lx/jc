// src/groups/w/proc/mem.ts
export async function handler(args: string[]): Promise<void> {
  const { getProcessManager } = await import('../../../shared/system/adapter.js')
  const pm = getProcessManager()
  const limit = parseInt(args[0], 10) || 20
  const procs = await pm.getTopProcesses('memory', limit)
  console.table(procs.map(p => ({
    PID: p.pid,
    名称: p.name,
    内存: `${p.memory}MB`,
    CPU: `${p.cpu}%`,
  })))
}

export const commandDef = {
  name: 'mem',
  description: '内存占用 Top20 (MB)',
  handler,
  helpText: '用法:\n  jc w mem [N]  - 内存降序前 N (默认 20)',
  examples: ['jc w mem'],
  related: ['jc w top', 'jc w ps', 'jc w psg'],
}
