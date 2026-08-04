import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/pwr/reboot.ts

async function executeReboot(_args: string[]): Promise<void> {

  const cmd = process.platform === 'win32' ? 'shutdown /r /t 5' : 'shutdown -r now'
  execSync(cmd, { stdio: 'inherit' })

}

export class RebootCommand extends Command {
  name = "reboot"
  description = "重启 (5s 缓冲)"
  examples = [`${this.bin} w reboot`]
  related = [`${this.bin} w off`, `${this.bin} w cancel`]

  async handler(_args: string[]): Promise<void> {
    return executeReboot(_args)
  }
}

export const commandDef = new RebootCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
