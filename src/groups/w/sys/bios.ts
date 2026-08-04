import { Command } from '../../../cli/Command.js'
import { getOsManager } from '../../../shared/system/adapter.js'

// src/groups/w/sys/bios.ts

async function executeBios(_args: string[]): Promise<void> {

  const os = await getOsManager().getInfo()
  console.log(`BIOS 厂商:  ${os.biosVendor || '(未知)'}`)
  console.log(`BIOS 版本:  ${os.biosVersion || '(未知)'}`)
  console.log(`BIOS 日期:  ${os.biosDate || '(未知)'}`)

}

export class BiosCommand extends Command {
  name = "bios"
  description = "BIOS 信息"
  examples = [`${this.bin} w bios`]
  related = [`${this.bin} w sysinfo`]

  async handler(_args: string[]): Promise<void> {
    return executeBios(_args)
  }
}

export const commandDef = new BiosCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
