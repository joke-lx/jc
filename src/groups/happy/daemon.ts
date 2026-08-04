import { Command } from '../../cli/Command.js'
import { spawn } from 'child_process'


async function executeDaemon(_args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('happy', ['daemon'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })

}

export class DaemonCommand extends Command {
  name = "daemon"
  description = "启动 Happy 守护进程"
  examples = [`${this.bin} happy daemon`]

  async handler(_args: string[]): Promise<void> {
    return executeDaemon(_args)
  }
}

export const commandDef = new DaemonCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
