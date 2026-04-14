import './ActivityPage.css'
import { useEffect, useState, useCallback } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { ethers } from 'ethers'
import { fetchAddressReceiptsApi, fetchOrbitLevelSnapshotApi } from '../../Services/orbitsApi'

const ActivityPage = () => {
  const { isConnected, account, connect } = useWallet()
  const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()

  // Activity States
  const [activities, setActivities] = useState([])
  const [receipts, setReceipts] = useState([])
  const [levelActivations, setLevelActivations] = useState([])
  const [registrationInfo, setRegistrationInfo] = useState(null)
  const [filter, setFilter] = useState('all') // all, payouts, activations, receipts
  const [timeRange, setTimeRange] = useState('all') // all, week, month, year
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalPayouts: 0,
    totalAmount: 0,
    activationCount: 0
  })
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())

  // Helper functions
  const formatUsdt = useCallback((value) => {
    try {
      return Number(ethers.formatUnits(value ?? 0, 6))
    } catch {
      return 0
    }
  }, [])

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const shortHash = (hash) => {
    if (!hash) return ''
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`
  }

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

  const getActivityColor = (type) => {
    switch (type) {
      case 'payout': return '#28a745'
      case 'activation': return '#1de9b6'
      case 'registration': return '#3b82f6'
      case 'cycle': return '#f59e0b'
      default: return '#6c757d'
    }
  }

  // Fetch registration info
  const fetchRegistrationInfo = useCallback(async () => {
    if (!contracts || !account) return
    
    try {
      const registered = await contracts.registration.isRegistered(account)
      if (registered) {
        const referrer = await contracts.registration.getReferrer(account)
        // Note: Registration timestamp would need to be fetched from events or a backend
        // For now, we'll use a placeholder or derive from first activation
        setRegistrationInfo({
          registered: true,
          referrer: referrer !== ethers.ZeroAddress ? referrer : null,
          timestamp: null // Would come from event logs
        })
      }
    } catch (err) {
      console.error('Error fetching registration info:', err)
    }
  }, [contracts, account])

  // Fetch receipts and create activity items
  const fetchReceiptsAndActivities = useCallback(async () => {
    if (!account) return
    
    try {
      const result = await fetchAddressReceiptsApi(account)
      const receiptsData = Array.isArray(result?.receipts) ? result.receipts : []
      
      // Process receipts into activities
      const receiptActivities = receiptsData.map(receipt => ({
        id: `receipt-${receipt.activationId}-${receipt.timestamp}`,
        type: receipt.receiptType === 2 ? 'payout' : 'receipt',
        title: receipt.receiptType === 2 ? 'Payout Received' : 'Receipt Recorded',
        description: `${receipt.receiptType === 2 ? 'Earned' : 'Recorded'} from Level ${receipt.level}${receipt.sourcePosition ? `, Position ${receipt.sourcePosition}` : ''}`,
        amount: receipt.liquidPaid || receipt.grossAmount || 0,
        timestamp: receipt.timestamp || Date.now() / 1000,
        level: receipt.level,
        position: receipt.sourcePosition,
        cycle: receipt.sourceCycle,
        hash: null,
        status: 'completed',
        raw: receipt
      }))
      
      setReceipts(receiptsData)
      setActivities(prev => {
        const nonReceiptActivities = prev.filter(a => a.type !== 'payout' && a.type !== 'receipt')
        return [...nonReceiptActivities, ...receiptActivities].sort((a, b) => b.timestamp - a.timestamp)
      })
      
      // Update stats
      const totalPayouts = receiptActivities.filter(a => a.type === 'payout').length
      const totalAmount = receiptActivities.reduce((sum, a) => sum + (a.amount || 0), 0)
      
      setStats(prev => ({
        ...prev,
        totalRecords: receiptActivities.length + (levelActivations?.length || 0),
        totalPayouts,
        totalAmount
      }))
      
    } catch (err) {
      console.error('Error fetching receipts:', err)
    }
  }, [account])

  // Fetch level activations from contract
  const fetchLevelActivations = useCallback(async () => {
    if (!contracts || !account) return
    
    try {
      const activations = []
      for (let level = 1; level <= 10; level++) {
        const isActive = await contracts.registration.isLevelActivated(account, level)
        if (isActive) {
          // For now, we don't have timestamps for activations
          // This would come from events or a backend
          activations.push({
            level,
            activated: true,
            timestamp: null // Would come from event logs
          })
        }
      }
      
      const activationActivities = activations.map(act => ({
        id: `activation-${act.level}`,
        type: 'activation',
        title: `Level ${act.level} Activated`,
        description: `Successfully activated Level ${act.level}`,
        amount: null,
        level: act.level,
        timestamp: act.timestamp || Date.now() / 1000 - (act.level * 86400),
        status: 'completed'
      }))
      
      setLevelActivations(activations)
      setActivities(prev => {
        const nonActivationActivities = prev.filter(a => a.type !== 'activation')
        return [...nonActivationActivities, ...activationActivities].sort((a, b) => b.timestamp - a.timestamp)
      })
      
      setStats(prev => ({
        ...prev,
        activationCount: activations.length,
        totalRecords: (prev.totalRecords || 0) + activations.length
      }))
      
    } catch (err) {
      console.error('Error fetching level activations:', err)
    }
  }, [contracts, account])

  // Filter activities based on filter and time range
  const getFilteredActivities = () => {
    let filtered = [...activities]
    
    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(a => a.type === filter)
    }
    
    // Apply time range filter
    if (timeRange !== 'all') {
      const now = Date.now() / 1000
      const limits = {
        week: 7 * 86400,
        month: 30 * 86400,
        year: 365 * 86400
      }
      const limit = limits[timeRange]
      if (limit) {
        filtered = filtered.filter(a => (now - a.timestamp) <= limit)
      }
    }
    
    return filtered
  }

  // Load all data
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
          fetchLevelActivations()
        ])
        setLoading(false)
        setLastUpdated(new Date().toLocaleTimeString())
      }
      loadData()
    }
  }, [contracts, account, fetchRegistrationInfo, fetchReceiptsAndActivities, fetchLevelActivations])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!contracts || !account) return
    const interval = setInterval(() => {
      fetchReceiptsAndActivities()
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)
    return () => clearInterval(interval)
  }, [contracts, account, fetchReceiptsAndActivities])

  const filteredActivities = getFilteredActivities()
  const totalPages = Math.ceil(filteredActivities.length / 10)

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
            <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
          </div>
          <div className="activity-hero__visual glass-panel">
            <div className="activity-hero__visual-box">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
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
          <p>Loading activity history...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="activity-page">
      {/* Hero Section */}
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
              Review your recent actions, transaction history, payouts,
              activation records, and timeline events from one organized log.
            </p>
            <div className="small muted-text">Last updated: {lastUpdated}</div>
            <div className="small muted-text">Wallet: {account.slice(0, 8)}...{account.slice(-6)}</div>
          </div>

          <div className="activity-hero__chips">
            <span className="activity-hero__chip glass-panel">📋 {stats.totalRecords} Records</span>
            <span className="activity-hero__chip glass-panel">💰 ${stats.totalAmount.toFixed(2)} Total</span>
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
                <span className="viz-value">${stats.totalAmount.toFixed(0)}</span>
                <span className="viz-label">Earned</span>
              </div>
            </div>
          </div>
          <p className="activity-hero__visual-note muted-text">
            Your activity at a glance
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="activity-filters glass-panel">
        <div className="filter-group">
          <span className="filter-label">Type:</span>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'payout' ? 'active' : ''}`} onClick={() => setFilter('payout')}>Payouts</button>
          <button className={`filter-btn ${filter === 'activation' ? 'active' : ''}`} onClick={() => setFilter('activation')}>Activations</button>
          <button className={`filter-btn ${filter === 'receipt' ? 'active' : ''}`} onClick={() => setFilter('receipt')}>Receipts</button>
        </div>
        <div className="filter-group">
          <span className="filter-label">Time:</span>
          <button className={`filter-btn ${timeRange === 'all' ? 'active' : ''}`} onClick={() => setTimeRange('all')}>All Time</button>
          <button className={`filter-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => setTimeRange('week')}>Last Week</button>
          <button className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>Last Month</button>
          <button className={`filter-btn ${timeRange === 'year' ? 'active' : ''}`} onClick={() => setTimeRange('year')}>Last Year</button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="activity-main-grid">
        <div className="activity-main-grid__left">
          
          {/* ACTIVITY FEED - Live Data */}
          <section className="activity-feed glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">
                Timeline
              </span>
              <h2 className="activity-section-heading__title">
                Recent account and platform activity
              </h2>
            </div>

            <div className="activity-feed__list">
              {filteredActivities.length === 0 ? (
                <div className="activity-empty">
                  <p className="soft-text">No activity found</p>
                  <p className="small muted-text">Complete registration or activate levels to see activity</p>
                </div>
              ) : (
                filteredActivities.slice(0, 15).map((activity, idx) => (
                  <div key={activity.id || idx} className="activity-feed__item glass-panel">
                    <div className="activity-feed__icon" style={{ background: `${getActivityColor(activity.type)}20`, borderColor: getActivityColor(activity.type) }}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="activity-feed__content">
                      <h3 className="activity-feed__title">{activity.title}</h3>
                      <p className="activity-feed__text soft-text">
                        {activity.description}
                        {activity.level && ` • Level ${activity.level}`}
                        {activity.position && ` • Position ${activity.position}`}
                        {activity.cycle && ` • Cycle ${activity.cycle}`}
                      </p>
                      {activity.amount > 0 && (
                        <div className="activity-amount">+${activity.amount.toFixed(2)} USDT</div>
                      )}
                      {activity.hash && (
                        <div className="activity-hash">
                          <a href={`https://amoy.polygonscan.com/tx/${activity.hash}`} target="_blank" rel="noopener noreferrer">
                            TX: {shortHash(activity.hash)}
                          </a>
                        </div>
                      )}
                    </div>
                    <span className="activity-feed__time muted-text">{formatDate(activity.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* RECEIPTS TABLE - Live Data */}
          <section className="activity-receipts glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">
                Receipts
              </span>
              <h2 className="activity-section-heading__title">
                Transaction and record snapshot
              </h2>
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
                receipts.slice(0, 10).map((receipt, idx) => (
                  <div key={idx} className="activity-receipts__row glass-panel">
                    <span className="activity-receipts__cell">
                      {receipt.receiptType === 2 ? '💰 Payout' : '📋 Receipt'}
                    </span>
                    <span className="activity-receipts__cell amount">
                      +${(receipt.liquidPaid || receipt.grossAmount || 0).toFixed(2)} USDT
                    </span>
                    <span className="activity-receipts__cell">Level {receipt.level}</span>
                    <span className="activity-receipts__cell status completed">Completed</span>
                    <span className="activity-receipts__cell date">{formatDate(receipt.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="activity-main-grid__right">
          
          {/* ACTIVITY SUMMARY - Live Stats */}
          <section className="activity-summary glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">
                Summary
              </span>
              <h2 className="activity-section-heading__title">
                Activity snapshot and record counts
              </h2>
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
                <strong className="activity-summary__value">${stats.totalAmount.toFixed(2)}</strong>
              </div>
            </div>
          </section>

          {/* REGISTRATION INFO */}
          <section className="activity-registration glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">
                Registration
              </span>
              <h2 className="activity-section-heading__title">
                Account creation details
              </h2>
            </div>

            <div className="registration-info">
              <div className="info-row">
                <span className="info-label">Status</span>
                <span className="info-value">{registrationInfo?.registered ? '✓ Registered' : 'Not Registered'}</span>
              </div>
              {registrationInfo?.referrer && (
                <div className="info-row">
                  <span className="info-label">Referrer</span>
                  <span className="info-value">{registrationInfo.referrer.slice(0, 10)}...{registrationInfo.referrer.slice(-8)}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Wallet</span>
                <span className="info-value">{account.slice(0, 12)}...{account.slice(-10)}</span>
              </div>
            </div>
          </section>

          {/* LEVEL ACTIVATION STATUS */}
          <section className="activity-levels glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">
                Level Status
              </span>
              <h2 className="activity-section-heading__title">
                Your activation progress
              </h2>
            </div>

            <div className="levels-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
                const isActive = levelActivations.some(a => a.level === level)
                return (
                  <div key={level} className={`level-badge ${isActive ? 'active' : 'inactive'}`}>
                    <span className="level-number">{level}</span>
                    {isActive && <span className="level-check">✓</span>}
                  </div>
                )
              })}
            </div>
          </section>

          {/* DOWNLOAD / EXPORT */}
          <section className="activity-export glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">
                Export Data
              </span>
              <h2 className="activity-section-heading__title">
                Download your activity history
              </h2>
            </div>

            <div className="export-buttons">
              <button className="export-btn" onClick={() => {
                const data = JSON.stringify(activities, null, 2)
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `ffn-activity-${new Date().toISOString().split('T')[0]}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}>
                📥 Export as JSON
              </button>
              <button className="export-btn" onClick={() => {
                const csvRows = [['Type', 'Title', 'Amount', 'Level', 'Date']]
                activities.forEach(a => {
                  csvRows.push([a.type, a.title, a.amount || '', a.level || '', new Date(a.timestamp * 1000).toLocaleString()])
                })
                const csv = csvRows.map(row => row.join(',')).join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `ffn-activity-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}>
                📊 Export as CSV
              </button>
            </div>
            <p className="export-note soft-text">Download your complete transaction history for tax or record-keeping purposes.</p>
          </section>

          {/* VISUAL SLOT */}
          <section className="activity-visual glass-panel">
            <div className="activity-section-heading">
              <span className="activity-section-heading__eyebrow muted-text">
                Visual Slot
              </span>
              <h2 className="activity-section-heading__title">
                Reserved history visual area
              </h2>
            </div>

            <div className="activity-visual__box">
              <div className="timeline-icon">📅</div>
              <div className="timeline-line"></div>
            </div>

            <p className="activity-visual__note muted-text">
              Your complete activity timeline
            </p>
          </section>
        </div>
      </div>

      <style>{`
        .connect-wallet-btn {
          padding: 12px 28px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
          color: #07111f;
          font-weight: bold;
          border: none;
          cursor: pointer;
          font-size: 16px;
          width: fit-content;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(77, 163, 255, 0.2);
          border-top-color: var(--glow-blue);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .loading-container {
          text-align: center;
          padding: 60px;
        }
        
        /* Activity Summary Visualization */
        .activity-summary-viz {
          display: flex;
          justify-content: space-around;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .viz-stat {
          text-align: center;
        }
        .viz-value {
          display: block;
          font-size: 28px;
          font-weight: bold;
          color: var(--glow-teal);
        }
        .viz-label {
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        /* Filter Bar */
        .activity-filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          padding: 12px 20px;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .filter-label {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .filter-btn {
          padding: 6px 14px;
          border-radius: 30px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        .filter-btn.active {
          background: var(--glow-teal);
          color: #07111f;
        }
        
        /* Activity Feed */
        .activity-feed__item {
          position: relative;
          transition: all 0.2s;
        }
        .activity-feed__item:hover {
          transform: translateX(4px);
        }
        .activity-amount {
          font-size: 13px;
          font-weight: bold;
          color: var(--glow-teal);
          margin-top: 4px;
        }
        .activity-hash {
          margin-top: 4px;
        }
        .activity-hash a {
          font-size: 11px;
          color: var(--text-secondary);
          text-decoration: none;
        }
        .activity-hash a:hover {
          color: var(--glow-teal);
        }
        .activity-empty {
          text-align: center;
          padding: 40px 20px;
        }
        
        /* Receipts Table */
        .receipts-header {
          display: grid;
          grid-template-columns: 1fr 1fr 0.8fr 0.8fr 1.2fr;
          gap: 12px;
          padding: 10px 14px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .activity-receipts__row {
          display: grid;
          grid-template-columns: 1fr 1fr 0.8fr 0.8fr 1.2fr;
          gap: 12px;
          align-items: center;
        }
        .activity-receipts__cell.amount {
          color: var(--glow-teal);
          font-weight: bold;
        }
        .activity-receipts__cell.status.completed {
          color: #28a745;
        }
        .activity-receipts__cell.date {
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        /* Registration Info */
        .registration-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .info-label {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .info-value {
          font-family: monospace;
          font-size: 12px;
        }
        
        /* Level Grid */
        .levels-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        .level-badge {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          font-weight: bold;
        }
        .level-badge.active {
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
          color: #07111f;
        }
        .level-badge.inactive {
          opacity: 0.5;
        }
        .level-check {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #28a745;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Export Section */
        .export-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .export-btn {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        .export-btn:hover {
          background: rgba(255,255,255,0.2);
        }
        .export-note {
          font-size: 11px;
          text-align: center;
          margin-top: 12px;
        }
        
        /* Timeline Visual */
        .timeline-icon {
          font-size: 48px;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        .small { font-size: 12px; }
        .muted-text { color: var(--text-secondary); }
        .soft-text { color: var(--text-secondary); }
        
        @media (max-width: 768px) {
          .activity-filters { flex-direction: column; align-items: stretch; }
          .filter-group { justify-content: center; }
          .receipts-header { display: none; }
          .activity-receipts__row {
            grid-template-columns: 1fr;
            gap: 8px;
            text-align: center;
          }
          .levels-grid { grid-template-columns: repeat(5, 1fr); gap: 8px; }
          .level-badge { padding: 8px; font-size: 12px; }
          .export-buttons { flex-direction: column; }
        }
      `}</style>
    </section>
  )
}

export default ActivityPage