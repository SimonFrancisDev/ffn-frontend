import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ethers } from 'ethers'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'https://fin-freedom-backend-3.onrender.com'

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed: ${response.status}`)
  }

  return payload
}

function normalizeAddress(address) {
  if (!address) return ''
  try {
    if (!ethers.isAddress(address)) return ''
    return ethers.getAddress(address)
  } catch {
    return ''
  }
}

const EMPTY_SUMMARY = {
  address: '',
  isRegistered: false,
  referrer: '',
  highestActiveLevel: 0,
  activeLevelsCount: 0,
  totalReceiptEarnings: '0.00',
  totalReceiptEscrowLocked: '0.00',
  totalReceiptGross: '0.00',
  totalReceiptCount: 0,
  fgtTotal: '0.00',
  fgtLocked: '0.00',
  fgtAvailable: '0.00',
  fgtrTotal: '0.00',
  fgtrLocked: '0.00',
  fgtrAvailable: '0.00',
}

const EMPTY_REFERRALS = {
  address: '',
  totalReferrals: 0,
  commissionEarnedLiquid: '0.00',
  commissionEarnedGross: '0.00',
  commissionEscrowLocked: '0.00',
  referralReceiptCount: 0,
  directReferrals: [],
}

const EMPTY_DOWNLINE = {
  address: '',
  level1: 0,
  level2: 0,
  level3: 0,
  level4: 0,
  level5: 0,
  level6: 0,
  level7: 0,
  level8: 0,
  level9: 0,
  level10: 0,
  total: 0,
}

export function useUserSummary(address, autoFetch = true) {
  const normalizedAddress = useMemo(() => normalizeAddress(address), [address])

  const [data, setData] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestIdRef = useRef(0)

  const fetchSummary = useCallback(
    async (targetAddress = normalizedAddress) => {
      const safeAddress = normalizeAddress(targetAddress)

      if (!safeAddress) {
        setData(EMPTY_SUMMARY)
        setError('')
        setLoading(false)
        return null
      }

      const requestId = ++requestIdRef.current
      setLoading(true)
      setError('')

      try {
        const payload = await fetchJson(`/api/community/member/${safeAddress}/summary`)
        if (requestId !== requestIdRef.current) return null

        const result = payload?.data || EMPTY_SUMMARY
        setData(result)
        return result
      } catch (err) {
        if (requestId !== requestIdRef.current) return null

        const message = err?.message || 'Failed to fetch user summary'
        setError(message)
        setData(EMPTY_SUMMARY)
        console.error('Failed to fetch user summary:', err)
        return null
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [normalizedAddress]
  )

  useEffect(() => {
    if (!autoFetch) return
    fetchSummary(normalizedAddress)
  }, [autoFetch, normalizedAddress, fetchSummary])

  return useMemo(
    () => ({
      ...data,
      loading,
      error,
      refetch: () => fetchSummary(normalizedAddress),
      level: data?.highestActiveLevel || 0,
      isRegistered: Boolean(data?.isRegistered),
      totalEarnings: data?.totalReceiptEarnings || '0.00',
      fgtBalance: data?.fgtTotal || '0.00',
      fgtrBalance: data?.fgtrTotal || '0.00',
    }),
    [data, loading, error, fetchSummary, normalizedAddress]
  )
}

export function useReferralStats(address, autoFetch = true) {
  const normalizedAddress = useMemo(() => normalizeAddress(address), [address])

  const [data, setData] = useState(EMPTY_REFERRALS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestIdRef = useRef(0)

  const fetchStats = useCallback(
    async (targetAddress = normalizedAddress) => {
      const safeAddress = normalizeAddress(targetAddress)

      if (!safeAddress) {
        setData(EMPTY_REFERRALS)
        setError('')
        setLoading(false)
        return null
      }

      const requestId = ++requestIdRef.current
      setLoading(true)
      setError('')

      try {
        const payload = await fetchJson(`/api/community/member/${safeAddress}/referrals`)
        if (requestId !== requestIdRef.current) return null

        const result = payload?.data || EMPTY_REFERRALS
        setData(result)
        return result
      } catch (err) {
        if (requestId !== requestIdRef.current) return null

        const message = err?.message || 'Failed to fetch referral stats'
        setError(message)
        setData(EMPTY_REFERRALS)
        console.error('Failed to fetch referral stats:', err)
        return null
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [normalizedAddress]
  )

  useEffect(() => {
    if (!autoFetch) return
    fetchStats(normalizedAddress)
  }, [autoFetch, normalizedAddress, fetchStats])

  return useMemo(
    () => ({
      ...data,
      loading,
      error,
      refetch: () => fetchStats(normalizedAddress),
      totalReferrals: data?.totalReferrals || 0,
      commissionEarned: data?.commissionEarnedLiquid || '0.00',
    }),
    [data, loading, error, fetchStats, normalizedAddress]
  )
}

export function useDownlineData(address, autoFetch = true) {
  const normalizedAddress = useMemo(() => normalizeAddress(address), [address])

  const [data, setData] = useState(EMPTY_DOWNLINE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestIdRef = useRef(0)

  const fetchDownline = useCallback(
    async (targetAddress = normalizedAddress) => {
      const safeAddress = normalizeAddress(targetAddress)

      if (!safeAddress) {
        setData(EMPTY_DOWNLINE)
        setError('')
        setLoading(false)
        return null
      }

      const requestId = ++requestIdRef.current
      setLoading(true)
      setError('')

      try {
        const payload = await fetchJson(`/api/community/member/${safeAddress}/downline`)
        if (requestId !== requestIdRef.current) return null

        const result = payload?.data || EMPTY_DOWNLINE
        setData(result)
        return result
      } catch (err) {
        if (requestId !== requestIdRef.current) return null

        const message = err?.message || 'Failed to fetch downline'
        setError(message)
        setData(EMPTY_DOWNLINE)
        console.error('Failed to fetch downline:', err)
        return null
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [normalizedAddress]
  )

  useEffect(() => {
    if (!autoFetch) return
    fetchDownline(normalizedAddress)
  }, [autoFetch, normalizedAddress, fetchDownline])

  const totalNetworkSize = useMemo(() => {
    return Number(data?.total || 0)
  }, [data])

  const levels = useMemo(
    () => ({
      level1: data?.level1 || 0,
      level2: data?.level2 || 0,
      level3: data?.level3 || 0,
      level4: data?.level4 || 0,
      level5: data?.level5 || 0,
      level6: data?.level6 || 0,
      level7: data?.level7 || 0,
      level8: data?.level8 || 0,
      level9: data?.level9 || 0,
      level10: data?.level10 || 0,
    }),
    [data]
  )

  return useMemo(
    () => ({
      ...data,
      loading,
      error,
      refetch: () => fetchDownline(normalizedAddress),
      totalNetworkSize,
      levels,
      earnings: data?.earnings || {},
      currentCycle: data?.currentCycle || 1,
    }),
    [data, loading, error, fetchDownline, normalizedAddress, totalNetworkSize, levels]
  )
}

export function useCompleteUserData(address, autoFetch = true) {
  const normalizedAddress = useMemo(() => normalizeAddress(address), [address])

  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [referrals, setReferrals] = useState(EMPTY_REFERRALS)
  const [downline, setDownline] = useState(EMPTY_DOWNLINE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestIdRef = useRef(0)

  const fetchAll = useCallback(
    async (targetAddress = normalizedAddress) => {
      const safeAddress = normalizeAddress(targetAddress)

      if (!safeAddress) {
        setSummary(EMPTY_SUMMARY)
        setReferrals(EMPTY_REFERRALS)
        setDownline(EMPTY_DOWNLINE)
        setLoading(false)
        setError('')
        return null
      }

      const requestId = ++requestIdRef.current
      setLoading(true)
      setError('')

      try {
        const [summaryPayload, referralsPayload, downlinePayload] = await Promise.all([
          fetchJson(`/api/community/member/${safeAddress}/summary`),
          fetchJson(`/api/community/member/${safeAddress}/referrals`),
          fetchJson(`/api/community/member/${safeAddress}/downline`),
        ])

        if (requestId !== requestIdRef.current) return null

        const nextSummary = summaryPayload?.data || EMPTY_SUMMARY
        const nextReferrals = referralsPayload?.data || EMPTY_REFERRALS
        const nextDownline = downlinePayload?.data || EMPTY_DOWNLINE

        setSummary(nextSummary)
        setReferrals(nextReferrals)
        setDownline(nextDownline)

        return {
          summary: nextSummary,
          referrals: nextReferrals,
          downline: nextDownline,
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return null

        const message = err?.message || 'Failed to fetch user data'
        setError(message)
        setSummary(EMPTY_SUMMARY)
        setReferrals(EMPTY_REFERRALS)
        setDownline(EMPTY_DOWNLINE)
        console.error('Failed to fetch all user data:', err)
        return null
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [normalizedAddress]
  )

  useEffect(() => {
    if (!autoFetch) return
    fetchAll(normalizedAddress)
  }, [autoFetch, normalizedAddress, fetchAll])

  return useMemo(
    () => ({
      summary,
      referrals,
      downline,
      loading,
      error,
      refetch: () => fetchAll(normalizedAddress),
    }),
    [summary, referrals, downline, loading, error, fetchAll, normalizedAddress]
  )
}













// import { useState, useEffect, useCallback } from 'react'
// import { useWallet } from './useWallet'
// import { useSpace } from '../context/SpaceContext'

// const API_BASE_URL = 'https://fin-freedom-backend-3.onrender.com'

// async function fetchJson(path, options = {}) {
//   const response = await fetch(`${API_BASE_URL}${path}`, {
//     headers: { 'Content-Type': 'application/json', ...options.headers },
//     ...options,
//   })
//   const payload = await response.json().catch(() => null)
//   if (!response.ok) throw new Error(payload?.message || `Request failed: ${response.status}`)
//   return payload
// }

// /**
//  * Hook to fetch user summary data (levels, registration, earnings)
//  * Returns: { isRegistered, highestActiveLevel, activeLevelsCount, totalReceiptEarnings, fgtTotal, fgtrTotal, loading, error }
//  */
// export function useUserSummary(address, autoFetch = true) {
//   const [data, setData] = useState(null)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState(null)

//   const fetchSummary = useCallback(async (targetAddress) => {
//     if (!targetAddress) return null
//     setLoading(true)
//     setError(null)
//     try {
//       const payload = await fetchJson(`/api/community/member/${targetAddress}/summary`)
//       const result = payload?.data || {}
//       setData(result)
//       return result
//     } catch (err) {
//       setError(err.message)
//       console.error('Failed to fetch user summary:', err)
//       return null
//     } finally {
//       setLoading(false)
//     }
//   }, [])

//   useEffect(() => {
//     if (autoFetch && address) {
//       fetchSummary(address)
//     }
//   }, [address, autoFetch, fetchSummary])

//   return { 
//     ...data, 
//     loading, 
//     error, 
//     refetch: () => fetchSummary(address),
//     // Convenience getters
//     level: data?.highestActiveLevel || 0,
//     isRegistered: data?.isRegistered || false,
//     totalEarnings: data?.totalReceiptEarnings || '0.00',
//     fgtBalance: data?.fgtTotal || '0.00',
//     fgtrBalance: data?.fgtrTotal || '0.00',
//   }
// }

// /**
//  * Hook to fetch referral stats
//  * Returns: { totalReferrals, commissionEarnedLiquid, commissionEarnedEscrow, loading, error }
//  */
// export function useReferralStats(address, autoFetch = true) {
//   const [data, setData] = useState(null)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState(null)

//   const fetchStats = useCallback(async (targetAddress) => {
//     if (!targetAddress) return null
//     setLoading(true)
//     setError(null)
//     try {
//       const payload = await fetchJson(`/api/community/member/${targetAddress}/referrals`)
//       const result = payload?.data || {}
//       setData(result)
//       return result
//     } catch (err) {
//       setError(err.message)
//       console.error('Failed to fetch referral stats:', err)
//       return null
//     } finally {
//       setLoading(false)
//     }
//   }, [])

//   useEffect(() => {
//     if (autoFetch && address) {
//       fetchStats(address)
//     }
//   }, [address, autoFetch, fetchStats])

//   return {
//     ...data,
//     loading,
//     error,
//     refetch: () => fetchStats(address),
//     totalReferrals: data?.totalReferrals || 0,
//     commissionEarned: data?.commissionEarnedLiquid || '0.00',
//   }
// }

// /**
//  * Hook to fetch downline data (network tree)
//  * Returns: { level1-10, earnings, currentCycle, totalNetworkSize, loading, error }
//  */
// export function useDownlineData(address, autoFetch = true) {
//   const [data, setData] = useState(null)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState(null)

//   const fetchDownline = useCallback(async (targetAddress) => {
//     if (!targetAddress) return null
//     setLoading(true)
//     setError(null)
//     try {
//       const payload = await fetchJson(`/api/community/member/${targetAddress}/downline`)
//       const result = payload?.data || {}
//       setData(result)
//       return result
//     } catch (err) {
//       setError(err.message)
//       console.error('Failed to fetch downline:', err)
//       return null
//     } finally {
//       setLoading(false)
//     }
//   }, [])

//   useEffect(() => {
//     if (autoFetch && address) {
//       fetchDownline(address)
//     }
//   }, [address, autoFetch, fetchDownline])

//   // Calculate total network size
//   const totalNetworkSize = data 
//     ? Object.keys(data)
//         .filter(k => k.startsWith('level'))
//         .reduce((sum, key) => sum + (Number(data[key]) || 0), 0)
//     : 0

//   return {
//     ...data,
//     loading,
//     error,
//     refetch: () => fetchDownline(address),
//     totalNetworkSize,
//     levels: {
//       level1: data?.level1 || 0,
//       level2: data?.level2 || 0,
//       level3: data?.level3 || 0,
//       level4: data?.level4 || 0,
//       level5: data?.level5 || 0,
//       level6: data?.level6 || 0,
//       level7: data?.level7 || 0,
//       level8: data?.level8 || 0,
//       level9: data?.level9 || 0,
//       level10: data?.level10 || 0,
//     },
//     earnings: data?.earnings || {},
//     currentCycle: data?.currentCycle || 1,
//   }
// }

// /**
//  * Hook to fetch complete user data (combines all above)
//  * One-stop shop for all user data
//  */
// export function useCompleteUserData(address, autoFetch = true) {
//   const summary = useUserSummary(address, false)
//   const referrals = useReferralStats(address, false)
//   const downline = useDownlineData(address, false)
//   const [loading, setLoading] = useState(false)

//   const fetchAll = useCallback(async () => {
//     if (!address) return null
//     setLoading(true)
//     try {
//       const [summaryData, referralsData, downlineData] = await Promise.all([
//         summary.refetch(),
//         referrals.refetch(),
//         downline.refetch(),
//       ])
//       return { summary: summaryData, referrals: referralsData, downline: downlineData }
//     } catch (err) {
//       console.error('Failed to fetch all user data:', err)
//       return null
//     } finally {
//       setLoading(false)
//     }
//   }, [address, summary, referrals, downline])

//   useEffect(() => {
//     if (autoFetch && address) {
//       fetchAll()
//     }
//   }, [address, autoFetch, fetchAll])

//   return {
//     summary: {
//       level: summary.level,
//       isRegistered: summary.isRegistered,
//       totalEarnings: summary.totalEarnings,
//       fgtBalance: summary.fgtBalance,
//       fgtrBalance: summary.fgtrBalance,
//       loading: summary.loading,
//     },
//     referrals: {
//       total: referrals.totalReferrals,
//       commission: referrals.commissionEarned,
//       loading: referrals.loading,
//     },
//     downline: {
//       levels: downline.levels,
//       totalSize: downline.totalNetworkSize,
//       currentCycle: downline.currentCycle,
//       earnings: downline.earnings,
//       loading: downline.loading,
//     },
//     loading: loading || summary.loading || referrals.loading || downline.loading,
//     error: summary.error || referrals.error || downline.error,
//     refetch: fetchAll,
//   }
// }