// src/shared/registry/validate.ts
// 薄壳：在引入 handler 抽象层之前的旧 API 入口。
// 之所以保留：add.ts / check.ts 直接调 validateSource(item)，保持它们与
// handler 抽象层解耦——这样将来若改 handler 目录结构，只需改这一个文件。
// 设计动机见 docs/superpowers/specs/2026-07-31-jc-mgr-handlers-design.md section 5.4。
import { getHandler } from './handlers/index.js'
import type { RegistryItemKind } from './types.js'

// 公开签名稳定：参数与返回形状都是规范的一部分（spec 5.1）。
// 任何破坏性变更（参数结构 / 返回字段）需改 spec 并递增 schema version。
export async function validateSource(item: {
  kind: RegistryItemKind; source: string; alias: string; desc: string;
}): Promise<{ ok: true; exec: string } | { ok: false; reason: string }> {
  // 全部派发逻辑收敛到 handlers/ 工厂表。
  // 这里没有任何 if-else：未来加 kind 不需要改这里。
  return getHandler(item.kind).validate(item)
}
