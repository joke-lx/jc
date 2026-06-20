import si from 'systeminformation'

export interface MemoryInfo {
  totalGB: number
  freeGB: number
  usedGB: number
  percentUsed: number
  swapTotalGB: number
  swapUsedGB: number
}

export interface MemoryManager {
  getInfo(): Promise<MemoryInfo>
}

export class SystemMemoryManager implements MemoryManager {
  async getInfo(): Promise<MemoryInfo> {
    const mem = await si.mem()
    return {
      totalGB: Math.round(mem.total / (1024 * 1024 * 1024) * 10) / 10,
      freeGB: Math.round(mem.free / (1024 * 1024 * 1024) * 10) / 10,
      usedGB: Math.round(mem.used / (1024 * 1024 * 1024) * 10) / 10,
      percentUsed: Math.round(mem.used / mem.total * 100 * 10) / 10,
      swapTotalGB: Math.round(mem.swaptotal / (1024 * 1024 * 1024) * 10) / 10,
      swapUsedGB: Math.round(mem.swapused / (1024 * 1024 * 1024) * 10) / 10,
    }
  }
}
