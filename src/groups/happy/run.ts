import { spawn } from 'child_process'
import { Command } from '../../cli/Command.js'

async function executeRun(args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('happy', args, { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`happy exit ${c}`)))
    child.on('error', reject)
  })

}

export class RunCommand extends Command {
  name = "run"
  description = "启动 Happy"
  examples = [`${this.bin} happy`]

  async handler(args: string[]): Promise<void> {
    return executeRun(args)
  }
}

export const commandDef = new RunCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
