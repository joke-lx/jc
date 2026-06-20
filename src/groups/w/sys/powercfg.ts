// src/groups/w/sys/powercfg.ts
import { execSync } from 'child_process'
import { error } from '../../../cli/output.js'

export async function handler(_args: string[]): Promise<void> {
  if (process.platform !== 'win32') {
    console.log('powercfg 仅支持 Windows')
    return
  }
  console.log('正在生成电源方案报告...\n')
  try {
    const schemes = execSync('powercfg /list', { encoding: 'utf8' })
    console.log('电源方案:')
    console.log(schemes)
    const query = execSync('powercfg /query', { encoding: 'utf8', timeout: 15000 })
    console.log('电源方案详细设置:')
    console.log(query)
  } catch (e: any) {
    console.error(error(`电源报告生成失败: ${e.message}`))
  }
}

export const commandDef = {
  name: 'powercfg',
  description: '电源方案信息',
  handler,
  examples: ['jc w powercfg'],
  related: ['jc w bat', 'jc w sysinfo'],
}
