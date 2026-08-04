import { Command } from '../../../cli/Command.js'
import { execSync } from 'child_process'

// src/groups/w/wsl/docker.ts

async function executeDocker(_args: string[]): Promise<void> {

  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  execSync('docker ps -a', { stdio: 'inherit' })

}

export class DockerCommand extends Command {
  name = "docker"
  description = "列出 Docker 容器"
  platform = 'win32' as const

  async handler(_args: string[]): Promise<void> {
    return executeDocker(_args)
  }
}

export const commandDef = new DockerCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
