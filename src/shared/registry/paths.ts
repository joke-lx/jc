// src/shared/registry/paths.ts
// registry 文件的物理位置解析。XDG 优先，Windows / Unix 各自有 fallback。
// 设计动机见 docs/superpowers/specs/2026-07-30-jc-mgr-design.md section 5.1。
import { mkdirSync } from 'fs'
import { join } from 'path'

// 解析 registry.json 的绝对路径。
// 优先级：XDG_CONFIG_HOME > Windows APPDATA > Unix ~/.config。
// ⚠️ 注意：当前实现是 XDG 优先（即使在 Windows 上），这与"Windows 平台走 APPDATA"的直觉相反。
// 这样设计的原因：1) XDG 是跨平台事实标准，CI 测试与 PowerShell/Git Bash 都能 export 它；
// 2) 上一轮 SDD 测试曾因 ambient XDG 渗入导致 hermeticity bug，最终采用 XDG 优先让测试更可预测。
// 未来若要做"平台严格分离"（Windows 强制 APPDATA），可改回 platform-first，但需要重新过所有测试。
export function getRegistryPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  if (xdg) return join(xdg, 'jc', 'registry.json')
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Roaming')
    return join(base, 'jc', 'registry.json')
  }
  const base = join(process.env.HOME || '', '.config')
  return join(base, 'jc', 'registry.json')
}

// 创建父目录（首次写入前调一次）。
// idempotent：mkdirSync recursive=true 重复调用不会报错。
// store.writeRegistry 也调了一次（兜底）；这里单独导出是为了让"创建但不写入"的工具型命令可用。
export function ensureRegistryDir(): void {
  const file = getRegistryPath()
  // 用字符串末尾的 registry.json 截掉，得到父目录。
  // 不直接 dirname 是因为 Node API 跨平台行为略差异（路径分隔符在 Windows 上是 \，在 POSIX 是 /）。
  const parent = file.replace(/registry\.json$/, '')
  mkdirSync(parent, { recursive: true })
}
