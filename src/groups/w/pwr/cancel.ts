import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/pwr/cancel.ts

async function executeCancel(_args: string[]): Promise<void> {

  const cmd = process.platform === 'win32' ? 'shutdown /a' : 'shutdown -c'
  execSync(cmd, { stdio: 'inherit' })

}

export class CancelCommand extends Command {
  name = "cancel"
  description = "取消关机/重启"
  examples = [`${this.bin} w cancel`]
  related = [`${this.bin} w off`, `${this.bin} w reboot`]

  async handler(_args: string[]): Promise<void> {
    return executeCancel(_args)
  }
}

export const commandDef = new CancelCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
