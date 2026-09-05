import { useEffect, useState } from 'react'
import { Sparkles, Send } from 'lucide-react'
import { askAssistant, getAssistantMessages, type AssistantMessage, type AssistantScope } from './assistantApi'

const PLACEHOLDER =
  'z.B. "Reicht mein Protein heute noch?" oder "War diese Woche genug Training?"'

function scopeLabel(scope: AssistantScope, date: string | undefined, todayIso: string) {
  if (scope === 'week') return 'diese Woche'
  if (!date || date === todayIso) return 'heute'
  return new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
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
 * Freitext-Frage auf dem Dashboard, jetzt mit gespeichertem Chatverlauf statt One-Shot.
 * `scope` folgt dem aktiven Nährstoffe-Tab (Heute/Woche); bei scope="today" grenzt
 * `date` den Thread zusätzlich auf einen einzelnen Tag ein (Dashboard Tage-Navigation).
 * Folgefragen im selben Thread bekommen serverseitig den bisherigen Verlauf als Kontext.
 */
export default function AskCard({ scope, date }: { scope: AssistantScope; date?: string }) {
  const todayIso = new Date().toISOString().slice(0, 10)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setHistoryLoading(true)
    getAssistantMessages(scope, scope === 'today' ? date : undefined)
      .then((res) => setMessages(res.data))
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoading(false))
  }, [scope, date])

  async function handleAsk() {
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await askAssistant(q, scope, scope === 'today' ? date : undefined)
      setMessages((prev) => [
        ...prev,
        { id: `local-q-${Date.now()}`, role: 'user', content: q, createdAt: new Date().toISOString() },
        { id: `local-a-${Date.now()}`, role: 'assistant', content: res.data.answer, createdAt: new Date().toISOString() },
      ])
      setQuestion('')
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
      <div className="flex items-center gap-2 mb-3">
        <div
          className="rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, background: '#dcfce7' }}
        >
          <Sparkles size={15} color="#16A34A" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111816' }}>Nachfragen</div>
          <div style={{ fontSize: 11, color: '#5a6b5e' }}>
            Grobe Einschätzung zu deinen Einträgen von {scopeLabel(scope, date, todayIso)}
          </div>
        </div>
      </div>

      {!historyLoading && messages.length > 0 && (
        <div className="flex flex-col gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid #eef1ee' }}>
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} style={{ fontSize: 13, fontWeight: 600, color: '#111816' }}>{m.content}</div>
            ) : (
              <div key={m.id} className="flex flex-col gap-1.5 mb-1">{renderContent(m.content)}</div>
            ),
          )}
        </div>
      )}

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
          background: loading || !question.trim() ? '#9cc9ad' : '#16A34A',
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

      <p className="mt-3" style={{ fontSize: 10, color: '#a0b0a5' }}>
        Grobe Schätzung, keine exakten Werte
      </p>
    </div>
  )
}
