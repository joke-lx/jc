// src/groups/w/proc/kill.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { error } from '../../../cli/output.js'

export async function handler(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(error('❌ 请指定 PID'))
    process.exit(1)
  }
  const pid = parseInt(args[0], 10)
  if (isNaN(pid)) {
    console.error(error('❌ PID 必须是数字'))
    process.exit(1)
  }
  try {
    await getProcessManager().killProcess(pid)
    console.log(`✅ PID ${pid} 已终止`)
  } catch (e: any) {
    console.error(error(`❌ 终止失败: ${e.message}`))
    process.exit(2)
  }
}

export const commandDef = {
  name: 'k',
  description: '按 PID 杀进程',
  handler,
  helpText: '用法:\n  jc w k <PID>  - 强制结束指定 PID',
  examples: ['jc w k 1234'],
  related: ['jc w p', 'jc w pk', 'jc w kn', 'jc w ps'],
}
