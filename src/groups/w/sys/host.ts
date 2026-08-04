import { Command } from '../../../cli/Command.js'
import { getOsManager } from '../../../shared/system/adapter.js'

// src/groups/w/sys/host.ts

async function executeHost(_args: string[]): Promise<void> {

  console.log(await getOsManager().getHostname())

}

export class HostCommand extends Command {
  name = "host"
  description = "本机主机名"
  examples = [`${this.bin} w host`]
  related = [`${this.bin} w ip`, `${this.bin} w sysinfo`]

  async handler(_args: string[]): Promise<void> {
    return executeHost(_args)
  }
}

export const commandDef = new HostCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
