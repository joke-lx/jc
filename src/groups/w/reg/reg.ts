import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/reg/reg.ts

function requireWin() {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
}

async function executeReg(args: string[]): Promise<void> {

  requireWin()
  const path = args[0] || 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
  try {
    console.log(execSync(`reg query "${path}"`, { encoding: 'utf8' }))
  } catch {
    console.log(`路径不存在: ${path}`)
  }

}

export class RegCommand extends Command {
  name = "reg"
  description = "查注册表项"
  examples = [`${this.bin} w reg "HKCU\\\\Software\\\\..."`]
  related = [`${this.bin} w regset`, `${this.bin} w regdel`]
  platform = 'win32' as const

  async handler(args: string[]): Promise<void> {
    return executeReg(args)
  }
}

export const commandDef = new RegCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
