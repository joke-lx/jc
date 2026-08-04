import { Command } from '../../../cli/Command.js'
import { error } from '../../../cli/output.js'
import { getProcessManager } from '../../../shared/system/adapter.js'

// src/groups/w/proc/kill.ts

async function executeKill(args: string[]): Promise<void> {

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

export class KillCommand extends Command {
  name = "k"
  description = "按 PID 杀进程"
  helpText = `用法:
  ${this.bin} w k <PID>  - 强制结束指定 PID`
  examples = [`${this.bin} w k 1234`]
  related = [`${this.bin} w p`, `${this.bin} w pk`, `${this.bin} w kn`, `${this.bin} w ps`]

  async handler(args: string[]): Promise<void> {
    return executeKill(args)
  }
}

export const commandDef = new KillCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
