// src/groups/w/proc/port.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { error } from '../../../cli/output.js'

export async function handler(args: string[]): Promise<void> {
  const pm = getProcessManager()
  if (args.length === 0) {
    const ports = await pm.getListeningPorts()
    console.log('监听端口列表:')
    if (ports.length === 0) {
      console.log('无监听的端口')
      return
    }
    console.table(ports.map(p => ({ PID: p.pid, Port: p.port, State: p.state })))
    return
  }
  const port = parseInt(args[0], 10)
  if (isNaN(port)) {
    console.error(error('❌ 端口号必须是数字'))
    process.exit(1)
  }
  const procs = await pm.getProcessByPort(port)
  if (procs.length === 0) {
    console.log(`端口 ${port} 无进程占用`)
    return
  }
  console.table(procs.map(p => ({ PID: p.pid, 进程名: p.name, CPU: `${p.cpu}%`, 内存: `${p.memory}MB` })))
}

export const commandDef = {
  name: 'p',
  description: '查端口占用的进程',
  handler,
  helpText: '用法:\n  jc w p [无参]  - 列所有监听端口\n  jc w p <PORT>  - 查指定端口',
  examples: ['jc w p', 'jc w p 3306'],
  related: ['jc w pk', 'jc w k', 'jc w portscan'],
}
