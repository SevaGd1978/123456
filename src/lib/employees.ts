import { passwordFingerprint } from '../data/seed'
import type { Role, User } from '../types'

const ROLES: Role[] = ['director', 'dispatcher', 'accountant']

export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase()
}

export function createEmployee(
  input: { name: string; login: string; password: string; role: Role },
  existing: User[],
): { ok: true; user: User } | { ok: false; error: string } {
  const name = input.name.trim()
  const login = normalizeLogin(input.login)
  const password = input.password
  if (!name) return { ok: false, error: 'Укажите фамилию и имя' }
  if (!/^[a-z0-9._-]{3,32}$/.test(login)) {
    return { ok: false, error: 'Логин: латиница, цифры, точка или дефис, 3–32 знака' }
  }
  if (password.length < 4) return { ok: false, error: 'Пароль не короче 4 знаков' }
  if (!ROLES.includes(input.role)) return { ok: false, error: 'Выберите роль' }
  if (existing.some((u) => normalizeLogin(u.login) === login)) {
    return { ok: false, error: 'Такой логин уже есть' }
  }
  return {
    ok: true,
    user: {
      id: `u-${Date.now().toString(36)}-${login}`,
      login,
      name,
      role: input.role,
      passwordHash: passwordFingerprint(login, password),
    },
  }
}

/** Keep demo accounts and any extra employees saved in the browser. */
export function mergeUsers(seedUsers: User[], saved?: User[]): User[] {
  if (!Array.isArray(saved) || saved.length === 0) return seedUsers
  const seedLogins = new Set(seedUsers.map((u) => normalizeLogin(u.login)))
  const extras = saved.filter((u) => u?.login && !seedLogins.has(normalizeLogin(u.login)))
  const savedByLogin = new Map(saved.filter((u) => u?.login).map((u) => [normalizeLogin(u.login), u]))
  const core = seedUsers.map((u) => savedByLogin.get(normalizeLogin(u.login)) ?? u)
  return [...core, ...extras]
}
