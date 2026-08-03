// src/groups/w/svc/svcstart.ts
import { execSync } from 'child_process'
import { Command } from '../../../cli/Command.js'

async function executeSvcstart(args: string[]): Promise<void> {

  const name = args[0]
  if (!name) { console.error('❌ 请指定服务名'); process.exit(1) }
  execSync(`net start "${name}"`, { stdio: 'inherit' })

}

export class SvcstartCommand extends Command {
  name = "svcstart"
  description = "启动服务"
  examples = [`${this.bin} w svcstart w32time`]
  related = [`${this.bin} w svc`, `${this.bin} w svcstop`]

  async handler(args: string[]): Promise<void> {
    return executeSvcstart(args)
  }
}

export const commandDef = new SvcstartCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
