import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export default function Segmented<T extends string>({ label, options, value, onChange, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('flex w-full gap-1 rounded-md bg-surface-1 p-1', className)}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'min-h-10 flex-1 rounded-[6px] text-caption font-semibold',
            option.value === value ? 'bg-ink text-surface-0' : 'text-ink-muted',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
