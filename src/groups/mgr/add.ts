import { Command } from '../../cli/Command.js'
import { cliText } from '../../cli/output.js'
import { error } from '../../cli/output.js'
import { isInteractive, prompt, NoTTYError } from '../../shared/registry/prompt.js'
import { addItem, getItem } from '../../shared/registry/store.js'
import { ALIAS_RE, type RegistryItemKind } from '../../shared/registry/types.js'
import { validateSource } from '../../shared/registry/validate.js'
import { spawnSync } from 'child_process'

// src/groups/mgr/add.ts

const VALID_KINDS: RegistryItemKind[] = ['npm', 'py', 'exe']

interface ParsedArgs {
  kind?: RegistryItemKind
  source?: string
  alias?: string
  desc: string
  // --install 模式：用 installCmd 安装工具，binName 是安装后要定位的可执行名。
  // 这两个字段与 source 互斥：source 用于"已存在的本地路径/包名/URL"，
  // installCmd 用于"通过 shell 命令安装后再注册"。
  install?: string
  bin?: string
}

function parseArgs(args: string[]): ParsedArgs {
  let kind: RegistryItemKind | undefined
  let source: string | undefined
  let alias: string | undefined
  let desc = ''
  let install: string | undefined
  let bin: string | undefined
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--alias') { alias = args[++i] }
    else if (a === '--desc') { desc = args[++i] ?? '' }
    else if (a === '--install') { install = args[++i] }
    else if (a === '--bin') { bin = args[++i] }
    else if (!kind) {
      if (!VALID_KINDS.includes(a as RegistryItemKind)) {
        console.error(error(`未知类型: ${a}`))
        process.exit(1)
      }
      kind = a as RegistryItemKind
    } else if (!source) { source = a }
  }
  return { kind, source, alias, desc, install, bin }
}

// 交互式收集缺失字段。
// 流程：先确认模式（install / 常规）→ 走对应分支收集必填项。
// 这样保证了常规模式（kind→source→alias→desc）顺序不变，老测试和旧命令行习惯不被打破。
async function collectInteractive(current: ParsedArgs): Promise<Required<ParsedArgs>> {
  let kind = current.kind
  let source = current.source
  let alias = current.alias
  let desc = current.desc
  let install = current.install
  let bin = current.bin

  if (!kind) {
    while (true) {
      const ans = await prompt('kind? [npm/py/exe]: ')
      if (VALID_KINDS.includes(ans as RegistryItemKind)) { kind = ans as RegistryItemKind; break }
      console.log(`无效 kind: ${ans || '(空)'}`)
    }
  }

  // 进入交互时，若已有 install 则走 install 分支；否则让用户选模式。
  // 已给 source 也走常规分支（不需要问模式）。
  let useInstall = !!install
  if (!install && !source) {
    const ans = await prompt('使用 --install 模式? (先跑安装命令再注册) [y/N]: ')
    useInstall = ans.toLowerCase() === 'y'
    if (useInstall) install = ''
  }

  if (useInstall) {
    if (!install) install = await prompt('安装命令? (如: uv tool install <pkg>): ')
    if (!bin) bin = await prompt('bin 名? (安装后要定位的可执行名): ')
  } else {
    if (!source) source = await prompt('source? (npm 包名 / URL / 本地路径): ')
  }

  if (!alias) {
    while (true) {
      const ans = await prompt('alias? (^[a-z0-9][a-z0-9_-]{0,31}$): ')
      if (ALIAS_RE.test(ans)) { alias = ans.toLowerCase(); break }
      console.log(`非法 alias: ${ans || '(空)'}`)
    }
  }
  if (!desc) {
    desc = await prompt('desc? (空跳过): ')
  }
  return {
    kind: kind!, source: source || '', alias: alias!, desc,
    install: install || '', bin: bin || '',
  }
}

// --install 模式：跑 installCmd，从 PATH 找到 bin 的绝对路径。
// 任何一步失败都不写 registry，让用户能 retry。
function installAndLocate(installCmd: string, binName: string): { ok: true; exec: string } | { ok: false; reason: string } {
  console.log(`运行: ${installCmd}`)
  const r = spawnSync(installCmd, { shell: true, stdio: 'inherit' })
  if (r.status !== 0) {
    return { ok: false, reason: `install 失败: exit ${r.status}` }
  }
  // Windows 用 where，Unix 用 which。
  const finder = process.platform === 'win32' ? 'where' : 'which'
  const w = spawnSync(finder, [binName], { shell: true })
  const out = w.stdout.toString().trim().split(/\r?\n/).filter(Boolean)
  if (out.length === 0) {
    return { ok: false, reason: `未在 PATH 中找到 ${binName}（检查安装是否成功，或 PATH 是否需要重开终端）` }
  }
  // 取第一个匹配路径。多版本共存时第一个通常是最新安装的。
  const exec = out[0]!
  return { ok: true, exec }
}

async function executeAdd(args: string[]): Promise<void> {

  let parsed = parseArgs(args)
  // 缺参检测：常规模式要 kind+source+alias；install 模式要 kind+install+bin+alias。
  const incomplete = parsed.install
    ? (!parsed.kind || !parsed.install || !parsed.bin || !parsed.alias)
    : (!parsed.kind || !parsed.source || !parsed.alias)
  // --install 与 --alias / --bin 冲突的检测（不能既给 source 又给 install）。
  if (parsed.install && parsed.source) {
    console.error(error('--install 与 source 互斥：要么传 source，要么传 --install + --bin'))
    process.exit(1)
  }
  if (parsed.install && !parsed.bin) {
    console.error(error('--install 必须配合 --bin <name>'))
    process.exit(1)
  }

  if (incomplete) {
    if (!isInteractive()) {
      console.error(error(cliText('用法: jc mgr add <npm|py|exe> <source> --alias <alias> [--desc <desc>]')))
      console.error(error('      jc mgr add <npm|py|exe> --install "<cmd>" --bin <name> --alias <alias>'))
      console.error(error('提示: 缺少参数且当前为非交互模式。'))
      process.exit(1)
    }
    try {
      parsed = await collectInteractive(parsed)
    } catch (e) {
      if (e instanceof NoTTYError) {
        console.error(error(e.message))
        process.exit(2)
      }
      throw e
    }
  }

  const { kind, source, alias, desc, install, bin } = parsed
  if (!kind || !alias) {
    console.error(error(cliText('用法: jc mgr add <npm|py|exe> <source> --alias <alias>')))
    process.exit(1)
  }
  if (!ALIAS_RE.test(alias)) { console.error(error(`alias 非法: ${alias}`)); process.exit(1) }
  const normalizedAlias = alias.toLowerCase()
  if (getItem(normalizedAlias)) { console.error(error(`alias 已存在: ${normalizedAlias}`)); process.exit(2) }

  let exec: string
  let finalSource: string
  if (install && bin) {
    // --install 模式：跑 install cmd + which 找 bin。
    const r = installAndLocate(install, bin)
    if (!r.ok) { console.error(error(r.reason)); process.exit(2) }
    exec = r.exec
    // source 保存 install cmd 便于将来 audit / restore 重建。
    finalSource = install
  } else {
    if (!source) {
      console.error(error(cliText('用法: jc mgr add <npm|py|exe> <source> --alias <alias>')))
      process.exit(1)
    }
    const v = await validateSource({ kind, source, alias: normalizedAlias, desc })
    if (!v.ok) { console.error(error(v.reason)); process.exit(2) }
    exec = v.exec
    finalSource = source
  }

  const now = new Date().toISOString()
  addItem({ kind, source: finalSource, alias: normalizedAlias, desc, exec, createdAt: now, sourceVerifiedAt: now })
  console.log(`已注册: ${normalizedAlias} -> ${exec}`)

}

export class AddCommand extends Command {
  name = "add"
  description = "注册一个 npm 包 / Python 脚本 / EXE 到统一管理器（支持 --install 模式）"
  examples = [`${this.bin} mgr add npm typescript --alias tsc`, `${this.bin} mgr add py --install "uv tool install <pkg>" --bin <exec> --alias <alias>`, `${this.bin} mgr add npm --install "npm install -g <pkg>" --bin <exec> --alias <alias>`, `${this.bin} mgr add   # TTY 下逐步问`]
  related = [`${this.bin} mgr list`, `${this.bin} mgr run`]

  async handler(args: string[]): Promise<void> {
    return executeAdd(args)
  }
}

export const commandDef = new AddCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
