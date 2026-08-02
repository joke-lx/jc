// src/groups/mgr/restore.ts
// 从 zip 还原 registry。三个策略：默认 skip（已有 alias 不动）、--merge（覆盖）、
// --replace（先自动备份当前再清空重建）。--dry-run 只报告不写。
//
// 设计原则：
// 1. 三种策略语义严格互斥：--dry-run 不写任何东西；--merge / --replace 才落盘。
// 2. --replace 必须先把当前 registry 备份为 registry.json.bak-<ISO>，再清空、再导入。
//    失败时 bak 仍在，用户能人工回退。
// 3. execLocal=true 且 bundledAs 存在的项：解压到 <JC_DATA>/sources/<alias>/<basename>，
//    写回 exec/source 为新路径。这才是"换机一键"的关键。
// 4. execLocal=true 但 bundledAs 不存在的项：failed++，告诉用户跑 jc mgr check <alias> 重装。
//    不能盲目写空 exec，否则后续 run 直接炸。
// 5. formatVersion 严格校验：未知版本直接拒绝，避免静默错位。
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs'
import { join, basename, dirname } from 'path'
import { error, success, warning } from '../../cli/output.js'
import { getRegistryPath, ensureRegistryDir } from '../../shared/registry/paths.js'
import {
  readRegistry, writeRegistry, addItem, removeItem,
} from '../../shared/registry/store.js'
import { isManifest, type BackupManifest, type ManifestItem } from '../../shared/backup/manifest.js'
import { openZip, hasEntry, readTextEntry } from '../../shared/backup/zip.js'

type Mode = 'skip' | 'merge' | 'replace' | 'dry-run'

interface ParsedArgs {
  zipPath: string
  mode: Mode
}

function parseArgs(args: string[]): ParsedArgs | null {
  let zipPath = ''
  let mode: Mode = 'skip'
  for (const a of args) {
    if (a === '--dry-run') mode = 'dry-run'
    else if (a === '--merge') mode = 'merge'
    else if (a === '--replace') mode = 'replace'
    else if (!zipPath) zipPath = a
  }
  if (!zipPath) return null
  return { zipPath, mode }
}

// 把 zip 内的 sources/<alias>/<basename> 解到 <JC_DATA>/sources/<alias>/<basename>。
// 返回新 exec/source（绝对路径）。
function extractLocalSource(
  zip: import('adm-zip').default,
  alias: string,
  bundledAs: string,
): { exec: string; source: string } {
  const jcDir = dirname(getRegistryPath())
  const targetDir = join(jcDir, 'sources', alias)
  mkdirSync(targetDir, { recursive: true })
  const targetPath = join(targetDir, basename(bundledAs))
  const entry = zip.getEntry(bundledAs)
  if (!entry) throw new Error(`zip 缺少 bundledAs 条目: ${bundledAs}`)
  writeFileSync(targetPath, entry.getData())
  return { exec: targetPath, source: targetPath }
}

// --replace：先把当前 registry 备份为 registry.json.bak-<ISO>，再清空。
// 备份失败 → 直接 exit，不动当前文件。
function autoBakCurrentRegistry(): void {
  const cur = getRegistryPath()
  if (!existsSync(cur)) return // 当前没 registry，不需要备份
  const iso = new Date().toISOString().replace(/[:.]/g, '-')
  const bak = cur + '.bak-' + iso
  copyFileSync(cur, bak)
  writeRegistry({ version: 1, items: [] })
}

// 计算 dry-run 的预演结果，不写任何东西。
function planRestore(
  manifest: BackupManifest,
  currentAliases: Set<string>,
  mode: Mode,
): { imported: ManifestItem[]; skipped: ManifestItem[]; failed: ManifestItem[]; wouldClear: boolean } {
  const imported: ManifestItem[] = []
  const skipped: ManifestItem[] = []
  const failed: ManifestItem[] = []
  for (const it of manifest.items) {
    if (currentAliases.has(it.alias)) {
      if (mode === 'skip') { skipped.push(it); continue }
      if (mode === 'dry-run') { skipped.push(it); continue }
      // merge / replace：覆盖。
      imported.push(it)
    } else {
      imported.push(it)
    }
  }
  return { imported, skipped, failed, wouldClear: mode === 'replace' }
}

export async function handler(args: string[]): Promise<void> {
  const parsed = parseArgs(args)
  if (!parsed) {
    console.error(error('用法: jc mgr restore <path.zip> [--dry-run | --merge | --replace]'))
    process.exit(1)
  }

  let zip: import('adm-zip').default
  try {
    zip = openZip(parsed.zipPath)
  } catch (e) {
    console.error(error((e as Error).message))
    process.exit(1)
  }

  if (!hasEntry(zip, 'manifest.json')) {
    console.error(error('zip 缺少 manifest.json'))
    process.exit(1)
  }
  let manifest: BackupManifest
  try {
    const raw = readTextEntry(zip, 'manifest.json')
    const obj: unknown = JSON.parse(raw)
    if (!isManifest(obj)) throw new Error('manifest 形态错误（缺少 formatVersion / registryVersion / items）')
    manifest = obj
  } catch (e) {
    console.error(error(`manifest 解析失败: ${(e as Error).message}`))
    process.exit(1)
  }

  // 读 registry.json 但只在 replace 模式下需要重写整个文件；其他模式逐项 add。
  const current = readRegistry()
  const currentAliases = new Set(current.items.map(i => i.alias))
  const plan = planRestore(manifest, currentAliases, parsed.mode)

  if (parsed.mode === 'dry-run') {
    console.log(`[dry-run] 将跳过: ${plan.skipped.length}, 将导入: ${plan.imported.length}, 将失败: ${plan.failed.length}, 将清空当前: ${plan.wouldClear}`)
    for (const it of plan.skipped) console.log(`  skip: ${it.alias}（已存在）`)
    for (const it of plan.imported) console.log(`  import: ${it.alias} (${it.kind}) execLocal=${it.execLocal}${it.bundledAs ? ` bundledAs=${it.bundledAs}` : ''}`)
    return
  }

  // replace：先自动备份当前 + 清空；之后按"全量 import"语义处理（不再区分 currentAliases）。
  if (parsed.mode === 'replace') {
    try {
      autoBakCurrentRegistry()
    } catch (e) {
      console.error(error(`自动备份当前 registry 失败: ${(e as Error).message}`))
      process.exit(2)
    }
    // 重新读：现在 current 是空的。
    // 不重读，直接用 currentAliases = new Set() 即可。
    currentAliases.clear()
  }

  let imported = 0, skipped = 0, failed = 0
  for (const it of manifest.items) {
    const exists = currentAliases.has(it.alias)

    if (exists && parsed.mode === 'skip') {
      skipped++
      continue
    }

    // merge/replace 模式下不论是否存在都按"导入/覆盖"处理：先 remove 再 add。
    if (exists && parsed.mode !== 'skip') {
      removeItem(it.alias)
    }

    let exec = it.exec
    let source = it.source

    // 处理本地源解压与 exec/source 重写。
    if (it.execLocal && it.bundledAs) {
      try {
        const rewritten = extractLocalSource(zip, it.alias, it.bundledAs)
        exec = rewritten.exec
        source = rewritten.source
      } catch (e) {
        console.error(warning(`${it.alias}: 本地源解压失败 ${(e as Error).message}`))
        failed++
        continue
      }
    } else if (it.execLocal && !it.bundledAs) {
      // zip 没带本地源，但 exec 指向本地文件——新机器必然失效。
      // 不写入坏 exec；记 failed 并提示用户跑 check。
      console.error(warning(`${it.alias}: zip 未包含本地源；exec=${exec} 在新机器可能失效`))
      failed++
      continue
    }

    addItem({
      kind: it.kind,
      source,
      alias: it.alias,
      desc: it.desc || '',
      exec,
      args: it.args,
      createdAt: it.createdAt || new Date().toISOString(),
      sourceVerifiedAt: it.sourceVerifiedAt || new Date().toISOString(),
    })
    imported++
  }

  // ensureRegistryDir 在 addItem → writeRegistry 已调；这里再调一次是 no-op，
  // 保留为显式契约：restore 结束时 registry 父目录必然存在。
  ensureRegistryDir()

  console.log(success(`restore 完成: imported=${imported} skipped=${skipped} failed=${failed} mode=${parsed.mode}`))
  if (failed > 0) {
    console.log(warning('失败的项通常是本地源缺失；运行 jc mgr check <alias> 或 jc mgr add <alias> ... 修复'))
  }
}

export const commandDef = {
  name: 'restore',
  description: '从 zip 还原 registry（默认 skip；--merge 覆盖 / --replace 清空重建）',
  handler,
  examples: [
    'jc mgr restore backup.zip',
    'jc mgr restore backup.zip --dry-run',
    'jc mgr restore backup.zip --merge',
    'jc mgr restore backup.zip --replace',
  ],
  related: ['jc mgr backup', 'jc mgr import'],
}