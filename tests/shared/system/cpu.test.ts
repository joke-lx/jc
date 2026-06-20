import { describe, it, expect } from 'vitest'
import { getCpuManager } from '../../../src/shared/system/adapter'

describe('CpuManager', () => {
  it('should return CPU info with valid fields', async () => {
    const info = await getCpuManager().getInfo()
    expect(info.physicalCores).toBeGreaterThan(0)
    expect(info.logicalCores).toBeGreaterThan(0)
    expect(info.brand).toBeTruthy()
  })
})
