// src/groups/w/file/ls.ts
import fs from 'fs'
import path from 'path'

export async function handler(args: string[]): Promise<void> {
  const dir = args[0] || '.'
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of items) {
      const fullPath = path.join(dir, item.name)
      let stat: fs.Stats | null = null
      try { stat = fs.statSync(fullPath) } catch { /* ignore */ }
      if (item.isDirectory()) {
        console.log(`[DIR]  ${item.name}${stat ? `  (${stat.size} bytes)` : ''}`)
      } else if (item.isSymbolicLink()) {
        const target = fs.readlinkSync(fullPath)
        console.log(`[LNK]  ${item.name} -> ${target}`)
      } else {
        console.log(`[FILE] ${item.name}${stat ? `  (${stat.size} bytes)` : ''}`)
      }
    }
  } catch (e: any) {
    console.error(`读取目录失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'ls',
  description: '列出目录内容',
  handler,
  examples: ['jc w ls', 'jc w ls C:\\'],
  related: ['jc w pwd', 'jc w dtree', 'jc w find'],
}
