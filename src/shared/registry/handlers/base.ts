// src/shared/registry/handlers/base.ts
// 抽象基类 ItemHandler：把 jc mgr 的"按 kind 走不同路径"从 if-else 收敛到一处。
// 未来加新 kind（git / docker / brew 等）只需新建一个 XxxItemHandler + 在 index.ts 表里加一行，
// validate / preflight / run 的调用点全部不动。
import { spawn } from 'child_process'
import { access, constants, existsSync } from 'fs'
import type { RegistryItem, RegistryItemKind } from '../types.js'

// preflight 的返回类型：只区分"通过"与"失败 + 原因"两种；用判别联合让调用方必须分支。
export type PreflightResult = { ok: true } | { ok: false; reason: string }

export abstract class ItemHandler {
  // 每个子类必须声明自己负责的 kind，工厂表用这个字段做 key。
  abstract readonly kind: RegistryItemKind

  // add / check 时调用：源可达性 + exec 推导（如 npm → "npx -p <pkg> <bin>"）。
  // 必须返回 { ok, exec, reason? }：成功时给完整 exec 字符串让 add 写进 registry。
  abstract validate(item: {
    kind: RegistryItemKind
    source: string
    alias: string
    desc: string
  }): Promise<{ ok: true; exec: string } | { ok: false; reason: string }>

  // run 前调用：轻量源存在性检查，不联网、不重跑 validate。
  // 默认实现：URL 跳过（v1 不预下载，无本地可检查）；本地路径 fs.access。
  // 设计理由：spawn ENOENT 对用户不友好；显式报"源已失效"并提示 jc mgr check，
  // 让用户知道是"源被删了"而不是"路径写错了"。
  preflight(item: RegistryItem): Promise<PreflightResult> {
    if (/^https?:\/\//.test(item.source)) return Promise.resolve({ ok: true })
    return new Promise<PreflightResult>((resolveP) => {
      const p = this.localPath(item.exec)
      access(p, constants.R_OK, (err: NodeJS.ErrnoException | null) =>
        err
          ? resolveP({ ok: false, reason: `源已失效: ${p}（${err.code ?? 'ACCESS'}）` })
          : resolveP({ ok: true })
      )
    })
  }

  // run 时调用：执行 item.exec + user args。
  // 默认实现：spawn + shell:true + windowsHide:true。
  // shell:true 是 Windows 上 npx/npm .cmd shim 解析所必需（见 execution-safety-and-platforms.md
  // 与 Task 6 的 Critical 修复）；windowsHide:true 避免 Windows 上 spawn .cmd 时弹出控制台窗口。
  // argv 把 item.args（add 时存的固定参数）与 user 传参拼接：item.args 在前、user 在后，
  // 这样 user 临时覆盖不会被 add 时的固定参数"挡住"。
  run(item: RegistryItem, args: string[]): Promise<void> {
    const argv = [...(item.args || []), ...args]
    return new Promise<void>((resolveP, rejectP) => {
      const child = spawn(quoteExecForShell(item.exec), argv, { stdio: 'inherit', shell: true, windowsHide: true })
      child.on('close', (c) => c === 0 ? resolveP() : rejectP(new Error(`exit ${c}`)))
      child.on('error', rejectP)
    })
  }

  // 从 exec 字符串抽出"实际本地路径"。
  // 历史实现用 split(/\s+/) 切分，会破坏含空格的 Windows 路径（如 C:\Program Files\tool.exe）：
  // exec="D:\qq\ggit (1).exe" 被切成 ["D:\qq\ggit", "(1).exe"]，preflight 检查了截断的错误路径。
  //
  // 修复规则：
  // 1. 已知解释器 / 复合命令前缀（python / python3 / py / node / npx）：取它**后面**整段作为路径。
  //    为什么取整段而不是 split 第二个 token：python 脚本路径本身可能含空格。
  // 2. 其它情况：整个 exec 就是本地路径（exe 无前缀），**不再 split**——含空格也整体返回。
  // 3. npx -p <pkg> <bin> 特殊：npx 之后 -p <pkg> <bin> 都**不是**本地文件路径，应返回 npx 本身
  //    （preflight 对 npm 已 override 为 {ok:true}，此路径实际不会被用到，保留历史行为）。
  protected localPath(exec: string): string {
    const sp = exec.indexOf(' ')
    if (sp > 0) {
      const first = exec.slice(0, sp)
      if (INTERP_PREFIXES.has(first)) {
        if (first === 'npx') return first // npx -p <pkg> <bin>：返回 npx 本身
        return exec.slice(sp + 1).trim() // python <path...>：返回 path 整段
      }
    }
    return exec
  }
}

// 前缀表放模块顶层：localPath 是热路径（每次 run 前调用），避免每次调用重建 Set。
// 必须是模块级 const，不能放在 class 方法之间（TS 语法错误）。
const INTERP_PREFIXES = new Set(['python', 'python3', 'py', 'node', 'npx'])

// 为 shell 执行准备 exec 字符串：给"真实存在的本地文件路径"加引号，复合命令原样。
// 为什么需要：spawn(exec, argv, { shell:true }) 在 shell 模式下会把 exec 当 shell 命令解析。
// 若 exec 是含空格的本地文件路径（如 'D:\qq\ggit (1).exe'），shell 会把它拆成
// 命令 'D:\qq\ggit' + 参数 '(1).exe'，导致 Gitlike 之类的工具报 unknown command。
//
// 判断规则（用 existsSync 区分"路径"vs"复合命令"）：
// 1. exec 是存在的文件 → 整体加引号（exe：单个本地 exe）。
// 2. exec 是 'python <path>' 且 <path> 是存在的文件 → 只给路径段加引号。
// 3. 其它（npx -p <pkg> <bin>、任意 shell 命令）→ 原样返回，不能加引号。
//
// 为什么不直接用 localPath 的 INTERP_PREFIXES 判断：
// 一个 exec 字符串既可能是"单个路径"也可能是"复合命令"，两者都含空格。
// 唯一可靠的分界是"exec（或其路径段）是否真实存在于文件系统"。
export function quoteExecForShell(exec: string): string {
  const sp = exec.indexOf(' ')
  if (sp < 0) return exec // 无空格：无需引号

  const first = exec.slice(0, sp)
  // python 前缀：只给脚本路径段加引号（脚本路径可能含空格）。
  if (INTERP_PREFIXES.has(first)) {
    const pathSeg = exec.slice(sp + 1).trim()
    // npx 之后的 pkg/bin 不是本地文件；python 之后的才是。
    if (first !== 'npx' && existsSync(pathSeg)) {
      return `${first} "${pathSeg}"`
    }
    return exec
  }

  // 单个本地 exe 路径：整个 exec 就是文件。
  if (existsSync(exec)) return `"${exec}"`
  return exec
}