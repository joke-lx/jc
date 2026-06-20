import { spawn } from 'child_process'

export async function handler(args: string[]) {
  return new Promise((resolve, reject) => {
    const child = spawn('happy', ['resume', ...args], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })
}

export const commandDef = { name: 'resume', description: '恢复 Happy 会话', handler, examples: ['jc happy resume <session-id>'] }
