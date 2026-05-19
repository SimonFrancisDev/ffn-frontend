import { useCallback, useMemo, useState } from 'react'
import { normalizeError } from '../utils/errorMap'

export function usePreflightPipeline(checks = []) {
  const [state, setState] = useState({
    status: 'idle',
    results: [],
    error: null,
    startedAt: null,
    completedAt: null,
  })

  const runChecks = useCallback(async (context = {}) => {
    const enabledChecks = checks.filter((check) => check && check.enabled !== false)
    setState({
      status: 'running',
      results: enabledChecks.map((check) => ({
        id: check.id,
        label: check.label,
        status: 'pending',
      })),
      error: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
    })

    const results = await Promise.all(enabledChecks.map(async (check) => {
      try {
        const value = await check.run(context)
        const passed = typeof value === 'boolean' ? value : value?.passed !== false
        return {
          id: check.id,
          label: check.label,
          status: passed ? 'passed' : 'failed',
          passed,
          severity: value?.severity || (passed ? 'success' : 'danger'),
          message: value?.message || check.message || '',
          action: value?.action || check.action || '',
          value,
        }
      } catch (error) {
        const normalized = normalizeError(error)
        return {
          id: check.id,
          label: check.label,
          status: 'failed',
          passed: false,
          severity: 'danger',
          message: normalized.message,
          action: normalized.action,
          error,
        }
      }
    }))

    const failed = results.find((result) => !result.passed)
    setState({
      status: failed ? 'failed' : 'passed',
      results,
      error: failed || null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })

    return {
      passed: !failed,
      failed,
      results,
    }
  }, [checks])

  const summary = useMemo(() => {
    const total = state.results.length
    const passed = state.results.filter((result) => result.passed).length
    return {
      total,
      passed,
      failed: total - passed,
      complete: total > 0 && passed === total,
    }
  }, [state.results])

  return {
    ...state,
    summary,
    runChecks,
    reset: () => setState({ status: 'idle', results: [], error: null, startedAt: null, completedAt: null }),
  }
}
