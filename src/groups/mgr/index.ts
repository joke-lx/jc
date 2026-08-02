// src/groups/mgr/index.ts
import type { Group } from '../../cli/types.js'
import { commandDef as addCmd } from './add.js'
import { commandDef as listCmd } from './list.js'
import { commandDef as runCmd } from './run.js'
import { commandDef as rmCmd } from './rm.js'
import { commandDef as renameCmd } from './rename.js'
import { commandDef as checkCmd } from './check.js'
import { commandDef as exportCmd } from './export.js'
import { commandDef as importCmd } from './import.js'
import { commandDef as backupCmd } from './backup.js'
import { commandDef as restoreCmd } from './restore.js'

export const mgrGroup: Group = {
  name: 'mgr',
  alias: 'm',
  description: '统一管理器：注册 npm / py / exe 项并通过别名调用',
  commands: [addCmd, listCmd, runCmd, rmCmd, renameCmd, checkCmd, exportCmd, importCmd, backupCmd, restoreCmd],
}