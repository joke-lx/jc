import { Command } from '../../../cli/Command.js'
import { getOsManager } from '../../../shared/system/adapter.js'

// src/groups/w/sys/uptime.ts

async function executeUptime(_args: string[]): Promise<void> {

  console.log(await getOsManager().getUptime())

}

export class UptimeCommand extends Command {
  name = "uptime"
  description = "系统运行时长"
  examples = [`${this.bin} w uptime`]
  related = [`${this.bin} w host`, `${this.bin} w sysinfo`]

  async handler(_args: string[]): Promise<void> {
    return executeUptime(_args)
  }
}

export const commandDef = new UptimeCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
