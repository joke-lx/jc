# jc-development Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a project-local, references-first Claude skill (`.claude/skills/jc-development/`) whose main `SKILL.md` is a navigation table and whose substantive guidance lives in seven cohesive `references/*.md` files, target-normative for the `jc` CLI.

**Architecture:** Documentation-only change. One creator session writes `SKILL.md` plus seven references, each opening with a "When to load" reminder, every rule backed by a repo-relative `file:line` citation, and every current inconsistency labeled `**Legacy hazard**` or `**Bad example**`. No source or test file is modified. The plan decomposes into one scaffold task plus one task per reference so each reference can be reviewed in isolation.

**Tech Stack:** Markdown, YAML frontmatter, Windows shell, `git`. No application code, no tests, no package install.

**Reference spec:** `docs/superpowers/specs/2026-07-29-jc-development-skill-design.md`

## Global Constraints

- The new skill lives at `.claude/skills/jc-development/`. The existing `.claude/skills/npm-work-flow/` skill is read-only and must not be modified.
- `SKILL.md` body contains **only**: YAML frontmatter (`name`, `description`), one-sentence purpose, the routing table, and one "load all matching" guidance line. No architecture prose, no SOP, no examples, no checklist.
- Every reference file has YAML frontmatter: `name` (kebab-case slug matching the filename without `.md`) and `description` (third-person, names a trigger, not a content summary).
- Every reference file opens with a one-sentence "When to load" reminder, even though the frontmatter `description` carries the same information.
- Every rule cites at least one repo-relative `file:line` and at least one bad/good example pair where applicable.
- Current inconsistencies are explicitly labeled `**Legacy hazard**` or `**Bad example**` and never presented as the default rule.
- No reference exceeds 500 lines. If a draft approaches 450, the task is responsible for splitting into a parent reference plus a sub-reference.
- Code blocks never exceed 30 lines.
- Cross-references use Markdown links to the reference file, e.g. `[routing-and-command-authoring](routing-and-command-authoring.md)`.
- File line endings must be CRLF on Windows. The Write tool on this harness writes LF only and does **not** translate embedded `\r\n` JSON sequences into CRLF (probed in Task 1: bytes `61 5c 72 5c 6e`). For every file this plan creates, the implementer must (a) write with the Write tool using real LF, then (b) convert to CRLF in place with PowerShell. PowerShell 5.1 cannot bind a single chained `-replace` expression into a 3-arg `[IO.File]::WriteAllText` overload — use the split form:
  ```powershell
  $p = '.claude/skills/jc-development/<file>.md'
  $enc = New-Object System.Text.UTF8Encoding($false)
  $content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
  $content = $content -replace "`n","`r`n"
  [IO.File]::WriteAllText($p, $content, $enc)
  ```
  This is the supported path in the user's global rules (`C:\Users\joke\.claude\CLAUDE.md`).
- Verification commands must use PowerShell-native byte scans; `xxd` is not on this PowerShell's PATH, and `xxd | Select-String '0d 0a'` undercounts because `xxd` pairs bytes as `0d0a` with no space at even offsets. Use this canonical CRLF check everywhere instead:
  ```powershell
  $p = '.claude/skills/jc-development/<file>.md'
  $b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
  ```
- `package.json` has `"type": "module"`, so any scratch Node script used for verification must use the `.cjs` extension (or ESM `import` syntax); plain `.js` with `require()` throws.
- The repository has `node_modules/` under `D:\DevProjects\my\npm\jc`; do not include any of its files in the new skill.
- After the final task, only new files under `.claude/skills/jc-development/` are added to git; no tracked file outside that path is modified.
- **Implementer self-review checklist before commit (applies to every reference task):**
  1. Re-read the spec section that binds this reference (e.g. 5.2 for Task 3). Tick off every must-contain item against the written file; if any is missing, add it before committing.
  2. Open the cited source files in the repo and confirm every `file:line` citation resolves to the claimed content. Off-by-one line numbers are a recurring failure mode — do not eyeball them.
  3. Confirm the frontmatter `description` is third-person and names a trigger (not a content summary).
  4. Confirm no `#`-prefixed headings, no SOP/checklist/example prose leaked into the main `SKILL.md` (only relevant for Task 1).
  5. Re-run the canonical byte-scan after any post-conversion edit; lone-LF is silently possible.

## File Structure

Created (all new):

```
.claude/skills/jc-development/
├── SKILL.md                              # navigation-only main page
└── references/
    ├── project-map.md
    ├── routing-and-command-authoring.md
    ├── execution-safety-and-platforms.md
    ├── system-adapters.md
    ├── testing-and-verification.md
    ├── release-and-publishing.md
    └── review-checklist-and-examples.md
```

Each reference owns one cohesive theme; `SKILL.md` contains only the routing table.

## Task Outline

1. Task 1 — Scaffold `.claude/skills/jc-development/` and author the navigation-only `SKILL.md`.
2. Task 2 — Author `references/project-map.md`.
3. Task 3 — Author `references/routing-and-command-authoring.md`.
4. Task 4 — Author `references/execution-safety-and-platforms.md`.
5. Task 5 — Author `references/system-adapters.md`.
6. Task 6 — Author `references/testing-and-verification.md`.
7. Task 7 — Author `references/release-and-publishing.md`.
8. Task 8 — Author `references/review-checklist-and-examples.md`.
9. Task 9 — Validate coverage, link integrity, navigation-only main page, and bounded release scope.

Each task ends with a commit and a self-check.

---

### Task 1: Scaffold the skill directory and author the navigation-only `SKILL.md`

**Files:**
- Create: `.claude/skills/jc-development/SKILL.md`

**Interfaces:**
- Produces: navigation table that all later reference tasks must list themselves in. Each reference task must use the same column headers and the same trigger phrasing as in the draft below.

**Content contract for `SKILL.md`:**

The file consists of four sections only, in this order:

1. YAML frontmatter.
2. One-sentence purpose statement (single line).
3. Routing table.
4. One guidance line on how to load multiple references.

- [ ] **Step 1: Create the directory**

Run from `D:\DevProjects\my\npm\jc`:

```bash
mkdir -p .claude/skills/jc-development/references
```

Expected: the directory exists; no error.

- [ ] **Step 2: Author `SKILL.md`**

Use the Write tool to create `.claude/skills/jc-development/SKILL.md`. Write the file with **real LF newlines** (do **not** try to embed `\r\n` in the JSON string — that produces literal backslash text in this harness). The exact body content to write follows. After writing, convert to CRLF with the PowerShell command shown in Global Constraints.

The body content to write:

```text
---\r\nname: jc-development\r\ndescription: Use when adding, modifying, testing, or reviewing the `jc` CLI and its commands. Routes to development-only references; the generic release pattern is covered by the `npm-work-flow` skill.\r\n---\r\n\r\nRoutes to development-only references for the `jc` CLI; consult the `npm-work-flow` skill for the generic push-to-main release pattern.\r\n\r\n| Trigger / Task | Reference | Path | Notes |\r\n|---|---|---|---|\r\n| Opening any development task; need to know what the project is and where things live | [[project-map]] | references/project-map.md | Read first. |\r\n| Adding, modifying, or reviewing a `commandDef`, group, category, router, help, or output | [[routing-and-command-authoring]] | references/routing-and-command-authoring.md | The largest authoring concern. |\r\n| Touching process execution, shell, signals, platform gating, exit codes, or destructive operations | [[execution-safety-and-platforms]] | references/execution-safety-and-platforms.md | Cross-cutting risk reference. |\r\n| Touching `src/shared/system/**`, adding a new system resource, or unit-testing a command that calls system info | [[system-adapters]] | references/system-adapters.md | Mock the adapter factory, not the underlying library. |\r\n| Adding tests, modifying tests, or asserting new behavior in CI/local | [[testing-and-verification]] | references/testing-and-verification.md | Project has no lint, formatter, coverage, or `tsc --noEmit` script. |\r\n| Changing workflows, troubleshooting a failed release, or onboarding a maintainer to the publish flow | [[release-and-publishing]] | references/release-and-publishing.md | For the generic pattern, also load `.claude/skills/npm-work-flow/SKILL.md`. |\r\n| Reviewing a PR or doing a self-review before opening one | [[review-checklist-and-examples]] | references/review-checklist-and-examples.md | Cross-reference summary; load only at review time. |\r\n\r\nLoad every reference whose trigger matches the current task; do not load references outside that set.\r\n
```

After Write, confirm with `git diff --stat` (or `git status --short`) that exactly one new untracked file appears: `.claude/skills/jc-development/SKILL.md`.

- [ ] **Step 3: Verify the navigation-only main page contract**

Run from `D:\DevProjects\my\npm\jc`:

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/SKILL.md','utf8');const lines=s.split(/\r?\n/);console.log('lines:',lines.length);const after=lines.slice(lines.indexOf('---',2)+1).join('\n');const required=['project-map','routing-and-command-authoring','execution-safety-and-platforms','system-adapters','testing-and-verification','release-and-publishing','review-checklist-and-examples'];const missing=required.filter(r=>!after.includes(r));console.log('missing:',missing.length?missing.join(','):'none');const bad=after.split('\n').filter(l=>/^#\s/.test(l));console.log('heading lines:',bad.length);"
```

Expected:
- `lines:` is between 15 and 40.
- `missing: none`.
- `heading lines: 0` (no `#` headings in the body — the routing table is the only structure).

If any check fails, edit `SKILL.md` and re-run. Do not proceed.

- [ ] **Step 4: Convert to CRLF (mandatory)**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/SKILL.md'
$enc = New-Object System.Text.UTF8Encoding($false)
$content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
[IO.File]::WriteAllText($p, $content -replace "`n","`r`n", $enc)
```

Expected: command exits 0; file size roughly the same as before.

- [ ] **Step 5: Verify CRLF line endings**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/SKILL.md'
$b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
```

Expected: `CRLF >= 10`, `LoneLF=0`. If the count is zero, repeat Step 4.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/jc-development/SKILL.md
git commit -m "docs(skill): scaffold jc-development navigation-only main page"
```

Expected: one new commit; no other tracked files modified.

---

### Task 2: Author `references/project-map.md`

**Files:**
- Create: `.claude/skills/jc-development/references/project-map.md`

**Interfaces:**
- Must list itself in the routing table of `SKILL.md` (already present from Task 1). Do not edit `SKILL.md` again; this task only writes the reference.
- Consumed by Task 8 (`review-checklist-and-examples.md`) which cross-references this reference.

**Content contract:**

- Frontmatter:
  - `name: project-map`
  - `description: Load when opening any development task to identify package identity, runtime flow, and module ownership; read before other references.`
- One-sentence "When to load" reminder in the first body paragraph.
- Package identity table with: package name (`je-cd`), CLI binary (`jc`), ESM, Node 18 target, MIT license, repository URL — each citing the relevant `package.json` field.
- Runtime flow section: `process.argv` → `src/index.ts:6` (`argv = process.argv.slice(2)`) → `src/cli/router.ts:37` (`route(argv)`) → `Group` (via `registerGroup` at `src/cli/router.ts:28-31`) → `Command`/`Category` (via `group.commands` and `group.categories`) → `cmd.handler(args)` (at `src/cli/router.ts:92`). Use a fenced ASCII block; do not exceed 30 lines.
- Module ownership table with one row per top-level directory under `src/`, one row for `tests/`, and one row for `.github/workflows/`. Each row: directory, owner concern, downstream consumer.
- ESM `.js` import-suffix rule with a one-line example citing any tracked command module that imports a relative path with `.js` (e.g. `src/groups/w/proc/port.ts:2`).
- Pointer section: link to `docs/superpowers/specs/2026-07-29-jc-development-skill-design.md` (the design spec), `docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md` (the original project spec), and `docs/superpowers/plans/2026-06-20-jc-implementation.md` (the original implementation plan).

- [ ] **Step 1: Verify no existing file with that path**

Run from `D:\DevProjects\my\npm\jc`:

```bash
test ! -e .claude/skills/jc-development/references/project-map.md && echo OK || echo EXISTS
```

Expected: `OK`. If `EXISTS`, the file already exists; do not overwrite; investigate.

- [ ] **Step 2: Author the file with the Write tool**

Use the Write tool. Write the file with **real LF newlines**; do not try to embed `\r\n` in the JSON string. After writing, convert to CRLF with the PowerShell command shown in Global Constraints, then verify with the canonical byte-scan command in the verification step.

```yaml
---
name: project-map
description: Load when opening any development task to identify package identity, runtime flow, and module ownership; read before other references.
---
```

Body sections in order: (1) "When to load" reminder, (2) Package identity, (3) Runtime flow, (4) Module ownership, (5) ESM `.js` import-suffix rule, (6) Pointers. Use the file:line citations in the Content contract above. Keep total lines under 200. Include the explicit `\r\n` pattern in the JSON string passed to Write.

- [ ] **Step 3: Verify the file**

Run from `D:\DevProjects\my\npm\jc`:

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/project-map.md','utf8');console.log('lines:',s.split(/\r?\n/).length);console.log('has-frontmatter:',s.startsWith('---\n')||s.startsWith('---\r\n'));console.log('cites-cli-router:',s.includes('src/cli/router.ts'));console.log('cites-entry:',s.includes('src/index.ts'));console.log('cites-system-adapter:',s.includes('src/shared/system/adapter.ts'));"
```

Expected: `lines:` ≤ 200, `has-frontmatter: true`, all three citation checks `true`.

- [ ] **Step 4: Convert to CRLF (mandatory)**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/<REF>.md'
$enc = New-Object System.Text.UTF8Encoding($false)
$content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
[IO.File]::WriteAllText($p, $content -replace "`n","`r`n", $enc)
```

Expected: command exits 0.

- [ ] **Step 5: Verify CRLF line endings**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/<REF>.md'
$b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
```

Expected: `CRLF > 0`, `LoneLF=0`. If `CRLF=0`, repeat Step 4.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/jc-development/references/<REF>.md
git commit -m "docs(skill): add jc-development <REF> reference"
```

---

### Task 3: Author `references/routing-and-command-authoring.md`

**Files:**
- Create: `.claude/skills/jc-development/references/routing-and-command-authoring.md`

**Interfaces:**
- Cross-referenced by Task 8 (`review-checklist-and-examples.md`).
- Routing table row already exists in `SKILL.md` from Task 1; no edit to `SKILL.md` is needed.

**Content contract:**

- Frontmatter:
  - `name: routing-and-command-authoring`
  - `description: Load when adding, modifying, or reviewing a jc command, its metadata, group wiring, router dispatch, or help output.`
- "When to load" reminder.
- Type contracts: cite `src/cli/types.ts:1-27` for `CommandHandler`, `Command`, `Category`, `Group`. Include the `platform?: 'all' | 'win32'` field and the alias field even though alias is currently dead.
- Routing flow: cite `src/cli/router.ts:19-24` (`parseArgs`), `:28-31` (`registerGroup`), `:37-107` (`route`). State the three branches: no-args, listing, command resolution.
- Three-level help model: `jc <g> l` (group), `jc <g> <cat>` (category), `jc <g> <cmd> ?` (command). Cite `src/cli/router.ts:61-64`, `:97-103`, `:83-86`.
- Add-command recipe as an ordered list with file paths:
  1. Create `src/groups/<group>/<category?>/<short>.ts` (relative path inside the ESM tree).
  2. Export `handler(args: string[]): Promise<void>` and `commandDef`.
  3. Import `getXManager` from `../../../shared/system/adapter.js` (when system data is needed).
  4. Add `platform: 'win32'` on `commandDef` if Windows-only.
  5. Wire `commandDef` into the owning group/category index file.
- Good/bad examples:
  - Good: `src/groups/w/proc/port.ts:30-37` (static import, full `commandDef`).
  - Bad: `src/groups/w/proc/mem.ts:3` (dynamic `await import` inconsistent with siblings).
- Output token rules: use `error`/`warning`/`success` from `src/cli/output.ts:4-9`; no inline chalk; no raw `console.error` for user-facing errors.
- Registration invariant for top-level groups: any new top-level group requires editing `src/cli/router.ts:33-35`.

- [ ] **Step 1: Verify no existing file with that path**

```bash
test ! -e .claude/skills/jc-development/references/routing-and-command-authoring.md && echo OK || echo EXISTS
```

Expected: `OK`.

- [ ] **Step 2: Author the file**

Use the Write tool. Frontmatter exactly:

```yaml
---
name: routing-and-command-authoring
description: Load when adding, modifying, or reviewing a jc command, its metadata, group wiring, router dispatch, or help output.
---
```

Body sections: (1) When to load, (2) Type contracts, (3) Routing flow, (4) Three-level help, (5) Add-command recipe, (6) Good/bad examples, (7) Output token rules, (8) Registration invariant. Cap total lines at 450 (split if approaching). Use the explicit `\r\n` JSON pattern with Write.

- [ ] **Step 3: Verify the file**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/routing-and-command-authoring.md','utf8');const lines=s.split(/\r?\n/).length;console.log('lines:',lines);console.log('has-frontmatter:',s.startsWith('---\n')||s.startsWith('---\r\n'));console.log('cites-types:',s.includes('src/cli/types.ts'));console.log('cites-router:',s.includes('src/cli/router.ts'));console.log('cites-output:',s.includes('src/cli/output.ts'));console.log('good-port:',s.includes('src/groups/w/proc/port.ts'));console.log('bad-mem:',s.includes('src/groups/w/proc/mem.ts'));"
```

Expected: `lines:` ≤ 450, `has-frontmatter: true`, all five citation/good-bad checks `true`.

- [ ] **Step 4: Convert to CRLF (mandatory)**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/routing-and-command-authoring.md'
$enc = New-Object System.Text.UTF8Encoding($false)
$content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
[IO.File]::WriteAllText($p, $content -replace "`n","`r`n", $enc)
```

Expected: command exits 0.

- [ ] **Step 5: Verify CRLF line endings**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/routing-and-command-authoring.md'
$b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
```

Expected: `CRLF > 0`, `LoneLF=0`. If `CRLF=0`, repeat Step 4.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/jc-development/references/routing-and-command-authoring.md
git commit -m "docs(skill): add jc-development routing-and-command-authoring reference"
```

---

### Task 4: Author `references/execution-safety-and-platforms.md`

**Files:**
- Create: `.claude/skills/jc-development/references/execution-safety-and-platforms.md`

**Interfaces:**
- Cross-referenced by Task 8.
- Routing table row already present in `SKILL.md` from Task 1; no edit to `SKILL.md` is needed.

**Content contract:**

- Frontmatter:
  - `name: execution-safety-and-platforms`
  - `description: Load when changing process execution, shell handling, signals, platform gating, exit codes, or destructive-operation confirmation.`
- "When to load" reminder.
- Three execution patterns with a decision rule:
  - `child_process.spawn` wrapper: `src/groups/claude/run.ts:3-9` and `src/groups/happy/daemon.ts:3-9` as the canonical good example.
  - `child_process.execSync`: `src/groups/w/pwr/off.ts:5` as the canonical example for synchronous Windows shell actions.
  - Direct `process.kill` signals: `src/shared/system/process.ts:104-111` (SIGTERM→SIGKILL) and `src/groups/w/proc/portkill.ts:23-29` (with `--soft` flag).
- User-argument handling rule with explicit bad sites:
  - `src/groups/w/svc/svcstart.ts:7` (`net start "${name}"`).
  - `src/groups/w/task/taskrun.ts:8` (PowerShell single-quoted with `args[0]` interpolated raw).
  - `src/groups/w/reg/regset.ts:14` (`reg add "${path}" /v "${name}" /d "${value}" /f`).
  - `src/groups/w/reg/regdel.ts:13`.
  - `src/groups/w/reg/regfind.ts` (any interpolation site).
  - Mark each as `**Bad example**`.
  - Recommended replacements: arg-array `spawn` with no shell, or `powershell -NoProfile -Command -` with stdin-piped `ArgumentList`. Provide a fenced code sketch under 30 lines.
- Platform decision tree:
  - Declarative Windows-only → `platform: 'win32'` on `commandDef`; router guards at `src/cli/router.ts:88-91`. Good example: `src/groups/w/net/wifipwd.ts:23`.
  - Mixed-platform command with both branches → inline `process.platform` check with `console.error` + `return` (no `process.exit`). Good example: `src/groups/w/pwr/lock.ts:5-7`.
  - Hard-incompatible command already covered by declarative gating → do not duplicate guards. Bad examples: duplicated `requireWin()` in `src/groups/w/reg/*.ts:4-6`, `src/groups/w/task/*.ts:5`, `src/groups/w/wsl/*.ts:5`. Mark each as `**Legacy hazard**`.
- Exit-code contract: `0` success, `1` unknown/usage, `2` execution failure, `3` platform not supported. Cite the design spec at `docs/superpowers/specs/2026-06-20-jc-npm-cli-design.md:69-75` and one or two enforcement sites (`src/cli/router.ts:58,90,106`, `src/groups/w/proc/kill.ts:20`). Forbid new codes.
- Destructive-operation confirmation: prescribe an isolated helper modeled on `src/groups/w/file/rm.ts:5-13` (good example). Mark `src/groups/w/reg/regdel.ts:13-18` raw-stdin pattern as `**Bad example**`.
- Soft/hard kill flags: `--list` and `--soft` semantics in `portkill` are the reference model.

- [ ] **Step 1: Verify no existing file**

```bash
test ! -e .claude/skills/jc-development/references/execution-safety-and-platforms.md && echo OK || echo EXISTS
```

Expected: `OK`.

- [ ] **Step 2: Author the file**

Use the Write tool. Frontmatter:

```yaml
---
name: execution-safety-and-platforms
description: Load when changing process execution, shell handling, signals, platform gating, exit codes, or destructive-operation confirmation.
---
```

Body sections: (1) When to load, (2) Execution patterns, (3) User-argument handling, (4) Platform decision tree, (5) Exit codes, (6) Destructive-operation confirmation, (7) Kill flags. Cap at 450 lines. Use explicit `\r\n` JSON with Write.

- [ ] **Step 3: Verify the file**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/execution-safety-and-platforms.md','utf8');const lines=s.split(/\r?\n/).length;console.log('lines:',lines);console.log('has-frontmatter:',s.startsWith('---\n')||s.startsWith('---\r\n'));['src/groups/w/svc/svcstart.ts','src/groups/w/task/taskrun.ts','src/groups/w/reg/regset.ts','src/groups/w/reg/regdel.ts','src/groups/w/reg/regfind.ts','src/cli/router.ts','src/groups/w/file/rm.ts','src/groups/w/proc/portkill.ts','src/groups/w/net/wifipwd.ts','src/groups/w/pwr/lock.ts'].forEach(p=>console.log(p+':',s.includes(p)));"
```

Expected: `lines:` ≤ 450, `has-frontmatter: true`, every cited path check `true`.

- [ ] **Step 4: Convert to CRLF (mandatory)**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/execution-safety-and-platforms.md'
$enc = New-Object System.Text.UTF8Encoding($false)
$content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
[IO.File]::WriteAllText($p, $content -replace "`n","`r`n", $enc)
```

Expected: command exits 0.

- [ ] **Step 5: Verify CRLF line endings**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/execution-safety-and-platforms.md'
$b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
```

Expected: `CRLF > 0`, `LoneLF=0`. If `CRLF=0`, repeat Step 4.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/jc-development/references/execution-safety-and-platforms.md
git commit -m "docs(skill): add jc-development execution-safety-and-platforms reference"
```

---

### Task 5: Author `references/system-adapters.md`

**Files:**
- Create: `.claude/skills/jc-development/references/system-adapters.md`

**Interfaces:**
- Cross-referenced by Task 8.
- Routing table row already present in `SKILL.md` from Task 1; no edit to `SKILL.md` is needed.

**Content contract:**

- Frontmatter:
  - `name: system-adapters`
  - `description: Load when touching src/shared/system/**, adding a new system resource, or unit-testing a command that calls system info.`
- "When to load" reminder.
- Adapter contract: `interface <Resource>Manager` + `class System<Resource>Manager` + factory in `src/shared/system/adapter.ts`. Cite `src/shared/system/adapter.ts:16-26` for the factory entry points and the comment that the same implementation is returned across platforms.
- Resource coverage: one subsection per manager (cpu, memory, disk, gpu, os, network, process). Each subsection cites its interface file and gives the canonical return shape; the process subsection must explicitly call out the `WinProcessManager` netstat fallback at `src/shared/system/process.ts:64-89` and the misleading class name (returns the same implementation on all platforms).
- `systeminformation` (`si`) usage: `adapter.ts` always returns the same implementation. Mark `src/groups/w/sys/bat.ts:2` and `src/groups/w/sys/mon.ts:2` (direct `si` imports in handlers) as `**Bad example**`. Forbid new direct `si` imports in `src/groups/**`.
- Dead-import anti-example: `src/shared/system/process.ts:2` imports `pidusage` but never uses it; mark as `**Legacy hazard**`.
- Rule for new commands: import via the adapter factory. Provide one fenced code sketch under 30 lines.
- Test-time rule: mock the adapter factory (`vi.mock('../../src/shared/system/adapter.js')`); do not mock the underlying `systeminformation` library.
- Normalization conventions:
  - `load.currentLoad` rounded to 1 decimal (cite `src/shared/system/cpu.ts:17-30`).
  - Bytes rounded to GB (cite `src/shared/system/disk.ts:19-29`).
  - Caveat: `SystemGpuManager.getInfo` divides `vram` by `1024` (not `1024^3`); cite `src/shared/system/gpu.ts:14-21` and note "document the caveat; do not silently change the formula".

- [ ] **Step 1: Verify no existing file**

```bash
test ! -e .claude/skills/jc-development/references/system-adapters.md && echo OK || echo EXISTS
```

Expected: `OK`.

- [ ] **Step 2: Author the file**

Use the Write tool. Frontmatter:

```yaml
---
name: system-adapters
description: Load when touching src/shared/system/**, adding a new system resource, or unit-testing a command that calls system info.
---
```

Body sections: (1) When to load, (2) Adapter contract, (3) Resource coverage, (4) `systeminformation` usage rules, (5) Dead-import anti-example, (6) Rule for new commands, (7) Test-time rule, (8) Normalization conventions. Cap at 350 lines. Use explicit `\r\n` JSON with Write.

- [ ] **Step 3: Verify the file**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/system-adapters.md','utf8');const lines=s.split(/\r?\n/).length;console.log('lines:',lines);console.log('has-frontmatter:',s.startsWith('---\n')||s.startsWith('---\r\n'));['src/shared/system/adapter.ts','src/shared/system/cpu.ts','src/shared/system/memory.ts','src/shared/system/disk.ts','src/shared/system/gpu.ts','src/shared/system/os.ts','src/shared/system/network.ts','src/shared/system/process.ts','src/groups/w/sys/bat.ts','src/groups/w/sys/mon.ts'].forEach(p=>console.log(p+':',s.includes(p)));"
```

Expected: `lines:` ≤ 350, `has-frontmatter: true`, every cited path check `true`.

- [ ] **Step 4: Convert to CRLF (mandatory)**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/system-adapters.md'
$enc = New-Object System.Text.UTF8Encoding($false)
$content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
[IO.File]::WriteAllText($p, $content -replace "`n","`r`n", $enc)
```

Expected: command exits 0.

- [ ] **Step 5: Verify CRLF line endings**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/system-adapters.md'
$b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
```

Expected: `CRLF > 0`, `LoneLF=0`. If `CRLF=0`, repeat Step 4.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/jc-development/references/system-adapters.md
git commit -m "docs(skill): add jc-development system-adapters reference"
```

---

### Task 6: Author `references/testing-and-verification.md`

**Files:**
- Create: `.claude/skills/jc-development/references/testing-and-verification.md`

**Interfaces:**
- Cross-referenced by Task 8.
- Routing table row already present in `SKILL.md` from Task 1; no edit to `SKILL.md` is needed.

**Content contract:**

- Frontmatter:
  - `name: testing-and-verification`
  - `description: Load when adding tests, modifying tests, or asserting new behavior in CI/local for the jc CLI.`
- "When to load" reminder.
- Current test inventory table: each of `tests/cli/router.test.ts`, `tests/shared/system/process.test.ts`, `tests/shared/system/cpu.test.ts`, `tests/shared/system/disk.test.ts` with a one-line summary of what it asserts.
- Test runner config: `vitest` 2.1.x, `globals: true`, `environment: 'node'` (cite `vitest.config.ts:1-8`); scripts `npm test` and `npm run test:watch` (cite `package.json:15-16`).
- Verification commands: `npm test`, `npm run build`, `node dist/index.js`, `npm view je-cd@$(node -p "require('./package.json').version") version`, `npm publish --provenance --dry-run`. Each with a one-line purpose.
- Explicitly absent checks: no lint, no formatter, no coverage threshold, no `tsc --noEmit` script. Add a single line: "Do not claim these checks exist; surface their absence in PR descriptions."
- Target coverage matrix: for each behavioral surface, name the existing gap and the new test obligation. Surface list: router resolution branches beyond `route([])`, command alias resolution at `src/cli/router.ts:80`, platform gating paths, `output.ts` chalk wrappers, `adapter.ts` factories, process success path (currently only failure path tested), and every new/touched `commandDef`.
- Mock policy: prefer `vi.mock('../../src/shared/system/adapter.js')`; mark `src/shared/system/process.test.ts:21-25` swallow-and-ignore as `**Bad example**`.
- Reviewer-facing rule: "A touched surface without an added test is a defect, not a debt."

- [ ] **Step 1: Verify no existing file**

```bash
test ! -e .claude/skills/jc-development/references/testing-and-verification.md && echo OK || echo EXISTS
```

Expected: `OK`.

- [ ] **Step 2: Author the file**

Use the Write tool. Frontmatter:

```yaml
---
name: testing-and-verification
description: Load when adding tests, modifying tests, or asserting new behavior in CI/local for the jc CLI.
---
```

Body sections: (1) When to load, (2) Current test inventory, (3) Test runner config, (4) Verification commands, (5) Explicitly absent checks, (6) Target coverage matrix, (7) Mock policy, (8) Reviewer-facing rule. Cap at 350 lines. Use explicit `\r\n` JSON with Write.

- [ ] **Step 3: Verify the file**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/testing-and-verification.md','utf8');const lines=s.split(/\r?\n/).length;console.log('lines:',lines);console.log('has-frontmatter:',s.startsWith('---\n')||s.startsWith('---\r\n'));['tests/cli/router.test.ts','tests/shared/system/process.test.ts','tests/shared/system/cpu.test.ts','tests/shared/system/disk.test.ts','vitest.config.ts','package.json','src/cli/router.ts','src/cli/output.ts','src/shared/system/adapter.ts'].forEach(p=>console.log(p+':',s.includes(p)));"
```

Expected: `lines:` ≤ 350, `has-frontmatter: true`, every cited path check `true`.

- [ ] **Step 4: Convert to CRLF (mandatory)**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/testing-and-verification.md'
$enc = New-Object System.Text.UTF8Encoding($false)
$content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
[IO.File]::WriteAllText($p, $content -replace "`n","`r`n", $enc)
```

Expected: command exits 0.

- [ ] **Step 5: Verify CRLF line endings**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/testing-and-verification.md'
$b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
```

Expected: `CRLF > 0`, `LoneLF=0`. If `CRLF=0`, repeat Step 4.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/jc-development/references/testing-and-verification.md
git commit -m "docs(skill): add jc-development testing-and-verification reference"
```

---

### Task 7: Author `references/release-and-publishing.md`

**Files:**
- Create: `.claude/skills/jc-development/references/release-and-publishing.md`

**Interfaces:**
- Cross-referenced by Task 8.
- Routing table row already present in `SKILL.md` from Task 1; no edit to `SKILL.md` is needed.

**Content contract:**

- Frontmatter:
  - `name: release-and-publishing`
  - `description: Load when changing workflows, troubleshooting a failed release, or onboarding a maintainer to the jc publish flow.`
- "When to load" reminder.
- Ownership table:
  - `release-please` (cite `.github/workflows/release-please.yml`): version bump, CHANGELOG, release PR, tag, GitHub release.
  - `npm-publish.yml` (cite `.github/workflows/npm-publish.yml`): npm registry upload, OIDC provenance, and the `npm view je-cd@<ver>` idempotency guard.
- Required permissions and prerequisites:
  - release-please: `contents: write`, `pull-requests: write`.
  - npm-publish: `contents: write`, `id-token: write` (OIDC for `--provenance`).
- Hard invariants:
  - Keep `package.json` name in lockstep with the `package-name` in `release-please` and with the `npm view` check.
  - Populate `repository.url` in `package.json` (mandatory for `--provenance`).
  - Run `npm ci` before build in CI.
  - Never restore inline tag creation to `npm-publish.yml` (release-please owns tags).
  - Never replace the push-to-main model with a `workflow_dispatch` publish trigger.
- Historical pitfall catalog: one row per pitfall with `CHANGELOG.md` and/or fix commit evidence:
  1. Missing `repository.url` (commit `694e40e`).
  2. Missing OIDC `id-token: write` (commit `cc57964`).
  3. Missing `npm ci` before build (commit `a8088ee`).
  4. Hardcoded wrong package name in `npm view` check (commit `c7f82ff`).
  5. Scoping the package as `@joke-lx/jc` then reverting (commit `6fb05db`).
  6. Inline tag creation colliding with release-please (commit `491ae89`).
  7. Publishing on `workflow_dispatch` abandoned (commit `c7d3147`).
- Local build and publish: `npm run build`, `npm run prepublishOnly`, `npm publish --provenance --dry-run`.
- Cross-skill pointer: load `.claude/skills/npm-work-flow/SKILL.md` for the generic push-to-main pattern. The first paragraph must explicitly say: "This reference covers only project-specific ownership and lessons; the generic workflow template lives in `npm-work-flow`."

- [ ] **Step 1: Verify no existing file**

```bash
test ! -e .claude/skills/jc-development/references/release-and-publishing.md && echo OK || echo EXISTS
```

Expected: `OK`.

- [ ] **Step 2: Author the file**

Use the Write tool. Frontmatter:

```yaml
---
name: release-and-publishing
description: Load when changing workflows, troubleshooting a failed release, or onboarding a maintainer to the jc publish flow.
---
```

Body sections: (1) When to load, (2) Ownership table, (3) Required permissions, (4) Hard invariants, (5) Historical pitfall catalog, (6) Local build and publish, (7) Cross-skill pointer. Cap at 350 lines. Use explicit `\r\n` JSON with Write.

- [ ] **Step 3: Verify the file**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/release-and-publishing.md','utf8');const lines=s.split(/\r?\n/).length;console.log('lines:',lines);console.log('has-frontmatter:',s.startsWith('---\n')||s.startsWith('---\r\n'));['.github/workflows/release-please.yml','.github/workflows/npm-publish.yml','npm-work-flow','id-token: write','npm view','repository.url','npm ci'].forEach(p=>console.log(p+':',s.includes(p)));"
```

Expected: `lines:` ≤ 350, `has-frontmatter: true`, every check `true`.

- [ ] **Step 4: Convert to CRLF (mandatory)**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/release-and-publishing.md'
$enc = New-Object System.Text.UTF8Encoding($false)
$content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
[IO.File]::WriteAllText($p, $content -replace "`n","`r`n", $enc)
```

Expected: command exits 0.

- [ ] **Step 5: Verify CRLF line endings**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/release-and-publishing.md'
$b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
```

Expected: `CRLF > 0`, `LoneLF=0`. If `CRLF=0`, repeat Step 4.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/jc-development/references/release-and-publishing.md
git commit -m "docs(skill): add jc-development release-and-publishing reference"
```

---

### Task 8: Author `references/review-checklist-and-examples.md`

**Files:**
- Create: `.claude/skills/jc-development/references/review-checklist-and-examples.md`

**Interfaces:**
- Final reference. Cross-references all six prior references; verify their paths are correct against the actual filenames created in Tasks 2-7.
- Routing table row already present in `SKILL.md` from Task 1; no edit to `SKILL.md` is needed.

**Content contract:**

- Frontmatter:
  - `name: review-checklist-and-examples`
  - `description: Load only at review time to check a PR against the jc-development references and consult the bad/good example catalog.`
- "When to load" reminder.
- Pre-merge checklist: one line per check, each linking to the relevant reference with a Markdown link, e.g.:
  - Did you add a router test? → see [testing-and-verification](testing-and-verification.md).
  - Did you add `commandDef` metadata? → see [routing-and-command-authoring](routing-and-command-authoring.md).
  - Did you interpolate user arguments? → see [execution-safety-and-platforms](execution-safety-and-platforms.md).
  - Did you add a system resource? → see [system-adapters](system-adapters.md).
  - Did you change a workflow? → see [release-and-publishing](release-and-publishing.md) and `.claude/skills/npm-work-flow/SKILL.md`.
- Bad/good example pairs, each citing `file:line`:
  - command-authoring: `src/groups/w/proc/port.ts` (good) vs `src/groups/w/proc/mem.ts` (bad dynamic import).
  - destructive confirm: `src/groups/w/file/rm.ts` (good readline) vs `src/groups/w/reg/regdel.ts` (bad raw `process.stdin.once`).
  - argument injection: `src/groups/w/svc/svcstart.ts` (bad) vs an arg-array `spawn` pattern (good).
  - Windows guard: `src/groups/w/net/wifipwd.ts:23` declarative (good) vs duplicated `requireWin()` in `src/groups/w/reg/reg.ts:4-6`, `src/groups/w/task/task.ts:5`, `src/groups/w/wsl/wsl.ts:5` (bad).
  - system access: adapter consumption (good) vs `src/groups/w/sys/bat.ts:2` direct `si` import (bad).
  - output: `error()` token (good) vs raw `console.error` (bad).
- Reviewer one-line mantra at the end: "If a touched surface has no test, it is a defect, not a debt."

- [ ] **Step 1: Verify all prior reference files exist**

```bash
for f in project-map.md routing-and-command-authoring.md execution-safety-and-platforms.md system-adapters.md testing-and-verification.md release-and-publishing.md; do test -e .claude/skills/jc-development/references/$f && echo "$f OK" || echo "$f MISSING"; done
```

Expected: all six `OK`. If any `MISSING`, return to the prior task and finish it before continuing.

- [ ] **Step 2: Author the file**

Use the Write tool. Frontmatter:

```yaml
---
name: review-checklist-and-examples
description: Load only at review time to check a PR against the jc-development references and consult the bad/good example catalog.
---
```

Body sections: (1) When to load, (2) Pre-merge checklist, (3) Bad/good example pairs, (4) Reviewer mantra. Cap at 300 lines. Use explicit `\r\n` JSON with Write.

- [ ] **Step 3: Verify the file**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/review-checklist-and-examples.md','utf8');const lines=s.split(/\r?\n/).length;console.log('lines:',lines);console.log('has-frontmatter:',s.startsWith('---\n')||s.startsWith('---\r\n'));['project-map.md','routing-and-command-authoring.md','execution-safety-and-platforms.md','system-adapters.md','testing-and-verification.md','release-and-publishing.md','src/groups/w/proc/port.ts','src/groups/w/proc/mem.ts','src/groups/w/file/rm.ts','src/groups/w/reg/regdel.ts','src/groups/w/svc/svcstart.ts','src/groups/w/net/wifipwd.ts','src/groups/w/reg/reg.ts','src/groups/w/task/task.ts','src/groups/w/wsl/wsl.ts','src/groups/w/sys/bat.ts'].forEach(p=>console.log(p+':',s.includes(p)));"
```

Expected: `lines:` ≤ 300, `has-frontmatter: true`, every check `true`.

- [ ] **Step 4: Convert to CRLF (mandatory)**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/review-checklist-and-examples.md'
$enc = New-Object System.Text.UTF8Encoding($false)
$content = [IO.File]::ReadAllText($p) -replace "`r`n","`n"
[IO.File]::WriteAllText($p, $content -replace "`n","`r`n", $enc)
```

Expected: command exits 0.

- [ ] **Step 5: Verify CRLF line endings**

Run from `D:\DevProjects\my\npm\jc` (PowerShell):

```powershell
$p = '.claude/skills/jc-development/references/review-checklist-and-examples.md'
$b = [IO.File]::ReadAllBytes($p); $crlf = 0; for ($i=1; $i -lt $b.Length; $i++) { if ($b[$i-1] -eq 0x0d -and $b[$i] -eq 0x0a) { $crlf++ } }; Write-Output "CRLF=$crlf LoneLF=$(($b | Where-Object {$_ -eq 0x0a}).Count - $crlf) Bytes=$($b.Length)"
```

Expected: `CRLF > 0`, `LoneLF=0`. If `CRLF=0`, repeat Step 4.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/jc-development/references/review-checklist-and-examples.md
git commit -m "docs(skill): add jc-development review-checklist-and-examples reference"
```

---

### Task 9: Validate the skill

**Files:**
- Read-only validation across `.claude/skills/jc-development/SKILL.md` and `references/*.md`. No new files created.

**Interfaces:**
- Consumes the eight files produced by Tasks 1-8.

**Validation contract (must all pass):**

- [ ] **Step 1: Coverage check — every reference is in `SKILL.md`**

```bash
node --input-type=commonjs -e "const fs=require('fs');const skill=fs.readFileSync('.claude/skills/jc-development/SKILL.md','utf8');const refs=fs.readdirSync('.claude/skills/jc-development/references').filter(f=>f.endsWith('.md'));const missing=refs.filter(r=>!skill.includes(r));console.log('missing:',missing.length?missing.join(','):'none');"
```

Expected: `missing: none`.

- [ ] **Step 2: No-orphan-reference check — every file in `references/` is mentioned in `SKILL.md`**

Already covered by Step 1; re-run if Step 1 changed `SKILL.md`. If a reference is missing, return to the relevant task and add the row.

- [ ] **Step 3: Main-page check — `SKILL.md` body is navigation-only**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/SKILL.md','utf8');const lines=s.split(/\r?\n/);const body=lines.slice(lines.indexOf('---',2)+1).join('\n');const headings=body.split('\n').filter(l=>/^#\s/.test(l));console.log('headings:',headings.length);console.log('body lines:',body.split('\n').length);"
```

Expected: `headings: 0`, body lines between 15 and 50.

- [ ] **Step 4: Bounded-release check — `release-and-publishing.md` points to `npm-work-flow`**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/release-and-publishing.md','utf8');console.log('mentions npm-work-flow:',s.includes('npm-work-flow'));"
```

Expected: `mentions npm-work-flow: true`.

- [ ] **Step 5: Frontmatter check — every reference has `name` and `description`**

```bash
node --input-type=commonjs -e "const fs=require('fs');const path=require('path');const dir='.claude/skills/jc-development/references';const files=fs.readdirSync(dir).filter(f=>f.endsWith('.md'));for(const f of files){const c=fs.readFileSync(path.join(dir,f),'utf8');const ok=c.startsWith('---\n')||c.startsWith('---\r\n');const hasName=/name:\s*[a-z0-9-]+/.test(c.split('---')[1]||'');const hasDesc=/description:\s*\S+/.test(c.split('---')[1]||'');console.log(f,'frontmatter:',ok,'name:',hasName,'description:',hasDesc);}"
```

Expected: every line shows `frontmatter: true name: true description: true`.

- [ ] **Step 6: Line-count cap — no reference exceeds 500 lines**

```bash
node --input-type=commonjs -e "const fs=require('fs');const path=require('path');const dir='.claude/skills/jc-development/references';for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.md'))){const lines=fs.readFileSync(path.join(dir,f),'utf8').split(/\r?\n/).length;console.log(f,'lines:',lines);}"
```

Expected: every `lines:` ≤ 500. If any exceeds, return to that task and split per the global constraint.

- [ ] **Step 7: Link integrity — every internal reference link in `review-checklist-and-examples.md` resolves**

```bash
node --input-type=commonjs -e "const fs=require('fs');const s=fs.readFileSync('.claude/skills/jc-development/references/review-checklist-and-examples.md','utf8');const re=/\]\(([a-z0-9-]+\.md)\)/g;let m;const broken=[];while((m=re.exec(s))){const p='.claude/skills/jc-development/references/'+m[1];if(!fs.existsSync(p))broken.push(m[1]);}console.log('broken:',broken.length?broken.join(','):'none');"
```

Expected: `broken: none`.

- [ ] **Step 8: No-code-change check**

```bash
git status --short
```

Expected: only entries starting with `??` (untracked files) or `A` (staged) under `.claude/skills/jc-development/`. No tracked file outside that path shows `M`. The only exception is the previously committed `docs/superpowers/specs/2026-07-29-jc-development-skill-design.md` which is already on the main branch.

- [ ] **Step 9: Commit any outstanding changes**

If Step 8 surfaces staged or modified files, stage only the new skill files and commit:

```bash
git add .claude/skills/jc-development
git status --short
```

Expected: no output (clean tree except untracked planning artifacts `notes.md` and `task_plan.md` if present).

- [ ] **Step 10: Final summary**

Report to the user:
- Total files created (1 main + 7 references).
- Per-file line count and the result of the validation steps.
- The exact path of `SKILL.md` and the seven references.
- Confirmation that `npm-work-flow` was not modified.
- Confirmation that no source or test file was modified.

Do not run a `git push`; the user decides when to push.

---

## Self-Review (post-write)

1. **Spec coverage:**
   - Section 4 layout → Task 1.
   - Section 5.1 `project-map.md` → Task 2.
   - Section 5.2 `routing-and-command-authoring.md` → Task 3.
   - Section 5.3 `execution-safety-and-platforms.md` → Task 4.
   - Section 5.4 `system-adapters.md` → Task 5.
   - Section 5.5 `testing-and-verification.md` → Task 6.
   - Section 5.6 `release-and-publishing.md` → Task 7.
   - Section 5.7 `review-checklist-and-examples.md` → Task 8.
   - Section 6 `SKILL.md` outline → Task 1.
   - Section 7 frontmatter description → Task 1.
   - Section 8 per-reference frontmatter → Tasks 2-8.
   - Section 9 writing rules → distributed across all tasks.
   - Section 10 validation plan → Task 9.
   - Section 11 risks → mitigation applied per task.
   No gaps.

2. **Placeholder scan:** searched for `TBD`, `TODO`, `implement later`, `add appropriate`, `similar to`. No occurrences.

3. **Type consistency:** no types, classes, or functions defined across multiple tasks. The `name` slug of each reference appears identically in `SKILL.md`, in the file name, in the per-file frontmatter, and in Task 9's link check. The seven slugs are: `project-map`, `routing-and-command-authoring`, `execution-safety-and-platforms`, `system-adapters`, `testing-and-verification`, `release-and-publishing`, `review-checklist-and-examples`.
