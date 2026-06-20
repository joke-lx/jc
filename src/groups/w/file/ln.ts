// src/groups/w/file/ln.ts
import fs from 'fs'
import path from 'path'

export async function handler(args: string[]): Promise<void> {
  const target = args[0]
  const linkPath = args[1]
  if (!target || !linkPath) {
    console.log('用法: jc w ln <target> <link>')
    return
  }
  try {
    const absTarget = path.resolve(target)
    const absLink = path.resolve(linkPath)
    // Determine junction vs symlink: use junction for directories on Windows
    const isDir = fs.statSync(absTarget).isDirectory()
    if (process.platform === 'win32' && isDir) {
      fs.symlinkSync(absTarget, absLink, 'junction')
    } else {
      fs.symlinkSync(absTarget, absLink)
    }
    console.log(`已创建链接: ${absLink} -> ${absTarget}`)
  } catch (e: any) {
    console.error(`创建链接失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'ln',
  description: '创建符号链接',
  handler,
  examples: ['jc w ln /real/path /link/path'],
  related: ['jc w cp', 'jc w mv', 'jc w ls'],
}
