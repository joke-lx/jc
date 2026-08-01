// src/shared/registry/handlers/exe.ts
// ExeItemHandler：处理 `jc mgr add exe <url-or-path> --alias <bin>` 形式的注册。
// 与 PyItemHandler 几乎对称，但 exec 直接是路径（无 python 前缀）。
import { access, constants, statSync } from 'fs'
import { resolve } from 'path'
import { ItemHandler } from './base.js'
import type { RegistryItemKind } from '../types.js'

export class ExeItemHandler extends ItemHandler {
  readonly kind: RegistryItemKind = 'exe'

  async validate(item: {
    kind: RegistryItemKind; source: string; alias: string; desc: string;
  }): Promise<{ ok: true; exec: string } | { ok: false; reason: string }> {
    // URL 分支：v1 不预下载二进制到本地，exec 留 URL 让 shell 在 run 时拉取。
    // 注意：当前设计意味着 run 必须有可用 shell（curl/wget/iwr）才能执行 URL 类 exe。
    if (/^https?:\/\//.test(item.source)) {
      try {
        const res = await fetch(item.source, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (!res.ok) return { ok: false, reason: `HEAD ${item.source} -> ${res.status}` }
        return { ok: true, exec: item.source }
      } catch (e) {
        return { ok: false, reason: `HEAD ${item.source} failed: ${(e as Error).message}` }
      }
    }
    // 本地分支：resolve 拿绝对路径 + 两次校验（access + statSync.isFile）。
    // isFile 是为了把"目录"挡掉：spawn 一个目录会得到 EISDIR，提示不友好。
    // try/catch 包住 access：让它返回 ok:false 而不是抛异常到 add/check 顶层。
    const p = resolve(item.source)
    try {
      await new Promise<void>((resolveP, rejectP) => access(p, constants.R_OK, (err: NodeJS.ErrnoException | null) => err ? rejectP(err) : resolveP()))
    } catch (e) {
      return { ok: false, reason: `access ${p} failed: ${(e as Error).message}` }
    }
    if (!statSync(p).isFile()) return { ok: false, reason: `${p} is not a file` }
    return { ok: true, exec: p }
  }
}
