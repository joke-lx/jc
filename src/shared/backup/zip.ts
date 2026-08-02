// src/shared/backup/zip.ts
// 薄包装 adm-zip：把所有 zip 读写收敛到这里，将来想换底层库只动这一个文件。
//
// 为什么需要包装层：
// 1. adm-zip 的 API 是同步的（读 / 写都是阻塞 IO），对 <10MB 的配置级 zip 完全够用。
//    不引入 async I/O 反而让 backup/restore 的错误处理更直白（try/catch 即边界）。
// 2. 把 path 规范化（forward slashes）收敛在写入端，restore 时统一用 bundledAs 做 key。
// 3. type-only 引用避免给测试强加 adm-zip 类型（如果哪天换库）。
import AdmZip from 'adm-zip'
import { readFileSync, existsSync } from 'fs'

/** 把 exec/source 里的 Windows 反斜杠归一为正斜杠，存到 zip 内。 */
export function toZipPath(p: string): string {
  return p.replace(/\\/g, '/')
}

/** 从 zip 里读出 utf-8 文本条目。缺失抛错。 */
export function readTextEntry(zip: AdmZip, name: string): string {
  const entry = zip.getEntry(name)
  if (!entry) throw new Error(`zip 缺少条目: ${name}`)
  return entry.getData().toString('utf-8')
}

/** zip 内是否存在某条目（路径用 zip 内正斜杠形式）。 */
export function hasEntry(zip: AdmZip, name: string): boolean {
  return zip.getEntry(name) !== null
}

/** 把 zip 落到磁盘并返回实例；用于写入流程。 */
export function createZip(): AdmZip {
  return new AdmZip()
}

/** 从磁盘路径加载 zip。文件不存在抛错（让调用方决定怎么报）。 */
export function openZip(zipPath: string): AdmZip {
  if (!existsSync(zipPath)) throw new Error(`zip 不存在: ${zipPath}`)
  // sync 读：zip 是配置级小文件，<10MB 量级，没必要走 stream。
  return new AdmZip(readFileSync(zipPath))
}

/** 把 zip 写到磁盘。 */
export function writeZip(zip: AdmZip, zipPath: string): void {
  zip.writeZip(zipPath)
}