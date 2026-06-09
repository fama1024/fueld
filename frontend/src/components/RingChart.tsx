interface RingChartProps {
  value: number
  goal: number
  color: string
  label: string
  unit: string
  size?: number
}

export default function RingChart({ value, goal, color, label, unit, size = 88 }: RingChartProps) {
  const strokeWidth = size * 0.1
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(1, value / goal) : 0
  const dash = pct * circumference

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          {pct > 0 && (
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-neutral-800">
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
      <p className="text-xs font-medium text-neutral-600 text-center">{label}</p>
      <p className="text-xs text-neutral-400 text-center">
        {value}&thinsp;/&thinsp;{goal}{unit}
      </p>
    </div>
  )
}
