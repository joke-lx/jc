import { Command } from '../../../cli/Command.js'
import si from 'systeminformation'

// src/groups/w/svc/svc.ts

async function executeSvc(args: string[]): Promise<void> {

  const services = await si.services('*')
  const filter = args[0]?.toLowerCase()
  const filtered = filter ? services.filter(s => s.name.toLowerCase().includes(filter)) : services
  console.table(filtered.slice(0, 50).map(s => ({ 名称: s.name, 状态: s.running ? '运行中' : '已停止' })))

}

export class SvcCommand extends Command {
  name = "svc"
  description = "查服务"
  examples = [`${this.bin} w svc`, `${this.bin} w svc w32time`]
  related = [`${this.bin} w svcstart`, `${this.bin} w svcstop`]

  async handler(args: string[]): Promise<void> {
    return executeSvc(args)
  }
}

export const commandDef = new SvcCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
