import { spawn } from 'child_process'
import { Command } from '../../cli/Command.js'

async function executeResume(_args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-r', '--dangerously-skip-permissions'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })

}

export class ResumeCommand extends Command {
  name = "r"
  description = "恢复上次会话"
  examples = [`${this.bin} claude r`]

  async handler(_args: string[]): Promise<void> {
    return executeResume(_args)
  }
}

export const commandDef = new ResumeCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
