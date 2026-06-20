// src/groups/w/net/mac.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const macs = await getNetworkManager().getMacAddresses()
  if (macs.length === 0) {
    console.log('未找到网络接口')
    return
  }
  for (const m of macs) {
    console.log(`${m.name}: ${m.mac || '-'}`)
  }
}

export const commandDef = {
  name: 'mac',
  description: 'MAC 地址',
  handler,
  examples: ['jc w mac'],
  related: ['jc w ip', 'jc w ip4'],
}
