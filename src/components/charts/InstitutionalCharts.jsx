import './InstitutionalCharts.css'
import { useId, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatParticipantCount } from '../../utils/metricFormatters'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const formatDateLabel = (value) => {
  if (!value) return ''
  const text = String(value)
  return text.includes('-') ? text.slice(5).replace('-', '/') : text
}

const formatFullDate = (value) => {
  if (!value) return 'Date unavailable'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

const formatAxisDate = (value) => {
  if (!value) return ''
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return formatDateLabel(value)
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
  }).format(parsed)
}

const RANGE_OPTIONS = [7, 14, 30]

const buildParticipantSeries = (data, totalParticipants, rangeDays) => {
  const items = Array.isArray(data) ? data.slice(-rangeDays) : []
  const currentTotal = Math.max(0, Math.floor(toNumber(totalParticipants)))
  let registrationsAfterPoint = 0

  return items
    .slice()
    .reverse()
    .map((item) => {
      const dailyRegistrations = Math.max(0, Math.floor(toNumber(item.registrations ?? item.count)))
      const row = {
        ...item,
        dailyRegistrations,
        cumulativeParticipants: Math.max(0, currentTotal - registrationsAfterPoint),
      }
      registrationsAfterPoint += dailyRegistrations
      return row
    })
    .reverse()
}

const ParticipantTooltip = ({ active, payload }) => {
  const row = payload?.[0]?.payload
  if (!active || !row) return null

  return (
    <div className="participant-growth__tooltip">
      <strong>{formatFullDate(row.date)}</strong>
      <span><span>Total participants</span><b>{Math.floor(toNumber(row.cumulativeParticipants)).toLocaleString()}</b></span>
      <span><span>Joined that day</span><b>{Math.floor(toNumber(row.dailyRegistrations)).toLocaleString()}</b></span>
    </div>
  )
}

export function ParticipantGrowthChart({
  data = [],
  totalParticipants = 0,
  defaultRange = 14,
  compact = false,
  emptyLabel = 'Growth data syncing',
  ariaLabel = 'Fin Freedom participant growth chart',
}) {
  const [view, setView] = useState('total')
  const [rangeDays, setRangeDays] = useState(defaultRange)
  const chartData = useMemo(
    () => buildParticipantSeries(data, totalParticipants, rangeDays),
    [data, rangeDays, totalParticipants]
  )

  if (!chartData.length) {
    return <div className="io-chart-empty">{emptyLabel}</div>
  }

  const renderDot = ({ cx, cy, index }) => {
    const isCurrent = index === chartData.length - 1
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isCurrent ? 5 : 2.5}
        className={isCurrent ? 'participant-growth__dot is-current' : 'participant-growth__dot'}
      />
    )
  }

  return (
    <section
      className={`participant-growth${compact ? ' participant-growth--compact' : ''}`}
      aria-label={ariaLabel}
    >
      {!compact && (
        <header className="participant-growth__header">
          <div className="participant-growth__summary">
            <span>Fin Freedom Participant Growth</span>
            <strong>{formatParticipantCount(totalParticipants)}</strong>
            <small>Total participants</small>
          </div>

          <div className="participant-growth__controls">
            <div className="participant-growth__segments" aria-label="Growth view">
              <button type="button" className={view === 'total' ? 'is-active' : ''} onClick={() => setView('total')}>
                Total Participants
              </button>
              <button type="button" className={view === 'daily' ? 'is-active' : ''} onClick={() => setView('daily')}>
                Daily Registrations
              </button>
            </div>
            <div className="participant-growth__ranges" aria-label="Growth period">
              {RANGE_OPTIONS.map((days) => (
                <button
                  type="button"
                  key={days}
                  className={rangeDays === days ? 'is-active' : ''}
                  onClick={() => setRangeDays(days)}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </header>
      )}

      <div className="participant-growth__canvas">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'total' ? (
            <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 2, left: compact ? -24 : -8 }}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.14)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                stroke="rgba(148, 163, 184, 0.28)"
                tick={{ fill: 'var(--text-secondary, #a5b4c6)', fontSize: compact ? 10 : 11 }}
                minTickGap={compact ? 32 : 22}
              />
              <YAxis
                allowDecimals={false}
                stroke="rgba(148, 163, 184, 0.28)"
                tick={{ fill: 'var(--text-secondary, #a5b4c6)', fontSize: compact ? 10 : 11 }}
                width={compact ? 38 : 48}
              />
              <Tooltip content={<ParticipantTooltip />} cursor={{ stroke: 'rgba(226, 232, 240, 0.55)', strokeDasharray: '4 4' }} />
              <Area
                type="linear"
                dataKey="cumulativeParticipants"
                stroke="var(--io-chart-secondary, #21d4e8)"
                strokeWidth={2}
                fill="rgba(33, 212, 232, 0.12)"
                activeDot={{ r: 5, fill: '#f5c542', stroke: '#ffffff', strokeWidth: 1.5 }}
                dot={renderDot}
                isAnimationActive
                animationDuration={800}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 2, left: -8 }}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.14)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                stroke="rgba(148, 163, 184, 0.28)"
                tick={{ fill: 'var(--text-secondary, #a5b4c6)', fontSize: 11 }}
                minTickGap={22}
              />
              <YAxis
                allowDecimals={false}
                stroke="rgba(148, 163, 184, 0.28)"
                tick={{ fill: 'var(--text-secondary, #a5b4c6)', fontSize: 11 }}
                width={48}
              />
              <Tooltip content={<ParticipantTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
              <Bar dataKey="dailyRegistrations" fill="rgba(33, 212, 232, 0.78)" radius={[3, 3, 0, 0]} maxBarSize={26} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export function LevelProgressionTrack({
  data = [],
  activeKey = 'activated',
  labelKey = 'level',
  ariaLabel = 'Level progression',
}) {
  const items = Array.isArray(data) ? data : []
  const activeIndexes = items.reduce((indexes, item, index) => {
    if (item?.[activeKey]) indexes.push(index)
    return indexes
  }, [])
  const latestActiveIndex = activeIndexes.length ? activeIndexes[activeIndexes.length - 1] : -1
  const nextIndex = items.findIndex((item) => !item?.[activeKey])

  return (
    <ol className="level-progress" aria-label={ariaLabel} style={{ '--level-count': Math.max(items.length, 1) }}>
      {items.map((item, index) => {
        const active = Boolean(item?.[activeKey])
        const current = active && index === latestActiveIndex
        const next = !active && index === nextIndex
        const state = current ? 'active' : active ? 'complete' : next ? 'next' : 'locked'
        const stateLabel = current ? 'Active' : active ? 'Complete' : next ? 'Next' : 'Locked'

        return (
          <li className={`level-progress__item is-${state}`} key={`${item?.[labelKey] || index}-${index}`}>
            <span className="level-progress__marker" aria-hidden="true">{active && !current ? '\u2713' : item?.[labelKey]}</span>
            <span className="level-progress__name">L{item?.[labelKey]}</span>
            <small>{stateLabel}</small>
          </li>
        )
      })}
    </ol>
  )
}

const buildLinePoints = (items, valueKey, maxValue, width = 100, topPad = 14, bottomPad = 18) => {
  if (!items.length) return []
  const usableHeight = 100 - topPad - bottomPad

  return items.map((item, index) => {
    const x = items.length === 1 ? width / 2 : (index / (items.length - 1)) * width
    const ratio = maxValue > 0 ? toNumber(item[valueKey]) / maxValue : 0
    const y = topPad + usableHeight - clamp(ratio, 0, 1) * usableHeight
    return { x, y, value: toNumber(item[valueKey]), item, index }
  })
}

const buildAreaPath = (points) => {
  if (!points.length) return ''
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  return `M ${line} L ${points[points.length - 1].x},88 L ${points[0].x},88 Z`
}

const ChartDefs = ({ areaId, glowId }) => (
  <defs>
    <linearGradient id={areaId} x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stopColor="var(--io-chart-primary)" stopOpacity="0.34" />
      <stop offset="100%" stopColor="var(--io-chart-secondary)" stopOpacity="0.02" />
    </linearGradient>
    <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="2.2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
)

export function MetricSparkline({
  data = [],
  valueKey = 'registrations',
  labelKey = 'date',
  emptyLabel = 'Chart syncing',
  ariaLabel = 'Growth trend chart',
  compact = false,
}) {
  const chartId = useId().replace(/:/g, '')
  const areaId = `ioLineAreaGradient-${chartId}`
  const glowId = `ioLineGlow-${chartId}`
  const items = Array.isArray(data) ? data.slice(-14) : []
  const values = items.map((item) => toNumber(item[valueKey] ?? item.count))
  const maxValue = Math.max(...values, 1)
  const points = buildLinePoints(items.map((item) => ({ ...item, [valueKey]: item[valueKey] ?? item.count })), valueKey, maxValue)
  const pointString = points.map((point) => `${point.x},${point.y}`).join(' ')
  const areaPath = buildAreaPath(points)

  if (!items.length) {
    return <div className="io-chart-empty">{emptyLabel}</div>
  }

  return (
    <div className={`io-chart io-chart--line${compact ? ' io-chart--compact' : ''}`} role="img" aria-label={ariaLabel}>
      <div className="io-chart__grid" aria-hidden="true" />
      <svg className="io-line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ChartDefs areaId={areaId} glowId={glowId} />
        <path className="io-line-chart__area" d={areaPath} style={{ fill: `url(#${areaId})` }} />
        <polyline className="io-line-chart__glow" points={pointString} style={{ filter: `url(#${glowId})` }} />
        <polyline className="io-line-chart__line" points={pointString} />
        {points.map((point) => (
          <circle
            key={`${point.item[labelKey] || point.index}-${point.index}`}
            className={`io-line-chart__point${point.index === points.length - 1 ? ' is-current' : ''}`}
            cx={point.x}
            cy={point.y}
            r={point.index === points.length - 1 ? 2.2 : 1.45}
          />
        ))}
      </svg>
      <div className="io-chart__labels" aria-hidden="true">
        {items.map((item, index) => (
          <span key={`${item[labelKey] || index}-${index}`}>{formatDateLabel(item[labelKey])}</span>
        ))}
      </div>
    </div>
  )
}

export function GrowthBarChart({
  data = [],
  valueKey = 'registrations',
  labelKey = 'date',
  amountKey = 'earningsLiquid',
  emptyLabel = 'Growth data syncing',
  ariaLabel = 'Community growth chart',
}) {
  const items = Array.isArray(data) ? data : []
  const values = items.map((item) => toNumber(item[valueKey]))
  const maxValue = Math.max(...values, 1)

  if (!items.length) {
    return <div className="io-chart-empty">{emptyLabel}</div>
  }

  return (
    <div className="io-chart io-chart--bars" role="img" aria-label={ariaLabel}>
      <div className="io-chart__grid" aria-hidden="true" />
      <div className="io-bars">
        {items.map((item, index) => {
          const value = toNumber(item[valueKey])
          const height = Math.max((value / maxValue) * 100, value > 0 ? 12 : 4)
          const amount = toNumber(item[amountKey])
          const title = `${item[labelKey] || 'Date'} - ${value} registrations${amount ? ` - ${amount.toFixed(2)} USDT` : ''}`
          return (
            <div className="io-bars__item" key={`${item[labelKey] || index}-${index}`}>
              <div className="io-bars__track">
                <span
                  className={`io-bars__bar${index === items.length - 1 ? ' is-current' : ''}`}
                  style={{ height: `${height}%` }}
                  title={title}
                />
              </div>
              <span className="io-bars__label">{formatDateLabel(item[labelKey])}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ProgressionLineChart({
  data = [],
  valueKey = 'cumulative',
  activeKey = 'activated',
  labelKey = 'level',
  maxValue,
  emptyLabel = 'Progress syncing',
  ariaLabel = 'Level progression chart',
}) {
  const chartId = useId().replace(/:/g, '')
  const areaId = `ioProgressionAreaGradient-${chartId}`
  const glowId = `ioProgressionGlow-${chartId}`
  const items = Array.isArray(data) ? data : []
  const resolvedMax = Math.max(toNumber(maxValue), ...items.map((item) => toNumber(item[valueKey])), 1)
  const points = buildLinePoints(items, valueKey, resolvedMax)
  const pointString = points.map((point) => `${point.x},${point.y}`).join(' ')
  const areaPath = buildAreaPath(points)

  if (!items.length) {
    return <div className="io-chart-empty">{emptyLabel}</div>
  }

  return (
    <div className="io-chart io-chart--progression" role="img" aria-label={ariaLabel}>
      <div className="io-chart__grid" aria-hidden="true" />
      <svg className="io-line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ChartDefs areaId={areaId} glowId={glowId} />
        <path className="io-line-chart__area" d={areaPath} style={{ fill: `url(#${areaId})` }} />
        <polyline className="io-line-chart__glow" points={pointString} style={{ filter: `url(#${glowId})` }} />
        <polyline className="io-line-chart__line" points={pointString} />
        {points.map((point) => {
          const active = Boolean(point.item[activeKey])
          return (
            <circle
              key={`${point.item[labelKey] || point.index}-${point.index}`}
              className={`io-line-chart__point${active ? ' is-active' : ''}${point.index === points.length - 1 ? ' is-current' : ''}`}
              cx={point.x}
              cy={point.y}
              r={active ? 2.25 : 1.55}
            />
          )
        })}
      </svg>
      <div className="io-chart__labels io-chart__labels--levels" aria-hidden="true">
        {items.map((item, index) => (
          <span key={`${item[labelKey] || index}-${index}`}>L{item[labelKey]}</span>
        ))}
      </div>
    </div>
  )
}
