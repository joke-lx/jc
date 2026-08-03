// src/groups/mgr/cname.ts
// jc 的"自我改名"——给 CLI 入口起别名（canonical name）。
//
// 与 mgr/rename.ts 的区别：
// - mgr rename 改的是注册表里"已注册工具项"的 alias（用户用 jc tool 还是 jc t）。
// - cname 改的是 jc 这个**工具自身**的入口名（用户用 jc mgr list 还是 bb mgr list）。
//
// 行为：
// - jc mgr cname                            打印当前 CLI 名 + 来源（env/config/default）
// - jc mgr cname set <name>                 校验 → 装 launcher → 写 config
// - jc mgr cname <name>                     当且仅当参数恰好 1 个时等同 set
// - jc mgr cname reset                      清 config + 卸 launcher
//
// 非 TTY 行为：与 TTY 一致（无 prompt）。cname 是 PATH 级持久变更，CI/脚本必须可调用。
import { existsSync } from 'fs'
import { error, success, warning, cliText } from '../../cli/output.js'
import {
  CLI_NAME_RE,
  DEFAULT_CLI_NAME,
  type CliNameSource,
} from '../../shared/config/types.js'
import {
  getCliNameInfo,
  isCliNameLockedByEnv,
  setConfiguredCliName,
  resetConfiguredCliName,
  recordLauncher,
  removeLauncherRecord,
  listLaunchers,
} from '../../shared/config/store.js'
import {
  detectJcBinDir,
  installLauncher,
  uninstallLauncher,
} from '../../shared/config/launcher.js'

interface ParsedArgs {
  action: 'get' | 'set' | 'reset'
  name?: string
}

function parseArgs(args: string[]): { ok: true; parsed: ParsedArgs } | { ok: false; reason: string } {
  // 无参数 → get
  if (args.length === 0) return { ok: true, parsed: { action: 'get' } }
  // 第 1 个是 'set' / 'reset'
  if (args[0] === 'reset') {
    if (args.length !== 1) return { ok: false, reason: 'reset 不接受额外参数' }
    return { ok: true, parsed: { action: 'reset' } }
  }
  if (args[0] === 'set') {
    if (args.length !== 2) return { ok: false, reason: 'set 用法: jc mgr cname set <name>' }
    return { ok: true, parsed: { action: 'set', name: args[1] } }
  }
  // 第一个 token 既不是 set 也不是 reset → 把它当作名字（单参简写）
  if (args.length > 1) {
    return { ok: false, reason: '参数过多；用法: jc mgr cname [<name>] | set <name> | reset' }
  }
  return { ok: true, parsed: { action: 'set', name: args[0] } }
}

function sourceLabel(s: CliNameSource): string {
  return s === 'env' ? 'env (JC_CLI_NAME)' : s === 'config' ? 'config' : '默认'
}

function validateName(raw: string): { ok: true; name: string } | { ok: false; reason: string } {
  const name = raw.toLowerCase()
  if (!CLI_NAME_RE.test(name)) {
    return { ok: false, reason: `名称非法: ${raw}（需满足 ${CLI_NAME_RE}）` }
  }
  return { ok: true, name }
}

async function actionGet(): Promise<void> {
  const info = getCliNameInfo()
  console.log(info.name)
  console.log(cliText(`(来源: ${sourceLabel(info.source)})`))
}

async function actionSet(rawName: string): Promise<void> {
  if (isCliNameLockedByEnv()) {
    console.error(error(cliText('当前 JC_CLI_NAME env 已设，set/reset 被禁用（避免误导）')))
    console.error(error('请先 unset JC_CLI_NAME 再修改 config'))
    process.exit(2)
  }
  const v = validateName(rawName)
  if (!v.ok) { console.error(error(v.reason)); process.exit(1) }
  const { name } = v

  // name === DEFAULT_CLI_NAME → 等同 reset
  if (name === DEFAULT_CLI_NAME) {
    return actionReset()
  }

  // 1. 找当前 jc 的 bin 目录
  const platform: 'posix' | 'win32' = process.platform === 'win32' ? 'win32' : 'posix'
  const binDir = detectJcBinDir()
  if (!binDir) {
    console.error(error('未在 PATH 中找到 jc（先确保 jc 命令可用再 cname set）'))
    process.exit(2)
  }

  // 2. 装 launcher
  //    jcPath 在 launcher install 里只用于 POSIX symlink target；Windows 模式下不被实际使用。
  const launcherJcPath = platform === 'posix' ? `${binDir}/jc` : `${binDir}\\jc.cmd`
  const r = installLauncher({ binDir, name, jcPath: launcherJcPath, platform })
  if (r.failed) {
    console.error(error(`安装 launcher 失败: ${r.failed}`))
    console.error(error(cliText('回退方案：手动加 shell alias: alias <name>=\'jc\'')))
    process.exit(2)
  }

  // 3. 写 config（这一步失败要回滚 launcher）
  try {
    setConfiguredCliName(name)
    recordLauncher({
      name,
      paths: r.installed,
      installedAt: new Date().toISOString(),
    })
  } catch (e) {
    uninstallLauncher(r.installed)
    console.error(error(`写 config 失败: ${(e as Error).message}（已回滚 launcher）`))
    process.exit(2)
  }

  console.log(success(`已设置: ${name}`))
  for (const p of r.installed) console.log(`  - ${p}`)
  console.log()
  console.log(cliText('提示: 新 shell 窗口才会看到 <name> 命令；当前 shell 请用绝对路径或重启。'))
}

async function actionReset(): Promise<void> {
  if (isCliNameLockedByEnv()) {
    console.error(error(cliText('当前 JC_CLI_NAME env 已设，set/reset 被禁用')))
    process.exit(2)
  }

  // 1. 卸所有 launchers（按 config 记录）
  const records = listLaunchers()
  for (const entry of records) {
    const r = uninstallLauncher(entry.paths)
    if (r.failed) {
      console.error(warning(`部分 launcher 清理失败: ${r.failed}`))
    }
  }

  // 2. 清 config cliName + launchers
  resetConfiguredCliName()
  for (const entry of records) {
    removeLauncherRecord(entry.name)
  }

  console.log(success(`已恢复: ${DEFAULT_CLI_NAME}`))
}
import { Command } from '../../cli/Command.js'

async function executeCname(args: string[]): Promise<void> {

  const r = parseArgs(args)
  if (!r.ok) {
    console.error(error(cliText(`用法: jc mgr cname [<name>] | set <name> | reset`)))
    console.error(error(r.reason))
    process.exit(1)
  }
  const { action, name } = r.parsed
  if (action === 'get') await actionGet()
  else if (action === 'set') await actionSet(name!)
  else await actionReset()

}

export class CnameCommand extends Command {
  name = "cname"
  description = "查看或设置 jc 命令的别名（如 bb）"
  examples = [`${this.bin} mgr cname`, `${this.bin} mgr cname bb`, `${this.bin} mgr cname set bb`, `${this.bin} mgr cname reset`]
  related = [`${this.bin} mgr config`]

  async handler(args: string[]): Promise<void> {
    return executeCname(args)
  }
}

export const commandDef = new CnameCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
