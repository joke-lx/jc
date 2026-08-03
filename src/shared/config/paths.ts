// src/shared/config/paths.ts
// CLI 自身配置（config.json）的物理位置解析。
//
// 优先级（与 registry/paths.ts 风格保持一致，但不复用 registry 路径）：
//   1. JC_CONFIG_PATH —— 用户显式指定。优先级最高的目的是支持"工作区隔离"和 CI hermeticity。
//   2. XDG_CONFIG_HOME —— 跨平台事实标准。
//   3. Windows APPDATA / Unix ~/.config —— 平台默认。
//
// 为什么不复用 registry 的解析：
// - JC_REGISTRY_PATH 允许把 registry 重定向到任意路径（含当前仓库下的 .jc 文件）。
// - 如果 CLI config 跟随 registry 路径，用户为了 CI 隔离 registry 会"顺手"把 CLI 名变成工作区级配置，
//   与"CLI 名是 shell 入口语义、属于全局"的定位冲突。
// - 因此 CLI config 是独立的：自己的 env，自己的路径，自己的默认值。
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { META } from '../meta.js'

export function getCliConfigPath(): string {
  const explicit = process.env.JC_CONFIG_PATH
  if (explicit) return explicit
  const xdg = process.env.XDG_CONFIG_HOME
  if (xdg) return join(xdg, META.dataDirName, 'config.json')
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Roaming')
    return join(base, META.dataDirName, 'config.json')
  }
  const base = join(process.env.HOME || '', '.config')
  return join(base, META.dataDirName, 'config.json')
}

// 确保 config.json 父目录存在。idempotent。
export function ensureCliConfigDir(): void {
  mkdirSync(dirname(getCliConfigPath()), { recursive: true })
}
