import { useStore } from '../store'
import { Btn, Card } from '../components/ui'
import { ROLE_LABEL, formatDate } from '../lib/format'

export function SettingsPage() {
  const { users, settings, parties, audit, resetDemo } = useStore()
  const company = parties.find((p) => p.id === settings.companyId)

  return (
    <div className="space-y-4 p-6">
      <h1 className="stamp text-3xl">Настройки</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="font-serif text-xl">Фирма</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-[#6d614c]">Наименование</dt>
              <dd className="font-semibold">{company?.name}</dd>
            </div>
            <div>
              <dt className="text-[#6d614c]">ИНН / КПП</dt>
              <dd className="font-mono">
                {company?.inn} / {company?.kpp}
              </dd>
            </div>
            <div>
              <dt className="text-[#6d614c]">Ид. ЭДО / ЭПД</dt>
              <dd>
                {company?.edoId} · {company?.epdId}
              </dd>
            </div>
            <div>
              <dt className="text-[#6d614c]">НДС по умолчанию</dt>
              <dd>{settings.defaultVat}%</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-xl bg-[#f4ead6] p-3 text-xs leading-relaxed text-[#4a4336]">
            Строки Connection= / Password= в ini больше не используются. Если такие файлы ещё лежат на рабочих
            компьютерах — смените пароль базы и FTP на хостинге: они уже попадали в открытые документы.
          </p>
        </Card>
        <Card className="p-5">
          <div className="font-serif text-xl">Пользователи</div>
          <ul className="mt-3 space-y-2 text-sm">
            {users.map((u) => (
              <li key={u.id} className="flex justify-between border-b border-[#efe3c8] py-2">
                <span>
                  {u.name} · {u.login}
                </span>
                <span className="text-[#6d614c]">{ROLE_LABEL[u.role]}</span>
              </li>
            ))}
          </ul>
          <Btn tone="ghost" className="mt-4" onClick={() => resetDemo()}>
            Сбросить демо-базу
          </Btn>
        </Card>
      </div>
      <Card className="p-5">
        <div className="font-serif text-xl">Журнал действий</div>
        <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
          {audit.map((a) => (
            <li key={a.id} className="flex justify-between gap-3 border-b border-[#efe3c8] py-2">
              <span>
                <b>{a.user}</b> — {a.action}
              </span>
              <span className="shrink-0 text-xs text-[#6d614c]">{formatDate(a.at.slice(0, 10))}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
