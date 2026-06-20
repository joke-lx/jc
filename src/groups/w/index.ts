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
