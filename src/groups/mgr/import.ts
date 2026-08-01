// src/groups/mgr/import.ts
import { readFileSync } from 'fs'
import { error } from '../../cli/output.js'
import { addItem, getItem } from '../../shared/registry/store.js'
import { ALIAS_RE, type RegistryFile } from '../../shared/registry/types.js'

function shapeOf(obj: unknown): obj is RegistryFile {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return o.version === 1 && Array.isArray(o.items)
}

export async function handler(args: string[]): Promise<void> {
  const [pathArg, ...rest] = args
  let raw: string
  if (pathArg) {
    raw = readFileSync(pathArg, 'utf-8')
  } else {
    raw = await new Promise<string>(resolveP => {
      let buf = ''
      process.stdin.setEncoding('utf-8')
      process.stdin.on('data', c => { buf += c })
      process.stdin.on('end', () => resolveP(buf))
    })
  }
  const strict = rest.includes('--strict')
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch (e) { console.error(error(`JSON 解析失败: ${(e as Error).message}`)); process.exit(1) }
  if (!shapeOf(parsed)) { console.error(error('JSON 形态错误：缺少 version: 1 或 items 数组')); process.exit(1) }

  let imported = 0, skipped = 0, failed = 0
  for (const item of parsed.items) {
    if (!item || typeof item !== 'object') { failed++; continue }
    const it = item as Record<string, unknown>
    if (typeof it.alias !== 'string' || !ALIAS_RE.test(it.alias)) { failed++; continue }
    if (getItem(it.alias)) { skipped++; continue }
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
  console.log(`imported=${imported} skipped=${skipped} failed=${failed}`)
  if (strict && (failed > 0 || skipped > 0)) process.exit(2)
}

export const commandDef = {
  name: 'import',
  description: '从文件或 stdin 导入注册表 JSON',
  handler,
  examples: ['jc mgr import registry.json', 'cat registry.json | jc mgr import --strict'],
  related: ['jc mgr export'],
}
