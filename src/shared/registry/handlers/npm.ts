// src/shared/registry/handlers/npm.ts
// NpmItemHandler：处理 `jc mgr add npm <pkg> --alias <bin>` 形式的注册。
// 走 npm registry 验证 + 生成 npx 调用串。
import { spawnSync } from 'child_process'
import { ItemHandler, type PreflightResult } from './base.js'
import type { RegistryItem, RegistryItemKind } from '../types.js'

export class NpmItemHandler extends ItemHandler {
  readonly kind: RegistryItemKind = 'npm'

  async validate(item: {
    kind: RegistryItemKind; source: string; alias: string; desc: string;
  }): Promise<{ ok: true; exec: string } | { ok: false; reason: string }> {
    // 解析 <pkg>[@<ver>]：第一组捕获包名（支持 @scope/name 与 name 两种），可选 @ver 段忽略。
    // 拒绝带空格的 source（npm 包名规则本就不含空格）。
    const m = item.source.match(/^(@?[^@/]+(?:\/[^@/]+)?)(?:@.+)?$/)
    if (!m) return { ok: false, reason: `invalid npm source: ${item.source}` }
    const pkg = m[1]
    // 用 item.alias 当 bin，而非 pkg.split('/').pop()。
    // 设计动机：用户给 `add npm typescript --alias tsc` 时，期望 `jc mgr run tsc` 调 tsc；
    // typescript 包的 bin 恰好叫 tsc，所以两者一致；但若用户给一个 bin 不同的包
    // （如 `add npm @angular/cli --alias ng`），alias 才是 user-facing 的命令名。
    const bin = item.alias
    // 同步 spawnSync：add 是用户主动行为，等 10s 网络可接受。
    // 10s 超时保护：npm view 在不可达 registry 上会无限挂起。
    const r = spawnSync('npm', ['view', pkg, 'version'], { timeout: 10000 })
    if (r.status !== 0) return { ok: false, reason: `npm view ${pkg} failed` }
    // 用 -p 锁包：避免 npx 的"interactive prompt to install"歧义。
    return { ok: true, exec: `npx -p ${pkg} ${bin}` }
  }

  // 覆盖默认 preflight：npm 项的"源"是 registry，无本地路径可检查。
  // npx 自己会处理远程包缺失（如包被 unpublish）→ spawn ENOENT 已足够提示。
  async preflight(_item: RegistryItem): Promise<PreflightResult> {
    return { ok: true }
  }
}
