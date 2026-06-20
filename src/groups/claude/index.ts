import type { Group, Command } from '../../cli/types.js'
import { handler as runHandler, commandDef as runCmd } from './run.js'
import { handler as bypassHandler, commandDef as bypassCmd } from './bypass.js'
import { handler as resumeHandler, commandDef as resumeCmd } from './resume.js'
import { handler as ultraHandler, commandDef as ultraCmd } from './ultracode.js'

// The l command is built-in via route(), but list it here for help output
export const claudeCommands: Command[] = [
  { name: 'default', description: '启动 Claude Code', handler: runHandler },
  runCmd, bypassCmd, resumeCmd, ultraCmd,
]

export const claudeGroup: Group = {
  name: 'claude', alias: 'c',
  description: 'Claude Code CLI 包装',
  commands: [runCmd, bypassCmd, resumeCmd, ultraCmd],
  defaultHandler: runHandler,
}
