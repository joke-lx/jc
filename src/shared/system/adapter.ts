import { WinProcessManager } from './process.js'
import type { ProcessManager } from './process.js'

export function getProcessManager(): ProcessManager {
  // For now, use same implementation across platforms
  // Platform-specific optimizations can be added later
  return new WinProcessManager()
}
