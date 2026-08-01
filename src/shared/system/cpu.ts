// src/shared/system/cpu.ts
// CPU 信息的 manager：把 systeminformation 的两次调用（cpu + currentLoad）合并成一次。
// 设计动机：
// 1) 调用方只想要"CPU 信息 + 当前负载"这两类数据，分开两次调用既慢又要把数据拼起来；
// 2) 用 Promise.all 并行：si.cpu() 与 si.currentLoad() 无依赖关系，可并发。
import si from 'systeminformation'

// 对外的 CPU 信息形状：调用方只用这些字段，不暴露 systeminformation 的原始形态。
// loadPercent 归一为 0-100（systeminformation 的 currentLoad 已经是这个范围）。
// 速度单位 GHz（systeminformation 已返回 GHz）。
export interface CpuInfo {
  manufacturer: string
  brand: string
  physicalCores: number
  // logicalCores 来自 cpu.cores（systeminformation 的字段名），
  // 不是 cpu.logicalCores——后者在某些 ARM/Apple 芯片上未填充。
  logicalCores: number
  speedGHz: number
  // 1 位小数归一（28.5% → 28.5）。下同 disk/memory 的归一约定。
  loadPercent: number
}

export interface CpuManager {
  getInfo(): Promise<CpuInfo>
}

export class SystemCpuManager implements CpuManager {
  async getInfo(): Promise<CpuInfo> {
    // 并发：si.cpu() 读静态 CPU 型号/核心数，si.currentLoad() 读动态负载。
    // 两次调用 ~1-2s（在低性能机器上更久），并发能省一半时间。
    const [cpu, load] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
    ])
    return {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      physicalCores: cpu.physicalCores,
      // 注意：systeminformation 的字段名是 cores（不是 logicalCores）。
      // 在 Apple Silicon 等统一内存架构上 cpu.logicalCores 可能为 0，所以用 cores 更稳。
      logicalCores: cpu.cores,
      speedGHz: cpu.speed,
      // 1 位小数：loadPercent 输出 "28.5"，比 "28.49999..." 友好。
      // 整数也常见（"28"），但单次采样误差通常 > 0.5，1 位小数更真实。
      loadPercent: Math.round(load.currentLoad * 10) / 10,
    }
  }
}
