# jc mgr handlers + run preflight — Design Spec

**Date:** 2026-07-31
**Status:** Proposed (awaiting user review)
**Owners:** main agent
**Type:** Architecture refactor + preflight check

## 1. Background and Motivation

`jc mgr` 的 kind 差异当前散落在三处：
- `src/shared/registry/validate.ts` 是按 `if (item.kind === ...)` 分支的同步/异步函数集合。
- `src/groups/mgr/run.ts` 自己 `spawn`、自己 `tokenize`、没有源存在性预检。
- `src/groups/mgr/add.ts` / `check.ts` / `rm.ts` / `rename.ts` / `list.ts` / `export.ts` / `import.ts` 与 kind 无关，不动。

两个新需求：
1. 当用户在 `add` 之后把源文件删了，`jc mgr run` 仍然尝试 spawn，得到的只是一行 `spawn ENOENT`——不友好，**不**告诉用户"源已失效，请运行 `jc mgr check <alias>` 修复"。
2. 当未来要加新的 `kind`（如 `git`、`http`、`docker`、`brew`），需要在 `validate.ts` / `run.ts` / `check.ts` 多处改，违反开闭原则。

## 2. Design Goals

1. **抽象基类 + 全局工厂表**：把 kind 差异收敛到 `src/shared/registry/handlers/`。`validate`、`preflight`、`run` 三方法抽象。
2. **preflight 轻量**：不联网、不重新验证；只检查"本地路径是否能 fs.access"；URL 类跳过；npm 类跳过（npx 自己处理）。
3. **行为兼容**：`add` / `check` / `rm` / `rename` / `list` / `export` / `import` 6 条命令的对外行为不变；`run` 行为兼容（spawn 选项与 Task 6 修复保持一致）；`jc r` 速记路径不变。
4. **未来可扩**：新加 kind = 新建一个 `XxxItemHandler` 类 + 在工厂表加一行；`add` / `check` / `run` 不动。

## 3. Out of Scope

- 目录式存储（单文件 → `$XDG_DATA_HOME/jc/registry/<alias>/`）。
- URL 类项预下载到本地缓存。
- `update` 命令（远程版本感知）。
- `jc-development` skill 的 reference 集合（本改动属 router 内部 + handler 抽象，不进 user-facing reference）。
- 修改 `add` / `check` / `list` / `rm` / `rename` / `export` / `import` 的输出格式。

## 4. Target Layout

```
src/shared/registry/
├── types.ts                          # 既有
├── paths.ts                          # 既有
├── store.ts                          # 既有
├── validate.ts                       # 薄壳（rewritten）
├── confirm.ts                        # 既有
└── handlers/                          # NEW
    ├── base.ts                        # abstract class ItemHandler
    ├── npm.ts                         # class NpmItemHandler
    ├── py.ts                          # class PyItemHandler
    ├── exe.ts                         # class ExeItemHandler
    └── index.ts                       # 工厂表 + getHandler(kind)

tests/shared/registry/handlers/        # NEW
├── base.test.ts
└── index.test.ts

src/groups/mgr/run.ts                 # rewritten
tests/cli/mgr/run.test.ts             # updated (1 new test added)
```

Modified:
- `src/shared/registry/validate.ts` — body replaced; exported `validateSource` signature unchanged.
- `src/groups/mgr/run.ts` — body replaced; `commandDef` unchanged.
- `tests/shared/registry/validate.test.ts` — internal structure may shift; 5 existing tests still pass.
- `tests/cli/mgr/run.test.ts` — 3 existing tests still pass; 1 new preflight test added.

## 5. Module Boundaries

### `src/shared/registry/handlers/base.ts`

- Exports: `abstract class ItemHandler`, `type PreflightResult = { ok: true } | { ok: false; reason: string }`.
- Abstract: `kind: RegistryItemKind`, `validate(item)`.
- Concrete: `preflight(item)` default impl, `run(item, args)` default impl, `protected localPath(exec)` helper.
- Default `preflight`: URL → `{ ok: true }`; local path → `fs.access(path, R_OK)`, on error `{ ok: false, reason: '源已失效: <path>（<code>）' }`.
- Default `run`: `spawn(item.exec, [...(item.args || []), ...args], { stdio: 'inherit', shell: true, windowsHide: true })`. On close ≠ 0 → reject with `Error('exit <code>')`. On error → reject.
- `localPath(exec)`: tokens[0] === 'python' && tokens[1] ? tokens[1] : tokens[0]. (Handles `python <path>` vs `<path>` vs `npx -p pkg bin` where tokens[0] is `npx`.)

### `src/shared/registry/handlers/npm.ts`, `py.ts`, `exe.ts`

- Each exports a `class XxxItemHandler extends ItemHandler`.
- `kind` field set to the literal `RegistryItemKind`.
- `validate(item)` body: lifted from the current `validate.ts` branches — `npm view`, `fetch HEAD` + `fs.access` for `py`, `fs.access` + `statSync` for `exe`. Behavior unchanged.
- `preflight(item)`: `NpmItemHandler` overrides to return `{ ok: true }`; `PyItemHandler` and `ExeItemHandler` inherit the default.

### `src/shared/registry/handlers/index.ts`

- Exports: `getHandler(kind: RegistryItemKind): ItemHandler`, `ItemHandler` (re-export).
- Internal: `HANDLERS: Record<RegistryItemKind, () => ItemHandler>` table.
- `getHandler` throws `Error('未实现的 kind: <kind>')` on unknown kind (defensive only; types prevent this).

### `src/shared/registry/validate.ts` (rewritten)

- Keeps the exported `validateSource(item)` signature and return shape `{ ok: true; exec: string } | { ok: false; reason: string }`.
- Body: `return getHandler(item.kind).validate(item)`.
- No new public surface.

### `src/groups/mgr/run.ts` (rewritten)

- Removes local `spawn` import, local tokenization, local error path.
- New body: `await getHandler(item.kind).preflight(item)`; on failure `error(reason)` + `process.exit(2)`. On success `await getHandler(item.kind).run(item, args)`; on reject `error((e as Error).message)` + `process.exit(2)`.
- `commandDef` body and shape unchanged.

## 6. Data Flow

### add (unchanged surface)
```
add.ts -> validateSource(item)
       -> getHandler(item.kind).validate(item)   // dispatch
       -> { ok, exec, reason? }
```

### check (unchanged surface)
```
check.ts -> validateSource(item)
        -> getHandler(item.kind).validate(item)
```

### run (rewritten)
```
run.ts -> getHandler(item.kind).preflight(item)  // new
       on { ok: false } -> error(reason) + exit(2)
       on { ok: true  } -> getHandler(item.kind).run(item, args)
                         on reject -> error(message) + exit(2)
```

### jc r shortcut (unchanged)
```
argv[0]=='r' -> rewrite to ['mgr','run', ...argv[1..]]
              -> route() -> mgrGroup.run handler (rewritten)
```

## 7. Exit Codes

Unchanged. `0` success, `1` argument/usage error, `2` preflight failure / spawn failure / lookup failure. No new codes.

## 8. Testing Strategy

- `tests/shared/registry/handlers/base.test.ts`:
  - preflight skips URL (`/^https?:\/\//`).
  - preflight returns `{ ok: true }` for readable local file.
  - preflight returns `{ ok: false, reason: '源已失效: <path>（ENOENT）' }` for missing local file.
  - default `run` spawns with `shell: true` and `windowsHide: true` (assert via `vi.spyOn` on `child_process.spawn`).
  - `localPath('python /tmp/x.py')` returns `/tmp/x.py`; `localPath('/bin/echo')` returns `/bin/echo`; `localPath('npx -p pkg bin')` returns `npx`.
- `tests/shared/registry/handlers/index.test.ts`:
  - `getHandler('npm')` returns a `NpmItemHandler`.
  - `getHandler('py')` returns a `PyItemHandler`.
  - `getHandler('exe')` returns an `ExeItemHandler`.
  - `getHandler('foo' as any)` throws.
- `tests/shared/registry/validate.test.ts`: existing 5 tests pass unchanged (validateSource is still the public surface).
- `tests/cli/mgr/run.test.ts`:
  - Existing 3 tests pass.
  - New test: `preflight rejects when exec points to a missing file; handler.run is not called; exit(2)`.
- `tests/cli/router.test.ts`: 8 tests unchanged.

## 9. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Refactor breaks the public `validateSource` surface | Tests for `validateSource` are unchanged; the new `validate.ts` is a thin pass-through. |
| preflight slows down `run` for npm items | `NpmItemHandler.preflight` is `{ ok: true }` — zero overhead. |
| preflight on URL item triggers a network HEAD request | Default preflight skips URLs explicitly; `validate` is the only network call, only on `add` / `check`. |
| A future `kind` is added without updating the factory table | The factory table is `Record<RegistryItemKind, ...>` — TypeScript flags the missing entry at compile time. |
| Subclass `validate` body diverges from current `validate.ts` logic | The 5 existing `validate.test.ts` cases are reused; if any breaks, the refactor is wrong. |
| `run` body still has spawn + tokenize | This is the explicit goal: delete them. New test asserts `shell: true` and `windowsHide: true` are passed. |

## 10. Out-of-Plan Notes

- The existing `validate.ts:73-75` handles npm source as "`<pkg>` and optional `<ver>`" via a regex. The new `NpmItemHandler.validate` keeps that exact regex.
- `validate.ts:104-106` and `validate.ts:107-114` (the URL py/exe fetch branches) become `PyItemHandler.validate` and `ExeItemHandler.validate` respectively, with the same `fetch HEAD` + 5s `AbortSignal.timeout` logic.
- `validate.ts:115-122` (the local `fs.access` + `statSync` exe branch) becomes `ExeItemHandler.validate`.
- The `localPath` helper in `ItemHandler` mirrors the manual `split(/\s+/)` that `run.ts` did pre-rewrite. After the rewrite, `run.ts` no longer tokenizes; the helper exists only for preflight.
