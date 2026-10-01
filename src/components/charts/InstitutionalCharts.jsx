import './InstitutionalCharts.css'
import { useId } from 'react'

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
  const chartId = useId().replace(/:/g, '')
  const areaId = `ioLineAreaGradient-${chartId}`
  const glowId = `ioLineGlow-${chartId}`
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
