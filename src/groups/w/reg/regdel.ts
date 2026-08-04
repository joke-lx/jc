import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/reg/regdel.ts

function requireWin() {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
}

async function executeRegdel(args: string[]): Promise<void> {

  requireWin()
  const path = args[0]
  if (!path) { console.error('❌ 请指定注册表路径'); process.exit(1) }
  console.log(`确认删除 ${path}? (y/N)`)
  const answer = await new Promise<string>(resolve => process.stdin.once('data', d => resolve(d.toString().trim().toLowerCase())))
  if (answer === 'y') {
    execSync(`reg delete "${path}" /f`, { stdio: 'inherit' })
  } else {
    console.log('已取消')
  }

}

export class RegdelCommand extends Command {
  name = "regdel"
  description = "删注册表项"
  platform = 'win32' as const

  async handler(args: string[]): Promise<void> {
    return executeRegdel(args)
  }
}

export const commandDef = new RegdelCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
