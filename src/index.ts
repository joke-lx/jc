#!/usr/bin/env node

async function main() {
  console.log('jc: j 命令套件')
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
