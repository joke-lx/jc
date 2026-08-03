// src/groups/w/pwr/lock.ts
import { execSync } from 'child_process'
import { Command } from '../../../cli/Command.js'

async function executeLock(_args: string[]): Promise<void> {

  const cmd = process.platform === 'win32'
    ? 'rundll32.exe user32.dll,LockWorkStation'
    : 'loginctl lock-session'
  execSync(cmd, { stdio: 'inherit' })

}

export class LockCommand extends Command {
  name = "lock"
  description = "锁定屏幕"
  examples = [`${this.bin} w lock`]

  async handler(_args: string[]): Promise<void> {
    return executeLock(_args)
  }
}

export const commandDef = new LockCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
