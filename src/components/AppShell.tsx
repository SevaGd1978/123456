import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useStore } from '../store'
import { ROLE_LABEL } from '../lib/format'

const links = [
  { to: '/app', label: 'Пульт', icon: LayoutDashboard, end: true },
  { to: '/app/orders', label: 'Журнал рейсов', icon: ClipboardList },
  { to: '/app/parties', label: 'Контрагенты', icon: Users },
  { to: '/app/fleet', label: 'Парк', icon: Truck },
  { to: '/app/documents', label: 'Документы', icon: FileText },
  { to: '/app/exchange', label: 'Обмен с 1С', icon: ArrowLeftRight },
  { to: '/app/reports', label: 'Отчёты', icon: Wallet },
  { to: '/app/improvements', label: 'Что улучшено', icon: Sparkles },
  { to: '/app/settings', label: 'Настройки', icon: Settings },
]

export function AppShell() {
  const { currentUser, logout } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const nav = (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#c8922a] font-serif text-lg text-[#14221c]">
          РО
        </div>
        <div>
          <div className="font-serif text-lg leading-none">РейсОфис</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#cbb892]">TMS экспедиции</div>
        </div>
      </div>
      <nav className="space-y-0.5 px-3 pb-4">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive ? 'bg-[#c8922a] text-[#14221c]' : 'text-[#e8dcc2] hover:bg-white/5'
              }`
            }
          >
            <l.icon size={16} />
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 px-5 py-4">
        <div className="text-sm font-semibold">{currentUser?.name}</div>
        <div className="text-xs text-[#cbb892]">{currentUser ? ROLE_LABEL[currentUser.role] : ''}</div>
        <button
          className="mt-3 inline-flex items-center gap-2 text-xs text-[#e8dcc2] hover:text-white"
          onClick={() => {
            logout()
            navigate('/')
          }}
        >
          <LogOut size={14} /> Выйти
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="no-print hidden min-h-screen flex-col bg-[#14221c] text-[#f4ead6] lg:flex">{nav}</aside>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/40" aria-label="Закрыть меню" onClick={() => setOpen(false)} />
          <aside className="relative z-50 flex h-full w-[min(280px,86vw)] flex-col bg-[#14221c] text-[#f4ead6] shadow-2xl">
            <button className="absolute right-3 top-4 text-[#e8dcc2]" onClick={() => setOpen(false)} aria-label="Закрыть">
              <X size={18} />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <main className="min-w-0">
        <div className="no-print flex items-center justify-between gap-3 border-b border-[#d9c9a4] bg-[#fffaf0] px-4 py-3 lg:hidden">
          <button
            className="rounded-xl border border-[#d7c7a2] p-2"
            onClick={() => setOpen(true)}
            aria-label="Открыть меню"
          >
            <Menu size={18} />
          </button>
          <div className="font-serif text-lg">РейсОфис</div>
          <div className="w-9" />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
