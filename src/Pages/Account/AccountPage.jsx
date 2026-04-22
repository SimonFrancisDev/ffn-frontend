import './AccountPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { ethers } from 'ethers'
import { fetchAddressReceiptsApi } from '../../Services/orbitsApi'

const LEVELS = Array.from({ length: 10 }, (_, index) => index + 1)

const AccountPage = () => {
  const { isConnected, account, balance: polBalance, connect } = useWallet()
  const { contracts, isLoading: contractsLoading, loadContracts } = useContracts()

  const [isRegistered, setIsRegistered] = useState(false)
  const [referrer, setReferrer] = useState('')
  const [activeLevels, setActiveLevels] = useState({})
  const [usdtBalance, setUsdtBalance] = useState('0.00')
  const [allowance, setAllowance] = useState('0.00')
  const [totalEarnings, setTotalEarnings] = useState('0.00')
  const [levelEarnings, setLevelEarnings] = useState({})
  const [downlineCount, setDownlineCount] = useState(0)
  const [registrationDate, setRegistrationDate] = useState(null)
  const [isId1Wallet, setIsId1Wallet] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [language, setLanguage] = useState('English')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [saveNotice, setSaveNotice] = useState('')

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

  const getInitials = useCallback((address) => {
    if (!address) return '??'
    return address.slice(2, 4).toUpperCase()
  }, [])

  const fetchUserData = useCallback(async () => {
    if (!contracts || !account) return

    try {
      const id1WalletAddress = await contracts.registration.id1Wallet()
      const isId1 = id1WalletAddress?.toLowerCase() === account.toLowerCase()
      setIsId1Wallet(isId1)

      const registered = await contracts.registration.isRegistered(account)
      setIsRegistered(registered)

      if (registered) {
        const ref = await contracts.registration.getReferrer(account)
        setReferrer(ref === ethers.ZeroAddress ? '' : ref)
        setRegistrationDate('2024-01-15')
      } else {
        setReferrer('')
        setRegistrationDate(null)
      }

      const levels = {}
      for (let i = 1; i <= 10; i += 1) {
        try {
          levels[i] = await contracts.registration.isLevelActivated(account, i)
        } catch {
          levels[i] = false
        }
      }
      setActiveLevels(levels)

      const balance = await contracts.usdt.balanceOf(account)
      setUsdtBalance(formatUsdt(balance).toFixed(2))

      const spender = contracts.levelManager.target
      const currentAllowance = await contracts.usdt.allowance(account, spender)
      setAllowance(formatUsdt(currentAllowance).toFixed(2))
    } catch (err) {
      console.error('Error fetching user data:', err)
    }
  }, [contracts, account, formatUsdt])

  const fetchEarningsData = useCallback(async () => {
    if (!account || !isRegistered) {
      setTotalEarnings('0.00')
      setLevelEarnings({})
      setDownlineCount(0)
      return
    }

    try {
      const result = await fetchAddressReceiptsApi(account)
      const receipts = Array.isArray(result) ? result : []

      let total = 0
      const earningsByLevel = {}

      receipts.forEach((receipt) => {
        const level = Number(receipt.level || 0)
        const liquid = Number(receipt.liquidPaid || 0)
        total += liquid
        earningsByLevel[level] = (earningsByLevel[level] || 0) + liquid
      })

      setTotalEarnings(total.toFixed(2))
      setLevelEarnings(earningsByLevel)

      const uniqueFromUsers = new Set(
        receipts
          .map((r) => r.fromUser)
          .filter((addr) => addr && addr !== ethers.ZeroAddress)
      )
      setDownlineCount(uniqueFromUsers.size)
    } catch (err) {
      console.error('Error fetching earnings:', err)
      setTotalEarnings('0.00')
      setLevelEarnings({})
      setDownlineCount(0)
    }
  }, [account, isRegistered])

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
    fetchEarningsData()
  }, [fetchEarningsData])

  useEffect(() => {
    if (!contracts || !account) return

    const interval = setInterval(() => {
      fetchUserData()
      fetchEarningsData()
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)

    return () => clearInterval(interval)
  }, [contracts, account, fetchUserData, fetchEarningsData])

  useEffect(() => {
    const savedLanguage = localStorage.getItem('ffn_language')
    const savedNotifications = localStorage.getItem('ffn_notifications')
    if (savedLanguage) setLanguage(savedLanguage)
    if (savedNotifications) setNotificationsEnabled(savedNotifications === 'true')
  }, [])

  const savePreferences = useCallback(() => {
    localStorage.setItem('ffn_language', language)
    localStorage.setItem('ffn_notifications', String(notificationsEnabled))
    setSaveNotice('Preferences saved')
    window.setTimeout(() => setSaveNotice(''), 1800)
  }, [language, notificationsEnabled])

  const highestLevel = useMemo(() => {
    const active = Object.entries(activeLevels)
      .filter(([, active]) => active)
      .map(([level]) => Number(level))
    return active.length ? Math.max(...active) : 0
  }, [activeLevels])

  const activeCount = useMemo(
    () => Object.values(activeLevels).filter(Boolean).length,
    [activeLevels]
  )

  const visibleEarnings = useMemo(
    () => LEVELS.filter((level) => Number(levelEarnings[level] || 0) > 0 || activeLevels[level]),
    [levelEarnings, activeLevels]
  )

  const sponsorLabel = isId1Wallet
    ? 'ID1 Wallet'
    : referrer
      ? shortAddress(referrer)
      : isRegistered
        ? 'System ID'
        : 'None'

  const memberStatusLabel = isRegistered ? 'Active Member' : 'Not Registered'

  if (!isConnected) {
    return (
      <section className="account-page">
        <div className="account-hero account-surface">
          <div className="account-hero__content">
            <div className="account-hero__eyebrow account-chip">
              <span className="account-hero__eyebrow-dot" />
              <span className="account-hero__eyebrow-text">Identity & Status</span>
            </div>
            <div className="account-hero__text-block">
              <h1 className="account-hero__title">My Account</h1>
              <p className="account-hero__description soft-text">
                Connect your wallet to view your account details and profile status.
              </p>
            </div>
            <button type="button" onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
          </div>
          <div className="account-hero__visual account-surface account-surface--inner">
            <div className="account-hero__visual-box">
              <div className="profile-viz profile-viz--empty">
                <div className="profile-avatar-large">👤</div>
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
          <div className="spinner" />
          <p>Loading account data...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="account-page">
      <div className="account-hero account-surface">
        <div className="account-hero__content">
          <div className="account-hero__eyebrow account-chip">
            <span className="account-hero__eyebrow-dot" />
            <span className="account-hero__eyebrow-text">
              Core account details, progress, and wallet status
            </span>
          </div>

          <div className="account-hero__text-block">
            <h1 className="account-hero__title">My Account</h1>
            <p className="account-hero__description soft-text">
              A simpler view of your profile, current status, wallet balances, and level progress.
            </p>
            <div className="small muted-text">Last updated: {lastUpdated}</div>
          </div>

          <div className="account-hero__chips">
            <span className="account-chip">{memberStatusLabel}</span>
            <span className="account-chip">Level {highestLevel || 0}</span>
            <span className="account-chip">{activeCount}/10 Activated</span>
            {isId1Wallet ? <span className="account-chip account-chip--accent">ID1 Wallet</span> : null}
          </div>
        </div>

        <div className="account-hero__visual account-surface account-surface--inner">
          <div className="account-hero__visual-box">
            <div className="profile-viz">
              <div className="profile-avatar-large">{getInitials(account)}</div>
              <div className="profile-status online" />
            </div>
          </div>
          <p className="account-hero__visual-note muted-text">
            {shortAddress(account)} • {memberStatusLabel}
          </p>
        </div>
      </div>

      <div className="account-main-grid">
        <div className="account-main-grid__left">
          <section className="account-summary account-surface">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">Account Summary</span>
              <h2 className="account-section-heading__title">The most important information</h2>
            </div>

            <div className="account-summary__card account-surface account-surface--inner">
              <div className="account-summary__avatar">{getInitials(account)}</div>
              <div className="account-summary__details">
                <strong className="account-summary__name">{shortAddress(account)}</strong>
                <span className="account-summary__meta soft-text">{account}</span>
                <span className="account-summary__meta soft-text">
                  Member since: {registrationDate || 'Register to start'}
                </span>
              </div>
            </div>

            <div className="account-summary__grid">
              <div className="account-info-card account-surface account-surface--inner">
                <span className="account-info-card__label muted-text">Status</span>
                <strong className="account-info-card__value">{memberStatusLabel}</strong>
              </div>
              <div className="account-info-card account-surface account-surface--inner">
                <span className="account-info-card__label muted-text">Sponsor</span>
                <strong className="account-info-card__value">{sponsorLabel}</strong>
              </div>
              <div className="account-info-card account-surface account-surface--inner">
                <span className="account-info-card__label muted-text">Highest Level</span>
                <strong className="account-info-card__value">{highestLevel || 0}</strong>
              </div>
              <div className="account-info-card account-surface account-surface--inner">
                <span className="account-info-card__label muted-text">Total Earned</span>
                <strong className="account-info-card__value">${totalEarnings}</strong>
              </div>
              <div className="account-info-card account-surface account-surface--inner">
                <span className="account-info-card__label muted-text">Downline Count</span>
                <strong className="account-info-card__value">{downlineCount}</strong>
              </div>
              <div className="account-info-card account-surface account-surface--inner">
                <span className="account-info-card__label muted-text">Allowance</span>
                <strong className="account-info-card__value">{allowance} USDT</strong>
              </div>
            </div>
          </section>

          <section className="account-levels account-surface">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">Level Progress</span>
              <h2 className="account-section-heading__title">Your activation journey</h2>
            </div>

            <div className="level-progress-grid">
              {LEVELS.map((level) => (
                <div
                  key={level}
                  className={`level-progress-item ${activeLevels[level] ? 'activated' : ''}`}
                >
                  <span className="level-number">{level}</span>
                  {activeLevels[level] ? <span className="level-check">✓</span> : null}
                </div>
              ))}
            </div>

            <div className="level-progress-bar">
              <div className="level-progress-fill" style={{ width: `${(activeCount / 10) * 100}%` }} />
            </div>
            <p className="level-progress-text">{activeCount} of 10 levels activated</p>
          </section>
        </div>

        <div className="account-main-grid__right">
          <section className="account-wallet account-surface">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">Wallet Snapshot</span>
              <h2 className="account-section-heading__title">Connected wallet details</h2>
            </div>

            <div className="account-wallet__list">
              <div className="account-wallet__item account-surface account-surface--inner">
                <span className="account-wallet__label muted-text">Address</span>
                <strong className="account-wallet__value">{shortAddress(account)}</strong>
              </div>
              <div className="account-wallet__item account-surface account-surface--inner">
                <span className="account-wallet__label muted-text">Network</span>
                <strong className="account-wallet__value">Polygon Amoy Testnet</strong>
              </div>
              <div className="account-wallet__item account-surface account-surface--inner">
                <span className="account-wallet__label muted-text">POL Balance</span>
                <strong className="account-wallet__value">
                  {polBalance ? parseFloat(polBalance).toFixed(4) : '0.0000'} POL
                </strong>
              </div>
              <div className="account-wallet__item account-surface account-surface--inner">
                <span className="account-wallet__label muted-text">USDT Balance</span>
                <strong className="account-wallet__value">{usdtBalance} USDT</strong>
              </div>
            </div>
          </section>

          <section className="account-earnings account-surface">
            <div className="account-section-heading">
              <span className="account-section-heading__eyebrow muted-text">Earnings</span>
              <h2 className="account-section-heading__title">Earnings by active level</h2>
            </div>

            <div className="earnings-list">
              {visibleEarnings.length ? (
                visibleEarnings.map((level) => {
                  const earned = Number(levelEarnings[level] || 0)
                  const share = Number(totalEarnings) > 0 ? Math.min((earned / Number(totalEarnings)) * 100, 100) : 0

                  return (
                    <div key={level} className="earnings-item">
                      <span className="earnings-level">Level {level}</span>
                      <div className="earnings-bar-container">
                        <div className="earnings-bar" style={{ width: `${share}%` }} />
                      </div>
                      <span className="earnings-amount">${earned.toFixed(2)}</span>
                    </div>
                  )
                })
              ) : (
                <div className="earnings-empty">
                  <p className="soft-text">No earnings yet</p>
                  <p className="small muted-text">Activate levels to start earning</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Preferences section - moved OUTSIDE the grid for full width */}
      <section className="account-preferences account-surface account-preferences--fullwidth">
        <div className="account-section-heading">
          <span className="account-section-heading__eyebrow muted-text">Preferences</span>
          <h2 className="account-section-heading__title">Simple account settings</h2>
        </div>

        <div className="preferences-list">
          {/* <div className="preference-item">
            <span className="preference-label">Language</span>
            <select
              className="preference-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Spanish">Español</option>
              <option value="French">Français</option>
              <option value="Arabic">العربية</option>
            </select>
          </div> */}

          <div className="preference-item">
            <span className="preference-label">Language</span>
            <select
              className="preference-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Italian">Italian</option>
              <option value="Chinese">Chinese (China, Taiwan, Singapore)</option>
              <option value="Hindi">Hindi (India)</option>
              <option value="Persian">Persian (Iran, Afghanistan, Tajikistan)</option>
              <option value="Indonesian">Indonesian</option>
              <option value="Korean">Korean (South Korea)</option>
              <option value="French">French (France, Belgium, Switzerland, Canada)</option>
              <option value="Spanish">Spanish (Spain)</option>
              <option value="Russian">Russian</option>
              <option value="Vietnamese">Vietnamese</option>
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
              <span className="toggle-slider" />
              <span className="toggle-label">{notificationsEnabled ? 'ON' : 'OFF'}</span>
            </label>
          </div>

          <button type="button" className="save-preferences-btn" onClick={savePreferences}>
            Save Preferences
          </button>

          {saveNotice ? <div className="save-notice">{saveNotice}</div> : null}
        </div>
      </section>
    </section>
  )
}

export default AccountPage