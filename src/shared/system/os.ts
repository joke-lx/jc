// src/shared/system/os.ts
// OS 信息的 manager：hostname / distro / kernel / uptime / BIOS。
// 与 cpu/memory 不同，这里用 Promise.all 并发跑三个 systeminformation 调用（osInfo + bios + time），
// 因为三者无依赖关系；并发能把 ~1.5s 压到 ~0.5s。
import si from 'systeminformation'

// OS 整体视图。
// uptime 单位是秒（systeminformation 原生）；不在此处做格式化，
// 避免在 manager 层做与"信息获取"无关的字符串拼接（让调用方决定格式）。
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
  // getHostname：单独暴露以便快速查询；与 getInfo 的 hostname 字段同源（都从 si.osInfo 读）。
  getHostname(): Promise<string>
  // getUptime 返回人类可读字符串（"3d 5h 22m"）；这是与 getInfo 的语义分界点。
  getUptime(): Promise<string>
}

export class SystemOsManager implements OsManager {
  async getInfo(): Promise<OsInfo> {
    // 并发三连：osInfo（系统）、bios（BIOS）、time（uptime）。
    // 三者无依赖关系，Promise.all 把总耗时压到 max(各次) 而非 sum。
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
      // bios 三个字段在某些 VM/容器里是 undefined；空串兜底。
      biosVendor: bios.vendor || '',
      biosVersion: bios.version || '',
      biosDate: bios.releaseDate || '',
    }
  }

  async getHostname(): Promise<string> {
    return (await si.osInfo()).hostname
  }

  // 人类可读的 uptime 格式："3d 5h 22m" / "5h 22m" / "22m"。
  // 三档 fallback：d > 0 显示 d/h/m；h > 0 显示 h/m；否则只显示 m。
  // 不显示 s：秒级精度在 1 天以上的 uptime 上是噪音；分钟级够用。
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
