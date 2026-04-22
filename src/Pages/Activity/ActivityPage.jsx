import './ActivityPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { ethers } from 'ethers'
import { fetchAddressReceiptsApi } from '../../Services/orbitsApi'

const ACTIVITY_PAGE_SIZE = 8
const RECEIPTS_PAGE_SIZE = 6

const ActivityPage = () => {
  const { isConnected, account, connect } = useWallet()
  const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()

  const [activities, setActivities] = useState([])
  const [receipts, setReceipts] = useState([])
  const [levelActivations, setLevelActivations] = useState([])
  const [registrationInfo, setRegistrationInfo] = useState(null)
  const [filter, setFilter] = useState('all')
  const [timeRange, setTimeRange] = useState('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalPayouts: 0,
    totalAmount: 0,
    activationCount: 0,
  })
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [activityVisibleCount, setActivityVisibleCount] = useState(ACTIVITY_PAGE_SIZE)
  const [receiptsVisibleCount, setReceiptsVisibleCount] = useState(RECEIPTS_PAGE_SIZE)

  const normalizeUsdtAmount = useCallback((value) => {
    if (value === null || value === undefined || value === '') return 0

    const asString = String(value).trim()
    if (!asString) return 0

    try {
      if (/^-?\d+$/.test(asString)) {
        const asBigInt = BigInt(asString)
        if (asBigInt >= 1000000n || asBigInt <= -1000000n) {
          return Number(ethers.formatUnits(asBigInt, 6))
        }
        return Number(asString)
      }

      const parsed = Number(asString)
      return Number.isFinite(parsed) ? parsed : 0
    } catch {
      const parsed = Number(asString)
      return Number.isFinite(parsed) ? parsed : 0
    }
  }, [])

  const formatMoney = useCallback((value) => normalizeUsdtAmount(value).toFixed(2), [normalizeUsdtAmount])

  const normalizeTimestamp = useCallback((value) => {
    if (value === null || value === undefined || value === '') return null

    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) return null

    // milliseconds
    if (numeric > 1e12) return Math.floor(numeric / 1000)
    // microseconds or nanoseconds safety
    if (numeric > 1e15) return Math.floor(numeric / 1000000)

    return Math.floor(numeric)
  }, [])

  const formatDate = useCallback((timestamp) => {
    const safeTimestamp = normalizeTimestamp(timestamp)
    if (!safeTimestamp) return 'Unknown date'

    const date = new Date(safeTimestamp * 1000)
    if (Number.isNaN(date.getTime())) return 'Unknown date'

    const now = Date.now()
    const diff = now - date.getTime()

    if (diff < 0) return date.toLocaleDateString()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString()
  }, [normalizeTimestamp])

  const shortHash = (hash) => {
    if (!hash) return ''
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'payout':
        return '💰'
      case 'activation':
        return '⬆️'
      case 'registration':
        return '📝'
      case 'cycle':
        return '🔄'
      case 'position':
        return '📍'
      default:
        return '📋'
    }
  }

  const getActivityTone = (type) => {
    switch (type) {
      case 'payout':
        return 'is-payout'
      case 'activation':
        return 'is-activation'
      case 'registration':
        return 'is-registration'
      case 'cycle':
        return 'is-cycle'
      default:
        return 'is-default'
    }
  }

  const fetchRegistrationInfo = useCallback(async () => {
    if (!contracts || !account) return

    try {
      const registered = await contracts.registration.isRegistered(account)
      if (registered) {
        const referrer = await contracts.registration.getReferrer(account)
        setRegistrationInfo({
          registered: true,
          referrer: referrer !== ethers.ZeroAddress ? referrer : null,
          timestamp: null,
        })
      } else {
        setRegistrationInfo({ registered: false, referrer: null, timestamp: null })
      }
    } catch (err) {
      console.error('Error fetching registration info:', err)
    }
  }, [contracts, account])

  const fetchReceiptsAndActivities = useCallback(async () => {
    if (!account) return

    try {
      const result = await fetchAddressReceiptsApi(account)
      const receiptsData = Array.isArray(result?.receipts)
        ? result.receipts
        : Array.isArray(result)
          ? result
          : []

      const receiptActivities = receiptsData.map((receipt, index) => {
        const normalizedAmount = normalizeUsdtAmount(receipt.liquidPaid || receipt.grossAmount || 0)
        const normalizedTimestamp = normalizeTimestamp(receipt.timestamp) || Math.floor(Date.now() / 1000)

        return {
          id: `receipt-${receipt.activationId || 'x'}-${receipt.timestamp || index}`,
          type: receipt.receiptType === 2 ? 'payout' : 'receipt',
          title: receipt.receiptType === 2 ? 'Payout Received' : 'Receipt Recorded',
          description: `${receipt.receiptType === 2 ? 'Earned' : 'Recorded'} from Level ${receipt.level}${
            receipt.sourcePosition ? `, Position ${receipt.sourcePosition}` : ''
          }`,
          amount: normalizedAmount,
          timestamp: normalizedTimestamp,
          level: receipt.level,
          position: receipt.sourcePosition,
          cycle: receipt.sourceCycle,
          hash: receipt.transactionHash || null,
          status: 'completed',
          raw: receipt,
        }
      })

      setReceipts(receiptsData)
      setActivities((prev) => {
        const nonReceiptActivities = prev.filter((a) => a.type !== 'payout' && a.type !== 'receipt')
        return [...nonReceiptActivities, ...receiptActivities].sort((a, b) => b.timestamp - a.timestamp)
      })

      const totalPayouts = receiptActivities.filter((a) => a.type === 'payout').length
      const totalAmount = receiptActivities.reduce((sum, a) => sum + (a.amount || 0), 0)

      setStats((prev) => ({
        ...prev,
        totalRecords: receiptActivities.length + (levelActivations?.length || 0),
        totalPayouts,
        totalAmount,
      }))
    } catch (err) {
      console.error('Error fetching receipts:', err)
    }
  }, [account, levelActivations?.length, normalizeTimestamp, normalizeUsdtAmount])

  const fetchLevelActivations = useCallback(async () => {
    if (!contracts || !account) return

    try {
      const activations = []
      for (let level = 1; level <= 10; level += 1) {
        const isActive = await contracts.registration.isLevelActivated(account, level)
        if (isActive) {
          activations.push({ level, activated: true, timestamp: null })
        }
      }

      const activationActivities = activations.map((act) => ({
        id: `activation-${act.level}`,
        type: 'activation',
        title: `Level ${act.level} Activated`,
        description: `Successfully activated Level ${act.level}`,
        amount: null,
        level: act.level,
        timestamp: act.timestamp || Math.floor(Date.now() / 1000) - act.level * 86400,
        status: 'completed',
      }))

      setLevelActivations(activations)
      setActivities((prev) => {
        const nonActivationActivities = prev.filter((a) => a.type !== 'activation')
        return [...nonActivationActivities, ...activationActivities].sort((a, b) => b.timestamp - a.timestamp)
      })

      setStats((prev) => ({ ...prev, activationCount: activations.length }))
    } catch (err) {
      console.error('Error fetching level activations:', err)
    }
  }, [contracts, account])

  const getFilteredActivities = useCallback(() => {
    let filtered = [...activities]

    if (filter !== 'all') {
      filtered = filtered.filter((a) => a.type === filter)
    }

    if (timeRange !== 'all') {
      const now = Math.floor(Date.now() / 1000)
      const limits = {
        week: 7 * 86400,
        month: 30 * 86400,
        year: 365 * 86400,
      }
      const limit = limits[timeRange]
      if (limit) {
        filtered = filtered.filter((a) => {
          const safeTimestamp = normalizeTimestamp(a.timestamp)
          if (!safeTimestamp) return false
          return now - safeTimestamp <= limit
        })
      }
    }

    return filtered
  }, [activities, filter, timeRange, normalizeTimestamp])

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  useEffect(() => {
    if (contracts && account) {
      const loadData = async () => {
        setLoading(true)
        await Promise.all([
          fetchRegistrationInfo(),
          fetchReceiptsAndActivities(),
          fetchLevelActivations(),
        ])
        setLoading(false)
        setLastUpdated(new Date().toLocaleTimeString())
      }
      loadData()
    }
  }, [contracts, account, fetchRegistrationInfo, fetchReceiptsAndActivities, fetchLevelActivations])

  useEffect(() => {
    if (!contracts || !account) return
    const interval = setInterval(() => {
      fetchReceiptsAndActivities()
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)
    return () => clearInterval(interval)
  }, [contracts, account, fetchReceiptsAndActivities])

  const filteredActivities = useMemo(() => getFilteredActivities(), [getFilteredActivities])
  const visibleActivities = filteredActivities.slice(0, activityVisibleCount)
  const visibleReceipts = receipts.slice(0, receiptsVisibleCount)
  const hasMoreActivities = filteredActivities.length > visibleActivities.length
  const hasMoreReceipts = receipts.length > visibleReceipts.length

  useEffect(() => {
    setActivityVisibleCount(ACTIVITY_PAGE_SIZE)
  }, [filter, timeRange])

  const exportJson = () => {
    const data = JSON.stringify(activities, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ffn-activity-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCsv = () => {
    const csvRows = [['Type', 'Title', 'Amount', 'Level', 'Date']]
    activities.forEach((activity) => {
      csvRows.push([
        activity.type,
        activity.title,
        activity.amount || '',
        activity.level || '',
        normalizeTimestamp(activity.timestamp)
          ? new Date(normalizeTimestamp(activity.timestamp) * 1000).toLocaleString()
          : '',
      ])
    })
    const csv = csvRows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ffn-activity-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isConnected) {
    return (
      <section className="activity-page">
        <div className="activity-hero">
          <div className="activity-hero__content">
            <div className="activity-hero__eyebrow glass-panel">
              <span className="activity-hero__eyebrow-dot" />
              <span className="activity-hero__eyebrow-text">Track Your Journey</span>
            </div>
            <div className="activity-hero__text-block">
              <h1 className="activity-hero__title">Activity History</h1>
              <p className="activity-hero__description soft-text">
                Connect your wallet to view your transaction history, payouts, and level activations.
              </p>
            </div>
            <button type="button" onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
          </div>
          <div className="activity-hero__visual glass-panel">
            <div className="activity-hero__visual-box">
              <div className="activity-hero__visual-state">
                <div className="activity-hero__visual-emoji">📋</div>
                <div>Connect to view activity</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (contractsLoading || loading) {
    return (
      <section className="activity-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="soft-text">Loading activity history...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="activity-page">
      <div className="activity-hero">
        <div className="activity-hero__content">
          <div className="activity-hero__eyebrow glass-panel">
            <span className="activity-hero__eyebrow-dot" />
            <span className="activity-hero__eyebrow-text">
              Timeline, receipts, payouts, and account movement
            </span>
          </div>

          <div className="activity-hero__text-block">
            <h1 className="activity-hero__title">Activity History</h1>
            <p className="activity-hero__description soft-text">
              Review your recent actions, transaction history, payouts, activation records, and timeline
              events from one organized log.
            </p>
            <div className="small muted-text">Last updated: {lastUpdated}</div>
            <div className="small muted-text">Wallet: {account.slice(0, 8)}...{account.slice(-6)}</div>
            {contractsError ? <div className="activity-inline-error">{contractsError}</div> : null}
          </div>

          <div className="activity-hero__chips">
            <span className="activity-hero__chip glass-panel">📋 {stats.totalRecords} Records</span>
            <span className="activity-hero__chip glass-panel">💰 ${formatMoney(stats.totalAmount)} Total</span>
            <span className="activity-hero__chip glass-panel">⬆️ {stats.activationCount} Activations</span>
          </div>
        </div>

        <div className="activity-hero__visual glass-panel">
          <div className="activity-hero__visual-box">
            <div className="activity-summary-viz">
              <div className="viz-stat">
                <span className="viz-value">{stats.totalPayouts}</span>
                <span className="viz-label">Payouts</span>
              </div>
              <div className="viz-stat">
                <span className="viz-value">{stats.activationCount}</span>
                <span className="viz-label">Activations</span>
              </div>
              <div className="viz-stat">
                <span className="viz-value">${Math.floor(normalizeUsdtAmount(stats.totalAmount))}</span>
                <span className="viz-label">Earned</span>
              </div>
            </div>
          </div>
          <p className="activity-hero__visual-note muted-text">Your activity at a glance</p>
        </div>
      </div>

      <div className="activity-filters glass-panel">
        <div className="filter-group">
          <span className="filter-label">Type:</span>
          <button type="button" className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button type="button" className={`filter-btn ${filter === 'payout' ? 'active' : ''}`} onClick={() => setFilter('payout')}>Payouts</button>
          <button type="button" className={`filter-btn ${filter === 'activation' ? 'active' : ''}`} onClick={() => setFilter('activation')}>Activations</button>
          <button type="button" className={`filter-btn ${filter === 'receipt' ? 'active' : ''}`} onClick={() => setFilter('receipt')}>Receipts</button>
        </div>
        <div className="filter-group">
          <span className="filter-label">Time:</span>
          <button type="button" className={`filter-btn ${timeRange === 'all' ? 'active' : ''}`} onClick={() => setTimeRange('all')}>All Time</button>
          <button type="button" className={`filter-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => setTimeRange('week')}>Last Week</button>
          <button type="button" className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>Last Month</button>
          <button type="button" className={`filter-btn ${timeRange === 'year' ? 'active' : ''}`} onClick={() => setTimeRange('year')}>Last Year</button>
        </div>
      </div>

      <div className="activity-main-grid">
        <div className="activity-main-grid__left">
          <section className="activity-feed glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">Timeline</span>
              <h2 className="activity-section-heading__title">Recent account and platform activity</h2>
            </div>

            <div className="activity-feed__list">
              {filteredActivities.length === 0 ? (
                <div className="activity-empty">
                  <p className="soft-text">No activity found</p>
                  <p className="small muted-text">Complete registration or activate levels to see activity</p>
                </div>
              ) : (
                visibleActivities.map((activity, idx) => (
                  <div key={activity.id || idx} className="activity-feed__item glass-panel">
                    <div className={`activity-feed__icon ${getActivityTone(activity.type)}`}>{getActivityIcon(activity.type)}</div>
                    <div className="activity-feed__content">
                      <h3 className="activity-feed__title">{activity.title}</h3>
                      <p className="activity-feed__text soft-text">
                        {activity.description}
                        {activity.level && ` • Level ${activity.level}`}
                        {activity.position && ` • Position ${activity.position}`}
                        {activity.cycle && ` • Cycle ${activity.cycle}`}
                      </p>
                      {activity.amount > 0 ? (
                        <div className="activity-amount">+${formatMoney(activity.amount)} USDT</div>
                      ) : null}
                      {activity.hash ? (
                        <div className="activity-hash">
                          <a href={`https://amoy.polygonscan.com/tx/${activity.hash}`} target="_blank" rel="noopener noreferrer">
                            TX: {shortHash(activity.hash)}
                          </a>
                        </div>
                      ) : null}
                    </div>
                    <span className="activity-feed__time muted-text">{formatDate(activity.timestamp)}</span>
                  </div>
                ))
              )}
            </div>

            {hasMoreActivities ? (
              <div className="activity-actions-row">
                <button
                  type="button"
                  className="see-more-btn"
                  onClick={() => setActivityVisibleCount((prev) => prev + ACTIVITY_PAGE_SIZE)}
                >
                  See more activity
                </button>
              </div>
            ) : null}
          </section>

          <section className="activity-receipts glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">Receipts</span>
              <h2 className="activity-section-heading__title">Transaction and record snapshot</h2>
            </div>

            <div className="receipts-header">
              <span>Type</span>
              <span>Amount</span>
              <span>Level</span>
              <span>Status</span>
              <span>Date</span>
            </div>

            <div className="activity-receipts__table">
              {receipts.length === 0 ? (
                <div className="activity-empty small">
                  <p className="soft-text">No receipts yet</p>
                </div>
              ) : (
                visibleReceipts.map((receipt, idx) => (
                  <div key={idx} className="activity-receipts__row glass-panel">
                    <span className="activity-receipts__cell">
                      {receipt.receiptType === 2 ? '💰 Payout' : '📋 Receipt'}
                    </span>
                    <span className="activity-receipts__cell amount">
                      +${formatMoney(receipt.liquidPaid || receipt.grossAmount || 0)} USDT
                    </span>
                    <span className="activity-receipts__cell">Level {receipt.level}</span>
                    <span className="activity-receipts__cell status completed">Completed</span>
                    <span className="activity-receipts__cell date">{formatDate(receipt.timestamp)}</span>
                  </div>
                ))
              )}
            </div>

            {hasMoreReceipts ? (
              <div className="activity-actions-row">
                <button
                  type="button"
                  className="see-more-btn"
                  onClick={() => setReceiptsVisibleCount((prev) => prev + RECEIPTS_PAGE_SIZE)}
                >
                  See more receipts
                </button>
              </div>
            ) : null}
          </section>
        </div>

        <div className="activity-main-grid__right">
          <section className="activity-summary glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">Summary</span>
              <h2 className="activity-section-heading__title">Activity snapshot and record counts</h2>
            </div>

            <div className="activity-summary__list">
              <div className="activity-summary__card glass-panel">
                <span className="activity-summary__label muted-text">Total Records</span>
                <strong className="activity-summary__value">{stats.totalRecords}</strong>
              </div>
              <div className="activity-summary__card glass-panel">
                <span className="activity-summary__label muted-text">Payout Events</span>
                <strong className="activity-summary__value">{stats.totalPayouts}</strong>
              </div>
              <div className="activity-summary__card glass-panel">
                <span className="activity-summary__label muted-text">Activation Events</span>
                <strong className="activity-summary__value">{stats.activationCount}</strong>
              </div>
              <div className="activity-summary__card glass-panel">
                <span className="activity-summary__label muted-text">Total Earned</span>
                <strong className="activity-summary__value">${formatMoney(stats.totalAmount)}</strong>
              </div>
            </div>
          </section>

          <section className="activity-registration glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">Registration</span>
              <h2 className="activity-section-heading__title">Account creation details</h2>
            </div>

            <div className="registration-info">
              <div className="info-row">
                <span className="info-label">Status</span>
                <span className="info-value">{registrationInfo?.registered ? '✓ Registered' : 'Not Registered'}</span>
              </div>
              {registrationInfo?.referrer ? (
                <div className="info-row">
                  <span className="info-label">Referrer</span>
                  <span className="info-value">{registrationInfo.referrer.slice(0, 10)}...{registrationInfo.referrer.slice(-8)}</span>
                </div>
              ) : null}
              <div className="info-row">
                <span className="info-label">Wallet</span>
                <span className="info-value">{account.slice(0, 12)}...{account.slice(-10)}</span>
              </div>
            </div>
          </section>

          <section className="activity-levels glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">Level Status</span>
              <h2 className="activity-section-heading__title">Your activation progress</h2>
            </div>

            <div className="levels-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
                const isActive = levelActivations.some((a) => a.level === level)
                return (
                  <div key={level} className={`level-badge ${isActive ? 'active' : 'inactive'}`}>
                    <span className="level-number">{level}</span>
                    {isActive ? <span className="level-check">✓</span> : null}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="activity-export glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">Export Data</span>
              <h2 className="activity-section-heading__title">Download your activity history</h2>
            </div>

            <div className="export-buttons">
              <button type="button" className="export-btn" onClick={exportJson}>📥 Export as JSON</button>
              <button type="button" className="export-btn" onClick={exportCsv}>📊 Export as CSV</button>
            </div>
            <p className="export-note soft-text">
              Download your complete transaction history for tax or record-keeping purposes.
            </p>
          </section>

          <section className="activity-visual glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">Visual Slot</span>
              <h2 className="activity-section-heading__title">Reserved history visual area</h2>
            </div>

            <div className="activity-visual__box">
              <div className="timeline-icon">📅</div>
            </div>

            <p className="activity-visual__note muted-text">Your complete activity timeline</p>
          </section>
        </div>
      </div>
    </section>
  )
}

export default ActivityPage
