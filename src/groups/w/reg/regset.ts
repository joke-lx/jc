// src/groups/w/reg/regset.ts
import { execSync } from 'child_process'
import { cliText } from '../../../cli/output.js'

function requireWin() {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
}
import { Command } from '../../../cli/Command.js'

async function executeRegset(args: string[]): Promise<void> {

  requireWin()
  const path = args[0]
  const name = args[1]
  const value = args.slice(2).join(' ')
  if (!path || !name) { console.error(cliText('❌ 用法: jc w regset <path> <name> <value>')); process.exit(1) }
  execSync(`reg add "${path}" /v "${name}" /d "${value}" /f`, { stdio: 'inherit' })

}

export class RegsetCommand extends Command {
  name = "regset"
  description = "写注册表值"
  platform = 'win32' as const

  async handler(args: string[]): Promise<void> {
    return executeRegset(args)
  }
}

export const commandDef = new RegsetCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
