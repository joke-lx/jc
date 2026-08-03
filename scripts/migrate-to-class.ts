// scripts/migrate-to-class.ts
// 把 commandDef 从 object literal 形式转换为 class extends Command 形式。
//
// 用法：
//   tsx scripts/migrate-to-class.ts <group> [--dry-run | --apply]
//   tsx scripts/migrate-to-class.ts claude --dry-run     # 默认 dry-run
//   tsx scripts/migrate-to-class.ts happy --apply
//   tsx scripts/migrate-to-class.ts all --dry-run
//
// 设计动机：
// - 111 个 command 文件结构高度一致，适合"模板重写"而非 AST 操作。
// - 不引入 jscodeshift / ts-morph，避免额外依赖和 Windows 路径处理麻烦。
// - 默认 dry-run：输出每个文件"old → new"的伪 diff 给人工审核；apply 模式才落盘。
//
// 转换规则（按 plan 文档）：
//   1. import 顶部加 `import { Command } from '<relative path>/cli/Command.js'`
//   2. 顶层 handler 函数 → 重命名为 executeXxx（pascalCase from filename）
//   3. 顶层 handler 函数体不动（保留 import / 闭包 / 副作用）
//   4. 新增 class XxxCommand extends Command，字段来自原 commandDef：
//      - name / description 直接 copy
//      - examples / related / helpText 中所有字面 'jc' → `${this.bin}`
//      - platform 加 'as const'（如果是裸字符串）
//   5. class.method handler 转调 executeXxx
//   6. 新增 `export const commandDef = new XxxCommand()`
//   7. 新增顶层 handler 适配器：`export async function handler(args) { return commandDef.handler(args) }`
//
// 不动：
// - types.ts、router.ts、output.ts、META、cliText
// - group index 的 import 形态
// - 测试文件
// - w/proc/mem.ts 的动态 import

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, relative, dirname, sep } from 'path'

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..')
const SRC = join(ROOT, 'src', 'groups')

interface ParsedCommand {
  file: string
  relFile: string  // posix 形式
  group: 'claude' | 'happy' | 'mgr' | 'w'
  className: string
  // 解析出的字段
  name: string
  description: string
  examples?: string[]
  related?: string[]
  helpText?: string
  platform?: string
  // handler 函数体（从 export async function handler(args) {...} 抽出）
  handlerBody: string
  handlerArgName: string  // 'args' 或 '_args'
  // 文件前导（import 行 + 注释）
  preHandler: string  // import 段
  // commandDef 之后的残留（如 export { safeIsoStamp }）
  tail?: string
}

// 把文件路径转成 posix 相对路径
function posixRel(file: string): string {
  return relative(SRC, file).split(sep).join('/')
}

// 文件名 → class 名（PascalCase）
function fileToClassName(file: string): string {
  const base = file.replace(/\.ts$/, '').split(/[\\/]/).pop()!
  // 'kill' -> 'Kill'；'port-kill' -> 'PortKill'；'cp' -> 'Cp'
  return base
    .split(/[-_]/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('') + 'Command'
}

// 从 command.ts 提取 class 名（如果用户用 alias 或特殊命名）
// 当前用 fileToClassName 即可，留 hook
function inferClassName(file: string): string {
  return fileToClassName(file)
}

// 计算从 command 文件到 src/cli/Command.js 的相对 import 路径
function commandImportPath(file: string): string {
  const rel = relative(dirname(file), join(ROOT, 'src', 'cli', 'Command.js')).split(sep).join('/')
  // 确保以 ./ 开头
  return rel.startsWith('.') ? rel : './' + rel
}

// 把 examples/related/helpText 中的字面 'jc ' (canonical token) 替换为 `${this.bin} `
// 必须只匹配独立 token（前后是空白 / 行首行尾 / ; / |），不破坏 /jc/ 路径或 JC_REGISTRY_PATH
function replaceJcInString(s: string): string {
  // 行首 jc 后跟空白；或 空白 jc 后跟空白；或 ; jc 后跟空白
  return s
    .replace(/(^|[\s|;])jc(?=[\s|;]|$)/g, '$1${this.bin}')
}

// 解析一个 command 文件
function parseCommandFile(file: string): ParsedCommand | null {
  const src = readFileSync(file, 'utf-8')

  // 找 export const commandDef = { ... }
  // 处理单行 object literal 与多行都支持；用花括号配对算法而不是贪婪 regex
  const defMatchIdx = src.search(/export\s+const\s+commandDef\s*[:=]\s*\{/)
  if (defMatchIdx === -1) return null
  const { obj, braceEnd } = (() => {
    let depth = 0
    let i = src.indexOf('{', defMatchIdx)
    const startBrace = i
    for (; i < src.length; i++) {
      const c = src[i]
      if (c === "'" || c === '"' || c === '`') {
        const quote = c
        i++
        while (i < src.length && src[i] !== quote) {
          if (src[i] === '\\') i++
          i++
        }
        continue
      }
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) break
      }
    }
    if (depth !== 0) return { obj: null, braceEnd: -1 }
    return { obj: src.slice(startBrace + 1, i), braceEnd: i }
  })()
  if (obj === null) return null

  // commandDef 之后的尾部内容（如 `export { safeIsoStamp }`）——迁移时保留
  // 但如果尾部是空行/注释，丢弃以保持整洁
  const rawTail = src.slice(braceEnd + 1).trim()
  const tail = rawTail === '' ? undefined : rawTail

  // 找 export async function handler(...) { ... }
  const handlerMatch = src.match(/export\s+async\s+function\s+handler\s*\(\s*(\w+)\s*:\s*string\[\]\s*\)\s*(?::\s*Promise<void>)?\s*\{/)
  if (!handlerMatch) return null

  // 抽 handler body（从 { 后到 匹配的 } 为止）
  const handlerStart = handlerMatch.index! + handlerMatch[0].length - 1  // 指向 {
  let depth = 0
  let i = handlerStart
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) { i++; break }
    }
  }
  const handlerBody = src.slice(handlerStart + 1, i - 1)

  // 抽取字段（obj 已在前面块作用域里定义）
  const get = (key: string): string | undefined => {
    const m = obj.match(new RegExp(`\\b${key}\\s*:\\s*([^,\\n]+)`))
    if (!m) return undefined
    return m[1].trim()
  }
  const getStr = (key: string): string | undefined => {
    const v = get(key)
    return v ? v.replace(/^['"`]|['"`]$/g, '').replace(/\\'/g, "'").replace(/\\"/g, '"') : undefined
  }
  const getArray = (key: string): string[] | undefined => {
    // 匹配 ['jc mgr ...', '...'] 简单字符串数组
    const m = obj.match(new RegExp(`\\b${key}\\s*:\\s*\\[([\\s\\S]*?)\\]`))
    if (!m) return undefined
    const inner = m[1]
    const items: string[] = []
    const re = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`/g
    let mm: RegExpExecArray | null
    while ((mm = re.exec(inner)) !== null) {
      items.push(mm[1] !== undefined ? mm[1] : mm[2] !== undefined ? mm[2] : mm[3])
    }
    return items
  }
  const getHelpText = (): string | undefined => {
    // helpText 多行字符串（单引号 + 换行）；用 '...' 匹配，但 ' 内可能有 \n
    const m = obj.match(/helpText\s*:\s*'((?:\\.|[^'\\])*)'/)
    return m ? m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'") : undefined
  }
  const getPlatform = (): string | undefined => {
    const v = get('platform')
    if (!v) return undefined
    // 原文件可能是 `'win32' as const` 或裸 `'win32'`。统一剥离 as const 和引号。
    const stripped = v.replace(/\s*as\s+const\s*$/, '').replace(/^['"`]|['"`]$/g, '')
    return stripped
  }

  const rel = posixRel(file)
  const group = rel.split('/')[0] as 'claude' | 'happy' | 'mgr' | 'w'

  // 文件前导（handler 之前的所有内容）
  const preHandler = src.slice(0, handlerMatch.index!).trimEnd()

  return {
    file,
    relFile: rel,
    group,
    className: inferClassName(file),
    name: getStr('name') ?? '',
    description: getStr('description') ?? '',
    examples: getArray('examples'),
    related: getArray('related'),
    helpText: getHelpText(),
    platform: getPlatform(),
    handlerBody,
    handlerArgName: handlerMatch[1]!,
    preHandler,
    tail,
  }
}

// 生成新的文件内容
// 把字符串转成模板字符串字面量（反引号包裹）。
// 关键：${this.bin} 是合法模板插值，必须保留；其他 ` 和 ${ 转义。
function toTemplateLiteral(s: string): string {
  // 先把 ${ 转义（${this.bin} 除外——它是目标插值，但用正则保守处理：只保留 `${this.bin}`）
  // 策略：先转义所有反引号和 `${`，再把 `${this.bin}` 还原。
  const escaped = s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
  // 还原我们想要的插值 ${this.bin}
  const restored = escaped.replace(/\\\$\{this\.bin\}/g, '${this.bin}')
  return '`' + restored + '`'
}

function generateNewFile(p: ParsedCommand): string {
  const lines: string[] = []
  // 前导（import + 注释），补 Command import
  const importLine = `import { Command } from '${commandImportPath(p.file)}'`
  // 检查前导里是否已有 Command import（重复跳过）
  const preWithCmd = p.preHandler.includes('Command } from') ? p.preHandler : `${p.preHandler}\n${importLine}`

  // executeXxx 名字（class 名去掉 'Command' 后小写首字母）
  const executorName = 'execute' + p.className.replace(/Command$/, '')

  // 顶层 executor 函数（保留原 handler 函数体 + 返回类型）
  lines.push(preWithCmd)
  lines.push('')
  lines.push(`async function ${executorName}(${p.handlerArgName}: string[]): Promise<void> {`)
  lines.push(p.handlerBody)
  lines.push('}')
  lines.push('')

  // class
  lines.push(`export class ${p.className} extends Command {`)
  lines.push(`  name = ${JSON.stringify(p.name)}`)
  lines.push(`  description = ${JSON.stringify(p.description)}`)
  if (p.helpText !== undefined) {
    // 多行 helpText 用模板字符串（保留换行 + ${this.bin} 渲染）
    const replaced = replaceJcInString(p.helpText)
    lines.push(`  helpText = ${toTemplateLiteral(replaced)}`)
  }
  if (p.examples && p.examples.length > 0) {
    const arr = p.examples.map(e => toTemplateLiteral(replaceJcInString(e))).join(', ')
    lines.push(`  examples = [${arr}]`)
  }
  if (p.related && p.related.length > 0) {
    const arr = p.related.map(e => toTemplateLiteral(replaceJcInString(e))).join(', ')
    lines.push(`  related = [${arr}]`)
  }
  if (p.platform !== undefined) {
    lines.push(`  platform = '${p.platform}' as const`)
  }
  lines.push('')
  lines.push(`  async handler(${p.handlerArgName}: string[]): Promise<void> {`)
  lines.push(`    return ${executorName}(${p.handlerArgName})`)
  lines.push(`  }`)
  lines.push('}')
  lines.push('')
  lines.push(`export const commandDef = new ${p.className}()`)
  lines.push('')
  // 顶层 handler 适配器（保持现有 import { handler } 测试兼容）
  lines.push(`export async function handler(${p.handlerArgName}: string[]): Promise<void> {`)
  lines.push(`  return commandDef.handler(${p.handlerArgName})`)
  lines.push('}')
  lines.push('')
  // 保留 commandDef 之后的残留（如 export { safeIsoStamp }）
  if (p.tail) {
    lines.push(p.tail)
    lines.push('')
  }

  return lines.join('\n')
}

// 扫描指定 group 的所有 command 文件
function findCommandFiles(group: 'claude' | 'happy' | 'mgr' | 'w'): string[] {
  const groupDir = join(SRC, group)
  if (!existsSync(groupDir)) return []
  const files: string[] = []
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && entry !== 'index.ts') {
        files.push(full)
      }
    }
  }
  walk(groupDir)
  return files.sort()
}

function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const dryRun = !apply
  const groups: ('claude' | 'happy' | 'mgr' | 'w')[] = []
  for (const a of args) {
    if (a === 'claude' || a === 'happy' || a === 'mgr' || a === 'w' || a === 'all') {
      if (a === 'all') groups.push('claude', 'happy', 'mgr', 'w')
      else groups.push(a as any)
    }
  }
  if (groups.length === 0) groups.push('claude', 'happy', 'mgr', 'w')

  let totalScanned = 0
  let totalGenerated = 0
  let totalFailed = 0

  for (const group of groups) {
    const files = findCommandFiles(group)
    console.error(`\n=== group: ${group} (${files.length} files) ===`)
    for (const file of files) {
      totalScanned++
      try {
        const parsed = parseCommandFile(file)
        if (!parsed) {
          console.error(`  SKIP (no commandDef found): ${posixRel(file)}`)
          continue
        }
        const newContent = generateNewFile(parsed)
        totalGenerated++
        if (dryRun) {
          // 输出 old vs new 到 stdout
          console.log(`\n--- ${posixRel(file)} ---`)
          const old = readFileSync(file, 'utf-8').trimEnd()
          // 不打完整 diff，只打 first/last 几行 + 新内容长度
          const oldLines = old.split('\n').length
          const newLines = newContent.split('\n').length
          console.log(`old: ${oldLines} lines, new: ${newLines} lines`)
          console.log('// NEW CONTENT:')
          console.log(newContent)
        } else {
          writeFileSync(file, newContent, 'utf-8')
          console.error(`  ✓ ${posixRel(file)}`)
        }
      } catch (e) {
        totalFailed++
        console.error(`  FAIL: ${posixRel(file)} — ${(e as Error).message}`)
      }
    }
  }

  console.error(`\n=== summary ===`)
  console.error(`scanned: ${totalScanned}, generated: ${totalGenerated}, failed: ${totalFailed}`)
  console.error(`mode: ${dryRun ? 'dry-run (no files written)' : 'apply (files written)'}`)
}

main()
