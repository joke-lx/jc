---
name: jc-development
description: 在新增、修改、测试或评审 `jc` CLI 及其命令时使用。本 skill 只路由到开发相关的 reference；通用发布流程由 `gh-action` skill 覆盖。
---

为 `jc` CLI 提供 references-first 的开发防腐指导；通用 push-to-main 发布模式请加载 `gh-action` skill。

| 触发场景 | Reference | 路径 | 说明 |
|---|---|---|---|
| 打开任何开发任务；需要了解项目身份与文件结构 | [[project-map]] | references/project-map.md | 先读这一份。 |
| 新增、修改或评审 `commandDef`、组、分类、路由、帮助或输出 | [[routing-and-command-authoring]] | references/routing-and-command-authoring.md | 内容最多的一份。 |
| 涉及子进程执行、Shell、信号、平台门禁、退出码或破坏性操作 | [[execution-safety-and-platforms]] | references/execution-safety-and-platforms.md | 横切风险 reference。 |
| 涉及 `src/shared/system/**`、新增系统资源，或对调用系统信息的命令做单元测试 | [[system-adapters]] | references/system-adapters.md | 模拟 adapter 工厂，而非底层库。 |
| 新增测试、修改测试或在 CI/本地断言新行为 | [[testing-and-verification]] | references/testing-and-verification.md | 项目未配置 lint、format、coverage 与 `tsc --noEmit`。 |
| 修改 workflow、排查发布失败，或为新维护者讲解发布流程 | [[release-and-publishing]] | references/release-and-publishing.md | 通用模式请同时加载 `.claude/skills/gh-action/references/npm-publish.md`。 |
| 评审 PR，或在提 PR 前做自检 | [[review-checklist-and-examples]] | references/review-checklist-and-examples.md | 交叉参考汇总，仅在评审时加载。 |
| 涉及 `jc mgr` 组的注册、别名、迁移与跨设备同步；需要了解 XDG 注册表位置、item schema、cname 别名机制或 `confirm()` helper | [[registry-and-managed-items]] | references/registry-and-managed-items.md | 与现有 reference 互补。 |

按当前任务匹配触发条件加载对应 reference；不要加载集合之外的 reference。
