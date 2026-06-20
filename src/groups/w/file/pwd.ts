// src/groups/w/file/pwd.ts

export async function handler(_args: string[]): Promise<void> {
  console.log(process.cwd())
}

export const commandDef = {
  name: 'pwd',
  description: '显示当前目录',
  handler,
  examples: ['jc w pwd'],
  related: ['jc w ls', 'jc w cd'],
}
