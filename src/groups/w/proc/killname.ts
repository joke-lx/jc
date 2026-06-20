// src/groups/w/proc/killname.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { error, warning } from '../../../cli/output.js'

export async function handler(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(error('❌ 请指定进程名'))
    process.exit(1)
  }
  const name = args[0]
  const pm = getProcessManager()
  const procs = await pm.getProcessByName(name)
  if (procs.length === 0) {
    console.log(`未找到进程: ${name}`)
    return
  }
  for (const p of procs) {
    try {
      await pm.killProcess(p.pid)
      console.log(`✅ ${p.name} (PID: ${p.pid}) 已终止`)
    } catch (e: any) {
      console.error(warning(`⚠️ ${p.name} (PID: ${p.pid}) 终止失败: ${e.message}`))
    }
  }
}

export const commandDef = {
  name: 'kn',
  description: '按进程名杀进程',
  handler,
  helpText: '用法:\n  jc w kn <NAME>  - 如 chrome / node',
  examples: ['jc w kn chrome', 'jc w kn node'],
  related: ['jc w k', 'jc w ps', 'jc w p'],
}
