import { Command } from '../../../cli/Command.js'
import { cliText } from '../../../cli/output.js'
import { confirm } from '../../../shared/registry/confirm.js'
import fs from 'fs'

// src/groups/w/file/rm.ts

async function executeRm(args: string[]): Promise<void> {

  const dir = args[0]
  if (!dir) {
    console.log(cliText('用法: {cli} w rm <directory>'))
    return
  }
  try {
    if (!fs.existsSync(dir)) {
      console.error(`目录不存在: ${dir}`)
      return
    }
    const ok = await confirm(`确认删除目录 "${dir}"? (y/N) `)
    if (!ok) {
      console.log('已取消')
      return
    }
    fs.rmSync(dir, { recursive: true, force: true })
    console.log(`已删除目录: ${dir}`)
  } catch (e: any) {
    console.error(`删除失败: ${e.message}`)
  }

}

export class RmCommand extends Command {
  name = "rm"
  description = "删除目录 (含确认提示)"
  examples = [`${this.bin} w rm ./node_modules`]
  related = [`${this.bin} w del`, `${this.bin} w mkdir`]

  async handler(args: string[]): Promise<void> {
    return executeRm(args)
  }
}

export const commandDef = new RmCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
