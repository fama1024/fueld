import Button from './Button'

/** Sichtbarer Ladefehler, damit ein Fehler nie wie ein leerer Screen aussieht. */
export default function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-surface-1 p-3">
      <p className="text-body text-ink-soft">Das hat gerade nicht geklappt. Deine Daten sind davon nicht betroffen.</p>
      <Button variant="secondary" block onClick={onRetry}>Nochmal laden</Button>
    </div>
  )
}
