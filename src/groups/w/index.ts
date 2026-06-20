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
// svc category
import { commandDef as svcCmd } from './svc/svc.js'
import { commandDef as svcstartCmd } from './svc/svcstart.js'
import { commandDef as svcstopCmd } from './svc/svcstop.js'
import { commandDef as svcrestartCmd } from './svc/svcrestart.js'
import { commandDef as svcdelayedCmd } from './svc/svcdelayed.js'
// pwr category
import { commandDef as offCmd } from './pwr/off.js'
import { commandDef as rebootCmd } from './pwr/reboot.js'
import { commandDef as logoutCmd } from './pwr/logout.js'
import { commandDef as lockCmd } from './pwr/lock.js'
import { commandDef as sleepCmd } from './pwr/sleep.js'
import { commandDef as cancelCmd } from './pwr/cancel.js'
// reg category
import { commandDef as regCmd } from './reg/reg.js'
import { commandDef as regsetCmd } from './reg/regset.js'
import { commandDef as regdelCmd } from './reg/regdel.js'
import { commandDef as regfindCmd } from './reg/regfind.js'
// task category
import { commandDef as taskCmd } from './task/task.js'
import { commandDef as taskrunCmd } from './task/taskrun.js'
import { commandDef as taskstopCmd } from './task/taskstop.js'
// tools category
import { commandDef as taskmgrCmd } from './tools/taskmgr.js'
import { commandDef as resmonCmd } from './tools/resmon.js'
import { commandDef as perfmonCmd } from './tools/perfmon.js'
import { commandDef as eventvwrCmd } from './tools/eventvwr.js'
import { commandDef as devmgmtCmd } from './tools/devmgmt.js'
import { commandDef as diskmgmtCmd } from './tools/diskmgmt.js'
import { commandDef as msconfigCmd } from './tools/msconfig.js'
import { commandDef as regedCmd } from './tools/reged.js'
import { commandDef as gpeditCmd } from './tools/gpedit.js'
import { commandDef as controlCmd } from './tools/control.js'
import { commandDef as servicesCmd } from './tools/services.js'
import { commandDef as hereCmd } from './tools/here.js'
import { commandDef as wtCmd } from './tools/wt.js'
import { commandDef as codeCmd } from './tools/code.js'
// user category
import { commandDef as whoCmd } from './user/who.js'
import { commandDef as usersCmd } from './user/users.js'
import { commandDef as adminCmd } from './user/admin.js'
import { commandDef as runasCmd } from './user/runas.js'
// wsl category
import { commandDef as wslCmd } from './wsl/wsl.js'
import { commandDef as wslkillCmd } from './wsl/wslkill.js'
import { commandDef as dockerCmd } from './wsl/docker.js'
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

const svcCategory: Category = {
  name: 'svc',
  description: '服务 (5)',
  commands: [svcCmd, svcstartCmd, svcstopCmd, svcrestartCmd, svcdelayedCmd],
}

const pwrCategory: Category = {
  name: 'pwr',
  description: '电源 (6)',
  commands: [offCmd, rebootCmd, logoutCmd, lockCmd, sleepCmd, cancelCmd],
}

const regCategory: Category = {
  name: 'reg',
  description: '注册表 (4)',
  commands: [regCmd, regsetCmd, regdelCmd, regfindCmd],
}

const taskCategory: Category = {
  name: 'task',
  description: '计划任务 (3)',
  commands: [taskCmd, taskrunCmd, taskstopCmd],
}

const toolsCategory: Category = {
  name: 'tools',
  description: '系统工具 (14)',
  commands: [taskmgrCmd, resmonCmd, perfmonCmd, eventvwrCmd, devmgmtCmd, diskmgmtCmd, msconfigCmd, regedCmd, gpeditCmd, controlCmd, servicesCmd, hereCmd, wtCmd, codeCmd],
}

const userCategory: Category = {
  name: 'user',
  description: '用户 (4)',
  commands: [whoCmd, usersCmd, adminCmd, runasCmd],
}

const wslCategory: Category = {
  name: 'wsl',
  description: 'WSL/Docker (3)',
  commands: [wslCmd, wslkillCmd, dockerCmd],
}

export const wGroup: Group = {
  name: 'w',
  alias: 'w',
  description: 'Windows 快捷命令集 / 系统工具',
  commands: [],
  categories: [procCategory, sysCategory, netCategory, fileCategory, svcCategory, pwrCategory, regCategory, taskCategory, toolsCategory, userCategory, wslCategory],
}
