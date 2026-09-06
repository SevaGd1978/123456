import { useMemo, useRef, useState, type ReactNode, type UIEvent } from 'react'

export function VirtualTable({
  rowCount,
  rowHeight = 48,
  height = 560,
  header,
  renderRow,
}: {
  rowCount: number
  rowHeight?: number
  height?: number
  header: ReactNode
  renderRow: (index: number) => ReactNode
}) {
  const [scroll, setScroll] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const visible = Math.ceil(height / rowHeight) + 6
  const start = Math.max(0, Math.floor(scroll / rowHeight) - 2)
  const end = Math.min(rowCount, start + visible)
  const top = start * rowHeight
  const total = rowCount * rowHeight

  const rows = useMemo(() => {
    const out: ReactNode[] = []
    for (let i = start; i < end; i++) out.push(renderRow(i))
    return out
  }, [start, end, renderRow])

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    setScroll(e.currentTarget.scrollTop)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d9c9a4] bg-[#fffaf0]">
      <div className="border-b border-[#e6d7b4] bg-[#f4ead6] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d614c]">
        {header}
      </div>
      <div ref={ref} style={{ height }} className="overflow-auto" onScroll={onScroll}>
        <div style={{ height: total, position: 'relative' }}>
          <div style={{ transform: `translateY(${top}px)` }}>{rows}</div>
        </div>
      </div>
    </div>
  )
}
