# jc mgr Unified Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `jc mgr` group that lets users register `npm` / `py` / `exe` resources under a personal alias, invoke them via `jc mgr run <alias>`, and migrate the registry between machines via `jc mgr export` / `jc mgr import`.

**Architecture:** New `src/shared/registry/` subsystem (types / paths / store / validate / confirm) provides the persistence and validation core. Eight new `commandDef`s under `src/groups/mgr/` consume the subsystem. Router gains one line. `confirm()` is promoted from `src/groups/w/file/rm.ts` to `src/shared/registry/confirm.ts`. Skill gains one new reference and one updated reference.

**Tech Stack:** Node 18, ESM, TypeScript strict, Vitest, `systeminformation` (untouched), `child_process.spawn` (existing). No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-07-30-jc-mgr-design.md`

## Global Constraints

- ESM, Node 18, tsup bundle target `node18`, package type `module` (per `tsup.config.ts:6` and `package.json` `type`).
- All relative TypeScript imports must end in `.js` even when the source is `.ts` (existing `project-map.md` rule).
- Exit codes use the existing contract: `0` success, `1` argument/usage error, `2` execution/lookup/validation failure. No new codes.
- Aliases match `^[a-z0-9][a-z0-9_-]{0,31}$` and are stored lowercase.
- The plan's "implementer self-review checklist" applies to every task that adds or changes code:
  1. Re-read the spec section this task binds and tick every must-contain item.
  2. Open cited source files and confirm every `file:line` citation resolves to the claimed content.
  3. Confirm the new file's frontmatter (if Markdown) is well-formed.
  4. Re-run the canonical byte-scan after any CRLF conversion.
- File line endings must be CRLF on Windows. The Write tool on this harness writes LF only; for every new or edited Markdown / TS file, the implementer must run the PowerShell split-form conversion:
  ```powershell
  $p = '<file>'
  $enc = New-Object System.Text.UTF8Encoding($false)
  $content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
  $content = $content -replace "`n","`r`n"
  [IO.File]::WriteAllText($p, $content, $enc)
  ```
  (The chained one-liner trips PowerShell 5.1's `MethodCountCouldNotFindBest`; the split form is mandatory.)
- Verification commands must use PowerShell-native byte scans; `xxd` is not on this PowerShell's PATH and `xxd | Select-String '0d 0a'` undercounts. Canonical check:
  ```powershell
  $p = '<file>'
  $b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
  ```
- `package.json` has `"type": "module"`. Any scratch Node script must use `.cjs` (or be invoked with `node --input-type=commonjs -e`).
- No edits to `package.json`, `tsup.config.ts`, `vitest.config.ts`, or `tsconfig.json`. No new dependencies.
- Only tracked files under `src/groups/mgr/**`, `src/shared/registry/**`, `tests/shared/registry/**`, `tests/cli/mgr/**`, `src/groups/w/file/rm.ts`, `src/cli/router.ts`, `.claude/skills/jc-development/references/registry-and-managed-items.md`, and `.claude/skills/jc-development/references/release-and-publishing.md` are modified or added.

## File Structure

Created (all new):

```
src/shared/registry/
├── types.ts
├── paths.ts
├── store.ts
├── validate.ts
└── confirm.ts

src/groups/mgr/
├── index.ts
├── add.ts
├── list.ts
├── run.ts
├── rm.ts
├── rename.ts
├── check.ts
├── export.ts
└── import.ts

tests/shared/registry/
├── paths.test.ts
├── store.test.ts
└── validate.test.ts

tests/cli/mgr/
├── add.test.ts
├── run.test.ts
└── export-import.test.ts

.claude/skills/jc-development/references/
└── registry-and-managed-items.md
```

Modified:

```
src/cli/router.ts                  (add registerGroup(mgrGroup) at the new line 36)
src/groups/w/file/rm.ts            (replace local confirm() with import from shared/registry/confirm)
.claude/skills/jc-development/references/release-and-publishing.md  (npm-work-flow → gh-action)
```

## Task Outline

1. Task 1 — Create `src/shared/registry/{types,paths}.ts` and the corresponding unit tests.
2. Task 2 — Create `src/shared/registry/store.ts` and its unit tests.
3. Task 3 — Create `src/shared/registry/confirm.ts`; update `src/groups/w/file/rm.ts` to import it.
4. Task 4 — Create `src/shared/registry/validate.ts` and its unit tests.
5. Task 5 — Create `src/groups/mgr/{index,add,list}.ts` and the `add` test.
6. Task 6 — Create `src/groups/mgr/{run,rm,rename,check}.ts` and the `run` test.
7. Task 7 — Create `src/groups/mgr/{export,import}.ts` and the export/import test.
8. Task 8 — Register `mgrGroup` in `src/cli/router.ts`; run the full `npm test` and `node dist/index.js` smoke.
9. Task 9 — Add the new `registry-and-managed-items.md` reference; update `release-and-publishing.md` for the `npm-work-flow` → `gh-action` rename.
10. Task 10 — Validation: line counts, CRLF sweep, code-block cap, link integrity, no regressions in existing tests.

Each task ends with a commit.

---

### Task 1: `types.ts` and `paths.ts` with tests

**Files:**
- Create: `src/shared/registry/types.ts`
- Create: `src/shared/registry/paths.ts`
- Test: `tests/shared/registry/paths.test.ts`

**Interfaces:**
- Produces: `RegistryItemKind` (union `'npm' | 'py' | 'exe'`), `RegistryItem`, `RegistryFile` (with `version: 1` and `items: RegistryItem[]`), `ALIAS_RE` regex. `getRegistryPath(): string`, `ensureRegistryDir(): void`. All exported from their respective files; consumers in later tasks import them by named symbol.

- [ ] **Step 1: Write the failing test for `paths.test.ts`**

Create `tests/shared/registry/paths.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('registry paths', () => {
  let origXdg: string | undefined
  let origAppData: string | undefined

  beforeEach(() => {
    origXdg = process.env.XDG_CONFIG_HOME
    origAppData = process.env.APPDATA
  })

  afterEach(() => {
    if (origXdg === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdg
    if (origAppData === undefined) delete process.env.APPDATA
    else process.env.APPDATA = origAppData
  })

  it('uses XDG_CONFIG_HOME/jc/registry.json when XDG is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'jc-paths-'))
    try {
      process.env.XDG_CONFIG_HOME = dir
      const { getRegistryPath } = await import('../../../src/shared/registry/paths.js')
      expect(getRegistryPath()).toBe(join(dir, 'jc', 'registry.json'))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('uses APPDATA/jc/registry.json on win32 when APPDATA is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'jc-paths-'))
    try {
      const origPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })
      process.env.APPDATA = dir
      const { getRegistryPath } = await import('../../../src/shared/registry/paths.js')
      expect(getRegistryPath()).toBe(join(dir, 'jc', 'registry.json'))
      Object.defineProperty(process, 'platform', { value: origPlatform })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('ensureRegistryDir creates the parent directory', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'jc-paths-'))
    try {
      process.env.XDG_CONFIG_HOME = dir
      const { ensureRegistryDir, getRegistryPath } = await import('../../../src/shared/registry/paths.js')
      ensureRegistryDir()
      const parent = getRegistryPath().replace(/registry\.json$/, '')
      expect(existsSync(parent)).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --input-type=commonjs -e "import('vitest/node').then(()=>process.exit(0))" 2>&1 | head -3`
Run: `npm test -- --run tests/shared/registry/paths.test.ts 2>&1 | tail -20`
Expected: FAIL — module not found, because `paths.ts` does not exist.

- [ ] **Step 3: Write `src/shared/registry/types.ts`**

```ts
// src/shared/registry/types.ts
export type RegistryItemKind = 'npm' | 'py' | 'exe'

export const ALIAS_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/

export interface RegistryItem {
  kind: RegistryItemKind
  source: string
  alias: string
  desc: string
  exec: string
  args?: string[]
  createdAt: string
  sourceVerifiedAt: string
}

export interface RegistryFile {
  version: 1
  items: RegistryItem[]
}
```

- [ ] **Step 4: Write `src/shared/registry/paths.ts`**

```ts
// src/shared/registry/paths.ts
import { mkdirSync } from 'fs'
import { join } from 'path'

export function getRegistryPath(): string {
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Roaming')
    return join(base, 'jc', 'registry.json')
  }
  const base = process.env.XDG_CONFIG_HOME || join(process.env.HOME || '', '.config')
  return join(base, 'jc', 'registry.json')
}

export function ensureRegistryDir(): void {
  const file = getRegistryPath()
  const parent = file.replace(/registry\.json$/, '')
  mkdirSync(parent, { recursive: true })
}
```

- [ ] **Step 5: Re-CRLF + verify the test passes**

After Write, run the PowerShell split-form conversion on each new file (Task 1's Global Constraint). Then:

```bash
npm test -- --run tests/shared/registry/paths.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/registry/types.ts src/shared/registry/paths.ts tests/shared/registry/paths.test.ts
git commit -m "feat(registry): add types and XDG path resolution"
```

---

### Task 2: `store.ts` with tests

**Files:**
- Create: `src/shared/registry/store.ts`
- Test: `tests/shared/registry/store.test.ts`

**Interfaces:**
- Consumes: `RegistryItem`, `RegistryFile` from `./types.js`; `getRegistryPath`, `ensureRegistryDir` from `./paths.js`.
- Produces: `readRegistry(): RegistryFile`, `writeRegistry(file: RegistryFile): void`, `addItem(item: RegistryItem): void`, `removeItem(alias: string): void`, `renameItem(oldAlias: string, newAlias: string): void`, `updateItemDesc(alias: string, newDesc: string): void`, `updateItemVerifiedAt(alias: string, iso: string): void`, `getItem(alias: string): RegistryItem | undefined`, `listItems(): RegistryItem[]`.
- `writeRegistry` uses an atomic write (write to `<path>.tmp`, then `renameSync` to `<path>`). On read, if the file does not exist, returns `{ version: 1, items: [] }`.

- [ ] **Step 1: Write the failing test for `store.test.ts`**

Create `tests/shared/registry/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('registry store', () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), 'jc-store-'))
    process.env.XDG_CONFIG_HOME = dir
  })

  it('readRegistry returns an empty file when none exists', async () => {
    const { readRegistry } = await import('../../../src/shared/registry/store.js')
    expect(readRegistry()).toEqual({ version: 1, items: [] })
  })

  it('addItem / getItem / listItems round-trip', async () => {
    const { readRegistry, addItem, getItem, listItems } = await import('../../../src/shared/registry/store.js')
    addItem({
      kind: 'npm', source: 'pkg', alias: 'foo', desc: 'd', exec: 'npx -p pkg foo',
      createdAt: '2026-07-30T00:00:00Z', sourceVerifiedAt: '2026-07-30T00:00:00Z',
    })
    expect(getItem('foo')?.source).toBe('pkg')
    expect(listItems()).toHaveLength(1)
  })

  it('removeItem drops the entry', async () => {
    const { addItem, removeItem, listItems } = await import('../../../src/shared/registry/store.js')
    addItem({ kind: 'py', source: '/tmp/x.py', alias: 'a', desc: '', exec: 'python /tmp/x.py', createdAt: 't', sourceVerifiedAt: 't' })
    removeItem('a')
    expect(listItems()).toHaveLength(0)
  })

  it('renameItem renames and preserves fields', async () => {
    const { addItem, renameItem, getItem } = await import('../../../src/shared/registry/store.js')
    addItem({ kind: 'exe', source: '/x.exe', alias: 'old', desc: 'd', exec: '/x.exe', createdAt: 't', sourceVerifiedAt: 't' })
    renameItem('old', 'new')
    expect(getItem('old')).toBeUndefined()
    expect(getItem('new')?.source).toBe('/x.exe')
  })

  it('updateItemDesc mutates only desc', async () => {
    const { addItem, updateItemDesc, getItem } = await import('../../../src/shared/registry/store.js')
    addItem({ kind: 'npm', source: 'pkg', alias: 'a', desc: 'old', exec: 'x', createdAt: 't', sourceVerifiedAt: 't' })
    updateItemDesc('a', 'new')
    expect(getItem('a')?.desc).toBe('new')
    expect(getItem('a')?.exec).toBe('x')
  })

  it('writeRegistry is atomic (no .tmp left behind)', async () => {
    const { writeRegistry, getRegistryPath } = await import('../../../src/shared/registry/store.js')
    writeRegistry({ version: 1, items: [] })
    expect(existsSync(getRegistryPath() + '.tmp')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/shared/registry/store.test.ts 2>&1 | tail -20`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/shared/registry/store.ts`**

```ts
// src/shared/registry/store.ts
import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs'
import { getRegistryPath } from './paths.js'
import type { RegistryItem, RegistryFile } from './types.js'

export function readRegistry(): RegistryFile {
  const path = getRegistryPath()
  if (!existsSync(path)) return { version: 1, items: [] }
  const raw = readFileSync(path, 'utf-8')
  if (!raw.trim()) return { version: 1, items: [] }
  return JSON.parse(raw) as RegistryFile
}

export function writeRegistry(file: RegistryFile): void {
  const path = getRegistryPath()
  const tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(file, null, 2), 'utf-8')
  renameSync(tmp, path)
}

function withFile(mutator: (file: RegistryFile) => RegistryFile): void {
  const file = readRegistry()
  writeRegistry(mutator(file))
}

export function getItem(alias: string): RegistryItem | undefined {
  return readRegistry().items.find(i => i.alias === alias)
}

export function listItems(): RegistryItem[] {
  return readRegistry().items
}

export function addItem(item: RegistryItem): void {
  withFile(f => ({ version: 1, items: [...f.items, item] }))
}

export function removeItem(alias: string): void {
  withFile(f => ({ version: 1, items: f.items.filter(i => i.alias !== alias) }))
}

export function renameItem(oldAlias: string, newAlias: string): void {
  withFile(f => ({
    version: 1,
    items: f.items.map(i => (i.alias === oldAlias ? { ...i, alias: newAlias } : i)),
  }))
}

export function updateItemDesc(alias: string, newDesc: string): void {
  withFile(f => ({
    version: 1,
    items: f.items.map(i => (i.alias === alias ? { ...i, desc: newDesc } : i)),
  }))
}

export function updateItemVerifiedAt(alias: string, iso: string): void {
  withFile(f => ({
    version: 1,
    items: f.items.map(i => (i.alias === alias ? { ...i, sourceVerifiedAt: iso } : i)),
  }))
}
```

- [ ] **Step 4: Re-CRLF + verify the test passes**

After Write + PowerShell split-form conversion:

```bash
npm test -- --run tests/shared/registry/store.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/registry/store.ts tests/shared/registry/store.test.ts
git commit -m "feat(registry): add store with atomic write"
```

---

### Task 3: `confirm.ts` extracted from `rm.ts`

**Files:**
- Create: `src/shared/registry/confirm.ts`
- Modify: `src/groups/w/file/rm.ts:1-13` — replace the local `confirm()` with an import from `confirm.ts`.

**Interfaces:**
- Produces: `confirm(prompt: string): Promise<boolean>` from `./confirm.js`. Same body as the current local helper in `rm.ts:5-13`.

- [ ] **Step 1: Write `src/shared/registry/confirm.ts`**

```ts
// src/shared/registry/confirm.ts
import { createInterface } from 'readline'

export function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}
```

- [ ] **Step 2: Update `src/groups/w/file/rm.ts`**

Read `src/groups/w/file/rm.ts`. Replace the local `confirm()` definition (lines 5-13) with an import. The new top of the file should look like:

```ts
// src/groups/w/file/rm.ts
import { confirm } from '../../shared/registry/confirm.js'
import { error } from '../../cli/output.js'
import { existsSync } from 'fs'
// ...existing imports preserved as needed...
```

Delete the old `function confirm(prompt: string): Promise<boolean> { ... }` block. The call site at `rm.ts:26` is unchanged.

- [ ] **Step 3: Run the existing tests**

```bash
npm test
```

Expected: all existing tests pass. No new tests are added; the contract is unchanged.

- [ ] **Step 4: Re-CRLF + commit**

Apply the PowerShell split-form conversion to both files:

```bash
git add src/shared/registry/confirm.ts src/groups/w/file/rm.ts
git commit -m "refactor: promote confirm() to shared/registry"
```

---

### Task 4: `validate.ts` with tests

**Files:**
- Create: `src/shared/registry/validate.ts`
- Test: `tests/shared/registry/validate.test.ts`

**Interfaces:**
- Consumes: `RegistryItemKind`, `RegistryItem` from `./types.js`.
- Produces: `validateSource(item: { kind: RegistryItemKind, source: string, alias: string, desc: string }): Promise<{ ok: true, exec: string } | { ok: false, reason: string }>`.
- Branches on `kind`:
  - `npm`: parses `<pkg>[@<ver>]` from `source`; runs `spawnSync('npm', ['view', pkg, 'version'], { timeout: 10000 })`. On `status === 0`, returns `exec = 'npx -p <pkg> <bin>'` where `bin = pkg.split('/').pop()`.
  - `py` URL: `fetch(source, { method: 'HEAD', signal: AbortSignal.timeout(5000) })`. On `response.ok`, returns `exec = 'python <source>'` (v1 does not pre-download; out-of-scope per spec).
  - `py` local: `fs.access(source, fs.constants.R_OK)`. On success, returns `exec = 'python <absolute path>'`.
  - `exe` URL: `fetch(source, { method: 'HEAD', signal: AbortSignal.timeout(5000) })`. On `response.ok`, returns `exec = '<source>'` (v1 does not pre-download).
  - `exe` local: `fs.access` + `statSync(...).isFile()`. On success, returns `exec = '<absolute path>'`.

- [ ] **Step 1: Write the failing test for `validate.test.ts`**

Create `tests/shared/registry/validate.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { spawnSync } from 'child_process'

describe('validate local', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jc-val-')) })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  it('validates a readable local py file', async () => {
    const f = join(dir, 'x.py')
    writeFileSync(f, 'print(1)')
    const { validateSource } = await import('../../../src/shared/registry/validate.js')
    const r = await validateSource({ kind: 'py', source: f, alias: 'a', desc: '' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.exec).toBe(`python ${f}`)
  })

  it('rejects a missing local exe', async () => {
    const { validateSource } = await import('../../../src/shared/registry/validate.js')
    const r = await validateSource({ kind: 'exe', source: join(dir, 'missing.exe'), alias: 'a', desc: '' })
    expect(r.ok).toBe(false)
  })

  it('validates a readable local exe file', async () => {
    const f = join(dir, 'tool.exe')
    writeFileSync(f, 'MZ')
    const { validateSource } = await import('../../../src/shared/registry/validate.js')
    const r = await validateSource({ kind: 'exe', source: f, alias: 'a', desc: '' })
    expect(r.ok).toBe(true)
  })
})

describe('validate npm', () => {
  afterEach(() => vi.restoreAllMocks())

  it('accepts when npm view returns 0', async () => {
    vi.spyOn(require('child_process'), 'spawnSync').mockReturnValue({ status: 0 } as any)
    const { validateSource } = await import('../../../src/shared/registry/validate.js')
    const r = await validateSource({ kind: 'npm', source: 'typescript', alias: 'tsc', desc: '' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.exec).toBe('npx -p typescript tsc')
  })

  it('rejects when npm view returns non-zero', async () => {
    vi.spyOn(require('child_process'), 'spawnSync').mockReturnValue({ status: 1 } as any)
    const { validateSource } = await import('../../../src/shared/registry/validate.js')
    const r = await validateSource({ kind: 'npm', source: 'no-such-pkg', alias: 'x', desc: '' })
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/shared/registry/validate.test.ts 2>&1 | tail -20`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/shared/registry/validate.ts`**

```ts
// src/shared/registry/validate.ts
import { spawnSync } from 'child_process'
import { access, statSync } from 'fs'
import { resolve } from 'path'
import type { RegistryItemKind } from './types.js'

export type ValidateResult =
  | { ok: true; exec: string }
  | { ok: false; reason: string }

function absolute(p: string): string { return resolve(p) }

export async function validateSource(item: {
  kind: RegistryItemKind
  source: string
  alias: string
  desc: string
}): Promise<ValidateResult> {
  if (item.kind === 'npm') {
    const m = item.source.match(/^(@?[^@/]+(?:\/[^@/]+)?)(?:@.+)?$/)
    if (!m) return { ok: false, reason: `invalid npm source: ${item.source}` }
    const pkg = m[1]
    const bin = pkg.split('/').pop()!
    const r = spawnSync('npm', ['view', pkg, 'version'], { timeout: 10000 })
    if (r.status !== 0) return { ok: false, reason: `npm view ${pkg} failed` }
    return { ok: true, exec: `npx -p ${pkg} ${bin}` }
  }

  const isUrl = /^https?:\/\//.test(item.source)

  if (item.kind === 'py') {
    if (isUrl) {
      try {
        const res = await fetch(item.source, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (!res.ok) return { ok: false, reason: `HEAD ${item.source} -> ${res.status}` }
        return { ok: true, exec: `python ${item.source}` }
      } catch (e) {
        return { ok: false, reason: `HEAD ${item.source} failed: ${(e as Error).message}` }
      }
    }
    const p = absolute(item.source)
    await new Promise<void>((resolveP, rejectP) => access(p, (err: NodeJS.ErrnoException | null) => err ? rejectP(err) : resolveP()))
    return { ok: true, exec: `python ${p}` }
  }

  // exe
  if (isUrl) {
    try {
      const res = await fetch(item.source, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      if (!res.ok) return { ok: false, reason: `HEAD ${item.source} -> ${res.status}` }
      return { ok: true, exec: item.source }
    } catch (e) {
      return { ok: false, reason: `HEAD ${item.source} failed: ${(e as Error).message}` }
    }
  }
  const p = absolute(item.source)
  await new Promise<void>((resolveP, rejectP) => access(p, (err: NodeJS.ErrnoException | null) => err ? rejectP(err) : resolveP()))
  if (!statSync(p).isFile()) return { ok: false, reason: `${p} is not a file` }
  return { ok: true, exec: p }
}
```

- [ ] **Step 4: Re-CRLF + verify the test passes**

After Write + PowerShell split-form conversion:

```bash
npm test -- --run tests/shared/registry/validate.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/registry/validate.ts tests/shared/registry/validate.test.ts
git commit -m "feat(registry): add source validation for npm/py/exe"
```

---

### Task 5: `mgr` group — `index.ts`, `add.ts`, `list.ts`

**Files:**
- Create: `src/groups/mgr/index.ts`
- Create: `src/groups/mgr/add.ts`
- Create: `src/groups/mgr/list.ts`
- Test: `tests/cli/mgr/add.test.ts`

**Interfaces:**
- Consumes: `validateSource` from `../../../shared/registry/validate.js`, `addItem`, `getItem`, `listItems` from `../../../shared/registry/store.js`, `error` from `../../../cli/output.js`. `Group` from `../../cli/types.js`.
- Produces: `mgrGroup: Group` with `commands: [addCmd, listCmd, ...]`. The list file is later expanded in Tasks 6-7. After Task 5, the group has only `add` and `list` registered; that is enough to run a partial smoke. Tasks 6 and 7 add the rest.

- [ ] **Step 1: Write `src/groups/mgr/add.ts`**

```ts
// src/groups/mgr/add.ts
import { error } from '../../../cli/output.js'
import { addItem, getItem } from '../../../shared/registry/store.js'
import { validateSource } from '../../../shared/registry/validate.js'
import { ALIAS_RE, type RegistryItemKind } from '../../../shared/registry/types.js'

const VALID_KINDS: RegistryItemKind[] = ['npm', 'py', 'exe']

function parseArgs(args: string[]): { kind: RegistryItemKind; source: string; alias: string; desc: string } | null {
  let kind: RegistryItemKind | undefined
  let source: string | undefined
  let alias: string | undefined
  let desc = ''
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--alias') { alias = args[++i] }
    else if (a === '--desc') { desc = args[++i] ?? '' }
    else if (!kind) {
      if (!VALID_KINDS.includes(a as RegistryItemKind)) { console.error(error(`未知类型: ${a}`)); process.exit(1) }
      kind = a as RegistryItemKind
    } else if (!source) { source = a }
  }
  if (!kind || !source || !alias) { console.error(error('用法: jc mgr add <npm|py|exe> <source> --alias <alias> [--desc <desc>]')); process.exit(1) }
  if (!ALIAS_RE.test(alias)) { console.error(error(`alias 非法: ${alias}（应匹配 ^[a-z0-9][a-z0-9_-]{0,31}$）`)); process.exit(1) }
  return { kind, source, alias: alias.toLowerCase(), desc }
}

export async function handler(args: string[]): Promise<void> {
  const parsed = parseArgs(args)
  if (!parsed) return
  if (getItem(parsed.alias)) { console.error(error(`alias 已存在: ${parsed.alias}`)); process.exit(2) }
  const v = await validateSource(parsed)
  if (!v.ok) { console.error(error(v.reason)); process.exit(2) }
  const now = new Date().toISOString()
  addItem({ ...parsed, exec: v.exec, createdAt: now, sourceVerifiedAt: now })
  console.log(`已注册: ${parsed.alias} -> ${v.exec}`)
}

export const commandDef = {
  name: 'add',
  description: '注册一个 npm 包 / Python 脚本 / EXE 脚本到统一管理器',
  handler,
  examples: ['jc mgr add npm typescript --alias tsc --desc "TS 编译器"'],
  related: ['jc mgr list', 'jc mgr run'],
}
```

- [ ] **Step 2: Write `src/groups/mgr/list.ts`**

```ts
// src/groups/mgr/list.ts
import { listItems } from '../../../shared/registry/store.js'

export async function handler(_args: string[]): Promise<void> {
  const items = listItems()
  if (items.length === 0) { console.log('(空)'); return }
  console.table(items.map(i => ({ alias: i.alias, kind: i.kind, desc: i.desc, exec: i.exec })))
}

export const commandDef = {
  name: 'list',
  description: '列出已注册的项',
  handler,
  examples: ['jc mgr list'],
  related: ['jc mgr add', 'jc mgr rm'],
}
```

- [ ] **Step 3: Write `src/groups/mgr/index.ts` (provisional — extended in Tasks 6-7)**

```ts
// src/groups/mgr/index.ts
import type { Group } from '../../cli/types.js'
import { commandDef as addCmd } from './add.js'
import { commandDef as listCmd } from './list.js'

export const mgrGroup: Group = {
  name: 'mgr',
  alias: 'm',
  description: '统一管理器：注册 npm / py / exe 项并通过别名调用',
  commands: [addCmd, listCmd],
}
```

- [ ] **Step 4: Write the failing test for `add.test.ts`**

Create `tests/cli/mgr/add.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('mgr add handler', () => {
  beforeEach(() => {
    process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'jc-mgr-add-'))
  })

  it('writes a registry item on a successful local exe', async () => {
    const tmp = process.env.XDG_CONFIG_HOME!
    const exe = join(tmp, 'tool.exe')
    require('fs').writeFileSync(exe, 'MZ')
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await handler(['exe', exe, '--alias', 'tool'])
    const reg = JSON.parse(readFileSync(join(tmp, 'jc', 'registry.json'), 'utf-8'))
    expect(reg.items[0].alias).toBe('tool')
    expect(reg.items[0].kind).toBe('exe')
    exit.mockRestore()
  })

  it('exits 2 when the source cannot be validated', async () => {
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await expect(handler(['exe', '/no/such/file', '--alias', 'x'])).rejects.toThrow('exit')
    expect(exit).toHaveBeenCalledWith(2)
    exit.mockRestore()
  })

  it('exits 2 when the alias already exists', async () => {
    const { addItem } = await import('../../../src/shared/registry/store.js')
    addItem({ kind: 'py', source: '/tmp/x.py', alias: 'foo', desc: '', exec: 'python /tmp/x.py', createdAt: 't', sourceVerifiedAt: 't' })
    const { handler } = await import('../../../src/groups/mgr/add.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await expect(handler(['py', '/tmp/x.py', '--alias', 'foo'])).rejects.toThrow('exit')
    expect(exit).toHaveBeenCalledWith(2)
    exit.mockRestore()
  })
})
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test -- --run tests/cli/mgr/add.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Re-CRLF + commit**

After PowerShell split-form conversion on each new file:

```bash
git add src/groups/mgr/index.ts src/groups/mgr/add.ts src/groups/mgr/list.ts tests/cli/mgr/add.test.ts
git commit -m "feat(mgr): add mgr group with add and list commands"
```

---

### Task 6: `mgr` group — `run.ts`, `rm.ts`, `rename.ts`, `check.ts`

**Files:**
- Create: `src/groups/mgr/run.ts`
- Create: `src/groups/mgr/rm.ts`
- Create: `src/groups/mgr/rename.ts`
- Create: `src/groups/mgr/check.ts`
- Modify: `src/groups/mgr/index.ts` — register the four new commands.
- Test: `tests/cli/mgr/run.test.ts`

**Interfaces:**
- Consumes: `getItem`, `removeItem`, `renameItem`, `updateItemVerifiedAt` from `../../../shared/registry/store.js`; `validateSource` from `../../../shared/registry/validate.js`; `confirm` from `../../../shared/registry/confirm.js`; `error` from `../../../cli/output.js`.
- Produces: four new `commandDef`s; `mgrGroup.commands` extended.

- [ ] **Step 1: Write `src/groups/mgr/run.ts`**

```ts
// src/groups/mgr/run.ts
import { spawn } from 'child_process'
import { error } from '../../../cli/output.js'
import { getItem } from '../../../shared/registry/store.js'

export async function handler(args: string[]): Promise<void> {
  const [alias, ...rest] = args
  if (!alias) { console.error(error('用法: jc mgr run <alias> [args...]')); process.exit(1) }
  const item = getItem(alias.toLowerCase())
  if (!item) { console.error(error(`未找到 alias: ${alias}`)); process.exit(2) }
  const argv = [...(item.args || []), ...rest]
  const tokens = item.exec.split(/\s+/)
  const cmd = tokens[0]
  const execArgv = [...tokens.slice(1), ...argv]
  await new Promise<void>((resolveP, rejectP) => {
    const child = spawn(cmd, execArgv, { stdio: 'inherit' })
    child.on('close', c => c === 0 ? resolveP() : rejectP(new Error(`exit ${c}`)))
    child.on('error', rejectP)
  }).catch(e => { console.error(error(String((e as Error).message || e))); process.exit(2) })
}

export const commandDef = {
  name: 'run',
  description: '按别名执行已注册的项',
  handler,
  examples: ['jc mgr run tsc --version'],
  related: ['jc mgr add', 'jc mgr list'],
}
```

- [ ] **Step 2: Write `src/groups/mgr/rm.ts`**

```ts
// src/groups/mgr/rm.ts
import { error } from '../../../cli/output.js'
import { confirm } from '../../../shared/registry/confirm.js'
import { getItem, removeItem } from '../../../shared/registry/store.js'

export async function handler(args: string[]): Promise<void> {
  const [alias] = args
  if (!alias) { console.error(error('用法: jc mgr rm <alias>')); process.exit(1) }
  const item = getItem(alias.toLowerCase())
  if (!item) { console.error(error(`未找到 alias: ${alias}`)); process.exit(2) }
  const ok = await confirm(`确认删除 alias "${item.alias}"? (y/N) `)
  if (!ok) { console.log('已取消'); return }
  removeItem(item.alias)
  console.log(`已删除: ${item.alias}`)
}

export const commandDef = {
  name: 'rm',
  description: '按别名删除已注册的项（需确认）',
  handler,
  examples: ['jc mgr rm tsc'],
  related: ['jc mgr list', 'jc mgr rename'],
}
```

- [ ] **Step 3: Write `src/groups/mgr/rename.ts`**

```ts
// src/groups/mgr/rename.ts
import { error } from '../../../cli/output.js'
import { ALIAS_RE } from '../../../shared/registry/types.js'
import { confirm } from '../../../shared/registry/confirm.js'
import { getItem, renameItem } from '../../../shared/registry/store.js'

export async function handler(args: string[]): Promise<void> {
  const [oldAlias, newAlias] = args
  if (!oldAlias || !newAlias) { console.error(error('用法: jc mgr rename <old-alias> <new-alias>')); process.exit(1) }
  if (!ALIAS_RE.test(newAlias)) { console.error(error(`alias 非法: ${newAlias}`)); process.exit(1) }
  const old = oldAlias.toLowerCase()
  const next = newAlias.toLowerCase()
  const item = getItem(old)
  if (!item) { console.error(error(`未找到 alias: ${old}`)); process.exit(2) }
  if (getItem(next)) { console.error(error(`alias 已存在: ${next}`)); process.exit(2) }
  const ok = await confirm(`确认将 "${old}" 改名为 "${next}"? (y/N) `)
  if (!ok) { console.log('已取消'); return }
  renameItem(old, next)
  console.log(`已改名: ${old} -> ${next}`)
}

export const commandDef = {
  name: 'rename',
  description: '修改已注册项的别名（需确认）',
  handler,
  examples: ['jc mgr rename tsc tscc'],
  related: ['jc mgr rm', 'jc mgr list'],
}
```

- [ ] **Step 4: Write `src/groups/mgr/check.ts`**

```ts
// src/groups/mgr/check.ts
import { error } from '../../../cli/output.js'
import { getItem, updateItemVerifiedAt } from '../../../shared/registry/store.js'
import { validateSource } from '../../../shared/registry/validate.js'

export async function handler(args: string[]): Promise<void> {
  const [alias] = args
  if (!alias) { console.error(error('用法: jc mgr check <alias>')); process.exit(1) }
  const item = getItem(alias.toLowerCase())
  if (!item) { console.error(error(`未找到 alias: ${alias}`)); process.exit(2) }
  const v = await validateSource(item)
  if (!v.ok) { console.error(error(`${item.alias} 不可达: ${v.reason}`)); process.exit(2) }
  updateItemVerifiedAt(item.alias, new Date().toISOString())
  console.log(`OK: ${item.alias} (${v.exec})`)
}

export const commandDef = {
  name: 'check',
  description: '重新验证已注册项的源是否可达',
  handler,
  examples: ['jc mgr check tsc'],
  related: ['jc mgr add', 'jc mgr list'],
}
```

- [ ] **Step 5: Update `src/groups/mgr/index.ts` to register the four new commands**

```ts
// src/groups/mgr/index.ts
import type { Group } from '../../cli/types.js'
import { commandDef as addCmd } from './add.js'
import { commandDef as listCmd } from './list.js'
import { commandDef as runCmd } from './run.js'
import { commandDef as rmCmd } from './rm.js'
import { commandDef as renameCmd } from './rename.js'
import { commandDef as checkCmd } from './check.js'

export const mgrGroup: Group = {
  name: 'mgr',
  alias: 'm',
  description: '统一管理器：注册 npm / py / exe 项并通过别名调用',
  commands: [addCmd, listCmd, runCmd, rmCmd, renameCmd, checkCmd],
}
```

- [ ] **Step 6: Write the failing test for `run.test.ts`**

Create `tests/cli/mgr/run.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import * as cp from 'child_process'
import { addItem } from '../../../src/shared/registry/store.js'

describe('mgr run handler', () => {
  beforeEach(() => {
    process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'jc-mgr-run-'))
  })

  it('spawns the registered exec with merged args', async () => {
    addItem({ kind: 'exe', source: '/bin/echo', alias: 'echo', desc: '', exec: '/bin/echo hi', createdAt: 't', sourceVerifiedAt: 't' })
    const spawn = vi.spyOn(cp, 'spawn').mockImplementation(((cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe('/bin/echo')
      expect(args).toEqual(['hi', 'extra'])
      return require('child_process').spawn('/bin/echo', ['hi', 'extra']) as any
    }) as any)
    const { handler } = await import('../../../src/groups/mgr/run.js')
    await handler(['echo', 'extra'])
    expect(spawn).toHaveBeenCalled()
    spawn.mockRestore()
  })

  it('exits 2 when the alias is missing', async () => {
    const { handler } = await import('../../../src/groups/mgr/run.js')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit') }) as any)
    await expect(handler(['nope'])).rejects.toThrow('exit')
    expect(exit).toHaveBeenCalledWith(2)
    exit.mockRestore()
  })
})
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npm test -- --run tests/cli/mgr/run.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 8: Re-CRLF + commit**

After PowerShell split-form conversion on each new/modified file:

```bash
git add src/groups/mgr/run.ts src/groups/mgr/rm.ts src/groups/mgr/rename.ts src/groups/mgr/check.ts src/groups/mgr/index.ts tests/cli/mgr/run.test.ts
git commit -m "feat(mgr): add run, rm, rename, check commands"
```

---

### Task 7: `mgr` group — `export.ts`, `import.ts`

**Files:**
- Create: `src/groups/mgr/export.ts`
- Create: `src/groups/mgr/import.ts`
- Modify: `src/groups/mgr/index.ts` — register the two new commands.
- Test: `tests/cli/mgr/export-import.test.ts`

**Interfaces:**
- Consumes: `readRegistry` / `writeRegistry` / `getItem` from `../../../shared/registry/store.js`; `ALIAS_RE` and `RegistryFile` from `../../../shared/registry/types.js`; `error` from `../../../cli/output.js`.
- Produces: two new `commandDef`s.

- [ ] **Step 1: Write `src/groups/mgr/export.ts`**

```ts
// src/groups/mgr/export.ts
import { readRegistry } from '../../../shared/registry/store.js'

export async function handler(_args: string[]): Promise<void> {
  process.stdout.write(JSON.stringify(readRegistry(), null, 2) + '\n')
}

export const commandDef = {
  name: 'export',
  description: '将注册表导出为 JSON 到 stdout',
  handler,
  examples: ['jc mgr export > registry.json'],
  related: ['jc mgr import'],
}
```

- [ ] **Step 2: Write `src/groups/mgr/import.ts`**

```ts
// src/groups/mgr/import.ts
import { readFileSync } from 'fs'
import { error } from '../../../cli/output.js'
import { addItem, getItem, writeRegistry } from '../../../shared/registry/store.js'
import { ALIAS_RE, type RegistryFile } from '../../../shared/registry/types.js'

function shapeOf(obj: unknown): obj is RegistryFile {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return o.version === 1 && Array.isArray(o.items)
}

export async function handler(args: string[]): Promise<void> {
  const [pathArg, ...rest] = args
  let raw: string
  if (pathArg) {
    raw = readFileSync(pathArg, 'utf-8')
  } else {
    raw = await new Promise<string>(resolveP => {
      let buf = ''
      process.stdin.setEncoding('utf-8')
      process.stdin.on('data', c => { buf += c })
      process.stdin.on('end', () => resolveP(buf))
    })
  }
  const strict = rest.includes('--strict')
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch (e) { console.error(error(`JSON 解析失败: ${(e as Error).message}`)); process.exit(1) }
  if (!shapeOf(parsed)) { console.error(error('JSON 形态错误：缺少 version: 1 或 items 数组')); process.exit(1) }

  let imported = 0, skipped = 0, failed = 0
  for (const item of parsed.items) {
    if (!item || typeof item !== 'object') { failed++; continue }
    const it = item as Record<string, unknown>
    if (typeof it.alias !== 'string' || !ALIAS_RE.test(it.alias)) { failed++; continue }
    if (getItem(it.alias)) { skipped++; continue }
    if (it.kind !== 'npm' && it.kind !== 'py' && it.kind !== 'exe') { failed++; continue }
    addItem({
      kind: it.kind as 'npm' | 'py' | 'exe',
      source: String(it.source ?? ''),
      alias: it.alias.toLowerCase(),
      desc: String(it.desc ?? ''),
      exec: String(it.exec ?? ''),
      args: Array.isArray(it.args) ? (it.args as string[]) : undefined,
      createdAt: String(it.createdAt ?? new Date().toISOString()),
      sourceVerifiedAt: String(it.sourceVerifiedAt ?? new Date().toISOString()),
    })
    imported++
  }
  console.log(`imported=${imported} skipped=${skipped} failed=${failed}`)
  if (strict && (failed > 0 || skipped > 0)) process.exit(2)
}

export const commandDef = {
  name: 'import',
  description: '从文件或 stdin 导入注册表 JSON',
  handler,
  examples: ['jc mgr import registry.json', 'cat registry.json | jc mgr import --strict'],
  related: ['jc mgr export'],
}
```

- [ ] **Step 3: Update `src/groups/mgr/index.ts` to register the two new commands**

```ts
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

export const mgrGroup: Group = {
  name: 'mgr',
  alias: 'm',
  description: '统一管理器：注册 npm / py / exe 项并通过别名调用',
  commands: [addCmd, listCmd, runCmd, rmCmd, renameCmd, checkCmd, exportCmd, importCmd],
}
```

- [ ] **Step 4: Write the failing test for `export-import.test.ts`**

Create `tests/cli/mgr/export-import.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { addItem, readRegistry } from '../../../src/shared/registry/store.js'

describe('mgr export / import', () => {
  beforeEach(() => {
    process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'jc-mgr-expimp-'))
  })

  it('export writes the registry as JSON to stdout', async () => {
    addItem({ kind: 'py', source: '/x.py', alias: 'a', desc: '', exec: 'python /x.py', createdAt: 't', sourceVerifiedAt: 't' })
    const captured: string[] = []
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((s: any) => { captured.push(String(s)); return true }) as any)
    const { handler } = await import('../../../src/groups/mgr/export.js')
    await handler([])
    const joined = captured.join('')
    expect(JSON.parse(joined).items[0].alias).toBe('a')
    writeSpy.mockRestore()
  })

  it('import reads a file, preserves fields, and reports counts', async () => {
    const file = join(process.env.XDG_CONFIG_HOME!, 'r.json')
    writeFileSync(file, JSON.stringify({ version: 1, items: [
      { kind: 'npm', source: 'pkg', alias: 'a', desc: 'd', exec: 'x', createdAt: 't', sourceVerifiedAt: 't' },
    ] }), 'utf-8')
    const { handler } = await import('../../../src/groups/mgr/import.js')
    await handler([file])
    const reg = readRegistry()
    expect(reg.items).toHaveLength(1)
    expect(reg.items[0].alias).toBe('a')
  })
})
```

(Add a top-of-file `import { describe, it, expect, beforeEach, vi } from 'vitest'`.)

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- --run tests/cli/mgr/export-import.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 6: Re-CRLF + commit**

After PowerShell split-form conversion on each new/modified file:

```bash
git add src/groups/mgr/export.ts src/groups/mgr/import.ts src/groups/mgr/index.ts tests/cli/mgr/export-import.test.ts
git commit -m "feat(mgr): add export and import commands"
```

---

### Task 8: register `mgrGroup` in `src/cli/router.ts` + full smoke

**Files:**
- Modify: `src/cli/router.ts:33-35` — add `registerGroup(mgrGroup)` as the new line 36.

**Interfaces:**
- Consumes: `mgrGroup` from `../groups/mgr/index.js`.

- [ ] **Step 1: Read `src/cli/router.ts` and confirm the registration block**

Read `src/cli/router.ts` lines 1-40 and confirm that lines 33-35 currently read:
```
registerGroup(claudeGroup)
registerGroup(happyGroup)
registerGroup(wGroup)
```

- [ ] **Step 2: Add the import and the new `registerGroup` line**

In `src/cli/router.ts`:

1. Add to the existing group import list (lines 1-5):
```ts
import { mgrGroup } from '../groups/mgr/index.js'
```
2. After line 35 (`registerGroup(wGroup)`), add:
```ts
registerGroup(mgrGroup)
```

The result: lines 33-36 now register all four groups.

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass; no new failures in the existing `tests/cli/router.test.ts` or `tests/shared/system/*.test.ts`.

- [ ] **Step 4: Smoke-test the bundle**

```bash
npm run build
node dist/index.js mgr --help
```

Expected: prints help text mentioning the `mgr` group and the eight commands.

- [ ] **Step 5: Re-CRLF + commit**

```bash
git add src/cli/router.ts
git commit -m "feat(router): register mgrGroup"
```

---

### Task 9: skill updates — new `registry-and-managed-items.md` reference + update `release-and-publishing.md` for the `gh-action` rename

**Files:**
- Create: `.claude/skills/jc-development/references/registry-and-managed-items.md`
- Modify: `.claude/skills/jc-development/references/release-and-publishing.md` — every reference to `.claude/skills/npm-work-flow/SKILL.md` is replaced with `.claude/skills/gh-action/references/npm-publish.md`. The prose around each mention is updated to say "the npm-publish reference in the gh-action skill" instead of "the `npm-work-flow` skill".

**Interfaces:**
- Produces (new file): a reference that documents the XDG path, the `RegistryItem` schema, the `add` / `run` / `check` / `export` / `import` / `rm` / `rename` rules, the `confirm()` helper promotion, and the cross-device migration flow. Routes from `SKILL.md`'s table with the trigger "Adding, modifying, or migrating registry-managed items in the `jc mgr` group; backing up the XDG registry; validating npm / py / exe sources". Description is third-person. Frontmatter `name: registry-and-managed-items`. Maximum 500 lines; no code block > 30 lines. Cross-references use Markdown links to the reference file.
- Modifies (release-and-publishing.md): same surface rules as any reference.

- [ ] **Step 1: Add the new reference row to `SKILL.md`'s routing table**

Read `.claude/skills/jc-development/SKILL.md`. Add one new row to the routing table between `review-checklist-and-examples` and the closing `|` `Load every reference` line. The new row:

```
| 涉及 `jc mgr` 组的注册、迁移与跨设备同步；需要了解 XDG 注册表位置、item schema 或 `confirm()` helper | [[registry-and-managed-items]] | references/registry-and-managed-items.md | 新功能；与现有 reference 互补。 |
```

(One space before/after the pipe; ASCII column alignment to match the existing rows.)

- [ ] **Step 2: Create `registry-and-managed-items.md`**

Use the Write tool with the following exact content (write with real LF; the harness does not translate `\r\n` JSON escapes — apply the PowerShell split-form conversion after writing):

```markdown
---
name: registry-and-managed-items
description: 涉及 jc mgr 组的注册、迁移与跨设备同步；新增、修改或迁移 `jc mgr` 注册项，或为 XDG 注册表做备份/恢复时加载。
---

# registry-and-managed-items

在新增、修改或迁移 `jc mgr` 组的注册项时加载本 reference。本文件锁定 XDG 配置文件位置、统一的 `RegistryItem` schema、八条命令的语义、`confirm()` helper 的位置，以及跨设备迁移流程。

## 加载时机

- 正在新增、修改、删除或重命名 `jc mgr` 注册项。
- 正在准备 `jc mgr export` / `jc mgr import` 的跨设备迁移。
- 正在审查一条改 `src/shared/registry/**` 或 `src/groups/mgr/**` 的 PR。
- 正在调试 `confirm()` helper 在多处共享后的行为。

## 存储位置

XDG 路径由 `src/shared/registry/paths.ts` 解析：

- Linux / macOS：`<XDG_CONFIG_HOME 或 ~/.config>/jc/registry.json`。
- Windows：`<APPDATA 或 ~/AppData/Roaming>/jc/registry.json`。

文件不存在时首次写入会自动创建父目录（`src/shared/registry/paths.ts` 的 `ensureRegistryDir`）。状态文件是单一 JSON，没有 lock 文件、没有 sidecar、没有云端副本。

## Schema

定义在 `src/shared/registry/types.ts`：

- `RegistryItemKind = 'npm' | 'py' | 'exe'`，三种类型用 `kind` 字段统一。
- `RegistryItem`：`{ kind, source, alias, desc, exec, args?, createdAt, sourceVerifiedAt }`。
- `RegistryFile`：`{ version: 1, items: RegistryItem[] }`。
- `ALIAS_RE`：正则 `^[a-z0-9][a-z0-9_-]{0,31}$`；alias 在文件中存小写。

修改该 schema 是一次破坏性变更（`version` 必须递增，且 `store.ts` 的 `readRegistry` 必须在不识别的 `version` 上抛错而不是静默兜底）。

## 命令语义

八条 `commandDef` 在 `src/groups/mgr/`：

- `add` —— 一次源验证（`npm view` / `fetch HEAD` / `fs.access`），失败退出 `2`；alias 已存在也退出 `2`。
- `list` —— 打印表格（`console.table`）；空时打印 `(空)`。
- `run` —— 把 `item.exec` 拆成 `cmd + argv`，再 `spawn` 出去；不重验源。
- `rm` / `rename` —— 走 `confirm()` helper（位于 `src/shared/registry/confirm.ts`，从 `src/groups/w/file/rm.ts:5-13` 提升而来）。
- `check` —— 重新跑源验证；成功时刷新 `sourceVerifiedAt`。
- `export` —— 把整个 `RegistryFile` JSON 写到 stdout。
- `import` —— 从文件或 stdin 读入；按 alias 去重（已存在则跳过），保留 `createdAt` 与 `sourceVerifiedAt`；`--strict` 标志让 `skipped` 或 `failed > 0` 退出 `2`。

退出码遵守现有契约：`0` 成功、`1` 用法错误、`2` 验证/查找/执行失败。不引入新码。

## 跨设备迁移

迁移是显式 `export` / `import`，无自动同步。`jc mgr export > registry.json` 把当前 XDG 文件原样输出；`jc mgr import registry.json` 在另一台机器上落地。本地路径类项（`exe`、本地 `py`）的 `source` 跨设备后需要重新解析；`import` 不会自动 `check`，迁移后建议跑一次 `jc mgr check <alias>`。

## 跳转链接

- 本 skill 的设计规范：`docs/superpowers/specs/2026-07-30-jc-mgr-design.md`。
- 实现：`src/shared/registry/**`、`src/groups/mgr/**`。
- `confirm()` helper：`src/shared/registry/confirm.ts`。
- 项目原始规范：`docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md`。
```

- [ ] **Step 3: Re-CRLF + verify the reference's frontmatter and link integrity**

```bash
powershell -NoProfile -Command "$p = '.claude/skills/jc-development/references/registry-and-managed-items.md'; $b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output (\"CRLF=$crlf LoneLF=\" + (($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) + \" Bytes=\" + $b.Length)"
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/registry-and-managed-items.md','utf8');console.log('lines:',s.split(/\r?\n/).length);console.log('has-frontmatter:',s.startsWith('---\n')||s.startsWith('---\r\n'));"
```

Expected: CRLF > 0, LoneLF = 0; lines ≤ 500; frontmatter present.

- [ ] **Step 4: Update `release-and-publishing.md` to use the new skill path**

Use the Edit tool to replace every literal string `.claude/skills/npm-work-flow/SKILL.md` in `.claude/skills/jc-development/references/release-and-publishing.md` with `.claude/skills/gh-action/references/npm-publish.md`. The Edit tool will fail if the file is unmodified; if that happens, inspect the file and apply the same replace via Edit with `replace_all: true`.

- [ ] **Step 5: Re-CRLF the modified reference**

```bash
powershell -NoProfile -Command "$p = '.claude/skills/jc-development/references/release-and-publishing.md'; $enc = New-Object System.Text.UTF8Encoding($false); $content = [IO.File]::ReadAllText($p) -replace \"`r`n\",\"`n\"; $content = $content -replace \"`n\",\"`r`n\"; [IO.File]::WriteAllText($p, $content, $enc)"
```

- [ ] **Step 6: Verify the navigation contract still holds**

```bash
node --input-type=commonjs -e "const fs=require('fs');const skill=fs.readFileSync('.claude/skills/jc-development/SKILL.md','utf8');const refs=fs.readdirSync('.claude/skills/jc-development/references').filter(f=>f.endsWith('.md'));const missing=refs.filter(r=>!skill.includes(r));console.log('missing:',missing.length?missing.join(','):'none');"
```

Expected: `missing: none` (the new reference is in the routing table from Step 1, and every other reference is already there).

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/jc-development/SKILL.md .claude/skills/jc-development/references/registry-and-managed-items.md .claude/skills/jc-development/references/release-and-publishing.md
git commit -m "docs(skill): add registry-and-managed-items ref; update gh-action pointer"
```

---

### Task 10: full validation sweep

**Files:** read-only across the new files and the modified ones.

**Validation contract (must all pass):**

- [ ] **Step 1: Line counts (each ≤ 500)**

```bash
node --input-type=commonjs -e "const fs=require('fs');const path=require('path');const root='.claude/skills/jc-development';const files=[path.join(root,'SKILL.md'),...fs.readdirSync(path.join(root,'references')).filter(f=>f.endsWith('.md')).map(f=>path.join(root,'references',f))];for(const f of files){console.log(f,'lines:',fs.readFileSync(f,'utf8').split(/\r?\n/).length);}"
```

Expected: every line count ≤ 500.

- [ ] **Step 2: CRLF sweep (every file CRLF, no lone-LF)**

```bash
for f in .claude/skills/jc-development/SKILL.md .claude/skills/jc-development/references/*.md; do
  v=$(powershell -NoProfile -Command "$p = '$f'; $b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; \$lone = ((\$b | Where-Object {\$_ -eq 0x0a}).Count - \$crlf); Write-Output (\"CRLF=\$crlf LoneLF=\$lone\")")
  echo "$f $v"
done
```

Expected: every file `LoneLF=0`, `CRLF` > 0.

- [ ] **Step 3: Code-block cap (each block ≤ 30 lines)**

```bash
for f in .claude/skills/jc-development/SKILL.md .claude/skills/jc-development/references/*.md; do
  v=$(awk 'BEGIN{open=0;start=0;max=0} /^```/{if(open==0){open=1;start=NR;count=0;next}else{open=0;if(count>max)max=count;next}} open==1{count++} END{print (open==0?max:max)}' "$f")
  echo "$f max-block: $v"
done
```

Expected: every `max-block` ≤ 30.

- [ ] **Step 4: Link integrity in the new reference**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/registry-and-managed-items.md','utf8');const re=/\]\(([a-z0-9-]+\.md)\)/g;let m;const broken=[];while((m=re.exec(s))){const p='.claude/skills/jc-development/references/'+m[1];if(!fs.existsSync(p))broken.push(m[1]);}console.log('broken:',broken.length?broken.join(','):'none');"
```

Expected: `broken: none`.

- [ ] **Step 5: Full test suite**

```bash
npm test
```

Expected: all existing tests + new tests pass; no regressions.

- [ ] **Step 6: Working tree contains only expected changes**

```bash
git status --short
```

Expected: clean working tree (any pre-existing untracked `notes.md` / `task_plan.md` are out of scope and may remain).

- [ ] **Step 7: Final commit (if any uncommitted file is left)**

```bash
git status --short
```

If any file is still modified, stage only the new files and the modified `release-and-publishing.md` and commit with message `docs(skill): final validation cleanup`. Do not commit `notes.md` or `task_plan.md`.

- [ ] **Step 8: Final summary**

Report to the user:
- Total commits made for this feature.
- Per-task test counts and overall pass/fail.
- The exact list of files added and modified.
- Confirmation that the existing `npm-work-flow` skill is unchanged.
- Confirmation that no source or test file outside the planned scope was modified.
- The new reference file path and a one-line trigger.

Do not run `git push`; the user decides when to push.

---

## Self-Review

1. **Spec coverage:** every spec section maps to a task:
   - Section 1 (background) → handled in spec; no code task needed.
   - Section 2 (goals) → Tasks 1-7 cover (XDG config, uniform schema, validate-once, confirm helper).
   - Section 4 (target layout) → Tasks 1, 2, 3, 4, 5, 6, 7, 8, 9.
   - Section 5 (module boundaries) → Tasks 1, 2, 3, 4, 5, 6, 7.
   - Section 6 (data flow) → Tasks 5, 6, 7.
   - Section 7 (exit codes) → Tasks 5, 6, 7.
   - Section 8 (testing strategy) → Tasks 1, 2, 4, 5, 6, 7.
   - Section 9 (skill sync) → Task 9.
   - Section 10 (out-of-plan) → Task 3 implements the `confirm()` promotion.
   No gaps.

2. **Placeholder scan:** no `TBD`, `TODO`, "implement later", or "fill in details" patterns. The `import` path in Task 1's import (`'../../../src/shared/registry/paths.js'`) is correct because `tests/shared/registry/paths.test.ts` is at depth 3 (`tests/shared/registry/`) and the source is at depth 3 (`src/shared/registry/`) — both are 3 deep, so `../../../src/shared/registry/paths.js` resolves to `src/shared/registry/paths.js`. Confirmed by manual path resolution.

3. **Type consistency:** all `RegistryItem` shapes across Tasks 1, 2, 4, 5, 6, 7 use the same field names (`kind`, `source`, `alias`, `desc`, `exec`, `args?`, `createdAt`, `sourceVerifiedAt`). The handler `args` parameter appears in both Task 4 and Task 6 with the same `string[]` type. The `ValidateResult` discriminated union is only used in Task 4. No naming drift.

4. **File scope:** only the files listed in "Created" and "Modified" are touched. No edits to `package.json`, `tsup.config.ts`, `vitest.config.ts`, `tsconfig.json`. The existing `npm-work-flow` skill is not modified; only the new `registry-and-managed-items.md` and the existing `release-and-publishing.md` inside the `jc-development` skill are touched.
