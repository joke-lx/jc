// src/shared/registry/store.ts
// jc mgr 的磁盘持久化层。读/写/修改 registry.json 的所有入口都在这里。
// 设计动机见 docs/superpowers/specs/2026-07-30-jc-mgr-design.md section 5.1。
// ⚠️ 当前是单文件 JSON 形态（`{ version: 1, items: [...] }`）。下一轮可能改为目录式
// （`$XDG_DATA_HOME/jc/registry/<alias>/item.json + bin/`），届时这个文件整体重写。
import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs'
import { getRegistryPath, ensureRegistryDir } from './paths.js'
import type { RegistryItem, RegistryFile } from './types.js'

// 重新导出 getRegistryPath：让 import './store.js' 一次就够，避免使用者记两个模块。
export { getRegistryPath } from './paths.js'

// 读 registry：缺失或空文件都返回空 registry（不是错误）。
// 这是为了让"首次运行 jc mgr list"无需先 add 一次。
export function readRegistry(): RegistryFile {
  const path = getRegistryPath()
  if (!existsSync(path)) return { version: 1, items: [] }
  const raw = readFileSync(path, 'utf-8')
  // 空文件也按空 registry 处理：避免 JSON.parse('') 抛 SyntaxError。
  if (!raw.trim()) return { version: 1, items: [] }
  return JSON.parse(raw) as RegistryFile
}

// 写 registry：先确保父目录存在，再用 tmp 文件 + renameSync 做原子写。
// 原子写的意义：写一半时进程被杀，不会留下半截文件导致 JSON.parse 失败。
// 当前实现未做 fsync：极端掉电场景可能丢失最近一次提交；用户手动 mgr 操作的丢失可接受。
export function writeRegistry(file: RegistryFile): void {
  ensureRegistryDir()
  const path = getRegistryPath()
  const tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(file, null, 2), 'utf-8')
  renameSync(tmp, path)
}

// read-modify-write 闭包：把"先读再改再写"三步折叠成单参数 mutator。
// 之所以有这个 helper：所有 mutation helpers（add/remove/rename/update）的 body
// 都是"先 read、map/filter 出新数组、write 回去"，展开写会重复 4 次。
function withFile(mutator: (file: RegistryFile) => RegistryFile): void {
  const file = readRegistry()
  writeRegistry(mutator(file))
}

// 按 alias 查：O(n) 线性扫。
// 不做 hashmap：registry 长度通常 < 100，n 极小；引入 hashmap 要维护 items 数组的稳定性
// （mutation 时不重建数组），复杂度收益不抵。
export function getItem(alias: string): RegistryItem | undefined {
  return readRegistry().items.find(i => i.alias === alias)
}

// 返回原数组引用：调用方只读，不修改。list 命令直接 console.table 它。
export function listItems(): RegistryItem[] {
  return readRegistry().items
}

// append：保留所有现有项 + 新项。
// alias 重名由 add.ts 在调用前 getItem 检查，store 不重复校验（保持职责单一）。
export function addItem(item: RegistryItem): void {
  withFile(f => ({ version: 1, items: [...f.items, item] }))
}

// 按 alias 删除：用 filter 保留其他项。
export function removeItem(alias: string): void {
  withFile(f => ({ version: 1, items: f.items.filter(i => i.alias !== alias) }))
}

// 改名：map 替换；用 spread 保持其它字段不变。
// 重名检查由 rename.ts 在调用前 getItem 校验。
export function renameItem(oldAlias: string, newAlias: string): void {
  withFile(f => ({
    version: 1,
    items: f.items.map(i => (i.alias === oldAlias ? { ...i, alias: newAlias } : i)),
  }))
}

// 更新 desc：与 renameItem 同形，仅替换 desc 字段。
// 当前 mgr 命令里没有"更新 desc"命令（plan 5.7 也未列出），但 handler 抽象层允许
// 后续加 update 命令时直接复用此 helper。
export function updateItemDesc(alias: string, newDesc: string): void {
  withFile(f => ({
    version: 1,
    items: f.items.map(i => (i.alias === alias ? { ...i, desc: newDesc } : i)),
  }))
}

// 刷新 sourceVerifiedAt：check 命令成功后调。
// ⚠️ 失败时**不**调此 helper（spec 5.3：failure 不更新 verified 字段）。
export function updateItemVerifiedAt(alias: string, iso: string): void {
  withFile(f => ({
    version: 1,
    items: f.items.map(i => (i.alias === alias ? { ...i, sourceVerifiedAt: iso } : i)),
  }))
}