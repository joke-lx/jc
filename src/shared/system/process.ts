import si from 'systeminformation'
import pidusage from 'pidusage'
import { execSync } from 'child_process'

export interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  memory: number  // MB
  port?: number
  state?: string
}

export interface ProcessStats {
  total: number
  running: number
  cpuPercent: number
  memoryGB: number
}

export interface ProcessManager {
  getProcessByPort(port: number): Promise<ProcessInfo[]>
  getProcessByName(name: string): Promise<ProcessInfo[]>
  killProcess(pid: number): Promise<void>
  getTopProcesses(sort: 'cpu' | 'memory', limit: number): Promise<ProcessInfo[]>
  getProcessStats(): Promise<ProcessStats>
  listProcesses(nameFilter?: string): Promise<ProcessInfo[]>
  getListeningPorts(): Promise<ProcessInfo[]>
}

export class WinProcessManager implements ProcessManager {
  async getListeningPorts(): Promise<ProcessInfo[]> {
    const data = await si.networkConnections()
    return data
      .filter(c => c.state === 'listen')
      .map(c => ({
        pid: c.pid,
        name: '',
        cpu: 0,
        memory: 0,
        port: c.localPort,
        state: c.state,
      }))
  }

  async getProcessByPort(port: number): Promise<ProcessInfo[]> {
    const conns = await si.networkConnections()
    const matches = conns.filter(c => c.localPort === port && c.state === 'listen')
    if (matches.length === 0) return []
    return Promise.all(matches.map(async (m) => {
      const proc = await this.getProcessInfo(m.pid)
      return { ...proc, port: m.localPort }
    }))
  }

  async getProcessByName(name: string): Promise<ProcessInfo[]> {
    const processes = await si.processes()
    return processes.list
      .filter(p => p.name.toLowerCase().includes(name.toLowerCase()))
      .map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: p.cpu,
        memory: Math.round(p.mem / (1024 * 1024)),
        state: p.state,
      }))
  }

  async killProcess(pid: number): Promise<void> {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // If SIGTERM fails, try SIGKILL
      process.kill(pid, 'SIGKILL')
    }
  }

  async getTopProcesses(sort: 'cpu' | 'memory', limit: number): Promise<ProcessInfo[]> {
    const processes = await si.processes()
    const list = processes.list.map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu,
      memory: Math.round(p.mem / (1024 * 1024)),
      state: p.state,
    }))
    if (sort === 'cpu') {
      list.sort((a, b) => b.cpu - a.cpu)
    } else {
      list.sort((a, b) => b.memory - a.memory)
    }
    return list.slice(0, limit)
  }

  async getProcessStats(): Promise<ProcessStats> {
    const processes = await si.processes()
    return {
      total: processes.all,
      running: processes.running,
      cpuPercent: processes.cpu,
      memoryGB: Math.round(processes.mem / (1024 * 1024 * 1024) * 10) / 10,
    }
  }

  async listProcesses(nameFilter?: string): Promise<ProcessInfo[]> {
    const processes = await si.processes()
    let list = processes.list
    if (nameFilter) {
      list = list.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()))
    }
    return list.map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu,
      memory: Math.round(p.mem / (1024 * 1024)),
      state: p.state,
    }))
  }

  private async getProcessInfo(pid: number): Promise<{ pid: number; name: string; cpu: number; memory: number }> {
    try {
      const procs = await si.processes()
      const p = procs.list.find(x => x.pid === pid)
      if (p) {
        return { pid, name: p.name, cpu: p.cpu, memory: Math.round(p.mem / (1024 * 1024)) }
      }
    } catch { /* ignore */ }
    return { pid, name: `PID:${pid}`, cpu: 0, memory: 0 }
  }
}
