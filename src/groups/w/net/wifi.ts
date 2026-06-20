// src/groups/w/net/wifi.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const networks = await getNetworkManager().getWiFiInfo()
  if (networks.length === 0) {
    console.log('未连接 WiFi 或无 WiFi 适配器')
    return
  }
  for (const n of networks) {
    console.log(`SSID:       ${n.ssid}`)
    console.log(`信号:       ${n.signal}%`)
    console.log(`频率:       ${n.frequency}`)
    console.log(`信道:       ${n.channel}`)
    console.log(`安全类型:   ${n.security}`)
    console.log('')
  }
}

export const commandDef = {
  name: 'wifi',
  description: 'WiFi 连接信息',
  handler,
  examples: ['jc w wifi'],
  related: ['jc w wifipwd', 'jc w ip'],
}
