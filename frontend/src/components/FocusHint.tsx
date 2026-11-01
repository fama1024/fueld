interface FocusHintProps {
  summary: string
  steps?: string[]
  /** Woran sich der Fokus ausrichtet, zum Beispiel Ziel und Ernährungsweise */
  subtitle?: string
  loading?: boolean
}

/** Eine Kernaussage und konkrete Schritte. Zeigt eine Richtung, keine Bewertung des Gegessenen. */
export default function FocusHint({ summary, steps = [], subtitle, loading }: FocusHintProps) {
  return (
    <section aria-label="Fokus" className="flex w-full flex-col gap-3 rounded-lg bg-surface-1 p-4">
      <div>
        <h2 className="text-heading font-semibold text-ink">Dein Fokus</h2>
        {subtitle && <p className="text-caption text-ink-muted">{subtitle}</p>}
      </div>
      {loading ? (
        <p className="text-body text-ink-muted">Wird eingeordnet…</p>
      ) : (
        <>
          <p className="text-body text-ink">{summary}</p>
          {steps.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-caption font-semibold text-ink-muted">Für die nächsten Tage</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-ink-soft marker:text-lime">
                {steps.map(step => <li key={step}>{step}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
