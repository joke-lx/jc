import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/pwr/logout.ts

async function executeLogout(_args: string[]): Promise<void> {

  const cmd = process.platform === 'win32' ? 'shutdown /l' : 'pkill -KILL -u $USER'
  execSync(cmd, { stdio: 'inherit' })

}

export class LogoutCommand extends Command {
  name = "logout"
  description = "注销当前用户"
  examples = [`${this.bin} w logout`]

  async handler(_args: string[]): Promise<void> {
    return executeLogout(_args)
  }
}

export const commandDef = new LogoutCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
