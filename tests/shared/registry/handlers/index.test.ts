import { describe, it, expect } from 'vitest'
import { NpmItemHandler } from '../../../../src/shared/registry/handlers/npm.js'
import { PyItemHandler } from '../../../../src/shared/registry/handlers/py.js'
import { ExeItemHandler } from '../../../../src/shared/registry/handlers/exe.js'
import { getHandler, ItemHandler } from '../../../../src/shared/registry/handlers/index.js'

describe('getHandler factory', () => {
  it('returns a NpmItemHandler for kind=npm', () => {
    const h = getHandler('npm')
    expect(h).toBeInstanceOf(NpmItemHandler)
    expect(h).toBeInstanceOf(ItemHandler)
  })
  it('returns a PyItemHandler for kind=py', () => {
    const h = getHandler('py')
    expect(h).toBeInstanceOf(PyItemHandler)
  })
  it('returns an ExeItemHandler for kind=exe', () => {
    const h = getHandler('exe')
    expect(h).toBeInstanceOf(ExeItemHandler)
  })
  it('throws on an unknown kind', () => {
    expect(() => getHandler('foo' as any)).toThrow(/未实现的 kind/)
  })
})
