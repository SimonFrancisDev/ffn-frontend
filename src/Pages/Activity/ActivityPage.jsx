import './ActivityPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { ethers } from 'ethers'
import { fetchAddressReceiptsApi, fetchOrbitLevelsApi } from '../../Services/orbitsApi'
import { getProfileReadAuthIfLocked } from '../../Services/profilePrivacyApi'
import { useToast } from '../../components/feedback'
import { NETWORK_CONFIG } from '../../constants/addresses'

const ACTIVITY_PAGE_SIZE = 8
const RECEIPTS_PAGE_SIZE = 6

const ActivityPage = () => {
  const { t } = useTranslation()
  const activityT = useCallback((key, fallback, options) => t(`activityPage.${key}`, fallback, options), [t])
  const { isConnected, account, connect } = useWallet()
  const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()
  const toast = useToast()

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
    if (!value) return null

    if (typeof value === 'string') {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000)
      }
    }

    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) {
      if (numeric > 1e12) return Math.floor(numeric / 1000)
      if (numeric > 1e15) return Math.floor(numeric / 1000000)
      return Math.floor(numeric)
    }

    return null
  }, [])

  const formatDate = useCallback((timestamp) => {
    const safeTimestamp = normalizeTimestamp(timestamp)
    if (!safeTimestamp) return '—'

    const date = new Date(safeTimestamp * 1000)
    if (Number.isNaN(date.getTime())) return activityT('date.invalid', 'Invalid date')

    const now = Date.now()
    const diff = now - date.getTime()

    if (diff < 0) return date.toLocaleDateString()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return activityT('date.justNow', 'Just now')
    if (minutes < 60) return activityT('date.minutesAgo', '{{count}}m ago', { count: minutes })
    if (hours < 24) return activityT('date.hoursAgo', '{{count}}h ago', { count: hours })
    if (days < 7) return activityT('date.daysAgo', '{{count}}d ago', { count: days })

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }, [activityT, normalizeTimestamp])

  const shortHash = (hash) => (!hash ? '' : `${hash.slice(0, 8)}...${hash.slice(-6)}`)

  const getActivityIcon = (type) => {
    switch (type) {
      case 'payout': return '💰'
      case 'activation': return '⬆️'
      case 'registration': return '📝'
      case 'cycle': return '🔄'
      case 'position': return '📍'
      default: return '📋'
    }
  }

  const getActivityTone = (type) => {
    switch (type) {
      case 'payout': return 'is-payout'
      case 'activation': return 'is-activation'
      case 'registration': return 'is-registration'
      case 'cycle': return 'is-cycle'
      default: return 'is-default'
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
      toast.warning(activityT('errors.registrationInfoFailed', 'Registration activity could not be refreshed.'), { dedupeKey: 'activity-registration-info-failed' })
    }
  }, [contracts, account, activityT, toast])

  const fetchReceiptsAndActivities = useCallback(async () => {
    if (!account) return

    try {
      const profileReadHeaders = await getProfileReadAuthIfLocked(account, account)
      const result = await fetchAddressReceiptsApi(account, undefined, { headers: profileReadHeaders })

      const receiptsData = Array.isArray(result?.receipts)
        ? result.receipts
        : Array.isArray(result) ? result : []

      const receiptActivities = receiptsData.map((receipt, index) => {
        const normalizedAmount = normalizeUsdtAmount(
          receipt.walletCreditedLiquid ??
          receipt.liquidPaid ??
          0
        )
        const normalizedTimestamp = normalizeTimestamp(receipt.timestamp || receipt.createdAt)

        return {
          id: `receipt-${receipt.activationId || 'x'}-${index}`,
          type: receipt.receiptType === 2 ? 'payout' : 'receipt',
          title: receipt.receiptType === 2 ? activityT('activity.payoutReceived', 'Payout Received') : activityT('activity.receiptRecorded', 'Receipt Recorded'),
          description: receipt.sourcePosition
            ? activityT(receipt.receiptType === 2 ? 'activity.earnedFromLevelPosition' : 'activity.recordedFromLevelPosition', '{{action}} from Level {{level}}, Position {{position}}', {
              action: receipt.receiptType === 2 ? activityT('activity.earned', 'Earned') : activityT('activity.recorded', 'Recorded'),
              level: receipt.level,
              position: receipt.sourcePosition,
            })
            : activityT(receipt.receiptType === 2 ? 'activity.earnedFromLevel' : 'activity.recordedFromLevel', '{{action}} from Level {{level}}', {
              action: receipt.receiptType === 2 ? activityT('activity.earned', 'Earned') : activityT('activity.recorded', 'Recorded'),
              level: receipt.level,
            }),
          amount: normalizedAmount,
          timestamp: normalizedTimestamp,
          level: receipt.level,
          position: receipt.sourcePosition,
          cycle: receipt.sourceCycle,
          hash: receipt.txHash || receipt.transactionHash || null,
          status: 'completed',
          raw: receipt,
        }
      })

      setReceipts(receiptsData)

      setActivities((prev) => {
        const nonReceiptActivities = prev.filter((a) => a.type !== 'payout' && a.type !== 'receipt')
        return [...nonReceiptActivities, ...receiptActivities].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
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
      toast.warning(activityT('errors.receiptsFailed', 'Receipt activity could not be refreshed.'), { dedupeKey: 'activity-receipts-failed' })
    }
  }, [account, activityT, levelActivations?.length, normalizeTimestamp, normalizeUsdtAmount, toast])

  const fetchLevelActivations = useCallback(async () => {
    if (!contracts || !account) return;

    try {
      let orbitLevelsData = [];
      try {
        const profileReadHeaders = await getProfileReadAuthIfLocked(account, account)
        const levelsResponse = await fetchOrbitLevelsApi(account, { headers: profileReadHeaders });
        orbitLevelsData = levelsResponse?.levels || levelsResponse || [];
      } catch (e) {
        console.warn("Could not fetch orbit levels data");
      }

      const activations = [];
      const activationActivities = [];

      for (let level = 1; level <= 10; level += 1) {
        const isActive = await contracts.registration.isLevelActivated(account, level);
        
        if (isActive) {
          const levelData = orbitLevelsData.find(l => l.level === level);
          
          let realTimestamp = null;
          if (levelData?.activatedAt || levelData?.timestamp || levelData?.createdAt) {
            realTimestamp = normalizeTimestamp(
              levelData.activatedAt || levelData.timestamp || levelData.createdAt
            );
          }

          activations.push({ 
            level, 
            activated: true, 
            timestamp: realTimestamp 
          });

          activationActivities.push({
            id: `activation-${level}`,
            type: 'activation',
            title: activityT('activity.levelActivated', 'Level {{level}} Activated', { level }),
            description: activityT('activity.levelActivatedDescription', 'Successfully activated Level {{level}}', { level }),
            amount: null,
            level: level,
            timestamp: realTimestamp,
            pendingTimestamp: !realTimestamp,
            status: 'completed',
          });
        }
      }

      setLevelActivations(activations);

      setActivities((prev) => {
        const nonActivation = prev.filter(a => a.type !== 'activation');
        return [...nonActivation, ...activationActivities]
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      });

      setStats(prev => ({ ...prev, activationCount: activations.length }));
    } catch (err) {
      console.error('Error fetching level activations:', err);
      toast.warning(activityT('errors.levelsFailed', 'Level activation history could not be refreshed.'), { dedupeKey: 'activity-levels-failed' })
    }
  }, [contracts, account, activityT, normalizeTimestamp, toast]);

  const getFilteredActivities = useCallback(() => {
    let filtered = [...activities]
    if (filter !== 'all') {
      filtered = filtered.filter((a) => a.type === filter)
    }
    if (timeRange !== 'all') {
      const now = Math.floor(Date.now() / 1000)
      const limits = { week: 7 * 86400, month: 30 * 86400, year: 365 * 86400 }
      const limit = limits[timeRange]
      if (limit) {
        filtered = filtered.filter((a) => {
          const safeTimestamp = normalizeTimestamp(a.timestamp)
          return safeTimestamp && now - safeTimestamp <= limit
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
    toast.success(activityT('export.jsonReady', 'JSON activity export downloaded.'), { dedupeKey: 'activity-export-json' })
  }

  const exportCsv = () => {
    const csvRows = [[
      activityT('export.type', 'Type'),
      activityT('export.title', 'Title'),
      activityT('export.amount', 'Amount'),
      activityT('export.level', 'Level'),
      activityT('export.date', 'Date'),
    ]]
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
    toast.success(activityT('export.csvReady', 'CSV activity export downloaded.'), { dedupeKey: 'activity-export-csv' })
  }

  if (!isConnected) {
    return (
      <section className="activity-page">
        <div className="activity-hero">
          <div className="activity-hero__content">
            <div className="activity-hero__eyebrow glass-panel">
              <span className="activity-hero__eyebrow-dot" />
              <span className="activity-hero__eyebrow-text">{activityT('connect.eyebrow', 'Track Your Journey')}</span>
            </div>
            <div className="activity-hero__text-block">
              <h1 className="activity-hero__title">{activityT('title', 'Activity History')}</h1>
              <p className="activity-hero__description soft-text">
                {activityT('connect.description', 'Connect your wallet to view your transaction history, payouts, and level activations.')}
              </p>
            </div>
            <button type="button" onClick={connect} className="connect-wallet-btn">{activityT('actions.connectWallet', 'Connect Wallet')}</button>
          </div>
          <div className="activity-hero__visual glass-panel">
            <div className="activity-hero__visual-box">
              <div className="activity-hero__visual-state">
                <div className="activity-hero__visual-emoji">📋</div>
                <div>{activityT('connect.visual', 'Connect to view activity')}</div>
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
          <p className="soft-text">{activityT('loading.history', 'Loading activity history...')}</p>
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
              {activityT('hero.eyebrow', 'Timeline, receipts, payouts, and account movement')}
            </span>
          </div>

          <div className="activity-hero__text-block">
            <h1 className="activity-hero__title">{activityT('title', 'Activity History')}</h1>
            <p className="activity-hero__description soft-text">
              {activityT('hero.description', 'Review your recent actions, transaction history, payouts, activation records, and timeline events from one organized log.')}
            </p>
            <div className="small muted-text">{activityT('hero.lastUpdated', 'Last updated: {{time}}', { time: lastUpdated })}</div>
            <div className="small muted-text">{activityT('hero.wallet', 'Wallet: {{address}}', { address: `${account.slice(0, 8)}...${account.slice(-6)}` })}</div>
            {contractsError ? <div className="activity-inline-error">{contractsError}</div> : null}
          </div>

          <div className="activity-hero__chips">
            <span className="activity-hero__chip glass-panel">{activityT('hero.records', '{{count}} Records', { count: stats.totalRecords })}</span>
            <span className="activity-hero__chip glass-panel">{activityT('hero.total', '${{amount}} Total', { amount: formatMoney(stats.totalAmount) })}</span>
            <span className="activity-hero__chip glass-panel">{activityT('hero.activations', '{{count}} Activations', { count: stats.activationCount })}</span>
          </div>
        </div>

        <div className="activity-hero__visual glass-panel">
          <div className="activity-hero__visual-box">
            <div className="activity-summary-viz">
              <div className="viz-stat">
                <span className="viz-value">{stats.totalPayouts}</span>
                <span className="viz-label">{activityT('summary.payouts', 'Payouts')}</span>
              </div>
              <div className="viz-stat">
                <span className="viz-value">{stats.activationCount}</span>
                <span className="viz-label">{activityT('summary.activations', 'Activations')}</span>
              </div>
              <div className="viz-stat">
                <span className="viz-value">${Math.floor(normalizeUsdtAmount(stats.totalAmount))}</span>
                <span className="viz-label">{activityT('summary.earned', 'Earned')}</span>
              </div>
            </div>
          </div>
          <p className="activity-hero__visual-note muted-text">{activityT('hero.visualNote', 'Your activity at a glance')}</p>
        </div>
      </div>

      <div className="activity-filters glass-panel">
        <div className="filter-group">
          <span className="filter-label">{activityT('filters.type', 'Type:')}</span>
          <button type="button" className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>{activityT('filters.all', 'All')}</button>
          <button type="button" className={`filter-btn ${filter === 'payout' ? 'active' : ''}`} onClick={() => setFilter('payout')}>{activityT('filters.payouts', 'Payouts')}</button>
          <button type="button" className={`filter-btn ${filter === 'activation' ? 'active' : ''}`} onClick={() => setFilter('activation')}>{activityT('filters.activations', 'Activations')}</button>
          <button type="button" className={`filter-btn ${filter === 'receipt' ? 'active' : ''}`} onClick={() => setFilter('receipt')}>{activityT('filters.receipts', 'Receipts')}</button>
        </div>
        <div className="filter-group">
          <span className="filter-label">{activityT('filters.time', 'Time:')}</span>
          <button type="button" className={`filter-btn ${timeRange === 'all' ? 'active' : ''}`} onClick={() => setTimeRange('all')}>{activityT('filters.allTime', 'All Time')}</button>
          <button type="button" className={`filter-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => setTimeRange('week')}>{activityT('filters.lastWeek', 'Last Week')}</button>
          <button type="button" className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>{activityT('filters.lastMonth', 'Last Month')}</button>
          <button type="button" className={`filter-btn ${timeRange === 'year' ? 'active' : ''}`} onClick={() => setTimeRange('year')}>{activityT('filters.lastYear', 'Last Year')}</button>
        </div>
      </div>

      <div className="activity-main-grid">
        <div className="activity-main-grid__left">
          <section className="activity-feed glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">{activityT('timeline.eyebrow', 'Timeline')}</span>
              <h2 className="activity-section-heading__title">{activityT('timeline.title', 'Recent account and platform activity')}</h2>
            </div>

            <div className="activity-feed__list">
              {filteredActivities.length === 0 ? (
                <div className="activity-empty">
                  <p className="soft-text">{activityT('timeline.emptyTitle', 'No activity found')}</p>
                  <p className="small muted-text">{activityT('timeline.emptyText', 'Complete registration or activate levels to see activity')}</p>
                </div>
              ) : (
                visibleActivities.map((activity, idx) => (
                  <div key={activity.id || idx} className="activity-feed__item glass-panel">
                    <div className={`activity-feed__icon ${getActivityTone(activity.type)}`}>{getActivityIcon(activity.type)}</div>
                    <div className="activity-feed__content">
                      <h3 className="activity-feed__title">{activity.title}</h3>
                      <p className="activity-feed__text soft-text">
                        {activity.description}
                        {activity.level && activityT('activity.levelMeta', ' � Level {{level}}', { level: activity.level })}
                        {activity.position && activityT('activity.positionMeta', ' � Position {{position}}', { position: activity.position })}
                        {activity.cycle && activityT('activity.cycleMeta', ' � Cycle {{cycle}}', { cycle: activity.cycle })}
                      </p>
                      {activity.amount > 0 ? (
                        <div className="activity-amount">+${formatMoney(activity.amount)} USDT</div>
                      ) : null}
                      {activity.hash ? (
                        <div className="activity-hash">
                          <a href={`${NETWORK_CONFIG.blockExplorerUrls[0]}tx/${activity.hash}`} target="_blank" rel="noopener noreferrer">
                            {activityT('activity.tx', 'TX: {{hash}}', { hash: shortHash(activity.hash) })}
                          </a>
                        </div>
                      ) : null}
                    </div>
                    <span className="activity-feed__time muted-text">
                      {activity.pendingTimestamp
                        ? activityT('date.indexingPending', 'Date indexing pending')
                        : formatDate(activity.timestamp)}
                    </span>
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
                  {activityT('actions.seeMoreActivity', 'See more activity')}
                </button>
              </div>
            ) : null}
          </section>

          <section className="activity-receipts glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">{activityT('receipts.eyebrow', 'Receipts')}</span>
              <h2 className="activity-section-heading__title">{activityT('receipts.title', 'Transaction and record snapshot')}</h2>
            </div>

            <div className="receipts-header">
              <span>{activityT('table.type', 'Type')}</span>
              <span>{activityT('table.amount', 'Amount')}</span>
              <span>{activityT('table.level', 'Level')}</span>
              <span>{activityT('table.status', 'Status')}</span>
              <span>{activityT('table.date', 'Date')}</span>
            </div>

            <div className="activity-receipts__table">
              {receipts.length === 0 ? (
                <div className="activity-empty small">
                  <p className="soft-text">{activityT('receipts.empty', 'No receipts yet')}</p>
                </div>
              ) : (
                visibleReceipts.map((receipt, idx) => (
                  <div key={idx} className="activity-receipts__row glass-panel">
                    <span className="activity-receipts__cell">
                      {receipt.receiptType === 2 ? activityT('receipts.payout', 'Payout') : activityT('receipts.receipt', 'Receipt')}
                    </span>
                    <span className="activity-receipts__cell amount">
                      +${formatMoney(receipt.walletCreditedLiquid ?? receipt.liquidPaid ?? 0)} USDT
                    </span>
                    <span className="activity-receipts__cell">{activityT('table.levelValue', 'Level {{level}}', { level: receipt.level })}</span>
                    <span className="activity-receipts__cell status completed">{activityT('status.completed', 'Completed')}</span>
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
                  {activityT('actions.seeMoreReceipts', 'See more receipts')}
                </button>
              </div>
            ) : null}
          </section>
        </div>

        <div className="activity-main-grid__right">
          <section className="activity-summary glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">{activityT('summary.eyebrow', 'Summary')}</span>
              <h2 className="activity-section-heading__title">{activityT('summary.title', 'Activity snapshot and record counts')}</h2>
            </div>

            <div className="activity-summary__list">
              <div className="activity-summary__card glass-panel">
                <span className="activity-summary__label muted-text">{activityT('summary.totalRecords', 'Total Records')}</span>
                <strong className="activity-summary__value">{stats.totalRecords}</strong>
              </div>
              <div className="activity-summary__card glass-panel">
                <span className="activity-summary__label muted-text">{activityT('summary.payoutEvents', 'Payout Events')}</span>
                <strong className="activity-summary__value">{stats.totalPayouts}</strong>
              </div>
              <div className="activity-summary__card glass-panel">
                <span className="activity-summary__label muted-text">{activityT('summary.activationEvents', 'Activation Events')}</span>
                <strong className="activity-summary__value">{stats.activationCount}</strong>
              </div>
              <div className="activity-summary__card glass-panel">
                <span className="activity-summary__label muted-text">{activityT('summary.totalEarned', 'Total Earned')}</span>
                <strong className="activity-summary__value">${formatMoney(stats.totalAmount)}</strong>
              </div>
            </div>
          </section>

          {/* === MERGED LEVELS + EXPORT SECTION === */}
          <section className="activity-sidebar-bottom glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">{activityT('progress.eyebrow', 'Progress & Data')}</span>
              <h2 className="activity-section-heading__title">{activityT('progress.title', 'Level Status & Export')}</h2>
            </div>

            <div className="merged-bottom-grid">
              {/* Level Status */}
              <div className="merged-levels">
                <div className="merged-subheading">{activityT('progress.activationProgress', 'Your Activation Progress')}</div>
                <div className="levels-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
                    const isActive = levelActivations.some((a) => a.level === level);
                    return (
                      <div key={level} className={`level-badge ${isActive ? 'active' : 'inactive'}`}>
                        <span className="level-number">{level}</span>
                        {isActive ? <span className="level-check">✓</span> : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Export Data */}
              <div className="merged-export">
                <div className="merged-subheading">{activityT('export.historyTitle', 'Export Your History')}</div>
                <div className="export-buttons">
                  <button type="button" className="export-btn" onClick={exportJson}>{activityT('export.asJson', 'Export as JSON')}</button>
                  <button type="button" className="export-btn" onClick={exportCsv}>{activityT('export.asCsv', 'Export as CSV')}</button>
                </div>
                <p className="export-note soft-text">
                  {activityT('export.note', 'Download your complete transaction history for tax or record-keeping purposes.')}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}

export default ActivityPage
