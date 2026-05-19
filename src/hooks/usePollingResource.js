import { useCallback, useEffect, useRef, useState } from 'react'

export function usePollingResource(fetcher, {
  enabled = true,
  intervalMs = 60000,
  immediate = true,
  keepPreviousData = true,
} = {}) {
  const [state, setState] = useState({
    status: immediate ? 'idle' : 'ready',
    data: null,
    error: null,
    lastUpdatedAt: null,
    refreshCount: 0,
  })
  const fetcherRef = useRef(fetcher)
  const runningRef = useRef(false)

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!enabled || runningRef.current || typeof fetcherRef.current !== 'function') return null
    runningRef.current = true

    setState((current) => ({
      ...current,
      status: silent && keepPreviousData ? current.status : 'loading',
      error: null,
    }))

    try {
      const data = await fetcherRef.current()
      setState((current) => ({
        status: 'ready',
        data,
        error: null,
        lastUpdatedAt: new Date().toISOString(),
        refreshCount: current.refreshCount + 1,
      }))
      return data
    } catch (error) {
      setState((current) => ({
        ...current,
        status: current.data && keepPreviousData ? 'stale' : 'error',
        error,
      }))
      return null
    } finally {
      runningRef.current = false
    }
  }, [enabled, keepPreviousData])

  useEffect(() => {
    if (!enabled) return undefined
    if (immediate) refresh({ silent: false })

    const timer = window.setInterval(() => {
      refresh({ silent: true })
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [enabled, immediate, intervalMs, refresh])

  return {
    ...state,
    isLoading: state.status === 'loading',
    isStale: state.status === 'stale',
    refresh,
  }
}
