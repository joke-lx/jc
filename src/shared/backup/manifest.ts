// src/shared/backup/manifest.ts
// 备份包的清单 schema。所有 backup/restore 都基于这份类型校验/产出 manifest。
//
// 设计动机：
// 1. 让用户拿到 zip 后能看到"里面到底装了什么"——尤其是本地源的绝对路径（隐私审计）。
// 2. 让 restore 跨机器时仍能区分"exec 指向远端"和"exec 指向本机文件"，决定要不要重写 exec/source。
// 3. formatVersion 让 schema 演进有明确边界：未知版本直接拒绝而非静默兜底。
import type { RegistryFile, RegistryItem } from '../registry/types.js'

export const FORMAT_VERSION = 1

export interface ManifestItem {
  alias: string
  kind: RegistryItem['kind']
  source: string
  exec: string
  args?: string[]
  desc: string
  createdAt: string
  sourceVerifiedAt: string
  /** exec 指向本机可达文件（exe/py 走本地路径）。npm / 远端 URL 一律 false。 */
  execLocal: boolean
  /** 仅 --include-local 且文件真实存在时填写；restore 时按它写回新 exec/source。 */
  bundledAs?: string
}

export interface BackupManifest {
  formatVersion: typeof FORMAT_VERSION
  jcVersion: string
  createdAt: string
  sourceHost: string
  sourceOS: NodeJS.Platform
  registryVersion: RegistryFile['version']
  items: ManifestItem[]
}

export function buildManifest(
  file: RegistryFile,
  bundledMap: Map<string, string>,
  jcVersion: string,
): BackupManifest {
  return {
    formatVersion: FORMAT_VERSION,
    jcVersion,
    createdAt: new Date().toISOString(),
    sourceHost: process.env.COMPUTERNAME || process.env.HOSTNAME || 'unknown',
    sourceOS: process.platform,
    registryVersion: file.version,
    items: file.items.map(it => {
      const bundled = bundledMap.get(it.alias)
      return {
        alias: it.alias,
        kind: it.kind,
        source: it.source,
        exec: it.exec,
        args: it.args,
        desc: it.desc,
        createdAt: it.createdAt,
        sourceVerifiedAt: it.sourceVerifiedAt,
        execLocal: it.kind === 'exe' || it.kind === 'py',
        bundledAs: bundled,
      }
    }),
  }
}

export function isManifest(obj: unknown): obj is BackupManifest {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return (
    o.formatVersion === FORMAT_VERSION &&
    o.registryVersion === 1 &&
    Array.isArray(o.items)
  )
}