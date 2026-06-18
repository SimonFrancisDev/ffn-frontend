import './DashboardPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../../hooks/useWallet'
import { getApiUrl } from '../../Services/apiConfig'
import { getProfileReadAuthIfLocked } from '../../Services/profilePrivacyApi'
import { useToast } from '../../components/feedback'
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../../constants/addresses'
import {
  Activity,
  Shield,
  Wifi,
  Coins,
  Users,
  PiggyBank,
  RefreshCw,
  UserPlus,
  Megaphone,
  Link2,
} from 'lucide-react'

const EXPLORER_ADDRESS_BASE = `${NETWORK_CONFIG.blockExplorerUrls[0]}address`
const DASHBOARD_REQUEST_TIMEOUT_MS = 12000

const formatNumber = (value, decimals = 2) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return decimals === 0 ? '0' : '0.00'

  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

const shortenAddress = (value) => {
  if (!value) return 'Unavailable'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

const formatDisplayDate = (value) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatActivityDate = (value) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const SYSTEM_STATUS_KEYS = {
  Unknown: 'unknown',
  Unavailable: 'unavailable',
  Error: 'error',
  Syncing: 'syncing',
  Live: 'live',
  Healthy: 'healthy',
  Degraded: 'degraded',
  Connected: 'connected',
  'Checking...': 'checking',
}

const getDateKey = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}

const isTodayDate = (value) => {
  const key = getDateKey(value)
  const todayKey = new Date().toISOString().slice(0, 10)

  return key === todayKey
}

const getActivityTimestamp = (item) => {
  if (!item?.rawDate) return 0

  const date = new Date(item.rawDate)
  if (Number.isNaN(date.getTime())) return 0

  return date.getTime()
}

async function fetchJson(path, options = {}) {
  const { timeoutMs = DASHBOARD_REQUEST_TIMEOUT_MS, signal, headers, ...fetchOptions } = options
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  const abortFromCaller = () => controller.abort()

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener('abort', abortFromCaller, { once: true })
    }
  }

  try {
    const response = await fetch(getApiUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      ...fetchOptions,
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(payload?.message || `Request failed: ${response.status}`)
    }

    return payload
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out while reading indexed dashboard data.')
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener?.('abort', abortFromCaller)
  }
}

const emptyCommunityStats = {
  totalUsers: 0,
  totalReceipts: 0,

  totalGeneratedVolume: '0.00',
  totalWalletCreditedPayouts: '0.00',
  totalEscrowLockedLifetime: '0.00',
  totalAutoUpgradeUsed: '0.00',
  totalEscrowReleasedToUsers: '0.00',
  currentEscrowLocked: '0.00',
  nftPoolReceived: '0.00',
  operationsReceived: '0.00',
  totalProtocolDistributedValue: '0.00',
  generatedGross: '0.00',
  walletCreditedLiquid: '0.00',
  escrowLockedLifetime: '0.00',
  autoUpgradeUsed: '0.00',
  escrowReleasedToUser: '0.00',
  nftPoolAllocated: '0.00',
  operationsAllocated: '0.00',
  nftPoolDistributed: '0.00',
  operationsUtilized: '0.00',
  nftPoolLiveBalance: '0.00',
  operationsLiveBalance: '0.00',
  nftRewardPool: {
    totalInflow: '0.00',
    totalDistributed: '0.00',
    currentBalance: '0.00',
  },
  devOperations: {
    totalInflow: '0.00',
    totalUtilized: '0.00',
    currentBalance: '0.00',
  },

  // Backward-compatible aliases.
  totalLiquid: '0.00',
  totalGross: '0.00',
  totalEscrow: '0.00',
}

const emptyPublicSummary = {
  totalParticipants: 0,
  visibleCoreBalanceUsdt: '0.00',
  readLayerStatus: 'Syncing',
}

const emptyGrowthData = {
  series: [],
  rangeDays: 7,
}

const emptySystemHealth = {
  contracts: 'Checking...',
  network: 'Checking...',
  sync: 'Checking...',
  indexerStatus: 'idle',
  latestBlock: 0,
  lastSyncedBlock: 0,
}

function buildGlobalMetrics(publicData = {}, statsData = {}) {
  const totalGeneratedVolume =
    publicData.generatedGross ??
    statsData.generatedGross ??
    publicData.totalGeneratedVolume ??
    publicData.totalGross ??
    statsData.totalGross ??
    '0.00'

  const totalWalletCreditedPayouts =
    publicData.walletCreditedLiquid ??
    statsData.walletCreditedLiquid ??
    publicData.totalWalletCreditedPayouts ??
    publicData.totalLiquid ??
    statsData.totalLiquid ??
    '0.00'

  const totalEscrowLockedLifetime =
    publicData.escrowLockedLifetime ??
    statsData.escrowLockedLifetime ??
    publicData.totalEscrowLockedLifetime ??
    publicData.totalEscrow ??
    statsData.totalEscrow ??
    '0.00'

  const totalAutoUpgradeUsed =
    publicData.autoUpgradeUsed ??
    statsData.autoUpgradeUsed ??
    publicData.totalAutoUpgradeUsed ??
    statsData.totalAutoUpgradeUsed ??
    '0.00'

  const totalEscrowReleasedToUsers =
    publicData.escrowReleasedToUser ??
    statsData.escrowReleasedToUser ??
    publicData.totalEscrowReleasedToUsers ??
    statsData.totalEscrowReleasedToUsers ??
    '0.00'

  const currentEscrowLocked =
    publicData.currentEscrowLocked ??
    statsData.currentEscrowLocked ??
    '0.00'

  const nftPoolAllocated =
    publicData.nftPoolAllocated ??
    statsData.nftPoolAllocated ??
    publicData.nftPoolReceived ??
    statsData.nftPoolReceived ??
    '0.00'

  const operationsAllocated =
    publicData.operationsAllocated ??
    statsData.operationsAllocated ??
    publicData.operationsReceived ??
    statsData.operationsReceived ??
    '0.00'

  const nftPoolLiveBalance =
    publicData.nftPoolLiveBalance ??
    statsData.nftPoolLiveBalance ??
    publicData.nftPool ??
    publicData.nftPoolBalance ??
    publicData.nftPoolBalanceUsdt ??
    statsData.nftPool ??
    '0.00'

  const operationsLiveBalance =
    publicData.operationsLiveBalance ??
    statsData.operationsLiveBalance ??
    publicData.operations ??
    publicData.operationsBalance ??
    publicData.operationsBalanceUsdt ??
    publicData.opsBalance ??
    statsData.operations ??
    '0.00'

  const nftPoolDistributed =
    publicData.nftPoolDistributed ??
    statsData.nftPoolDistributed ??
    publicData.nftRewardPool?.totalDistributed ??
    statsData.nftRewardPool?.totalDistributed ??
    '0.00'

  const operationsUtilized =
    publicData.operationsUtilized ??
    statsData.operationsUtilized ??
    publicData.devOperations?.totalUtilized ??
    statsData.devOperations?.totalUtilized ??
    '0.00'

  return {
    totalUsers: Number(publicData.totalParticipants || statsData.totalUsers || 0),
    totalReceipts: Number(statsData.totalReceipts || 0),

    totalGeneratedVolume,
    totalWalletCreditedPayouts,
    totalEscrowLockedLifetime,
    totalAutoUpgradeUsed,
    totalEscrowReleasedToUsers,
    currentEscrowLocked,
    generatedGross: totalGeneratedVolume,
    walletCreditedLiquid: totalWalletCreditedPayouts,
    escrowLockedLifetime: totalEscrowLockedLifetime,
    autoUpgradeUsed: totalAutoUpgradeUsed,
    escrowReleasedToUser: totalEscrowReleasedToUsers,

    nftPoolReceived: nftPoolAllocated,
    operationsReceived: operationsAllocated,
    nftPoolAllocated,
    operationsAllocated,
    nftPoolDistributed,
    operationsUtilized,

    totalProtocolDistributedValue:
      publicData.totalProtocolDistributedValue ??
      statsData.totalProtocolDistributedValue ??
      publicData.visibleCoreBalanceUsdt ??
      '0.00',

    nftPool: nftPoolLiveBalance,
    operations: operationsLiveBalance,
    nftPoolLiveBalance,
    operationsLiveBalance,
    nftRewardPool: {
      totalInflow:
        publicData.nftRewardPool?.totalInflow ??
        statsData.nftRewardPool?.totalInflow ??
        nftPoolAllocated,
      totalDistributed: nftPoolDistributed,
      currentBalance:
        publicData.nftRewardPool?.currentBalance ??
        statsData.nftRewardPool?.currentBalance ??
        nftPoolLiveBalance,
    },
    devOperations: {
      totalInflow:
        publicData.devOperations?.totalInflow ??
        statsData.devOperations?.totalInflow ??
        operationsAllocated,
      totalUtilized: operationsUtilized,
      currentBalance:
        publicData.devOperations?.currentBalance ??
        statsData.devOperations?.currentBalance ??
        operationsLiveBalance,
    },

    // Backward-compatible aliases.
    totalGross: totalGeneratedVolume,
    totalLiquid: totalWalletCreditedPayouts,
    totalEscrow: totalEscrowLockedLifetime,
  }
}

const AnimatedNumber = ({ value = 0, decimals = 0, prefix = '', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const target = Number(value || 0)
    const duration = 1200
    const startTime = performance.now()
    let frameId

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = target * eased
      setDisplayValue(current)

      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [value])

  return (
    <>
      {prefix}
      {Number(displayValue).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  )
}

const DashboardLineChart = ({ series = [] }) => {
  const { t } = useTranslation()

  if (!Array.isArray(series) || series.length === 0) {
    return (
      <div className="dashboard-progress__placeholder">
        <span className="soft-text">{t('dashboardPage.chart.initializing', 'Growth data initializing...')}</span>
      </div>
    )
  }

  const points = series.slice(-7)
  const values = points.map((item) => Number(item.registrations || 0))
  const max = Math.max(...values, 1)
  const width = 100
  const height = 84
  const stepX = points.length > 1 ? width / (points.length - 1) : width

  const coordinates = points.map((item, index) => {
    const value = Number(item.registrations || 0)
    const x = points.length === 1 ? width / 2 : index * stepX
    const y = height - (value / max) * (height - 10)
    return { x, y, value, date: item.date }
  })

  const polylinePoints = coordinates.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div className="dashboard-line-chart">
      <div className="dashboard-line-chart__svg-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="dashboard-line-chart__svg"
          aria-hidden="true"
        >
          <line x1="0" y1={height} x2={width} y2={height} className="dashboard-line-chart__axis" />
          <polyline
            fill="none"
            stroke="var(--glow-blue)"
            strokeWidth="5"
            opacity="0.12"
            points={polylinePoints}
            className="dashboard-line-chart__pulse-glow"
          />
          <polyline
            fill="none"
            stroke="var(--glow-blue)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polylinePoints}
            className="dashboard-line-chart__pulse-line"
          />
        </svg>
      </div>

      <div className="dashboard-line-chart__labels">
        {points.map((item, index) => (
          <div key={`${item.date || index}-${index}`} className="dashboard-line-chart__label-item">
            <span className="dashboard-line-chart__label-text">
              {item.date ? item.date.slice(5) : `#${index + 1}`}
            </span>
            <span className="dashboard-line-chart__label-value">
              {Number(item.registrations || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DashboardPage = () => {
  const { t } = useTranslation()
  const dashboardT = useCallback((key, fallback, options) => t(`dashboardPage.${key}`, fallback, options), [t])
  const { isConnected, account } = useWallet()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [error, setError] = useState(null)
  const [accessError, setAccessError] = useState('')

  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true)
  const [memberSummary, setMemberSummary] = useState({
    isRegistered: false,
    isProtocolId1Wallet: false,
    referrer: '',
    highestActiveLevel: 0,
    activeLevelsCount: 0,
    totalReceiptEarnings: '0.00',
    fgtTotal: '0.00',
    fgtrTotal: '0.00',
  })

  const [totalParticipants, setTotalParticipants] = useState(0)
  const [activityDateFilter, setActivityDateFilter] = useState('today')

  const [indexedTreasury, setIndexedTreasury] = useState({
    visibleCoreBalanceUsdt: '0.00',

    totalGeneratedVolume: '0.00',
    totalWalletCreditedPayouts: '0.00',
    totalEscrowLockedLifetime: '0.00',
    totalAutoUpgradeUsed: '0.00',
    totalEscrowReleasedToUsers: '0.00',
    currentEscrowLocked: '0.00',
    totalProtocolDistributedValue: '0.00',

    nftPool: '0.00',
    operations: '0.00',

    // Backward-compatible aliases.
    totalLiquid: '0.00',
    totalGross: '0.00',
    totalEscrow: '0.00',
  })

  const [communityStats, setCommunityStats] = useState(emptyCommunityStats)
  const [publicSummary, setPublicSummary] = useState(emptyPublicSummary)
  const [growthData, setGrowthData] = useState(emptyGrowthData)
  const [systemHealth, setSystemHealth] = useState(emptySystemHealth)
  const [announcements, setAnnouncements] = useState([])

  const contractDirectory = useMemo(() => {
    return [
      {
        key: 'registration',
        label: dashboardT('contracts.registration.label', 'Registration Contract'),
        address: CONTRACT_ADDRESSES.REGISTRATION,
        note: dashboardT('contracts.registration.note', 'Manages identity, registration status, and participant records.'),
      },
      {
        key: 'level-manager',
        label: dashboardT('contracts.levelManager.label', 'Level Manager'),
        address: CONTRACT_ADDRESSES.LEVEL_MANAGER,
        note: dashboardT('contracts.levelManager.note', 'Controls level upgrades, reward routing, and system logic.'),
      },
      {
        key: 'escrow',
        label: dashboardT('contracts.escrow.label', 'Auto-Upgrade Escrow'),
        address: CONTRACT_ADDRESSES.ESCROW,
        note: dashboardT('contracts.escrow.note', 'Holds reserved liquidity for automated upgrades.'),
      },
      {
        key: 'p4',
        label: dashboardT('contracts.p4.label', 'P4 Orbit'),
        address: CONTRACT_ADDRESSES.P4_ORBIT,
        note: dashboardT('contracts.p4.note', 'Entry-level orbit with 4 positions.'),
      },
      {
        key: 'p12',
        label: dashboardT('contracts.p12.label', 'P12 Orbit'),
        address: CONTRACT_ADDRESSES.P12_ORBIT,
        note: dashboardT('contracts.p12.note', 'Growth orbit with 12 positions for broader reach.'),
      },
      {
        key: 'p39',
        label: dashboardT('contracts.p39.label', 'P39 Orbit'),
        address: CONTRACT_ADDRESSES.P39_ORBIT,
        note: dashboardT('contracts.p39.note', 'Expansion orbit with 39 positions for deeper progression.'),
      },
    ].map((item) => ({
      ...item,
      href: item.address ? `${EXPLORER_ADDRESS_BASE}/${item.address}` : '#',
    }))
  }, [dashboardT])

  const statusT = useCallback((status) => {
    const statusKey = SYSTEM_STATUS_KEYS[status]
    return statusKey ? dashboardT(`status.${statusKey}`, status) : status
  }, [dashboardT])

  const fetchMemberSummary = useCallback(async () => {
    if (!account) {
      setIsCheckingRegistration(false)
      setMemberSummary((prev) => ({ ...prev, isRegistered: false }))
      setAccessError('')
      return
    }

    setIsCheckingRegistration(true)
    setAccessError('')

    try {
      const profileReadHeaders = await getProfileReadAuthIfLocked(account, account)
      const payload = await fetchJson(`/api/community/member/${account}/summary`, { headers: profileReadHeaders })
      const data = payload?.data || {}

      setMemberSummary({
        isRegistered: Boolean(data.isRegistered),
        isProtocolId1Wallet: Boolean(data.isProtocolId1Wallet),
        referrer: data.referrer || '',
        highestActiveLevel: Number(data.highestActiveLevel || 0),
        activeLevelsCount: Number(data.activeLevelsCount || 0),
        totalReceiptEarnings:
          data.walletCreditedLiquid ||
          data.totalReceiptEarnings ||
          '0.00',
        fgtTotal: data.fgtTotal || '0.00',
        fgtrTotal: data.fgtrTotal || '0.00',
      })
    } catch (err) {
      console.error('Failed to verify dashboard access:', err)
      const message = err?.message || dashboardT('errors.accessFailed', 'Dashboard access could not be verified.')
      setAccessError(message)
      toast.warning(message, { dedupeKey: 'dashboard-access-check-failed' })
      setMemberSummary((prev) => ({ ...prev, isRegistered: false }))
    } finally {
      setIsCheckingRegistration(false)
    }
  }, [account, dashboardT, toast])

  const fetchCommunityStats = useCallback(async () => {
    const payload = await fetchJson('/api/community/stats')
    const data = payload?.data || {}
    const metrics = buildGlobalMetrics({}, data)

    setCommunityStats(metrics)

    setIndexedTreasury((prev) => ({
      ...prev,
      ...metrics,
      nftPool: metrics.nftPool || prev.nftPool || '0.00',
      operations: metrics.operations || prev.operations || '0.00',
    }))
  }, [])

  // const fetchCommunitySummary = useCallback(async () => {
  //   const payload = await fetchJson('/api/community/summary')
  //   const data = payload?.data || {}
  //   const publicData = data.public || {}

  //   setPublicSummary({
  //     totalParticipants: Number(publicData.totalParticipants || 0),
  //     visibleCoreBalanceUsdt: publicData.visibleCoreBalanceUsdt || '0.00',
  //     readLayerStatus: publicData.readLayerStatus || 'Syncing',
  //   })

  //   setTotalParticipants(Number(publicData.totalParticipants || 0))

  //   const metrics = buildGlobalMetrics(publicData, communityStats)

  //   setCommunityStats((prev) => ({
  //     ...prev,
  //     ...metrics,
  //   }))

  //   setIndexedTreasury((prev) => ({
  //     ...prev,
  //     ...metrics,
  //     visibleCoreBalanceUsdt: publicData.visibleCoreBalanceUsdt ?? '0.00',
  //   }))
  // }, [communityStats])



  const fetchCommunitySummary = useCallback(async () => {
  const payload = await fetchJson('/api/community/summary')
  const data = payload?.data || {}
  const publicData = data.public || {}

  setPublicSummary({
    totalParticipants: Number(publicData.totalParticipants || 0),
    visibleCoreBalanceUsdt: publicData.visibleCoreBalanceUsdt || '0.00',
    readLayerStatus: publicData.readLayerStatus || 'Syncing',
  })

  setTotalParticipants(Number(publicData.totalParticipants || 0))

  const metrics = buildGlobalMetrics(publicData, {})

  setCommunityStats((prev) => ({
    ...prev,
    ...metrics,
  }))

  setIndexedTreasury((prev) => ({
    ...prev,
    ...metrics,
    visibleCoreBalanceUsdt: publicData.visibleCoreBalanceUsdt ?? '0.00',
  }))
}, [])

  const fetchGrowthData = useCallback(async () => {
    const payload = await fetchJson('/api/community/growth?days=7')
    const data = payload?.data || {}

    setGrowthData({
      series: Array.isArray(data.series) ? data.series : [],
      rangeDays: Number(data.rangeDays || 7),
    })
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    const payload = await fetchJson('/api/community/announcements')
    const data = payload?.data || {}
    const items = Array.isArray(data.items) ? data.items : []

    setAnnouncements(items.slice(0, 4))
  }, [])

  const fetchSystemHealth = useCallback(async () => {
    try {
      const [healthPayload, indexerPayload] = await Promise.all([
        fetchJson('/api/health'),
        fetchJson('/api/indexer/status').catch(() => null),
      ])

      const syncStates = Array.isArray(indexerPayload?.data?.syncStates)
        ? indexerPayload.data.syncStates
        : []

      const latestBlock = Number(indexerPayload?.data?.latestBlock || 0)

      const hasRunning = syncStates.some((item) => item?.status === 'running')
      const hasError = syncStates.some((item) => item?.status === 'error')
      const lastProcessedBlock = syncStates.reduce((max, item) => {
        const value = Number(item?.lastProcessedBlock || 0)
        return value > max ? value : max
      }, 0)

      let syncLabel = 'Unknown'
      let indexerStatus = 'idle'

      if (!syncStates.length) {
        syncLabel = 'Unavailable'
        indexerStatus = 'idle'
      } else if (hasError) {
        syncLabel = 'Error'
        indexerStatus = 'error'
      } else if (hasRunning) {
        syncLabel = 'Syncing'
        indexerStatus = 'running'
      } else {
        syncLabel = 'Live'
        indexerStatus = 'idle'
      }

      setSystemHealth({
        contracts: healthPayload?.ok ? 'Healthy' : 'Degraded',
        network: 'Connected',
        sync: syncLabel,
        indexerStatus,
        latestBlock,
        lastSyncedBlock: lastProcessedBlock,
      })
    } catch (err) {
      console.error('Failed to fetch system health:', err)
      setSystemHealth((prev) => ({
        ...prev,
        contracts: 'Error',
        sync: 'Error',
      }))
    }
  }, [])

  const refreshAllData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsRefreshing(true)
    }

    setError(null)
    if (!account) {
      setLoading(false)
      setIsCheckingRegistration(false)
      setIsRefreshing(false)
      return
    }

    try {
      const results = await Promise.allSettled([
        fetchMemberSummary(),
        fetchCommunityStats(),
        fetchCommunitySummary(),
        fetchGrowthData(),
        fetchAnnouncements(),
        fetchSystemHealth(),
      ])

      const failed = results.some((result) => result.status === 'rejected')

      if (failed) {
        console.error('One or more dashboard requests failed:', results)
        const message = dashboardT('errors.refreshFailed', 'Some dashboard data could not be refreshed.')
        setError(message)
        if (!silent) toast.warning(message, { dedupeKey: 'dashboard-refresh-partial-failed' })
      } else if (!silent) {
        toast.success(dashboardT('status.refreshed', 'Dashboard refreshed.'), { dedupeKey: 'dashboard-refresh-success' })
      }

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard refresh failed:', err)
      const message = err?.message || dashboardT('errors.refreshFailed', 'Some dashboard data could not be refreshed.')
      setError(message)
      if (!silent) toast.danger(message, { dedupeKey: 'dashboard-refresh-failed' })
    } finally {
      setLoading(false)
      setIsCheckingRegistration(false)
      if (!silent) {
        setIsRefreshing(false)
      }
    }
  }, [
    account,
    fetchAnnouncements,
    fetchCommunityStats,
    fetchCommunitySummary,
    fetchGrowthData,
    fetchMemberSummary,
    fetchSystemHealth,
    dashboardT,
    toast,
  ])

  const generateActivityFeed = useCallback(() => {
    const feed = []

    const growthSeries = Array.isArray(growthData.series) ? growthData.series : []

    growthSeries.forEach((item) => {
      if (!item?.date) return

      const registrations = Number(item.registrations || 0)

      if (registrations <= 0) return

      feed.push({
        id: `growth-${item.date}`,
        icon: UserPlus,
        iconColorClass: 'text-success',
        title: dashboardT('activity.registrationTitle', 'Registration activity'),
        description: dashboardT('activity.registrationDescription', '{{count}} registration{{plural}} recorded.', { count: registrations, plural: registrations === 1 ? '' : 's' }),
        time: formatActivityDate(item.date),
        rawDate: item.date,
        amount: null,
      })
    })

    announcements.forEach((item) => {
      const rawDate = item.createdAt || item.date

      feed.push({
        id: item._id || item.title || rawDate,
        icon: Megaphone,
        iconColorClass: 'text-glow-blue',
        title: item.title || dashboardT('activity.communityUpdate', 'Community update'),
        description: item.content || dashboardT('activity.newAnnouncement', 'New announcement available'),
        time: formatActivityDate(rawDate),
        rawDate,
        amount: null,
      })
    })

    const sortedFeed = feed.sort((a, b) => getActivityTimestamp(b) - getActivityTimestamp(a))

    if (activityDateFilter === 'today') {
      return sortedFeed.filter((item) => isTodayDate(item.rawDate))
    }

    return sortedFeed
  }, [announcements, growthData.series, activityDateFilter, dashboardT])

  useEffect(() => {
    if (!isConnected || !account) {
      setLoading(false)
      setIsCheckingRegistration(false)
      setAccessError('')
      return
    }

    setLoading(true)
    setAccessError('')

    // Only run ONCE — no auto refresh
    refreshAllData({ silent: false })
  }, [isConnected, account])

  const activityFeed = useMemo(() => generateActivityFeed(), [generateActivityFeed])
  const timeSinceUpdate = useMemo(() => {
    if (!lastUpdated) return '—'
    const diffMs = new Date() - lastUpdated
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return dashboardT('time.justNow', 'Just now')
    if (diffMins < 60) return dashboardT('time.minutesAgo', '{{count}}m ago', { count: diffMins })
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffHours < 24) return dashboardT('time.hoursAgo', '{{count}}h ago', { count: diffHours })
    const diffDays = Math.floor(diffMs / 86400000)
    return dashboardT('time.daysAgo', '{{count}}d ago', { count: diffDays })
  }, [lastUpdated, dashboardT])

  if (!isConnected) {
    return (
      <section className="dashboard-page dashboard-access">
        <div className="dashboard-access__card dashboard-surface">
          <span className="dashboard-access__eyebrow">{dashboardT('access.walletRequired.eyebrow', 'Wallet required')}</span>

          <h1>{dashboardT('access.walletRequired.title', 'Connect your wallet to access the F-Freedom dashboard.')}</h1>

          <p className="soft-text">
            {dashboardT('access.walletRequired.text', 'This dashboard is reserved for registered F-Freedom Program participants. Connect your wallet first, then join or learn more about the program.')}
          </p>

          <div className="dashboard-access__actions">
            <a href="/activation" className="dashboard-access__btn dashboard-access__btn--primary">
              {dashboardT('access.actions.join', 'Join F-Freedom Program')}
            </a>

            <a href="/f-freedom-program" className="dashboard-access__btn dashboard-access__btn--ghost">
              {dashboardT('access.actions.learn', 'Learn About the Program')}
            </a>
          </div>
        </div>
      </section>
    )
  }

  if (loading || isCheckingRegistration) {
    return (
      <section className="dashboard-page dashboard-access">
        <div className="dashboard-access__card dashboard-surface">
          <span className="dashboard-access__eyebrow">{dashboardT('access.checking.eyebrow', 'Checking access')}</span>
          <h1>{dashboardT('access.checking.title', 'Verifying your F-Freedom registration...')}</h1>
          <p className="soft-text">
            {dashboardT('access.checking.text', 'Reading your indexed member profile securely.')}
          </p>
        </div>
      </section>
    )
  }

  if (accessError) {
    return (
      <section className="dashboard-page dashboard-access">
        <div className="dashboard-access__card dashboard-surface">
          <span className="dashboard-access__eyebrow">{dashboardT('access.error.eyebrow', 'Access check unavailable')}</span>

          <h1>{dashboardT('access.error.title', 'Dashboard access could not be verified.')}</h1>

          <p className="soft-text">
            {dashboardT('access.error.text', 'The indexed member profile did not respond in time. Your wallet connection is still active; retry the dashboard check or open Activation Center to confirm registration.')}
          </p>

          <p className="soft-text">{accessError}</p>

          <div className="dashboard-access__actions">
            <button
              type="button"
              className="dashboard-access__btn dashboard-access__btn--primary"
              onClick={() => {
                setLoading(true)
                refreshAllData({ silent: false })
              }}
              disabled={isRefreshing}
            >
              {dashboardT('access.actions.retry', 'Retry Access Check')}
            </button>

            <a href="/activation" className="dashboard-access__btn dashboard-access__btn--ghost">
              {dashboardT('access.actions.openActivation', 'Open Activation Center')}
            </a>
          </div>
        </div>
      </section>
    )
  }

  if (!memberSummary.isRegistered) {
    return (
      <section className="dashboard-page dashboard-access">
        <div className="dashboard-access__card dashboard-surface">
          <span className="dashboard-access__eyebrow">{dashboardT('access.membersOnly.eyebrow', 'Registered members only')}</span>

          <h1>{dashboardT('access.membersOnly.title', 'This dashboard is reserved for F-Freedom participants.')}</h1>

          <p className="soft-text">
            {dashboardT('access.membersOnly.text', 'Join the F-Freedom Program to unlock indexed dashboard insights, growth activity, treasury signals, participant visibility, and program-level intelligence.')}
          </p>

          <div className="dashboard-access__actions">
            <a href="/activation" className="dashboard-access__btn dashboard-access__btn--primary">
              {dashboardT('access.actions.join', 'Join F-Freedom Program')}
            </a>

            <a href="/f-freedom-program" className="dashboard-access__btn dashboard-access__btn--ghost">
              {dashboardT('access.actions.learn', 'Learn About the Program')}
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__eyebrow dashboard-surface dashboard-surface--chip">
            <span className="dashboard-hero__eyebrow-dot" />
            <span className="dashboard-hero__eyebrow-text">{dashboardT('hero.eyebrow', 'F-Freedom Program Dashboard')}</span>
          </div>

          <div className="dashboard-hero__text-block">
            <h1 className="dashboard-hero__title">{dashboardT('hero.title', 'F-Freedom Program Intelligence')}</h1>
            <p className="dashboard-hero__description soft-text">
              {dashboardT('hero.description', 'Indexed visibility into F-Freedom participation, receipts, growth activity, treasury signals, and ecosystem movement - without querying the blockchain from the frontend.')}
            </p>
          </div>

          <div className="dashboard-hero__chips">
            <span className="dashboard-hero__chip dashboard-surface dashboard-surface--chip">
              <Wifi
                size={14}
                className={systemHealth.network === 'Connected' ? 'text-success' : 'text-warning'}
              />
              <span>{statusT(systemHealth.network)}</span>
            </span>

            <span className="dashboard-hero__chip dashboard-surface dashboard-surface--chip">
              <Shield
                size={14}
                className={systemHealth.contracts === 'Healthy' ? 'text-success' : 'text-warning'}
              />
              <span>{dashboardT('hero.contractsStatus', 'Contracts: {{status}}', { status: statusT(systemHealth.contracts) })}</span>
            </span>

            <span className="dashboard-hero__chip dashboard-surface dashboard-surface--chip">
              <Activity
                size={14}
                className={
                  systemHealth.sync === 'Live'
                    ? 'text-success'
                    : systemHealth.sync === 'Syncing'
                    ? 'text-info'
                    : 'text-warning'
                }
              />
              <span>{dashboardT('hero.syncStatus', 'Sync: {{status}}', { status: statusT(systemHealth.sync) })}</span>
            </span>

            <button
              type="button"
              className="dashboard-hero__chip dashboard-surface dashboard-surface--chip dashboard-hero__chip--action"
              onClick={() => refreshAllData({ silent: false })}
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
              <span>{dashboardT('hero.updated', 'Updated {{time}}', { time: timeSinceUpdate })}</span>
            </button>
          </div>
        </div>

        <div className="dashboard-hero__visual dashboard-surface">
          <div className="dashboard-hero__visual-header">
            <span className="dashboard-hero__visual-title">{dashboardT('overview.title', 'Network Overview')}</span>
            <span className="dashboard-hero__visual-status">
              {loading ? dashboardT('states.loading', 'Loading...') : publicSummary.readLayerStatus}
            </span>
          </div>

          <div className="dashboard-hero__visual-grid">
            <div className="dashboard-hero__mini-card dashboard-surface dashboard-surface--inner">
              <span className="dashboard-hero__mini-label soft-text">
                <Users size={12} /> {dashboardT('overview.communityMembers', 'Community Members')}
              </span>
              <strong className="dashboard-hero__mini-value">{formatNumber(totalParticipants, 0)}</strong>
            </div>

            <div className="dashboard-hero__mini-card dashboard-surface dashboard-surface--inner">
              <span className="dashboard-hero__mini-label soft-text">
                <Coins size={12} /> {dashboardT('overview.walletCredited', 'Wallet Credited')}
              </span>
              <strong className="dashboard-hero__mini-value">
                ${formatNumber(communityStats.totalWalletCreditedPayouts)}
              </strong>
            </div>

            <div className="dashboard-hero__mini-card dashboard-surface dashboard-surface--inner">
              <span className="dashboard-hero__mini-label soft-text">
                <PiggyBank size={12} /> {dashboardT('overview.currentEscrow', 'Current Escrow')}
              </span>
              <strong className="dashboard-hero__mini-value">
                ${formatNumber(indexedTreasury.currentEscrowLocked)}
              </strong>
            </div>
          </div>

          <div className="dashboard-hero__growth-sparkline">
            <DashboardLineChart series={growthData.series} />
            <span className="soft-text">{dashboardT('overview.registrationTrend', '{{count}}-day registration trend', { count: growthData.rangeDays })}</span>
          </div>
        </div>
      </div>

      <section className="dashboard-stats">
        <div className="dashboard-stats__grid">
          <div
            className="dashboard-stats__card dashboard-surface"
          >
            <span className="dashboard-stats__icon">
              <Users size={20} className="text-glow-blue" />
            </span>
            <span className="dashboard-stats__label soft-text">{dashboardT('stats.registeredMembers.label', 'Registered Members')}</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
              <AnimatedNumber value={totalParticipants} decimals={0} suffix="+" />
            </strong>
            <small className="dashboard-stats__note soft-text">
              {dashboardT('stats.registeredMembers.note', 'Indexed F-Freedom participants.')}
            </small>
          </div>

          <div
            className="dashboard-stats__card dashboard-surface"
          >
            <span className="dashboard-stats__icon">
              <Coins size={20} className="text-glow-teal" />
            </span>
            <span className="dashboard-stats__label soft-text">{dashboardT('stats.walletPayouts.label', 'Wallet Credited Payouts')}</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
      <AnimatedNumber value={communityStats.totalWalletCreditedPayouts} prefix="$" decimals={2} />
            </strong>
            <small className="dashboard-stats__note soft-text">
              {dashboardT('stats.walletPayouts.note', 'Indexed total distributions.')}
            </small>
          </div>

          <div
            className="dashboard-stats__card dashboard-surface"
          >
            <span className="dashboard-stats__icon">
              <PiggyBank size={20} className="text-glow-purple" />
            </span>
            <span className="dashboard-stats__label soft-text">{dashboardT('stats.currentEscrow.label', 'Current Escrow Locked')}</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
              <AnimatedNumber value={communityStats.currentEscrowLocked} prefix="$" decimals={2} />
            </strong>
            <small className="dashboard-stats__note soft-text">
              {dashboardT('stats.currentEscrow.note', 'Live indexed escrow still waiting for upgrade.')}
            </small>
          </div>

          <div
            className="dashboard-stats__card dashboard-surface"
          >
            <span className="dashboard-stats__icon">
              <Shield size={20} className="text-warning" />
            </span>
            <span className="dashboard-stats__label soft-text">{dashboardT('stats.nftPool.label', 'NFT Pool')}</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
              <AnimatedNumber value={communityStats.nftRewardPool?.currentBalance || communityStats.nftPoolLiveBalance} prefix="$" decimals={2} />
            </strong>
            <div className="dashboard-stats__breakdown">
              <span>{dashboardT('stats.nftPool.totalInflow', 'Total Inflow')}: ${formatNumber(communityStats.nftRewardPool?.totalInflow || communityStats.nftPoolAllocated, 2)}</span>
              <span>{dashboardT('stats.nftPool.totalDistributed', 'Total Distributed')}: ${formatNumber(communityStats.nftRewardPool?.totalDistributed || communityStats.nftPoolDistributed, 2)}</span>
              <span>{dashboardT('stats.nftPool.currentBalance', 'Current Balance')}: ${formatNumber(communityStats.nftRewardPool?.currentBalance || communityStats.nftPoolLiveBalance, 2)}</span>
            </div>
            <small className="dashboard-stats__note soft-text">
              {dashboardT('stats.nftPool.note', 'Indexed NFT Reward Pool truth from the backend.')}
            </small>
          </div>

          <div
            className="dashboard-stats__card dashboard-surface"
          >
            <span className="dashboard-stats__icon">
              <Activity size={20} className="text-glow-purple" />
            </span>
            <span className="dashboard-stats__label soft-text">{dashboardT('stats.operations.accumulatedLabel', 'Operations Total Accumulated')}</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
              <AnimatedNumber value={communityStats.devOperations?.totalInflow || communityStats.operationsAllocated} prefix="$" decimals={2} />
            </strong>
            <div className="dashboard-stats__breakdown">
              <span>{dashboardT('stats.operations.totalInflow', 'Total Inflow')}: ${formatNumber(communityStats.devOperations?.totalInflow || communityStats.operationsAllocated, 2)}</span>
              <span>{dashboardT('stats.operations.totalUtilized', 'Total Utilized')}: ${formatNumber(communityStats.devOperations?.totalUtilized || communityStats.operationsUtilized, 2)}</span>
              <span>{dashboardT('stats.operations.currentBalance', 'Current Balance')}: ${formatNumber(communityStats.devOperations?.currentBalance || communityStats.operationsLiveBalance, 2)}</span>
            </div>
            <small className="dashboard-stats__note soft-text">
              {dashboardT('stats.operations.note', 'Indexed Dev & Operations truth from the backend.')}
            </small>
          </div>
        </div>
      </section>

      <section className="dashboard-activity dashboard-surface dashboard-section-full">
        <div className="dashboard-section-heading dashboard-section-heading--row">
          <div>
            <span className="dashboard-section-heading__eyebrow soft-text">{dashboardT('activity.eyebrow', 'Activity')}</span>
            <h2 className="dashboard-section-heading__title">{dashboardT('activity.title', 'Recent Network Activity')}</h2>
          </div>

          <div className="dashboard-activity-filter" aria-label={dashboardT('activity.filterAriaLabel', 'Filter activity by date')}>
            <button
              type="button"
              className={activityDateFilter === 'today' ? 'is-active' : ''}
              onClick={() => setActivityDateFilter('today')}
            >
              {dashboardT('activity.filters.today', 'Today')}
            </button>

            <button
              type="button"
              className={activityDateFilter === 'all' ? 'is-active' : ''}
              onClick={() => setActivityDateFilter('all')}
            >
              {dashboardT('activity.filters.all', 'All')}
            </button>
          </div>
        </div>

        <div className="dashboard-activity__list">
          {activityFeed.length > 0 ? (
            activityFeed.map((item, index) => {
              const Icon = item.icon

              return (
                <div
                  key={item.id}
                  className="dashboard-activity__item dashboard-surface dashboard-surface--inner"
                >
                  <span className="dashboard-activity__icon">
                    <Icon size={18} className={item.iconColorClass} />
                  </span>

                  <div className="dashboard-activity__content">
                    <span className="dashboard-activity__title">{item.title}</span>
                    <p className="dashboard-activity__text soft-text">{item.description}</p>

                    {item.amount ? (
                      <span className="dashboard-activity__amount">${formatNumber(item.amount)}</span>
                    ) : null}
                  </div>

                  <span className="dashboard-activity__time soft-text">{item.time}</span>
                </div>
              )
            })
          ) : (
            <div className="dashboard-progress__placeholder">
              <span className="soft-text">
                {activityDateFilter === 'today'
                  ? dashboardT('activity.emptyToday', 'No activity recorded today. Switch to All to view previous activity.')
                  : dashboardT('activity.emptyAll', 'Activity will appear here...')}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-reference dashboard-surface dashboard-section-full">
        <div className="dashboard-section-heading">
          <span className="dashboard-section-heading__eyebrow soft-text">{dashboardT('reference.eyebrow', 'Reference Layer')}</span>
          <h2 className="dashboard-section-heading__title">{dashboardT('reference.title', 'Smart Contract Directory')}</h2>
        </div>

        <div className="dashboard-reference__grid dashboard-reference__grid--contracts-only">
          <div className="dashboard-reference__column">
            <div className="dashboard-reference__subhead">
              <span className="soft-text">{dashboardT('reference.onChain', 'On-Chain Reference')}</span>
              <h3>{dashboardT('reference.title', 'Smart Contract Directory')}</h3>
            </div>

            <div className="dashboard-contracts__grid">
              {contractDirectory.map((item, index) => (
                <article
                  key={item.key}
                  className="dashboard-contracts__card dashboard-surface dashboard-surface--inner"
                >
                  <div className="dashboard-contracts__header">
                    <span className="dashboard-contracts__label">{item.label}</span>
                    <a
                      className="dashboard-contracts__link"
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Link2 size={14} />
                      <span>{dashboardT('reference.view', 'View')}</span>
                    </a>
                  </div>

                  <code className="dashboard-contracts__address">{item.address}</code>
                  <p className="dashboard-contracts__note soft-text">{item.note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </section>
  )
}

export default DashboardPage
