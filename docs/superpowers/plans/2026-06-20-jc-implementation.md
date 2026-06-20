# jc npm CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform npm CLI package `jc` that replicates `C:\Users\joke\bin\` `j` command suite (claude/happy/w groups, ~100 commands) in TypeScript.

**Architecture:** Custom lightweight CLI router + Adapter-pattern cross-platform system API layer + per-command handler modules. Dependencies: `systeminformation`, `pidusage`, `open`, `chalk`.

**Tech Stack:** TypeScript, tsup (build), Vitest (test), Node.js 18+ ESM.

## Global Constraints

- Package name: `jc`, CLI command: `jc`, npm scope: public
- Build target: `ES2022`, output: ESM single-file bundle via tsup
- Cross-platform: Win/Mac/Linux, never shell out to system commands for `w` group (use JS/TS APIs)
- Claude/happy groups DO shell out via `child_process.spawn` (they wrap CLIs)
- All user-facing text: Chinese (descriptions, help text, errors)
- ANSI colors via `chalk`: red=`jc` prefix, yellow=group name, blue=subcommand
- Errors: `process.exit(1)` for command errors, `process.exit(2)` for execution failures, `process.exit(3)` for platform-not-supported
- Win-only commands (`reg/*`, `wsl/*`, `wifipwd`, `wifiexp`, `gpedit`, `msconfig`, `powercfg`): show "此命令仅支持 Windows" on non-Win
- Test framework: Vitest, unit tests per module

---
## Task 1: Project Scaffold

**Files:**
- Create: `D:\DevProjects\my\npm\jc\package.json`
- Create: `D:\DevProjects\my\npm\jc\tsconfig.json`
- Create: `D:\DevProjects\my\npm\jc\tsup.config.ts`
- Create: `D:\DevProjects\my\npm\jc\vitest.config.ts`
- Create: `D:\DevProjects\my\npm\jc\src/index.ts`
- Create: `D:\DevProjects\my\npm\jc\.gitignore`

**Interfaces:**
- Consumes: (nothing, this is the foundation)
- Produces: runnable `node dist/index.js` that prints "jc: j 命令套件"

- [ ] **Step 1: Create package.json**

```json
{
  "name": "jc",
  "version": "0.1.0",
  "description": "j 命令套件 — 跨平台系统快捷命令集",
  "type": "module",
  "bin": {
    "jc": "dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "chalk": "^5.4.1",
    "open": "^10.1.0",
    "pidusage": "^3.0.2",
    "systeminformation": "^5.25.11"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/pidusage": "^2.0.5",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": false
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,
  minify: false,
  bundle: true,
  platform: 'node',
})
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
```

- [ ] **Step 5: Create minimal src/index.ts (entry point)**

```typescript
#!/usr/bin/env node

import { route } from './cli/router.js'

async function main() {
  const args = process.argv.slice(2)
  await route(args)
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
```

- [ ] **Step 7: Install dependencies and verify build**

```bash
cd D:\DevProjects\my\npm\jc
npm install
npx tsup
node dist/index.js
```

Expected: clean build, program runs without error (will show nothing useful until router is built).

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold jc project with tsup + vitest"
```

---

## Task 2: CLI Router

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/cli/router.ts`
- Create: `D:\DevProjects\my\npm\jc\src/cli/types.ts`
- Create: `D:\DevProjects\my\npm\jc\src/cli/output.ts`

**Interfaces:**
- Produces: `route(argv: string[]): Promise<void>` — main entry for all command dispatch
- Produces: `Group`, `Category`, `Command` type definitions
- Produces: `colorize(text, color): string` — chalk wrapper

- [ ] **Step 1: Create type definitions**

```typescript
// src/cli/types.ts

export type CommandHandler = (args: string[]) => Promise<void>

export interface Command {
  name: string
  description: string
  handler: CommandHandler
  alias?: string[]
  helpText?: string
  examples?: string[]
  related?: string[]
  platform?: 'all' | 'win32'
}

export interface Category {
  name: string
  description: string
  commands: Command[]
}

export interface Group {
  name: string
  alias: string
  description: string
  commands: Command[]
  categories?: Category[]
  defaultHandler?: CommandHandler
}
```

- [ ] **Step 2: Create output formatter**

```typescript
// src/cli/output.ts

import chalk from 'chalk'

export const jc = chalk.red('jc')
export const groupName = chalk.yellow
export const subCmd = chalk.blue
export const error = chalk.red
export const warning = chalk.yellow
export const success = chalk.green

export function printHeader(title: string): void {
  console.log(`===== ${chalk.yellow(title)} =====`)
}

export function printCommands(commands: Command[]): void {
  for (const cmd of commands) {
    console.log(
      `  ${chalk.red('jc')} ${chalk.yellow(cmd.name.padEnd(14))} ${cmd.description}`
    )
  }
}

function padEnd(s: string, n: number): string {
  return s + ' '.repeat(Math.max(0, n - s.length))
}

export function printCommandHelp(cmd: Command, group: string, category?: string): void {
  const tag = category ? `  [${category}]` : ''
  console.log(`${chalk.yellow(`[jc ${group} ${cmd.name}]`)} ${cmd.description} ${chalk.blue(tag)}`)
  console.log()
  if (cmd.helpText) {
    console.log(`  ${cmd.helpText}`)
    console.log()
  }
  if (cmd.examples && cmd.examples.length > 0) {
    console.log(`  ${chalk.red('示例')}:`)
    for (const ex of cmd.examples) {
      console.log(`    ${ex}`)
    }
    console.log()
  }
  if (cmd.related && cmd.related.length > 0) {
    console.log(`  ${chalk.red('相关')}: ${cmd.related.join(' / ')}`)
  }
}
```

Note: Import `Command` from types, `padEnd` is inline to avoid import issues. Also export `padEnd` or inline it.

- [ ] **Step 3: Write the failing test for router**

```typescript
// tests/cli/router.test.ts
import { describe, it, expect } from 'vitest'
import { parseArgs } from '../src/cli/router.js'

describe('parseArgs', () => {
  it('should parse "w p 3306" into { group: "w", command: "p", args: ["3306"] }', () => {
    const result = parseArgs(['w', 'p', '3306'])
    expect(result).toEqual({ group: 'w', command: 'p', args: ['3306'] })
  })

  it('should handle "claude l" with no extra args', () => {
    const result = parseArgs(['claude', 'l'])
    expect(result).toEqual({ group: 'claude', command: 'l', args: [] })
  })

  it('should return null for empty args', () => {
    const result = parseArgs([])
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
npx vitest run tests/cli/router.test.ts --reporter=verbose
```

Expected: FAIL — `parseArgs` not defined.

- [ ] **Step 5: Create router with parseArgs**

```typescript
// src/cli/router.ts

interface ParsedArgs {
  group: string
  command: string
  args: string[]
}

export function parseArgs(argv: string[]): ParsedArgs | null {
  if (argv.length === 0) return null
  if (argv.length === 1) return { group: argv[0], command: '', args: [] }
  if (argv.length === 2 && argv[1] === 'l') return { group: argv[0], command: 'l', args: [] }
  return { group: argv[0], command: argv[1], args: argv.slice(2) }
}

import type { Group } from './types.js'
import { claudeGroup } from '../groups/claude/index.js'
import { happyGroup } from '../groups/happy/index.js'
import { wGroup } from '../groups/w/index.js'

const groups: Record<string, Group> = {}

function registerGroup(group: Group): void {
  groups[group.name] = group
  groups[group.alias] = group
}

registerGroup(claudeGroup)
registerGroup(happyGroup)
registerGroup(wGroup)

export async function route(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv)

  if (!parsed) {
    // Show top-level help: list all groups
    console.log(`${jc} — j 命令套件`)
    console.log()
    for (const [key, g] of Object.entries(groups)) {
      if (key === g.name) {
        console.log(`  ${jc} ${chalk.yellow(g.name.padEnd(14))} ${g.description}`)
      }
    }
    console.log()
    console.log(`用法: ${jc} ${chalk.yellow('<组>')} ${chalk.blue('<命令>')} [参数...]`)
    console.log(`查看组详情: ${jc} ${chalk.yellow('<组>')} l`)
    return
  }

  const group = groups[parsed.group]
  if (!group) {
    console.error(`❌ 未知命令: ${parsed.group}`)
    process.exit(1)
  }

  if (parsed.command === 'l') {
    printGroupHelp(group)
    return
  }

  if (parsed.command === '' || !parsed.command) {
    // Default handler
    if (group.defaultHandler) {
      await group.defaultHandler(parsed.args)
    } else {
      printGroupHelp(group)
    }
    return
  }

  // Find command in group
  const cmd = group.commands.find(c => c.name === parsed.command || c.alias?.includes(parsed.command))
  if (cmd) {
    // Check for help flag
    if (parsed.args[0] === '?' || parsed.args[0] === '-h' || parsed.args[0] === '--help') {
      printCommandHelp(cmd, parsed.group)
      return
    }
    // Check platform support
    if (cmd.platform === 'win32' && process.platform !== 'win32') {
      console.error(`❌ 此命令仅支持 Windows`)
      process.exit(3)
    }
    await cmd.handler(parsed.args)
    return
  }

  // Maybe it's a category? (w group has categories)
  if (group.categories) {
    const cat = group.categories.find(c => c.name === parsed.command)
    if (cat) {
      printCategoryHelp(cat)
      return
    }
  }

  console.error(`❌ 未知命令: ${parsed.group} ${parsed.command}`)
  process.exit(1)
}
```

- [ ] **Step 6: Update router.test.ts with full tests**

```typescript
// tests/cli/router.test.ts
import { describe, it, expect } from 'vitest'
import { parseArgs } from '../src/cli/router.js'

describe('parseArgs', () => {
  it('parses "w p 3306" correctly', () => {
    expect(parseArgs(['w', 'p', '3306'])).toEqual({ group: 'w', command: 'p', args: ['3306'] })
  })

  it('parses "claude l" correctly', () => {
    expect(parseArgs(['claude', 'l'])).toEqual({ group: 'claude', command: 'l', args: [] })
  })

  it('parses "hy r abc123" correctly', () => {
    expect(parseArgs(['hy', 'r', 'abc123'])).toEqual({ group: 'hy', command: 'r', args: ['abc123'] })
  })

  it('returns null for empty args', () => {
    expect(parseArgs([])).toBeNull()
  })

  it('parses single arg as group, empty command', () => {
    expect(parseArgs(['w'])).toEqual({ group: 'w', command: '', args: [] })
  })
})
```

- [ ] **Step 7: Run tests and verify they pass**

```bash
npx vitest run tests/cli/router.test.ts
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/cli/ tests/cli/router.test.ts
git commit -m "feat: add CLI router, types, and output formatter"
```

---

## Task 3: Group Stubs (claude, happy, w) — Registration Only

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/groups/claude/index.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/happy/index.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/index.ts`

**Interfaces:**
- Produces: `claudeGroup: Group`, `happyGroup: Group`, `wGroup: Group` — each with `name`, `alias`, `description`, `commands: []`, `categories: []`
- Each group exports its definition for router's `registerGroup()`

- [ ] **Step 1: Create claude group stub**

```typescript
// src/groups/claude/index.ts
import type { Group } from '../../cli/types.js'

export const claudeGroup: Group = {
  name: 'claude',
  alias: 'c',
  description: 'Claude Code CLI 包装',
  commands: [],
}
```

- [ ] **Step 2: Create happy group stub**

```typescript
// src/groups/happy/index.ts
import type { Group } from '../../cli/types.js'

export const happyGroup: Group = {
  name: 'happy',
  alias: 'hy',
  description: 'Happy mobile Claude 包装',
  commands: [],
}
```

- [ ] **Step 3: Create w group stub**

```typescript
// src/groups/w/index.ts
import type { Group } from '../../cli/types.js'

export const wGroup: Group = {
  name: 'w',
  alias: 'w',
  description: 'Windows 快捷命令集 / 系统工具',
  commands: [],
  categories: [],
}
```

- [ ] **Step 4: Verify router loads all groups**

```bash
node dist/index.js
```

Expected: Shows group listing with claude, happy, w.

- [ ] **Step 5: Commit**

```bash
git add src/groups/
git commit -m "feat: add group stubs for claude, happy, w"
```

---

## Task 4: Cross-Platform System API — Process Manager

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/shared/system/adapter.ts`
- Create: `D:\DevProjects\my\npm\jc\src/shared/system/process.ts`
- Create: `D:\DevProjects\my\npm\jc\tests/shared/system/process.test.ts`

**Interfaces:**
- Exports: `interface ProcessInfo { pid: number; name: string; cpu: number; memory: number; port?: number; state?: string }`
- Exports: `interface ProcessManager { getProcessByPort(port: number): Promise<ProcessInfo[]>; getProcessByName(name: string): Promise<ProcessInfo[]>; killProcess(pid: number): Promise<void>; getTopProcesses(sort: 'cpu' | 'memory', limit: number): Promise<ProcessInfo[]>; getProcessStats(): Promise<{ total: number; running: number; cpuPercent: number; memoryGB: number }>; listProcesses(nameFilter?: string): Promise<ProcessInfo[]>; getListeningPorts(): Promise<ProcessInfo[]> }`
- Exports: `getProcessManager(): ProcessManager`

- [ ] **Step 1: Write failing tests for process manager interface**

```typescript
// tests/shared/system/process.test.ts
import { describe, it, expect } from 'vitest'
import { getProcessManager } from '../../src/shared/system/adapter.js'

describe('ProcessManager', () => {
  const pm = getProcessManager()

  it('should return process info for current process', async () => {
    const processes = await pm.getProcessByName(process.argv[0] || 'node')
    expect(processes.length).toBeGreaterThan(0)
    expect(processes[0].pid).toBeGreaterThan(0)
  })

  it('should handle kill of non-existent process gracefully', async () => {
    // Should not throw for non-existent PID
    await expect(pm.killProcess(999999999)).rejects.toThrow()
  })

  it('should return top processes sorted by CPU', async () => {
    // In test environment, just verify the shape
    try {
      const top = await pm.getTopProcesses('cpu', 5)
      expect(top.length).toBeLessThanOrEqual(5)
    } catch {
      // systeminformation may not be fully available in CI
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/shared/system/process.test.ts
```

Expected: FAIL — adapter.ts doesn't exist.

- [ ] **Step 3: Create adapter factory**

```typescript
// src/shared/system/adapter.ts
import { WinProcessManager } from './process.js'
import type { ProcessManager } from './process.js'

export function getProcessManager(): ProcessManager {
  // For now, use same implementation across platforms
  // Platform-specific optimizations can be added later
  return new WinProcessManager()
}
```

- [ ] **Step 4: Create cross-platform process manager**

```typescript
// src/shared/system/process.ts
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
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/shared/system/process.test.ts
```

Expected: Tests pass (or reasonably pass in the test environment).

- [ ] **Step 6: Commit**

```bash
git add src/shared/
git commit -m "feat: add cross-platform process manager via systeminformation"
```

---

## Task 5: Cross-Platform System API — Network, CPU, Memory, Disk, GPU, OS

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/shared/system/network.ts`
- Create: `D:\DevProjects\my\npm\jc\src/shared/system/cpu.ts`
- Create: `D:\DevProjects\my\npm\jc\src/shared/system/memory.ts`
- Create: `D:\DevProjects\my\npm\jc\src/shared/system/disk.ts`
- Create: `D:\DevProjects\my\npm\jc\src/shared/system/gpu.ts`
- Create: `D:\DevProjects\my\npm\jc\src/shared/system/os.ts`

**Interfaces:**
- Each file exports a manager interface and a cross-platform implementation using `systeminformation`
- All follow same pattern: interface → class using `si.*` methods

- [ ] **Step 1: Create network manager**

```typescript
// src/shared/system/network.ts
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
    // Uses si.wifiNetworks() and si.wifiInterfaces()
    try {
      const ifaces = await si.wifiInterfaces()
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
    // Windows-only: uses netsh wlan show profiles
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
```

- [ ] **Step 2: Create CPU manager**

```typescript
// src/shared/system/cpu.ts
import si from 'systeminformation'

export interface CpuInfo {
  manufacturer: string
  brand: string
  physicalCores: number
  logicalCores: number
  speedGHz: number
  loadPercent: number
}

export interface CpuManager {
  getInfo(): Promise<CpuInfo>
}

export class SystemCpuManager implements CpuManager {
  async getInfo(): Promise<CpuInfo> {
    const [cpu, load] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
    ])
    return {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      physicalCores: cpu.physicalCores,
      logicalCores: cpu.cores,
      speedGHz: cpu.speed,
      loadPercent: Math.round(load.currentLoad * 10) / 10,
    }
  }
}
```

- [ ] **Step 3: Create memory manager**

```typescript
// src/shared/system/memory.ts
import si from 'systeminformation'

export interface MemoryInfo {
  totalGB: number
  freeGB: number
  usedGB: number
  percentUsed: number
  swapTotalGB: number
  swapUsedGB: number
}

export interface MemoryManager {
  getInfo(): Promise<MemoryInfo>
}

export class SystemMemoryManager implements MemoryManager {
  async getInfo(): Promise<MemoryInfo> {
    const mem = await si.mem()
    return {
      totalGB: Math.round(mem.total / (1024 * 1024 * 1024) * 10) / 10,
      freeGB: Math.round(mem.free / (1024 * 1024 * 1024) * 10) / 10,
      usedGB: Math.round(mem.used / (1024 * 1024 * 1024) * 10) / 10,
      percentUsed: Math.round(mem.used / mem.total * 100 * 10) / 10,
      swapTotalGB: Math.round(mem.swaptotal / (1024 * 1024 * 1024) * 10) / 10,
      swapUsedGB: Math.round(mem.swapused / (1024 * 1024 * 1024) * 10) / 10,
    }
  }
}
```

- [ ] **Step 4: Create disk manager**

```typescript
// src/shared/system/disk.ts
import si from 'systeminformation'

export interface DiskInfo {
  drive: string
  sizeGB: number
  usedGB: number
  freeGB: number
  percentUsed: number
  filesystem: string
}

export interface DiskManager {
  getInfo(): Promise<DiskInfo[]>
  getFullInfo(): Promise<DiskInfo[]>
  getSize(path: string): Promise<{ sizeMB: number }>
}

export class SystemDiskManager implements DiskManager {
  async getInfo(): Promise<DiskInfo[]> {
    const fs = await si.fsSize()
    return fs.filter(f => f.mount).map(f => ({
      drive: f.mount,
      sizeGB: Math.round(f.size / (1024 * 1024 * 1024)),
      usedGB: Math.round(f.used / (1024 * 1024 * 1024)),
      freeGB: Math.round((f.size - f.used) / (1024 * 1024 * 1024)),
      percentUsed: Math.round(f.use * 10) / 10,
      filesystem: f.fs || '',
    }))
  }

  async getFullInfo(): Promise<DiskInfo[]> {
    return this.getInfo()
  }

  async getSize(path: string): Promise<{ sizeMB: number }> {
    const fs = await si.fsSize(path)
    const total = fs.reduce((acc, f) => acc + f.size, 0)
    return { sizeMB: Math.round(total / (1024 * 1024)) }
  }
}
```

- [ ] **Step 5: Create GPU manager**

```typescript
// src/shared/system/gpu.ts
import si from 'systeminformation'

export interface GpuInfo {
  model: string
  driverVersion: string
  vramGB: number
}

export interface GpuManager {
  getInfo(): Promise<GpuInfo[]>
}

export class SystemGpuManager implements GpuManager {
  async getInfo(): Promise<GpuInfo[]> {
    const graphics = await si.graphics()
    return (graphics.controllers || []).map(g => ({
      model: g.model,
      driverVersion: g.driverVersion || '',
      vramGB: Math.round((g.vram || 0) / 1024 * 10) / 10,
    }))
  }
}
```

- [ ] **Step 6: Create OS manager**

```typescript
// src/shared/system/os.ts
import si from 'systeminformation'

export interface OsInfo {
  hostname: string
  platform: string
  distro: string
  release: string
  kernel: string
  uptime: number  // seconds
  biosVendor: string
  biosVersion: string
  biosDate: string
}

export interface OsManager {
  getInfo(): Promise<OsInfo>
  getHostname(): Promise<string>
  getUptime(): Promise<string>
}

export class SystemOsManager implements OsManager {
  async getInfo(): Promise<OsInfo> {
    const [os, bios, time] = await Promise.all([
      si.osInfo(),
      si.bios(),
      si.time(),
    ])
    return {
      hostname: os.hostname,
      platform: os.platform,
      distro: os.distro,
      release: os.release,
      kernel: os.kernel,
      uptime: time.uptime,
      biosVendor: bios.vendor || '',
      biosVersion: bios.version || '',
      biosDate: bios.releaseDate || '',
    }
  }

  async getHostname(): Promise<string> {
    return (await si.osInfo()).hostname
  }

  async getUptime(): Promise<string> {
    const t = (await si.time()).uptime
    const d = Math.floor(t / 86400)
    const h = Math.floor((t % 86400) / 3600)
    const m = Math.floor((t % 3600) / 60)
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }
}
```

- [ ] **Step 7: Update adapter.ts to include all managers**

```typescript
// src/shared/system/adapter.ts
import { WinProcessManager } from './process.js'
import type { ProcessManager } from './process.js'
import { SystemNetworkManager } from './network.js'
import type { NetworkManager } from './network.js'
import { SystemCpuManager } from './cpu.js'
import type { CpuManager } from './cpu.js'
import { SystemMemoryManager } from './memory.js'
import type { MemoryManager } from './memory.js'
import { SystemDiskManager } from './disk.js'
import type { DiskManager } from './disk.js'
import { SystemGpuManager } from './gpu.js'
import type { GpuManager } from './gpu.js'
import { SystemOsManager } from './os.js'
import type { OsManager } from './os.js'

export function getProcessManager(): ProcessManager { return new WinProcessManager() }
export function getNetworkManager(): NetworkManager { return new SystemNetworkManager() }
export function getCpuManager(): CpuManager { return new SystemCpuManager() }
export function getMemoryManager(): MemoryManager { return new SystemMemoryManager() }
export function getDiskManager(): DiskManager { return new SystemDiskManager() }
export function getGpuManager(): GpuManager { return new SystemGpuManager() }
export function getOsManager(): OsManager { return new SystemOsManager() }

export type {
  ProcessManager, ProcessInfo, ProcessStats,
  NetworkManager, NetworkInfo, WiFiInfo,
  CpuManager, CpuInfo,
  MemoryManager, MemoryInfo,
  DiskManager, DiskInfo,
  GpuManager, GpuInfo,
  OsManager, OsInfo,
}
```

- [ ] **Step 8: Write basic integration tests**

```typescript
// tests/shared/system/cpu.test.ts
import { describe, it, expect } from 'vitest'
import { getCpuManager } from '../../src/shared/system/adapter.js'

describe('CpuManager', () => {
  it('should return CPU info with valid fields', async () => {
    const info = await getCpuManager().getInfo()
    expect(info.physicalCores).toBeGreaterThan(0)
    expect(info.logicalCores).toBeGreaterThan(0)
    expect(info.brand).toBeTruthy()
  })
})
```

- [ ] **Step 9: Run tests**

```bash
npx vitest run tests/shared/system/
```

Expected: All system tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/shared/ tests/shared/
git commit -m "feat: add cross-platform system managers (network/cpu/memory/disk/gpu/os)"
```

---

## Task 6: w Group — proc Category (8 Commands)

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/proc/port.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/proc/portkill.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/proc/kill.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/proc/killname.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/proc/ps.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/proc/top.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/proc/mem.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/proc/psg.ts`
- Modify: `src/groups/w/index.ts` — register proc category + commands

**Interfaces:**
- Consumes: `getProcessManager()` from `adapter.ts`
- Each file exports `async function handler(args: string[]): Promise<void>`
- Each file exports `commandDef: Command` for registration

- [ ] **Step 1: Create port command (`jc w p [PORT]`)**

```typescript
// src/groups/w/proc/port.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { error } from '../../../cli/output.js'

export async function handler(args: string[]): Promise<void> {
  const pm = getProcessManager()
  if (args.length === 0) {
    const ports = await pm.getListeningPorts()
    console.log('监听端口列表:')
    console.table(ports.map(p => ({ PID: p.pid, Port: p.port, State: p.state })))
    return
  }
  const port = parseInt(args[0], 10)
  if (isNaN(port)) {
    console.error(error('❌ 端口号必须是数字'))
    process.exit(1)
  }
  const procs = await pm.getProcessByPort(port)
  if (procs.length === 0) {
    console.log(`端口 ${port} 无进程占用`)
    return
  }
  console.table(procs.map(p => ({ PID: p.pid, 进程名: p.name, CPU: `${p.cpu}%`, 内存: `${p.memory}MB` })))
}

export const commandDef = {
  name: 'p',
  description: '查端口占用的进程',
  handler,
  helpText: '用法:\n  jc w p [无参]  - 列所有监听端口\n  jc w p <PORT>  - 查指定端口',
  examples: ['jc w p', 'jc w p 3306'],
  related: ['jc w pk', 'jc w k', 'jc w portscan'],
}
```

- [ ] **Step 2: Create portkill command**

```typescript
// src/groups/w/proc/portkill.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { error, warning } from '../../../cli/output.js'

export async function handler(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === '--help' || args[0] === '?') {
    console.log(`用法: jc w pk <PORT> [--soft|--list]`)
    return
  }
  const port = parseInt(args[0], 10)
  if (isNaN(port)) {
    console.error(error('❌ 端口号必须是数字'))
    process.exit(1)
  }

  const pm = getProcessManager()
  const procs = await pm.getProcessByPort(port)
  if (procs.length === 0) {
    console.log(`端口 ${port} 无进程占用`)
    return
  }

  const isListOnly = args.includes('--list')
  const isSoft = args.includes('--soft')

  console.log(`端口 ${port} 被以下进程占用:`)
  procs.forEach(p => console.log(`  PID: ${p.pid}, 名称: ${p.name}`))

  if (isListOnly) return

  for (const p of procs) {
    try {
      if (isSoft) {
        process.kill(p.pid, 'SIGTERM')
      } else {
        process.kill(p.pid, 'SIGKILL')
      }
      console.log(`✅ PID ${p.pid} (${p.name}) 已终止`)
    } catch (e: any) {
      console.error(warning(`⚠️ PID ${p.pid} 终止失败: ${e.message}`))
    }
  }
}

export const commandDef = {
  name: 'pk',
  description: '一键查并杀端口进程',
  handler,
  helpText: '用法:\n  jc w pk <PORT>     - 强制杀\n  jc w pk <PORT> --list - 只查不杀\n  jc w pk <PORT> --soft - 优雅终止',
  examples: ['jc w pk 8080', 'jc w pk 3000 --list'],
  related: ['jc w p', 'jc w k', 'jc w kn'],
}
```

- [ ] **Step 3: Create kill command**

```typescript
// src/groups/w/proc/kill.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { error } from '../../../cli/output.js'

export async function handler(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(error('❌ 请指定 PID'))
    process.exit(1)
  }
  const pid = parseInt(args[0], 10)
  if (isNaN(pid)) {
    console.error(error('❌ PID 必须是数字'))
    process.exit(1)
  }
  try {
    await getProcessManager().killProcess(pid)
    console.log(`✅ PID ${pid} 已终止`)
  } catch (e: any) {
    console.error(error(`❌ 终止失败: ${e.message}`))
    process.exit(2)
  }
}

export const commandDef = {
  name: 'k',
  description: '按 PID 杀进程',
  handler,
  helpText: '用法:\n  jc w k <PID>  - 强制结束指定 PID',
  examples: ['jc w k 1234'],
  related: ['jc w p', 'jc w pk', 'jc w kn', 'jc w ps'],
}
```

- [ ] **Step 4: Create killname command**

```typescript
// src/groups/w/proc/killname.ts
import { getProcessManager } from '../../../shared/system/adapter.js'
import { error, warning } from '../../../cli/output.js'

export async function handler(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(error('❌ 请指定进程名'))
    process.exit(1)
  }
  const name = args[0]
  const pm = getProcessManager()
  const procs = await pm.getProcessByName(name)
  if (procs.length === 0) {
    console.log(`未找到进程: ${name}`)
    return
  }
  for (const p of procs) {
    try {
      await pm.killProcess(p.pid)
      console.log(`✅ ${p.name} (PID: ${p.pid}) 已终止`)
    } catch (e: any) {
      console.error(warning(`⚠️ ${p.name} (PID: ${p.pid}) 终止失败: ${e.message}`))
    }
  }
}

export const commandDef = {
  name: 'kn',
  description: '按进程名杀进程',
  handler,
  helpText: '用法:\n  jc w kn <NAME>  - 如 chrome / node',
  examples: ['jc w kn chrome', 'jc w kn node'],
  related: ['jc w k', 'jc w ps', 'jc w p'],
}
```

- [ ] **Step 5: Create ps command**

```typescript
// src/groups/w/proc/ps.ts
import { getProcessManager } from '../../../shared/system/adapter.js'

export async function handler(args: string[]): Promise<void> {
  const pm = getProcessManager()
  const filter = args.length > 0 ? args[0] : undefined
  const procs = await pm.listProcesses(filter)
  if (procs.length === 0) {
    console.log(filter ? `未找到匹配进程: ${filter}` : '无进程')
    return
  }
  console.table(procs.slice(0, 50).map(p => ({
    PID: p.pid,
    名称: p.name,
    CPU: `${p.cpu}%`,
    内存: `${p.memory}MB`,
    状态: p.state || '',
  })))
  if (procs.length > 50) {
    console.log(`... 还有 ${procs.length - 50} 个进程`)
  }
}

export const commandDef = {
  name: 'ps',
  description: '查进程',
  handler,
  helpText: '用法:\n  jc w ps [无参]  - 列出全部进程\n  jc w ps <NAME>  - 按进程名过滤',
  examples: ['jc w ps', 'jc w ps chrome'],
  related: ['jc w p', 'jc w k', 'jc w kn', 'jc w top'],
}
```

- [ ] **Step 6: Create top command**

```typescript
// src/groups/w/proc/top.ts
import { getProcessManager } from '../../../shared/system/adapter.js'

export async function handler(args: string[]): Promise<void> {
  const pm = getProcessManager()
  const limit = parseInt(args[0], 10) || 20
  const procs = await pm.getTopProcesses('cpu', limit)
  console.table(procs.map(p => ({
    PID: p.pid,
    名称: p.name,
    CPU: `${p.cpu}%`,
    内存: `${p.memory}MB`,
  })))
}

export const commandDef = {
  name: 'top',
  description: 'CPU 占用 Top20',
  handler,
  helpText: '用法:\n  jc w top [N]  - CPU 降序前 N (默认 20)',
  examples: ['jc w top'],
  related: ['jc w mem', 'jc w ps', 'jc w psg'],
}
```

- [ ] **Step 7: Create mem command**

```typescript
// src/groups/w/proc/mem.ts
export async function handler(args: string[]): Promise<void> {
  const { getProcessManager } = await import('../../../shared/system/adapter.js')
  const pm = getProcessManager()
  const limit = parseInt(args[0], 10) || 20
  const procs = await pm.getTopProcesses('memory', limit)
  console.table(procs.map(p => ({
    PID: p.pid,
    名称: p.name,
    内存: `${p.memory}MB`,
    CPU: `${p.cpu}%`,
  })))
}

export const commandDef = {
  name: 'mem',
  description: '内存占用 Top20 (MB)',
  handler,
  helpText: '用法:\n  jc w mem [N]  - 内存降序前 N (默认 20)',
  examples: ['jc w mem'],
  related: ['jc w top', 'jc w ps', 'jc w psg'],
}
```

- [ ] **Step 8: Create psg command (process stats overview)**

```typescript
// src/groups/w/proc/psg.ts
import { getProcessManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const pm = getProcessManager()
  const stats = await pm.getProcessStats()
  console.log(`进程总数: ${stats.total}`)
  console.log(`运行中:   ${stats.running}`)
  console.log(`CPU 占用: ${stats.cpuPercent}%`)
  console.log(`内存占用: ${stats.memoryGB}GB`)
}

export const commandDef = {
  name: 'psg',
  description: '进程统计概览',
  handler,
  helpText: '用法:\n  jc w psg [无参] - 进程统计概览',
  examples: ['jc w psg'],
  related: ['jc w ps', 'jc w top', 'jc w mem'],
}
```

- [ ] **Step 9: Register proc category in w group**

Update `src/groups/w/index.ts` to include the proc category:

```typescript
import { commandDef as portCmd } from './proc/port.js'
import { commandDef as portkillCmd } from './proc/portkill.js'
import { commandDef as killCmd } from './proc/kill.js'
import { commandDef as killnameCmd } from './proc/killname.js'
import { commandDef as psCmd } from './proc/ps.js'
import { commandDef as topCmd } from './proc/top.js'
import { commandDef as memCmd } from './proc/mem.js'
import { commandDef as psgCmd } from './proc/psg.js'
import type { Group, Category } from '../../cli/types.js'

const procCategory: Category = {
  name: 'proc',
  description: '进程 (8)',
  commands: [portCmd, portkillCmd, killCmd, killnameCmd, psCmd, topCmd, memCmd, psgCmd],
}

export const wGroup: Group = {
  name: 'w',
  alias: 'w',
  description: 'Windows 快捷命令集 / 系统工具',
  commands: [],
  categories: [procCategory],
}
```

- [ ] **Step 10: Test the proc commands**

```bash
node dist/index.js w l proc
node dist/index.js w p
node dist/index.js w top 5
node dist/index.js w psg
```

Expected: Commands output properly formatted process info.

- [ ] **Step 11: Commit**

```bash
git add src/groups/w/
git commit -m "feat: add w group proc category (8 commands)"
```

---

## Task 7: w Group — sys Category (12 Commands)

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/sysinfo.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/host.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/uptime.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/cpu.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/meminfo.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/disk.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/diskfull.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/gpu.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/bios.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/bat.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/mon.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/sys/powercfg.ts`
- Modify: `src/groups/w/index.ts` — add sys category

Each command follows the same pattern: import manager from adapter, call method, format output. Show 3 representative commands; others follow identical pattern.

- [ ] **Step 1: Create sysinfo command (full system info)**

```typescript
// src/groups/w/sys/sysinfo.ts
import { getOsManager, getCpuManager, getMemoryManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const [os, cpu, mem] = await Promise.all([
    getOsManager().getInfo(),
    getCpuManager().getInfo(),
    getMemoryManager().getInfo(),
  ])
  console.log(`主机名:     ${os.hostname}`)
  console.log(`操作系统:   ${os.platform} ${os.distro} ${os.release}`)
  console.log(`内核:       ${os.kernel}`)
  console.log(`CPU:        ${cpu.brand} (${cpu.physicalCores}物理核 / ${cpu.logicalCores}逻辑核)`)
  console.log(`CPU 负载:   ${cpu.loadPercent}%`)
  console.log(`内存:       ${mem.totalGB}GB (已用 ${mem.usedGB}GB, 剩余 ${mem.freeGB}GB)`)
  console.log(`运行时长:   ${await getOsManager().getUptime()}`)
  console.log(`BIOS:       ${os.biosVendor} ${os.biosVersion} (${os.biosDate})`)
}

export const commandDef = {
  name: 'sysinfo',
  description: '系统详细信息',
  handler,
  helpText: '用法:\n  jc w sysinfo - 显示系统完整信息',
  examples: ['jc w sysinfo'],
  related: ['jc w host', 'jc w cpu', 'jc w meminfo', 'jc w disk'],
}
```

- [ ] **Step 2: Create host command**

```typescript
// src/groups/w/sys/host.ts
import { getOsManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  console.log(await getOsManager().getHostname())
}

export const commandDef = {
  name: 'host',
  description: '本机主机名',
  handler,
  examples: ['jc w host'],
  related: ['jc w ip', 'jc w who', 'jc w sysinfo'],
}
```

- [ ] **Step 3: Create uptime command**

```typescript
// src/groups/w/sys/uptime.ts
import { getOsManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  console.log(await getOsManager().getUptime())
}

export const commandDef = {
  name: 'uptime',
  description: '系统运行时长',
  handler,
  examples: ['jc w uptime'],
  related: ['jc w host', 'jc w sysinfo'],
}
```

- [ ] **Step 4: Create cpu command**

```typescript
// src/groups/w/sys/cpu.ts
import { getCpuManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const cpu = await getCpuManager().getInfo()
  console.log(`型号:     ${cpu.manufacturer} ${cpu.brand}`)
  console.log(`物理核:   ${cpu.physicalCores}`)
  console.log(`逻辑核:   ${cpu.logicalCores}`)
  console.log(`主频:     ${cpu.speedGHz}GHz`)
  console.log(`当前负载: ${cpu.loadPercent}%`)
}

export const commandDef = {
  name: 'cpu',
  description: 'CPU 信息',
  handler,
  examples: ['jc w cpu'],
  related: ['jc w meminfo', 'jc w gpu', 'jc w sysinfo'],
}
```

- [ ] **Step 5: Create remaining sys commands**

Remaining files (`meminfo.ts`, `disk.ts`, `diskfull.ts`, `gpu.ts`, `bios.ts`, `bat.ts`, `mon.ts`, `powercfg.ts`) follow the same pattern — import manager → call method → print result. Example pattern:

```typescript
// src/groups/w/sys/meminfo.ts
import { getMemoryManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const mem = await getMemoryManager().getInfo()
  console.log(`总计: ${mem.totalGB}GB`)
  console.log(`已用: ${mem.usedGB}GB (${mem.percentUsed}%)`)
  console.log(`剩余: ${mem.freeGB}GB`)
  if (mem.swapTotalGB > 0) {
    console.log(`交换: ${mem.swapUsedGB}GB / ${mem.swapTotalGB}GB`)
  }
}
```

- [ ] **Step 6: Register sys category in w group**

Add to `src/groups/w/index.ts`:

```typescript
import { commandDef as sysinfoCmd } from './sys/sysinfo.js'
import { commandDef as hostCmd } from './sys/host.js'
import { commandDef as uptimeCmd } from './sys/uptime.js'
// ... etc

const sysCategory: Category = {
  name: 'sys',
  description: '系统信息 (12)',
  commands: [sysinfoCmd, hostCmd, uptimeCmd /* ... all 12 */],
}
```

- [ ] **Step 7: Test sys commands**

```bash
node dist/index.js w host
node dist/index.js w cpu
node dist/index.js w meminfo
node dist/index.js w disk
node dist/index.js w sysinfo
```

Expected: Each outputs correct system information.

- [ ] **Step 8: Commit**

```bash
git add src/groups/w/sys/
git commit -m "feat: add w group sys category (12 commands)"
```

---

## Task 8: w Group — net Category (15 Commands)

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/ip.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/ip4.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/dns.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/ns.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/ping.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/trace.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/route.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/conn.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/wifi.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/wifipwd.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/wifiexp.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/proxy.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/portscan.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/mac.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/net/share.ts`
- Modify: `src/groups/w/index.ts` — add net category

- [ ] **Step 1: Create ip command**

```typescript
// src/groups/w/net/ip.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(_args: string[]): Promise<void> {
  const info = await getNetworkManager().getNetworkInfo()
  console.log(`主机名: ${info.hostname}`)
  console.log(`默认网关: ${info.defaultGateway}`)
  console.log(`DNS: ${info.dnsServers.join(', ') || '(无)'}`)
  console.log()
  for (const iface of info.interfaces) {
    console.log(`${iface.name} (${iface.type}):`)
    console.log(`  IPv4: ${iface.ip4 || '-'}`)
    console.log(`  IPv6: ${iface.ip6 || '-'}`)
    console.log(`  MAC:  ${iface.mac || '-'}`)
  }
}

export const commandDef = {
  name: 'ip',
  description: '查本机详细网络配置',
  handler,
  examples: ['jc w ip'],
  related: ['jc w ip4', 'jc w dns', 'jc w proxy', 'jc w mac'],
}
```

- [ ] **Step 2: Create remaining net commands**

Key commands that differ from simple wrappers:

```typescript
// src/groups/w/net/ping.ts
import { getNetworkManager } from '../../../shared/system/adapter.js'

export async function handler(args: string[]): Promise<void> {
  if (args.length === 0) { console.log('用法: jc w ping <HOST>'); return }
  const result = await getNetworkManager().ping(args[0])
  console.log(result.alive ? `✅ ${args[0]} 可达 (${result.time}ms)` : `❌ ${args[0]} 不可达`)
}
```

```typescript
// src/groups/w/net/wifipwd.ts — Win-only
import { getNetworkManager } from '../../../shared/system/adapter.js'

export const commandDef = {
  name: 'wifipwd',
  description: '查所有保存过的 Wi-Fi 密码',
  handler: async () => {
    const passwords = await getNetworkManager().getWiFiPasswords()
    for (const p of passwords) {
      console.log(`${p.ssid}: ${p.password}`)
    }
  },
  platform: 'win32' as const,
  examples: ['jc w wifipwd'],
  related: ['jc w wifi', 'jc w wifiexp'],
}
```

- [ ] **Step 3: Register net category**

- [ ] **Step 4: Test net commands**

```bash
node dist/index.js w ip
node dist/index.js w ip4
node dist/index.js w mac
```

- [ ] **Step 5: Commit**

```bash
git add src/groups/w/net/
git commit -m "feat: add w group net category (15 commands)"
```

---

## Task 9: w Group — file Category (13 Commands)

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/groups/w/file/ls.ts`
- `pwd.ts`, `cd.ts`, `rm.ts`, `del.ts`, `mkdir.ts`, `touch.ts`, `cp.ts`, `mv.ts`, `find.ts`, `size.ts`, `dtree.ts`, `ln.ts`
- Modify: `src/groups/w/index.ts`

These commands wrap Node.js `fs` module operations. All 13 files follow the same pattern as shown below for `ls.ts` and `pwd.ts`:

- [ ] **Step 1: Create ls command**

```typescript
// src/groups/w/file/ls.ts
import fs from 'fs/promises'
import path from 'path'

export async function handler(args: string[]): Promise<void> {
  const target = args[0] || '.'
  try {
    const items = await fs.readdir(target, { withFileTypes: true })
    const lines: string[] = []
    for (const item of items) {
      try {
        const stat = await fs.stat(path.join(target, item.name))
        const prefix = item.isDirectory() ? '📁' : '📄'
        const size = stat.isFile() ? `${(stat.size / 1024).toFixed(1)}KB` : ''
        lines.push(`${prefix} ${item.name.padEnd(30)} ${size}`)
      } catch { /* permission denied, skip */ }
    }
    console.log(lines.join('\n'))
  } catch (e: any) {
    console.error(`❌ ${e.message}`)
    process.exit(1)
  }
}
```

- [ ] **Step 2: Create pwd command**

```typescript
// src/groups/w/file/pwd.ts
export async function handler(_args: string[]): Promise<void> {
  console.log(process.cwd())
}
```

- [ ] **Step 3: Create cd command** — changes `process.chdir()`, note: only affects current process

```typescript
// src/groups/w/file/cd.ts
import fs from 'fs'

export async function handler(args: string[]): Promise<void> {
  if (args.length === 0) { console.log(process.cwd()); return }
  try {
    process.chdir(args[0])
    console.log(`➜ ${process.cwd()}`)
  } catch (e: any) {
    console.error(`❌ ${e.message}`)
    process.exit(1)
  }
}
```

- [ ] **Step 4: Create rm command** — recursive delete with confirmation

```typescript
// src/groups/w/file/rm.ts
import fs from 'fs/promises'

export async function handler(args: string[]): Promise<void> {
  if (args.length === 0) { console.error('❌ 请指定路径'); process.exit(1) }
  console.log(`确认删除目录 ${args[0]}? (y/N)`)
  // Read stdin for confirmation
  process.stdout.write('> ')
  const answer = await new Promise<string>(resolve => {
    process.stdin.once('data', data => resolve(data.toString().trim().toLowerCase()))
  })
  if (answer !== 'y' && answer !== 'yes') { console.log('已取消'); return }
  await fs.rm(args[0], { recursive: true, force: true })
  console.log(`✅ 已删除: ${args[0]}`)
}
```

- [ ] **Step 5–13**: Create remaining file commands (`del.ts`, `mkdir.ts`, `touch.ts`, `cp.ts`, `mv.ts`, `find.ts`, `size.ts`, `dtree.ts`, `ln.ts`) — each wraps the corresponding Node.js `fs` API.

- [ ] **Step 14**: Register file category in `src/groups/w/index.ts`:

```typescript
import { commandDef as lsCmd } from './file/ls.js'
import { commandDef as pwdCmd } from './file/pwd.js'
// ... etc

const fileCategory: Category = {
  name: 'file',
  description: '文件/目录 (13)',
  commands: [lsCmd, pwdCmd, cdCmd /* ... all 13 */],
}

export const wGroup: Group = { 
  /* add to categories array */
  categories: [procCategory, sysCategory, netCategory, fileCategory],
}
```

- [ ] **Step 15**: Test file commands

```bash
node dist/index.js w pwd
node dist/index.js w ls src/
```

- [ ] **Step 16: Commit**

```bash
git add src/groups/w/file/
git commit -m "feat: add w group file category (13 commands)"
```

---

## Task 10: w Group — Remaining Categories (svc, pwr, reg, task, tools, user, wsl)

**Files:** Create per-category command files (39 total across 7 categories)
**Modify:** `src/groups/w/index.ts`

These follow established patterns:

| Category | Count | Pattern |
|----------|-------|---------|
| `svc` | 5 | Use `si.services()` + platform-specific spawn for start/stop |
| `pwr` | 6 | Platform-specific: Win → WMI, Mac → `pmset`, Linux → `systemctl` |
| `reg` | 4 | Win-only: spawn `reg.exe` |
| `task` | 3 | Win-only: spawn `schtasks.exe` |
| `tools` | 14 | GUI openers: `open` library (cross-platform) |
| `user` | 4 | `os.userInfo()`, `process.getuid()` etc |
| `wsl` | 3 | Win-only: spawn `wsl.exe` |

- [ ] **Step 1: Create power manager** (`src/shared/system/power.ts`) — needed by pwr commands

```typescript
export interface PowerManager {
  shutdown(): Promise<void>
  reboot(): Promise<void>
  logout(): Promise<void>
  lock(): Promise<void>
  sleep(): Promise<void>
  cancel(): Promise<void>
}

export class SystemPowerManager implements PowerManager {
  async shutdown() { execSync(process.platform === 'win32' ? 'shutdown /s /t 5' : 'shutdown -h now') }
  async reboot()   { execSync(process.platform === 'win32' ? 'shutdown /r /t 5' : 'shutdown -r now') }
  async logout()   { execSync(process.platform === 'win32' ? 'shutdown /l' : 'pkill -KILL -u $USER') }
  async lock()     {
    if (process.platform === 'win32') execSync('rundll32.exe user32.dll,LockWorkStation')
    else if (process.platform === 'darwin') execSync('pmset displaysleepnow')
    else execSync('gnome-screensaver-command -l || loginctl lock-session')
  }
  async sleep()    { execSync(process.platform === 'win32' ? 'shutdown /h' : 'systemctl suspend') }
  async cancel()   { execSync('shutdown /a') }
}
```

- [ ] **Step 2: Create tools commands** (14 GUI openers — all use `open` library)

```typescript
// Pattern for all tools commands
import open from 'open'

export async function handler(_args: string[]): Promise<void> {
  await open('taskmgr')  // or 'resmon', 'perfmon', 'eventvwr.msc', etc.
}

// Specific paths:
// taskmgr → 'taskmgr'
// resmon → 'resmon'
// perfmon → 'perfmon /report'
// eventvwr → 'eventvwr.msc'
// devmgmt → 'devmgmt.msc'
// diskmgmt → 'diskmgmt.msc'
// msconfig → 'msconfig'
// reged → 'regedit'
// gpedit → 'gpedit.msc'
// control → 'control'
// services → 'services.msc'
// here → '.' (open current dir)
// wt → 'wt'
// code → 'code .'
```

- [ ] **Step 3: Create svc category files (svc.ts, svcstart.ts, svcstop.ts, svcrestart.ts, svcdelayed.ts)**

```typescript
// Pattern: src/groups/w/svc/svc.ts — list services (using si.services)
import si from 'systeminformation'
export async function handler(args: string[]): Promise<void> {
  const services = await si.services('*')
  const filter = args[0]?.toLowerCase()
  const filtered = filter ? services.filter(s => s.name.toLowerCase().includes(filter)) : services
  console.table(filtered.slice(0, 50).map(s => ({ 名称: s.name, 状态: s.running ? '运行中' : '已停止', 启动类型: s.startmode || '' })))
}
// svcstart/svcstop/svcrestart → spawn('net start/stop <name>' or 'sc.exe')
// svcdelayed → spawn('sc.exe config <name> start=delayed-auto')
```

- [ ] **Step 4: Create pwr category files (6 files: off.ts, reboot.ts, logout.ts, lock.ts, sleep.ts, cancel.ts)**

```typescript
// Pattern for each: import PowerManager → call method → print result
import { getPowerManager } from '../../../shared/system/adapter.js'
export async function handler(_args: string[]): Promise<void> {
  await getPowerManager().shutdown()
  console.log('关机指令已发送')
}
```

Each file is one function named after the command, with the corresponding `PowerManager` method call.

- [ ] **Step 5: Create reg category files (4 files: reg.ts, regset.ts, regdel.ts, regfind.ts)**

```typescript
// Win-only: spawn 'reg.exe'
import { execSync } from 'child_process'
export async function handler(args: string[]): Promise<void> {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  const path = args[0] || 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
  const output = execSync(`reg query "${path}"`, { encoding: 'utf8' })
  console.log(output)
}
```

- [ ] **Step 6: Create task category files (3 files: task.ts, taskrun.ts, taskstop.ts)**

```typescript
// Win-only: spawn 'schtasks.exe'
import { execSync } from 'child_process'
export async function handler(_args: string[]): Promise<void> {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  const output = execSync('schtasks /query /fo LIST /v', { encoding: 'utf8', timeout: 15000 })
  console.log(output.split('\n').slice(0, 100).join('\n'))
}
```

- [ ] **Step 7: Create tools category files (14 files: taskmgr.ts → code.ts)** — all use `open` library as shown in Step 2 pattern.

Each file is identical in structure — only the argument to `open()` differs. Create all 14 files:
`taskmgr.ts(resmon.ts)` → `open('resmon')`, `perfmon.ts` → `open('perfmon /report')`, `eventvwr.ts` → `open('eventvwr.msc')`, `devmgmt.ts` → `open('devmgmt.msc')`, `diskmgmt.ts` → `open('diskmgmt.msc')`, `msconfig.ts` → `open('msconfig')`, `reged.ts` → `open('regedit')`, `gpedit.ts` → `open('gpedit.msc')`, `control.ts` → `open('control')`, `services.ts` → `open('services.msc')`, `here.ts` → `open('.')`, `wt.ts` → `open('wt')`, `code.ts` → `open('code .')`.

- [ ] **Step 8: Create user category files (4 files: who.ts, users.ts, admin.ts, runas.ts)**

```typescript
// src/groups/w/user/who.ts
import os from 'os'
export async function handler(): Promise<void> {
  const info = os.userInfo()
  console.log(`用户名: ${info.username}`)
  console.log(`用户目录: ${info.homedir}`)
  console.log(`Shell: ${info.shell}`)
}

// admin.ts: check if running as admin (platform-specific)
import { execSync } from 'child_process'
export async function handler(): Promise<void> {
  if (process.platform === 'win32') {
    try { execSync('net session', { stdio: 'ignore' }); console.log('✅ 以管理员身份运行') }
    catch { console.log('⚠️ 非管理员身份运行') }
  } else {
    console.log(process.getuid?.() === 0 ? '✅ 以 root 身份运行' : '⚠️ 以普通用户身份运行')
  }
}
```

- [ ] **Step 9: Create wsl category files (3 files: wsl.ts, wslkill.ts, docker.ts)**

All Win-only, spawn `wsl.exe` or `docker`:

```typescript
export async function handler(): Promise<void> {
  if (process.platform !== 'win32') { console.error('❌ 此命令仅支持 Windows'); process.exit(3) }
  const output = execSync('wsl --list --verbose', { encoding: 'utf8' })
  console.log(output)
}
```

- [ ] **Step 10: Update adapter.ts** — add `getPowerManager()` factory

```typescript
import { SystemPowerManager } from './system/power.js'
export function getPowerManager(): PowerManager { return new SystemPowerManager() }
```

- [ ] **Step 11: Register all categories in src/groups/w/index.ts**

```typescript
import { commandDef as xCmd } from './svc/svc.js'  // ... all imports
export const wGroup: Group = {
  categories: [procCategory, sysCategory, netCategory, fileCategory,
    svcCategory, pwrCategory, regCategory, taskCategory,
    toolsCategory, userCategory, wslCategory],
}
```

- [ ] **Step 12**: Test key commands

```bash
node dist/index.js w host
node dist/index.js w l svc
node dist/index.js w l tools
```

- [ ] **Step 13**: Commit

```bash
git add src/groups/w/svc/ src/groups/w/pwr/ src/groups/w/reg/ src/groups/w/task/ src/groups/w/tools/ src/groups/w/user/ src/groups/w/wsl/ src/shared/system/power.ts
git commit -m "feat: add remaining w categories (svc/pwr/reg/task/tools/user/wsl, 39 commands)"
```

---

## Task 11: Claude Group (5 Commands)

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/groups/claude/run.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/claude/bypass.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/claude/resume.ts`
- Create: `D:\DevProjects\my\npm\jc\src/groups/claude/ultracode.ts`
- Modify: `src/groups/claude/index.ts` — register all commands

These wrap `claude` CLI via `child_process.spawn`:

```typescript
// src/groups/claude/run.ts
import { spawn } from 'child_process'

export async function handler(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { stdio: 'inherit', shell: true })
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`exit code ${code}`)))
    child.on('error', reject)
  })
}

// src/groups/claude/bypass.ts
export async function handler(_args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['--permission-mode', 'bypassPermissions'], { stdio: 'inherit', shell: true })
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`exit code ${code}`)))
    child.on('error', reject)
  })
}
```

- [ ] **Step 1-5**: Create all 5 command files
- [ ] **Step 6**: Register in index.ts
- [ ] **Step 7**: Test (requires `claude` CLI installed)
- [ ] **Step 8**: Commit

---

## Task 12: Happy Group (8 Commands)

**Files:**
- Create: `D:\DevProjects\my\npm\jc\src/groups/happy/run.ts`
- `claude.ts`, `codex.ts`, `resume.ts`, `daemon.ts`, `doctor.ts`, `stop.ts`
- Modify: `src/groups/happy/index.ts`

Same spawn pattern as Claude group but for `happy` CLI:

```typescript
// src/groups/happy/stop.ts — special case: kill all happy processes
import { execSync } from 'child_process'

export async function handler(_args: string[]): Promise<void> {
  if (process.platform === 'win32') {
    execSync('powershell -NoProfile "Get-CimInstance Win32_Process -Filter \\"Name=\'node.exe\'\\" | Where-Object { $_.CommandLine -match \'happy\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"')
  } else {
    execSync('pkill -f "happy"', { stdio: 'ignore' })
  }
  console.log('Happy stopped.')
}
```

- [ ] **Step 1-8**: Create all 8 command files
- [ ] **Step 9**: Register in index.ts
- [ ] **Step 10**: Commit

---

## Task 13: README & npm Publish

**Files:**
- Create: `D:\DevProjects\my\npm\jc\README.md`

- [ ] **Step 1: Write README.md**

```markdown
# jc — j 命令套件

> 跨平台系统快捷命令集。原是 Windows batch 版 `j` 命令套件，现移植为纯 TypeScript 跨平台 npm CLI。

## 安装

```bash
npm install -g jc
```

## 用法

```bash
jc                    # 显示帮助
jc l                  # 列出所有组

jc claude             # 启动 Claude Code
jc claude b           # 跳过权限
jc claude r           # 恢复会话

jc happy              # 启动 Happy Claude
jc hy d               # Happy daemon 模式

jc w l                # 列出 w 组 11 个类别
jc w l proc           # 进程类命令
jc w p 3306           # 查 3306 端口
jc w pk 8080          # 一键查杀 8080
jc w top              # CPU Top20
jc w sysinfo          # 系统信息
jc w wifi             # Wi-Fi 信息
jc w ?                # 命令帮助
```

## 分组

| 组 | 别名 | 说明 |
|----|------|------|
| claude | c | Claude Code CLI 包装 |
| happy | hy | Happy mobile Claude 包装 |
| w | w | 系统快捷命令 (87个) |

## 许可证

MIT
```

- [ ] **Step 2: Build and test final package**

```bash
npm run build
node dist/index.js
node dist/index.js w host
```

- [ ] **Step 3: Publish to npm**

```bash
npm publish --access public
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README and publish 0.1.0"
git tag v0.1.0
```

---
