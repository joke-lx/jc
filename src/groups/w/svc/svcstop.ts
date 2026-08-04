import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/svc/svcstop.ts

async function executeSvcstop(args: string[]): Promise<void> {

  const name = args[0]
  if (!name) { console.error('❌ 请指定服务名'); process.exit(1) }
  execSync(`net stop "${name}"`, { stdio: 'inherit' })

}

export class SvcstopCommand extends Command {
  name = "svcstop"
  description = "停止服务"
  examples = [`${this.bin} w svcstop w32time`]
  related = [`${this.bin} w svc`, `${this.bin} w svcstart`]

  async handler(args: string[]): Promise<void> {
    return executeSvcstop(args)
  }
}

export const commandDef = new SvcstopCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
