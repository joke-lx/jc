import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('mgr config', () => {
  let dir: string
  let origXdg: string | undefined
  let origAppData: string | undefined
  let origJc: string | undefined
  let stdoutLogs: string[]
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
    origJc = process.env.JC_REGISTRY_PATH
    dir = mkdtempSync(join(tmpdir(), 'jc-config-'))
    delete process.env.JC_REGISTRY_PATH
    delete process.env.XDG_CONFIG_HOME
    process.env.APPDATA = dir
    stdoutLogs = []
    logSpy = vi.spyOn(console, 'log').mockImplementation((s: unknown) => {
      stdoutLogs.push(String(s))
    })
  })

  afterEach(() => {
    logSpy?.mockRestore()
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdg
    if (origAppData === undefined) delete process.env.APPDATA
    else process.env.APPDATA = origAppData
    if (origJc === undefined) delete process.env.JC_REGISTRY_PATH
    else process.env.JC_REGISTRY_PATH = origJc
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('config path prints the resolved registry path', async () => {
    const { handler } = await import('../../../src/groups/mgr/config.js')
    await handler(['path'])
    // 首行 stdout 必须是 registry.json 路径
    expect(stdoutLogs[0]).toMatch(/registry\.json$/)
  })

  it('config init --dir creates an empty registry.json', async () => {
    const target = join(dir, 'new-loc')
    const { handler } = await import('../../../src/groups/mgr/config.js')
    await handler(['init', '--dir', target])
    const expected = join(target, 'registry.json')
    expect(existsSync(expected)).toBe(true)
    const parsed = JSON.parse(readFileSync(expected, 'utf-8'))
    expect(parsed).toEqual({ version: 1, items: [] })
  })

  it('config init refuses to overwrite an existing file', async () => {
    const target = join(dir, 'occupied')
    const existing = join(target, 'registry.json')
    mkdirSync(target, { recursive: true })
    writeFileSync(existing, '{"version":1,"items":[]}', 'utf-8')

    const { handler } = await import('../../../src/groups/mgr/config.js')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit-${code}`)
    }) as any)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(handler(['init', '--dir', target])).rejects.toThrow(/exit-2/)
    exitSpy.mockRestore()
    errSpy.mockRestore()

    // 文件内容应保持原样
    const after = readFileSync(existing, 'utf-8')
    expect(after).toBe('{"version":1,"items":[]}')
  })
})
