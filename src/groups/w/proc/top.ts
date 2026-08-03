// src/groups/w/proc/top.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'

async function executeTop(args: string[]): Promise<void> {

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

export class TopCommand extends Command {
  name = "top"
  description = "CPU 占用 Top20"
  helpText = `用法:
  ${this.bin} w top [N]  - CPU 降序前 N (默认 20)`
  examples = [`${this.bin} w top`]
  related = [`${this.bin} w mem`, `${this.bin} w ps`, `${this.bin} w psg`]

  async handler(args: string[]): Promise<void> {
    return executeTop(args)
  }
}

export const commandDef = new TopCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
