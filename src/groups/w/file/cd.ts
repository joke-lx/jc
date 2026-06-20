// src/groups/w/file/cd.ts

export async function handler(args: string[]): Promise<void> {
  const dir = args[0]
  if (!dir) {
    console.log(`当前目录: ${process.cwd()}`)
    return
  }
  try {
    process.chdir(dir)
    console.log(`已切换到: ${process.cwd()}`)
  } catch (e: any) {
    console.error(`切换目录失败: ${e.message}`)
  }
}

export const commandDef = {
  name: 'cd',
  description: '切换目录 (仅当前会话)',
  handler,
  examples: ['jc w cd C:\\', 'jc w cd ..'],
  related: ['jc w pwd', 'jc w ls'],
}
