import { Command } from '../../cli/Command.js'
import { spawn } from 'child_process'


async function executeRun(args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { stdio: 'inherit', shell: true })
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`claude exit code ${code}`)))
    child.on('error', (e) => reject(e))
  })

}

export class RunCommand extends Command {
  name = "run"
  description = "启动 Claude Code"
  examples = [`${this.bin} claude`]

  async handler(args: string[]): Promise<void> {
    return executeRun(args)
  }
}

export const commandDef = new RunCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
