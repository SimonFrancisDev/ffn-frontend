const toFiniteNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const floorToSingleDecimal = (value) => Math.floor(value * 10) / 10

export const formatParticipantCount = (value) => {
  const count = Math.max(0, Math.floor(toFiniteNumber(value)))

  if (count >= 1_000_000) {
    const compact = floorToSingleDecimal(count / 1_000_000)
    return `${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}M+`
  }

  if (count >= 1_000) {
    const compact = floorToSingleDecimal(count / 1_000)
    return `${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}K+`
  }

  return `${count.toLocaleString()}+`
}

export { toFiniteNumber }
