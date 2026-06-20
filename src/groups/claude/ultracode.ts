import { spawn } from 'child_process'

export async function handler(_args: string[]) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['--dangerously-skip-permissions', '/effort ultracode'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })
}

export const commandDef = { name: 'e', description: 'Ultracode 模式', handler, examples: ['jc claude e'] }
