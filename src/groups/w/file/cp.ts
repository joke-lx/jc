// src/groups/w/file/cp.ts
import fs from 'fs'
import path from 'path'

export async function handler(args: string[]): Promise<void> {
  const src = args[0]
  const dest = args[1]
  if (!src || !dest) {
    console.log('用法: jc w cp <source> <destination>')
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

export const commandDef = {
  name: 'cp',
  description: '复制文件或目录',
  handler,
  examples: ['jc w cp file.txt backup.txt', 'jc w cp dir1 dir2'],
  related: ['jc w mv', 'jc w del', 'jc w ls'],
}
