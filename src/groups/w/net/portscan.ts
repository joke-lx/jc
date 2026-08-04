import { Command } from '../../../cli/Command.js'
import net from 'net'

// src/groups/w/net/portscan.ts

async function checkPort(host: string, port: number, timeout = 3000): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket()
    socket.setTimeout(timeout)
    socket.on('connect', () => { socket.destroy(); resolve(true) })
    socket.on('error', () => { socket.destroy(); resolve(false) })
    socket.on('timeout', () => { socket.destroy(); resolve(false) })
    socket.connect(port, host)
  })
}

async function executePortscan(args: string[]): Promise<void> {

  const host = args[0] || '127.0.0.1'
  const portsArg = args[1] || '22,80,443,3306,5432,6379,8080,8443'
  const ports = portsArg.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p))
  console.log(`扫描 ${host} 端口: ${ports.join(', ')}`)
  console.log('')
  for (const port of ports) {
    const open = await checkPort(host, port)
    console.log(`  Port ${port}: ${open ? '开放' : '关闭'}`)
  }

}

export class PortscanCommand extends Command {
  name = "portscan"
  description = "端口扫描"
  examples = [`${this.bin} w portscan`, `${this.bin} w portscan 192.168.1.1 22,80,443`]
  related = [`${this.bin} w p`, `${this.bin} w conn`]

  async handler(args: string[]): Promise<void> {
    return executePortscan(args)
  }
}

export const commandDef = new PortscanCommand()

export async function handler(args: string[]): Promise<void> {
  return commandDef.handler(args)
}
