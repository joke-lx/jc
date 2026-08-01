// src/shared/registry/handlers/py.ts
// PyItemHandler：处理 `jc mgr add py <url-or-path> --alias <bin>` 形式的注册。
// 区分 URL（HEAD 探测）与本地路径（fs.access）两条分支。
import { access, constants } from 'fs'
import { resolve } from 'path'
import { ItemHandler } from './base.js'
import type { RegistryItemKind } from '../types.js'

export class PyItemHandler extends ItemHandler {
  readonly kind: RegistryItemKind = 'py'

  async validate(item: {
    kind: RegistryItemKind; source: string; alias: string; desc: string;
  }): Promise<{ ok: true; exec: string } | { ok: false; reason: string }> {
    // URL 分支：HEAD 请求确认可达即可，v1 不预下载脚本到本地。
    // AbortSignal.timeout(5s) 防止慢/挂起服务器把 add 阻塞住。
    // exec 故意保留 URL：run 时 shell 会下载并执行；这与"不预下载"的设计一致，
    // 也意味着 run 会有网络延迟——是 v1 的简化。
    if (/^https?:\/\//.test(item.source)) {
      try {
        const res = await fetch(item.source, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (!res.ok) return { ok: false, reason: `HEAD ${item.source} -> ${res.status}` }
        return { ok: true, exec: `python ${item.source}` }
      } catch (e) {
        return { ok: false, reason: `HEAD ${item.source} failed: ${(e as Error).message}` }
      }
    }
    // 本地分支：resolve 拿到绝对路径，让 exec 在不同 cwd 下都能稳定工作。
    // access R_OK 确认可读；失败时 Promise reject 抛出，由调用方（add/check）捕获。
    const p = resolve(item.source)
    await new Promise<void>((resolveP, rejectP) => access(p, constants.R_OK, (err: NodeJS.ErrnoException | null) => err ? rejectP(err) : resolveP()))
    return { ok: true, exec: `python ${p}` }
  }
}
