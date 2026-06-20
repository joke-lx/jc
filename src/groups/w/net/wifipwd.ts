// src/groups/w/net/wifipwd.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
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

export const commandDef = {
  name: 'wifipwd',
  description: 'WiFi 密码 (仅 Windows)',
  handler,
  platform: 'win32',
  examples: ['jc w wifipwd'],
  related: ['jc w wifi', 'jc w wifiexp'],
}
