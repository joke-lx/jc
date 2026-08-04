import { Command } from '../../../cli/Command.js'
import { getNetworkManager } from '../../../shared/system/adapter.js'

// src/groups/w/net/ip4.ts

async function executeIp4(_args: string[]): Promise<void> {

  const net = await getNetworkManager().getNetworkInfo()
  for (const iface of net.interfaces) {
    if (iface.ip4) {
      console.log(`${iface.name}: ${iface.ip4}`)
    }
  }

}

export class Ip4Command extends Command {
  name = "ip4"
  description = "IPv4 地址"
  examples = [`${this.bin} w ip4`]
  related = [`${this.bin} w ip`, `${this.bin} w mac`]

  async handler(_args: string[]): Promise<void> {
    return executeIp4(_args)
  }
}

export const commandDef = new Ip4Command()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
