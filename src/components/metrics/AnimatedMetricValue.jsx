import { useEffect, useRef, useState } from 'react'
import { formatParticipantCount, toFiniteNumber } from '../../utils/metricFormatters'

const formatExactValue = (value, { decimals, prefix, suffix }) => (
  `${prefix}${toFiniteNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`
)

export default function AnimatedMetricValue({
  value = 0,
  format = 'number',
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 900,
  className = '',
}) {
  const numericValue = toFiniteNumber(value)
  const hostRef = useRef(null)
  const displayedRef = useRef(0)
  const animationRef = useRef(0)
  const [isVisible, setIsVisible] = useState(() => typeof IntersectionObserver === 'undefined')
  const [displayedValue, setDisplayedValue] = useState(0)

  useEffect(() => {
    const node = hostRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      setIsVisible(true)
      observer.disconnect()
    }, { threshold: 0.25 })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return undefined

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const startValue = displayedRef.current
    const targetValue = numericValue

    if (reduceMotion || duration <= 0 || startValue === targetValue) {
      if (startValue === targetValue) return undefined
      animationRef.current = requestAnimationFrame(() => {
        displayedRef.current = targetValue
        setDisplayedValue(targetValue)
      })
      return () => cancelAnimationFrame(animationRef.current)
    }

    const startedAt = performance.now()
    cancelAnimationFrame(animationRef.current)

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const nextValue = startValue + (targetValue - startValue) * eased

      displayedRef.current = nextValue
      setDisplayedValue(nextValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick)
      } else {
        displayedRef.current = targetValue
        setDisplayedValue(targetValue)
      }
    }

    animationRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationRef.current)
  }, [duration, isVisible, numericValue])

  const visibleText = format === 'participant'
    ? formatParticipantCount(displayedValue)
    : formatExactValue(displayedValue, { decimals, prefix, suffix })

  const exactText = format === 'participant'
    ? `${Math.max(0, Math.floor(numericValue)).toLocaleString()} Fin Freedom participants`
    : formatExactValue(numericValue, { decimals, prefix, suffix })

  return (
    <span ref={hostRef} className={className} aria-label={exactText}>
      <span aria-hidden="true">{visibleText}</span>
    </span>
  )
}
