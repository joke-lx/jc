// src/groups/w/net/ip4.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const net = await getNetworkManager().getNetworkInfo()
  for (const iface of net.interfaces) {
    if (iface.ip4) {
      console.log(`${iface.name}: ${iface.ip4}`)
    }
  }
}

export const commandDef = {
  name: 'ip4',
  description: 'IPv4 地址',
  handler,
  examples: ['jc w ip4'],
  related: ['jc w ip', 'jc w mac'],
}
