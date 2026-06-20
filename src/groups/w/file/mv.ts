// src/groups/w/file/mv.ts
import fs from 'fs'
import path from 'path'

export async function handler(args: string[]): Promise<void> {
  const src = args[0]
  const dest = args[1]
  if (!src || !dest) {
    console.log('用法: jc w mv <source> <destination>')
    return
  }
  try {
    const destDir = path.dirname(dest)
    if (destDir && !fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    fs.renameSync(src, dest)
    console.log(`已移动/重命名: ${src} -> ${dest}`)
  } catch (e: any) {
    console.error(`移动失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'mv',
  description: '移动或重命名文件/目录',
  handler,
  examples: ['jc w mv old.txt new.txt', 'jc w mv file.txt ./backup/'],
  related: ['jc w cp', 'jc w del', 'jc w ls'],
}
