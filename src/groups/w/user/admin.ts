import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/user/admin.ts

async function executeAdmin(_args: string[]): Promise<void> {

  if (process.platform === 'win32') {
    try {
      execSync('net session', { stdio: 'ignore' })
      console.log('✅ 以管理员身份运行')
    } catch {
      console.log('⚠️ 非管理员身份运行')
    }
  } else {
    console.log(process.getuid?.() === 0 ? '✅ 以 root 身份运行' : '⚠️ 以普通用户身份运行')
  }

}

export class AdminCommand extends Command {
  name = "admin"
  description = "检查是否管理员/root"
  examples = [`${this.bin} w admin`]

  async handler(_args: string[]): Promise<void> {
    return executeAdmin(_args)
  }
}

export const commandDef = new AdminCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
