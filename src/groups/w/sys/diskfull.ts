// src/groups/w/sys/diskfull.ts
import { getDiskManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
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

export const commandDef = {
  name: 'diskfull',
  description: '完整磁盘信息 (Get-PSDrive 风格)',
  handler,
  examples: ['jc w diskfull'],
  related: ['jc w disk', 'jc w sysinfo'],
}
