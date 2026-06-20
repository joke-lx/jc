// src/groups/w/file/dtree.ts
import fs from 'fs'
import path from 'path'

function printTree(dir: string, prefix: string = ''): void {
  let items: string[] = []
  try {
    items = fs.readdirSync(dir)
  } catch { return }
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const fullPath = path.join(dir, item)
    const isLast = i === items.length - 1
    const connector = isLast ? '└── ' : '├── '
    console.log(prefix + connector + item)
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        const ext = isLast ? '    ' : '│   '
        printTree(fullPath, prefix + ext)
      }
    } catch { /* skip */ }
  }
}

export async function handler(args: string[]): Promise<void> {
  const dir = args[0] || '.'
  console.log(dir)
  printTree(dir)
}

export const commandDef = {
  name: 'dtree',
  description: '目录树',
  handler,
  examples: ['jc w dtree', 'jc w dtree C:\\project'],
  related: ['jc w ls', 'jc w find', 'jc w size'],
}
