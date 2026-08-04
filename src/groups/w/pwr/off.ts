import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/pwr/off.ts

async function executeOff(_args: string[]): Promise<void> {

  const cmd = process.platform === 'win32' ? 'shutdown /s /t 5' : 'shutdown -h now'
  execSync(cmd, { stdio: 'inherit' })

}

export class OffCommand extends Command {
  name = "off"
  description = "关机 (5s 缓冲)"
  examples = [`${this.bin} w off`]
  related = [`${this.bin} w reboot`, `${this.bin} w cancel`]

  async handler(_args: string[]): Promise<void> {
    return executeOff(_args)
  }
}

export const commandDef = new OffCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
