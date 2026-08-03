// src/groups/w/proc/psg.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'

async function executePsg(_args: string[]): Promise<void> {

  const pm = getProcessManager()
  const stats = await pm.getProcessStats()
  console.log(`进程总数: ${stats.total}`)
  console.log(`运行中:   ${stats.running}`)
  console.log(`CPU 占用: ${stats.cpuPercent}%`)
  console.log(`内存占用: ${stats.memoryGB}GB`)

}

export class PsgCommand extends Command {
  name = "psg"
  description = "进程统计概览"
  helpText = `用法:
  ${this.bin} w psg [无参] - 进程统计概览`
  examples = [`${this.bin} w psg`]
  related = [`${this.bin} w ps`, `${this.bin} w top`, `${this.bin} w mem`]

  async handler(_args: string[]): Promise<void> {
    return executePsg(_args)
  }
}

export const commandDef = new PsgCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
