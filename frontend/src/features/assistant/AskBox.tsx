import { useEffect, useState, type FormEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import Button from '@/components/Button'
import Segmented from '@/components/Segmented'
import { todayIso } from '@/lib/date'
import { askAssistant, getAssistantMessages, type AssistantMessage, type AssistantScope } from './assistantApi'

const SCOPES = [
  { value: 'today', label: 'Heute' },
  { value: 'range7', label: '7 Tage' },
] as const

function Paragraphs({ text }: { text: string }) {
  return text.split('\n\n').filter(Boolean).map((paragraph, i) => (
    <p key={i} className="text-body text-ink-soft">{paragraph}</p>
  ))
}

/**
 * Freie Frage auf "Heute". Gewählt wird nur der Zeitraum: Profil, Essen und Training
 * gehen immer zusammen mit, damit Fragen zu beidem nicht an einem Filter scheitern.
 * Der Verlauf wird serverseitig pro Zeitraum und Tag gespeichert.
 */
export default function AskBox() {
  const date = todayIso()
  const [scope, setScope] = useState<AssistantScope>('range7')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    getAssistantMessages(scope, date)
      .then(res => setMessages(res.data))
      .catch(() => setMessages([]))
  }, [scope, date])

  async function ask(e: FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await askAssistant(q, scope, date)
      const now = new Date().toISOString()
      setMessages(prev => [
        ...prev,
        { id: `local-q-${now}`, role: 'user', content: q, createdAt: now },
        { id: `local-a-${now}`, role: 'assistant', content: res.data.answer, createdAt: now },
      ])
      setQuestion('')
      setHistoryOpen(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={ask} className="flex flex-col gap-3 rounded-lg bg-surface-1 p-4">
      <label className="flex flex-col gap-2">
        <span className="text-heading font-semibold text-ink">Frag nach</span>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') ask(e) }}
          rows={2}
          maxLength={1000}
          placeholder="Reicht mein Protein für das Training morgen?"
          className="min-h-18 w-full resize-none rounded-md border border-control-line bg-surface-0 p-3 text-base text-ink placeholder:text-ink-muted"
        />
      </label>
      <Segmented label="Zeitraum der Frage" options={SCOPES} value={scope} onChange={setScope} className="bg-surface-0" />
      <p className="text-caption text-ink-muted">Nutzt dein Profil, Essen und Training aus diesem Zeitraum.</p>
      <Button type="submit" variant="secondary" block disabled={loading || !question.trim()} className="disabled:bg-surface-2">
        {loading ? 'Denkt nach…' : 'Fragen'}
      </Button>
      {error && <p className="text-caption text-danger">Das hat gerade nicht geklappt. Nochmal versuchen?</p>}

      {messages.length > 0 && (
        <div className="border-t border-hairline pt-3">
          <button type="button" onClick={() => setHistoryOpen(open => !open)} aria-expanded={historyOpen}
            className="flex min-h-tap w-full items-center justify-between text-caption font-semibold text-ink-soft">
            Bisherige Antworten ({Math.ceil(messages.length / 2)})
            <ChevronDown size={18} className={historyOpen ? 'rotate-180' : undefined} aria-hidden />
          </button>
          {historyOpen && (
            <div className="mt-2 flex flex-col gap-2">
              {messages.map(message => message.role === 'user'
                ? <p key={message.id} className="text-body font-semibold text-ink">{message.content}</p>
                : <div key={message.id} className="mb-2 flex flex-col gap-2"><Paragraphs text={message.content} /></div>)}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
