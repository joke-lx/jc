// src/groups/w/sys/cpu.ts
import { getCpuManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const cpu = await getCpuManager().getInfo()
  console.log(`型号:     ${cpu.manufacturer} ${cpu.brand}`)
  console.log(`物理核:   ${cpu.physicalCores}`)
  console.log(`逻辑核:   ${cpu.logicalCores}`)
  console.log(`主频:     ${cpu.speedGHz}GHz`)
  console.log(`当前负载: ${cpu.loadPercent}%`)
}

export const commandDef = {
  name: 'cpu',
  description: 'CPU 信息',
  handler,
  examples: ['jc w cpu'],
  related: ['jc w meminfo', 'jc w gpu', 'jc w sysinfo'],
}
