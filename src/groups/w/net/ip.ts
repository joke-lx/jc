// src/groups/w/net/ip.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'

async function executeIp(_args: string[]): Promise<void> {

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

export class IpCommand extends Command {
  name = "ip"
  description = "网络接口信息 (IP/MAC)"
  examples = [`${this.bin} w ip`]
  related = [`${this.bin} w ip4`, `${this.bin} w mac`, `${this.bin} w wifi`]

  async handler(_args: string[]): Promise<void> {
    return executeIp(_args)
  }
}

export const commandDef = new IpCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
