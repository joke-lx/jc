// src/groups/w/proc/mem.ts
import { Command } from '../../../cli/Command.js'

async function executeMem(args: string[]): Promise<void> {

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

export class MemCommand extends Command {
  name = "mem"
  description = "内存占用 Top20 (MB)"
  helpText = `用法:
  ${this.bin} w mem [N]  - 内存降序前 N (默认 20)`
  examples = [`${this.bin} w mem`]
  related = [`${this.bin} w top`, `${this.bin} w ps`, `${this.bin} w psg`]

  async handler(args: string[]): Promise<void> {
    return executeMem(args)
  }
}

export const commandDef = new MemCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
