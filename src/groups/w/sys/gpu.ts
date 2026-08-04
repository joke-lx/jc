import { Command } from '../../../cli/Command.js'
import { getGpuManager } from '../../../shared/system/adapter.js'

// src/groups/w/sys/gpu.ts

async function executeGpu(_args: string[]): Promise<void> {

  const gpus = await getGpuManager().getInfo()
  if (gpus.length === 0) {
    console.log('未检测到 GPU')
    return
  }
  for (let i = 0; i < gpus.length; i++) {
    const g = gpus[i]
    console.log(`GPU #${i + 1}`)
    console.log(`  型号:   ${g.model}`)
    console.log(`  驱动:   ${g.driverVersion || '(未知)'}`)
    console.log(`  显存:   ${g.vramGB}GB`)
    console.log('')
  }

}

export class GpuCommand extends Command {
  name = "gpu"
  description = "GPU 信息"
  examples = [`${this.bin} w gpu`]
  related = [`${this.bin} w cpu`, `${this.bin} w sysinfo`]

  async handler(_args: string[]): Promise<void> {
    return executeGpu(_args)
  }
}

export const commandDef = new GpuCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
