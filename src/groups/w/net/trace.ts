import { Command } from '../../../cli/Command.js'
import { cliText } from '../../../cli/output.js'
import { getNetworkManager } from '../../../shared/system/adapter.js'

// src/groups/w/net/trace.ts

async function executeTrace(args: string[]): Promise<void> {

  const host = args[0]
  if (!host) {
    console.log(cliText('用法: jc w trace <host>'))
    return
  }
  console.log(`路由追踪到 ${host}...`)
  const hops = await getNetworkManager().traceRoute(host)
  if (hops.length === 0) {
    console.log('无响应')
    return
  }
  for (let i = 0; i < hops.length; i++) {
    console.log(` ${i + 1}. ${hops[i]}`)
  }

}

export class TraceCommand extends Command {
  name = "trace"
  description = "路由追踪"
  examples = [`${this.bin} w trace google.com`]
  related = [`${this.bin} w ping`, `${this.bin} w route`]

  async handler(args: string[]): Promise<void> {
    return executeTrace(args)
  }
}

export const commandDef = new TraceCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
