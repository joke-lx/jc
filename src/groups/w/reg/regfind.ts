import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/reg/regfind.ts

function requireWin() {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
}

async function executeRegfind(args: string[]): Promise<void> {

  requireWin()
  execSync(`reg query HKCU /s /f "${args[0] || ''}"`, { stdio: 'inherit' })

}

export class RegfindCommand extends Command {
  name = "regfind"
  description = "搜注册表值名"
  platform = 'win32' as const

  async handler(args: string[]): Promise<void> {
    return executeRegfind(args)
  }
}

export const commandDef = new RegfindCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
