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

export function getProcessManager(): ProcessManager {
  // For now, use same implementation across platforms
  // Platform-specific optimizations can be added later
  return new WinProcessManager()
}
export function getNetworkManager(): NetworkManager { return new SystemNetworkManager() }
export function getCpuManager(): CpuManager { return new SystemCpuManager() }
export function getMemoryManager(): MemoryManager { return new SystemMemoryManager() }
export function getDiskManager(): DiskManager { return new SystemDiskManager() }
export function getGpuManager(): GpuManager { return new SystemGpuManager() }
export function getOsManager(): OsManager { return new SystemOsManager() }

export type {
  ProcessManager, ProcessInfo, ProcessStats,
  NetworkManager, NetworkInfo, WiFiInfo,
  CpuManager, CpuInfo,
  MemoryManager, MemoryInfo,
  DiskManager, DiskInfo,
  GpuManager, GpuInfo,
  OsManager, OsInfo,
}
