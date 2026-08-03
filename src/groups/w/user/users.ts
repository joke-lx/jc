// src/groups/w/user/users.ts
import { execSync } from 'child_process'
import { Command } from '../../../cli/Command.js'

async function executeUsers(_args: string[]): Promise<void> {

  if (process.platform === 'win32') {
    execSync('net user', { stdio: 'inherit' })
  } else {
    execSync('cat /etc/passwd | cut -d: -f1,3,6,7', { stdio: 'inherit' })
  }

}

export class UsersCommand extends Command {
  name = "users"
  description = "列出系统用户"
  examples = [`${this.bin} w users`]

  async handler(_args: string[]): Promise<void> {
    return executeUsers(_args)
  }
}

export const commandDef = new UsersCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
