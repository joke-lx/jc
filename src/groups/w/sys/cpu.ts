// src/groups/w/sys/cpu.ts
import { getCpuManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'

async function executeCpu(_args: string[]): Promise<void> {

  const cpu = await getCpuManager().getInfo()
  console.log(`型号:     ${cpu.manufacturer} ${cpu.brand}`)
  console.log(`物理核:   ${cpu.physicalCores}`)
  console.log(`逻辑核:   ${cpu.logicalCores}`)
  console.log(`主频:     ${cpu.speedGHz}GHz`)
  console.log(`当前负载: ${cpu.loadPercent}%`)

}

export class CpuCommand extends Command {
  name = "cpu"
  description = "CPU 信息"
  examples = [`${this.bin} w cpu`]
  related = [`${this.bin} w meminfo`, `${this.bin} w gpu`, `${this.bin} w sysinfo`]

  async handler(_args: string[]): Promise<void> {
    return executeCpu(_args)
  }
}

export const commandDef = new CpuCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
