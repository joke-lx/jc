// src/groups/mgr/install.ts
// mgr install 命令：先跑安装命令，再定位 bin，最后注册为 alias。
// 设计动机：让 "uv tool install xxx / pip install xxx / npm i -g xxx + 别名" 这种
// 常见操作有独立 verb（jc m install），更像包管理器的体验，而不是埋在 add 的 --install flag 里。
// 实现：几乎与 `jc m add --install --bin` 等价；handler 内部构造等价的 argv 委托给 add。
//
// 参数：
//   --cmd <shell-cmd>     安装命令（与 add 的 --install 等价）
//   --bin <name>          装好后要在 PATH 里定位的可执行名
//   --alias <name>        注册到 registry 的别名（必填）
//   --desc <text>         简介（可选）
//   --kind <npm|py|exe>   registry 类型，默认 exe（uv/pip/npm i -g 都是装可执行；用户可改）
//   --yes                 跳过交互确认（当前实现无交互，无需 --yes；保留供将来扩展）
//
// 任意一步失败 → exit 2，不写 registry。
import { error } from '../../cli/output.js'
import { cliText } from '../../cli/output.js'

interface ParsedArgs {
  cmd?: string
  bin?: string
  alias?: string
  desc: string
  kind: 'npm' | 'py' | 'exe'
}

function parseArgs(args: string[]): ParsedArgs {
  const out: ParsedArgs = { kind: 'exe', desc: '' }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--cmd') out.cmd = args[++i]
    else if (a === '--bin') out.bin = args[++i]
    else if (a === '--alias') out.alias = args[++i]
    else if (a === '--desc') out.desc = args[++i] ?? ''
    else if (a === '--kind') {
      const k = args[++i]
      if (k !== 'npm' && k !== 'py' && k !== 'exe') {
        console.error(error(`--kind 必须是 npm|py|exe，得到: ${k}`))
        process.exit(1)
      }
      out.kind = k as 'npm' | 'py' | 'exe'
    } else if (a === '--yes' || a === '-y') {
      // 保留以备将来扩展（例如确认安装可能修改 PATH 的二次确认）
    } else {
      console.error(error(`未知参数: ${a}`))
      process.exit(1)
    }
  }
  return out
}
import { Command } from '../../cli/Command.js'

async function executeInstall(args: string[]): Promise<void> {

  const p = parseArgs(args)
  if (!p.cmd || !p.bin || !p.alias) {
    console.error(error(cliText('用法: jc mgr install --cmd "<install-cmd>" --bin <name> --alias <name> [--kind <npm|py|exe>] [--desc <text>]')))
    process.exit(1)
  }

  // 委托给 add handler，等价于 `add <kind> --install "<cmd>" --bin <bin> --alias <alias> [--desc <desc>]`。
  // 这样不需要重写 install/find-bin 逻辑，所有修复自动跟随 add。
  const { handler: addHandler } = await import('./add.js')
  const aliased: string[] = [p.kind, '--install', p.cmd, '--bin', p.bin, '--alias', p.alias]
  if (p.desc) aliased.push('--desc', p.desc)
  await addHandler(aliased)

}

export class InstallCommand extends Command {
  name = "install"
  description = "安装一个外部工具并注册为 alias（先跑 --cmd，再 which --bin）"
  examples = [`${this.bin} mgr install --cmd "uv tool install sql-harness" --bin sql-harness --alias sh`, `${this.bin} mgr install --cmd "npm install -g typescript-language-server" --bin typescript-language-server --alias ts-ls --kind npm`]
  related = [`${this.bin} mgr add`, `${this.bin} mgr list`]

  async handler(args: string[]): Promise<void> {
    return executeInstall(args)
  }
}

export const commandDef = new InstallCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
