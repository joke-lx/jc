# jc-development Skill — Design Spec

**Date:** 2026-07-29
**Status:** Proposed (awaiting user review)
**Owners:** main agent
**Type:** Project-local anti-corrosion skill (target-normative)

## 1. Background and Motivation

`je-cd` (CLI `jc`) is an ESM Node 18+ CLI built with tsup. It exposes three top-level groups (`claude`, `happy`, `w`) and 113 first-party TypeScript files. Maintenance and growth are slowed by recurring patterns:

- Hand-rolled per-file Windows guards that duplicate a router-level check.
- Direct interpolation of user arguments into shell command strings.
- Bypassing the shared `systeminformation` adapter in some commands.
- Inconsistent destructive-operation confirmation patterns.
- Direct `process.exit` calls inside handlers, which blocks unit testing.
- No CI lint, formatter, type-check, or coverage gate.
- A growing bundle of `commandDef` files that have to remain consistent with router, output, types, and tests.

The goal is to capture the project's reusable operating knowledge in a skill whose main page is a navigation table only, and whose substantive guidance is in cohesive `references/*.md` files.

The existing project-local skill `.claude/skills/npm-work-flow/SKILL.md` documents a generic push-to-main npm release pattern. It is intentionally not modified; the new skill complements it by handling development anti-corrosion, and points to it for the generic release flow.

## 2. Design Goals (target-normative)

1. **Navigation-only main page.** `SKILL.md` contains YAML frontmatter and a routing map; no SOP, examples, checklists, or architecture prose live there.
2. **One reference = one cohesive theme.** Each reference answers one decision question and loads on a clearly defined trigger.
3. **Goal-oriented, not status-mirroring.** References prescribe the patterns future code should follow. Current inconsistencies appear as labeled "legacy hazard" or "bad example" callouts, not as canonized practice.
4. **Evidence-grounded.** Every rule cites at least one repo-relative `file:line` and one concrete bad/good example.
5. **Bounded release scope.** Generic release mechanics stay in `npm-work-flow`; this skill only documents the project's release-please/npm-publish ownership split and the project-specific failure lessons.
6. **No code changes.** This spec produces documentation only; no source or test files are modified.

## 3. Out of Scope

- Editing `src/**`, `tests/**`, `tsup.config.ts`, `vitest.config.ts`, `tsconfig.json`, or `package.json`.
- Rewriting or merging `.claude/skills/npm-work-flow/`.
- Generating per-command reference pages; command inventory is discoverable from `src/groups/**/index.ts` and drifts faster than architectural guidance.
- Adding CI lint, formatter, coverage, or type-check steps.
- Producing multi-language docs; the skill is English-only.

## 4. Target Layout

```
.claude/skills/jc-development/
├── SKILL.md                    # navigation-only main page
└── references/
    ├── project-map.md
    ├── routing-and-command-authoring.md
    ├── execution-safety-and-platforms.md
    ├── system-adapters.md
    ├── testing-and-verification.md
    ├── release-and-publishing.md
    └── review-checklist-and-examples.md
```

`SKILL.md` body content is restricted to:

- YAML frontmatter (`name`, `description`).
- One-sentence purpose statement.
- A reference routing table with columns: **Trigger / Task**, **Reference**, **Path**.
- One-line "load all matching" rule.

## 5. Reference Taxonomy (structure C, approved)

### 5.1 `references/project-map.md`

**Theme:** "What is this project and where do things live?" (read first whenever a development task is opened).

**Must contain:**

- Package identity table: name, binary, ESM, Node 18 target, license, repository.
- Runtime flow diagram with `file:line` anchors: `process.argv` → `src/index.ts` → `route()` → `Group` → `Command` → `handler` → shared-system layer.
- Module ownership table: `src/cli/*`, `src/groups/*`, `src/shared/system/*`, `src/index.ts`, `tests/*`, `.github/workflows/*`.
- ESM `.js` import-suffix rule.
- First-party file inventory size (no exact count claim — describe approximate composition).
- Pointer to design spec and prior implementation plan locations.

**Load when:** opening any development task; first reference to read.

### 5.2 `references/routing-and-command-authoring.md`

**Theme:** "How do I add or change a command while preserving the routing contract?" (the largest single authoring concern).

**Must contain:**

- `Command` / `Category` / `Group` / `CommandHandler` type contracts with `file:line` anchors.
- `parseArgs` → `route` → `printGroupHelp` / `printCommandHelp` / `printCategoryHelp` flow as one mental model.
- Three-level help model: `jc <g> l` (group), `jc <g> <cat>` (category), `jc <g> <cmd> ?` (command).
- `registerGroup` + alias registration behavior.
- `defaultHandler` semantics and which groups set one.
- Step-by-step add-command recipe (file path, exports, imports, group wiring, help metadata).
- Target command template (prescribe `src/groups/w/proc/port.ts` as good example; explicitly mark `src/groups/w/proc/mem.ts` dynamic import as bad).
- Metadata fields that must co-locate with `commandDef`: `name`, `description`, `helpText`, `examples`, `related`, `platform`.
- Output token rules: use `error` / `warning` / `success` from `src/cli/output.ts`; no inline chalk; no raw `console.error` for user-facing errors.
- Registration invariant: any new top-level group requires router edit at `src/cli/router.ts:33-35`.

**Load when:** modifying or adding `commandDef`, group, category, router, types, help, or output; also for review of any of those.

### 5.3 `references/execution-safety-and-platforms.md`

**Theme:** "How do I run external code safely and gate platforms correctly?" (cross-cutting risk reference).

**Must contain:**

- Three execution patterns: `child_process.spawn` wrapper (claude/happy), `child_process.execSync` (w group), direct `process.kill` signals (`WinProcessManager`, `portkill`).
- Decision rule for choosing pattern: event-driven external CLI → `spawn`; synchronous Windows shell action → `execSync`; never mix in a single command.
- User-argument handling rule: never interpolate `args[*]` into a shell string. List specific bad sites (`src/groups/w/svc/svcstart.ts:7`, `src/groups/w/task/taskrun.ts:8`, `src/groups/w/reg/regset.ts:14`, `src/groups/w/reg/regdel.ts:13`, `src/groups/w/reg/regfind.ts`).
- Preferred replacements: arg-array `spawn`, or `powershell -NoProfile -Command -` with stdin-piped ArgumentList.
- Platform decision tree:
  - declaratively Windows-only → `platform: 'win32'` on `commandDef` (router guards at `src/cli/router.ts:88-91`);
  - mixed-platform command with both branches → inline `process.platform` check with `console.error` + return (no `process.exit`);
  - hard-incompatible command already covered by declarative gating → do not duplicate guards.
- Exit-code contract: `0` success, `1` unknown/usage, `2` execution failure, `3` platform not supported. List 28 verified `process.exit` call sites and forbid introducing new codes.
- Destructive-operation confirmation: prescribe an isolated helper (model on `src/groups/w/file/rm.ts:5-13`); explicitly mark `src/groups/w/reg/regdel.ts:13-18` raw-stdin pattern as bad.
- Soft/hard kill flags: `--list` and `--soft` semantics in `portkill` are the reference model.

**Load when:** changing process execution, shell, signals, platform checks, exit codes, or destructive operations.

### 5.4 `references/system-adapters.md`

**Theme:** "How do I add or consume shared system managers without coupling to environment APIs?"

**Must contain:**

- Adapter contract: `interface <Resource>Manager` + `class System<Resource>Manager` + factory in `src/shared/system/adapter.ts`.
- Resource coverage: cpu, memory, disk, gpu, os, network, process. Each with interface/return shape and any cross-platform fallback.
- `WinProcessManager` netstat fallback at `src/shared/system/process.ts:64-89` and `src/shared/system/network.ts:53-86` as a documented "currently shared-across-platforms" reality, with a note that the name does not match behavior.
- `systeminformation` (`si`) usage: `adapter.ts` always returns the same implementation; legacy direct `si` imports in `src/groups/w/sys/bat.ts:2` and `src/groups/w/sys/mon.ts:2` are bad examples for new code.
- `pidusage` dead-import anti-example in `src/shared/system/process.ts:2`.
- Rule for new commands: import via the adapter; do not introduce direct `si` calls.
- Test-time rule: mock the adapter factory, not the underlying library.
- Normalization conventions: `load.currentLoad` rounded to 1 decimal, bytes→GB, and the GPU VRAM note that `SystemGpuManager.getInfo` divides `vram` by `1024` to convert the `systeminformation` library's MB value to GB; the field name `vramGB` is therefore correct. The reference must state the conversion and warn against both silently changing the divisor and silently changing the field name.

**Load when:** touching `src/shared/system/**`, adding a new system resource, or unit-testing a command that calls system info.

### 5.5 `references/testing-and-verification.md`

**Theme:** "What does the test surface cover today and what must I assert for new code?"

**Must contain:**

- Current test inventory with file:line anchors: `tests/cli/router.test.ts`, `tests/shared/system/{process,cpu,disk}.test.ts`.
- Verified assertion list per file (real `systeminformation` calls, no mocks; one test swallows top-process errors).
- Test runner config: `vitest` 2.1.x, `globals: true`, `environment: 'node'`.
- Verification commands: `npm test`, `npm run build`, `node dist/index.js`, `npm view je-cd@$(node -p "require('./package.json').version") version`, `npm publish --provenance --dry-run`.
- Explicitly absent checks: no lint, no formatter, no coverage threshold, no `tsc --noEmit` script. Do not claim them.
- Target coverage matrix (what new work must add tests for, with `file:line` of the change site):
  - router resolution branches beyond `route([])`;
  - command alias resolution at `src/cli/router.ts:80`;
  - platform gating paths;
  - `output.ts` chalk wrappers;
  - `adapter.ts` factories;
  - process success path (only failure path is currently tested);
  - every new `commandDef` and any touched existing one.
- Mock policy: prefer `vi.mock('../../src/shared/system/adapter.js')`; mark `process.test.ts:21-25` swallow-and-ignore as anti-pattern.
- Reviewer-facing rule: a touched surface without an added test is a defect, not a debt.

**Load when:** adding tests, modifying tests, reviewing PRs that touch tests, or asserting new behavior in CI/local.

### 5.6 `references/release-and-publishing.md`

**Theme:** "What is the project-specific release ownership split and what lessons constrain future workflow changes?"

**Must contain:**

- Ownership table:
  - `release-please` owns version bump, CHANGELOG, release PR, tag, GitHub release.
  - `npm-publish.yml` owns npm registry upload, OIDC provenance, and the `npm view je-cd@<ver>` idempotency guard.
- Required permissions and prerequisites: `contents: write`, `pull-requests: write` (release-please); `contents: write`, `id-token: write` (npm-publish).
- Hard invariants: keep `package.json` name in lockstep with the `package-name` in `release-please` and with the `npm view` check; populate `repository.url`; run `npm ci` before build; never restore inline tag creation to `npm-publish.yml`; never add a workflow that publishes on `workflow_dispatch` to replace the push-to-main model.
- Historical pitfall catalog (seven entries from CHANGELOG and git log): missing `repository.url`, missing OIDC permission, missing runner deps, name drift, scope-org gating, tag-source-of-truth conflict, trigger ambiguity.
- Local build and publish: `npm run build`, `npm run prepublishOnly`, `npm publish --provenance --dry-run`.
- Cross-skill pointer: load `.claude/skills/npm-work-flow/SKILL.md` for the generic push-to-main release pattern; this reference only carries project-specific ownership and lessons.

**Load when:** changing workflows, troubleshooting a failed release, or onboarding a maintainer to the publish flow.

### 5.7 `references/review-checklist-and-examples.md`

**Theme:** "A single-shot cross-reference summary for PR review." (load only at review time, not for first authoring).

**Must contain:**

- Concise pre-merge checklist cross-referencing the other six references (e.g. "Did you add a router test? → see testing-and-verification.md").
- Repository-grounded bad/good example pairs, each citing `file:line`:
  - command-authoring: `src/groups/w/proc/port.ts` (good) vs `src/groups/w/proc/mem.ts` (bad dynamic import).
  - destructive confirm: `src/groups/w/file/rm.ts` (good readline) vs `src/groups/w/reg/regdel.ts` (bad raw `process.stdin.once`).
  - argument injection: `src/groups/w/svc/svcstart.ts` (bad) vs an arg-array `spawn` pattern (good).
  - Windows guard: `src/groups/w/net/wifipwd.ts:23` declarative (good) vs duplicated `requireWin()` in `reg/*` / `task/*` / `wsl/*` (bad).
  - system access: adapter consumption (good) vs `src/groups/w/sys/bat.ts:2` direct `si` import (bad).
  - output: `error()` token (good) vs raw `console.error` (bad).
- Reviewer one-line mantra: "If a touched surface has no test, it is a defect, not a debt."

**Load when:** reviewing a PR or doing a self-review before opening one.

## 6. `SKILL.md` Outline

The final `SKILL.md` is small and contains only:

- YAML frontmatter:
  - `name: jc-development`
  - `description:` one-line trigger description, third-person, covering "add/modify/test/review the jc CLI and its commands."
- One-sentence purpose statement.
- Routing table (markdown) with columns **Trigger / Task**, **Reference**, **Path**, **Notes**.
- A single-sentence "load all matching references" guidance line.
- No architecture text, no SOP, no example, no checklist.

## 7. Description Field (frontmatter) — draft

> Use when adding, modifying, testing, or reviewing the `jc` CLI and its commands. Routes to development-only references; the generic release pattern is covered by the `npm-work-flow` skill.

## 8. Frontmatter per Reference

Each `references/<name>.md` has:

- `name: <ref-slug>` (kebab-case, matches filename without `.md`).
- `description:` one-line "when to load this reference" statement, third-person.

Example:

```yaml
---
name: routing-and-command-authoring
description: Load when adding, modifying, or reviewing a jc command, its metadata, group wiring, router dispatch, or help output.
---
```

## 9. Writing Rules for References

- Each reference opens with a one-sentence "When to load" reminder even though `description` carries it; this is for agents that read the file body without checking frontmatter.
- Bad/good examples appear with the file:line in the same paragraph.
- Legacy/current inconsistencies are explicitly marked `**Legacy hazard**` or `**Bad example**`; they are never presented as the default rule.
- No code blocks exceeding 30 lines; longer examples go in fenced blocks with a 1-line header.
- Cross-references use Markdown links to the reference file: `[routing-and-command-authoring](routing-and-command-authoring.md)`.
- No reference exceeds 500 lines; if a draft crosses that, split by cohesive sub-theme and add a parent reference that loads the sub-references.

## 10. Validation Plan

After writing the skill:

1. **Coverage check** — each repo-relative rule cited in evidence is reachable from at least one reference; spot-check via the seven reference tables.
2. **Main-page check** — `SKILL.md` body contains exactly: frontmatter, purpose sentence, routing table, one guidance line. No architecture prose.
3. **No-orphan-reference check** — every reference listed in the routing table exists; every file in `references/` is listed in the routing table.
4. **Crisp-trigger check** — every `description` field is third-person, names a trigger, and does not summarize content.
5. **Link check** — internal cross-references between references resolve.
6. **Bounded-release check** — `references/release-and-publishing.md` carries the ownership split and pitfall catalog and explicitly points to `.claude/skills/npm-work-flow/SKILL.md` for the generic pattern.
7. **No-code-change check** — git working tree contains only new files under `.claude/skills/jc-development/` and a new spec under `docs/superpowers/specs/2026-07-29-jc-development-skill-design.md`; no existing tracked file is modified.

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| A reference drifts to status-mirror rather than target-normative | Each "current inconsistency" is required to be labeled `**Legacy hazard**` or `**Bad example**`; otherwise not allowed. |
| `routing-and-command-authoring.md` grows past 500 lines | Plan an early split (e.g. separate "metadata + help" sub-reference) if draft approaches 450. |
| `release-and-publishing.md` duplicates `npm-work-flow` | Reference file is required to point to the existing skill and to limit itself to ownership + project lessons. |
| `description` fields become too broad and trigger on unrelated tasks | Each description names a specific decision moment; vague descriptions are rejected at self-review. |
| Agent loads the wrong reference | Routing table is required to make the trigger explicit in the **Trigger / Task** column. |

## 12. Open Questions for the User

None at this point; location, audience, scope, and target-normative posture have all been confirmed. Naming of the skill (`jc-development`) is a recommendation; the user can rename it.

## 13. Out-of-Plan Notes

- No CI changes proposed. If the user later wants lint/coverage/type-check, it is a separate spec.
- No code refactor proposed. The review reference points out inconsistencies but does not request fixes; any cleanup is a separate task.
