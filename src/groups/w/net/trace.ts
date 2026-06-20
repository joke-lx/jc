// src/groups/w/net/trace.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(args: string[]): Promise<void> {
  const host = args[0]
  if (!host) {
    console.log('用法: jc w trace <host>')
    return
  }
  console.log(`路由追踪到 ${host}...`)
  const hops = await getNetworkManager().traceRoute(host)
  if (hops.length === 0) {
    console.log('无响应')
    return
  }
  for (let i = 0; i < hops.length; i++) {
    console.log(` ${i + 1}. ${hops[i]}`)
  }
}

export const commandDef = {
  name: 'trace',
  description: '路由追踪',
  handler,
  examples: ['jc w trace google.com'],
  related: ['jc w ping', 'jc w route'],
}
