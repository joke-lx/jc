// src/shared/config/store.ts
// CLI 自身配置（config.json）的原子读写 + CLI 名查询。
//
// 不变量：
// - 文件缺失/空：返回默认 config（version=1, launchers=[]），不报错。
//   这与 registry 一致：首次跑 cname 也能直接 set。
// - 文件存在但 JSON 损坏 / version 不识别：抛明确错误。
//   静默兜底会让用户以为已配置但实际没生效，最难诊断。
// - 写入：tmp + renameSync 原子写，避免半截文件导致下次读取失败。
import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs'
import { getCliConfigPath, ensureCliConfigDir } from './paths.js'
import {
  CLI_CONFIG_VERSION,
  CLI_NAME_RE,
  DEFAULT_CLI_NAME,
  type CliConfigFile,
  type CliNameInfo,
  type LauncherEntry,
} from './types.js'

function emptyConfig(): CliConfigFile {
  return { version: CLI_CONFIG_VERSION, launchers: [] }
}

// 形状校验：version 必须等于 CLI_CONFIG_VERSION；cliName 可选但必须满足 CLI_NAME_RE。
// launchers 数组若存在必须为数组（即使为空）；paths 必须为字符串数组。
function isValidConfig(obj: unknown): obj is CliConfigFile {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (o.version !== CLI_CONFIG_VERSION) return false
  if (o.cliName !== undefined) {
    if (typeof o.cliName !== 'string') return false
    if (!CLI_NAME_RE.test(o.cliName)) return false
  }
  if (o.launchers !== undefined && !Array.isArray(o.launchers)) return false
  return true
}

export function readCliConfig(): CliConfigFile {
  const path = getCliConfigPath()
  if (!existsSync(path)) return emptyConfig()
  const raw = readFileSync(path, 'utf-8')
  if (!raw.trim()) return emptyConfig()
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch (e) {
    throw new Error(`CLI config JSON 解析失败 (${path}): ${(e as Error).message}`)
  }
  if (!isValidConfig(parsed)) {
    throw new Error(`CLI config 形态错误 (${path}): version 必须为 ${String(CLI_CONFIG_VERSION)}，cliName 必须满足 ${CLI_NAME_RE}`)
  }
  return parsed
}

export function writeCliConfig(cfg: CliConfigFile): void {
  ensureCliConfigDir()
  const path = getCliConfigPath()
  const tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf-8')
  renameSync(tmp, path)
}

// 读改写闭包。同 registry/store.ts 的 withFile 一样折叠 read-modify-write。
function withConfig(mutator: (cfg: CliConfigFile) => CliConfigFile): CliConfigFile {
  const before = readCliConfig()
  const after = mutator(before)
  writeCliConfig(after)
  return after
}

// 解析当前生效的 CLI 名 + 来源。
// 优先级：JC_CLI_NAME env > config.json cliName > DEFAULT_CLI_NAME。
// env 优先级最高的设计动机：用户可以用 env 临时覆盖（脚本 / CI），不必改磁盘配置。
export function getCliNameInfo(): CliNameInfo {
  const envName = process.env.JC_CLI_NAME
  if (envName) {
    if (!CLI_NAME_RE.test(envName)) {
      throw new Error(`JC_CLI_NAME 非法: ${envName}（需满足 ${CLI_NAME_RE}）`)
    }
    return { name: envName.toLowerCase(), source: 'env' }
  }
  const cfg = readCliConfig()
  if (cfg.cliName) return { name: cfg.cliName, source: 'config' }
  return { name: DEFAULT_CLI_NAME, source: 'default' }
}

// 检查是否被 env 锁定（cname set/reset 需要拒绝以避免误导）。
export function isCliNameLockedByEnv(): boolean {
  const v = process.env.JC_CLI_NAME
  return !!v && CLI_NAME_RE.test(v)
}

export function setConfiguredCliName(name: string): void {
  const normalized = name.toLowerCase()
  if (!CLI_NAME_RE.test(normalized)) {
    throw new Error(`CLI 名非法: ${name}（需满足 ${CLI_NAME_RE}）`)
  }
  withConfig(cfg => {
    const next: CliConfigFile = {
      version: CLI_CONFIG_VERSION,
      launchers: cfg.launchers,
    }
    if (normalized !== DEFAULT_CLI_NAME) next.cliName = normalized
    return next
  })
}

export function resetConfiguredCliName(): void {
  withConfig(cfg => ({
    version: CLI_CONFIG_VERSION,
    launchers: cfg.launchers,
  }))
}

export function recordLauncher(entry: LauncherEntry): void {
  withConfig(cfg => {
    const filtered = cfg.launchers.filter(e => e.name !== entry.name)
    return {
      version: CLI_CONFIG_VERSION,
      cliName: cfg.cliName,
      launchers: [...filtered, entry],
    }
  })
}

export function removeLauncherRecord(name: string): void {
  withConfig(cfg => ({
    version: CLI_CONFIG_VERSION,
    cliName: cfg.cliName,
    launchers: cfg.launchers.filter(e => e.name !== name),
  }))
}

export function listLaunchers(): LauncherEntry[] {
  return readCliConfig().launchers
}
