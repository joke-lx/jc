import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/svc/svcrestart.ts

async function executeSvcrestart(args: string[]): Promise<void> {

  const name = args[0]
  if (!name) { console.error('❌ 请指定服务名'); process.exit(1) }
  execSync(`net stop "${name}"`, { stdio: 'inherit' })
  execSync(`net start "${name}"`, { stdio: 'inherit' })

}

export class SvcrestartCommand extends Command {
  name = "svcrestart"
  description = "重启服务"
  examples = [`${this.bin} w svcrestart w32time`]

  async handler(args: string[]): Promise<void> {
    return executeSvcrestart(args)
  }
}

export const commandDef = new SvcrestartCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
