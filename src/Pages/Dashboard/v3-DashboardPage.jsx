import './DashboardPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { CONTRACT_ADDRESSES } from '../../constants/addresses'
import { ethers } from 'ethers'
import {
  Activity,
  Shield,
  Wifi,
  Coins,
  Wallet,
  PiggyBank,
  Building2,
  CircleDollarSign,
  RefreshCw,
  Receipt,
  UserPlus,
  Users,
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

const formatUsdtString = (value, decimals = 2) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return decimals === 0 ? '0' : '0.00'
  return formatNumber(num, decimals)
}

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '—'

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

const shortenAddress = (value) => {
  if (!value) return 'Unavailable'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
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
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polylinePoints}
          />
          {coordinates.map((point, index) => (
            <circle
              key={`${point.date || index}-${index}`}
              cx={point.x}
              cy={point.y}
              r="2.6"
              fill="var(--glow-teal)"
            />
          ))}
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
  const { isConnected } = useWallet()
  const { contracts, loadContracts } = useContracts()

  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [error, setError] = useState(null)

  const [contractBalances, setContractBalances] = useState({
    ESCROW: '0.00',
    LEVEL_MANAGER: '0.00',
    P4: '0.00',
    P12: '0.00',
    P39: '0.00',
  })

  const [totalParticipants, setTotalParticipants] = useState(0)
  const [nftBalance, setNftBalance] = useState('0.00')
  const [opsBalance, setOpsBalance] = useState('0.00')
  const [totalFees, setTotalFees] = useState('0.00')

  const [communityStats, setCommunityStats] = useState(emptyCommunityStats)
  const [publicSummary, setPublicSummary] = useState(emptyPublicSummary)
  const [growthData, setGrowthData] = useState(emptyGrowthData)
  const [systemHealth, setSystemHealth] = useState(emptySystemHealth)
  const [announcements, setAnnouncements] = useState([])

  const safeReadContract = useCallback(async (fn, fallback) => {
    try {
      return await fn()
    } catch {
      return fallback
    }
  }, [])

  const contractDirectory = useMemo(() => {
    const env = import.meta.env || {}

    return [
      {
        key: 'registration',
        label: 'Registration Contract',
        address:
          CONTRACT_ADDRESSES?.REGISTRATION ||
          env.VITE_REGISTRATION_ADDRESS ||
          '0x782FE376de66a3866e972D119a4a5D6E6B897Bac',
        note: 'Identity entry, registration state, and participant lookup.',
      },
      {
        key: 'level-manager',
        label: 'Level Manager',
        address:
          CONTRACT_ADDRESSES?.LEVEL_MANAGER ||
          env.VITE_LEVELMANAGER_ADDRESS ||
          '0xb4605C2a9B7e591240Eff49B13D7B638C15e6168',
        note: 'Level progression control, treasury routing, and system orchestration.',
      },
      {
        key: 'escrow',
        label: 'Auto-Upgrade Escrow',
        address:
          CONTRACT_ADDRESSES?.ESCROW ||
          env.VITE_ESCROW_ADDRESS ||
          '0x605B01408548655b5C73AF48c5f5B4A780BbB7eB',
        note: 'Reserved upgrade liquidity held for deterministic release paths.',
      },
      {
        key: 'p4',
        label: 'P4 Orbit',
        address:
          CONTRACT_ADDRESSES?.P4_ORBIT ||
          env.VITE_P4_ORBIT_ADDRESS ||
          '0x147d5b7269f9BC6c27E31a3BDF352fe4d315847F',
        note: 'Compact orbit structure used for fast-entry positioning.',
      },
      {
        key: 'p12',
        label: 'P12 Orbit',
        address:
          CONTRACT_ADDRESSES?.P12_ORBIT ||
          env.VITE_P12_ORBIT_ADDRESS ||
          '0xd2E2605e5b2326272B53A5A9a7f5F0e3F648E6Ce',
        note: 'Growth orbit structure with broader layered movement.',
      },
      {
        key: 'p39',
        label: 'P39 Orbit',
        address:
          CONTRACT_ADDRESSES?.P39_ORBIT ||
          env.VITE_P39_ORBIT_ADDRESS ||
          '0xFDb2dbfb5D86bf05BEa334F84F8672aEb0eafe6a',
        note: 'Expansion orbit structure designed for deeper progression visibility.',
      },
    ].map((item) => ({
      ...item,
      href: item.address ? `${AMOY_EXPLORER_BASE}/${item.address}` : '#',
    }))
  }, [])

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

  const fetchBlockchainData = useCallback(async () => {
    if (!contracts?.usdt || !contracts?.registration) return

    try {
      const targets = [
        ['ESCROW', CONTRACT_ADDRESSES.ESCROW],
        ['LEVEL_MANAGER', CONTRACT_ADDRESSES.LEVEL_MANAGER],
        ['P4', CONTRACT_ADDRESSES.P4_ORBIT],
        ['P12', CONTRACT_ADDRESSES.P12_ORBIT],
        ['P39', CONTRACT_ADDRESSES.P39_ORBIT],
      ]

      const balanceEntries = await Promise.all(
        targets.map(async ([key, address]) => {
          const raw = await safeReadContract(() => contracts.usdt.balanceOf(address), 0n)
          return [key, ethers.formatUnits(raw || 0n, 6)]
        })
      )

      const balances = Object.fromEntries(balanceEntries)
      setContractBalances(balances)

      const participants = await safeReadContract(() => contracts.registration.totalParticipants(), 0n)
      setTotalParticipants(Number(participants || 0))

      let nft = 0
      let ops = 0

      if (contracts?.levelManager) {
        const nftPool = await safeReadContract(() => contracts.levelManager.nftPool(), null)
        const opsWallet = await safeReadContract(() => contracts.levelManager.operationsWallet(), null)

        const [nftRaw, opsRaw] = await Promise.all([
          nftPool ? safeReadContract(() => contracts.usdt.balanceOf(nftPool), 0n) : 0n,
          opsWallet ? safeReadContract(() => contracts.usdt.balanceOf(opsWallet), 0n) : 0n,
        ])

        nft = Number(ethers.formatUnits(nftRaw || 0n, 6))
        ops = Number(ethers.formatUnits(opsRaw || 0n, 6))
      }

      setNftBalance(nft.toFixed(2))
      setOpsBalance(ops.toFixed(2))
      setTotalFees((nft + ops).toFixed(2))
    } catch (err) {
      console.error('Failed to fetch blockchain data:', err)
      setError('Failed to load blockchain data')
    }
  }, [contracts, safeReadContract])

  const generateActivityFeed = useCallback(() => {
    const feed = []

    if (totalParticipants > 0) {
      feed.push({
        id: 'participants',
        icon: UserPlus,
        iconColorClass: 'text-success',
        title: 'Participant count updated',
        description: `${formatNumber(totalParticipants, 0)} total registered participants`,
        time: formatRelativeTime(lastUpdated),
        amount: null,
      })
    }

    const totalLiquid = Number(communityStats.totalLiquid || 0)
    if (totalLiquid > 0) {
      feed.push({
        id: 'liquid',
        icon: Coins,
        iconColorClass: 'text-glow-teal',
        title: 'Liquid earnings recorded',
        description: `$${formatNumber(totalLiquid)} total liquid paid across receipts`,
        time: 'All time',
        amount: totalLiquid,
      })
    }

    if (communityStats.totalReceipts > 0) {
      feed.push({
        id: 'receipts',
        icon: Receipt,
        iconColorClass: 'text-warning',
        title: 'Receipt ledger growing',
        description: `${formatNumber(communityStats.totalReceipts, 0)} payout receipts recorded`,
        time: 'All time',
        amount: null,
      })
    }

    if (Number(contractBalances.ESCROW || 0) > 0) {
      feed.push({
        id: 'escrow',
        icon: PiggyBank,
        iconColorClass: 'text-glow-purple',
        title: 'Current escrow visible',
        description: `$${formatNumber(contractBalances.ESCROW)} currently held in escrow`,
        time: formatRelativeTime(lastUpdated),
        amount: Number(contractBalances.ESCROW || 0),
      })
    }

    if (announcements.length > 0) {
      feed.push({
        id: 'announcement',
        icon: Megaphone,
        iconColorClass: 'text-glow-blue',
        title: announcements[0].title || 'New announcement',
        description: announcements[0].content || 'Community update available',
        time: announcements[0].createdAt
          ? formatRelativeTime(announcements[0].createdAt)
          : 'Recent',
        amount: null,
      })
    }

    return feed.slice(0, 6)
  }, [announcements, communityStats, contractBalances, lastUpdated, totalParticipants])

  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)

    const results = await Promise.allSettled([
      fetchCommunityStats(),
      fetchCommunitySummary(),
      fetchGrowthData(),
      fetchAnnouncements(),
      fetchSystemHealth(),
      fetchBlockchainData(),
    ])

    const failed = results.some((result) => result.status === 'rejected')
    if (failed) {
      console.error('One or more dashboard requests failed:', results)
      setError('Some dashboard data could not be refreshed.')
    }

    setLastUpdated(new Date())
    setIsRefreshing(false)
    setLoading(false)
  }, [
    fetchAnnouncements,
    fetchBlockchainData,
    fetchCommunityStats,
    fetchCommunitySummary,
    fetchGrowthData,
    fetchSystemHealth,
  ])

  useEffect(() => {
    loadContracts().catch((err) => {
      console.error('Failed to load contracts:', err)
    })
  }, [loadContracts])

  useEffect(() => {
    if (!contracts) return

    setLoading(true)
    refreshAllData()

    const interval = window.setInterval(() => {
      refreshAllData()
    }, 30000)

    return () => window.clearInterval(interval)
  }, [contracts, refreshAllData])

  const activityFeed = useMemo(() => generateActivityFeed(), [generateActivityFeed])

  const totalProtocolVolume = useMemo(() => {
    const fees = Number(totalFees) || 0
    const liquid = Number(communityStats.totalLiquid) || 0
    return fees + liquid
  }, [totalFees, communityStats.totalLiquid])

  const timeSinceUpdate = useMemo(() => formatRelativeTime(lastUpdated), [lastUpdated])

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__eyebrow dashboard-surface dashboard-surface--chip">
            <span className="dashboard-hero__eyebrow-dot" />
            <span className="dashboard-hero__eyebrow-text">Real-time protocol intelligence</span>
          </div>

          <div className="dashboard-hero__text-block">
            <h1 className="dashboard-hero__title">Protocol Intelligence Dashboard</h1>
            <p className="dashboard-hero__description soft-text">
              Production-grade visibility into contract state, treasury routing, participant growth,
              announcements, and live network health across the Fin Freedom ecosystem.
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
              onClick={refreshAllData}
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
                <Receipt size={12} /> Receipts
              </span>
              <strong className="dashboard-hero__mini-value">
                {formatNumber(communityStats.totalReceipts, 0)}
              </strong>
            </div>

            <div className="dashboard-hero__mini-card dashboard-surface dashboard-surface--inner">
              <span className="dashboard-hero__mini-label soft-text">
                <Coins size={12} /> Liquid Paid
              </span>
              <strong className="dashboard-hero__mini-value">
                ${formatUsdtString(communityStats.totalLiquid)}
              </strong>
            </div>

            <div className="dashboard-hero__mini-card dashboard-surface dashboard-surface--inner">
              <span className="dashboard-hero__mini-label soft-text">
                <PiggyBank size={12} /> Current Escrow
              </span>
              <strong className="dashboard-hero__mini-value">
                ${formatUsdtString(contractBalances.ESCROW)}
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
          <div className="dashboard-stats__card dashboard-surface">
            <span className="dashboard-stats__icon">
              <CircleDollarSign size={20} className="text-glow-teal" />
            </span>
            <span className="dashboard-stats__label soft-text">Protocol Volume</span>
            <strong className="dashboard-stats__value">${formatNumber(totalProtocolVolume)}</strong>
            <small className="dashboard-stats__note soft-text">
              Combined operational, pool, and liquid flow visibility.
            </small>
          </div>

          <div className="dashboard-stats__card dashboard-surface">
            <span className="dashboard-stats__icon">
              <Users size={20} className="text-glow-blue" />
            </span>
            <span className="dashboard-stats__label soft-text">Total Participants</span>
            <strong className="dashboard-stats__value">{formatNumber(totalParticipants, 0)}</strong>
            <small className="dashboard-stats__note soft-text">
              Registered members currently visible through the read layer.
            </small>
          </div>

          <div className="dashboard-stats__card dashboard-surface">
            <span className="dashboard-stats__icon">
              <Building2 size={20} className="text-warning" />
            </span>
            <span className="dashboard-stats__label soft-text">NFT Pool (80%)</span>
            <strong className="dashboard-stats__value">${formatNumber(nftBalance)}</strong>
            <small className="dashboard-stats__note soft-text">
              Founder distribution pool visibility.
            </small>
          </div>

          <div className="dashboard-stats__card dashboard-surface">
            <span className="dashboard-stats__icon">
              <Wallet size={20} className="text-glow-purple" />
            </span>
            <span className="dashboard-stats__label soft-text">Operations (20%)</span>
            <strong className="dashboard-stats__value">${formatNumber(opsBalance)}</strong>
            <small className="dashboard-stats__note soft-text">
              Operational treasury routing balance.
            </small>
          </div>
        </div>
      </section>

      <div className="dashboard-main-grid">
        <div className="dashboard-main-grid__left">
          <section className="dashboard-contracts dashboard-surface">
            <div className="dashboard-section-heading">
              <span className="dashboard-section-heading__eyebrow soft-text">Contract Directory</span>
              <h2 className="dashboard-section-heading__title">Core Smart Contract Addresses</h2>
            </div>

            <div className="dashboard-contracts__grid">
              {contractDirectory.map((item) => (
                <article key={item.key} className="dashboard-contracts__card dashboard-surface dashboard-surface--inner">
                  <div className="dashboard-contracts__header">
                    <span className="dashboard-contracts__label">{item.label}</span>
                    <a
                      className="dashboard-contracts__link"
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Verify ${item.label} on Amoy explorer`}
                    >
                      <Link2 size={14} />
                      <span>View on Amoy</span>
                    </a>
                  </div>

                  <strong className="dashboard-contracts__value">{shortenAddress(item.address)}</strong>
                  <code className="dashboard-contracts__address">{item.address}</code>
                  <p className="dashboard-contracts__note soft-text">{item.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-treasury dashboard-surface">
            <div className="dashboard-section-heading">
              <span className="dashboard-section-heading__eyebrow soft-text">Treasury Visibility</span>
              <h2 className="dashboard-section-heading__title">Contract Balances</h2>
            </div>

            <div className="dashboard-treasury__grid">
              {Object.entries(contractBalances).map(([key, val]) => (
                <div key={key} className="dashboard-treasury__card dashboard-surface dashboard-surface--inner">
                  <span className="dashboard-treasury__label soft-text">{key}</span>
                  <strong className="dashboard-treasury__value">${formatNumber(val)}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="dashboard-main-grid__right">
          <section className="dashboard-activity dashboard-surface">
            <div className="dashboard-section-heading">
              <span className="dashboard-section-heading__eyebrow soft-text">Live Feed</span>
              <h2 className="dashboard-section-heading__title">Network Activity</h2>
            </div>

            <div className="dashboard-activity__list">
              {activityFeed.length > 0 ? (
                activityFeed.map((item) => {
                  const Icon = item.icon

                  return (
                    <div key={item.id} className="dashboard-activity__item dashboard-surface dashboard-surface--inner">
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
                  <span className="soft-text">Activity will appear here...</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="dashboard-notices dashboard-surface dashboard-notices--wide">
        <div className="dashboard-section-heading">
          <span className="dashboard-section-heading__eyebrow soft-text">Updates & Status</span>
          <h2 className="dashboard-section-heading__title">Announcements & System Health</h2>
        </div>

        <div className="dashboard-notices__list dashboard-notices__list--wide">
          {announcements.length > 0 ? (
            announcements.map((item) => (
              <div
                key={item._id}
                className="dashboard-notices__item dashboard-notices__item--info dashboard-surface dashboard-surface--inner"
              >
                <span className="dashboard-notices__dot" />
                <div>
                  <h4 className="dashboard-notices__title">{item.title}</h4>
                  <p className="dashboard-notices__text soft-text">{item.content}</p>
                  <span className="dashboard-notices__meta soft-text">
                    {item.date || formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="dashboard-notices__item dashboard-notices__item--success dashboard-surface dashboard-surface--inner">
              <span className="dashboard-notices__dot" />
              <div>
                <h4 className="dashboard-notices__title">System Operational</h4>
                <p className="dashboard-notices__text soft-text">
                  No public announcement is active at the moment.
                </p>
              </div>
            </div>
          )}

          <div
            className={`dashboard-notices__item dashboard-notices__item--${
              systemHealth.contracts === 'Healthy' ? 'success' : 'warning'
            } dashboard-surface dashboard-surface--inner`}
          >
            <span className="dashboard-notices__dot" />
            <div>
              <h4 className="dashboard-notices__title">Contract Status</h4>
              <p className="dashboard-notices__text soft-text">{systemHealth.contracts}</p>
            </div>
          </div>

          <div className="dashboard-notices__item dashboard-notices__item--success dashboard-surface dashboard-surface--inner">
            <span className="dashboard-notices__dot" />
            <div>
              <h4 className="dashboard-notices__title">Network</h4>
              <p className="dashboard-notices__text soft-text">
                Polygon Amoy • {systemHealth.network}
              </p>
            </div>
          </div>

          <div
            className={`dashboard-notices__item dashboard-notices__item--${
              systemHealth.sync === 'Live'
                ? 'success'
                : systemHealth.sync === 'Syncing'
                ? 'info'
                : 'warning'
            } dashboard-surface dashboard-surface--inner`}
          >
            <span className="dashboard-notices__dot" />
            <div>
              <h4 className="dashboard-notices__title">Indexer Sync</h4>
              <p className="dashboard-notices__text soft-text">
                {systemHealth.sync} • Synced block {systemHealth.lastSyncedBlock || '—'}
              </p>
              <span className="dashboard-notices__meta soft-text">
                Latest block {systemHealth.latestBlock || '—'}
              </span>
            </div>
          </div>

          {error ? (
            <div className="dashboard-notices__item dashboard-notices__item--warning dashboard-surface dashboard-surface--inner">
              <span className="dashboard-notices__dot" />
              <div>
                <h4 className="dashboard-notices__title">Notice</h4>
                <p className="dashboard-notices__text soft-text">{error}</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  )
}

export default DashboardPage
