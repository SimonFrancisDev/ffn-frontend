import { useCallback, useMemo, useState } from 'react'
import { normalizeError } from '../utils/errorMap'

const INITIAL_STATE = {
  status: 'idle',
  stage: 'idle',
  hash: null,
  error: null,
  note: '',
  updatedAt: null,
}

export function useTxFlow({ onSuccess, onError } = {}) {
  const [txState, setTxState] = useState(INITIAL_STATE)

  const setStage = useCallback((stage, patch = {}) => {
    setTxState((current) => ({
      ...current,
      status: stage === 'complete' ? 'success' : stage === 'error' ? 'error' : 'running',
      stage,
      error: null,
      updatedAt: new Date().toISOString(),
      ...patch,
    }))
  }, [])

  const fail = useCallback((error) => {
    const normalized = normalizeError(error)
    setTxState((current) => ({
      ...current,
      status: 'error',
      stage: 'error',
      error: normalized,
      updatedAt: new Date().toISOString(),
    }))
    onError?.(normalized, error)
    return normalized
  }, [onError])

  const reset = useCallback(() => setTxState(INITIAL_STATE), [])

  const runTx = useCallback(async ({
    preflight,
    request,
    wait = true,
    labels = {},
  }) => {
    try {
      if (preflight) {
        setStage('preflight', { note: labels.preflight || 'Checking requirements' })
        const preflightResult = await preflight()
        if (preflightResult?.passed === false) {
          throw new Error(preflightResult.message || 'Required checks did not pass.')
        }
      }

      setStage('signing', { note: labels.signing || 'Waiting for wallet signature' })
      const tx = await request()
      const hash = tx?.hash || null

      setStage(wait ? 'pending' : 'submitted', {
        hash,
        note: labels.pending || 'Transaction submitted',
      })

      const receipt = wait && tx?.wait ? await tx.wait() : tx
      setStage('complete', {
        hash,
        note: labels.complete || 'Transaction confirmed',
      })
      onSuccess?.(receipt)
      return receipt
    } catch (error) {
      fail(error)
      return null
    }
  }, [fail, onSuccess, setStage])

  const helpers = useMemo(() => ({
    isIdle: txState.status === 'idle',
    isRunning: txState.status === 'running',
    isError: txState.status === 'error',
    isSuccess: txState.status === 'success',
  }), [txState.status])

  return {
    txState,
    ...helpers,
    setStage,
    fail,
    reset,
    runTx,
  }
}
