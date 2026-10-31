import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Camera, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const QUICK_ENTRY_INPUT_ID = 'quick-entry-input'

interface QuickEntryProps {
  busy?: boolean
  onSubmit: (text: string, files: File[]) => Promise<void>
}

/** Schnellster Weg zum Mahlzeit-Eintrag: ein Satz, ein Foto oder beides. */
export default function QuickEntry({ busy, onSubmit }: QuickEntryProps) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const cameraRef = useRef<HTMLInputElement>(null)
  const canSend = !busy && (text.trim().length > 0 || files.length > 0)

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!canSend) return
    await onSubmit(text.trim(), files)
    setText('')
    setFiles([])
  }

  return (
    <form onSubmit={send} className="flex min-h-14 w-full items-center gap-1 rounded-md border border-control-line bg-surface-1 py-1 pr-1 pl-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
      <input
        id={QUICK_ENTRY_INPUT_ID}
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={busy}
        placeholder={files.length ? 'Foto bereit. Noch etwas dazu?' : 'Was gab’s?'}
        aria-label="Mahlzeit beschreiben"
        className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          setFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
      <button
        type="button"
        aria-label="Foto aufnehmen"
        onClick={() => cameraRef.current?.click()}
        disabled={busy}
        className={cn('grid size-tap place-items-center rounded-md', files.length ? 'text-lime' : 'text-ink-soft')}
      >
        <Camera size={20} aria-hidden />
      </button>
      <button
        type="submit"
        aria-label="Eintragen"
        disabled={!canSend}
        className="grid size-tap place-items-center rounded-md bg-lime text-on-lime active:bg-lime-press disabled:bg-surface-2 disabled:text-ink-muted"
      >
        {busy ? <LoaderCircle size={20} className="animate-spin" aria-hidden /> : <ArrowRight size={20} aria-hidden />}
      </button>
    </form>
  )
}
