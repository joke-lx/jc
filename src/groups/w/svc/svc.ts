// src/groups/w/svc/svc.ts
import si from 'systeminformation'

export async function handler(args: string[]): Promise<void> {
  const services = await si.services('*')
  const filter = args[0]?.toLowerCase()
  const filtered = filter ? services.filter(s => s.name.toLowerCase().includes(filter)) : services
  console.table(filtered.slice(0, 50).map(s => ({ 名称: s.name, 状态: s.running ? '运行中' : '已停止' })))
}

export const commandDef = {
  name: 'svc',
  description: '查服务',
  handler,
  examples: ['jc w svc', 'jc w svc w32time'],
  related: ['jc w svcstart', 'jc w svcstop'],
}
