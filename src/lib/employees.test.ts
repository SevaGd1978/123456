import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createSeed, passwordFingerprint } from '../data/seed.ts'
import { createEmployee, mergeUsers, normalizeLogin } from './employees.ts'
import { mergePersisted } from '../store.tsx'

describe('employees', () => {
  it('creates a dispatcher who can be looked up by login', () => {
    const seed = createSeed()
    const res = createEmployee(
      { name: 'Игорь Смирнов', login: 'Igor.S', password: 'gate1', role: 'dispatcher' },
      seed.users,
    )
    assert.equal(res.ok, true)
    if (!res.ok) return
    assert.equal(res.user.login, 'igor.s')
    assert.equal(res.user.role, 'dispatcher')
    assert.equal(res.user.passwordHash, passwordFingerprint('igor.s', 'gate1'))
  })

  it('rejects a duplicate login', () => {
    const seed = createSeed()
    const res = createEmployee(
      { name: 'Другой', login: 'director', password: 'xxxx', role: 'dispatcher' },
      seed.users,
    )
    assert.equal(res.ok, false)
    if (res.ok) return
    assert.match(res.error, /логин/i)
  })

  it('keeps extra employees after reload', () => {
    const seed = createSeed()
    const extra = createEmployee(
      { name: 'Игорь Смирнов', login: 'igor', password: 'gate1', role: 'dispatcher' },
      seed.users,
    )
    assert.equal(extra.ok, true)
    if (!extra.ok) return
    const merged = mergePersisted(seed, {
      users: [...seed.users, extra.user],
      settings: seed.settings,
    })
    assert.equal(merged.users.some((u) => u.login === 'igor'), true)
    assert.equal(merged.users.filter((u) => u.login === 'director').length, 1)
  })

  it('merges saved extras without dropping demo accounts', () => {
    const seed = createSeed()
    const extras = mergeUsers(seed.users, [
      { id: 'u-x', login: 'katya', name: 'Екатерина', role: 'accountant', passwordHash: 'x' },
    ])
    assert.ok(extras.some((u) => normalizeLogin(u.login) === 'director'))
    assert.ok(extras.some((u) => u.login === 'katya'))
  })
})
