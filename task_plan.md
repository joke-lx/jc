# Task Plan: Distill this repository into a references-first skill

## Goal
Analyze the current repository and, after explicit design approval, distill its reusable operating knowledge into a skill whose `SKILL.md` is only a reference-routing map and whose substantive guidance lives in cohesive `references/*.md` documents.

## Phases
- [x] Phase 1: Explore project context (files, docs, configuration, tests, recent commits)
- [x] Phase 2: Clarify target location, audience, scope, and success criteria one question at a time
- [x] Phase 3: Compare organization approaches
- [x] Phase 4: Present skill design
- [x] Phase 5: Write design specification
- [x] Phase 6: Obtain spec review
- [x] Phase 7: Plan implementation
- [x] Phase 8: Implement skill
- [x] Phase 9: Validate skill
- [x] Phase 10: Translate to Chinese
- [x] Phase 11: Brainstorm "统一管理器" feature (spec at 26079e6, plan at 62d097d, 10-task SDD executed 47a4571..3e03ad3; 11 commits on main; 33/33 tests pass; 25 files changed +891/-16)

## Key Questions
1. Where should the resulting skill live, and should it replace or complement anything existing?
2. Which repository knowledge is reusable enough to become operational guidance rather than a snapshot?
3. What reference taxonomy provides complete coverage without fragmenting a single theme?
4. What exact content is allowed in a navigation-only `SKILL.md`?
5. How will the skill be validated against the repository and by a future agent?
6. For the "统一管理器" feature, where should registry state live? (resolved: independent XDG config)
7. What kinds of "managed items" should the registry support? (npm package by URL, Python script, EXE script — pending)

## Decisions Made
- Use `key_board_3` principles: organize by cohesive themes; each reference owns one specialized topic.
- Honor the user's stricter requirement that the main `SKILL.md` contain only reference mappings/loading guidance.
- Treat repository reading and skill design as analysis first; do not create the actual skill before explicit design approval.
- Use the written design spec as the final planning deliverable before implementation planning.
- "统一管理器" configuration lives in an independent XDG config file (e.g. `~/.config/jc/registry.json` or `~/.jc-registry.json`), not in npm-managed `package.json` and not in OS package managers.

## Errors Encountered
- Initial `Read` call passed an empty `pages` value, which is invalid for non-PDF reads; retried with a valid value and will omit `pages` for text files going forward.
- Broad configuration/document globs included `node_modules`; switched to the tracked-file inventory (`git ls-files`) and explicitly scoped all analysis agents to first-party files.
- The plan doc went through several iterations because the original `\r\n` Write-tool recipe did not work; the [IO.File]::WriteAllText call was switched to the 3-arg form with a pre-bound `$enc`, and a split-form was required to bind the call correctly under PowerShell 5.1.
- Spec wording around the GPU VRAM caveat was wrong: `systeminformation` reports `vram` in MB, dividing by 1024 produces GB, and the field name `vramGB` is therefore correct. Patched in commit `90498f1`.

## Status
**Currently in Phase 11** — brainstorming the "统一管理器" feature. Config storage decision is locked. Next clarifying question: shape of the registry item model (npm package by URL, Python script, EXE script) and how to add / invoke / remove each.
