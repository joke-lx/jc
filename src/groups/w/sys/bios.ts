// src/groups/w/sys/bios.ts
import { getOsManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const os = await getOsManager().getInfo()
  console.log(`BIOS 厂商:  ${os.biosVendor || '(未知)'}`)
  console.log(`BIOS 版本:  ${os.biosVersion || '(未知)'}`)
  console.log(`BIOS 日期:  ${os.biosDate || '(未知)'}`)
}

export const commandDef = {
  name: 'bios',
  description: 'BIOS 信息',
  handler,
  examples: ['jc w bios'],
  related: ['jc w sysinfo'],
}
