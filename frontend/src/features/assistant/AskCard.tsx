import { useState } from 'react'
import { Sparkles, Send } from 'lucide-react'
import { askAssistant, type AssistantScope } from './assistantApi'

const SCOPE_LABEL: Record<AssistantScope, string> = {
  today: 'heute',
  week: 'diese Woche',
}

const PLACEHOLDER =
  'z.B. "Reicht mein Protein heute noch?" oder "War diese Woche genug Training?"'

/** sessionStorage – Frage + Antwort bleiben bei Tab-Wechsel erhalten, wie bei der Pantry-Analyse. */
const SS_QUESTION = 'assistant.question'
const SS_ANSWER = 'assistant.answer'
const SS_ANSWER_SCOPE = 'assistant.answerScope'

function renderAnswer(text: string) {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((para, i) => (
      <p key={i} style={{ fontSize: 13, color: '#5a6b5e', lineHeight: 1.65 }}>
        {para}
      </p>
    ))
}

/**
 * Freitext-Frage auf dem Dashboard. `scope` folgt dem aktiven Nährstoffe-Tab
 * (Heute / Woche) – der passende Zeitraum an Log-Einträgen geht als Kontext mit.
 * One-Shot: keine Rückfragen, kein Verlauf.
 */
export default function AskCard({ scope }: { scope: AssistantScope }) {
  const [question, setQuestion] = useState(() => sessionStorage.getItem(SS_QUESTION) ?? '')
  const [answer, setAnswer] = useState(() => sessionStorage.getItem(SS_ANSWER) ?? '')
  const [answerScope, setAnswerScope] = useState<AssistantScope>(
    () => (sessionStorage.getItem(SS_ANSWER_SCOPE) as AssistantScope) ?? 'today',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleAsk() {
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await askAssistant(q, scope)
      setAnswer(res.data.answer)
      setAnswerScope(res.data.scope)
      sessionStorage.setItem(SS_QUESTION, q)
      sessionStorage.setItem(SS_ANSWER, res.data.answer)
      sessionStorage.setItem(SS_ANSWER_SCOPE, res.data.scope)
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
            Grobe Einschätzung zu deinen Einträgen von {SCOPE_LABEL[scope]}
          </div>
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
          background: loading || !question.trim() ? '#9cc9ad' : '#16A34A',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <Send size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        {loading ? 'Denkt nach…' : 'Fragen'}
      </button>

      {error && (
        <p className="mt-3" style={{ fontSize: 12, color: '#b91c1c' }}>
          Das hat gerade nicht geklappt. Nochmal versuchen?
        </p>
      )}

      {answer && !error && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #eef1ee' }}>
          <div className="flex flex-col gap-2">{renderAnswer(answer)}</div>
          <p className="mt-2" style={{ fontSize: 10, color: '#a0b0a5' }}>
            Bezogen auf {SCOPE_LABEL[answerScope]} · grobe Schätzung, keine exakten Werte
          </p>
        </div>
      )}
    </div>
  )
}
