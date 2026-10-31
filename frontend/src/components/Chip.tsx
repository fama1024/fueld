import type { ButtonHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
}

export default function Chip({ selected, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      className={cn(
        'inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-caption font-medium',
        selected ? 'border-lime bg-lime text-on-lime' : 'border-control-line text-ink-soft',
        className,
      )}
      {...props}
    >
      {selected && <Check size={14} aria-hidden />}
      {children}
    </button>
  )
}
