// src/groups/w/net/proxy.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const proxy = await getNetworkManager().getProxySettings()
  console.log(`代理状态:   ${proxy.enabled ? '已启用' : '已禁用'}`)
  console.log(`HTTP 代理:  ${proxy.httpProxy || '(无)'}`)
  console.log(`HTTPS 代理: ${proxy.httpsProxy || '(无)'}`)
}

export const commandDef = {
  name: 'proxy',
  description: '代理设置',
  handler,
  examples: ['jc w proxy'],
  related: ['jc w dns', 'jc w ip'],
}
