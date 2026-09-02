import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, Zap, Target, AlertCircle } from 'lucide-react'
import {
  generateInsight, regenerateInsight, getInsightHistory,
  type InsightResponse, type InsightType
} from './insightApi'

function renderContent(text: string) {
  const paragraphs = text.split('\n\n').filter(Boolean)
  return paragraphs.map((para, i) => {
    const parts = para.split('**')
    if (parts.length <= 1) {
      return <p key={i} style={{ fontSize: 13, color: '#5a6b5e', lineHeight: 1.65 }}>{para}</p>
    }
    return (
      <div key={i}>
        {parts.map((part, j) =>
          j % 2 === 1
            ? <span key={j} style={{ fontSize: 14, fontWeight: 700, color: '#111816', display: 'block', marginBottom: 2 }}>{part}</span>
            : part ? <span key={j} style={{ fontSize: 13, color: '#5a6b5e', lineHeight: 1.65 }}>{part}</span> : null
        )}
      </div>
    )
  })
}

function InsightCard({ insight, onRegenerate }: {
  insight: InsightResponse
  onRegenerate: (updated: InsightResponse) => void
}) {
  const [loading, setLoading] = useState(false)

  const from = new Date(insight.periodStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  const to = new Date(insight.periodEnd).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const dateLabel = insight.type === 'daily' ? from : `${from} – ${to}`

  async function handleRegenerate() {
    setLoading(true)
    try {
      const res = await regenerateInsight(insight.id)
      onRegenerate(res.data)
    } finally {
      setLoading(false)
    }
  }

  const firstLine = insight.content.split('\n')[0].replace(/\*\*/g, '')

  return (
    <div className="mx-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: '#dcfce7' }}>
            {insight.type === 'daily'
              ? <Zap size={15} color="#16A34A" />
              : <TrendingUp size={15} color="#16A34A" />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111816' }}>
              {insight.type === 'daily' ? 'Tagesanalyse' : 'Wochenrückblick'}
            </div>
            <div style={{ fontSize: 11, color: '#5a6b5e' }}>{dateLabel}</div>
          </div>
        </div>
        <button onClick={handleRegenerate} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: '#eef1ee', fontSize: 12, fontWeight: 600, color: '#5a6b5e' }}>
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Lädt…' : 'Neu'}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4"
        style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {firstLine && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>
              {firstLine.slice(0, 40)}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {renderContent(insight.content)}
        </div>
      </div>
    </div>
  )
}

export default function InsightsPage() {
  const [tab, setTab] = useState<InsightType>('daily')
  const [dailyInsights, setDailyInsights] = useState<InsightResponse[]>([])
  const [weeklyInsights, setWeeklyInsights] = useState<InsightResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getInsightHistory('daily'),
      getInsightHistory('weekly'),
    ]).then(([daily, weekly]) => {
      setDailyInsights(daily.data)
      setWeeklyInsights(weekly.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await generateInsight(tab)
      if (tab === 'daily') {
        setDailyInsights(prev => {
          const without = prev.filter(i => i.periodStart !== res.data.periodStart)
          return [res.data, ...without]
        })
      } else {
        setWeeklyInsights(prev => {
          const without = prev.filter(i => i.periodStart !== res.data.periodStart)
          return [res.data, ...without]
        })
      }
    } catch {
      setError('Konnte keine Analyse erstellen. Bitte erneut versuchen.')
    } finally {
      setGenerating(false)
    }
  }

  function handleRegenerate(updated: InsightResponse) {
    if (updated.type === 'daily') {
      setDailyInsights(prev => prev.map(i => i.id === updated.id ? updated : i))
    } else {
      setWeeklyInsights(prev => prev.map(i => i.id === updated.id ? updated : i))
    }
  }

  const currentInsights = tab === 'daily' ? dailyInsights : weeklyInsights

  return (
    <div className="flex flex-col pb-4">
      <div className="px-4 pt-5 pb-3">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111816' }}>KI-Insights</h1>
        <p style={{ fontSize: 13, color: '#5a6b5e' }}>Grobe Einordnung, keine exakte Auswertung</p>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex rounded-xl p-0.5" style={{ background: '#eef1ee' }}>
          {(['daily', 'weekly'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2.5 rounded-xl"
              style={{
                fontSize: 13, fontWeight: 600,
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#16A34A' : '#5a6b5e',
                transition: 'all 0.2s',
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              {t === 'daily' ? 'Täglich' : 'Wöchentlich'}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="px-4 mb-4">
        <button onClick={handleGenerate} disabled={generating}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: '#16A34A', color: '#fff', fontSize: 14, fontWeight: 700 }}>
          {generating
            ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />Analysiere…</>
            : <><Zap size={16} />{tab === 'daily' ? 'Tagesanalyse generieren' : 'Wochenrückblick generieren'}</>}
        </button>
      </div>

      {/* Context hint */}
      <div className="mx-4 mb-4 rounded-xl p-3 flex gap-2" style={{ background: '#f4f6f4' }}>
        <Target size={15} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#5a6b5e', lineHeight: 1.5 }}>
          {tab === 'daily'
            ? 'Basiert auf heutigen Mahlzeiten, Training & Zielen. Je mehr du loggst, desto besser die Analyse.'
            : 'Berücksichtigt alle Einträge der letzten 7 Tage und deine langfristigen Ziele.'}
        </p>
      </div>

      {error && (
        <div className="mx-4 mb-4 rounded-xl p-3 flex gap-2" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="px-4 py-8 text-center text-sm" style={{ color: '#5a6b5e' }}>Lade…</div>
      ) : currentInsights.length === 0 ? (
        <div className="px-4 py-10 text-center space-y-2">
          <p style={{ fontSize: 14, color: '#5a6b5e' }}>
            Noch keine {tab === 'daily' ? 'Tages' : 'Wochen'}analyse.
          </p>
          <p style={{ fontSize: 12, color: '#a0b0a5' }}>
            Logge ein paar Einträge und drücke "Generieren".
          </p>
        </div>
      ) : (
        currentInsights.map(insight => (
          <InsightCard key={insight.id} insight={insight} onRegenerate={handleRegenerate} />
        ))
      )}

      <div className="mx-4 mt-2 rounded-xl p-3 flex gap-2" style={{ background: '#fff8e1', border: '1px solid #fde68a' }}>
        <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
          "Neu" überschreibt den aktuellen Eintrag für diesen Zeitraum. Ältere Insights bleiben gespeichert.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
