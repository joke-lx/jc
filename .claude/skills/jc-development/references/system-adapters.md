---
name: system-adapters
description: 在改动 src/shared/system/**、新增系统资源，或对调用系统信息的命令进行单元测试时加载。
---

# system-adapters

需要读写系统信息管理器、新增系统资源，或为调用 adapter 层的命令编写单元测试时，加载本 reference。本文件锁定 adapter 契约、各资源形态，以及直接使用 `systeminformation` 的规则。

## 加载时机

- 你正在编辑 `src/shared/system/**` 下的文件。
- 你正在接入需要 CPU、内存、磁盘、GPU、OS、网络或进程数据的新命令。
- 你正在编写或修复涉及上述任一项的单元测试。
- 你正在评审触及 `src/groups/w/sys/**` 或 `src/groups/w/proc/**` 下 handler 的 PR。

## Adapter 契约

每种资源都有一个 `interface <Resource>Manager` 与一个实现它的 `class System<Resource>Manager`。handler 唯一的引入面是 `src/shared/system/adapter.ts`，它为每种资源导出一个工厂函数（`getCpuManager`、`getMemoryManager`、`getDiskManager`、`getGpuManager`、`getOsManager`、`getNetworkManager`、`getProcessManager`）。每个工厂都返回一个 `System<Resource>Manager` 实例。

```ts
// src/shared/system/adapter.ts:16-26
export function getProcessManager(): ProcessManager {
  // For now, use same implementation across platforms
  // Platform-specific optimizations can be added later
  return new WinProcessManager()
}
export function getNetworkManager(): NetworkManager { return new SystemNetworkManager() }
export function getCpuManager(): CpuManager { return new SystemCpuManager() }
export function getMemoryManager(): MemoryManager { return new SystemMemoryManager() }
export function getDiskManager(): DiskManager { return new SystemDiskManager() }
export function getGpuManager(): GpuManager { return new SystemGpuManager() }
export function getOsManager(): OsManager { return new SystemOsManager() }
```

`src/shared/system/adapter.ts:17-18` 的注释记录了约定：工厂始终返回同一份实现，与平台无关。类名 `WinProcessManager` 是历史遗留，并不代表仅限 Windows；在所有平台上返回的都是同一个实例。

## 资源覆盖

每个管理器一节。接口文件给出规范的返回形态。

### CPU（`src/shared/system/cpu.ts`）

`CpuManager.getInfo(): Promise<CpuInfo>` 返回 `{ manufacturer, brand, physicalCores, logicalCores, speedGHz, loadPercent }`。`loadPercent` 四舍五入到 1 位小数（`src/shared/system/cpu.ts:17-30`）。

### Memory（`src/shared/system/memory.ts`）

`MemoryManager.getInfo(): Promise<MemoryInfo>` 返回 `{ totalGB, freeGB, usedGB, percentUsed, swapTotalGB, swapUsedGB }`。所有字节数都通过 `1024 * 1024 * 1024` 转为 GB，再四舍五入到 1 位小数（`src/shared/system/memory.ts:16-28`）。

### Disk（`src/shared/system/disk.ts`）

`DiskManager.getInfo(): Promise<DiskInfo[]>` 返回 `[{ drive, sizeGB, usedGB, freeGB, percentUsed, filesystem }]`。磁盘容量四舍五入到整数 GB（`src/shared/system/disk.ts:19-29`）。`getSize(path)` 返回 `{ sizeMB }`。

### GPU（`src/shared/system/gpu.ts`）

`GpuManager.getInfo(): Promise<GpuInfo[]>` 返回 `[{ model, driverVersion, vramGB }]`（`src/shared/system/gpu.ts:14-21`）。`systeminformation` 的 `graphics().controllers[*].vram` 单位是 MB；`SystemGpuManager.getInfo` 把它除以 `1024` 换算成 GB，因此字段名 `vramGB` 是准确的。不要改变除数，也不要重新命名该字段，除非重新推导换算关系。

### OS（`src/shared/system/os.ts`）

`OsManager.getInfo(): Promise<OsInfo>` 返回 `{ hostname, platform, distro, release, kernel, uptime, biosVendor, biosVersion, biosDate }`。同时还暴露 `getHostname()` 与 `getUptime()`（格式为 `Xd Yh Zm` 的字符串）。

### Network（`src/shared/system/network.ts`）

`NetworkManager` 暴露 `getNetworkInfo`、`getWiFiInfo`、`getWiFiPasswords`、`ping`、`traceRoute`、`getConnections`、`flushDns`、`getProxySettings`、`getMacAddresses`。DNS 服务器发现逻辑在 Windows 上会回退到 `ipconfig /all`（`src/shared/system/network.ts:53-86`）。

### Process（`src/shared/system/process.ts`）

`ProcessManager` 暴露 `getProcessByPort`、`getProcessByName`、`killProcess`、`getTopProcesses`、`getProcessStats`、`listProcesses`、`getListeningPorts`。返回的类是 `WinProcessManager`，但所有平台都使用同一份实现（参见 `src/shared/system/adapter.ts:16-20`）。`getProcessByPort` 与 `getListeningPorts` 在 Windows 上当 `si.networkConnections()` 返回空时，会回退到解析 `netstat -ano`（`src/shared/system/process.ts:64-89`）。`Win` 前缀只是误导性的历史命名，并不是平台限制。

## `systeminformation`（`si`）使用规则

handler 代码触达底层 `systeminformation` 库的唯一合规路径是 `src/shared/system/adapter.ts` 中的 adapter 工厂。`adapter.ts` 总是返回同一份实现，因此调用方无需按 `process.platform` 分支。

handler 内禁止直接 `si` 引入。下面列出当前已存在的违规点，方便规划迁移。

**错误示例** —— handler 跳过 adapter，直接触达 `systeminformation`：

```ts
// src/groups/w/sys/bat.ts:2
import si from 'systeminformation'
```

```ts
// src/groups/w/sys/mon.ts:2
import si from 'systeminformation'
```

下次触及这两个文件时，把 `si.*` 调用替换为对应 adapter（`getOsManager`、`getGpuManager` 等），或者先在 adapter 层新增一项资源再使用。新命令在 `src/groups/**` 下不得新增直接 `si` 引入；若没有现成 adapter 暴露所需数据，先把它加进 `src/shared/system/`，再扩展工厂。

## 死引用反例

**Legacy hazard** —— `src/shared/system/process.ts:2` 引入了 `pidusage` 但从未使用。这条引入是死代码，下次触及该文件时应一并删除；不要把这种模式复制到新模块。

## 新命令的规则

handler 必须通过 adapter 工厂引入 manager，并消费返回的形态。示意：

```ts
// src/groups/w/proc/example.ts
import { getCpuManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const cpu = await getCpuManager().getInfo()
  console.log(`load ${cpu.loadPercent}%`)
}

export const commandDef = {
  name: 'example',
  description: 'example',
  handler,
  examples: ['jc w example'],
}
```

handler 控制在 30 行以内；若超过，逻辑大概率应当放到 `src/shared/system/` 中。

## 测试期规则

单元测试模拟的是 adapter 工厂，而非底层的 `systeminformation` 库。模拟 `systeminformation` 会让测试与库的形态耦合，导致每次归一化调整都要级联到 fixture。

```ts
// tests/shared/system/example.test.ts
import { vi } from 'vitest'

vi.mock('../../../src/shared/system/adapter.js', () => ({
  getCpuManager: () => ({
    getInfo: async () => ({
      manufacturer: 'test', brand: 'test',
      physicalCores: 4, logicalCores: 8,
      speedGHz: 3.0, loadPercent: 12.3,
    }),
  }),
}))
```

## 归一化约定

adapter 在回传前对 `systeminformation` 原始值做归一化。把下面这些约定视作公共契约的一部分；改动它们等于对所有消费方做破坏性变更。

| 字段 | 规则 | 来源 |
|---|---|---|
| `CpuInfo.loadPercent` | 把 `load.currentLoad` 四舍五入到 1 位小数 | `src/shared/system/cpu.ts:17-30` |
| `MemoryInfo.*GB` | 把字节数除以 `1024 ** 3`，再四舍五入到 1 位小数 | `src/shared/system/memory.ts:16-28` |
| `DiskInfo.sizeGB` / `usedGB` / `freeGB` | 把字节数除以 `1024 ** 3`，再四舍五入到整数 GB | `src/shared/system/disk.ts:19-29` |
| `GpuInfo.vramGB` | 把 `vram`（MB）除以 `1024` 得到 GB —— 字段名与换算一致 | `src/shared/system/gpu.ts:14-21` |

GPU 字段保持为 `vramGB`；除数与字段名是耦合的。单独改动任一边都是 bug。
