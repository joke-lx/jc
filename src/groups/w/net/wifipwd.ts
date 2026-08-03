// src/groups/w/net/wifipwd.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'

async function executeWifipwd(_args: string[]): Promise<void> {

  try {
    const profiles = await getNetworkManager().getWiFiPasswords()
    if (profiles.length === 0) {
      console.log('未找到 WiFi 配置文件')
      return
    }
    for (const p of profiles) {
      console.log(`${p.ssid}: ${p.password}`)
    }
  } catch (e: any) {
    console.error(`获取 WiFi 密码失败: ${e.message}`)
  }

}

export class WifipwdCommand extends Command {
  name = "wifipwd"
  description = "WiFi 密码 (仅 Windows)"
  examples = [`${this.bin} w wifipwd`]
  related = [`${this.bin} w wifi`, `${this.bin} w wifiexp`]
  platform = 'win32' as const

  async handler(_args: string[]): Promise<void> {
    return executeWifipwd(_args)
  }
}

export const commandDef = new WifipwdCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
