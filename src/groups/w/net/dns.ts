// src/groups/w/net/dns.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  try {
    await getNetworkManager().flushDns()
    console.log('DNS 缓存已刷新')
  } catch (e: any) {
    console.error(`DNS 刷新失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'dns',
  description: '刷新 DNS 缓存',
  handler,
  examples: ['jc w dns'],
  related: ['jc w ns', 'jc w proxy'],
}
