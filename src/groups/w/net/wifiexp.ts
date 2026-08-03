// src/groups/w/net/wifiexp.ts
import { execSync } from 'child_process'
import { error } from '../../../cli/output.js'
import { Command } from '../../../cli/Command.js'

async function executeWifiexp(_args: string[]): Promise<void> {

  if (process.platform !== 'win32') {
    console.error(error('此命令仅支持 Windows'))
    return
  }
  try {
    const output = execSync('netsh wlan export profile folder=. key=clear', { encoding: 'utf8' })
    console.log('WiFi 配置文件已导出到当前目录')
    console.log(output)
  } catch (e: any) {
    console.error(error(`导出 WiFi 配置失败: ${e.message}`))
  }

}

export class WifiexpCommand extends Command {
  name = "wifiexp"
  description = "导出 WiFi 配置 (仅 Windows)"
  examples = [`${this.bin} w wifiexp`]
  related = [`${this.bin} w wifi`, `${this.bin} w wifipwd`]
  platform = 'win32' as const

  async handler(_args: string[]): Promise<void> {
    return executeWifiexp(_args)
  }
}

export const commandDef = new WifiexpCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
