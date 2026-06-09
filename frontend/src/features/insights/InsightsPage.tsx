import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  generateInsight, regenerateInsight, getInsightHistory,
  type InsightResponse, type InsightType
} from './insightApi'

function InsightCard({ insight, onRegenerate }: {
  insight: InsightResponse
  onRegenerate: (updated: InsightResponse) => void
}) {
  const [loading, setLoading] = useState(false)

  const from = new Date(insight.periodStart).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit',
  })
  const to = new Date(insight.periodEnd).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const label = insight.type === 'daily' ? from : `${from} – ${to}`

  async function handleRegenerate() {
    setLoading(true)
    try {
      const res = await regenerateInsight(insight.id)
      onRegenerate(res.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">{label}</span>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="text-xs font-medium text-neutral-400 hover:text-[#16A34A] disabled:opacity-50 transition-colors flex items-center gap-1">
          {loading ? (
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Neu analysieren
        </button>
      </div>
      <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{insight.content}</p>
    </div>
  )
}

type Tab = InsightType

export default function InsightsPage() {
  const [tab, setTab] = useState<Tab>('weekly')
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
    }).catch(() => {})
      .finally(() => setLoading(false))
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
      setError('Konnte keine Zusammenfassung erstellen. Bitte versuche es erneut.')
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
  const generateLabel = tab === 'daily' ? 'Tagesanalyse' : 'Wochenanalyse'

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Insights</h1>
          <p className="text-sm text-neutral-500 mt-0.5">KI-Auswertung deiner Einträge</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Erstelle…
            </span>
          ) : (
            `Neue ${generateLabel}`
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex bg-neutral-100 rounded-xl p-1">
        {(['weekly', 'daily'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
            }`}>
            {t === 'weekly' ? 'Wöchentlich' : 'Täglich'}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-400">Lade…</div>
      ) : currentInsights.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-neutral-400 text-sm">
            Noch keine {tab === 'daily' ? 'Tages' : 'Wochen'}analyse.
            Logge ein paar Einträge und erstelle deine erste Analyse.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} onRegenerate={handleRegenerate} />
          ))}
        </div>
      )}
    </div>
  )
}
