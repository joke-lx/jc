import { spawn } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('happy', ['doctor'], { stdio: 'inherit', shell: true })
    child.on('close', (c) => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
    child.on('error', reject)
  })
}

export const commandDef = { name: 'doctor', description: 'Happy 诊断检查', handler, examples: ['jc happy doctor'] }
