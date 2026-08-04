import { Command } from '../../../cli/Command.js'
import { getMemoryManager } from '../../../shared/system/adapter.js'

// src/groups/w/sys/meminfo.ts

async function executeMeminfo(_args: string[]): Promise<void> {

  const mem = await getMemoryManager().getInfo()
  console.log(`总计: ${mem.totalGB}GB`)
  console.log(`已用: ${mem.usedGB}GB (${mem.percentUsed}%)`)
  console.log(`剩余: ${mem.freeGB}GB`)
  if (mem.swapTotalGB > 0) {
    console.log(`交换: ${mem.swapUsedGB}GB / ${mem.swapTotalGB}GB`)
  }

}

export class MeminfoCommand extends Command {
  name = "meminfo"
  description = "内存信息"
  examples = [`${this.bin} w meminfo`]
  related = [`${this.bin} w cpu`, `${this.bin} w disk`, `${this.bin} w sysinfo`]

  async handler(_args: string[]): Promise<void> {
    return executeMeminfo(_args)
  }
}

export const commandDef = new MeminfoCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
