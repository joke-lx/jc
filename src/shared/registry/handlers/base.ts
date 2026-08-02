// src/shared/registry/handlers/base.ts
// 抽象基类 ItemHandler：把 jc mgr 的"按 kind 走不同路径"从 if-else 收敛到一处。
// 设计动机见 docs/superpowers/specs/2026-07-31-jc-mgr-handlers-design.md section 5。
// 未来加新 kind（git / docker / brew 等）只需新建一个 XxxItemHandler + 在 index.ts 表里加一行，
// validate / preflight / run 的调用点全部不动。
import { spawn } from 'child_process'
import { access, constants } from 'fs'
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
      const child = spawn(item.exec, argv, { stdio: 'inherit', shell: true, windowsHide: true })
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