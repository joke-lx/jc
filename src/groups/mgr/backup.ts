// src/groups/mgr/backup.ts
// 把当前 registry 打包成 zip；可选 --include-local 把 exec 指向的本机文件一并塞进去。
//
// 设计原则：
// 1. 不联网。纯本地 IO。
// 2. 本地源必须 opt-in（--include-local）且默认走交互确认（CI 用 --yes 跳过）。
//    避免不知不觉把私人 exe / 脚本拷进 zip（用户刚强调过隐私）。
// 3. zip 内必须有 manifest.json：用户从 zip 内容里就能审计"什么文件被拷了"。
// 4. 错误：zip 路径不存在父目录 / 写失败 / 文件不存在 → exit 2。
import { createInterface } from 'readline'
import { cliText } from '../../cli/output.js'
import { existsSync, statSync } from 'fs'
import { dirname } from 'path'
import { error, success, warning } from '../../cli/output.js'
import { readRegistry } from '../../shared/registry/store.js'
import { buildManifest } from '../../shared/backup/manifest.js'
import { createZip, writeZip, toZipPath } from '../../shared/backup/zip.js'
import type { ManifestItem } from '../../shared/backup/manifest.js'

const PKG_VERSION = '0.2.0'

interface ParsedArgs {
  zipPath: string
  includeLocal: boolean
  yes: boolean
}

function parseArgs(args: string[]): ParsedArgs | null {
  let zipPath = ''
  let includeLocal = false
  let yes = false
  for (const a of args) {
    if (a === '--include-local') includeLocal = true
    else if (a === '--yes' || a === '-y') yes = true
    else if (!zipPath) zipPath = a
  }
  if (!zipPath) return null
  return { zipPath, includeLocal, yes }
}

// 把 exec 字符串里"实际指向的本机文件"拆出来。
// 复用 base.ts localPath 的同一规则：python <path> 取第二个 token，否则第一个。
// 不引 base.ts 的 protected 方法：跨类继承耦合，反而难测。
function localPathOf(exec: string): string {
  const tokens = exec.split(/\s+/)
  return tokens[0] === 'python' && tokens[1] ? tokens[1] : tokens[0]
}

// 询问用户 y/N。默认 N（拒绝），符合"严格 opt-in"原则。
function askYesNo(question: string): Promise<boolean> {
  return new Promise<boolean>((resolveP) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close()
      resolveP(answer.trim().toLowerCase() === 'y')
    })
  })
}
import { Command } from '../../cli/Command.js'

async function executeBackup(args: string[]): Promise<void> {

  const parsed = parseArgs(args)
  if (!parsed) {
    console.error(error(cliText('用法: jc mgr backup <path.zip> [--include-local] [--yes]')))
    process.exit(1)
  }

  // 父目录必须存在且可写；不自动 mkdir（避免静默在错的地方落盘）。
  const parent = dirname(parsed.zipPath)
  if (!existsSync(parent)) {
    console.error(error(`目录不存在: ${parent}`))
    process.exit(2)
  }

  const file = readRegistry()
  const zip = createZip()
  const bundledMap = new Map<string, string>()

  // 先填 manifest 的占位（bundledMap 空）；下面扫到本地源后再补。
  // 这一步只是为了让 zip 里有 entries，bundledMap 的真实填充在循环里。
  if (parsed.includeLocal) {
    // 收集本地源候选清单（exec 是本地路径且文件实际存在）。
    const candidates: { alias: string; abs: string }[] = []
    for (const item of file.items) {
      if (item.kind !== 'exe' && item.kind !== 'py') continue
      const p = localPathOf(item.exec)
      if (!existsSync(p)) {
        console.error(warning(`${item.alias}: 跳过本地源（不存在: ${p}）`))
        continue
      }
      try {
        if (!statSync(p).isFile()) {
          console.error(warning(`${item.alias}: 跳过本地源（不是普通文件: ${p}）`))
          continue
        }
      } catch {
        continue
      }
      candidates.push({ alias: item.alias, abs: p })
    }

    if (candidates.length > 0) {
      console.log('将拷贝以下本地源到 zip:')
      for (const c of candidates) console.log(`  - ${c.alias}: ${c.abs}`)
      if (!parsed.yes) {
        const ok = await askYesNo('Proceed?')
        if (!ok) {
          console.error(error('已取消（未写入 zip）'))
          process.exit(1)
        }
      }
      for (const c of candidates) {
        const basename = c.abs.split(/[\\/]/).pop() || 'file'
        const zipEntryPath = `sources/${c.alias}/${basename}`
        zip.addLocalFile(c.abs, `sources/${c.alias}`)
        bundledMap.set(c.alias, zipEntryPath)
      }
    }
  }

  // 写 registry.json 到 zip（直接序列化当前文件，去掉运行时字段的多余处理）。
  zip.addFile(
    'registry.json',
    Buffer.from(JSON.stringify(file, null, 2), 'utf-8'),
  )

  const manifest = buildManifest(file, bundledMap, PKG_VERSION)
  zip.addFile(
    'manifest.json',
    Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'),
  )

  // 强制 zip 内路径统一为正斜杠（adm-zip 在 Windows 上可能保留反斜杠）
  // —— 这里 addFile 已经用 forward slashes；toZipPath 仅在元数据写入时起作用，
  // 但保留它以备 manifest 里 bundledAs 的展示统一。
  for (const it of manifest.items) {
    if (it.bundledAs) it.bundledAs = toZipPath(it.bundledAs)
  }
  // 重写一次 manifest 让 bundledAs 归一化。
  zip.updateFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))

  try {
    writeZip(zip, parsed.zipPath)
  } catch (e) {
    console.error(error(`写入 zip 失败: ${(e as Error).message}`))
    process.exit(2)
  }

  const localCount = manifest.items.filter((i: ManifestItem) => i.bundledAs).length
  console.log(success(`已备份: ${parsed.zipPath}（${manifest.items.length} 项，本地源 ${localCount} 个）`))

}

export class BackupCommand extends Command {
  name = "backup"
  description = "将当前 registry 打包成 zip（可选包含本地源）"
  examples = [`${this.bin} mgr backup backup.zip`, `${this.bin} mgr backup backup.zip --include-local`, `${this.bin} mgr backup backup.zip --include-local --yes`]
  related = [`${this.bin} mgr restore`, `${this.bin} mgr export`]

  async handler(args: string[]): Promise<void> {
    return executeBackup(args)
  }
}

export const commandDef = new BackupCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
