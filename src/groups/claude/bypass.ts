import { Command } from '../../cli/Command.js'
import { spawn } from 'child_process'


async function executeBypass(_args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['--permission-mode', 'bypassPermissions'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })

}

export class BypassCommand extends Command {
  name = "b"
  description = "跳过权限模式"
  examples = [`${this.bin} claude b`]

  async handler(_args: string[]): Promise<void> {
    return executeBypass(_args)
  }
}

export const commandDef = new BypassCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
