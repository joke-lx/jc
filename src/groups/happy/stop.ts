import { execSync } from 'child_process'
import { Command } from '../../cli/Command.js'

async function executeStop(_args: string[]): Promise<void> {

  if (process.platform === 'win32') {
    execSync('powershell -NoProfile "Get-CimInstance Win32_Process -Filter \\"Name=\'node.exe\'\\" | Where-Object { $_.CommandLine -match \'happy\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"')
  } else {
    execSync('pkill -f "happy"', { stdio: 'ignore' })
  }
  console.log('Happy 进程已停止')

}

export class StopCommand extends Command {
  name = "x"
  description = "停止所有 Happy 进程"
  examples = [`${this.bin} happy x`]

  async handler(_args: string[]): Promise<void> {
    return executeStop(_args)
  }
}

export const commandDef = new StopCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
