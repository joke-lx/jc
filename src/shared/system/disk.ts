import si from 'systeminformation'

export interface DiskInfo {
  drive: string
  sizeGB: number
  usedGB: number
  freeGB: number
  percentUsed: number
  filesystem: string
}

export interface DiskManager {
  getInfo(): Promise<DiskInfo[]>
  getFullInfo(): Promise<DiskInfo[]>
  getSize(path: string): Promise<{ sizeMB: number }>
}

export class SystemDiskManager implements DiskManager {
  async getInfo(): Promise<DiskInfo[]> {
    const fs = await si.fsSize()
    return fs.filter(f => f.mount).map(f => ({
      drive: f.mount,
      sizeGB: Math.round(f.size / (1024 * 1024 * 1024)),
      usedGB: Math.round(f.used / (1024 * 1024 * 1024)),
      freeGB: Math.round((f.size - f.used) / (1024 * 1024 * 1024)),
      percentUsed: Math.round(f.use * 10) / 10,
      filesystem: f.fs || '',
    }))
  }

  async getFullInfo(): Promise<DiskInfo[]> {
    return this.getInfo()
  }

  async getSize(path: string): Promise<{ sizeMB: number }> {
    const fs = await si.fsSize(path)
    const total = fs.reduce((acc, f) => acc + f.size, 0)
    return { sizeMB: Math.round(total / (1024 * 1024)) }
  }
}
