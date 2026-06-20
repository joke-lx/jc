// src/groups/w/net/wifiexp.ts
import { execSync } from 'child_process'
import { error } from '../../../cli/output.js'

export async function handler(_args: string[]): Promise<void> {
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

export const commandDef = {
  name: 'wifiexp',
  description: '导出 WiFi 配置 (仅 Windows)',
  handler,
  platform: 'win32',
  examples: ['jc w wifiexp'],
  related: ['jc w wifi', 'jc w wifipwd'],
}
