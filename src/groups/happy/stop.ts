import { execSync } from 'child_process'

export async function handler(_args: string[]) {
  if (process.platform === 'win32') {
    execSync('powershell -NoProfile "Get-CimInstance Win32_Process -Filter \\"Name=\'node.exe\'\\" | Where-Object { $_.CommandLine -match \'happy\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"')
  } else {
    execSync('pkill -f "happy"', { stdio: 'ignore' })
  }
  console.log('Happy 进程已停止')
}

export const commandDef = { name: 'x', description: '停止所有 Happy 进程', handler, examples: ['jc happy x'] }
