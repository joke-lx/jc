// src/groups/w/wsl/wslkill.ts
import { execSync } from 'child_process'
import { Command } from '../../../cli/Command.js'

async function executeWslkill(_args: string[]): Promise<void> {

  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  execSync('wsl --shutdown', { stdio: 'inherit' })

}

export class WslkillCommand extends Command {
  name = "wslkill"
  description = "关闭所有 WSL 实例"
  platform = 'win32' as const

  async handler(_args: string[]): Promise<void> {
    return executeWslkill(_args)
  }
}

export const commandDef = new WslkillCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
