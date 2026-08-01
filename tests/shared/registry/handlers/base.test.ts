import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync, chmodSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Mock 'child_process' so that `spawn` in base.ts is replaced with a
// controllable spy. Using vi.mock here (rather than vi.spyOn(cp, 'spawn')
// as the brief suggests) because vitest's ESM transformer freezes the
// named-import binding in base.ts at module-load time; mutating the CJS
// namespace after the import has resolved does NOT propagate. vi.mock
// hoists the replacement before the import, which is the only way to
// intercept the call. Same pattern as tests/shared/registry/validate.test.ts.
vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process')
  const { EventEmitter } = await import('events')
  return {
    ...actual,
    spawn: vi.fn(() => {
      // Return a minimal EventEmitter-like child that emits 'close' with code 0
      const child = new EventEmitter() as any
      process.nextTick(() => child.emit('close', 0))
      return child
    }),
  }
})

import * as cp from 'child_process'
import { ItemHandler } from '../../../../src/shared/registry/handlers/base.js'
import type { RegistryItem, RegistryItemKind } from '../../../../src/shared/registry/types.js'

class FakeHandler extends ItemHandler {
  readonly kind: RegistryItemKind = 'exe'
  async validate(): Promise<{ ok: true; exec: string }> { return { ok: true, exec: '/bin/echo' } }
}

function makeItem(exec: string, source: string): RegistryItem {
  return {
    kind: 'exe', source, alias: 'a', desc: '', exec,
    createdAt: 't', sourceVerifiedAt: 't',
  }
}

describe('ItemHandler.preflight', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jc-handler-')) })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  it('returns { ok: true } for a URL source (skips local check)', async () => {
    const h = new FakeHandler()
    const r = await h.preflight(makeItem('https://example.com/x.exe', 'https://example.com/x.exe'))
    expect(r.ok).toBe(true)
  })

  it('returns { ok: true } for a readable local file', async () => {
    const f = join(dir, 'tool')
    writeFileSync(f, 'MZ')
    chmodSync(f, 0o755)
    const h = new FakeHandler()
    const r = await h.preflight(makeItem(f, f))
    expect(r.ok).toBe(true)
  })

  it('returns { ok: false, reason includes 源已失效 } for a missing local file', async () => {
    const f = join(dir, 'missing')
    const h = new FakeHandler()
    const r = await h.preflight(makeItem(f, f))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('源已失效')
  })
})

describe('ItemHandler.run', () => {
  afterEach(() => vi.mocked(cp.spawn).mockReset())

  it('spawns with shell:true and windowsHide:true', async () => {
    const h = new FakeHandler()
    await h.run(makeItem('/bin/echo hi', '/bin/echo hi'), ['extra'])
    expect(cp.spawn).toHaveBeenCalledTimes(1)
    const call = vi.mocked(cp.spawn).mock.calls[0]
    expect(call[0]).toBe('/bin/echo hi')
    expect(call[1]).toEqual(['extra'])
    expect(call[2]).toMatchObject({ stdio: 'inherit', shell: true, windowsHide: true })
  })
})

describe('ItemHandler.localPath', () => {
  const h = new FakeHandler()
  it('extracts the python script path', () => {
    expect(h['localPath']('python /tmp/x.py')).toBe('/tmp/x.py')
  })
  it('returns the exec itself when no python prefix', () => {
    expect(h['localPath']('/bin/echo')).toBe('/bin/echo')
  })
  it('returns tokens[0] for compound cmds (npx -p pkg bin)', () => {
    expect(h['localPath']('npx -p pkg bin')).toBe('npx')
  })
})