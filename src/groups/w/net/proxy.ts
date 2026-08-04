import { Command } from '../../../cli/Command.js'
import { getNetworkManager } from '../../../shared/system/adapter.js'

// src/groups/w/net/proxy.ts

async function executeProxy(_args: string[]): Promise<void> {

  const proxy = await getNetworkManager().getProxySettings()
  console.log(`代理状态:   ${proxy.enabled ? '已启用' : '已禁用'}`)
  console.log(`HTTP 代理:  ${proxy.httpProxy || '(无)'}`)
  console.log(`HTTPS 代理: ${proxy.httpsProxy || '(无)'}`)

}

export class ProxyCommand extends Command {
  name = "proxy"
  description = "代理设置"
  examples = [`${this.bin} w proxy`]
  related = [`${this.bin} w dns`, `${this.bin} w ip`]

  async handler(_args: string[]): Promise<void> {
    return executeProxy(_args)
  }
}

export const commandDef = new ProxyCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
