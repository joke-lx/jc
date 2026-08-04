import { Command } from '../../cli/Command.js'
import { error, success, warning, cliText } from '../../cli/output.js'
import { getRegistryPath, ensureRegistryDir } from '../../shared/registry/paths.js'
import { isInteractive, prompt, NoTTYError } from '../../shared/registry/prompt.js'
import { readRegistry } from '../../shared/registry/store.js'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

// src/groups/mgr/config.ts
// 显示与初始化 registry 位置。
//
// 为什么不直接用 prompt 改"配置文件"？
// 改 JC 自己的配置文件会把"env 变量 / config 文件 / 默认平台路径"三条入口变复杂，
// 增加了回归点。本任务的需求是"用户想知道当前路径 + 在自定义位置初始化一个空 registry"，
// 不需要"运行时改默认位置"。后者交给 JC_REGISTRY_PATH env 变量即可（见 paths.ts）。

interface ParsedArgs {
  action: 'path' | 'init'
  dir?: string
}

function parseArgs(args: string[]): ParsedArgs {
  let action: 'path' | 'init' = 'path'
  let dir: string | undefined
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === 'path') action = 'path'
    else if (a === 'init') action = 'init'
    else if (a === '--dir') { dir = args[++i] }
  }
  return { action, dir }
}

// 把 ISO 时间戳变成文件名安全片段（Windows 文件名禁用 : 和 .）。
// 2026-08-03T15:30:21.123Z → 2026-08-03T15-30-21Z
function safeIsoStamp(d: Date = new Date()): string {
  return d.toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '-')
}

async function actionPath(): Promise<void> {
  // path 子命令纯展示，无需 TTY。
  const p = getRegistryPath()
  console.log(p)
  // 顺手把"为什么是这个路径"展示出来，方便用户诊断。
  if (process.env.JC_REGISTRY_PATH) {
    console.log(`(来源: JC_REGISTRY_PATH env: ${process.env.JC_REGISTRY_PATH})`)
  } else if (process.env.XDG_CONFIG_HOME) {
    console.log(`(来源: XDG_CONFIG_HOME env: ${process.env.XDG_CONFIG_HOME})`)
  } else if (process.platform === 'win32') {
    console.log(`(来源: Windows APPDATA 默认值)`)
  } else {
    console.log(`(来源: Unix ~/.config 默认值)`)
  }
  if (existsSync(p)) {
    const items = readRegistry().items.length
    console.log(`(状态: 已存在，含 ${items} 项)`)
  } else {
    console.log(`(状态: 尚未创建)`)
  }
}

async function actionInit(targetDir: string | undefined): Promise<void> {
  let dir = targetDir
  if (!dir) {
    if (!isInteractive()) {
      console.error(error(cliText('用法: {cli} mgr config init --dir <path>')))
      console.error(error('提示: 缺少 --dir 且当前为非交互模式。'))
      process.exit(1)
    }
    try {
      dir = await prompt('初始化目录（将创建 registry.json）: ')
    } catch (e) {
      if (e instanceof NoTTYError) { console.error(error(e.message)); process.exit(2) }
      throw e
    }
  }
  if (!dir) {
    console.error(error('目录不能为空'))
    process.exit(1)
  }

  // 若 dir 等于"父目录"，把 registry.json 拼上：这是用户给目录还是给文件，常有歧义。
  // 约定：dir 视为目录；最终的 registry 文件是 <dir>/registry.json。
  // 用户如果直接给了 registry.json 路径，截掉文件名再处理。
  let parent = dir
  if (parent.toLowerCase().endsWith('registry.json')) {
    parent = dirname(parent)
  }

  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true })
    console.log(`已创建目录: ${parent}`)
  }
  const target = join(parent, 'registry.json')
  if (existsSync(target)) {
    console.error(error(cliText(`已存在: ${target}（拒绝覆盖，用 {cli} mgr import 导入数据）`)))
    process.exit(2)
  }
  writeFileSync(target, JSON.stringify({ version: 1, items: [] }, null, 2) + '\n', 'utf-8')
  console.log(success(`已初始化: ${target}`))

  // 顺手建议用户在自定义位置使用时设 env 变量。
  // 注意：suggestion 仅当用户实际没用 JC_REGISTRY_PATH 时才有意义。
  if (!process.env.JC_REGISTRY_PATH && target !== getRegistryPath()) {
    console.log()
    console.log(warning('提示: 此位置与默认 registry 路径不同。'))
    console.log(cliText(`  临时使用: $env:JC_REGISTRY_PATH = "${target}"; {cli} ...`))
    console.log(`  永久生效: setx JC_REGISTRY_PATH "${target}"`)
    console.log('  （永久生效后，新 shell 才看得到；当前 shell 请用临时方式）')
  }

  // ensureRegistryDir 兼容旧调用——这里不再调，因为我们刚自己写过文件。
  // 留 ensureRegistryDir 给其他模块用即可。
  void ensureRegistryDir
}

async function executeConfig(args: string[]): Promise<void> {

  const parsed = parseArgs(args)
  if (parsed.action === 'init') {
    await actionInit(parsed.dir)
  } else {
    await actionPath()
  }

}

export class ConfigCommand extends Command {
  name = "config"
  description = "查看或初始化 registry 位置（path / init --dir <path>）"
  examples = [`${this.bin} mgr config path`, `${this.bin} mgr config init --dir D:\\dev\\my-registry`, `${this.bin} mgr config init   # TTY 下问目录`]
  related = [`${this.bin} mgr export`, `${this.bin} mgr import`]

  async handler(args: string[]): Promise<void> {
    return executeConfig(args)
  }
}

export const commandDef = new ConfigCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}

// 暴露给 export.ts 用，避免它重复实现时间戳格式化。
export { safeIsoStamp }
