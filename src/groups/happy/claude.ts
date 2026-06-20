import { spawn } from 'child_process'

export async function handler(_args: string[]) {
  return new Promise((resolve, reject) => {
    const child = spawn('happy', ['claude'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })
}

export const commandDef = { name: 'claude', description: '启动 Happy + Claude', handler, examples: ['jc happy claude'] }
