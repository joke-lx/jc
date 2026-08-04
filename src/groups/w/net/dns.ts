import { Command } from '../../../cli/Command.js'
import { getNetworkManager } from '../../../shared/system/adapter.js'

// src/groups/w/net/dns.ts

async function executeDns(_args: string[]): Promise<void> {

  try {
    await getNetworkManager().flushDns()
    console.log('DNS 缓存已刷新')
  } catch (e: any) {
    console.error(`DNS 刷新失败: ${e.message}`)
  }

}

export class DnsCommand extends Command {
  name = "dns"
  description = "刷新 DNS 缓存"
  examples = [`${this.bin} w dns`]
  related = [`${this.bin} w ns`, `${this.bin} w proxy`]

  async handler(_args: string[]): Promise<void> {
    return executeDns(_args)
  }
}

export const commandDef = new DnsCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
