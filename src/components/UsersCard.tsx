import { useState } from 'react'
import { useStore } from '../store'
import { ROLE_LABEL } from '../lib/format'
import type { Role } from '../types'
import { Btn, Card, Field, Input, Select } from './ui'

export function UsersCard() {
  const store = useStore()
  const isDirector = store.currentUser?.role === 'director'
  const [name, setName] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('dispatcher')
  const [hint, setHint] = useState('')

  return (
    <Card className="space-y-3 p-5">
      <div className="font-serif text-xl">Сотрудники</div>
      <p className="text-xs text-[#6d614c]">
        Логин и пароль для входа в кабинет. Добавить человека может только директор.
      </p>
      <ul className="space-y-2 text-sm">
        {store.users.map((u) => (
          <li key={u.id} className="flex justify-between border-b border-[#efe3c8] py-2">
            <span>
              {u.name} · {u.login}
            </span>
            <span className="text-[#6d614c]">{ROLE_LABEL[u.role]}</span>
          </li>
        ))}
      </ul>
      {isDirector ? (
        <form
          className="space-y-3 rounded-xl border border-[#efe3c8] bg-[#fffdf6] p-3"
          onSubmit={(e) => {
            e.preventDefault()
            const res = store.addEmployee({ name, login, password, role })
            if (!res.ok) {
              setHint(res.error)
              return
            }
            setHint(`Добавлен ${res.user.name}. Вход: ${res.user.login} / заданный пароль`)
            setName('')
            setLogin('')
            setPassword('')
            setRole('dispatcher')
          }}
        >
          <div className="text-sm font-semibold">Новый сотрудник</div>
          <Field label="Фамилия и имя">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Игорь Смирнов" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Логин">
              <Input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="off"
                placeholder="igor"
              />
            </Field>
            <Field label="Пароль">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="не короче 4 знаков"
              />
            </Field>
          </div>
          <Field label="Роль">
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="dispatcher">Диспетчер</option>
              <option value="accountant">Бухгалтер</option>
              <option value="director">Директор</option>
            </Select>
          </Field>
          <Btn type="submit">Добавить сотрудника</Btn>
          {hint && <p className="text-xs leading-relaxed text-[#4a4336]">{hint}</p>}
        </form>
      ) : (
        <p className="text-xs text-[#6d614c]">Чтобы завести сотрудника, войдите как директор.</p>
      )}
      <Btn tone="ghost" className="mt-1" onClick={() => store.resetDemo()}>
        Сбросить демо-базу
      </Btn>
    </Card>
  )
}
