// src/groups/w/sys/sysinfo.ts
import { getOsManager, getCpuManager, getMemoryManager, getDiskManager, getGpuManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const [os, cpu, mem, disks, gpus] = await Promise.all([
    getOsManager().getInfo(),
    getCpuManager().getInfo(),
    getMemoryManager().getInfo(),
    getDiskManager().getInfo(),
    getGpuManager().getInfo(),
  ])
  console.log(`主机名:     ${os.hostname}`)
  console.log(`操作系统:   ${os.platform} ${os.distro} ${os.release}`)
  console.log(`内核:       ${os.kernel}`)
  console.log(`CPU:        ${cpu.brand} (${cpu.physicalCores}物理核 / ${cpu.logicalCores}逻辑核)`)
  console.log(`CPU 负载:   ${cpu.loadPercent}%`)
  console.log(`内存:       ${mem.totalGB}GB (已用 ${mem.usedGB}GB, 剩余 ${mem.freeGB}GB)`)
  console.log(`运行时长:   ${await getOsManager().getUptime()}`)
  console.log(`BIOS:       ${os.biosVendor} ${os.biosVersion} (${os.biosDate})`)
  if (disks.length > 0) {
    const d = disks[0]
    console.log(`系统盘:     ${d.drive} ${d.usedGB}GB/${d.sizeGB}GB (${d.percentUsed}%)`)
  }
  if (gpus.length > 0) {
    console.log(`GPU:        ${gpus[0].model} (${gpus[0].vramGB}GB)`)
  }
}

export const commandDef = {
  name: 'sysinfo',
  description: '系统详细信息',
  handler,
  helpText: '用法:\n  jc w sysinfo - 显示系统完整信息',
  examples: ['jc w sysinfo'],
  related: ['jc w host', 'jc w cpu', 'jc w meminfo', 'jc w disk'],
}
