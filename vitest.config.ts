import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  // 让 Vite/vitest 把 .toml 当静态资产（字符串），与 tsup 的
  // loader: { '.toml': 'text' } 对齐。否则 vitest 会尝试把 builtin.toml
  // 当 JS 解析并报 "Unexpected character"。
  assetsInclude: ['**/*.toml'],
})
