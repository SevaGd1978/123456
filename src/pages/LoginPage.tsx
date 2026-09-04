import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { DEMO_PASSWORDS } from '../data/seed'
import { Btn, Field, Input } from '../components/ui'

export function LoginPage() {
  const { login, session } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState('dispatcher')
  const [password, setPassword] = useState(DEMO_PASSWORDS.dispatcher)
  const [error, setError] = useState('')

  if (session) return <Navigate to="/app" replace />

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form
        className="w-full max-w-md rounded-3xl border border-[#d9c9a4] bg-[#fffaf0] p-8 shadow-[0_24px_60px_rgba(20,34,28,0.12)]"
        onSubmit={(e) => {
          e.preventDefault()
          const err = login(name, password)
          if (err) setError(err)
          else navigate('/app')
        }}
      >
        <div className="font-serif text-3xl">Вход в РейсОфис</div>
        <p className="mt-2 text-sm text-[#6d614c]">
          Пароли демо-ролей показаны ниже — они не лежат в ini рядом с базой.
        </p>
        <div className="mt-6 space-y-4">
          <Field label="Логин">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" />
          </Field>
          <Field label="Пароль">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
        </div>
        {error && <div className="mt-3 text-sm text-[#a33b24]">{error}</div>}
        <Btn className="mt-6 w-full" type="submit">
          Войти
        </Btn>
        <div className="mt-6 space-y-1 rounded-xl bg-[#f4ead6] p-4 font-mono text-xs text-[#4a4336]">
          <div>director / {DEMO_PASSWORDS.director}</div>
          <div>dispatcher / {DEMO_PASSWORDS.dispatcher}</div>
          <div>accountant / {DEMO_PASSWORDS.accountant}</div>
        </div>
        <Link to="/" className="mt-4 inline-block text-sm text-[#6d614c]">
          ← На лендинг
        </Link>
      </form>
    </div>
  )
}
