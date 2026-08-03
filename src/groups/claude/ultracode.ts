import { spawn } from 'child_process'
import { Command } from '../../cli/Command.js'

async function executeUltracode(_args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['--dangerously-skip-permissions', '/effort ultracode'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })

}

export class UltracodeCommand extends Command {
  name = "e"
  description = "Ultracode 模式"
  examples = [`${this.bin} claude e`]

  async handler(_args: string[]): Promise<void> {
    return executeUltracode(_args)
  }
}

export const commandDef = new UltracodeCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
