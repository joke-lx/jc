// src/groups/mgr/export.ts
// 交互式：缺路径时问"stdout / 写文件？"；写文件问路径 + 覆盖确认。
import { writeFileSync, existsSync } from 'fs'
import { dirname } from 'path'
import { error } from '../../cli/output.js'
import { confirm } from '../../shared/registry/confirm.js'
import { readRegistry } from '../../shared/registry/store.js'
import { isInteractive, prompt, promptChoice, NoTTYError } from '../../shared/registry/prompt.js'

type Dest = 'stdout' | 'file'

async function resolveDest(): Promise<{ dest: Dest; path?: string }> {
  const v = await promptChoice<Dest>('输出到？', [
    { label: 'stdout（管道重定向）', value: 'stdout' },
    { label: '文件', value: 'file' },
  ])
  if (!v) throw new NoTTYError('已取消（空输入）')
  if (v === 'stdout') return { dest: 'stdout' }
  let p = ''
  while (!p) {
    const ans = await prompt('文件路径?: ')
    if (!ans) { console.log('路径不能为空'); continue }
    if (!existsSync(dirname(ans))) { console.log(`父目录不存在: ${dirname(ans)}`); continue }
    if (existsSync(ans)) {
      const ok = await confirm(`覆盖现有文件 ${ans}? (y/N) `)
      if (!ok) continue
    }
    p = ans
  }
  return { dest: 'file', path: p }
}

export async function handler(args: string[]): Promise<void> {
  const [pathArg] = args
  let dest: Dest = 'stdout'
  let filePath: string | undefined

  if (!pathArg) {
    if (!isInteractive()) {
      // 旧行为兼容：没参数 → stdout。
      dest = 'stdout'
    } else {
      try {
        const r = await resolveDest()
        dest = r.dest
        filePath = r.path
      } catch (e) {
        if (e instanceof NoTTYError) { console.error(error(e.message)); process.exit(2) }
        throw e
      }
    }
  } else {
    dest = 'file'
    filePath = pathArg
  }

  const json = JSON.stringify(readRegistry(), null, 2) + '\n'
  if (dest === 'stdout') {
    process.stdout.write(json)
  } else {
    if (!filePath) { console.error(error('内部错误：file 模式缺路径')); process.exit(2) }
    if (existsSync(filePath) && !pathArg) {
      // 仅在交互路径下走 resolveDest 的覆盖分支；CLI 显式给路径就不二次确认（避免与 rm 行为混淆）。
    }
    writeFileSync(filePath, json, 'utf-8')
    console.log(`已导出: ${filePath}`)
  }
}

export const commandDef = {
  name: 'export',
  description: '将注册表导出为 JSON（缺路径时交互选 stdout / 文件）',
  handler,
  examples: ['jc mgr export', 'jc mgr export backup.json', 'jc mgr export   # TTY 下选目标'],
  related: ['jc mgr import', 'jc mgr backup'],
}