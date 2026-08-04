import { Command } from '../../../cli/Command.js'
import { error, warning } from '../../../cli/output.js'
import { getProcessManager } from '../../../shared/system/adapter.js'

// src/groups/w/proc/killname.ts

async function executeKillname(args: string[]): Promise<void> {

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

export class KillnameCommand extends Command {
  name = "kn"
  description = "按进程名杀进程"
  helpText = `用法:
  ${this.bin} w kn <NAME>  - 如 chrome / node`
  examples = [`${this.bin} w kn chrome`, `${this.bin} w kn node`]
  related = [`${this.bin} w k`, `${this.bin} w ps`, `${this.bin} w p`]

  async handler(args: string[]): Promise<void> {
    return executeKillname(args)
  }
}

export const commandDef = new KillnameCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
