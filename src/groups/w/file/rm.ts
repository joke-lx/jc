// src/groups/w/file/rm.ts
import fs from 'fs'
import readline from 'readline'

function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

export async function handler(args: string[]): Promise<void> {
  const dir = args[0]
  if (!dir) {
    console.log('用法: jc w rm <directory>')
    return
  }
  try {
    if (!fs.existsSync(dir)) {
      console.error(`目录不存在: ${dir}`)
      return
    }
    const ok = await confirm(`确认删除目录 "${dir}"? (y/N) `)
    if (!ok) {
      console.log('已取消')
      return
    }
    fs.rmSync(dir, { recursive: true, force: true })
    console.log(`已删除目录: ${dir}`)
  } catch (e: any) {
    console.error(`删除失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'rm',
  description: '删除目录 (含确认提示)',
  handler,
  examples: ['jc w rm ./node_modules'],
  related: ['jc w del', 'jc w mkdir'],
}
