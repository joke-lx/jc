// src/groups/w/net/ping.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(args: string[]): Promise<void> {
  const host = args[0] || '127.0.0.1'
  console.log(`Pinging ${host}...`)
  const result = await getNetworkManager().ping(host)
  if (result.alive) {
    console.log(`响应: ${result.time}ms`)
  } else {
    console.log('超时或无响应')
  }
}

export const commandDef = {
  name: 'ping',
  description: 'Ping 主机',
  handler,
  examples: ['jc w ping google.com', 'jc w ping 8.8.8.8'],
  related: ['jc w ns', 'jc w trace'],
}
