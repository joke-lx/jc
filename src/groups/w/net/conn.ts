// src/groups/w/net/conn.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const conns = await getNetworkManager().getConnections()
  if (conns.length === 0) {
    console.log('无 TCP 连接')
    return
  }
  const listening = conns.filter(c => c.state === 'listen')
  const established = conns.filter(c => c.state === 'established')
  console.log(`TCP 连接总数: ${conns.length}`)
  console.log(`  监听中:     ${listening.length}`)
  console.log(`  已建立:     ${established.length}`)
  console.log('')
  if (listening.length > 0) {
    console.log('监听端口:')
    for (const c of listening.slice(0, 20)) {
      console.log(`  :${c.localPort} (PID: ${c.pid})`)
    }
    if (listening.length > 20) console.log(`  ... 还有 ${listening.length - 20} 个`)
  }
}

export const commandDef = {
  name: 'conn',
  description: 'TCP 连接信息',
  handler,
  examples: ['jc w conn'],
  related: ['jc w p', 'jc w portscan'],
}
