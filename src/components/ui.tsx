import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-[#d9c9a4] bg-[#fffaf0]/90 shadow-[0_12px_30px_rgba(20,34,28,0.06)] ${className}`}>
      {children}
    </div>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d614c]">
      {children}
    </label>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-[#d7c7a2] bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-[#c8922a] focus:ring-2 focus:ring-[#e4b45a]/40'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-24 ${props.className ?? ''}`} />
}

export function Btn({
  children,
  tone = 'gold',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'gold' | 'moss' | 'ghost' | 'danger'
}) {
  const tones = {
    gold: 'bg-[#c8922a] text-[#161410] hover:bg-[#d9a441]',
    moss: 'bg-[#14221c] text-[#f7f1e4] hover:bg-[#1d3329]',
    ghost: 'bg-transparent text-ink border border-[#d7c7a2] hover:bg-white',
    danger: 'bg-[#a33b24] text-white hover:bg-[#8c301c]',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${tones[tone]} ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const map: Record<string, string> = {
    draft: 'bg-[#eee4cc] text-[#6d614c]',
    confirmed: 'bg-[#e4eef8] text-[#2a4d6e]',
    loading: 'bg-[#f6e2c4] text-[#8a5a12]',
    in_transit: 'bg-[#dcefe6] text-[#1f5b43]',
    unloading: 'bg-[#e8e0f4] text-[#4d3a72]',
    delivered: 'bg-[#d9f0d6] text-[#215c28]',
    invoiced: 'bg-[#f8e7c8] text-[#7a5110]',
    paid: 'bg-[#d4f0e4] text-[#14604a]',
    cancelled: 'bg-[#f3d6d0] text-[#8a2f1e]',
    free: 'bg-[#d9f0d6] text-[#215c28]',
    busy: 'bg-[#f6e2c4] text-[#8a5a12]',
    repair: 'bg-[#f3d6d0] text-[#8a2f1e]',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-[#eee4cc]'}`}>
      {label ?? status}
    </span>
  )
}
