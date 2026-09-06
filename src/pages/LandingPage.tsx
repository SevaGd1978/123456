import { Link } from 'react-router-dom'
import { ArrowRight, Lock, MonitorOff, Scale, FileCode2, Gauge, Globe } from 'lucide-react'

const fixes = [
  {
    icon: Lock,
    title: 'Секреты больше не в config.ini',
    text: 'Пароли БД и FTP в открытом текстовом файле рядом с программой — это готовая утечка. В РейсОфисе нет файла с паролями сервера; вход только у пользователей.',
  },
  {
    icon: Globe,
    title: 'Браузер вместо Windows-клиента',
    text: 'Десктоп 2015 года и платный «интернет-сервер» на shared-хостинге не нужны. Журнал, заказ и обмен с 1С открываются с любого устройства.',
  },
  {
    icon: Scale,
    title: 'Вес — только с единицей измерения',
    text: 'Эвристика «если меньше 100, значит тонны» ломает ЭТрН. Здесь тонны и килограммы выбираются явно.',
  },
  {
    icon: Gauge,
    title: 'Журнал на тысячи строк',
    text: 'Список из 1800 рейсов рисуется виртуальным окном: на экране только видимые строки, поиск по ИНН не отваливается.',
  },
  {
    icon: FileCode2,
    title: '1С через файл, который вы сами сохраняете',
    text: 'Не C:/1C_DOC_TT.xml на диске диспетчера, а UTF-8 выгрузка с предпросмотром, сроком оплаты и ставкой НДС 22%.',
  },
  {
    icon: MonitorOff,
    title: 'НДС считается в копейках',
    text: 'Ставка 22% и маржа — целые копейки, без плавающей точки, которая годами чинилась патчами.',
  },
]

export function LandingPage() {
  return (
    <div className="waybill-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#14221c] font-serif text-[#e4b45a]">РО</div>
          <div>
            <div className="font-serif text-xl">РейсОфис</div>
            <div className="text-xs uppercase tracking-[0.16em] text-[#6d614c]">разбор TMS и рабочий прототип</div>
          </div>
        </div>
        <Link
          to="/login"
          className="rounded-xl bg-[#14221c] px-4 py-2.5 text-sm font-semibold text-[#f7f1e4]"
        >
          Войти в кабинет
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-8 pt-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a33b24]">Аудит, не клон</p>
          <h1 className="stamp mt-3 max-w-3xl text-4xl leading-[1.1] text-[#14221c] sm:text-5xl">
            Как улучшить программу экспедиции — и сразу попробовать другой подход
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[#4a4336]">
            По лицензии, журналу обновлений и файлам настроек видно, где десктопный TMS ломается: секреты,
            кодировки, эвристики веса, обмен с 1С через пути Windows и списки на 5000 строк. РейсОфис — это
            разбор этих мест и работающий веб-кабинет логиста.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#c8922a] px-5 py-3 font-semibold text-[#161410]"
            >
              Открыть журнал рейсов <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-[#d7c7a2] px-5 py-3 font-semibold">
              Сначала войти как диспетчер
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-[#d9c9a4] bg-[#fffaf0] p-6 shadow-[0_20px_50px_rgba(20,34,28,0.08)]">
          <div className="text-xs uppercase tracking-[0.16em] text-[#6d614c]">Что было в поставке</div>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed">
            <li>config.ini — логин, пароль MySQL и FTP одной строкой.</li>
            <li>Обмен с 1С — жёсткие пути C:/1C_CLT_TT.xml.</li>
            <li>Innovations.txt — CP1251 и годы патчей ЭПД / НДС / списков.</li>
            <li>Лицензия — запрет изучать и менять код, демо на 10 заказов.</li>
            <li>Интернет-сервер — shared-хостинг с паролем в PDF.</li>
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {fixes.map((f) => (
          <article key={f.title} className="rounded-2xl border border-[#d9c9a4] bg-[#fffaf0]/90 p-5">
            <f.icon className="text-[#c8922a]" size={22} />
            <h2 className="mt-3 font-serif text-xl">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#4a4336]">{f.text}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
