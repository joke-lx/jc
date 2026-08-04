import { Command } from '../../../cli/Command.js'
import { getNetworkManager } from '../../../shared/system/adapter.js'

// src/groups/w/net/wifi.ts

async function executeWifi(_args: string[]): Promise<void> {

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

export class WifiCommand extends Command {
  name = "wifi"
  description = "WiFi 连接信息"
  examples = [`${this.bin} w wifi`]
  related = [`${this.bin} w wifipwd`, `${this.bin} w ip`]

  async handler(_args: string[]): Promise<void> {
    return executeWifi(_args)
  }
}

export const commandDef = new WifiCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
