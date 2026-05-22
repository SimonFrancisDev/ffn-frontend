import './AccountPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { useSpace } from '../../context/SpaceContext'
import { ethers } from 'ethers'
import { fetchUserSummaryApi } from '../../Services/orbitsApi'
import { getApiUrl } from '../../Services/apiConfig'
import { resolveIdentity } from '../../utils/identityResolver'
import { useToast } from '../../components/feedback'
import { 
  FaUserFriends, FaCoins, FaArrowRight, FaTelegram, 
  FaWhatsapp, FaWallet, FaShieldAlt, FaExternalLinkAlt, FaCopy 
} from 'react-icons/fa'

const AccountPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const accountT = useCallback((key, fallback, options) => t(`accountPage.${key}`, fallback, options), [t])
  const { isConnected, account, balance: polBalance, connect } = useWallet()
  const { contracts, isLoading: contractsLoading } = useContracts()
  const { viewedAddress, isOwnSpace, switchToSelf, switchToVisitor } = useSpace()
  const toast = useToast()

  const resolvedAddress = viewedAddress || account || ''

  // --- STATE ---
  const [summary, setSummary] = useState(null)
  const [profileInput, setProfileInput] = useState('')
  const [profileError, setProfileError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [copySuccess, setCopySuccess] = useState(false)
  const [referralShortCode, setReferralShortCode] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [referredByCode, setReferredByCode] = useState('')
  const [referralAccessLoading, setReferralAccessLoading] = useState(false)
  const [referralAccessMessage, setReferralAccessMessage] = useState('')
  const [directReferrals, setDirectReferrals] = useState([])
  const [downlineStats, setDownlineStats] = useState(null)
  const [orbitNetwork, setOrbitNetwork] = useState(null)
  const [showAllDirectReferrals, setShowAllDirectReferrals] = useState(false)

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

  const isRegisteredAccount = useMemo(() => {
    return Boolean(
      summary?.isRegistered ||
      summary?.registration?.isRegistered ||
      summary?.earnings?.highestLevel > 0 ||
      summary?.activeLevels?.length > 0
    )
  }, [summary])

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!resolvedAddress) return
    try {
      // Production Standard: One single source of truth for growth and tokens
      const [data, referralsPayload, downlinePayload, orbitNetworkPayload] = await Promise.all([
        fetchUserSummaryApi(resolvedAddress),
        fetch(getApiUrl(`/api/community/member/${encodeURIComponent(resolvedAddress)}/referrals`))
          .then((res) => res.json())
          .catch(() => null),
        fetch(getApiUrl(`/api/community/member/${encodeURIComponent(resolvedAddress)}/downline`))
          .then((res) => res.json())
          .catch(() => null),
        fetch(getApiUrl(`/api/community/member/${encodeURIComponent(resolvedAddress)}/orbit-network`))
          .then((res) => res.json())
          .catch(() => null),
      ])
      setSummary(data)
      setDirectReferrals(referralsPayload?.data?.directReferrals || [])
      setDownlineStats(downlinePayload?.data || null)
      setOrbitNetwork(orbitNetworkPayload?.data || null)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error("Dashboard Sync Error:", err)
      toast.warning(accountT('errors.syncFailed', 'Account data could not be refreshed.'), { dedupeKey: 'account-summary-sync-failed' })
    }
  }, [resolvedAddress, accountT, toast])

  useEffect(() => {
    if (!resolvedAddress) {
      setReferralShortCode('')
      setReferralLink('')
      setReferredByCode('')
      setReferralAccessMessage('')
      return
    }

    const fetchReferralAccess = async () => {
      setReferralAccessLoading(true)

      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''
        const res = await fetch(`${API_BASE}/api/referral/code/${resolvedAddress}`)
        const data = await res.json()

        if (!res.ok || data.success === false) {
          setReferralShortCode('')
          setReferralLink('')
          setReferredByCode('')
          setReferralAccessMessage(
            data.message ||
              accountT('referral.lockedDefault', 'Register first to unlock your referral ID and invitation link.')
          )
          return
        }

        setReferralShortCode(data.shortCode || data.referralId || '')
        setReferralLink(data.fullLink || '')
        setReferredByCode(data.referredByCode || 'FIN-FREEDOM')
        setReferralAccessMessage('')
      } catch (err) {
        setReferralShortCode('')
        setReferralLink('')
        setReferredByCode('')
        setReferralAccessMessage(
          accountT('referral.accessUnavailable', 'Referral access is not available yet. Please try again after registration is confirmed.')
        )
      } finally {
        setReferralAccessLoading(false)
      }
    }

    fetchReferralAccess()
  }, [resolvedAddress, accountT])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // 60s for performance
    return () => clearInterval(interval)
  }, [fetchData])

  const handleCopyLink = () => {
    if (!referralLink) return

    navigator.clipboard.writeText(referralLink)
    setCopySuccess(true)
    toast.success(accountT('clipboard.referralCopied', 'Invitation link copied.'), { dedupeKey: 'account-referral-copied' })
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleShare = (platform) => {
    if (!referralLink) return

    const text = accountT('share.inviteText', 'Join me on Fin Freedom Network. Use my invitation link to enter the Activation Center: {{link}}', { link: referralLink })

    const url =
      platform === 'tg'
        ? `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`

    window.open(url, '_blank')
  }

  const handleViewProfile = async () => {
    const value = String(profileInput || '').trim()

    if (!value) {
      const message = accountT('errors.enterWalletOrReferral', 'Enter a wallet address or Referral ID')
      setProfileError(message)
      toast.warning(message, { dedupeKey: 'account-profile-empty' })
      return
    }

    try {
      const identity = await resolveIdentity(value)
      if (!identity.ok || !identity.walletAddress) {
        throw new Error(identity.message || accountT('errors.referralNotFound', 'Referral ID not found'))
      }

      setProfileError('')
      switchToVisitor?.(identity.walletAddress)
      setProfileInput('')
      toast.success(accountT('profile.viewingAccount', 'Viewing another account.'), { dedupeKey: 'account-profile-loaded' })
    } catch (err) {
      const message = accountT('errors.enterValidWalletOrReferral', 'Enter a valid wallet address or Referral ID')
      setProfileError(message)
      toast.danger(message, { dedupeKey: 'account-profile-invalid' })
    }
  }

  const handleViewAddress = useCallback((walletAddress) => {
    if (!walletAddress || !ethers.isAddress(walletAddress)) return
    switchToVisitor?.(walletAddress)
    toast.success(accountT('profile.viewingAccount', 'Viewing another account.'), { dedupeKey: `account-profile-loaded-${walletAddress}` })
  }, [accountT, switchToVisitor, toast])

  const visibleDirectReferrals = showAllDirectReferrals
    ? directReferrals
    : directReferrals.slice(0, 6)

  const orbitLevels = orbitNetwork?.levels || {}

  if (contractsLoading || (!summary && isConnected)) {
    return (
      <div className="account-loading-gate">
        <div className="spinner" />
        <p>{accountT('loading.syncingProtocolData', 'Syncing Protocol Data...')}</p>
      </div>
    )
  }


const earnings = summary?.earnings || {}
const highestActiveLock = earnings?.highestActiveLock || null
const financialByLevel = Array.isArray(earnings?.byLevel) ? earnings.byLevel : []

const totalGenerated =
  earnings.generatedGross ||
  earnings.totalGenerated ||
  earnings.totalGross ||
  0
const walletCredited =
  earnings.walletCreditedLiquid ||
  earnings.totalLiquid ||
  0

const escrowLockedLifetime =
  earnings.escrowLockedLifetime ||
  earnings.totalEscrow ||
  earnings.receiptEscrowLocked ||
  0

const autoUpgradeUsed =
  earnings.autoUpgradeUsed ||
  earnings.totalEscrowUsed ||
  0

const currentEscrowLocked = earnings.currentEscrowLocked || 0
const remainingToNextUpgrade = earnings.remainingToNextUpgrade || 0

const shouldShowUpgradeProgress =
  highestActiveLock &&
  highestActiveLock.shouldShowAutoUpgrade !== false &&
  Number(highestActiveLock.upgradeRequired || 0) > 0

  return (
    <section className="account-page">
      
      {/* 1. CENTERED HERO SECTION (MATURED) */}
      <header className="account-hero-matured account-surface">
        <div className="profile-identity-group">
          <div className="avatar-circle">
            {resolvedAddress.slice(2, 4).toUpperCase()}
          </div>
          <div className={`status-pill ${isRegisteredAccount ? 'active' : 'guest'}`}>
            {isRegisteredAccount ? accountT('status.registeredMember', 'Registered Member') : accountT('status.ecosystemGuest', 'Ecosystem Guest')}
          </div>
        </div>
        <h1 className="hero-display-address">{shortAddress(resolvedAddress)}</h1>
        <p className="hero-member-type">
          {/* {isOwnSpace ? 'Your F-Freedom account space' : 'Viewed F-Freedom account space'} */}
          {isOwnSpace ? accountT('hero.ownAccount', 'Your F-Freedom account') : accountT('hero.viewedAccount', 'Viewed F-Freedom account')}
        </p>
        <div className="hero-stats-row">
          <span className="hero-stat-chip">{accountT('hero.level', 'Level {{level}}', { level: earnings?.highestLevel || 0 })}</span>
          <span className="hero-stat-chip">{accountT('hero.receipts', '{{count}} Receipts', { count: earnings?.receiptCount || earnings?.count || 0 })}</span>
          <span className="hero-stat-chip">{accountT('hero.amoyNetwork', 'Amoy Network')}</span>
        </div>
        <button type="button" className="account-hero-action" onClick={() => navigate('/activation')}>
          {accountT('actions.goToActivationCenter', 'Go to Activation Center')} <FaArrowRight />
        </button>
      </header>

      {/* 2. PROFILE SWITCHER (CENTERED & CLEAN) */}
      <div className="account-surface profile-switcher-box">
        <div className="switcher-header">
          {/* <h3>Explore Network Spaces</h3> */}
          <h3>{accountT('switcher.title', 'Explore Network Accounts')}</h3>
          {!isOwnSpace && (
            // <button className="return-btn" onClick={switchToSelf}>Return to My Profile</button>
            <button className="return-btn" onClick={switchToSelf}>{accountT('actions.returnToMyAccount', 'Return to My Account')}</button>
          )}
        </div>
        <div className="switcher-input-group">
          <input 
            value={profileInput} 
            onChange={(e) => setProfileInput(e.target.value)} 
            // placeholder="Paste wallet address (0x...)"
            placeholder={accountT('switcher.placeholder', 'Wallet address or Referral ID')}
          />
          <button onClick={handleViewProfile}>{accountT('actions.viewAccount', 'View Account')}</button>
        </div>
        {profileError && <p className="error-text">{profileError}</p>}
      </div>

      <div className="account-main-grid">
        <div className="account-main-grid__left">
          
          {/* 3. REFERRAL ACCESS */}
          <section className="account-surface referral-engine">
            <div className="section-title-group">
              <FaUserFriends />
              <h2>{accountT('referral.title', 'Referral Access')}</h2>
            </div>

            {referralAccessLoading ? (
              <div className="referral-locked-card">
                <h3>{accountT('referral.checkingTitle', 'Checking your referral access...')}</h3>
                <p>{accountT('referral.checkingText', 'We are confirming whether this account has completed registration.')}</p>
              </div>
            ) : referralShortCode && referralLink ? (
              <>
                <div className="referral-identity-grid">
                  <div className="referral-id-tile inner-surface">
                    <span>{accountT('referral.yourReferralId', 'Your Referral ID')}</span>
                    <strong>{referralShortCode}</strong>
                  </div>

                  <div className="referral-id-tile inner-surface">
                    <span>{accountT('referral.referredBy', 'Invited By')}</span>
                    <strong>{referredByCode || 'FIN-FREEDOM'}</strong>
                  </div>
                </div>

                <div className="referral-link-container">
                  <label>{accountT('referral.invitationLink', 'Your Invitation Link')}</label>
                  <div className="copy-box">
                    <input readOnly value={referralLink} />
                    <button onClick={handleCopyLink}>
                      {copySuccess ? accountT('actions.copied', 'Copied!') : <FaCopy />}
                    </button>
                  </div>
                </div>

                <div className="social-share-row">
                  <button onClick={() => handleShare('tg')} className="share-btn tg">
                    <FaTelegram /> {accountT('social.telegram', 'Telegram')}
                  </button>
                  <button onClick={() => handleShare('wa')} className="share-btn wa">
                    <FaWhatsapp /> {accountT('social.whatsapp', 'WhatsApp')}
                  </button>
                </div>
              </>
            ) : (
              <div className="referral-locked-card">
                <h3>{accountT('referral.lockedTitle', 'Referral access is not open yet')}</h3>
                <p>
                  {referralAccessMessage ||
                    accountT('referral.lockedDefault', 'Register first to unlock your referral ID and invitation link.')}
                </p>

                {isOwnSpace && (
                  <button
                    type="button"
                    className="nav-action-btn"
                    onClick={() => navigate('/activation')}
                  >
                    {accountT('actions.goToActivationCenter', 'Go to Activation Center')} <FaArrowRight />
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="account-surface account-network">
            <div className="section-title-group">
              <FaUserFriends />
              <h2>{accountT('network.title', 'Direct Downlines')}</h2>
            </div>

            <div className="account-network__summary">
              <div className="account-network__metric inner-surface">
                <span>{accountT('network.direct', 'Direct Downlines')}</span>
                <strong>{directReferrals.length}</strong>
              </div>
              <div className="account-network__metric inner-surface">
                <span>{accountT('network.totalTeam', 'Total Team')}</span>
                <strong>{downlineStats?.total || 0}</strong>
                <small>{accountT('network.referralTree', 'Referral tree')}</small>
              </div>
            </div>

            <div className="account-network__levels">
              {Array.from({ length: 10 }, (_, index) => {
                const level = index + 1
                const levelData = orbitLevels[`level${level}`] || {}
                return (
                  <div key={level} className="account-network__level">
                    <span>{accountT('network.level', 'Level {{level}}', { level })}</span>
                    <strong>{levelData.totalMembersAcrossCycles || 0}</strong>
                  </div>
                )
              })}
            </div>
            <p className="account-network__note">
              {accountT('network.orbitLevelNote', 'Level counts below show orbit placements by activation level. Total Team above is counted from the referral tree only.')}
            </p>

            <div className="account-network__members">
              {directReferrals.length ? visibleDirectReferrals.map((item) => (
                <div key={`${item.user}-${item.txHash || item.blockNumber || ''}`} className="account-network__member">
                  <div>
                    <span>{accountT('network.member', 'Member')}</span>
                    <strong>{item.referralId || item.shortCode || accountT('network.pendingReferralId', 'Referral ID pending')}</strong>
                    <small>{shortAddress(item.user)}</small>
                  </div>
                  <button type="button" className="account-network__view" onClick={() => handleViewAddress(item.user)}>
                    {accountT('actions.viewAccount', 'View Account')} <FaArrowRight />
                  </button>
                </div>
              )) : (
                <div className="account-network__empty">
                  <p>{accountT('network.empty', 'No direct downlines found yet.')}</p>
                </div>
              )}
            </div>
            {directReferrals.length > 6 && (
              <button
                type="button"
                className="account-network__toggle"
                onClick={() => setShowAllDirectReferrals((current) => !current)}
              >
                {showAllDirectReferrals
                  ? accountT('actions.seeLess', 'See less')
                  : accountT('actions.seeMore', 'See more')}
              </button>
            )}
          </section>

          {/* 4. PROTOCOL REWARDS (FGT & FGTR) */}
          <section className="account-surface rewards-center">
            <div className="section-title-group">
              <FaCoins />
              <h2>{accountT('rewards.title', 'F-Freedom Rewards')}</h2>
            </div>
            <div className="reward-grid">
              <div className="reward-tile inner-surface">
                <span className="tile-label">{accountT('rewards.fgtActivation', 'FGT (Activation)')}</span>
                <strong className="tile-value glow-blue">{formatDisplay(summary?.tokens?.FGT?.total)}</strong>
              </div>
              <div className="reward-tile inner-surface">
                <span className="tile-label">{accountT('rewards.fgtrRecycle', 'FGTr (Recycle)')}</span>
                <strong className="tile-value glow-teal">{formatDisplay(summary?.tokens?.FGTr?.total)}</strong>
              </div>
            </div>
            <button className="nav-action-btn" onClick={() => navigate('/my-tokens')}>
              {accountT('actions.seeTokenHistory', 'See full token history')} <FaArrowRight />
            </button>
          </section>
        </div>

        <div className="account-main-grid__right">
          
          <section className="account-surface earnings-highlight">
            <div className="section-title-group">
              <FaShieldAlt />
              <h2>{accountT('financial.title', 'Financial Position')}</h2>
            </div>

            <div className="earnings-hero">
              <span className="hero-label">{accountT('financial.totalGenerated', 'Total Generated')}</span>
              <h2 className="hero-value">${getMoney(totalGenerated)}</h2>
              <p className="earnings-truth-note">
                {accountT('financial.totalGeneratedNote', 'Full value generated for this account before wallet/escrow split.')}
              </p>
            </div>

            <div className="financial-truth-grid">
              <div className="truth-tile inner-surface">
                <span>{accountT('financial.walletCredited', 'Wallet Credited')}</span>
                <strong className="truth-value wallet">${getMoney(walletCredited)}</strong>
                <small>{accountT('financial.walletCreditedText', 'Liquid USDT paid directly to wallet.')}</small>
              </div>

              <div className="truth-tile inner-surface">
                <span>{accountT('financial.escrowLockedLifetime', 'Escrow Locked Lifetime')}</span>
                <strong className="truth-value escrow">${getMoney(escrowLockedLifetime)}</strong>
                <small>{accountT('financial.escrowLockedText', 'Total USDT ever routed into upgrade escrow.')}</small>
              </div>

              <div className="truth-tile inner-surface">
                <span>{accountT('financial.currentlyLocked', 'Currently Locked')}</span>
                <strong className="truth-value locked">${getMoney(currentEscrowLocked)}</strong>
                <small>{accountT('financial.currentlyLockedText', 'Still locked toward the next activation.')}</small>
              </div>

              <div className="truth-tile inner-surface">
                <span>{accountT('financial.autoUpgradeUsed', 'Auto-upgrade Used')}</span>
                <strong className="truth-value used">${getMoney(autoUpgradeUsed)}</strong>
                <small>{accountT('financial.autoUpgradeUsedText', 'Escrow already consumed to activate higher levels.')}</small>
              </div>

              <div className="truth-tile inner-surface">
                <span>{accountT('financial.remainingToNextUpgrade', 'Remaining to Next Upgrade')}</span>
                <strong className="truth-value remaining">${getMoney(remainingToNextUpgrade)}</strong>
                <small>
                  {highestActiveLock?.nextLevel
                    ? accountT('financial.neededForLevel', 'Needed for Level {{level}}.', { level: highestActiveLock.nextLevel })
                    : accountT('financial.noPendingAutoUpgrade', 'No pending auto-upgrade requirement.')}
                </small>
              </div>
            </div>

            {shouldShowUpgradeProgress && (
              <div className="auto-upgrade-progress inner-surface">
                <div className="auto-upgrade-progress__top">
                  <span>{accountT('financial.autoUpgradeProgress', 'Auto-upgrade Progress')}</span>
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
                    ? accountT('financial.readyForAutoUpgrade', 'Ready for the next auto-upgrade when protocol conditions are met.')
                    : accountT('financial.remainingForLevel', '${{amount}} remaining for Level {{level}}.', { amount: getMoney(highestActiveLock.remainingToNextUpgrade), level: highestActiveLock.nextLevel })}
                </p>
              </div>
            )}

            <button className="nav-action-btn" onClick={() => navigate('/orbits')}>
              {accountT('actions.inspectOrbitEarnings', 'Inspect Orbit Earnings')} <FaArrowRight />
            </button>
          </section>
        </div>
      </div>

      <div className="account-secondary-grid">
                  {/* 6. WALLET SNAPSHOT */}
          <section className="account-surface wallet-snapshot">
            <div className="section-title-group">
              <FaWallet />
              <h2>{accountT('wallet.title', 'Wallet Snapshot')}</h2>
            </div>

            <p className="section-soft-note">
              {accountT('wallet.note', 'Quick view of the wallet balances and confirmed wallet-credit value.')}
            </p>

            <div className="snapshot-list snapshot-list--clean">
              <div className="snapshot-row snapshot-row--featured">
                <span>{accountT('wallet.polBalance', 'POL Balance')}</span>
                <strong>{Number(polBalance || 0).toFixed(4)}</strong>
              </div>

              {/* <div className="snapshot-row"> */}
                {/* <span>USDT Balance</span>
                <strong>{getMoney(summary?.wallet?.usdtBalance || summary?.usdtBalance || 0)}</strong> */}
              {/* </div> */}

              <div className="snapshot-row">
                <span>{accountT('wallet.walletCreditedUsdt', 'Wallet Credited USDT')}</span>
                <strong>{getMoney(walletCredited)}</strong>
              </div>
            </div>
          </section>
          <section className="account-surface level-financial-breakdown">
              <div className="section-title-group">
                <FaExternalLinkAlt />
                <h2>{accountT('levelBreakdown.title', 'Level Breakdown')}</h2>
              </div>

              {financialByLevel.length > 0 ? (
                <div className="level-finance-list">
                  {financialByLevel.map((item) => (
                    <div className="level-finance-row inner-surface" key={item.level}>
                      <div>
                        <strong>{accountT('levelBreakdown.level', 'Level {{level}}', { level: item.level })}</strong>
                        <span>{accountT('levelBreakdown.orbitReceipts', '{{orbitType}} � {{count}} receipts', { orbitType: item.orbitType, count: item.receiptCount })}</span>
                      </div>

                      <div className="level-finance-values">
                        <span>{accountT('levelBreakdown.totalGenerated', 'Total Generated: ${{amount}}', { amount: getMoney(item.generatedGross || item.generated) })}</span>
                        <span>{accountT('levelBreakdown.walletCredited', 'Wallet Credited: ${{amount}}', { amount: getMoney(item.walletCreditedLiquid || item.liquid) })}</span>
                        <span>{accountT('levelBreakdown.escrowLocked', 'Escrow Locked: ${{amount}}', { amount: getMoney(item.escrowLockedLifetime || item.receiptEscrowLocked) })}</span>
                        <span>{accountT('levelBreakdown.autoUpgradeUsed', 'Auto-upgrade Used: ${{amount}}', { amount: getMoney(item.autoUpgradeUsed || item.escrowUsed) })}</span>
                        <span>{accountT('levelBreakdown.currentlyLocked', 'Currently Locked: ${{amount}}', { amount: getMoney(item.currentEscrowLocked || item.currentLocked) })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-finance-note">
                  {accountT('levelBreakdown.empty', 'No indexed earnings yet for this account.')}
                </p>
              )}
          </section>
      </div>
      
      <footer className="account-footer">
        {accountT('footer.verifiedSync', 'Verified on-chain synchronization: {{time}}', { time: lastUpdated })}
      </footer>
    </section>
  )
}

export default AccountPage
