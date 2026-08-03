// src/groups/w/sys/diskfull.ts
import { getDiskManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'

async function executeDiskfull(_args: string[]): Promise<void> {

  const disks = await getDiskManager().getFullInfo()
  if (disks.length === 0) {
    console.log('未找到磁盘')
    return
  }
  console.log('所有磁盘信息 (Get-PSDrive 风格):')
  for (const d of disks) {
    console.log(`${d.drive}`)
    console.log(`  已用: ${d.usedGB}GB / ${d.sizeGB}GB (${d.percentUsed}%)`)
    console.log(`  剩余: ${d.freeGB}GB`)
    console.log(`  文件系统: ${d.filesystem}`)
    console.log('')
  }

}

export class DiskfullCommand extends Command {
  name = "diskfull"
  description = "完整磁盘信息 (Get-PSDrive 风格)"
  examples = [`${this.bin} w diskfull`]
  related = [`${this.bin} w disk`, `${this.bin} w sysinfo`]

  async handler(_args: string[]): Promise<void> {
    return executeDiskfull(_args)
  }
}

export const commandDef = new DiskfullCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
