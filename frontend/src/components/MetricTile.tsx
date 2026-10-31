import type { ReactNode } from 'react'

export default function MetricTile({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="min-w-0 rounded-md bg-surface-1 p-3">
      <div className="text-label font-medium text-ink-muted">{label}</div>
      <div className="mt-1 text-metric font-semibold text-ink">{value}</div>
      {note && <div className="mt-1 text-caption text-ink-muted">{note}</div>}
    </div>
  )
}
