import { Command } from '../../cli/Command.js'
import { spawn } from 'child_process'


async function executeClaude(_args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('happy', ['claude'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })

}

export class ClaudeCommand extends Command {
  name = "claude"
  description = "启动 Happy + Claude"
  examples = [`${this.bin} happy claude`]

  async handler(_args: string[]): Promise<void> {
    return executeClaude(_args)
  }
}

export const commandDef = new ClaudeCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
