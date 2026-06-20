// src/groups/w/file/touch.ts
import fs from 'fs'
import path from 'path'

export async function handler(args: string[]): Promise<void> {
  const file = args[0]
  if (!file) {
    console.log('用法: jc w touch <file>')
    return
  }
  try {
    if (fs.existsSync(file)) {
      const now = new Date()
      fs.utimesSync(file, now, now)
      console.log(`已更新: ${file}`)
    } else {
      const dir = path.dirname(file)
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(file, '', 'utf8')
      console.log(`已创建: ${file}`)
    }
  } catch (e: any) {
    console.error(`操作失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'touch',
  description: '创建空文件或更新文件时间戳',
  handler,
  examples: ['jc w touch ./newfile.txt'],
  related: ['jc w mkdir', 'jc w del'],
}
