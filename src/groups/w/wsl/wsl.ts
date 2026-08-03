// src/groups/w/wsl/wsl.ts
import { execSync } from 'child_process'
import { Command } from '../../../cli/Command.js'

async function executeWsl(_args: string[]): Promise<void> {

  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  execSync('wsl --list --verbose', { stdio: 'inherit' })

}

export class WslCommand extends Command {
  name = "wsl"
  description = "列出 WSL 发行版"
  platform = 'win32' as const

  async handler(_args: string[]): Promise<void> {
    return executeWsl(_args)
  }
}

export const commandDef = new WslCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
