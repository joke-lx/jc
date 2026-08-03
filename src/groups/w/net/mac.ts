// src/groups/w/net/mac.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'
import { Command } from '../../../cli/Command.js'

async function executeMac(_args: string[]): Promise<void> {

  const macs = await getNetworkManager().getMacAddresses()
  if (macs.length === 0) {
    console.log('未找到网络接口')
    return
  }
  for (const m of macs) {
    console.log(`${m.name}: ${m.mac || '-'}`)
  }

}

export class MacCommand extends Command {
  name = "mac"
  description = "MAC 地址"
  examples = [`${this.bin} w mac`]
  related = [`${this.bin} w ip`, `${this.bin} w ip4`]

  async handler(_args: string[]): Promise<void> {
    return executeMac(_args)
  }
}

export const commandDef = new MacCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
