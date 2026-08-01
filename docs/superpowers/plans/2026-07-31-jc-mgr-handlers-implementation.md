# jc mgr handlers + run preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge `jc mgr` kind differences into an abstract `ItemHandler` class with a global factory table, and add a run-time `preflight` source-presence check that fails fast with a clear error message when the source has been deleted.

**Architecture:** New `src/shared/registry/handlers/` directory holds an abstract `ItemHandler` base class and three subclasses (`NpmItemHandler`, `PyItemHandler`, `ExeItemHandler`). A `getHandler(kind)` factory dispatches to the right subclass. `src/shared/registry/validate.ts` becomes a thin pass-through. `src/groups/mgr/run.ts` is rewritten to call `getHandler(item.kind).preflight(item)` then `getHandler(item.kind).run(item, args)`.

**Tech Stack:** Node 18, ESM, TypeScript strict, Vitest, `child_process.spawn`, `fs.access`, `fetch`, `child_process.spawnSync`. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-07-31-jc-mgr-handlers-design.md`

## Global Constraints

- ESM, Node 18, tsup bundle target `node18`, package type `module` (per `tsup.config.ts:6` and `package.json` `type`).
- All relative TypeScript imports must end in `.js` even when the source is `.ts` (existing `project-map.md` rule).
- Exit codes use the existing contract: `0` success, `1` argument/usage error, `2` execution/preflight/lookup failure. No new codes.
- Aliases match `^[a-z0-9][a-z0-9_-]{0,31}$` and are stored lowercase.
- The plan's "implementer self-review checklist" applies to every task:
  1. Re-read the spec section this task binds and tick every must-contain item.
  2. Open cited source files and confirm every `file:line` citation resolves to the claimed content.
  3. Confirm the new file's frontmatter (N/A here) is well-formed.
  4. Re-run the canonical byte-scan after any CRLF conversion.
- File line endings must be CRLF on Windows. The Write tool on this harness writes LF only; for every new or edited Markdown file, the implementer must run the PowerShell split-form conversion:
  ```powershell
  $p = '<file>'
  $enc = New-Object System.Text.UTF8Encoding($false)
  $content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
  $content = $content -replace "`n","`r`n"
  [IO.File]::WriteAllText($p, $content, $enc)
  ```
  (The chained one-liner trips PowerShell 5.1's `MethodCountCouldNotFindBest`; the split form is mandatory.)
- TS source files in this repo do not require explicit CRLF conversion — the repo's `core.autocrlf=true` normalizes on `git add`. The byte-scan check is still required to confirm no lone-LF slipped in.
- Verification commands must use PowerShell-native byte scans; `xxd` is not on this PowerShell's PATH and `xxd | Select-String '0d 0a'` undercounts. Canonical check:
  ```powershell
  $p = '<file>'
  $b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
  ```
- `package.json` has `"type": "module"`. Any scratch Node script must use `.cjs` (or be invoked with `node --input-type=commonjs -e`).
- No edits to `package.json`, `tsup.config.ts`, `vitest.config.ts`, or `tsconfig.json`. No new dependencies.
- Only tracked files under `src/shared/registry/handlers/**`, `src/shared/registry/validate.ts`, `src/groups/mgr/run.ts`, `tests/shared/registry/handlers/**`, `tests/shared/registry/validate.test.ts`, and `tests/cli/mgr/run.test.ts` are modified or added.

## File Structure

Created (all new):

```
src/shared/registry/handlers/
├── base.ts
├── npm.ts
├── py.ts
├── exe.ts
└── index.ts

tests/shared/registry/handlers/
├── base.test.ts
└── index.test.ts
```

Modified:

```
src/shared/registry/validate.ts          # body replaced; signature unchanged
src/groups/mgr/run.ts                    # body replaced; commandDef unchanged
tests/shared/registry/validate.test.ts    # body may shift; 5 tests still pass
tests/cli/mgr/run.test.ts                # 3 existing tests + 1 new preflight test
```

## Task Outline

1. Task 1 — Create `src/shared/registry/handlers/base.ts` and `src/shared/registry/handlers/index.ts` with handler-table scaffold; `base.test.ts` and `index.test.ts` verify the abstract class shape and factory table.
2. Task 2 — Implement `NpmItemHandler`, `PyItemHandler`, `ExeItemHandler` (each with its `validate` body lifted from the current `validate.ts`); rewrite `validate.ts` as a thin pass-through; verify the existing 5 `validate.test.ts` tests still pass.
3. Task 3 — Rewrite `src/groups/mgr/run.ts` to call `preflight` then `run` on the handler; remove local `spawn` and tokenization; add 1 preflight test.
4. Task 4 — Validation: full test suite, byte sweep, `node dist/index.js` smoke.

Each task ends with a commit.

---

### Task 1: `ItemHandler` base class + factory table

**Files:**
- Create: `src/shared/registry/handlers/base.ts`
- Create: `src/shared/registry/handlers/index.ts`
- Test: `tests/shared/registry/handlers/base.test.ts`
- Test: `tests/shared/registry/handlers/index.test.ts`

**Interfaces:**
- Consumes: `RegistryItem`, `RegistryItemKind` from `../types.js`.
- Produces (from `base.ts`): `export abstract class ItemHandler` with `abstract readonly kind: RegistryItemKind`, `abstract validate(item): Promise<{ ok: true; exec: string } | { ok: false; reason: string }>`, `preflight(item: RegistryItem): Promise<{ ok: true } | { ok: false; reason: string }>` (default impl), `run(item: RegistryItem, args: string[]): Promise<void>` (default impl), `protected localPath(exec: string): string` (helper).
- Produces (from `index.ts`): `export function getHandler(kind: RegistryItemKind): ItemHandler`. Throws `Error('未实现的 kind: <kind>')` for unknown kind.

- [ ] **Step 1: Write the failing test for `base.test.ts`**

Create `tests/shared/registry/handlers/base.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync, chmodSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import * as cp from 'child_process'
import { ItemHandler } from '../../../src/shared/registry/handlers/base.js'
import type { RegistryItem, RegistryItemKind } from '../../../src/shared/registry/types.js'

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
  afterEach(() => vi.restoreAllMocks())

  it('spawns with shell:true and windowsHide:true', async () => {
    const h = new FakeHandler()
    const spy = vi.spyOn(cp, 'spawn').mockImplementation(((cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe('/bin/echo')
      expect(args).toEqual(['extra'])
      expect(opts).toMatchObject({ stdio: 'inherit', shell: true, windowsHide: true })
      return cp.spawn('/bin/echo', ['extra']) as any
    }) as any)
    await h.run(makeItem('/bin/echo hi', '/bin/echo hi'), ['extra'])
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
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
```

- [ ] **Step 2: Write the failing test for `index.test.ts`**

Create `tests/shared/registry/handlers/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getHandler, ItemHandler } from '../../../src/shared/registry/handlers/index.js'
import { NpmItemHandler } from '../../../src/shared/registry/handlers/npm.js'
import { PyItemHandler } from '../../../src/shared/registry/handlers/py.js'
import { ExeItemHandler } from '../../../src/shared/registry/handlers/exe.js'

describe('getHandler factory', () => {
  it('returns a NpmItemHandler for kind=npm', () => {
    const h = getHandler('npm')
    expect(h).toBeInstanceOf(NpmItemHandler)
    expect(h).toBeInstanceOf(ItemHandler)
  })
  it('returns a PyItemHandler for kind=py', () => {
    const h = getHandler('py')
    expect(h).toBeInstanceOf(PyItemHandler)
  })
  it('returns an ExeItemHandler for kind=exe', () => {
    const h = getHandler('exe')
    expect(h).toBeInstanceOf(ExeItemHandler)
  })
  it('throws on an unknown kind', () => {
    expect(() => getHandler('foo' as any)).toThrow(/未实现的 kind/)
  })
})
```

(Note: this test file imports `NpmItemHandler` etc. directly, which forces Task 2 to have produced them; if running Task 1 alone, defer this test until after Task 2. To keep the plan simple, run all four test cases in `index.test.ts` only after Task 2 has landed. For Task 1 alone, only the `base.test.ts` cases need to pass; the `index.test.ts` file is created but its `import` lines will fail until Task 2 adds the three subclasses. Workaround: in Task 1, create the `index.test.ts` file but comment out the `import` lines and the body, with a note that Task 2 will uncomment them.)

- [ ] **Step 3: Write `src/shared/registry/handlers/base.ts`**

```ts
// src/shared/registry/handlers/base.ts
import { spawn } from 'child_process'
import { access, constants } from 'fs'
import type { RegistryItem, RegistryItemKind } from '../types.js'

export type PreflightResult = { ok: true } | { ok: false; reason: string }

export abstract class ItemHandler {
  abstract readonly kind: RegistryItemKind

  abstract validate(item: {
    kind: RegistryItemKind
    source: string
    alias: string
    desc: string
  }): Promise<{ ok: true; exec: string } | { ok: false; reason: string }>

  preflight(item: RegistryItem): Promise<PreflightResult> {
    if (/^https?:\/\//.test(item.source)) return Promise.resolve({ ok: true })
    return new Promise<PreflightResult>((resolveP) => {
      const p = this.localPath(item.exec)
      access(p, constants.R_OK, (err: NodeJS.ErrnoException | null) =>
        err
          ? resolveP({ ok: false, reason: `源已失效: ${p}（${err.code ?? 'ACCESS'}）` })
          : resolveP({ ok: true })
      )
    })
  }

  run(item: RegistryItem, args: string[]): Promise<void> {
    const argv = [...(item.args || []), ...args]
    return new Promise<void>((resolveP, rejectP) => {
      const child = spawn(item.exec, argv, { stdio: 'inherit', shell: true, windowsHide: true })
      child.on('close', (c) => c === 0 ? resolveP() : rejectP(new Error(`exit ${c}`)))
      child.on('error', rejectP)
    })
  }

  protected localPath(exec: string): string {
    const tokens = exec.split(/\s+/)
    return tokens[0] === 'python' && tokens[1] ? tokens[1] : tokens[0]
  }
}
```

- [ ] **Step 4: Write `src/shared/registry/handlers/index.ts`**

```ts
// src/shared/registry/handlers/index.ts
import type { RegistryItemKind } from '../types.js'
import { ItemHandler } from './base.js'
import { NpmItemHandler } from './npm.js'
import { PyItemHandler } from './py.js'
import { ExeItemHandler } from './exe.js'

export { ItemHandler } from './base.js'

const HANDLERS: Record<RegistryItemKind, () => ItemHandler> = {
  npm: () => new NpmItemHandler(),
  py: () => new PyItemHandler(),
  exe: () => new ExeItemHandler(),
}

export function getHandler(kind: RegistryItemKind): ItemHandler {
  const factory = HANDLERS[kind]
  if (!factory) throw new Error(`未实现的 kind: ${String(kind)}`)
  return factory()
}
```

- [ ] **Step 5: Create stub subclass files so the import in `index.ts` resolves**

Create three empty stub files (one-liner body that extends `ItemHandler` and throws) so the `import` lines in `index.ts` resolve at runtime even before Task 2:

`src/shared/registry/handlers/npm.ts`:
```ts
// src/shared/registry/handlers/npm.ts
import { ItemHandler } from './base.js'
import type { RegistryItemKind } from '../types.js'

export class NpmItemHandler extends ItemHandler {
  readonly kind: RegistryItemKind = 'npm'
  async validate(): Promise<{ ok: true; exec: string }> { throw new Error('NpmItemHandler.validate not implemented yet (Task 2)') }
}
```

`src/shared/registry/handlers/py.ts` and `exe.ts`: same shape with `kind = 'py'` and `'exe'` respectively.

- [ ] **Step 6: Run `base.test.ts` and confirm 6 tests pass**

```bash
npm test -- --run tests/shared/registry/handlers/base.test.ts
```

Expected: 6 tests pass. (`index.test.ts` may fail at import time; if so, comment out the failing imports per Step 2's workaround and run again.)

- [ ] **Step 7: Re-CRLF + commit**

Apply the PowerShell split-form conversion to the new Markdown files (if any). For TS files, the `git add` cycle normalizes via `core.autocrlf=true`; run a final byte-scan to confirm no lone-LF.

```bash
git add src/shared/registry/handlers/base.ts src/shared/registry/handlers/index.ts src/shared/registry/handlers/npm.ts src/shared/registry/handlers/py.ts src/shared/registry/handlers/exe.ts tests/shared/registry/handlers/base.test.ts tests/shared/registry/handlers/index.test.ts
git commit -m "feat(handlers): add ItemHandler base class and factory table"
```

---

### Task 2: Three concrete handlers + `validate.ts` thin shell

**Files:**
- Create: `src/shared/registry/handlers/npm.ts` (replace stub)
- Create: `src/shared/registry/handlers/py.ts` (replace stub)
- Create: `src/shared/registry/handlers/exe.ts` (replace stub)
- Modify: `src/shared/registry/validate.ts` (body replaced; signature unchanged)
- Test: `tests/shared/registry/validate.test.ts` (existing 5 tests must still pass)

**Interfaces:**
- Consumes: `ItemHandler` from `./base.js`; `RegistryItemKind` from `../types.js`.
- Produces: `class NpmItemHandler extends ItemHandler` (kind='npm', validate via `npm view`), `class PyItemHandler extends ItemHandler` (kind='py', validate via `fetch HEAD` or `fs.access`), `class ExeItemHandler extends ItemHandler` (kind='exe', validate via `fs.access` + `statSync`).
- `NpmItemHandler.preflight` overrides to return `{ ok: true }`; others inherit.
- `validateSource(item)` in `validate.ts` becomes `return getHandler(item.kind).validate(item)`.

- [ ] **Step 1: Re-enable `index.test.ts` (uncomment imports if Step 1 left them commented)**

If Task 1 used the workaround in Step 2 (commented out imports), re-enable the imports now that the three subclasses exist. Run `npm test -- --run tests/shared/registry/handlers/index.test.ts`. Expected: 4 tests pass.

- [ ] **Step 2: Run the existing 5 `validate.test.ts` tests to confirm the current behavior is captured**

```bash
npm test -- --run tests/shared/registry/validate.test.ts
```

Expected: 5 tests pass. (These tests will keep passing through Task 2 because the public `validateSource` signature does not change; only the body changes.)

- [ ] **Step 3: Replace `src/shared/registry/handlers/npm.ts` with the real implementation**

```ts
// src/shared/registry/handlers/npm.ts
import { spawnSync } from 'child_process'
import { ItemHandler, type PreflightResult } from './base.js'
import type { RegistryItem, RegistryItemKind } from '../types.js'

export class NpmItemHandler extends ItemHandler {
  readonly kind: RegistryItemKind = 'npm'

  async validate(item: {
    kind: RegistryItemKind; source: string; alias: string; desc: string;
  }): Promise<{ ok: true; exec: string } | { ok: false; reason: string }> {
    const m = item.source.match(/^(@?[^@/]+(?:\/[^@/]+)?)(?:@.+)?$/)
    if (!m) return { ok: false, reason: `invalid npm source: ${item.source}` }
    const pkg = m[1]
    const bin = item.alias
    const r = spawnSync('npm', ['view', pkg, 'version'], { timeout: 10000 })
    if (r.status !== 0) return { ok: false, reason: `npm view ${pkg} failed` }
    return { ok: true, exec: `npx -p ${pkg} ${bin}` }
  }

  async preflight(_item: RegistryItem): Promise<PreflightResult> {
    return { ok: true }
  }
}
```

- [ ] **Step 4: Replace `src/shared/registry/handlers/py.ts` with the real implementation**

```ts
// src/shared/registry/handlers/py.ts
import { access, constants } from 'fs'
import { resolve } from 'path'
import { ItemHandler } from './base.js'
import type { RegistryItemKind } from '../types.js'

export class PyItemHandler extends ItemHandler {
  readonly kind: RegistryItemKind = 'py'

  async validate(item: {
    kind: RegistryItemKind; source: string; alias: string; desc: string;
  }): Promise<{ ok: true; exec: string } | { ok: false; reason: string }> {
    if (/^https?:\/\//.test(item.source)) {
      try {
        const res = await fetch(item.source, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (!res.ok) return { ok: false, reason: `HEAD ${item.source} -> ${res.status}` }
        return { ok: true, exec: `python ${item.source}` }
      } catch (e) {
        return { ok: false, reason: `HEAD ${item.source} failed: ${(e as Error).message}` }
      }
    }
    const p = resolve(item.source)
    await new Promise<void>((resolveP, rejectP) => access(p, constants.R_OK, (err: NodeJS.ErrnoException | null) => err ? rejectP(err) : resolveP()))
    return { ok: true, exec: `python ${p}` }
  }
}
```

- [ ] **Step 5: Replace `src/shared/registry/handlers/exe.ts` with the real implementation**

```ts
// src/shared/registry/handlers/exe.ts
import { access, constants, statSync } from 'fs'
import { resolve } from 'path'
import { ItemHandler } from './base.js'
import type { RegistryItemKind } from '../types.js'

export class ExeItemHandler extends ItemHandler {
  readonly kind: RegistryItemKind = 'exe'

  async validate(item: {
    kind: RegistryItemKind; source: string; alias: string; desc: string;
  }): Promise<{ ok: true; exec: string } | { ok: false; reason: string }> {
    if (/^https?:\/\//.test(item.source)) {
      try {
        const res = await fetch(item.source, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (!res.ok) return { ok: false, reason: `HEAD ${item.source} -> ${res.status}` }
        return { ok: true, exec: item.source }
      } catch (e) {
        return { ok: false, reason: `HEAD ${item.source} failed: ${(e as Error).message}` }
      }
    }
    const p = resolve(item.source)
    try {
      await new Promise<void>((resolveP, rejectP) => access(p, constants.R_OK, (err: NodeJS.ErrnoException | null) => err ? rejectP(err) : resolveP()))
    } catch (e) {
      return { ok: false, reason: `access ${p} failed: ${(e as Error).message}` }
    }
    if (!statSync(p).isFile()) return { ok: false, reason: `${p} is not a file` }
    return { ok: true, exec: p }
  }
}
```

- [ ] **Step 6: Rewrite `src/shared/registry/validate.ts` as a thin pass-through**

```ts
// src/shared/registry/validate.ts
import { getHandler } from './handlers/index.js'
import type { RegistryItemKind } from './types.js'

export async function validateSource(item: {
  kind: RegistryItemKind; source: string; alias: string; desc: string;
}): Promise<{ ok: true; exec: string } | { ok: false; reason: string }> {
  return getHandler(item.kind).validate(item)
}
```

- [ ] **Step 7: Re-run the 5 existing `validate.test.ts` tests; all 5 must still pass**

```bash
npm test -- --run tests/shared/registry/validate.test.ts
```

Expected: 5 tests pass. (If any fails, the implementation in Steps 3-5 diverges from the original; restore by re-reading `git show HEAD:src/shared/registry/validate.ts`.)

- [ ] **Step 8: Re-run `base.test.ts` (6 tests) and `index.test.ts` (4 tests)**

```bash
npm test -- --run tests/shared/registry/handlers/
```

Expected: 6 + 4 = 10 tests pass.

- [ ] **Step 9: Re-CRLF + commit**

```bash
git add src/shared/registry/handlers/npm.ts src/shared/registry/handlers/py.ts src/shared/registry/handlers/exe.ts src/shared/registry/validate.ts tests/shared/registry/validate.test.ts tests/shared/registry/handlers/index.test.ts
git commit -m "refactor(handlers): implement three concrete handlers; thin-shell validate.ts"
```

---

### Task 3: Rewrite `run.ts` to use `preflight` + `run` on the handler

**Files:**
- Modify: `src/groups/mgr/run.ts` (body replaced; `commandDef` unchanged)
- Test: `tests/cli/mgr/run.test.ts` (existing 3 tests must still pass; add 1 new preflight test)

**Interfaces:**
- Consumes: `getHandler` from `../../../shared/registry/handlers/index.js`; `error` from `../../../cli/output.js`.
- Produces: same `commandDef` as before (name='run', description, examples, related). The `handler` body calls `getHandler(item.kind).preflight(item)` then `getHandler(item.kind).run(item, args)`.

- [ ] **Step 1: Read the current `run.ts` and the existing 3 `run.test.ts` tests**

Confirm the existing 3 tests:
- `spawns the registered exec with merged args` — happy path.
- `exits 2 when the alias is missing` — alias not in registry.
- `preserves paths containing spaces in exec` — spaced-path regression from Task 6.

All three must pass after the rewrite.

- [ ] **Step 2: Rewrite `src/groups/mgr/run.ts`**

```ts
// src/groups/mgr/run.ts
import { error } from '../../../cli/output.js'
import { getItem } from '../../../shared/registry/store.js'
import { getHandler } from '../../../shared/registry/handlers/index.js'

export async function handler(args: string[]): Promise<void> {
  const [alias, ...rest] = args
  if (!alias) { console.error(error('用法: jc mgr run <alias> [args...]')); process.exit(1) }
  const item = getItem(alias.toLowerCase())
  if (!item) { console.error(error(`未找到 alias: ${alias}`)); process.exit(2) }
  const h = getHandler(item.kind)
  const pre = await h.preflight(item)
  if (!pre.ok) { console.error(error(`${item.alias}: ${pre.reason}（请运行 jc mgr check ${item.alias} 修复）`)); process.exit(2) }
  try {
    await h.run(item, rest)
  } catch (e) {
    console.error(error((e as Error).message || String(e)))
    process.exit(2)
  }
}

export const commandDef = {
  name: 'run',
  description: '按别名执行已注册的项',
  handler,
  examples: ['jc mgr run tsc --version'],
  related: ['jc mgr add', 'jc mgr list'],
}
```

- [ ] **Step 3: Run the existing 3 `run.test.ts` tests; all 3 must still pass**

```bash
npm test -- --run tests/cli/mgr/run.test.ts
```

Expected: 3 tests pass. The existing tests mock `cp.spawn` directly; the new `run` still uses `cp.spawn` (now via the base class), so the mock continues to intercept. The preflight check passes for the registered local exe (`/bin/echo`) and for the spaced-path test (`/tmp/Program Files/tool/mytool.exe` is the preflight target — for that test to pass, the file must exist; if it doesn't, the preflight will reject and the test will fail. Re-read `tests/cli/mgr/run.test.ts` from commit `132bed1` and confirm the file is created in `beforeEach`; if not, add a `beforeEach` that creates it.)

- [ ] **Step 4: Add the new preflight test at the end of `run.test.ts`**

Append (do not replace existing tests):

```ts
  it('exits 2 when preflight rejects (source deleted between add and run)', async () => {
    addItem({ kind: 'exe', source: '/tmp/will-be-deleted.exe', alias: 'gone', desc: '', exec: '/tmp/will-be-deleted.exe', createdAt: 't', sourceVerifiedAt: 't' })
    const { handler } = await import('../../../src/groups/mgr/run.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await expect(handler(['gone'])).rejects.toThrow('exit')
    expect(exit).toHaveBeenCalledWith(2)
    exit.mockRestore()
  })
```

- [ ] **Step 5: Re-run the 4 `run.test.ts` tests; all 4 must pass**

```bash
npm test -- --run tests/cli/mgr/run.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 6: Re-run the full existing test suite to confirm no regression**

```bash
npm test
```

Expected: 33 + 11 (handlers/base + handlers/index + new preflight) = 35-37 tests pass. The pre-existing `cpu.test.ts` flake may still fire; if it does, re-run that file in isolation with `--testTimeout=15000` to confirm the flake is pre-existing.

- [ ] **Step 7: Re-CRLF + commit**

```bash
git add src/groups/mgr/run.ts tests/cli/mgr/run.test.ts
git commit -m "refactor(mgr): run uses handler.preflight + handler.run; remove local spawn"
```

---

### Task 4: Validation sweep

**Files:** read-only across the new and modified files.

**Validation contract (must all pass):**

- [ ] **Step 1: Full test suite**

```bash
npm test
```

Expected: all tests pass. The pre-existing `cpu.test.ts` / `process.test.ts` flakes are unrelated; if they fire, re-run the affected file in isolation with `--testTimeout=15000`.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: tsup succeeds.

- [ ] **Step 3: `route([])` still lists all 4 groups including `jc mgr`**

```bash
node dist/index.js
```

Expected: output includes `jc mgr            统一管理器：注册 npm / py / exe 项并通过别名调用`.

- [ ] **Step 4: `jc mgr list` works (does not depend on handlers)**

```bash
node dist/index.js mgr list
```

Expected: empty registry prints `(空)`.

- [ ] **Step 5: `jc r` shortcut still works (does not depend on handlers)**

```bash
node dist/index.js r
```

Expected: `未知命令: r` (because argv[0]==='r' with length < 2 is not rewritten).

- [ ] **Step 6: Working tree status**

```bash
git status --short
```

Expected: clean working tree (any pre-existing untracked `notes.md` / `task_plan.md` / `.claude/skills/gh-action/` are out of scope).

- [ ] **Step 7: Final commit (if any uncommitted file is left)**

If any file is still modified, stage only the new files and modified files (none of the protected config files), and commit with message `docs(skill): final validation cleanup` (or `chore:` if no docs changed). Do not commit `notes.md`, `task_plan.md`, or `.claude/skills/gh-action/`.

- [ ] **Step 8: Final summary**

Report to the user:
- Total commits made for this feature.
- Per-task test counts and overall pass/fail.
- The exact list of files added and modified.
- Confirmation that the existing `npm-work-flow` skill is unchanged.
- Confirmation that no source or test file outside the planned scope was modified.

Do not run `git push`; the user decides when to push.

---

## Self-Review

1. **Spec coverage:** every spec section maps to a task:
   - Section 4 (Target Layout) → Tasks 1, 2, 3.
   - Section 5.1 (ItemHandler abstract class) → Task 1.
   - Section 5.2 (npm / py / exe subclasses) → Task 2.
   - Section 5.3 (factory table + getHandler) → Task 1.
   - Section 5.4 (validate.ts thin shell) → Task 2.
   - Section 5.5 (run.ts rewritten) → Task 3.
   - Section 6 (data flow) → Tasks 2 and 3.
   - Section 8 (testing strategy) → Tasks 1, 2, 3.
   - Section 9 (risks) → mitigated inline in tasks.
   No gaps.

2. **Placeholder scan:** no `TBD`, `TODO`, "implement later", or "fill in details" patterns.

3. **Type consistency:** `PreflightResult` is defined once in `base.ts` and imported in `npm.ts`. `validate` signature `{ ok: true; exec: string } | { ok: false; reason: string }` is identical across `base.ts` (abstract), `npm.ts` / `py.ts` / `exe.ts` (impls), `validate.ts` (export), and the existing `validate.test.ts` (consumer). `localPath` is `protected` in `base.ts`; the test accesses it via bracket-index (`h['localPath']`), which TypeScript permits for protected members from outside the class only with a cast. The test relies on this, so the cast is intentional.

4. **File scope:** only the listed files are touched. No edits to `package.json`, `tsup.config.ts`, `vitest.config.ts`, `tsconfig.json`. The existing `npm-work-flow` skill (or `gh-action` after the previous task's rename) is not modified.

5. **Step 1 import-resolution workaround in `index.test.ts`:** Task 1 creates the file but cannot import the three concrete subclasses (they are stubs in Task 1, real in Task 2). The plan's Step 2 explicitly notes this and provides a workaround (comment out imports until Task 2 lands). The alternative — making Task 1 create real-but-trivial subclasses that Task 2 replaces — was rejected because it adds churn and the workaround is bounded.
