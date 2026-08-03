import { spawn } from 'child_process'
import { Command } from '../../cli/Command.js'

async function executeCodex(_args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('happy', ['codex'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })

}

export class CodexCommand extends Command {
  name = "codex"
  description = "启动 Happy + Codex"
  examples = [`${this.bin} happy codex`]

  async handler(_args: string[]): Promise<void> {
    return executeCodex(_args)
  }
}

export const commandDef = new CodexCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
