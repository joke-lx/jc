// src/groups/w/proc/ps.ts
import { getProcessManager } from '../../../shared/system/adapter.js'

export async function handler(args: string[]): Promise<void> {
  const pm = getProcessManager()
  const filter = args.length > 0 ? args[0] : undefined
  const procs = await pm.listProcesses(filter)
  if (procs.length === 0) {
    console.log(filter ? `未找到匹配进程: ${filter}` : '无进程')
    return
  }
  console.table(procs.slice(0, 50).map(p => ({
    PID: p.pid,
    名称: p.name,
    CPU: `${p.cpu}%`,
    内存: `${p.memory}MB`,
    状态: p.state || '',
  })))
  if (procs.length > 50) {
    console.log(`... 还有 ${procs.length - 50} 个进程`)
  }
}

export const commandDef = {
  name: 'ps',
  description: '查进程',
  handler,
  helpText: '用法:\n  jc w ps [无参]  - 列出全部进程\n  jc w ps <NAME>  - 按进程名过滤',
  examples: ['jc w ps', 'jc w ps chrome'],
  related: ['jc w p', 'jc w k', 'jc w kn', 'jc w top'],
}
