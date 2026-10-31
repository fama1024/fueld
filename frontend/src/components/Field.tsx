import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const CONTROL = 'w-full rounded-md border border-control-line bg-surface-1 px-3 text-base text-ink placeholder:text-ink-muted'

function Wrapper({ label, hint, error, className, children }: {
  label: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn('flex w-full flex-col gap-1', className)}>
      <span className="text-label font-medium text-ink-muted">{label}</span>
      {children}
      {error
        ? <span className="text-caption text-danger">{error}</span>
        : hint && <span className="text-caption text-ink-muted">{hint}</span>}
    </label>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

/** Schrift bleibt bewusst 16px, damit Mobile-Browser beim Fokus nicht ins Feld zoomen. */
export default function Field({ label, hint, error, className, ...props }: FieldProps) {
  return (
    <Wrapper label={label} hint={hint} error={error} className={className}>
      <input className={cn(CONTROL, 'min-h-tap')} aria-invalid={!!error || undefined} {...props} />
    </Wrapper>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export function TextArea({ label, hint, error, className, ...props }: TextAreaProps) {
  return (
    <Wrapper label={label} hint={hint} error={error} className={className}>
      <textarea className={cn(CONTROL, 'min-h-20 resize-none py-3')} aria-invalid={!!error || undefined} {...props} />
    </Wrapper>
  )
}
