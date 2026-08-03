// src/groups/w/file/cp.ts
import fs from 'fs'
import { cliText } from '../../../cli/output.js'
import path from 'path'
import { Command } from '../../../cli/Command.js'

async function executeCp(args: string[]): Promise<void> {

  const src = args[0]
  const dest = args[1]
  if (!src || !dest) {
    console.log(cliText('用法: jc w cp <source> <destination>'))
    return
  }
  try {
    const srcStat = fs.statSync(src)
    if (srcStat.isDirectory()) {
      cpDir(src, dest)
    } else {
      const destDir = path.dirname(dest)
      if (destDir && !fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }
      fs.copyFileSync(src, dest)
    }
    console.log(`已复制: ${src} -> ${dest}`)
  } catch (e: any) {
    console.error(`复制失败: ${e.message}`)
  }

}

// 递归复制目录。executor 调用；模块级辅助函数（迁移时曾丢失，已恢复）。
function cpDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  const items = fs.readdirSync(src)
  for (const item of items) {
    const srcPath = path.join(src, item)
    const destPath = path.join(dest, item)
    if (fs.statSync(srcPath).isDirectory()) {
      cpDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

export class CpCommand extends Command {
  name = "cp"
  description = "复制文件或目录"
  examples = [`${this.bin} w cp file.txt backup.txt`, `${this.bin} w cp dir1 dir2`]
  related = [`${this.bin} w mv`, `${this.bin} w del`, `${this.bin} w ls`]

  async handler(args: string[]): Promise<void> {
    return executeCp(args)
  }
}

export const commandDef = new CpCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
