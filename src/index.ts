#!/usr/bin/env node

import { route } from './cli/router.js'

async function main() {
  const args = process.argv.slice(2)
  await route(args)
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
