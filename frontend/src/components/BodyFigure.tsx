import { describeLoads, type MuscleGroup, type MuscleLoad } from '@/features/sport/muscles'
import { cn } from '@/lib/utils'

interface Shape {
  x: number
  y: number
  w: number
  h: number
  r: number
}

type Regions = Partial<Record<MuscleGroup, Shape[]>>

const pair = (left: Shape): Shape[] => [left, { ...left, x: 100 - left.x - left.w }]

const SHOULDERS = pair({ x: 14, y: 42, w: 16, h: 16, r: 8 })
const CALVES = pair({ x: 32, y: 162, w: 15, h: 42, r: 7 })

const FRONT: Regions = {
  shoulders: SHOULDERS,
  chest: pair({ x: 31, y: 52, w: 18, h: 18, r: 7 }),
  core: [{ x: 36, y: 73, w: 28, h: 33, r: 8 }],
  biceps: pair({ x: 15, y: 60, w: 12, h: 30, r: 5 }),
  quads: pair({ x: 31, y: 112, w: 17, h: 44, r: 8 }),
  calves: CALVES,
}

const BACK: Regions = {
  shoulders: SHOULDERS,
  back: [{ x: 31, y: 50, w: 38, h: 46, r: 10 }],
  triceps: pair({ x: 15, y: 58, w: 12, h: 32, r: 5 }),
  glutes: pair({ x: 31, y: 98, w: 18, h: 22, r: 9 }),
  hamstrings: pair({ x: 31, y: 124, w: 18, h: 36, r: 8 }),
  calves: CALVES,
}

function Silhouette() {
  return (
    <g className="fill-surface-2">
      <circle cx="50" cy="18" r="12" />
      <rect x="44" y="28" width="12" height="12" />
      <rect x="28" y="40" width="44" height="72" rx="14" />
      <rect x="14" y="42" width="15" height="72" rx="7" />
      <rect x="71" y="42" width="15" height="72" rx="7" />
      <rect x="30" y="108" width="19" height="106" rx="9" />
      <rect x="51" y="108" width="19" height="106" rx="9" />
    </g>
  )
}

function View({ regions, levels, x }: { regions: Regions; levels: Map<MuscleGroup, MuscleLoad['level']>; x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <Silhouette />
      {(Object.entries(regions) as [MuscleGroup, Shape[]][]).map(([group, shapes]) => {
        const level = levels.get(group)
        if (!level) return null
        return shapes.map((shape, index) => (
          <rect key={`${group}-${index}`} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r}
            className={cn(level === 'primary' ? 'fill-lime' : 'fill-lime/35')} />
        ))
      })}
    </g>
  )
}

/**
 * Schlichte Körpersilhouette von vorne und hinten, beanspruchte Muskelgruppen leuchten in `lime`
 * (Hauptbelastung kräftig, Nebenbelastung blass). Die Bedeutung hängt nie nur an der Farbe:
 * Der Screen nennt die Gruppen zusätzlich als Text.
 */
export default function BodyFigure({ loads, className }: { loads: MuscleLoad[]; className?: string }) {
  const levels = new Map<MuscleGroup, MuscleLoad['level']>()
  for (const load of loads) {
    if (levels.get(load.group) !== 'primary') levels.set(load.group, load.level)
  }
  const { primary, secondary, wholeBody } = describeLoads(loads)
  const label = wholeBody
    ? 'Beanspruchte Muskeln: Ganzkörper'
    : `Beanspruchte Muskeln. Hauptsächlich: ${primary.join(', ') || 'keine'}. Zusätzlich: ${secondary.join(', ') || 'keine'}.`

  return (
    <svg role="img" aria-label={label} viewBox="0 0 220 236" className={cn('mx-auto block h-auto w-full max-w-64', className)}>
      <View regions={FRONT} levels={levels} x={0} />
      <View regions={BACK} levels={levels} x={120} />
      <text x="50" y="232" textAnchor="middle" className="fill-ink-muted text-[11px]">Vorne</text>
      <text x="170" y="232" textAnchor="middle" className="fill-ink-muted text-[11px]">Hinten</text>
    </svg>
  )
}
