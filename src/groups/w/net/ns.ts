// src/groups/w/net/ns.ts
import { execSync } from 'child_process'
import { cliText } from '../../../cli/output.js'
import { Command } from '../../../cli/Command.js'

async function executeNs(args: string[]): Promise<void> {

  const host = args[0]
  if (!host) {
    console.log(cliText('用法: jc w ns <hostname>'))
    return
  }
  try {
    const output = execSync(`nslookup ${host}`, { encoding: 'utf8', timeout: 10000 })
    console.log(output)
  } catch (e: any) {
    console.error(`DNS 查询失败: ${e.message}`)
  }

}

export class NsCommand extends Command {
  name = "ns"
  description = "DNS 查询 (nslookup)"
  examples = [`${this.bin} w ns google.com`]
  related = [`${this.bin} w dns`, `${this.bin} w ping`]

  async handler(args: string[]): Promise<void> {
    return executeNs(args)
  }
}

export const commandDef = new NsCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
