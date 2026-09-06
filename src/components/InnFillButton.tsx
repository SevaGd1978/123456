import { useState } from 'react'
import { lookupPartyByInn, type PartyDraft } from '../lib/innLookup'
import { isValidInn } from '../lib/inn'
import { Btn } from './ui'

export function InnFillButton({
  inn,
  dadataToken,
  onFilled,
}: {
  inn: string
  dadataToken?: string
  onFilled: (draft: PartyDraft) => void
}) {
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')

  return (
    <div className="space-y-1">
      <Btn
        type="button"
        tone="ghost"
        className="w-full"
        disabled={busy || !isValidInn(inn)}
        onClick={async () => {
          setBusy(true)
          setHint('')
          try {
            const found = await lookupPartyByInn(inn, { dadataToken })
            onFilled(found.draft)
            setHint(`Подставлено: ${found.draft.name} · ${found.source}`)
          } catch (e) {
            setHint(e instanceof Error ? e.message : 'Не удалось запросить реквизиты')
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Ищем в ЕГРЮЛ…' : 'Подставить название и реквизиты по ИНН'}
      </Btn>
      {hint && <p className="text-xs leading-relaxed text-[#4a4336]">{hint}</p>}
    </div>
  )
}
