// One public snapshot across program views; requests are coalesced, never polled.
export function createCommunitySummaryStore(fetchSummary, { now = Date.now, ttlMs = 15000 } = {}) {
  let snapshot = { status: 'idle', payload: null, updatedAt: null }
  let inflight = null
  const listeners = new Set()
  const publish = (next) => {
    snapshot = next
    listeners.forEach(listener => listener())
  }
  const load = ({ force = false } = {}) => {
    if (inflight) return inflight
    if (!force && snapshot.status === 'ready' && now() - snapshot.updatedAt < ttlMs) {
      return Promise.resolve(snapshot.payload)
    }
    inflight = Promise.resolve().then(fetchSummary).then(payload => {
      if (payload?.ok === false || !payload?.data?.public) throw new Error('Invalid community summary')
      publish({ status: 'ready', payload, updatedAt: now() })
      return payload
    }).catch(error => {
      publish({ status: 'error', payload: null, updatedAt: null })
      throw error
    }).finally(() => { inflight = null })
    publish({ ...snapshot, status: 'loading' })
    return inflight
  }
  return {
    load,
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
