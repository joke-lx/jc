import { spawn } from 'child_process'

export async function handler(_args: string[]) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-r', '--dangerously-skip-permissions'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })
}

export const commandDef = { name: 'r', description: '恢复上次会话', handler, examples: ['jc claude r'] }
