import { describe, it, expect } from 'vitest'
import { getDiskManager } from '../../../src/shared/system/adapter'

describe('DiskManager', () => {
  it('should return disk info with at least one drive', async () => {
    const info = await getDiskManager().getInfo()
    expect(info.length).toBeGreaterThan(0)
    expect(info[0].drive).toBeTruthy()
    expect(info[0].sizeGB).toBeGreaterThan(0)
  })
})
