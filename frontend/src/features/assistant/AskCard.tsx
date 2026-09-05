import { useEffect, useState } from 'react'
import { Sparkles, Send, ChevronDown } from 'lucide-react'
import { askAssistant, getAssistantMessages, type AssistantMessage, type AssistantScope } from './assistantApi'

const PLACEHOLDER =
  'z.B. "Reicht mein Protein heute noch?" oder "War diese Woche genug Training?"'

function dayLabel(date: string, todayIso: string) {
  if (date === todayIso) return 'heute'
  return new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function scopeLabel(scope: AssistantScope, date: string, todayIso: string) {
  const day = dayLabel(date, todayIso)
  return scope === 'range7' ? `den letzten 7 Tagen bis ${day}` : day
}

function renderContent(text: string) {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((para, i) => (
      <p key={i} style={{ fontSize: 13, color: '#5a6b5e', lineHeight: 1.6 }}>
        {para}
      </p>
    ))
}

/**
 * Freitext-Frage auf dem Dashboard mit gespeichertem Chatverlauf. `scope` wird per
 * Toggle innerhalb der Karte gewählt (nur der Tag aus `date` oder die 7 Tage bis
 * einschließlich `date`) – unabhängig vom Heute/Woche-Tab der Nährstoff-Ringe.
 * `date` ist der Tag aus der Dashboard Tage-Navigation, Default heute. Bisherige
 * Antworten liegen standardmäßig eingeklappt unter einem Akkordion.
 */
export default function AskCard({ date }: { date?: string }) {
  const todayIso = new Date().toISOString().slice(0, 10)
  const activeDate = date ?? todayIso

  const [scope, setScope] = useState<AssistantScope>('today')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setHistoryLoading(true)
    setHistoryOpen(false)
    getAssistantMessages(scope, activeDate)
      .then((res) => setMessages(res.data))
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoading(false))
  }, [scope, activeDate])

  async function handleAsk() {
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await askAssistant(q, scope, activeDate)
      setMessages((prev) => [
        ...prev,
        { id: `local-q-${Date.now()}`, role: 'user', content: q, createdAt: new Date().toISOString() },
        { id: `local-a-${Date.now()}`, role: 'assistant', content: res.data.answer, createdAt: new Date().toISOString() },
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
    <div
      className="mx-4 bg-white rounded-2xl p-4"
      style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: '#dbeafe' }}
          >
            <Sparkles size={15} color="#2563EB" />
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111816' }}>Nachfragen</div>
            <div style={{ fontSize: 11, color: '#5a6b5e' }} className="truncate">
              Grobe Einschätzung zu {scopeLabel(scope, activeDate, todayIso)}
            </div>
          </div>
        </div>

        <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid #eef1ee' }}>
          {([
            { v: 'today', label: 'Tag' },
            { v: 'range7', label: '7 Tage' },
          ] as const).map(({ v, label }) => (
            <button key={v} type="button" onClick={() => setScope(v)} style={{
              fontSize: 11, fontWeight: 600, padding: '4px 8px',
              background: scope === v ? '#2563EB' : 'transparent',
              color: scope === v ? '#fff' : '#5a6b5e',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleAsk()
        }}
        placeholder={PLACEHOLDER}
        rows={2}
        maxLength={1000}
        className="w-full rounded-xl px-3 py-2 resize-none"
        style={{ border: '1px solid #eef1ee', fontSize: 13, color: '#111816', outline: 'none' }}
      />

      <button
        onClick={handleAsk}
        disabled={loading || !question.trim()}
        className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white"
        style={{
          background: loading || !question.trim() ? '#93c5fd' : '#2563EB',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <Send size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        {loading ? 'Denkt nach…' : messages.length > 0 ? 'Nachfragen' : 'Fragen'}
      </button>

      {error && (
        <p className="mt-3" style={{ fontSize: 12, color: '#b91c1c' }}>
          Das hat gerade nicht geklappt. Nochmal versuchen?
        </p>
      )}

      {!historyLoading && messages.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #eef1ee' }}>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#5a6b5e' }}>
              Bisherige Antworten ({Math.ceil(messages.length / 2)})
            </span>
            <ChevronDown
              size={14}
              color="#5a6b5e"
              style={{ transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </button>

          {historyOpen && (
            <div className="flex flex-col gap-2 mt-3">
              {messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} style={{ fontSize: 13, fontWeight: 600, color: '#111816' }}>{m.content}</div>
                ) : (
                  <div key={m.id} className="flex flex-col gap-1.5 mb-1">{renderContent(m.content)}</div>
                ),
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-3" style={{ fontSize: 10, color: '#a0b0a5' }}>
        Grobe Schätzung, keine exakten Werte
      </p>
    </div>
  )
}
