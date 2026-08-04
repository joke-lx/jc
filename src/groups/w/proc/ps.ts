import { Command } from '../../../cli/Command.js'
import { getProcessManager } from '../../../shared/system/adapter.js'

// src/groups/w/proc/ps.ts

async function executePs(args: string[]): Promise<void> {

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

export class PsCommand extends Command {
  name = "ps"
  description = "查进程"
  helpText = `用法:
  ${this.bin} w ps [无参]  - 列出全部进程
  ${this.bin} w ps <NAME>  - 按进程名过滤`
  examples = [`${this.bin} w ps`, `${this.bin} w ps chrome`]
  related = [`${this.bin} w p`, `${this.bin} w k`, `${this.bin} w kn`, `${this.bin} w top`]

  async handler(args: string[]): Promise<void> {
    return executePs(args)
  }
}

export const commandDef = new PsCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
