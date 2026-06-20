import { spawn } from 'child_process'

export async function handler(args: string[]) {
  return new Promise((resolve, reject) => {
    const child = spawn('happy', args, { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`happy exit ${c}`)))
    child.on('error', reject)
  })
}

export const commandDef = { name: 'run', description: '启动 Happy', handler, examples: ['jc happy'] }
