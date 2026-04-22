import './AccountPage.css'
import { useEffect, useState, useCallback } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { ethers } from 'ethers'
import { fetchAddressReceiptsApi } from '../../Services/orbitsApi'

const AccountPage = () => {
  const { isConnected, account, balance: polBalance, connect } = useWallet()
  const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()

  // Account States
  const [isRegistered, setIsRegistered] = useState(false)
  const [referrer, setReferrer] = useState('')
  const [activeLevels, setActiveLevels] = useState({})
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [allowance, setAllowance] = useState('0')
  const [totalEarnings, setTotalEarnings] = useState('0')
  const [levelEarnings, setLevelEarnings] = useState({})
  const [downlineCount, setDownlineCount] = useState(0)
  const [registrationDate, setRegistrationDate] = useState(null)
  const [isId1Wallet, setIsId1Wallet] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [recentActivity, setRecentActivity] = useState([])
  const [language, setLanguage] = useState('English')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Helper functions
  const formatUsdt = useCallback((value) => {
    try {
      return Number(ethers.formatUnits(value ?? 0, 6))
    } catch {
      return 0
    }
  }, [])

  const shortAddress = useCallback((addr) => {
    if (!addr || addr === ethers.ZeroAddress) return '—'
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`
  }, [])

  const getInitials = (address) => {
    if (!address) return '??'
    return address.slice(2, 4).toUpperCase()
  }

  // Fetch user data from contracts
  const fetchUserData = useCallback(async () => {
    if (!contracts || !account) return

    try {
      // Check ID1 wallet
      const id1WalletAddress = await contracts.registration.id1Wallet()
      const isId1 = id1WalletAddress?.toLowerCase() === account.toLowerCase()
      setIsId1Wallet(isId1)

      // Registration status
      const registered = await contracts.registration.isRegistered(account)
      setIsRegistered(registered)

      if (registered) {
        const ref = await contracts.registration.getReferrer(account)
        setReferrer(ref === ethers.ZeroAddress ? '' : ref)
        
        // Try to get registration timestamp (if available from events or storage)
        // For now, we'll use a placeholder - this could come from a backend API
        setRegistrationDate('2024-01-15')
      }

      // Active levels
      const levels = {}
      for (let i = 1; i <= 10; i++) {
        try {
          const activated = await contracts.registration.isLevelActivated(account, i)
          levels[i] = activated
        } catch {
          levels[i] = false
        }
      }
      setActiveLevels(levels)

      // USDT balance and allowance
      const balance = await contracts.usdt.balanceOf(account)
      setUsdtBalance(formatUsdt(balance).toFixed(2))

      const spender = contracts.levelManager.target
      const currentAllowance = await contracts.usdt.allowance(account, spender)
      setAllowance(formatUsdt(currentAllowance).toFixed(2))

    } catch (err) {
      console.error('Error fetching user data:', err)
    }
  }, [contracts, account, formatUsdt])

  // Fetch earnings data - FIXED VERSION
  const fetchEarningsData = useCallback(async () => {
    if (!account || !isRegistered) return

    try {
      console.log('Fetching receipts for:', account)
      const result = await fetchAddressReceiptsApi(account)
      console.log('Receipts API result:', result)
      
      // FIX: The API returns array directly, not { receipts: [] }
      const receipts = Array.isArray(result) ? result : []
      console.log('Receipts array:', receipts)
      console.log('Receipts count:', receipts.length)
      
      let total = 0
      const earningsByLevel = {}
      
      receipts.forEach(receipt => {
        const level = Number(receipt.level || 0)
        const liquid = Number(receipt.liquidPaid || 0)
        total += liquid
        earningsByLevel[level] = (earningsByLevel[level] || 0) + liquid
      })
      
      setTotalEarnings(total.toFixed(2))
      setLevelEarnings(earningsByLevel)
      
      // Calculate downline count from receipts (unique fromUser addresses)
      const uniqueFromUsers = new Set(receipts.map(r => r.fromUser).filter(addr => addr && addr !== ethers.ZeroAddress))
      setDownlineCount(uniqueFromUsers.size)
      
      // Create recent activity from receipts
      const recent = receipts.slice(0, 5).map(r => ({
        type: r.receiptType === 2 ? 'Earning' : 'Payout',
        amount: r.liquidPaid,
        level: r.level,
        timestamp: r.timestamp,
        date: r.timestamp ? new Date(r.timestamp * 1000).toLocaleDateString() : new Date().toLocaleDateString()
      }))
      setRecentActivity(recent)
      
    } catch (err) {
      console.error('Error fetching earnings:', err)
      console.error('Error details:', err.message)
    }
  }, [account, isRegistered])

  // Get highest active level
  const getHighestActiveLevel = useCallback(() => {
    const active = Object.entries(activeLevels)
      .filter(([, active]) => active)
      .map(([level]) => Number(level))
    return active.length ? Math.max(...active) : 0
  }, [activeLevels])

  // Load contracts and data
  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  useEffect(() => {
    if (contracts && account) {
      fetchUserData()
    }
  }, [contracts, account, fetchUserData])

  useEffect(() => {
    if (isRegistered) {
      fetchEarningsData()
    }
  }, [isRegistered, fetchEarningsData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!contracts || !account) return
    const interval = setInterval(() => {
      fetchUserData()
      if (isRegistered) fetchEarningsData()
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)
    return () => clearInterval(interval)
  }, [contracts, account, isRegistered, fetchUserData, fetchEarningsData])

  // Load preferences from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('ffn_language')
    const savedNotifications = localStorage.getItem('ffn_notifications')
    if (savedLanguage) setLanguage(savedLanguage)
    if (savedNotifications) setNotificationsEnabled(savedNotifications === 'true')
  }, [])

  // Save preferences
  const savePreferences = useCallback(() => {
    localStorage.setItem('ffn_language', language)
    localStorage.setItem('ffn_notifications', String(notificationsEnabled))
  }, [language, notificationsEnabled])

  const highestLevel = getHighestActiveLevel()
  const activeCount = Object.values(activeLevels).filter(Boolean).length

  // Get network name from chainId
  const getNetworkName = () => {
    if (!window.ethereum) return 'Unknown'
    return 'Polygon Amoy Testnet'
  }

  if (!isConnected) {
    return (
      <section className="account-page">
        <div className="account-hero">
          <div className="account-hero__content">
            <div className="account-hero__eyebrow glass-panel">
              <span className="account-hero__eyebrow-dot" />
              <span className="account-hero__eyebrow-text">Identity & Status</span>
            </div>
            <div className="account-hero__text-block">
              <h1 className="account-hero__title">My Account</h1>
              <p className="account-hero__description soft-text">
                Connect your wallet to view your account details, track your progress, and manage preferences.
              </p>
            </div>
            <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
          </div>
          <div className="account-hero__visual glass-panel">
            <div className="account-hero__visual-box">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👤</div>
                <div>Connect to view profile</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (contractsLoading) {
    return (
      <section className="account-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading account data...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="account-page">
      {/* Hero Section */}
      <div className="account-hero">
        <div className="account-hero__content">
          <div className="account-hero__eyebrow glass-panel">
            <span className="account-hero__eyebrow-dot" />
            <span className="account-hero__eyebrow-text">
              Identity, status, preferences, and account controls
            </span>
          </div>

          <div className="account-hero__text-block">
            <h1 className="account-hero__title">My Account</h1>
            <p className="account-hero__description soft-text">
              Review your account identity, participation status, connected wallet,
              and control settings from one clear profile space.
            </p>
            <div className="small muted-text">Last updated: {lastUpdated}</div>
          </div>

          <div className="account-hero__chips">
            <span className="account-hero__chip glass-panel">
              {isRegistered ? '✓ Registered' : '⚠ Not Registered'}
            </span>
            <span className="account-hero__chip glass-panel">
              Level {highestLevel || 0}
            </span>
            <span className="account-hero__chip glass-panel">
              {activeCount}/10 Activated
            </span>
            {isId1Wallet && (
              <span className="account-hero__chip glass-panel id1-chip">⭐ ID1 Wallet</span>
            )}
          </div>
        </div>

        <div className="account-hero__visual glass-panel">
          <div className="account-hero__visual-box">
            <div className="profile-viz">
              <div className="profile-avatar-large">{getInitials(account)}</div>
              <div className="profile-status online"></div>
            </div>
          </div>
          <p className="account-hero__visual-note muted-text">
            Your FFN identity • {isRegistered ? 'Active Member' : 'Guest'}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="account-main-grid">
        <div className="account-main-grid__left">
          
          {/* IDENTITY SECTION - Live Data */}
          <section className="account-identity glass-panel">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">
                Identity
              </span>
              <h2 className="account-section-heading__title">
                Your primary account profile
              </h2>
            </div>

            <div className="account-identity__card glass-panel">
              <div className="account-identity__avatar">{getInitials(account)}</div>
              <div className="account-identity__details">
                <strong className="account-identity__name">
                  {account ? `${account.slice(0, 10)}...${account.slice(-8)}` : 'Not connected'}
                </strong>
                <span className="account-identity__meta soft-text">{account || 'No wallet'}</span>
                <span className="account-identity__meta soft-text">
                  Member since: {registrationDate || 'Register to start'}
                </span>
              </div>
            </div>

            <div className="account-identity__stats">
              <div className="account-identity__stat glass-panel">
                <span className="account-identity__stat-label muted-text">Status</span>
                <strong className="account-identity__stat-value">
                  {isRegistered ? 'Active Member' : 'Not Registered'}
                </strong>
              </div>

              <div className="account-identity__stat glass-panel">
                <span className="account-identity__stat-label muted-text">Highest Level</span>
                <strong className="account-identity__stat-value">{highestLevel || 0}</strong>
              </div>

              {/* FIXED: Show "System ID" when registered but no referrer */}
              <div className="account-identity__stat glass-panel">
                <span className="account-identity__stat-label muted-text">Referrer</span>
                <strong className="account-identity__stat-value">
                  {isId1Wallet ? 'ID1 Wallet' : (referrer ? shortAddress(referrer) : (isRegistered ? 'System ID' : 'None'))}
                </strong>
              </div>

              <div className="account-identity__stat glass-panel">
                <span className="account-identity__stat-label muted-text">Total Earned</span>
                <strong className="account-identity__stat-value">${totalEarnings}</strong>
              </div>
            </div>
            <small className="data-source">Data Source: Registration Contract / Orbits API</small>
          </section>

          {/* OVERVIEW SECTION - Live Data */}
          <section className="account-overview glass-panel">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">
                Overview
              </span>
              <h2 className="account-section-heading__title">
                Important account information at a glance
              </h2>
            </div>

            <div className="account-overview__list">
              <div className="account-overview__item glass-panel">
                <span className="account-overview__label muted-text">Registration</span>
                <strong className="account-overview__value">
                  {isRegistered ? '✓ Completed' : '⚠ Pending'}
                </strong>
              </div>

              {/* FIXED: Show "System ID" when registered but no referrer */}
              <div className="account-overview__item glass-panel">
                <span className="account-overview__label muted-text">Sponsor Relationship</span>
                <strong className="account-overview__value">
                  {referrer ? 'Confirmed' : (isId1Wallet ? 'ID1 Root' : (isRegistered ? 'System ID' : 'None'))}
                </strong>
              </div>

              <div className="account-overview__item glass-panel">
                <span className="account-overview__label muted-text">Orbit Eligibility</span>
                <strong className="account-overview__value">
                  {highestLevel > 0 ? 'Enabled' : 'Not Available'}
                </strong>
              </div>

              <div className="account-overview__item glass-panel">
                <span className="account-overview__label muted-text">Downline Count</span>
                <strong className="account-overview__value">{downlineCount} members</strong>
              </div>

              <div className="account-overview__item glass-panel">
                <span className="account-overview__label muted-text">Levels Activated</span>
                <strong className="account-overview__value">{activeCount} / 10</strong>
              </div>

              <div className="account-overview__item glass-panel">
                <span className="account-overview__label muted-text">USDT Allowance</span>
                <strong className="account-overview__value">{allowance} USDT</strong>
              </div>
            </div>
            <small className="data-source">Data Source: Registration Contract / USDT Contract</small>
          </section>

          {/* LEVEL PROGRESS SECTION */}
          <section className="account-levels glass-panel">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">
                Level Progress
              </span>
              <h2 className="account-section-heading__title">
                Your activation journey
              </h2>
            </div>

            <div className="level-progress-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                <div key={level} className={`level-progress-item ${activeLevels[level] ? 'activated' : ''}`}>
                  <span className="level-number">{level}</span>
                  {activeLevels[level] && <span className="level-check">✓</span>}
                </div>
              ))}
            </div>
            <div className="level-progress-bar">
              <div className="level-progress-fill" style={{ width: `${(activeCount / 10) * 100}%` }} />
            </div>
            <p className="level-progress-text">{activeCount} of 10 levels activated</p>
            <small className="data-source">Data Source: Registration Contract</small>
          </section>

          {/* RECENT ACTIVITY */}
          <section className="account-activity glass-panel">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">
                Recent Activity
              </span>
              <h2 className="account-section-heading__title">
                Your latest transactions and events
              </h2>
            </div>

            <div className="activity-list">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, idx) => (
                  <div key={idx} className="activity-item">
                    <span className="activity-icon">💰</span>
                    <div className="activity-details">
                      <strong>{activity.type}</strong>
                      <span className="activity-amount">+${activity.amount} USDT</span>
                      <span className="activity-date">{activity.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="activity-empty">
                  <p className="soft-text">No recent activity yet</p>
                  <p className="small muted-text">Complete registration and activate levels to see activity</p>
                </div>
              )}
            </div>
            <small className="data-source">Data Source: Orbits API / Receipts</small>
          </section>
        </div>

        <div className="account-main-grid__right">
          
          {/* WALLET SECTION - Live Data */}
          <section className="account-wallet glass-panel">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">
                Wallet Snapshot
              </span>
              <h2 className="account-section-heading__title">
                Connected wallet and environment details
              </h2>
            </div>

            <div className="account-wallet__list">
              <div className="account-wallet__item glass-panel">
                <span className="account-wallet__label muted-text">Address</span>
                <strong className="account-wallet__value">{shortAddress(account)}</strong>
              </div>

              <div className="account-wallet__item glass-panel">
                <span className="account-wallet__label muted-text">Network</span>
                <strong className="account-wallet__value">{getNetworkName()}</strong>
              </div>

              <div className="account-wallet__item glass-panel">
                <span className="account-wallet__label muted-text">Provider</span>
                <strong className="account-wallet__value">MetaMask</strong>
              </div>

              <div className="account-wallet__item glass-panel">
                <span className="account-wallet__label muted-text">POL Balance</span>
                <strong className="account-wallet__value">{polBalance ? parseFloat(polBalance).toFixed(4) : '0'} POL</strong>
              </div>

              <div className="account-wallet__item glass-panel">
                <span className="account-wallet__label muted-text">USDT Balance</span>
                <strong className="account-wallet__value">{usdtBalance} USDT</strong>
              </div>
            </div>
            <small className="data-source">Data Source: useWallet / USDT Contract</small>
          </section>

          {/* EARNINGS BREAKDOWN */}
          <section className="account-earnings glass-panel">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">
                Earnings by Level
              </span>
              <h2 className="account-section-heading__title">
                Where your rewards come from
              </h2>
            </div>

            <div className="earnings-list">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
                const earned = levelEarnings[level] || 0
                if (earned === 0 && !activeLevels[level]) return null
                return (
                  <div key={level} className="earnings-item">
                    <span className="earnings-level">Level {level}</span>
                    <div className="earnings-bar-container">
                      <div className="earnings-bar" style={{ width: `${Math.min((earned / parseFloat(totalEarnings || 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="earnings-amount">${earned.toFixed(2)}</span>
                  </div>
                )
              })}
              {Object.keys(levelEarnings).length === 0 && (
                <div className="earnings-empty">
                  <p className="soft-text">No earnings yet</p>
                  <p className="small muted-text">Activate levels to start earning</p>
                </div>
              )}
            </div>
            <small className="data-source">Data Source: Orbits API / Receipts</small>
          </section>

          {/* PREFERENCES */}
          <section className="account-preferences glass-panel">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">
                Preferences
              </span>
              <h2 className="account-section-heading__title">
                Customize your experience
              </h2>
            </div>

            <div className="preferences-list">
              <div className="preference-item">
                <span className="preference-label">Language</span>
                <select 
                  className="preference-select glass-panel"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Spanish">Español</option>
                  <option value="French">Français</option>
                  <option value="Arabic">العربية</option>
                </select>
              </div>

              <div className="preference-item">
                <span className="preference-label">Notifications</span>
                <label className="preference-toggle">
                  <input 
                    type="checkbox" 
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">{notificationsEnabled ? 'ON' : 'OFF'}</span>
                </label>
              </div>

              <button className="save-preferences-btn" onClick={savePreferences}>
                Save Preferences
              </button>
            </div>
            <small className="data-source">Data Source: Local Storage</small>
          </section>

          {/* SECURITY NOTES */}
          <section className="account-security glass-panel">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">
                Security Notes
              </span>
              <h2 className="account-section-heading__title">
                Keep your account and wallet safe
              </h2>
            </div>

            <div className="account-security__list">
              <div className="account-security__item">
                <span className="account-security__icon">🛡️</span>
                <p className="soft-text">Never share your seed phrase or private keys.</p>
              </div>

              <div className="account-security__item">
                <span className="account-security__icon">⚠️</span>
                <p className="soft-text">Always confirm the correct network before signing.</p>
              </div>

              <div className="account-security__item">
                <span className="account-security__icon">🔍</span>
                <p className="soft-text">Review transaction details before approval.</p>
              </div>

              <div className="account-security__item">
                <span className="account-security__icon">🔗</span>
                <p className="soft-text">Only use official FFN links and verify contract addresses.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}

export default AccountPage
