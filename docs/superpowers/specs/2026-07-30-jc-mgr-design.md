# `jc mgr` Unified Manager — Design Spec

**Date:** 2026-07-30
**Status:** Proposed (awaiting user review)
**Owners:** main agent
**Type:** New feature inside the `jc` CLI; first stateful subsystem

## 1. Background and Motivation

`jc` is currently 100% stateless: every command is imperative, reads from the system, and writes nothing back. The user has a recurring need to register three kinds of external resources (npm packages, Python scripts, EXE scripts) under a personal alias and invoke them from anywhere with a single `jc mgr run <alias>`. There is no migration story yet because the registry does not exist.

This spec introduces the first persistent state to `jc`: a per-user registry file in the XDG config location, an `mgr` group with eight commands (`add` / `list` / `run` / `rm` / `rename` / `check` / `export` / `import`), and a single `confirm()` helper promoted from `src/groups/w/file/rm.ts:5-13` to `src/shared/registry/confirm.ts` so destructive commands share one tested helper.

## 2. Design Goals

1. **Static `jc mgr` group.** The eight commands are statically registered in `src/cli/router.ts:36`; no dynamic command registration from the registry file. The alias is just a lookup key, not a subcommand.
2. **One XDG config file.** All state lives at `$XDG_CONFIG_HOME/jc/registry.json` (or `%APPDATA%/jc/registry.json` on Windows). No new npm dependency, no OS package manager integration.
3. **Uniform item schema with `kind` discriminator.** `{ kind: 'npm' | 'py' | 'exe', source, alias, desc, exec, args?, createdAt, sourceVerifiedAt }`. `kind` chooses the source-validation path; everything else is shared.
4. **Validate once at `add` time.** `add` runs one reachability check (`npm view`, HTTP HEAD, or `fs.access`) and stores `sourceVerifiedAt`. `run` does not revalidate.
5. **Destructive commands go through a shared `confirm()` helper.** `rm`, `rename`, and desc updates all use the helper promoted from `src/groups/w/file/rm.ts:5-13`. `add` and `list` do not prompt.
6. **Migration via `export` / `import` JSON on stdout.** No git, no cloud, no auto-pull. Importing with broken local paths keeps the entry but flags it; importing a duplicate `alias` rejects.

## 3. Out of Scope

- Auto-update checks, expiry-based revalidation, lock files.
- Git or cloud sync.
- Multi-profile / multi-workspace registries.
- Translating or rewriting the existing 101 `w` group commands; the spec only adds the new `mgr` group.
- Touching `package.json`, `tsup.config.ts`, `vitest.config.ts`, or `tsconfig.json` (no new dependencies).

## 4. Target Layout

```
src/
├── cli/router.ts                         # +1 line: registerGroup(mgrGroup) at line 36
├── groups/mgr/                           # NEW
│   ├── index.ts                          # mgrGroup composition
│   ├── add.ts                            # commandDef
│   ├── list.ts                           # commandDef
│   ├── run.ts                            # commandDef
│   ├── rm.ts                             # commandDef (uses confirm)
│   ├── rename.ts                         # commandDef (uses confirm)
│   ├── check.ts                          # commandDef
│   ├── export.ts                         # commandDef
│   └── import.ts                         # commandDef
└── shared/registry/                      # NEW
    ├── types.ts                          # RegistryItem, RegistryFile, RegistryItemKind
    ├── paths.ts                          # XDG path resolution
    ├── store.ts                          # read / write registry.json
    ├── validate.ts                       # kind-specific source validation
    └── confirm.ts                        # shared confirm() helper (extracted from rm.ts)

tests/shared/registry/                    # NEW
├── paths.test.ts
├── store.test.ts
└── validate.test.ts

tests/cli/mgr/                            # NEW
├── add.test.ts
├── run.test.ts
└── export-import.test.ts

.claude/skills/jc-development/references/  # +1 new ref, +1 updated
├── registry-and-managed-items.md         # NEW
└── release-and-publishing.md             # UPDATED (npm-work-flow → gh-action)
```

## 5. Module Boundaries

### `src/shared/registry/types.ts`
- Exports: `RegistryItemKind`, `RegistryItem`, `RegistryFile`, `ALIAS_RE` (regex `^[a-z0-9][a-z0-9_-]{0,31}$`).
- No I/O, no validation logic, no path logic.

### `src/shared/registry/paths.ts`
- Exports: `getRegistryPath(): string`, `ensureRegistryDir(): void`.
- `getRegistryPath` reads `XDG_CONFIG_HOME` (Linux/macOS) with default `~/.config`, or `%APPDATA%` with default `~/AppData/Roaming` on Windows. Always returns `<base>/jc/registry.json`.
- `ensureRegistryDir` is `mkdirSync` recursive; idempotent.
- No knowledge of the registry's shape.

### `src/shared/registry/store.ts`
- Exports: `readRegistry(): RegistryFile`, `writeRegistry(file: RegistryFile): void`, `addItem(item)`, `removeItem(alias)`, `renameItem(oldAlias, newAlias)`, `updateItemDesc(alias, newDesc)`, `updateItemVerifiedAt(alias, iso)`, `getItem(alias)`, `listItems()`.
- All read/write goes through `getRegistryPath` and `ensureRegistryDir`.
- On read, if the file does not exist, returns `{ version: 1, items: [] }`.
- On write, serializes with `JSON.stringify(file, null, 2)`.
- The mutation helpers preserve insertion order; the array is read top-to-bottom in `listItems`.

### `src/shared/registry/validate.ts`
- Exports: `validateSource(item): Promise<{ ok: boolean, exec: string, reason?: string }>`.
- Branches on `kind`:
  - `npm`: parses `<pkg>` and optional `<ver>` from `source`; runs `npm view <pkg> version` with a 10s timeout; on success returns `exec = 'npx -p <pkgName> <bin>'` (bin defaults to `pkgName`).
  - `py` URL: `fetch(source, { method: 'HEAD' })` with 5s timeout; on 2xx, downloads to a temp file in `os.tmpdir()` and returns `exec = 'python <tmpPath>'`. (The temp file is cleaned up at process exit.)
  - `py` local: `fs.access(source, fs.constants.R_OK)`; returns `exec = 'python <absolute path>'`.
  - `exe` URL: `fetch(source, { method: 'HEAD' })` with 5s timeout; on 2xx, downloads to a temp file in `os.tmpdir()` and returns `exec = '<tmpPath>'`.
  - `exe` local: `fs.access` + `fs.statSync(...).isFile()`; returns `exec = '<absolute path>'`.
- On failure returns `{ ok: false, reason: '...' }` with a human-readable string the caller can pass to `error(...)`.

### `src/shared/registry/confirm.ts`
- Exports: `confirm(prompt: string): Promise<boolean>`.
- The exact body lifted from `src/groups/w/file/rm.ts:5-13`; uses `readline.createInterface`, closes the interface on every path, returns `answer.toLowerCase() === 'y'`.
- `src/groups/w/file/rm.ts` is updated to import this helper instead of defining its own; the existing `confirm()` call at `rm.ts:26` continues to work.

### `src/groups/mgr/*`
- Eight `commandDef`s, each ≤ 30 lines of body, registered into `mgrGroup` at `src/groups/mgr/index.ts`.
- All write commands (`add`, `rm`, `rename`) go through `store`; `import` is a special write that uses the same atomic-write pattern as `store.writeRegistry` (write to `<path>.tmp`, rename to `<path>`).
- No direct `fs` calls outside `store`.

## 6. Data Flow

### `add` flow

```
jc mgr add <kind> <source> --alias <alias> --desc <desc>
  -> mgr/add.handler
  -> store.getItem(alias)   (exit 2 if exists)
  -> validate.validateSource({ kind, source, alias, desc, ... })
       -> on failure: error(reason) + process.exit(2)
  -> store.addItem({ kind, source, alias, desc, exec, createdAt, sourceVerifiedAt })
```

### `run` flow

```
jc mgr run <alias> [args...]
  -> mgr/run.handler
  -> store.getItem(alias)   (exit 2 if missing)
  -> spawn(item.exec, [...(item.args || []), ...userArgs], { stdio: 'inherit' })
       (no revalidation; trust sourceVerifiedAt)
  -> child.on('close', c => c === 0 ? resolve() : reject(new Error(`exit ${c}`)))
```

### `export` / `import` flow

```
jc mgr export
  -> mgr/export.handler
  -> store.readRegistry()
  -> process.stdout.write(JSON.stringify(file, null, 2) + '\n')

jc mgr import [<path>]
  -> mgr/import.handler
  -> read JSON from path (or stdin if no path)
  -> validate JSON shape (version === 1, items is an array, each item matches RegistryItem)
  -> for each item: skip if alias already exists with a different source; warn if alias exists with same source; otherwise store.addItem (preserving createdAt, sourceVerifiedAt from the imported record)
  -> report summary: imported N, skipped M, failed K
```

## 7. Exit Codes

Use the existing contract; do not introduce new ones.

| Code | Where it fires |
|---|---|
| `0` | `list`, `run` success, `check` ok, `export` ok, `import` summary returned |
| `1` | `add`/`rename`/`import` invalid argument shape (e.g. `alias` fails `ALIAS_RE`) |
| `2` | alias already exists (`add`), alias missing (`run`/`rm`/`rename`/`check`), source validation failure (`add`/`check`), `spawn` non-zero exit (`run`) |

`import` returns `0` even if some items failed; the summary line tells the user. The user can re-run with `--strict` to flip summary failures into exit `2` (Task 8 will add the flag).

## 8. Testing Strategy

- Unit tests for `paths` (XDG resolution under both env vars), `store` (CRUD round-trips, atomic write), `validate` (mock `fetch` and `child_process.spawnSync('npm', ...)`).
- Unit tests for `add`, `run`, `export`, `import` at the `commandDef.handler` level by importing the handler and asserting on the side effects (registry file contents, exit code, stdout).
- The `run` handler is tested with `vi.spyOn` on `child_process.spawn` so it can run in CI without invoking real binaries.
- All existing tests (`tests/cli/router.test.ts`, `tests/shared/system/*.test.ts`) must continue to pass.

## 9. Skill Synchronization

- New reference `.claude/skills/jc-development/references/registry-and-managed-items.md`: covers the XDG path, the `RegistryItem` schema, the `add` / `run` / `check` / `export` / `import` / `rm` / `rename` rules, the `confirm()` helper promotion, and the cross-device migration flow. Routes from `SKILL.md`'s table with trigger "Adding, modifying, or migrating registry-managed items in the `jc mgr` group; backing up the XDG registry; validating `npm` / `py` / `exe` sources".
- Update `.claude/skills/jc-development/references/release-and-publishing.md`: every reference to `.claude/skills/npm-work-flow/SKILL.md` is replaced with `.claude/skills/gh-action/references/npm-publish.md` (and the prose around each mention). The Chinese version also gets the same replacement in the next pass.

## 10. Out-of-Plan Notes

- The `confirm()` helper is moved from `src/groups/w/file/rm.ts` to `src/shared/registry/confirm.ts`; the original `rm.ts` keeps its behaviour. This is a no-public-API change.
- The temp-file cleanup for downloaded `py` / `exe` URLs is best-effort; explicit `process.on('exit')` and `SIGINT` cleanup is acceptable but not required for v1.
- `import` is additive by design: existing aliases are not overwritten.
