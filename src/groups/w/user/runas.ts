// src/groups/w/user/runas.ts
import { execSync } from 'child_process'
import { Command } from '../../../cli/Command.js'

async function executeRunas(_args: string[]): Promise<void> {

  if (process.platform === 'win32') {
    execSync('powershell -NoProfile "Start-Process cmd -Verb RunAs"', { stdio: 'inherit' })
  } else {
    execSync('sudo -i', { stdio: 'inherit' })
  }

}

export class RunasCommand extends Command {
  name = "runas"
  description = "以管理员/root 身份运行"
  examples = [`${this.bin} w runas`]

  async handler(_args: string[]): Promise<void> {
    return executeRunas(_args)
  }
}

export const commandDef = new RunasCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
