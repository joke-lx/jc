// src/groups/w/sys/gpu.ts
import { getGpuManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
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

export const commandDef = {
  name: 'gpu',
  description: 'GPU 信息',
  handler,
  examples: ['jc w gpu'],
  related: ['jc w cpu', 'jc w sysinfo'],
}
