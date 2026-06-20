import si from 'systeminformation'

export interface GpuInfo {
  model: string
  driverVersion: string
  vramGB: number
}

export interface GpuManager {
  getInfo(): Promise<GpuInfo[]>
}

export class SystemGpuManager implements GpuManager {
  async getInfo(): Promise<GpuInfo[]> {
    const graphics = await si.graphics()
    return (graphics.controllers || []).map(g => ({
      model: g.model,
      driverVersion: g.driverVersion || '',
      vramGB: Math.round((g.vram || 0) / 1024 * 10) / 10,
    }))
  }
}
