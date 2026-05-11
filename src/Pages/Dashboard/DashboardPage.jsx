import './DashboardPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { useWallet } from '../../hooks/useWallet'
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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'https://fin-freedom-backend-3.onrender.com'

const AMOY_EXPLORER_BASE = 'https://amoy.polygonscan.com/address'

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
  if (!value) return 'Date unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatActivityDate = (value) => {
  if (!value) return 'Date unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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

const emptyCommunityStats = {
  totalUsers: 0,
  totalReceipts: 0,
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
  if (!Array.isArray(series) || series.length === 0) {
    return (
      <div className="dashboard-progress__placeholder">
        <span className="soft-text">Growth data initializing...</span>
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
  const { isConnected, account } = useWallet()

  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [error, setError] = useState(null)

  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true)
  const [memberSummary, setMemberSummary] = useState({
    isRegistered: false,
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
    totalLiquid: '0.00',
    totalGross: '0.00',
    totalEscrow: '0.00',
    nftPool: '0.00',
    operations: '0.00',
  })

  const [communityStats, setCommunityStats] = useState(emptyCommunityStats)
  const [publicSummary, setPublicSummary] = useState(emptyPublicSummary)
  const [growthData, setGrowthData] = useState(emptyGrowthData)
  const [systemHealth, setSystemHealth] = useState(emptySystemHealth)
  const [announcements, setAnnouncements] = useState([])

  const contractDirectory = useMemo(() => {
    const env = import.meta.env || {}

    return [
      {
        key: 'registration',
        label: 'Registration Contract',
        address:
          env.VITE_REGISTRATION_ADDRESS ||
          '0x782FE376de66a3866e972D119a4a5D6E6B897Bac',
        note: 'Manages identity, registration status, and participant records.',
      },
      {
        key: 'level-manager',
        label: 'Level Manager',
        address:
          env.VITE_LEVELMANAGER_ADDRESS ||
          '0xb4605C2a9B7e591240Eff49B13D7B638C15e6168',
        note: 'Controls level upgrades, reward routing, and system logic.',
      },
      {
        key: 'escrow',
        label: 'Auto-Upgrade Escrow',
        address:
          env.VITE_ESCROW_ADDRESS ||
          '0x605B01408548655b5C73AF48c5f5B4A780BbB7eB',
        note: 'Holds reserved liquidity for automated upgrades.',
      },
      {
        key: 'p4',
        label: 'P4 Orbit',
        address:
          env.VITE_P4_ORBIT_ADDRESS ||
          '0x147d5b7269f9BC6c27E31a3BDF352fe4d315847F',
        note: 'Entry-level orbit with 4 positions.',
      },
      {
        key: 'p12',
        label: 'P12 Orbit',
        address:
          env.VITE_P12_ORBIT_ADDRESS ||
          '0xd2E2605e5b2326272B53A5A9a7f5F0e3F648E6Ce',
        note: 'Growth orbit with 12 positions for broader reach.',
      },
      {
        key: 'p39',
        label: 'P39 Orbit',
        address:
          env.VITE_P39_ORBIT_ADDRESS ||
          '0xFDb2dbfb5D86bf05BEa334F84F8672aEb0eafe6a',
        note: 'Expansion orbit with 39 positions for deeper progression.',
      },
    ].map((item) => ({
      ...item,
      href: item.address ? `${AMOY_EXPLORER_BASE}/${item.address}` : '#',
    }))
  }, [])

  useEffect(() => {
    AOS.init({
      duration: 900,
      easing: 'ease-out-cubic',
      once: false,
      mirror: true,
      offset: 80,
    })

    const refreshTimer = window.setTimeout(() => {
      AOS.refreshHard()
    }, 300)

    return () => window.clearTimeout(refreshTimer)
  }, [])

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      AOS.refreshHard()
    }, 250)

    return () => window.clearTimeout(refreshTimer)
  }, [
    totalParticipants,
    communityStats.totalLiquid,
    communityStats.totalEscrow,
    indexedTreasury.nftPool,
    indexedTreasury.operations,
    activityDateFilter,
    announcements.length,
    growthData.series.length,
  ])

  const fetchMemberSummary = useCallback(async () => {
    if (!account) {
      setIsCheckingRegistration(false)
      setMemberSummary((prev) => ({ ...prev, isRegistered: false }))
      return
    }

    setIsCheckingRegistration(true)

    try {
      const payload = await fetchJson(`/api/community/member/${account}/summary`)
      const data = payload?.data || {}

      setMemberSummary({
        isRegistered: Boolean(data.isRegistered),
        referrer: data.referrer || '',
        highestActiveLevel: Number(data.highestActiveLevel || 0),
        activeLevelsCount: Number(data.activeLevelsCount || 0),
        totalReceiptEarnings: data.totalReceiptEarnings || '0.00',
        fgtTotal: data.fgtTotal || '0.00',
        fgtrTotal: data.fgtrTotal || '0.00',
      })
    } catch (err) {
      console.error('Failed to verify dashboard access:', err)
      setMemberSummary((prev) => ({ ...prev, isRegistered: false }))
    } finally {
      setIsCheckingRegistration(false)
    }
  }, [account])

  const fetchCommunityStats = useCallback(async () => {
    const payload = await fetchJson('/api/community/stats')
    const data = payload?.data || {}

    setCommunityStats({
      totalUsers: Number(data.totalUsers || 0),
      totalReceipts: Number(data.totalReceipts || 0),
      totalLiquid: data.totalLiquid || '0.00',
      totalGross: data.totalGross || '0.00',
      totalEscrow: data.totalEscrow || '0.00',
    })

    setIndexedTreasury((prev) => ({
      ...prev,
      totalLiquid: data.totalLiquid ?? '0.00',
      totalGross: data.totalGross ?? '0.00',
      totalEscrow: data.totalEscrow ?? '0.00',
      nftPool:
        data.nftPool ??
        data.nftPoolBalance ??
        data.nftPoolBalanceUsdt ??
        data.totalNftPool ??
        data.nftBalance ??
        prev.nftPool ??
        '0.00',
      operations:
        data.operations ??
        data.operationsBalance ??
        data.operationsBalanceUsdt ??
        data.opsBalance ??
        data.opsWalletBalance ??
        data.totalOperations ??
        prev.operations ??
        '0.00',
    }))
  }, [])

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

    setIndexedTreasury((prev) => ({
      ...prev,
      visibleCoreBalanceUsdt: publicData.visibleCoreBalanceUsdt ?? '0.00',
      nftPool:
        publicData.nftPool ??
        publicData.nftPoolBalance ??
        publicData.nftPoolBalanceUsdt ??
        publicData.totalNftPool ??
        prev.nftPool ??
        '0.00',
      operations:
        publicData.operations ??
        publicData.operationsBalance ??
        publicData.operationsBalanceUsdt ??
        publicData.opsBalance ??
        publicData.opsWalletBalance ??
        publicData.totalOperations ??
        prev.operations ??
        '0.00',
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
      setError('Some dashboard data could not be refreshed.')
    }

    setLastUpdated(new Date())

    if (!silent) {
      setIsRefreshing(false)
    }

    setLoading(false)
  }, [
    fetchAnnouncements,
    fetchCommunityStats,
    fetchCommunitySummary,
    fetchGrowthData,
    fetchMemberSummary,
    fetchSystemHealth,
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
        title: 'Registration activity',
        description: `${registrations} registration${registrations === 1 ? '' : 's'} recorded.`,
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
        title: item.title || 'Community update',
        description: item.content || 'New announcement available',
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
  }, [announcements, growthData.series, activityDateFilter])

  useEffect(() => {
    if (!isConnected || !account) {
      setLoading(false)
      setIsCheckingRegistration(false)
      return
    }

    setLoading(true)

    // Only run ONCE — no auto refresh
    refreshAllData({ silent: false })
  }, [isConnected, account, refreshAllData])

  const activityFeed = useMemo(() => generateActivityFeed(), [generateActivityFeed])
  const timeSinceUpdate = useMemo(() => {
    if (!lastUpdated) return '—'
    const diffMs = new Date() - lastUpdated
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffMs / 86400000)
    return `${diffDays}d ago`
  }, [lastUpdated])

  if (!isConnected) {
    return (
      <section className="dashboard-page dashboard-access">
        <div className="dashboard-access__card dashboard-surface">
          <span className="dashboard-access__eyebrow">Wallet required</span>

          <h1>Connect your wallet to access the F-Freedom dashboard.</h1>

          <p className="soft-text">
            This dashboard is reserved for registered F-Freedom Program participants.
            Connect your wallet first, then join or learn more about the program.
          </p>

          <div className="dashboard-access__actions">
            <a href="/activation" className="dashboard-access__btn dashboard-access__btn--primary">
              Join F-Freedom Program
            </a>

            <a href="/f-freedom-program" className="dashboard-access__btn dashboard-access__btn--ghost">
              Learn About the Program
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
          <span className="dashboard-access__eyebrow">Checking access</span>
          <h1>Verifying your F-Freedom registration...</h1>
          <p className="soft-text">
            Reading your indexed member profile securely.
          </p>
        </div>
      </section>
    )
  }

  if (!memberSummary.isRegistered) {
    return (
      <section className="dashboard-page dashboard-access">
        <div className="dashboard-access__card dashboard-surface">
          <span className="dashboard-access__eyebrow">Registered members only</span>

          <h1>This dashboard is reserved for F-Freedom participants.</h1>

          <p className="soft-text">
            Join the F-Freedom Program to unlock indexed dashboard insights, growth activity,
            treasury signals, participant visibility, and program-level intelligence.
          </p>

          <div className="dashboard-access__actions">
            <a href="/activation" className="dashboard-access__btn dashboard-access__btn--primary">
              Join F-Freedom Program
            </a>

            <a href="/f-freedom-program" className="dashboard-access__btn dashboard-access__btn--ghost">
              Learn About the Program
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
            <span className="dashboard-hero__eyebrow-text">F-Freedom Program Dashboard</span>
          </div>

          <div className="dashboard-hero__text-block">
            <h1 className="dashboard-hero__title">F-Freedom Program Intelligence</h1>
            <p className="dashboard-hero__description soft-text">
              Indexed visibility into F-Freedom participation, receipts, growth activity,
              treasury signals, and ecosystem movement — without querying the blockchain from the frontend.
            </p>
          </div>

          <div className="dashboard-hero__chips">
            <span className="dashboard-hero__chip dashboard-surface dashboard-surface--chip">
              <Wifi
                size={14}
                className={systemHealth.network === 'Connected' ? 'text-success' : 'text-warning'}
              />
              <span>{systemHealth.network}</span>
            </span>

            <span className="dashboard-hero__chip dashboard-surface dashboard-surface--chip">
              <Shield
                size={14}
                className={systemHealth.contracts === 'Healthy' ? 'text-success' : 'text-warning'}
              />
              <span>Contracts: {systemHealth.contracts}</span>
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
              <span>Sync: {systemHealth.sync}</span>
            </span>

            <button
              type="button"
              className="dashboard-hero__chip dashboard-surface dashboard-surface--chip dashboard-hero__chip--action"
              onClick={() => refreshAllData({ silent: false })}
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
              <span>Updated {timeSinceUpdate}</span>
            </button>
          </div>
        </div>

        <div className="dashboard-hero__visual dashboard-surface">
          <div className="dashboard-hero__visual-header">
            <span className="dashboard-hero__visual-title">Network Overview</span>
            <span className="dashboard-hero__visual-status">
              {loading ? 'Loading...' : publicSummary.readLayerStatus}
            </span>
          </div>

          <div className="dashboard-hero__visual-grid">
            <div className="dashboard-hero__mini-card dashboard-surface dashboard-surface--inner">
              <span className="dashboard-hero__mini-label soft-text">
                <Users size={12} /> Community Members
              </span>
              <strong className="dashboard-hero__mini-value">{formatNumber(totalParticipants, 0)}</strong>
            </div>

            <div className="dashboard-hero__mini-card dashboard-surface dashboard-surface--inner">
              <span className="dashboard-hero__mini-label soft-text">
                <Coins size={12} /> Liquid Paid
              </span>
              <strong className="dashboard-hero__mini-value">
                ${formatNumber(communityStats.totalLiquid)}
              </strong>
            </div>

            <div className="dashboard-hero__mini-card dashboard-surface dashboard-surface--inner">
              <span className="dashboard-hero__mini-label soft-text">
                <PiggyBank size={12} /> Current Escrow
              </span>
              <strong className="dashboard-hero__mini-value">
                ${formatNumber(indexedTreasury.totalEscrow)}
              </strong>
            </div>
          </div>

          <div className="dashboard-hero__growth-sparkline">
            <DashboardLineChart series={growthData.series} />
            <span className="soft-text">{growthData.rangeDays}-day registration trend</span>
          </div>
        </div>
      </div>

      <section className="dashboard-stats">
        <div className="dashboard-stats__grid">
          <div
            className="dashboard-stats__card dashboard-surface"
            data-aos="fade-up-right"
            data-aos-delay="0"
            data-aos-duration="950"
          >
            <span className="dashboard-stats__icon">
              <Users size={20} className="text-glow-blue" />
            </span>
            <span className="dashboard-stats__label soft-text">Registered Members</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
              <AnimatedNumber value={totalParticipants} decimals={0} suffix="+" />
            </strong>
            <small className="dashboard-stats__note soft-text">
              Indexed F-Freedom participants.
            </small>
          </div>

          <div
            className="dashboard-stats__card dashboard-surface"
            data-aos="zoom-in-up"
            data-aos-delay="90"
            data-aos-duration="950"
          >
            <span className="dashboard-stats__icon">
              <Coins size={20} className="text-glow-teal" />
            </span>
            <span className="dashboard-stats__label soft-text">Total PAYOUT FROM F-FREEDOM</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
              <AnimatedNumber value={communityStats.totalLiquid} prefix="$" decimals={2} />
            </strong>
            <small className="dashboard-stats__note soft-text">
              Indexed total distributions.
            </small>
          </div>

          <div
            className="dashboard-stats__card dashboard-surface"
            data-aos="fade-up-left"
            data-aos-delay="180"
            data-aos-duration="950"
          >
            <span className="dashboard-stats__icon">
              <PiggyBank size={20} className="text-glow-purple" />
            </span>
            <span className="dashboard-stats__label soft-text">ESCROW FOR AUTO UPGRADE</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
              <AnimatedNumber value={communityStats.totalEscrow} prefix="$" decimals={2} />
            </strong>
            <small className="dashboard-stats__note soft-text">
              Indexed escrow allocation
            </small>
          </div>

          <div
            className="dashboard-stats__card dashboard-surface"
            data-aos="fade-up-right"
            data-aos-delay="270"
            data-aos-duration="950"
          >
            <span className="dashboard-stats__icon">
              <Shield size={20} className="text-warning" />
            </span>
            <span className="dashboard-stats__label soft-text">NFT Pool</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
              <AnimatedNumber value={indexedTreasury.nftPool} prefix="$" decimals={2} />
            </strong>
            <small className="dashboard-stats__note soft-text">
              Indexed NFT pool allocation from the F-Freedom.
            </small>
          </div>

          <div
            className="dashboard-stats__card dashboard-surface"
            data-aos="zoom-in-up"
            data-aos-delay="360"
            data-aos-duration="950"
          >
            <span className="dashboard-stats__icon">
              <Activity size={20} className="text-glow-purple" />
            </span>
            <span className="dashboard-stats__label soft-text">Ecosystem Dev & Operations</span>
            <strong className="dashboard-stats__value dashboard-stats__value--animated">
              <AnimatedNumber value={indexedTreasury.operations} prefix="$" decimals={2} />
            </strong>
            <small className="dashboard-stats__note soft-text">
              Indexed operations allocation from the F-Freedom.
            </small>
          </div>
        </div>
      </section>

      <section className="dashboard-activity dashboard-surface dashboard-section-full">
        <div className="dashboard-section-heading dashboard-section-heading--row">
          <div>
            <span className="dashboard-section-heading__eyebrow soft-text">Activity</span>
            <h2 className="dashboard-section-heading__title">Recent Network Activity</h2>
          </div>

          <div className="dashboard-activity-filter" aria-label="Filter activity by date">
            <button
              type="button"
              className={activityDateFilter === 'today' ? 'is-active' : ''}
              onClick={() => setActivityDateFilter('today')}
            >
              Today
            </button>

            <button
              type="button"
              className={activityDateFilter === 'all' ? 'is-active' : ''}
              onClick={() => setActivityDateFilter('all')}
            >
              All
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
                  data-aos={index % 2 === 0 ? 'fade-up-right' : 'fade-up-left'}
                  data-aos-delay={(index % 4) * 80}
                  data-aos-duration="900"
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
                  ? 'No activity recorded today. Switch to All to view previous activity.'
                  : 'Activity will appear here...'}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-reference dashboard-surface dashboard-section-full">
        <div className="dashboard-section-heading">
          <span className="dashboard-section-heading__eyebrow soft-text">Reference Layer</span>
          <h2 className="dashboard-section-heading__title">Smart Contract Directory</h2>
        </div>

        <div className="dashboard-reference__grid dashboard-reference__grid--contracts-only">
          <div className="dashboard-reference__column">
            <div className="dashboard-reference__subhead">
              <span className="soft-text">On-Chain Reference</span>
              <h3>Smart Contract Directory</h3>
            </div>

            <div className="dashboard-contracts__grid">
              {contractDirectory.map((item, index) => (
                <article
                  key={item.key}
                  className="dashboard-contracts__card dashboard-surface dashboard-surface--inner"
                  data-aos={index % 3 === 0 ? 'fade-up-right' : index % 3 === 1 ? 'zoom-in-up' : 'fade-up-left'}
                  data-aos-delay={(index % 6) * 90}
                  data-aos-duration="950"
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
                      <span>View</span>
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