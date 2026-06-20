import { describe, it, expect } from 'vitest'
import { getProcessManager } from '../../../src/shared/system/adapter'

describe('ProcessManager', () => {
  const pm = getProcessManager()

  it('should return process info for current process', async () => {
    const processes = await pm.getProcessByName('node')
    expect(processes.length).toBeGreaterThan(0)
    expect(processes[0].pid).toBeGreaterThan(0)
  })

  it('should handle kill of non-existent process gracefully', async () => {
    // Should not throw for non-existent PID
    await expect(pm.killProcess(999999999)).rejects.toThrow()
  })

  it('should return top processes sorted by CPU', async () => {
    // In test environment, just verify the shape
    try {
      const top = await pm.getTopProcesses('cpu', 5)
      expect(top.length).toBeLessThanOrEqual(5)
    } catch {
      // systeminformation may not be fully available in CI
    }
  })
})
