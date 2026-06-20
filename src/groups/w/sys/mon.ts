// src/groups/w/sys/mon.ts
import si from 'systeminformation'

export async function handler(_args: string[]): Promise<void> {
  try {
    const graphics = await si.graphics()
    const displays = graphics.displays || []
    if (displays.length === 0) {
      console.log('未检测到显示器')
      return
    }
    for (let i = 0; i < displays.length; i++) {
      const d = displays[i]
      console.log(`显示器 #${i + 1}`)
      console.log(`  型号:   ${d.model || '(未知)'}`)
      if (d.main) console.log('  主显示器: 是')
      console.log(`  分辨率: ${d.resolutionX}x${d.resolutionY}`)
      if (d.currentResX && d.currentResY) console.log(`  当前:   ${d.currentResX}x${d.currentResY}`)
      if (d.pixelDepth) console.log(`  位深:   ${d.pixelDepth}bit`)
      if (d.sizeX && d.sizeY) console.log(`  尺寸:   ${(d.sizeX / 25.4).toFixed(1)}" (${d.sizeX}x${d.sizeY}mm)`)
      console.log('')
    }
  } catch {
    console.error('无法获取显示器信息')
  }
}

export const commandDef = {
  name: 'mon',
  description: '显示器信息',
  handler,
  examples: ['jc w mon'],
  related: ['jc w gpu', 'jc w sysinfo'],
}
