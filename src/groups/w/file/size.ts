// src/groups/w/file/size.ts
import { getDiskManager } from '../../../shared/system/adapter.js'
import fs from 'fs'
import path from 'path'

function getDirSize(dir: string): number {
  let total = 0
  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      try {
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          total += getDirSize(fullPath)
        } else {
          total += stat.size
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return total
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
import { Command } from '../../../cli/Command.js'

async function executeSize(args: string[]): Promise<void> {

  const target = args[0] || '.'
  try {
    const stat = fs.statSync(target)
    if (stat.isDirectory()) {
      console.log(`正在计算 "${target}" 的大小...`)
      const size = getDirSize(target)
      console.log(`目录大小: ${formatBytes(size)}`)
    } else {
      console.log(`${target}: ${formatBytes(stat.size)}`)
    }
  } catch (e: any) {
    console.error(`获取大小失败: ${e.message}`)
  }

}

export class SizeCommand extends Command {
  name = "size"
  description = "目录或文件大小"
  examples = [`${this.bin} w size .`, `${this.bin} w size ./node_modules`]
  related = [`${this.bin} w disk`, `${this.bin} w ls`, `${this.bin} w dtree`]

  async handler(args: string[]): Promise<void> {
    return executeSize(args)
  }
}

export const commandDef = new SizeCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
