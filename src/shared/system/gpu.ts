// src/shared/system/gpu.ts
// GPU 信息的 manager。
// ⚠️ GPU 字段命名注意点（jc-development skill spec 5.4）：
// systeminformation 的 graphics().controllers[*].vram 单位是 MB；
// 我们把 /1024 换算成 GB，所以字段名 vramGB 是准确的。
// 上一轮 SDD 的 spec bug 是把这条换算描述成"divides by 1024 (not 1024^3) 的 caveat"，
// 实际是 MB→GB 的换算，不是 SI/二进制单位混用。已修正（commit 90498f1）。
import si from 'systeminformation'

// 单个 GPU 控制器信息。
// vramGB 始终 ≥ 0（g.vram 可能为 undefined，|| 0 兜底）。
export interface GpuInfo {
  model: string
  driverVersion: string
  // 1 位小数（7.5 GB / 24 GB）。
  vramGB: number
}

export interface GpuManager {
  getInfo(): Promise<GpuInfo[]>
}

export class SystemGpuManager implements GpuManager {
  async getInfo(): Promise<GpuInfo[]> {
    // si.graphics() 可能在集成显卡场景下返回 controllers: undefined。
    // || [] 兜底，让 map 永不报 TypeError。
    const graphics = await si.graphics()
    return (graphics.controllers || []).map(g => ({
      model: g.model,
      // driverVersion 在某些驱动（特别是开源 Mesa）上是空串；空串兜底比 undefined 友好。
      driverVersion: g.driverVersion || '',
      // MB → GB 换算：除以 1024 后四舍五入到 1 位小数。
      // 注释里说明一下顺序：先 (g.vram || 0) 兜底，再 / 1024，再 * 10 / 10 是为了"1 位小数"。
      // 注意运算符优先级：括号不可省，否则 ((g.vram || 0) / 1024 * 10) / 10 正确（(0||0)/1024 = 0, *10/10 = 0）。
      vramGB: Math.round((g.vram || 0) / 1024 * 10) / 10,
    }))
  }
}
