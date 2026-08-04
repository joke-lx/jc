// src/shared/meta.ts
// 整个工具的"标识元数据"——集中所有跨模块共享的字面常量。
//
// 设计动机：
// - 'jc' / 'JC_' / 'je-cd' 这些字面原本散落在 output.ts / launcher.ts / paths.ts 里。
//   改一处要 grep 全仓库，且容易漏（比如上次 helpText 没走 cliText 漏了就是例子）。
// - 集中后，改工具品牌 / 改 env 前缀 = 只改这个文件。
//
// 设计原则：
// - 不包含动态值（运行时从 config/env 解析的）。这些走 src/shared/config/store.ts。
// - 不包含跨版本兼容的字段（如 jcVersion）。这些保留在它们各自的 schema 定义里。
// - 不引用业务逻辑（chalk / fs / path）。这是纯字面常量。
// - 不引入循环依赖：meta.ts 不 import 任何 src/shared/* 业务模块。
//
// 模块结构：单一 META 对象 + `as const`。访问走 META.binaryName 而不是 destructured const，
// 这样 IDE 跳转和重构更稳。
export const META = {
  // 用户在终端敲的入口名（npm package.json 的 bin key）。
  // cname 改造让用户可以给这个起别名（如 bb），但 canonical 仍是这个。
  // cliText() 和 launcher 的 which/where 探测都用这个字面。
  binaryName: 'jc',

  // 数据目录的 basename（registry.json / config.json 所在目录）。
  // 用户配的 CLI 别名不影响这个——数据目录跟工具自身绑定，不跟入口名绑定。
  // 'jc' 是历史值；改它需要考虑旧用户的迁移，所以一般情况下不要改。
  dataDirName: 'jc',

  // 环境变量前缀。所有 JC_* env 拼这个。
  // 这是公开 API（用户和 CI 已可能依赖），改名需要 deprecation 周期。
  envPrefix: 'JC_',

  // npm 包名。与 binaryName 独立——npm 包叫 je-cd，但 bin 叫 jc。
  // 当前 src 内没有地方引用（package.json 里），但放在这里便于以后迁移。
  packageName: 'je-cd',
} as const

// 渲染层占位符：metadata 里代表"当前 CLI 名"的槽位。
// 在 examples / helpText / related 里写 `{cli}`，渲染时由 cliText() 替换成
// 当前配置名（默认 'jc'，用户配 JC_CLI_NAME=bb 时变 'bb'）。
// 为什么用独立占位符而非 canonical 名：metadata 可能进入 TOML（纯数据，无插值），
// `{cli}` 让 TS 类（${this.bin} 求值成 {cli}）和 TOML 记录共用同一渲染出口。
// 漏过 cliText() 的字段会显示字面 `{cli}`——响亮失败，一眼是 bug。
export const CLI_TOKEN = '{cli}'
