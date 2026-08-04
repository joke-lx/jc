import { Command } from '../../cli/Command.js'
import { spawn } from 'child_process'


async function executeResume(args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('happy', ['resume', ...args], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })

}

export class ResumeCommand extends Command {
  name = "resume"
  description = "恢复 Happy 会话"
  examples = [`${this.bin} happy resume <session-id>`]

  async handler(args: string[]): Promise<void> {
    return executeResume(args)
  }
}

export const commandDef = new ResumeCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
