// src/shared/config/types.ts
// CLI 自身配置（cliName / launcher 元数据）的 schema 与校验常量。
//
// 与 src/shared/registry/types.ts 的区别：
// - RegistryFile 存"用户注册的工具项"；本文件存"工具自身的设置"。
// - 故意分离：避免 export/import/backup/restore 把 CLI 设置误当 item 字段处理。
import { META } from '../meta.js'

export const CLI_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/
// 默认 CLI 名。当 JC_CLI_NAME 未设、config.json 缺失或损坏时使用。
// 选 'jc' 是历史原因：包名 bin、文档、shell 调用习惯都建在它上面。
// 实际值来自 src/shared/meta.ts，统一在那一处定义。
export const DEFAULT_CLI_NAME = META.binaryName
// 当前 schema 版本。任何破坏性变更需递增，并在 store 中校验。
export const CLI_CONFIG_VERSION = 1 as const

// 已安装的 launcher 元数据。reset 时按这个清单清理；marker 用于"是否 jc 创建"判断。
export interface LauncherEntry {
  // 用户设置的 CLI 别名（小写）。与 jc 命令本身区分（jc 不进 launchers）。
  name: string
  // 绝对路径数组（一个别名可能产生 .cmd / .ps1 / 无扩展名 shim 多文件）。
  paths: string[]
  // 安装时间（ISO 8601）。仅用于审计，不参与逻辑。
  installedAt: string
}

export interface CliConfigFile {
  version: typeof CLI_CONFIG_VERSION
  // 可选：用户在 config.json 里设的 CLI 别名。env (JC_CLI_NAME) 优先级更高。
  cliName?: string
  // 已安装的 launcher 记录。reset 时按此清单删除。
  launchers: LauncherEntry[]
}

export type CliNameSource = 'env' | 'config' | 'default'

export interface CliNameInfo {
  name: string
  source: CliNameSource
}
