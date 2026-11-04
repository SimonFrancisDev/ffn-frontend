import { getApiUrl } from './apiConfig'
import { createCommunitySummaryStore } from './communitySummaryStore.js'

export const communitySummaryStore = createCommunitySummaryStore(async () => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(getApiUrl('/api/community/summary'), {
      signal: controller.signal,
      cache: 'no-cache',
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.message || `Request failed: ${response.status}`)
    return payload
  } finally {
    clearTimeout(timeout)
  }
})

export const fetchCommunitySummary = communitySummaryStore.load
