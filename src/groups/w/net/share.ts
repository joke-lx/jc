// src/groups/w/net/share.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
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

export const commandDef = {
  name: 'share',
  description: '网络共享',
  handler,
  examples: ['jc w share'],
  related: ['jc w ip', 'jc w proxy'],
}
