// src/groups/w/sys/bat.ts
import si from 'systeminformation'

export async function handler(_args: string[]): Promise<void> {
  try {
    const bat = await si.battery()
    if (!bat.hasBattery) {
      console.log('未检测到电池')
      return
    }
    console.log(`电量:        ${bat.percent}%`)
    console.log(`状态:        ${bat.acConnected ? '电源适配器' : '使用电池'}`)
    if (bat.isCharging) console.log(`充电中:      ${bat.percent}%`)
    if (bat.timeRemaining > 0) {
      const m = Math.floor(bat.timeRemaining / 60)
      console.log(`剩余时间:    ${m} 分钟`)
    }
    if (bat.maxCapacity) console.log(`设计容量:    ${(bat.maxCapacity / 1000).toFixed(1)}Wh`)
    if (bat.currentCapacity) console.log(`当前容量:    ${(bat.currentCapacity / 1000).toFixed(1)}Wh`)
  } catch {
    console.error('无法获取电池信息（可能无电池设备）')
  }
}

export const commandDef = {
  name: 'bat',
  description: '电池状态',
  handler,
  examples: ['jc w bat'],
  related: ['jc w sysinfo', 'jc w powercfg'],
}
