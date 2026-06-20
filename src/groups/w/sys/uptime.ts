// src/groups/w/sys/uptime.ts
import { getOsManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  console.log(await getOsManager().getUptime())
}

export const commandDef = {
  name: 'uptime',
  description: '系统运行时长',
  handler,
  examples: ['jc w uptime'],
  related: ['jc w host', 'jc w sysinfo'],
}
