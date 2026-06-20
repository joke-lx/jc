// src/groups/w/proc/portkill.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { error, warning } from '../../../cli/output.js'

export async function handler(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === '--help' || args[0] === '?') {
    console.log(`用法: jc w pk <PORT> [--soft|--list]`)
    return
  }
  const port = parseInt(args[0], 10)
  if (isNaN(port)) {
    console.error(error('❌ 端口号必须是数字'))
    process.exit(1)
  }

  const pm = getProcessManager()
  const procs = await pm.getProcessByPort(port)
  if (procs.length === 0) {
    console.log(`端口 ${port} 无进程占用`)
    return
  }

  const isListOnly = args.includes('--list')
  const isSoft = args.includes('--soft')

  console.log(`端口 ${port} 被以下进程占用:`)
  procs.forEach(p => console.log(`  PID: ${p.pid}, 名称: ${p.name}`))

  if (isListOnly) return

  for (const p of procs) {
    try {
      if (isSoft) {
        process.kill(p.pid, 'SIGTERM')
      } else {
        process.kill(p.pid, 'SIGKILL')
      }
      console.log(`✅ PID ${p.pid} (${p.name}) 已终止`)
    } catch (e: any) {
      console.error(warning(`⚠️ PID ${p.pid} 终止失败: ${e.message}`))
    }
  }
}

export const commandDef = {
  name: 'pk',
  description: '一键查并杀端口进程',
  handler,
  helpText: '用法:\n  jc w pk <PORT>     - 强制杀\n  jc w pk <PORT> --list - 只查不杀\n  jc w pk <PORT> --soft - 优雅终止',
  examples: ['jc w pk 8080', 'jc w pk 3000 --list'],
  related: ['jc w p', 'jc w k', 'jc w kn'],
}
