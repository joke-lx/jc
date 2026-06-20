import { commandDef as portCmd } from './proc/port.js'
import { commandDef as portkillCmd } from './proc/portkill.js'
import { commandDef as killCmd } from './proc/kill.js'
import { commandDef as killnameCmd } from './proc/killname.js'
import { commandDef as psCmd } from './proc/ps.js'
import { commandDef as topCmd } from './proc/top.js'
import { commandDef as memCmd } from './proc/mem.js'
import { commandDef as psgCmd } from './proc/psg.js'
// sys category
import { commandDef as sysinfoCmd } from './sys/sysinfo.js'
import { commandDef as hostCmd } from './sys/host.js'
import { commandDef as uptimeCmd } from './sys/uptime.js'
import { commandDef as cpuCmd } from './sys/cpu.js'
import { commandDef as meminfoCmd } from './sys/meminfo.js'
import { commandDef as diskCmd } from './sys/disk.js'
import { commandDef as diskfullCmd } from './sys/diskfull.js'
import { commandDef as gpuCmd } from './sys/gpu.js'
import { commandDef as biosCmd } from './sys/bios.js'
import { commandDef as batCmd } from './sys/bat.js'
import { commandDef as monCmd } from './sys/mon.js'
import { commandDef as powercfgCmd } from './sys/powercfg.js'
// net category
import { commandDef as ipCmd } from './net/ip.js'
import { commandDef as ip4Cmd } from './net/ip4.js'
import { commandDef as dnsCmd } from './net/dns.js'
import { commandDef as nsCmd } from './net/ns.js'
import { commandDef as pingCmd } from './net/ping.js'
import { commandDef as traceCmd } from './net/trace.js'
import { commandDef as routeCmd } from './net/route.js'
import { commandDef as connCmd } from './net/conn.js'
import { commandDef as wifiCmd } from './net/wifi.js'
import { commandDef as wifipwdCmd } from './net/wifipwd.js'
import { commandDef as wifiexpCmd } from './net/wifiexp.js'
import { commandDef as proxyCmd } from './net/proxy.js'
import { commandDef as portscanCmd } from './net/portscan.js'
import { commandDef as macCmd } from './net/mac.js'
import { commandDef as shareCmd } from './net/share.js'
// file category
import { commandDef as lsCmd } from './file/ls.js'
import { commandDef as pwdCmd } from './file/pwd.js'
import { commandDef as cdCmd } from './file/cd.js'
import { commandDef as rmCmd } from './file/rm.js'
import { commandDef as delCmd } from './file/del.js'
import { commandDef as mkdirCmd } from './file/mkdir.js'
import { commandDef as touchCmd } from './file/touch.js'
import { commandDef as cpCmd } from './file/cp.js'
import { commandDef as mvCmd } from './file/mv.js'
import { commandDef as findCmd } from './file/find.js'
import { commandDef as sizeCmd } from './file/size.js'
import { commandDef as dtreeCmd } from './file/dtree.js'
import { commandDef as lnCmd } from './file/ln.js'
import type { Group, Category } from '../../cli/types.js'

const procCategory: Category = {
  name: 'proc',
  description: '进程 (8)',
  commands: [portCmd, portkillCmd, killCmd, killnameCmd, psCmd, topCmd, memCmd, psgCmd],
}

const sysCategory: Category = {
  name: 'sys',
  description: '系统信息 (12)',
  commands: [sysinfoCmd, hostCmd, uptimeCmd, cpuCmd, meminfoCmd, diskCmd, diskfullCmd, gpuCmd, biosCmd, batCmd, monCmd, powercfgCmd],
}

const netCategory: Category = {
  name: 'net',
  description: '网络 (15)',
  commands: [ipCmd, ip4Cmd, dnsCmd, nsCmd, pingCmd, traceCmd, routeCmd, connCmd, wifiCmd, wifipwdCmd, wifiexpCmd, proxyCmd, portscanCmd, macCmd, shareCmd],
}

const fileCategory: Category = {
  name: 'file',
  description: '文件/目录 (13)',
  commands: [lsCmd, pwdCmd, cdCmd, rmCmd, delCmd, mkdirCmd, touchCmd, cpCmd, mvCmd, findCmd, sizeCmd, dtreeCmd, lnCmd],
}

export const wGroup: Group = {
  name: 'w',
  alias: 'w',
  description: 'Windows 快捷命令集 / 系统工具',
  commands: [],
  categories: [procCategory, sysCategory, netCategory, fileCategory],
}
