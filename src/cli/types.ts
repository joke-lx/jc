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
