// src/groups/mgr/run.ts
// mgr 组的 `run` 命令 handler：按 alias 查找 → preflight 源检查 → handler.run 真正执行。
// 不再做本地的 spawn / tokenization（已迁到 src/shared/registry/handlers/base.ts 的 ItemHandler.run）。
// 本文件的失败路径走 console.error(error(...)) + process.exit(2)，保持 jc 整体退出码契约（0/1/2/3）。
import { error } from '../../cli/output.js'
import { getItem } from '../../shared/registry/store.js'
import { getHandler } from '../../shared/registry/handlers/index.js'

export async function handler(args: string[]): Promise<void> {
  // 解析 argv：argv[0] 是 alias，rest 透传给 handler.run。
  // alias 用小写查：registry 永远存小写（ALIAS_RE 限制 + add.ts 强制 toLowerCase），
  // 这里再 toLowerCase 一次容错用户输入大写。
  const [alias, ...rest] = args
  // 用法错误：argv 为空。退出 1（与 router 对未知 group / 未知 cmd 的处理一致）。
  if (!alias) { console.error(error('用法: jc mgr run <alias> [args...]')); process.exit(1) }
  const item = getItem(alias.toLowerCase())
  // 找不到 alias：退出 2（属于"执行/查找失败"）。
  if (!item) { console.error(error(`未找到 alias: ${alias}`)); process.exit(2) }
  // 通过工厂拿 handler：从此处开始所有 kind 差异都收敛到 handler 内部。
  const h = getHandler(item.kind)
  // preflight：先做轻量源存在性检查，失败时给出明确提示。
  // 不重跑 validate（不联网、不重跑 npm view），这是性能/语义上的 trade-off：
  // preflight 失败只能说明"源当前不可达"，不代表"源原本就不可用"。
  const pre = await h.preflight(item)
  if (!pre.ok) { console.error(error(`${item.alias}: ${pre.reason}（请运行 jc mgr check ${item.alias} 修复）`)); process.exit(2) }
  // 真正执行：把 user args 透传给 handler.run。
  // handler 内部 spawn + shell:true + windowsHide:true 已在 base.ts 集中处理。
  try {
    await h.run(item, rest)
  } catch (e) {
    // spawn 失败（非 0 退出 / error 事件）：catch 统一报 exit 2。
    // 这里不区分"用户程序返回非 0"与"jc 自身失败"——用户级错误统一由 handler 的
    // spawn 'close' 事件转 reject 出来；jc 自身错误（极少见）也走这里。
    console.error(error((e as Error).message || String(e)))
    process.exit(2)
  }
}

export const commandDef = {
  name: 'run',
  description: '按别名执行已注册的项',
  handler,
  // 示例只列 npm 类；exe/py 的 `<alias> [args...]` 用法相同但 paths 含义不同。
  // 完整示例见各 handler 的 preflight/validate 行为。
  examples: ['jc mgr run tsc --version'],
  related: ['jc mgr add', 'jc mgr list'],
}