// src/groups/w/sys/host.ts
import { getOsManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  console.log(await getOsManager().getHostname())
}

export const commandDef = {
  name: 'host',
  description: '本机主机名',
  handler,
  examples: ['jc w host'],
  related: ['jc w ip', 'jc w sysinfo'],
}
