// src/groups/w/net/route.ts
import { execSync } from 'child_process'
import { Command } from '../../../cli/Command.js'

async function executeRoute(_args: string[]): Promise<void> {

  try {
    const cmd = process.platform === 'win32' ? 'route print' : 'netstat -rn'
    const output = execSync(cmd, { encoding: 'utf8' })
    console.log(output)
  } catch (e: any) {
    console.error(`获取路由表失败: ${e.message}`)
  }

}

export class RouteCommand extends Command {
  name = "route"
  description = "路由表"
  examples = [`${this.bin} w route`]
  related = [`${this.bin} w trace`, `${this.bin} w ip`]

  async handler(_args: string[]): Promise<void> {
    return executeRoute(_args)
  }
}

export const commandDef = new RouteCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
