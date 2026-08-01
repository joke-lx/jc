import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Mock 'child_process' so that `spawnSync` in validate.ts is replaced
// with a controllable spy. Using vi.mock here (rather than
// vi.spyOn(require('child_process'), 'spawnSync') as the brief suggests)
// because vitest's ESM transformer freezes the named-import binding in
// validate.ts at module-load time; mutating the CJS namespace after the
// import has resolved does NOT propagate. vi.mock hoists the replacement
// before the import, which is the only way to intercept the call.
vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process')
  return {
    ...actual,
    spawnSync: vi.fn(),
  }
})

import { spawnSync } from 'child_process'
import { validateSource } from '../../../src/shared/registry/validate.js'

describe('validate local', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jc-val-')) })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  it('validates a readable local py file', async () => {
    const f = join(dir, 'x.py')
    writeFileSync(f, 'print(1)')
    const r = await validateSource({ kind: 'py', source: f, alias: 'a', desc: '' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.exec).toBe(`python ${f}`)
  })

  it('rejects a missing local exe', async () => {
    const r = await validateSource({ kind: 'exe', source: join(dir, 'missing.exe'), alias: 'a', desc: '' })
    expect(r.ok).toBe(false)
  })

  it('validates a readable local exe file', async () => {
    const f = join(dir, 'tool.exe')
    writeFileSync(f, 'MZ')
    const r = await validateSource({ kind: 'exe', source: f, alias: 'a', desc: '' })
    expect(r.ok).toBe(true)
  })
})

describe('validate npm', () => {
  beforeEach(() => { vi.mocked(spawnSync).mockReset() })
  afterEach(() => { vi.mocked(spawnSync).mockReset() })

  it('accepts when npm view returns 0', async () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as any)
    const r = await validateSource({ kind: 'npm', source: 'typescript', alias: 'tsc', desc: '' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.exec).toBe('npx -p typescript tsc')
  })

  it('rejects when npm view returns non-zero', async () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as any)
    const r = await validateSource({ kind: 'npm', source: 'no-such-pkg', alias: 'x', desc: '' })
    expect(r.ok).toBe(false)
  })
})