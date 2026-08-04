import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/svc/svcdelayed.ts

async function executeSvcdelayed(args: string[]): Promise<void> {

  const name = args[0]
  if (!name) { console.error('❌ 请指定服务名'); process.exit(1) }
  execSync(`sc config "${name}" start=delayed-auto`, { stdio: 'inherit' })

}

export class SvcdelayedCommand extends Command {
  name = "svcdelayed"
  description = "设置服务为延迟自启"
  examples = [`${this.bin} w svcdelayed w32time`]

  async handler(args: string[]): Promise<void> {
    return executeSvcdelayed(args)
  }
}

export const commandDef = new SvcdelayedCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
