import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,
  minify: false,
  bundle: true,
  platform: 'node',
  // .toml loader：import 时把 .toml 内容作为字符串打包到 dist（不再需要 fs 读 dist 外文件）。
  // 用于 src/core/toml.ts 的 `import builtinText from './builtin.toml'`，阶段 3 引入。
  loader: { '.toml': 'text' },
})
