import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/net/share.ts

async function executeShare(_args: string[]): Promise<void> {

  try {
    let output: string
    if (process.platform === 'win32') {
      output = execSync('net share', { encoding: 'utf8' })
    } else {
      output = execSync('share', { encoding: 'utf8' }).replace(/^.*\n/, '')
    }
    console.log(output)
  } catch (e: any) {
    console.error(`获取网络共享失败: ${e.message}`)
  }

}

export class ShareCommand extends Command {
  name = "share"
  description = "网络共享"
  examples = [`${this.bin} w share`]
  related = [`${this.bin} w ip`, `${this.bin} w proxy`]

  async handler(_args: string[]): Promise<void> {
    return executeShare(_args)
  }
}

export const commandDef = new ShareCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
