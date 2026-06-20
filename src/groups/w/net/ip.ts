// src/groups/w/net/ip.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const net = await getNetworkManager().getNetworkInfo()
  console.log(`主机名: ${net.hostname}`)
  if (net.defaultGateway) console.log(`默认网关: ${net.defaultGateway}`)
  console.log('')
  for (const iface of net.interfaces) {
    console.log(`${iface.name} [${iface.type}]`)
    console.log(`  IPv4: ${iface.ip4 || '-'}`)
    console.log(`  IPv6: ${iface.ip6 || '-'}`)
    console.log(`  MAC:  ${iface.mac || '-'}`)
    console.log('')
  }
}

export const commandDef = {
  name: 'ip',
  description: '网络接口信息 (IP/MAC)',
  handler,
  examples: ['jc w ip'],
  related: ['jc w ip4', 'jc w mac', 'jc w wifi'],
}
