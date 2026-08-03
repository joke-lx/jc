// src/groups/mgr/import.ts
// 交互式：缺来源时问 "stdin / 文件？"；跳过后问"切换 --merge 重新跑？"
//
// 关键不变量：CLI 参数完整时的行为与旧实现字节级一致；
// 交互只在"原本 exit 1 的位置"出现，不引入副作用。
import { readFileSync } from 'fs'
import { error } from '../../cli/output.js'
import { addItem, getItem, readRegistry, writeRegistry } from '../../shared/registry/store.js'
import { ALIAS_RE, type RegistryFile } from '../../shared/registry/types.js'
import { isInteractive, prompt, promptChoice, NoTTYError } from '../../shared/registry/prompt.js'

function shapeOf(obj: unknown): obj is RegistryFile {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return o.version === 1 && Array.isArray(o.items)
}

// 单次导入尝试，返回 { imported, skipped, failed, skippedAliases }。
// mode 仅控制"重名 alias"行为；不影响其它校验。
function tryImport(
  parsed: RegistryFile,
  mode: 'skip' | 'merge',
): { imported: number; skipped: number; failed: number; skippedAliases: string[] } {
  let imported = 0, skipped = 0, failed = 0
  const skippedAliases: string[] = []
  for (const item of parsed.items) {
    if (!item || typeof item !== 'object') { failed++; continue }
    const it = item as Record<string, unknown>
    if (typeof it.alias !== 'string' || !ALIAS_RE.test(it.alias)) { failed++; continue }
    if (getItem(it.alias)) {
      if (mode === 'skip') { skipped++; skippedAliases.push(it.alias); continue }
      // merge：先删后加（与旧行为一致）
      writeRegistry({ version: 1, items: readRegistry().items.filter(i => i.alias !== it.alias) })
    }
    if (it.kind !== 'npm' && it.kind !== 'py' && it.kind !== 'exe') { failed++; continue }
    addItem({
      kind: it.kind as 'npm' | 'py' | 'exe',
      source: String(it.source ?? ''),
      alias: it.alias.toLowerCase(),
      desc: String(it.desc ?? ''),
      exec: String(it.exec ?? ''),
      args: Array.isArray(it.args) ? (it.args as string[]) : undefined,
      createdAt: String(it.createdAt ?? new Date().toISOString()),
      sourceVerifiedAt: String(it.sourceVerifiedAt ?? new Date().toISOString()),
    })
    imported++
  }
  return { imported, skipped, failed, skippedAliases }
}

async function resolveSource(isTTY: boolean): Promise<string> {
  // 只在 TTY 下问来源；非 TTY 直接 stdin（与旧行为一致）。
  if (!isTTY) {
    return new Promise<string>((resolveP) => {
      let buf = ''
      process.stdin.setEncoding('utf-8')
      process.stdin.on('data', c => { buf += c })
      process.stdin.on('end', () => resolveP(buf))
    })
  }
  const v = await promptChoice<'stdin' | 'file'>('来源？', [
    { label: 'stdin（管道）', value: 'stdin' },
    { label: '文件路径', value: 'file' },
  ])
  if (!v) throw new NoTTYError('已取消（空输入）')
  if (v === 'stdin') {
    return new Promise<string>((resolveP) => {
      let buf = ''
      process.stdin.setEncoding('utf-8')
      process.stdin.on('data', c => { buf += c })
      process.stdin.on('end', () => resolveP(buf))
    })
  }
  while (true) {
    const p = await prompt('文件路径?: ')
    if (!p) { console.log('路径不能为空'); continue }
    try {
      return readFileSync(p, 'utf-8')
    } catch (e) {
      console.log(`读取失败: ${(e as Error).message}`)
    }
  }
}
import { Command } from '../../cli/Command.js'

async function executeImport(args: string[]): Promise<void> {

  const [pathArg, ...rest] = args
  let raw: string
  try {
    raw = pathArg
      ? readFileSync(pathArg, 'utf-8')
      : await resolveSource(isInteractive())
  } catch (e) {
    if (e instanceof NoTTYError) { console.error(error(e.message)); process.exit(2) }
    throw e
  }
  const strict = rest.includes('--strict')

  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch (e) { console.error(error(`JSON 解析失败: ${(e as Error).message}`)); process.exit(1) }
  if (!shapeOf(parsed)) { console.error(error('JSON 形态错误：缺少 version: 1 或 items 数组')); process.exit(1) }

  const first = tryImport(parsed, 'skip')
  console.log(`imported=${first.imported} skipped=${first.skipped} failed=${first.failed}`)
  if (strict && (first.failed > 0 || first.skipped > 0)) process.exit(2)

  // 跳过且有 alias → 问"切换 merge 重新跑？"
  if (first.skipped > 0 && first.skippedAliases.length > 0 && isInteractive()) {
    console.log(`跳过的 alias: ${first.skippedAliases.join(', ')}`)
    const ans = await prompt('要切换到 --merge 重新跑这些项吗？ [y/N] ')
    if (ans.toLowerCase() === 'y') {
      const second = tryImport(parsed, 'merge')
      console.log(`merged: imported=${second.imported} skipped=${second.skipped} failed=${second.failed}`)
      if (strict && (second.failed > 0 || second.skipped > 0)) process.exit(2)
    }
  }

}

export class ImportCommand extends Command {
  name = "import"
  description = "从文件或 stdin 导入注册表 JSON（缺来源时交互问；跳过后问是否切换 --merge）"
  examples = [`${this.bin} mgr import registry.json`, `cat r.json | ${this.bin} mgr import --strict`, `${this.bin} mgr import   # TTY 下选 stdin/文件`]
  related = [`${this.bin} mgr export`, `${this.bin} mgr backup`]

  async handler(args: string[]): Promise<void> {
    return executeImport(args)
  }
}

export const commandDef = new ImportCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
