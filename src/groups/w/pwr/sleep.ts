// src/groups/w/pwr/sleep.ts
import { execSync } from 'child_process'
import { Command } from '../../../cli/Command.js'

async function executeSleep(_args: string[]): Promise<void> {

  const cmd = process.platform === 'win32' ? 'shutdown /h' : 'systemctl suspend'
  execSync(cmd, { stdio: 'inherit' })

}

export class SleepCommand extends Command {
  name = "sleep"
  description = "休眠"
  examples = [`${this.bin} w sleep`]

  async handler(_args: string[]): Promise<void> {
    return executeSleep(_args)
  }
}

export const commandDef = new SleepCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
