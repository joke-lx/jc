// src/shared/system/disk.ts
// 磁盘 / 文件系统的 manager：把 systeminformation 的 fsSize 结果归一为 GB + 百分比。
import si from 'systeminformation'

// 单个挂载点的磁盘信息。
// sizeGB 取整（Math.round）：1 GB 以下的精度对用户决策无意义；整数易读。
// 1 GB = 1024 * 1024 * 1024 bytes（与 disk-manager 工具的惯例一致，非 SI 标准）。
export interface DiskInfo {
  drive: string
  sizeGB: number
  usedGB: number
  freeGB: number
  // 1 位小数归一（28.5%）：与 cpu.ts loadPercent 的归一约定一致。
  percentUsed: number
  filesystem: string
}

export interface DiskManager {
  // 默认接口：只返回有 mount 的（即真实挂载的）磁盘。
  // systeminformation 默认会列出 tmpfs / overlay 等"伪"挂载，过滤掉让 list 输出干净。
  getInfo(): Promise<DiskInfo[]>
  // 全量接口：与 getInfo 行为一致；保留是为未来"显示虚拟挂载"留口子。
  getFullInfo(): Promise<DiskInfo[]>
  // 给定路径的总和：用于"这个目录占了多少 MB"之类的查询（暂未消费方）。
  getSize(path: string): Promise<{ sizeMB: number }>
}

export class SystemDiskManager implements DiskManager {
  async getInfo(): Promise<DiskInfo[]> {
    const fs = await si.fsSize()
    // 过滤没有 mount 的：tmpfs / overlay / 其它虚拟挂载通常没 mount 点。
    // 保留空字符串 mount（Linux 上偶尔出现），但当前实现选择"完全没 mount"才过滤。
    return fs.filter(f => f.mount).map(f => ({
      drive: f.mount,
      // 字节 → GB：3 次 1024 相乘。
      // 不除 1e9（SI 标准）：与 df -h / lsblk 输出一致。
      sizeGB: Math.round(f.size / (1024 * 1024 * 1024)),
      usedGB: Math.round(f.used / (1024 * 1024 * 1024)),
      // freeGB 由 size - used 推导：避免 systeminformation 内部小数累积误差。
      freeGB: Math.round((f.size - f.used) / (1024 * 1024 * 1024)),
      // percentUsed 来自 systeminformation 的 f.use（已是 0-100 范围）。
      // 1 位小数：与 cpu/memory 的归一约定一致。
      percentUsed: Math.round(f.use * 10) / 10,
      // f.fs 在某些挂载（如 cgroup fs）上是 undefined；空字符串兜底。
      filesystem: f.fs || '',
    }))
  }

  // 当前与 getInfo 同形；保留 API 是为以后分"含虚拟挂载"与"不含"两种视图。
  async getFullInfo(): Promise<DiskInfo[]> {
    return this.getInfo()
  }

  // 按路径汇总所有挂载点的 size（不区分是否包含该路径）。
  // 简化实现：真实"目录大小"应递归遍历文件系统；当前用挂载点总和近似。
  // 未来若要严格"目录大小"，换 du 实现（systeminformation 没有）。
  async getSize(path: string): Promise<{ sizeMB: number }> {
    const fs = await si.fsSize(path)
    const total = fs.reduce((acc, f) => acc + f.size, 0)
    // 字节 → MB：2 次 1024。
    return { sizeMB: Math.round(total / (1024 * 1024)) }
  }
}
