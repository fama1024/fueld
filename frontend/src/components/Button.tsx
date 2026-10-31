import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const VARIANTS = {
  primary: 'bg-lime text-on-lime active:bg-lime-press',
  secondary: 'border-control-line text-ink active:bg-surface-2',
  ghost: 'text-ink-soft active:bg-surface-1',
  danger: 'text-danger active:bg-surface-1',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
  block?: boolean
}

export default function Button({ variant = 'primary', block, type = 'button', className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-tap items-center justify-center gap-2 rounded-md border border-transparent px-4 text-body font-semibold',
        VARIANTS[variant],
        'disabled:border-transparent disabled:bg-surface-1 disabled:text-ink-muted',
        block && 'w-full',
        className,
      )}
      {...props}
    />
  )
}
