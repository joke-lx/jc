// src/shared/system/memory.ts
// 内存信息的 manager：把 systeminformation 的字节值归一为 GB + 百分比。
import si from 'systeminformation'

// 物理内存 + swap 的整体视图。
// 所有 *GB 字段都先除以 1024^3（不是 1e9），与 disk.ts 的 1 GB = 2^30 字节约定一致。
// 1 位小数归一（7.5 GB）：与 cpu/disk 的约定统一。
export interface MemoryInfo {
  totalGB: number
  freeGB: number
  usedGB: number
  // 百分比来自 used/total，不用 systeminformation 的可用百分比字段，
  // 因为我们用的字节值是同步的，自己算能保证 used + free = total
  // （systeminformation 内部对小数做四舍五入时偶发 1% 偏差）。
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
      // 先 * 10 再 / 10 是为了 1 位小数：Math.round(bytes / 1024^3 * 10) / 10。
      // 顺序：bytes → GB × 10 → 四舍五入到 1 位小数 → / 10 还原 GB。
      totalGB: Math.round(mem.total / (1024 * 1024 * 1024) * 10) / 10,
      freeGB: Math.round(mem.free / (1024 * 1024 * 1024) * 10) / 10,
      usedGB: Math.round(mem.used / (1024 * 1024 * 1024) * 10) / 10,
      // used / total * 100：百分比先 * 10 再 / 10 同样做 1 位小数。
      // total = 0 时会得到 NaN：极端嵌入式/容器化场景下 systeminformation 偶发返回 0。
      // 当前实现信任 systeminformation 不会返回 0；如真有 0 触发应让上游处理。
      percentUsed: Math.round(mem.used / mem.total * 100 * 10) / 10,
      swapTotalGB: Math.round(mem.swaptotal / (1024 * 1024 * 1024) * 10) / 10,
      swapUsedGB: Math.round(mem.swapused / (1024 * 1024 * 1024) * 10) / 10,
    }
  }
}
