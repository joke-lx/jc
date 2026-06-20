import si from 'systeminformation'

export interface CpuInfo {
  manufacturer: string
  brand: string
  physicalCores: number
  logicalCores: number
  speedGHz: number
  loadPercent: number
}

export interface CpuManager {
  getInfo(): Promise<CpuInfo>
}

export class SystemCpuManager implements CpuManager {
  async getInfo(): Promise<CpuInfo> {
    const [cpu, load] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
    ])
    return {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      physicalCores: cpu.physicalCores,
      logicalCores: cpu.cores,
      speedGHz: cpu.speed,
      loadPercent: Math.round(load.currentLoad * 10) / 10,
    }
  }
}
