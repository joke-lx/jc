import { spawn } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { stdio: 'inherit', shell: true })
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`claude exit code ${code}`)))
    child.on('error', (e) => reject(e))
  })
}

export const commandDef = { name: 'run', description: '启动 Claude Code', handler, examples: ['jc claude'] }
