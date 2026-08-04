import { Command } from '../../cli/Command.js'
import { spawn } from 'child_process'


async function executeDoctor(_args: string[]): Promise<void> {

  return new Promise((resolve, reject) => {
    const child = spawn('happy', ['doctor'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })

}

export class DoctorCommand extends Command {
  name = "doctor"
  description = "Happy 诊断检查"
  examples = [`${this.bin} happy doctor`]

  async handler(_args: string[]): Promise<void> {
    return executeDoctor(_args)
  }
}

export const commandDef = new DoctorCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
