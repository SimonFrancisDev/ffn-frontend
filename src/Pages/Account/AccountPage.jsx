import './AccountPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { useSpace } from '../../context/SpaceContext'
import { ethers } from 'ethers'
import { fetchUserSummaryApi } from '../../Services/orbitsApi'
import { 
  FaUserFriends, FaCoins, FaArrowRight, FaTelegram, 
  FaWhatsapp, FaWallet, FaShieldAlt, FaExternalLinkAlt, FaCopy 
} from 'react-icons/fa'

const AccountPage = () => {
  const navigate = useNavigate()
  const { isConnected, account, balance: polBalance, connect } = useWallet()
  const { contracts, isLoading: contractsLoading } = useContracts()
  const { viewedAddress, isOwnSpace, switchToSelf, switchToVisitor } = useSpace()

  const resolvedAddress = viewedAddress || account || ''

  // --- STATE ---
  const [summary, setSummary] = useState(null)
  const [profileInput, setProfileInput] = useState('')
  const [profileError, setProfileError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [copySuccess, setCopySuccess] = useState(false)
  const [referralShortCode, setReferralShortCode] = useState('')

  // --- HELPERS ---
  const formatDisplay = useCallback((value) => {
    // Backend sends human-readable strings (e.g. "7.00"). 
    // We just ensure it's a number for formatting.
    const num = parseFloat(value) || 0
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }, [])


  const getMoney = useCallback((value) => {
  return formatDisplay(value || 0)
}, [formatDisplay])

  const shortAddress = (addr) => {
    if (!addr || addr === ethers.ZeroAddress) return '—'
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`
  }

  // const referralLink = useMemo(() => {
  //   return `https://finfreedomnetwork.io/activation?ref=${resolvedAddress}`
  // }, [resolvedAddress])


//   const referralLink = useMemo(() => {
//   const code = referralShortCode || resolvedAddress
//   return `https://finfreedomnetwork.io/activation?ref=${code}`
// }, [resolvedAddress, referralShortCode])

  const referralLink = useMemo(() => {
  const code = referralShortCode || resolvedAddress
  return `https://finfreedomnetwork.io/ref/${code}`
}, [resolvedAddress, referralShortCode])

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!resolvedAddress) return
    try {
      // Production Standard: One single source of truth for growth and tokens
      const data = await fetchUserSummaryApi(resolvedAddress)
      setSummary(data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error("Dashboard Sync Error:", err)
    }
  }, [resolvedAddress])

  useEffect(() => {
  if (!resolvedAddress) return
  const fetchShortCode = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''
      const res = await fetch(`${API_BASE}/api/referral/code/${resolvedAddress}`)
      const data = await res.json()
      if (data.success && data.shortCode) {
        setReferralShortCode(data.shortCode)
      }
    } catch (err) {
      console.error('Failed to fetch short code:', err)
    }
  }
  fetchShortCode()
}, [resolvedAddress])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // 60s for performance
    return () => clearInterval(interval)
  }, [fetchData])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleShare = (platform) => {
    const text = `Join my orbit on Fin Freedom Network! 🚀 ${referralLink}`
    const url = platform === 'tg' 
      ? `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleViewProfile = () => {
    if (!ethers.isAddress(profileInput)) {
      setProfileError('Invalid wallet address')
      return
    }
    setProfileError('')
    switchToVisitor?.(profileInput)
    setProfileInput('')
  }

  if (contractsLoading || (!summary && isConnected)) {
    return (
      <div className="account-loading-gate">
        <div className="spinner" />
        <p>Syncing Protocol Data...</p>
      </div>
    )
  }


const earnings = summary?.earnings || {}
const highestActiveLock = earnings?.highestActiveLock || null
const currentLocksByLevel = Array.isArray(earnings?.currentLocksByLevel)
  ? earnings.currentLocksByLevel
  : []
const financialByLevel = Array.isArray(earnings?.byLevel) ? earnings.byLevel : []

const totalGenerated = earnings.totalGenerated || earnings.totalGross || 0
const walletCredited = earnings.totalLiquid || 0
const escrowUsed = earnings.totalEscrowUsed || earnings.totalEscrow || 0
const currentEscrowLocked = earnings.currentEscrowLocked || 0
const remainingToNextUpgrade = earnings.remainingToNextUpgrade || 0

  return (
    <section className="account-page">
      
      {/* 1. CENTERED HERO SECTION (MATURED) */}
      <header className="account-hero-matured account-surface">
        <div className="profile-identity-group">
          <div className="avatar-circle">
            {resolvedAddress.slice(2, 4).toUpperCase()}
          </div>
          <div className={`status-pill ${summary?.earnings?.count > 0 ? 'active' : 'guest'}`}>
             {summary?.earnings?.count > 0 ? 'Active Builder' : 'Ecosystem Guest'}
          </div>
        </div>
        <h1 className="hero-display-address">{shortAddress(resolvedAddress)}</h1>
        <p className="hero-member-type">F-Freedom Program Participant</p>
        {/* <div className="hero-stats-row">
          <span className="hero-stat-chip">Level {summary?.earnings?.highestLevel || 0}</span>
          <span className="hero-stat-chip">{summary?.earnings?.count || 0} Referrals</span>
          <span className="hero-stat-chip">Amoy Network</span>
        </div> */}
        <div className="hero-stats-row">
          <span className="hero-stat-chip">Level {earnings?.highestLevel || 0}</span>
          <span className="hero-stat-chip">{earnings?.receiptCount || earnings?.count || 0} Receipts</span>
          <span className="hero-stat-chip">Amoy Network</span>
        </div>
      </header>

      {/* 2. PROFILE SWITCHER (CENTERED & CLEAN) */}
      <div className="account-surface profile-switcher-box">
        <div className="switcher-header">
          <h3>Explore Network Spaces</h3>
          {!isOwnSpace && (
            <button className="return-btn" onClick={switchToSelf}>Return to My Profile</button>
          )}
        </div>
        <div className="switcher-input-group">
          <input 
            value={profileInput} 
            onChange={(e) => setProfileInput(e.target.value)} 
            placeholder="Paste wallet address (0x...)"
          />
          <button onClick={handleViewProfile}>View Space</button>
        </div>
        {profileError && <p className="error-text">{profileError}</p>}
      </div>

      <div className="account-main-grid">
        <div className="account-main-grid__left">
          
          {/* 3. REFERRAL ENGINE */}
          <section className="account-surface referral-engine">
            <div className="section-title-group">
              <FaUserFriends />
              <h2>Referral Engine</h2>
            </div>
            <div className="referral-link-container">
              <label>Your Secure Invitation Link</label>
              <div className="copy-box">
                <input readOnly value={referralLink} />
                <button onClick={handleCopyLink}>
                  {copySuccess ? 'Copied!' : <FaCopy />}
                </button>
              </div>
            </div>
            <div className="social-share-row">
              <button onClick={() => handleShare('tg')} className="share-btn tg"><FaTelegram /> Telegram</button>
              <button onClick={() => handleShare('wa')} className="share-btn wa"><FaWhatsapp /> WhatsApp</button>
            </div>
          </section>

          {/* 4. PROTOCOL REWARDS (FGT & FGTR) */}
          <section className="account-surface rewards-center">
            <div className="section-title-group">
              <FaCoins />
              <h2>F-Freedom Rewards</h2>
            </div>
            <div className="reward-grid">
              <div className="reward-tile inner-surface">
                <span className="tile-label">FGT (Activation)</span>
                <strong className="tile-value glow-blue">{formatDisplay(summary?.tokens?.FGT?.total)}</strong>
              </div>
              <div className="reward-tile inner-surface">
                <span className="tile-label">FGTr (Recycle)</span>
                <strong className="tile-value glow-teal">{formatDisplay(summary?.tokens?.FGTr?.total)}</strong>
              </div>
            </div>
            <button className="nav-action-btn" onClick={() => navigate('/my-tokens')}>
              See full token history <FaArrowRight />
            </button>
          </section>
        </div>

        <div className="account-main-grid__right">
          
          {/* 5. CUMULATIVE EARNINGS */}
          {/* <section className="account-surface earnings-highlight">
            <div className="section-title-group">
              <FaShieldAlt />
              <h2>System Earnings</h2>
            </div>
            <div className="earnings-hero">
              <span className="hero-label">Cumulative USDT Payouts</span>
              <h2 className="hero-value">${formatDisplay(summary?.earnings?.totalLiquid)}</h2>
            </div>
            <button className="nav-action-btn" onClick={() => navigate('/activation')}>
              Inspect Orbits YOu earned From <FaArrowRight />
            </button>
          </section> */}

          <section className="account-surface earnings-highlight">
            <div className="section-title-group">
              <FaShieldAlt />
              <h2>Financial Position</h2>
            </div>

            <div className="earnings-hero">
              <span className="hero-label">Total Generated</span>
              <h2 className="hero-value">${getMoney(totalGenerated)}</h2>
              <p className="earnings-truth-note">
                Full value generated for this account before wallet/escrow split.
              </p>
            </div>

            <div className="financial-truth-grid">
              <div className="truth-tile inner-surface">
                <span>Wallet Credited</span>
                <strong className="truth-value wallet">${getMoney(walletCredited)}</strong>
                <small>Liquid USDT paid directly to wallet.</small>
              </div>

              <div className="truth-tile inner-surface">
                <span>Escrow / Auto-upgrade Used</span>
                <strong className="truth-value escrow">${getMoney(escrowUsed)}</strong>
                <small>Lifetime amount routed into upgrade escrow.</small>
              </div>

              <div className="truth-tile inner-surface">
                <span>Currently Locked</span>
                <strong className="truth-value locked">${getMoney(currentEscrowLocked)}</strong>
                <small>Still locked toward the next activation.</small>
              </div>

              <div className="truth-tile inner-surface">
                <span>Remaining to Next Upgrade</span>
                <strong className="truth-value remaining">${getMoney(remainingToNextUpgrade)}</strong>
                <small>
                  {highestActiveLock?.nextLevel
                    ? `Needed for Level ${highestActiveLock.nextLevel}.`
                    : 'No pending auto-upgrade requirement.'}
                </small>
              </div>
            </div>

            {highestActiveLock && Number(highestActiveLock.upgradeRequired || 0) > 0 && (
              <div className="auto-upgrade-progress inner-surface">
                <div className="auto-upgrade-progress__top">
                  <span>Auto-upgrade Progress</span>
                  <strong>
                    ${getMoney(highestActiveLock.currentLocked)} / ${getMoney(highestActiveLock.upgradeRequired)}
                  </strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        (Number(highestActiveLock.currentLocked || 0) /
                          Number(highestActiveLock.upgradeRequired || 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>

                <p>
                  {Number(highestActiveLock.remainingToNextUpgrade || 0) <= 0
                    ? 'Ready for the next auto-upgrade when protocol conditions are met.'
                    : `$${getMoney(highestActiveLock.remainingToNextUpgrade)} remaining for Level ${highestActiveLock.nextLevel}.`}
                </p>
              </div>
            )}

            <button className="nav-action-btn" onClick={() => navigate('/orbits')}>
              Inspect Orbit Earnings <FaArrowRight />
            </button>
          </section>
          {/* 6. WALLET SNAPSHOT */}
          <section className="account-surface wallet-snapshot">
            <div className="section-title-group">
              <FaWallet />
              <h2>Wallet Snapshot</h2>
            </div>
            {/* <div className="snapshot-list">
              <div className="snapshot-row"><span>POL Balance</span> <strong>{Number(polBalance).toFixed(4)}</strong></div>
              <div className="snapshot-row"><span>Program USDT</span> <strong>{formatDisplay(summary?.earnings?.totalLiquid)}</strong></div>
            </div> */}
            <div className="snapshot-list">
              <div className="snapshot-row">
                <span>POL Balance</span>
                <strong>{Number(polBalance).toFixed(4)}</strong>
              </div>
              <div className="snapshot-row">
                <span>Wallet Credited USDT</span>
                <strong>{getMoney(walletCredited)}</strong>
              </div>
              <div className="snapshot-row">
                <span>Currently Locked USDT</span>
                <strong>{getMoney(currentEscrowLocked)}</strong>
              </div>
              <div className="snapshot-row">
                <span>Total Generated USDT</span>
                <strong>{getMoney(totalGenerated)}</strong>
              </div>
            </div>
          </section>
          <section className="account-surface level-financial-breakdown">
              <div className="section-title-group">
                <FaExternalLinkAlt />
                <h2>Level Breakdown</h2>
              </div>

              {financialByLevel.length > 0 ? (
                <div className="level-finance-list">
                  {financialByLevel.map((item) => (
                    <div className="level-finance-row inner-surface" key={item.level}>
                      <div>
                        <strong>Level {item.level}</strong>
                        <span>{item.orbitType} • {item.receiptCount} receipts</span>
                      </div>

                      <div className="level-finance-values">
                        <span>Generated: ${getMoney(item.generated)}</span>
                        <span>Wallet: ${getMoney(item.liquid)}</span>
                        <span>Escrow: ${getMoney(item.escrowUsed)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-finance-note">
                  No indexed earnings yet for this account.
                </p>
              )}
          </section>
        </div>
      </div>
      
      <footer className="account-footer">
        Verified on-chain synchronization: {lastUpdated}
      </footer>
    </section>
  )
}

export default AccountPage