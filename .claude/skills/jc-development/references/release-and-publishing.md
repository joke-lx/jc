---
name: release-and-publishing
description: 在修改 workflow、排查发布失败，或为新维护者讲解 jc 发布流程时加载。
---

# release-and-publishing

本 reference 只覆盖本项目特有的职责划分与踩坑经验；通用工作流模板放在 `gh-action` skill 中。需要标准的 push-to-main 模式、规范的 `npm-publish.yml` 模板或 secrets 检查清单时，请加载 `.claude/skills/gh-action/references/npm-publish.md`。本文件仅描述 `jc` 与通用模式的不同之处、本地拥有的内容，以及历史上已经烧进血的坑。

## 加载时机

- 你正在编辑 `.github/workflows/release-please.yml` 或 `.github/workflows/npm-publish.yml`。
- GitHub Actions 上的 release 失败，需要按职责切分定位。
- 正在为新维护者讲解两个 workflow 各自的职责。
- 你正在改动 `package.json` 的 `name`、`repository` 或 `version`，需要知道哪些文件必须同步变动。

## 职责划分表

| 关注点 | 所有者 | workflow 文件 | 说明 |
|---|---|---|---|
| 版本号提升 | `release-please` | `.github/workflows/release-please.yml` | 跟随 Conventional Commits；提升 `version`、写入 `CHANGELOG.md`、开 release PR、建 tag、开 GitHub release。 |
| `CHANGELOG.md` | `release-please` | `.github/workflows/release-please.yml` | 唯一真理来源；不要手改。 |
| Release PR 与 tag | `release-please` | `.github/workflows/release-please.yml` | tag 创建由这里负责；`npm-publish.yml` 永远不要重建 tag。 |
| GitHub release | `release-please` | `.github/workflows/release-please.yml` | 使用 `googleapis/release-please-action@v4`。 |
| npm registry 上传 | `npm-publish.yml` | `.github/workflows/npm-publish.yml` | `npm publish --provenance --access public`。 |
| OIDC provenance 证明 | `npm-publish.yml` | `.github/workflows/npm-publish.yml` | `id-token: write` 是开启 `--provenance` 所需的权限。 |
| `npm view je-cd@<ver>` 幂等守卫 | `npm-publish.yml` | `.github/workflows/npm-publish.yml` | 当版本已在 registry 上时跳过发布；防止重跑时重复发布。 |

## 所需权限

两条 workflow，两套不同的权限。不要合并。

**`release-please.yml`**（`D:/DevProjects/my/npm/jc/.github/workflows/release-please.yml:7`）：

- `contents: write` —— 需要把版本号提升提交与 tag 推回仓库。
- `pull-requests: write` —— 需要开 release PR 与 GitHub release。

**`npm-publish.yml`**（`D:/DevProjects/my/npm/jc/.github/workflows/npm-publish.yml:7`）：

- `contents: write` —— 需要在已打 tag 的 commit 上检出并读取仓库。
- `id-token: write` —— OIDC 令牌交换所需，让 `npm publish --provenance` 能附上 Sigstore provenance 证明。删除该权限会破坏 `--provenance` 校验。

Secrets（通过 `${{ secrets.NPM_TOKEN }}` 与 `${{ secrets.GITHUB_TOKEN }}` 引用）：

- `NPM_TOKEN` —— 对 `je-cd` 包具有发布权限的 automation token。
- `GITHUB_TOKEN` —— 由 Actions 自动提供；无需手动设置。

## 硬不变量

这些规则是 load-bearing 的。每一条都曾导致过发布失败；详见下文的踩坑目录。

- **保持 `package.json` `name`、`release-please` 的 `package-name`、以及 `npm view` 检查三者严格同步**。三者必须解析到同一个字符串。截至 `main`，规范名是 `je-cd`（`D:/DevProjects/my/npm/jc/package.json:2`、`D:/DevProjects/my/npm/jc/.github/workflows/release-please.yml:20`、`D:/DevProjects/my/npm/jc/.github/workflows/npm-publish.yml:40`）。任一对出现漂移都会静默破坏发布或产生孤儿 release PR。
- **`package.json` 必须填 `repository.url`**。当 `repository` 字段缺失或格式错误时，`--provenance` 标志会拒绝发布。参见 `D:/DevProjects/my/npm/jc/package.json:32`。
- **在 CI 中构建前先跑 `npm ci`**。Actions runner 不带 `node_modules`；没有 `npm ci` 的话，`prepublishOnly` 触发的 `tsup` 构建会以 "tsup: command not found" 失败。该步当前位于 `D:/DevProjects/my/npm/jc/.github/workflows/npm-publish.yml:35`。
- **永远不要在 `npm-publish.yml` 中恢复行内 tag 创建**。`release-please` 拥有 tag。若 `npm-publish.yml` 重新加上 tag 步骤，两条 workflow 会竞争，release PR 也无法干净关闭。参见提交 `491ae89`。
- **永远不要把 push-to-main 模型替换成 `workflow_dispatch` 发布的触发器**。push-to-main 流通过 `npm view` 实现幂等，重跑时能自愈。改成手动触发会同时失去这两点。参见提交 `c7d3147`。
- **不要把任一 workflow 的触发分支从 `main` 改走**。两条 workflow 都基于 `branches: [main]`；改了会切分发布流水线。

## 历史踩坑目录

每一行都是一次真实失败。修复提交的差异是真理来源；不要回退。

| # | 坑 | 证据（修复提交） | 修复内容 |
|---|---|---|---|
| 1 | 缺失 `repository.url` 导致 `--provenance` 失败 | `694e40e` — fix(package): add repository field for npm --provenance validation | 在 `package.json` 中补上 `repository.url` 块，让 npm registry 能生成 provenance 证明。 |
| 2 | 缺失 OIDC `id-token: write` | `cc57964` — fix(ci): grant id-token write permission for npm --provenance | 给 `npm-publish.yml` 的 permissions 加上 `id-token: write`，让 `--provenance` 能签发证明 token。 |
| 3 | 构建前没有 `npm ci` | `a8088ee` — fix(ci): install deps before publish — tsup not found on runner | 插入 `npm ci` 步骤，让 `prepublishOnly` 运行时 `tsup` 能在 `node_modules/.bin` 下解析。 |
| 4 | `npm view` 检查里硬编码了错误的包名 | `c7f82ff` — fix(ci): update npm view check to match the actual package name | 把 `npm view` 守卫里的包名改为已发布的真名，幂等性恢复。 |
| 5 | 把包名 scope 设为 `@joke-lx/jc` 后又回退 | `6fb05db` — fix(package): revert name from @joke-lx/jc to je-cd | 把 scoped 变体被拒后，把包名回退到非 scoped 的 `je-cd`。 |
| 6 | 行内 tag 创建与 `release-please` 冲突 | `491ae89` — fix(ci): remove tag creation — release-please already owns this | 移除 `npm-publish.yml` 里冗余的 tag 步骤，让 `release-please` 成为唯一所有者。 |
| 7 | 放弃 `workflow_dispatch` 上发布 | `c7d3147` — ci: replace release workflow with nx-sx pattern (push to main -> tag + publish) | 用 push-to-main 模式取代手动触发的发布 workflow；幂等性与重跑安全性回归。 |

未来若出现与上表任一行类似的 bug，先读引用提交的差异——修复通常一目了然。

## 本地构建与发布

在干净 checkout 上用以下命令复刻 CI 的行为。这是端到端能匹配 CI 的全部命令。

```bash
# 1. 构建 dist 包（对应 `prepublishOnly`）
npm run build

# 2. 验证 CI 会做什么，但不实际发布
npm publish --provenance --dry-run
```

`npm run prepublishOnly`（定义在 `D:/DevProjects/my/npm/jc/package.json:17`）就是 `npm run build`；调用它等价于第 1 步。

dry-run 这一步会：

- 再跑一次 `prepublishOnly`（所以 `npm run build` 在 `npm publish` 过程中会执行两次）。
- 用带 provenance 元数据的 `--dry-run` payload 联系 npm registry。
- 在 `repository.url` 缺失、token 失效或版本冲突时大声失败。

除非你想真的推一个版本，否则**不要**在本地 clone 上跑不带 `--dry-run` 的 `npm publish`；没有 `npm view` 守卫的话，本地推送是 one-shot，不幂等。

## 跨 skill 跳转

通用的 push-to-main 工作流模板——包括规范的 `npm-publish.yml` 主体、OIDC 设置清单、secrets 引导以及验证循环——请加载 `.claude/skills/gh-action/references/npm-publish.md`。该 skill 跨 npm 包通用；本 reference 只记录本仓库特有的 `release-please` 与 `npm-publish` 职责划分、本地命名不变量以及历史踩坑。
