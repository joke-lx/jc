// src/groups/w/net/ping.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'

async function executePing(args: string[]): Promise<void> {

  const host = args[0] || '127.0.0.1'
  console.log(`Pinging ${host}...`)
  const result = await getNetworkManager().ping(host)
  if (result.alive) {
    console.log(`响应: ${result.time}ms`)
  } else {
    console.log('超时或无响应')
  }

}

export class PingCommand extends Command {
  name = "ping"
  description = "Ping 主机"
  examples = [`${this.bin} w ping google.com`, `${this.bin} w ping 8.8.8.8`]
  related = [`${this.bin} w ns`, `${this.bin} w trace`]

  async handler(args: string[]): Promise<void> {
    return executePing(args)
  }
}

export const commandDef = new PingCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
