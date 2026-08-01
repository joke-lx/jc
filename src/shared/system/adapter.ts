// src/shared/system/adapter.ts
// systeminformation 适配层（adapter layer）的工厂表。
// 唯一引入面：所有 src/groups/**/handler 文件都应该从这拿 manager，
// 不允许直接 import systeminformation。这是 jc-development skill 的硬约束（详见
// references/system-adapters.md 与 references/execution-safety-and-platforms.md）。
//
// 架构动机：
// 1) 单元测试可以 vi.mock('./adapter.js') 替换返回值，而 mock systeminformation
//    会让测试与 systeminformation 的内部形态耦合（每次升级库都要重写 fixture）。
// 2) 未来要换实现（如直接调 OS API 而非 systeminformation）只动各 *Manager.ts，
//    调用方零改动。
// 3) 当前所有平台都返回同一实现（systeminformation 是跨平台的），但保留 "Win" 前缀
//    是历史命名——不要被名字误导，class WinProcessManager 在 Linux/macOS 也会返回。
import { WinProcessManager } from './process.js'
import type { ProcessManager, ProcessInfo, ProcessStats } from './process.js'
import { SystemNetworkManager } from './network.js'
import type { NetworkManager, NetworkInfo, WiFiInfo } from './network.js'
import { SystemCpuManager } from './cpu.js'
import type { CpuManager, CpuInfo } from './cpu.js'
import { SystemMemoryManager } from './memory.js'
import type { MemoryManager, MemoryInfo } from './memory.js'
import { SystemDiskManager } from './disk.js'
import type { DiskManager, DiskInfo } from './disk.js'
import { SystemGpuManager } from './gpu.js'
import type { GpuManager, GpuInfo } from './gpu.js'
import { SystemOsManager } from './os.js'
import type { OsManager, OsInfo } from './os.js'

// 每个 manager 一个工厂函数。延迟实例化（每次 new）确保 manager 内部无状态共享。
// 若发现某 manager 内部无状态且调用频繁，可改成模块级单例；目前不必要。
export function getProcessManager(): ProcessManager {
  // "Win" 前缀是历史命名。当前 systeminformation 在所有平台都用同一份实现，
  // 所以这里没有 if (process.platform === 'win32') 分支。
  // 未来若要为 Linux 加 netstat 解析、为 Windows 用 WMI 加速等，再在这里分。
  return new WinProcessManager()
}
export function getNetworkManager(): NetworkManager { return new SystemNetworkManager() }
export function getCpuManager(): CpuManager { return new SystemCpuManager() }
export function getMemoryManager(): MemoryManager { return new SystemMemoryManager() }
export function getDiskManager(): DiskManager { return new SystemDiskManager() }
export function getGpuManager(): GpuManager { return new SystemGpuManager() }
export function getOsManager(): OsManager { return new SystemOsManager() }

// 重导出所有 interface：调用方只 import './adapter.js' 一次就拿到所有类型。
// 避免"import manager + import type"两行的样板。
export type {
  ProcessManager, ProcessInfo, ProcessStats,
  NetworkManager, NetworkInfo, WiFiInfo,
  CpuManager, CpuInfo,
  MemoryManager, MemoryInfo,
  DiskManager, DiskInfo,
  GpuManager, GpuInfo,
  OsManager, OsInfo,
}
