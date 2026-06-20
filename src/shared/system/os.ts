import si from 'systeminformation'

export interface OsInfo {
  hostname: string
  platform: string
  distro: string
  release: string
  kernel: string
  uptime: number  // seconds
  biosVendor: string
  biosVersion: string
  biosDate: string
}

export interface OsManager {
  getInfo(): Promise<OsInfo>
  getHostname(): Promise<string>
  getUptime(): Promise<string>
}

export class SystemOsManager implements OsManager {
  async getInfo(): Promise<OsInfo> {
    const [os, bios, time] = await Promise.all([
      si.osInfo(),
      si.bios(),
      si.time(),
    ])
    return {
      hostname: os.hostname,
      platform: os.platform,
      distro: os.distro,
      release: os.release,
      kernel: os.kernel,
      uptime: time.uptime,
      biosVendor: bios.vendor || '',
      biosVersion: bios.version || '',
      biosDate: bios.releaseDate || '',
    }
  }

  async getHostname(): Promise<string> {
    return (await si.osInfo()).hostname
  }

  async getUptime(): Promise<string> {
    const t = (await si.time()).uptime
    const d = Math.floor(t / 86400)
    const h = Math.floor((t % 86400) / 3600)
    const m = Math.floor((t % 3600) / 60)
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }
}
