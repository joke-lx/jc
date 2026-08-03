// src/groups/mgr/export.ts
// 交互式：缺路径时问"stdout / 写文件？"；写文件问路径 + 覆盖确认。
//
// 行为矩阵（按优先级）：
//   jc mgr export --out <path>          → 直接写 <path>，不二次确认（与位置参数一致）
//   jc mgr export <path>                → 同上
//   jc mgr export                       + TTY    → 提议智能默认 ${REGISTRY_DIR}/exports/registry-{ISO}.json
//                                  非 TTY       → 保持旧行为：stdout（管道重定向）
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { error, warning, cliText } from '../../cli/output.js'
import { Command } from '../../cli/Command.js'
import { confirm } from '../../shared/registry/confirm.js'
import { readRegistry } from '../../shared/registry/store.js'
import { getRegistryPath } from '../../shared/registry/paths.js'
import { isInteractive, prompt, promptChoice, NoTTYError } from '../../shared/registry/prompt.js'
import { safeIsoStamp } from './config.js'

type Dest = 'stdout' | 'file'

interface ParsedArgs {
  out?: string
  forceStdout: boolean
}

function parseArgs(args: string[]): ParsedArgs {
  let out: string | undefined
  let forceStdout = false
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--out') { out = args[++i]; continue }
    if (a === '--stdout' || a === '-') { forceStdout = true; continue }
    if (!out) out = a
  }
  return { out, forceStdout }
}

// 计算"建议写入路径"。规则：
//   1. 取 registry 文件的父目录（若 JC_REGISTRY_PATH 指了文件）；否则 fallback 到 ~/.local/share/jc/exports
//   2. 在该目录下建 exports/ 子目录
//   3. 文件名 registry-{ISO}.json
function defaultExportPath(): string {
  const regPath = getRegistryPath()
  const parent = regPath.toLowerCase().endsWith('registry.json')
    ? dirname(regPath)
    : regPath
  return join(parent, 'exports', `registry-${safeIsoStamp()}.json`)
}

// 智能默认：提议 exports/registry-{ISO}.json，让用户回车确认或改写。
async function resolveDestSmart(): Promise<{ dest: Dest; path?: string }> {
  const suggested = defaultExportPath()
  console.log(warning(`建议导出路径: ${suggested}`))
  const ans = await prompt('回车接受，或输入新路径（输入 "-" 走 stdout）: ')
  if (ans === '-') return { dest: 'stdout' }
  if (ans) {
    let p = ans
    const parent = dirname(p)
    if (!existsSync(parent)) {
      try { mkdirSync(parent, { recursive: true }) } catch (e) {
        console.log(`创建目录失败: ${(e as Error).message}，重新输入`)
        return resolveDestSmart()
      }
    }
    if (existsSync(p)) {
      const ok = await confirm(`覆盖现有文件 ${p}? (y/N) `)
      if (!ok) return resolveDestSmart()
    }
    return { dest: 'file', path: p }
  }
  // 空 = 接受建议
  const parent = dirname(suggested)
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true })
  if (existsSync(suggested)) {
    const ok = await confirm(`覆盖现有文件 ${suggested}? (y/N) `)
    if (!ok) return resolveDestSmart()
  }
  return { dest: 'file', path: suggested }
}

async function executeExport(args: string[]): Promise<void> {

  const parsed = parseArgs(args)
  let dest: Dest = 'stdout'
  let filePath: string | undefined

  if (parsed.out) {
    dest = 'file'
    filePath = parsed.out
  } else if (parsed.forceStdout) {
    dest = 'stdout'
  } else if (!isInteractive()) {
    dest = 'stdout'
  } else {
    try {
      const r = await resolveDestSmart()
      dest = r.dest
      filePath = r.path
    } catch (e) {
      if (e instanceof NoTTYError) { console.error(error(e.message)); process.exit(2) }
      throw e
    }
  }

  const json = JSON.stringify(readRegistry(), null, 2) + '\n'
  if (dest === 'stdout') {
    process.stdout.write(json)
  } else {
    if (!filePath) { console.error(error('内部错误：file 模式缺路径')); process.exit(2) }
    const parent = dirname(filePath)
    if (!existsSync(parent)) {
      console.error(error(`父目录不存在: ${parent}`))
      process.exit(2)
    }
    writeFileSync(filePath, json, 'utf-8')
    console.log(`已导出: ${filePath}`)
  }

}

export class ExportCommand extends Command {
  name = "export"
  description = "将注册表导出为 JSON（缺路径时智能默认到 ${REGISTRY_DIR}/exports/registry-{ISO}.json）"
  examples = [`${this.bin} mgr export`, `${this.bin} mgr export backup.json`, `${this.bin} mgr export --out D:\\backups\\r.json`, `${this.bin} mgr export -   # 强制 stdout`]
  related = [`${this.bin} mgr import`, `${this.bin} mgr backup`, `${this.bin} mgr config`]

  async handler(args: string[]): Promise<void> {
    return executeExport(args)
  }
}

export const commandDef = new ExportCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
