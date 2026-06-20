// src/groups/w/wsl/docker.ts
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  execSync('docker ps -a', { stdio: 'inherit' })
}

export const commandDef = {
  name: 'docker',
  description: '列出 Docker 容器',
  handler,
  platform: 'win32' as const,
}
