// src/groups/w/file/mkdir.ts
import fs from 'fs'

export async function handler(args: string[]): Promise<void> {
  const dir = args[0]
  if (!dir) {
    console.log('用法: jc w mkdir <directory>')
    return
  }
  try {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`已创建目录: ${dir}`)
  } catch (e: any) {
    console.error(`创建目录失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'mkdir',
  description: '创建目录',
  handler,
  examples: ['jc w mkdir ./newdir', 'jc w mkdir ./a/b/c'],
  related: ['jc w rm', 'jc w touch'],
}
