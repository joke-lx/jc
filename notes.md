# Notes: Repository-to-Skill Distillation

## Request
- Read the current project.
- Distill reusable project knowledge into a Claude skill.
- Keep the skill's main page (`SKILL.md`) limited to reference mappings/loading guidance.
- Organize substantive content as cohesive topic references according to `key_board_3`.

## Constraints
- Do not implement before design approval (`superpowers:brainstorming` hard gate).
- Do not split by arbitrary length; split by independent topic.
- Avoid orphan references; every reference must have an explicit loading condition in `SKILL.md`.
- Preserve repository facts accurately and distinguish reusable workflows from transient state.

## Repository Evidence

### Inventory
- 131 tracked files.
- 113 first-party TypeScript source files.
- 101 command/group files under `src/groups/`.
- 4 test files.
- 2 GitHub Actions workflows.
- Existing project-local skill: `.claude/skills/gh-action/SKILL.md` (added in the latest commit; the `npm-publish` ref at `references/npm-publish.md` consolidates the former `npm-work-flow` skill).
- Existing design/implementation records under `docs/superpowers/`.
- Working tree was initially clean; `task_plan.md` and `notes.md` are temporary planning artifacts created for this task.

### Documentation, package, and release findings
- Package identity is `je-cd`; installed binary is `jc`; package is ESM and bundles from `src/index.ts` to `dist/index.js` with tsup.
- Stable developer loop: `npm run build`, `npm run dev`, `npm test`, `npm run test:watch`; `prepublishOnly` builds before publication.
- Release ownership is deliberately split:
  - release-please owns version bumps, CHANGELOG updates, release PRs, tags, and GitHub releases;
  - `npm-publish.yml` owns npm upload, OIDC provenance, and the idempotent `npm view <name>@<version>` guard.
- Durable release invariants include keeping the package name synchronized across `package.json`, release-please, and npm-view checks; retaining `repository.url`; running `npm ci` before build; granting `id-token: write` for provenance; and never restoring duplicate tag creation to the publish workflow.
- Existing `.claude/skills/gh-action/SKILL.md` (specifically the `npm-publish` ref at `references/npm-publish.md`) already captures the generic push-to-main npm release pattern. A project-wide skill should route release questions to project-specific release ownership guidance and point to this existing skill rather than duplicate its generic content.
- Durable platform model has three modes: shared-system abstraction for cross-platform behavior, router-level `platform: 'win32'` rejection for declarative Windows-only commands, and direct handler guards/platform branches for legacy or mixed-platform commands.
- Exit-code contract reported by existing design evidence: `0` success, `1` usage/unknown command, `2` execution failure, `3` unsupported platform.
- Historical versions, exact command counts, rename chronology, and commit SHAs are examples/evidence rather than load-bearing skill rules.
- The delegated report called the test inventory “3 existing test files,” but tracked-file evidence shows 4; retain 4 as the verified count and avoid copying that report typo.

### Tests and executable contracts
- Four first-party test files cover argument parsing/no-argument routing and selected real-system CPU, disk, and process-manager behaviors.
- Tests currently exercise real `systeminformation` calls with no mocks. This makes them environment-sensitive; one process test catches and ignores top-process failures, which is an anti-pattern rather than a model to preserve.
- The file ratio (4 test files to 113 source files) is only an inventory signal, not measured code coverage. No coverage threshold is configured.
- Router contract:
  - no arguments prints top-level help;
  - group aliases share registration entries;
  - `l` lists group commands;
  - an omitted command invokes `defaultHandler` when present, otherwise group help;
  - commands can live directly on a group or inside categories;
  - `?`, `-h`, and `--help` trigger command help only when first in the command argument tail;
  - unknown group/command exits `1`; declaratively unsupported Windows-only command exits `3`.
- Command contract is `handler(args: string[]): Promise<void>` plus metadata (`name`, `description`, optional aliases/help/examples/related/platform). New group registration is static, requiring both a group index and router registration; no auto-discovery exists.
- Output contract centralizes colored tokens and command/group/category help rendering in `src/cli/output.ts`.
- Existing execution modes include child-process `spawn` wrappers, synchronous shell commands, and direct process signals. Raw interpolation of user arguments into shell strings is a real command-injection hazard and should appear as an explicit bad example; future guidance should prefer argument arrays/no-shell execution where feasible.
- Destructive operations have confirm-first precedents (`rm`, `regdel`), but implementations are inconsistent. The reusable rule should require an isolated, testable confirmation helper and should not canonize raw `process.stdin.once` handling.
- Platform behavior is currently mixed among declarative router gating, hard handler exits, soft handler returns, and cross-platform branches. The skill should describe current reality but prescribe one preferred decision tree for new work.
- Shared system managers form a useful abstraction boundary. Some handlers still import `systeminformation` directly; the skill should prescribe using the adapter for new work and mocking the adapter in unit tests.
- Stable verification surface: `npm test`, `npm run build`, CLI smoke tests. There is no lint/formatter/coverage/type-check script, so the skill must not claim those checks exist.
- Key missing regression protection (to encode as expectations for touched behavior): router resolution branches, command aliases, output formatting, adapter factories, platform gating, process success paths, and command modules.

### Candidate themes from test/contract evidence
1. Routing, metadata, help, and registration contracts.
2. Command execution and safe argument handling.
3. Platform decision tree and exit codes.
4. Shared system adapters and data normalization.
5. Destructive-operation safeguards.
6. Testing strategy and verification matrix.
7. Command/category catalog as a lookup reference only if it remains maintainable.

### Source architecture and module boundaries
- Runtime flow is `process.argv` → `src/index.ts` → `route()` → statically registered `Group` → direct/category `Command` → async handler. The shared-system layer is a parallel abstraction used by data-oriented `w` commands.
- Stable ownership boundaries:
  - `src/cli/types.ts`: public `Command`, `Category`, `Group`, and handler contracts;
  - `src/cli/router.ts`: parsing, lookup, help dispatch, platform gating, and invocation;
  - `src/cli/output.ts`: shared colors and help rendering;
  - `src/groups/<group>/index.ts`: group/category composition;
  - each command file: one handler plus co-located `commandDef` metadata;
  - `src/shared/system/*`: system-query interfaces/implementations;
  - `src/shared/system/adapter.ts`: manager factories consumed by commands.
- Relative imports use `.js` suffixes under the ESM/bundler setup; this is an authoring invariant.
- Adding a command requires creating the command module and wiring its `commandDef` into the owning group/category index. Adding a top-level group additionally requires explicit router registration.
- Good patterns worth preserving:
  - help metadata co-located with `commandDef`;
  - centralized `error`/`warning`/`success` output tokens;
  - `console.table` for tabular results;
  - `Promise.all` for independent system queries;
  - group-level default handlers for wrapper groups;
  - shared-manager access through the adapter.
- Corrosion hazards to turn into prescriptive checks:
  - duplicated inline Windows guards where `platform: 'win32'` can centralize enforcement;
  - raw user-argument interpolation into shell strings;
  - inconsistent static versus dynamic imports;
  - `any` in caught errors instead of narrowing `unknown`;
  - dead imports/schema paths;
  - misleading platform-specific names for cross-platform implementations;
  - untestable direct `process.exit` and raw-stdin confirmation inside handlers;
  - bypassing shared output and adapter abstractions.
- The current code is descriptive evidence, not automatically the preferred pattern: references must label legacy/inconsistent behavior separately from rules for new changes.

## Synthesized repository model

### What the project is
`je-cd` is an ESM Node CLI published as `jc`. It groups external-tool wrappers (`claude`, `happy`) and a large `w` command suite behind one router, with shared system adapters for cross-platform information queries and Windows-specific execution paths where necessary.

### High-value reusable workflows
1. Understand routing and module ownership before changing behavior.
2. Add or modify a command while preserving metadata, ESM imports, registration, help, output, platform, and exit-code contracts.
3. Choose the safe execution mechanism for external commands and untrusted arguments.
4. Extend or consume shared system adapters without coupling command handlers directly to environment APIs.
5. Test changes with deterministic mocks plus targeted integration/smoke checks.
6. Build and release without violating release-please/npm-publish ownership or provenance prerequisites.

### Facts that should not become load-bearing rules
- Current version number.
- Exact command/file counts.
- Historical commit hashes.
- One-off rename chronology.
- Existing inconsistencies that are better recorded as migration hazards or bad examples.

## Candidate Reference Taxonomy

### Recommended consolidated themes (provisional)
1. `project-map.md` — package identity, runtime/data flow, directory/module ownership, and “where to look first.”
2. `routing-and-command-authoring.md` — types, parse/dispatch flow, command/group/category registration, metadata/help, ESM import convention, and concrete add/change recipes.
3. `execution-safety-and-platforms.md` — process-spawn choices, argument handling, destructive confirmation, platform decision tree, exit codes, and command-injection anti-patterns.
4. `system-adapters.md` — manager interfaces/classes/factories, normalized data, cross-platform fallbacks, and rules for extending/mocking the shared layer.
5. `testing-and-verification.md` — current test architecture, deterministic unit-test rules, touched-surface matrix, build/smoke checks, and explicitly absent checks.
6. `build-release-and-publishing.md` — local build/package flow, workflow ownership split, OIDC/provenance/idempotency safeguards, historical failure lessons, and pointer to the `npm-publish` ref in `.claude/skills/gh-action/SKILL.md` for the generic pattern.
7. `review-checklist-and-examples.md` — cross-cutting pre-merge checklist plus repository-grounded bad/good examples; load during review rather than normal authoring.

### Why not mirror every source directory
- A per-category or per-command reference would create brittle, low-value catalog documents.
- Command categories share the same authoring and safety contracts; exceptions belong in the relevant specialized theme.
- Exact command inventory is already discoverable from `src/groups/**/index.ts` and will drift faster than architectural guidance.

### Navigation-only main-page interpretation
The main `SKILL.md` would contain only YAML frontmatter plus a compact routing table with columns such as `reference`, `load when`, and `path`, and perhaps a one-line “load all matching references” rule. It would contain no architecture prose, SOP, examples, checklists, or copied repository content.

## Open Questions

- Whether the references should faithfully describe current behavior or prescribe preferred patterns while labeling legacy deviations.
- Primary use case is development anti-corrosion: adding/changing jc commands, routing, shared system modules, and tests. Release material should remain a bounded project reference plus a pointer to the `npm-publish` ref in `.claude/skills/gh-action/SKILL.md`, not become the skill's center of gravity.

## Confirmed Decisions

- Create a new project-local skill under `.claude/skills/`.
- Keep the existing `.claude/skills/gh-action/SKILL.md` skill (and its `npm-publish` ref at `references/npm-publish.md`) separate and reference it rather than expanding or duplicating it.
