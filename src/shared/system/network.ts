import si from 'systeminformation'
import { execSync } from 'child_process'

export interface NetworkInfo {
  interfaces: { name: string; ip4: string; ip6: string; mac: string; type: string }[]
  defaultGateway: string
  dnsServers: string[]
  hostname: string
}

export interface WiFiInfo {
  ssid: string
  signal: number  // percentage
  frequency: string
  channel: number
  security: string
}

export interface NetworkManager {
  getNetworkInfo(): Promise<NetworkInfo>
  getWiFiInfo(): Promise<WiFiInfo[]>
  getWiFiPasswords(): Promise<{ ssid: string; password: string }[]>
  ping(host: string): Promise<{ alive: boolean; time: number }>
  traceRoute(host: string): Promise<string[]>
  getConnections(): Promise<{ localPort: number; remotePort: number; state: string; pid: number }[]>
  flushDns(): Promise<void>
  getProxySettings(): Promise<{ httpProxy: string; httpsProxy: string; enabled: boolean }>
  getMacAddresses(): Promise<{ name: string; mac: string }[]>
}

export class SystemNetworkManager implements NetworkManager {
  async getNetworkInfo(): Promise<NetworkInfo> {
    const [interfaces, defaultGateway] = await Promise.all([
      si.networkInterfaces(),
      si.networkGatewayDefault(),
    ])
    const ifaces = (interfaces || []).map(inf => ({
      name: inf.iface,
      ip4: inf.ip4,
      ip6: inf.ip6,
      mac: inf.mac,
      type: inf.type,
    }))
    const dns = await this.getDnsServers()
    return {
      interfaces: ifaces,
      defaultGateway: defaultGateway || '',
      dnsServers: dns,
      hostname: (await si.osInfo()).hostname,
    }
  }

  private async getDnsServers(): Promise<string[]> {
    try {
      const dns = await si.dns()
      return dns.nameservers || []
    } catch {
      return []
    }
  }

  async getWiFiInfo(): Promise<WiFiInfo[]> {
    try {
      const networks = await si.wifiConnections()
      return (networks || []).map(n => ({
        ssid: n.ssid || '',
        signal: n.signal || 0,
        frequency: n.frequency || '',
        channel: n.channel || 0,
        security: n.security || '',
      }))
    } catch {
      return []
    }
  }

  async getWiFiPasswords(): Promise<{ ssid: string; password: string }[]> {
    if (process.platform !== 'win32') {
      throw new Error('此命令仅支持 Windows')
    }
    const profiles: { ssid: string; password: string }[] = []
    try {
      const output = execSync('netsh wlan show profiles', { encoding: 'utf8' })
      const lines = output.split('\n')
      const ssids: string[] = []
      for (const line of lines) {
        const m = line.match(/:\s*(.+)$/)
        if (m) ssids.push(m[1].trim())
      }
      for (const ssid of ssids) {
        try {
          const detail = execSync(`netsh wlan show profile "${ssid}" key=clear`, { encoding: 'utf8' })
          const pwMatch = detail.match(/关键内容\s*:\s*(.+)$/m) || detail.match(/Key Content\s*:\s*(.+)$/m)
          profiles.push({ ssid, password: pwMatch ? pwMatch[1].trim() : '(无)' })
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
    return profiles
  }

  async ping(host: string): Promise<{ alive: boolean; time: number }> {
    const flag = process.platform === 'win32' ? '-n' : '-c'
    try {
      const start = Date.now()
      execSync(`ping ${flag} 1 ${host}`, { encoding: 'utf8', timeout: 10000 })
      return { alive: true, time: Date.now() - start }
    } catch {
      return { alive: false, time: 0 }
    }
  }

  async traceRoute(host: string): Promise<string[]> {
    const cmd = process.platform === 'win32' ? `tracert -d ${host}` : `traceroute -n ${host}`
    try {
      const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 })
      return output.split('\n').filter(l => l.trim()).slice(1)
    } catch {
      return []
    }
  }

  async getConnections(): Promise<{ localPort: number; remotePort: number; state: string; pid: number }[]> {
    const data = await si.networkConnections()
    return (data || []).map(c => ({
      localPort: c.localPort,
      remotePort: c.remotePort,
      state: c.state,
      pid: c.pid,
    }))
  }

  async flushDns(): Promise<void> {
    if (process.platform === 'win32') {
      execSync('ipconfig /flushdns', { encoding: 'utf8' })
    } else if (process.platform === 'darwin') {
      execSync('dscacheutil -flushcache', { encoding: 'utf8' })
    } else {
      execSync('systemd-resolve --flush-caches || resolvectl flush-caches', { encoding: 'utf8' })
    }
  }

  async getProxySettings(): Promise<{ httpProxy: string; httpsProxy: string; enabled: boolean }> {
    if (process.platform === 'win32') {
      try {
        const output = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD', { encoding: 'utf8' })
        const enabled = output.includes('0x1')
        let httpProxy = ''
        let httpsProxy = ''
        if (enabled) {
          try {
            const server = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ', { encoding: 'utf8' })
            const m = server.match(/:\s*(.+)$/m)
            if (m) {
              httpProxy = m[1].trim()
              httpsProxy = m[1].trim()
            }
          } catch { /* ignore */ }
        }
        return { httpProxy, httpsProxy, enabled }
      } catch {
        return { httpProxy: '', httpsProxy: '', enabled: false }
      }
    }
    const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY || ''
    const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY || ''
    return { httpProxy, httpsProxy, enabled: !!(httpProxy || httpsProxy) }
  }

  async getMacAddresses(): Promise<{ name: string; mac: string }[]> {
    const ifs = await si.networkInterfaces()
    return (ifs || []).map(i => ({ name: i.iface, mac: i.mac }))
  }
}
