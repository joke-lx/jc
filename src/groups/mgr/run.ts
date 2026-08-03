// src/groups/mgr/run.ts
// mgr 组的 `run` 命令 handler：按 alias 查找 → preflight 源检查 → handler.run 真正执行。
// 不再做本地的 spawn / tokenization（已迁到 src/shared/registry/handlers/base.ts 的 ItemHandler.run）。
// 本文件的失败路径走 console.error(error(...)) + process.exit(2)，保持 jc 整体退出码契约（0/1/2/3）。
import { error } from '../../cli/output.js'
import { cliText } from '../../cli/output.js'
import { getItem, listItems } from '../../shared/registry/store.js'
import { getHandler } from '../../shared/registry/handlers/index.js'
import { isInteractive, prompt, NoTTYError } from '../../shared/registry/prompt.js'
import { Command } from '../../cli/Command.js'

async function executeRun(args: string[]): Promise<void> {

  let [alias, ...rest] = args

  // argv 为空 或 alias 不在 registry → 交互选 alias。
  if (!alias || !getItem(alias.toLowerCase())) {
    if (!isInteractive()) {
      console.error(error(cliText('用法: jc mgr run <alias> [args...]')))
      if (alias && !getItem(alias.toLowerCase())) {
        console.error(error(`未找到 alias: ${alias}`))
      } else {
        console.error(error('提示: 缺 alias 且当前为非交互模式。请提供 alias 或加 --yes 后跟值。'))
      }
      process.exit(alias ? 2 : 1)
    }
    const items = listItems()
    if (items.length === 0) {
      console.error(error('注册表为空；请先 jc mgr add'))
      process.exit(2)
    }
    console.log('可用 alias:')
    for (const it of items) console.log(`  ${it.alias}  (${it.kind})  ${it.desc}`)
    try {
      const picked = await prompt('输入 alias: ')
      if (!picked) {
        console.error(error('已取消（空输入）'))
        process.exit(1)
      }
      alias = picked
    } catch (e) {
      if (e instanceof NoTTYError) { console.error(error(e.message)); process.exit(2) }
      throw e
    }
  }

  const item = getItem(alias.toLowerCase())
  if (!item) { console.error(error(`未找到 alias: ${alias}`)); process.exit(2) }

  const h = getHandler(item.kind)
  const pre = await h.preflight(item)
  if (!pre.ok) { console.error(error(`${item.alias}: ${pre.reason}（请运行 jc mgr check ${item.alias} 修复）`)); process.exit(2) }
  try {
    await h.run(item, rest)
  } catch (e) {
    console.error(error((e as Error).message || String(e)))
    process.exit(2)
  }

}

export class RunCommand extends Command {
  name = "run"
  description = "按别名执行已注册的项（缺 alias 时交互选择）"
  examples = [`${this.bin} mgr run tsc --version`, `${this.bin} mgr run   # TTY 下选 alias`]
  related = [`${this.bin} mgr add`, `${this.bin} mgr list`]

  async handler(args: string[]): Promise<void> {
    return executeRun(args)
  }
}

export const commandDef = new RunCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
