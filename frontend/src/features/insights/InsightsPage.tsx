import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, Zap, Target, AlertCircle, LineChart } from 'lucide-react'
import {
  generateInsight, regenerateInsight, getInsightHistory,
  type InsightResponse, type InsightType
} from './insightApi'
import { getMealTrend, type DayTotal } from '@/features/meals/mealApi'

type PageTab = InsightType | 'trend'

/** SVG-Linienchart im Stil des Gewichtsverlaufs im Profil – gleiche Farben/Maße. */
function CalorieChart({ entries }: { entries: DayTotal[] }) {
  if (entries.length < 2) return null

  const values = entries.map(e => e.calories)
  const minV = Math.min(...values, 0)
  const maxV = Math.max(...values, 1)
  const pad = Math.max((maxV - minV) * 0.15, 50)

  const W = 300, H = 90
  const pL = 34, pR = 8, pT = 8, pB = 20

  const xS = (i: number) => pL + (i / (entries.length - 1)) * (W - pL - pR)
  const yS = (v: number) => pT + ((maxV + pad - v) / ((maxV + pad) - Math.max(minV - pad, 0))) * (H - pT - pB)

  const pts = entries.map((e, i) => ({ x: xS(i), y: yS(e.calories) }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${H - pB} L${pts[0].x},${H - pB} Z`

  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
      <line x1={pL} x2={W - pR} y1={(pT + H - pB) / 2} y2={(pT + H - pB) / 2} stroke="#eef1ee" strokeWidth={1} />
      <text x={pL - 4} y={yS(maxV) + 3} textAnchor="end" style={{ fontSize: 9, fill: '#a0b0a5' }}>{maxV}</text>
      <text x={pL - 4} y={yS(minV) + 3} textAnchor="end" style={{ fontSize: 9, fill: '#a0b0a5' }}>{minV}</text>
      <path d={area} fill="#16A34A" opacity={0.08} />
      <path d={line} fill="none" stroke="#16A34A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill="#16A34A" />)}
      <text x={xS(0)} y={H - 4} textAnchor="start" style={{ fontSize: 8, fill: '#a0b0a5' }}>{fmt(entries[0].date)}</text>
      <text x={W - pR} y={H - 4} textAnchor="end" style={{ fontSize: 8, fill: '#a0b0a5' }}>{fmt(entries[entries.length - 1].date)}</text>
    </svg>
  )
}

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
            style={{ width: 32, height: 32, background: '#dbeafe' }}>
            {insight.type === 'daily'
              ? <Zap size={15} color="#2563EB" />
              : <TrendingUp size={15} color="#2563EB" />}
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
            <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1D4ED8' }}>
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
  const [tab, setTab] = useState<PageTab>('daily')
  const [dailyInsights, setDailyInsights] = useState<InsightResponse[]>([])
  const [weeklyInsights, setWeeklyInsights] = useState<InsightResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [trendRange, setTrendRange] = useState<7 | 30>(30)
  const [trend, setTrend] = useState<DayTotal[] | null>(null)
  const [trendLoading, setTrendLoading] = useState(false)

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

  // Verlaufs-Chart wird nur bei Bedarf geladen (Tab aufgerufen bzw. 7/30-Umschalter genutzt).
  useEffect(() => {
    if (tab !== 'trend') return
    setTrendLoading(true)
    getMealTrend(trendRange)
      .then(res => setTrend(res.data))
      .catch(() => setTrend(null))
      .finally(() => setTrendLoading(false))
  }, [tab, trendRange])

  async function handleGenerate() {
    if (tab === 'trend') return
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
          {(['daily', 'weekly', 'trend'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2.5 rounded-xl"
              style={{
                fontSize: 13, fontWeight: 600,
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#2563EB' : '#5a6b5e',
                transition: 'all 0.2s',
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              {t === 'daily' ? 'Täglich' : t === 'weekly' ? 'Wöchentlich' : 'Verlauf'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'trend' && (
        <>
          <div className="px-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChart size={16} color="#16A34A" />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111816' }}>Kalorienverlauf</h2>
            </div>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #eef1ee' }}>
              {([7, 30] as const).map(r => (
                <button key={r} onClick={() => setTrendRange(r)} style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 12px',
                  background: trendRange === r ? '#2563EB' : 'transparent',
                  color: trendRange === r ? '#fff' : '#5a6b5e',
                }}>
                  {r} Tage
                </button>
              ))}
            </div>
          </div>

          <div className="mx-4 mb-4 rounded-xl p-3 flex gap-2" style={{ background: '#f4f6f4' }}>
            <Target size={15} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#5a6b5e', lineHeight: 1.5 }}>
              Zeigt die geschätzten Tages-Kalorien der letzten {trendRange} Tage. Nur zum groben Trend – exakte Werte aus ungenauem Freitext-Input sollten nicht überinterpretiert werden.
            </p>
          </div>

          {trendLoading ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#5a6b5e' }}>Lade…</div>
          ) : !trend || trend.every(d => d.calories === 0) ? (
            <div className="px-4 py-10 text-center space-y-2">
              <p style={{ fontSize: 14, color: '#5a6b5e' }}>Noch nicht genug Daten für einen Verlauf.</p>
              <p style={{ fontSize: 12, color: '#a0b0a5' }}>Logge ein paar Mahlzeiten, dann füllt sich der Chart.</p>
            </div>
          ) : (
            <div className="mx-4 bg-white rounded-2xl p-4"
              style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <CalorieChart entries={trend} />
            </div>
          )}
        </>
      )}

      {tab !== 'trend' && (
        <>
          {/* Generate button */}
          <div className="px-4 mb-4">
            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 700 }}>
              {generating
                ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />Analysiere…</>
                : <><Zap size={16} />{tab === 'daily' ? 'Tagesanalyse generieren' : 'Wochenrückblick generieren'}</>}
            </button>
          </div>

          {/* Context hint */}
          <div className="mx-4 mb-4 rounded-xl p-3 flex gap-2" style={{ background: '#f4f6f4' }}>
            <Target size={15} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} />
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
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
