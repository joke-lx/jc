// src/groups/w/file/del.ts
import fs from 'fs'

export async function handler(args: string[]): Promise<void> {
  const file = args[0]
  if (!file) {
    console.log('用法: jc w del <file>')
    return
  }
  try {
    fs.unlinkSync(file)
    console.log(`已删除: ${file}`)
  } catch (e: any) {
    console.error(`删除失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'del',
  description: '删除文件',
  handler,
  examples: ['jc w del ./temp.txt'],
  related: ['jc w rm', 'jc w cp', 'jc w mv'],
}
