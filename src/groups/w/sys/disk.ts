// src/groups/w/sys/disk.ts
import { getDiskManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'

async function executeDisk(_args: string[]): Promise<void> {

  const disks = await getDiskManager().getInfo()
  if (disks.length === 0) {
    console.log('未找到磁盘卷')
    return
  }
  for (const d of disks) {
    console.log(`卷: ${d.drive}`)
    console.log(`  总计: ${d.sizeGB}GB`)
    console.log(`  已用: ${d.usedGB}GB (${d.percentUsed}%)`)
    console.log(`  剩余: ${d.freeGB}GB`)
    console.log(`  文件系统: ${d.filesystem}`)
    console.log('')
  }

}

export class DiskCommand extends Command {
  name = "disk"
  description = "磁盘卷信息 (Get-Volume 风格)"
  examples = [`${this.bin} w disk`]
  related = [`${this.bin} w diskfull`, `${this.bin} w sysinfo`]

  async handler(_args: string[]): Promise<void> {
    return executeDisk(_args)
  }
}

export const commandDef = new DiskCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
