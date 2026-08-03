// src/groups/w/tools/code.ts
import open from 'open'
import { Command } from '../../../cli/Command.js'

async function executeCode(_args: string[]): Promise<void> {

  await open('code .')

}

export class CodeCommand extends Command {
  name = "code"
  description = "打开 VS Code (当前目录)"
  examples = [`${this.bin} w code`]

  async handler(_args: string[]): Promise<void> {
    return executeCode(_args)
  }
}

export const commandDef = new CodeCommand()

export async function handler(_args: string[]): Promise<void> {
  return commandDef.handler(_args)
}
