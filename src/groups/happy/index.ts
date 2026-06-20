import type { Group } from '../../cli/types.js'
import { commandDef as runCmd } from './run.js'
import { commandDef as claudeCmd } from './claude.js'
import { commandDef as codexCmd } from './codex.js'
import { commandDef as resumeCmd } from './resume.js'
import { commandDef as daemonCmd } from './daemon.js'
import { commandDef as doctorCmd } from './doctor.js'
import { commandDef as stopCmd } from './stop.js'

export const happyGroup: Group = {
  name: 'happy', alias: 'hy',
  description: 'Happy mobile Claude 包装',
  commands: [runCmd, claudeCmd, codexCmd, resumeCmd, daemonCmd, doctorCmd, stopCmd],
  defaultHandler: runCmd.handler,
}
