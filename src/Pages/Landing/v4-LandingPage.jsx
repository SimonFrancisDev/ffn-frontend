// landingPage.jsx - Complete Unified Fixed Version
import { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ethers } from 'ethers'
import {
  ArrowRightLeft,
  BadgeInfo,
  CircleHelp,
  Coins,
  Database,
  Eye,
  Home,
  Lock,
  MessageCircle,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserCircle2,
  Users,
  Wallet,
} from 'lucide-react'
import { FaFacebookF, FaInstagram } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { PiTelegramLogoFill } from 'react-icons/pi'
import { useWallet } from '../../hooks/useWallet'
import { useSpace } from '../../context/SpaceContext'
import { useSession } from '../../context/SessionContext'
import './LandingPage.css'

const API_BASE_URL = 'https://fin-freedom-backend-3.onrender.com'

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || `Request failed: ${response.status}`)
  return payload
}

const SOCIAL_LINKS = [
  { id: 'telegram', label: 'Telegram', icon: PiTelegramLogoFill, href: 'https://t.me/' },
  { id: 'instagram', label: 'Instagram', icon: FaInstagram, href: 'https://instagram.com/' },
  { id: 'facebook', label: 'Facebook', icon: FaFacebookF, href: 'https://facebook.com/' },
  { id: 'x', label: 'X', icon: FaXTwitter, href: 'https://x.com/' },
]

const PLANET_LEVELS = [
  { level: 1, code: 'FFN-level-1', title: 'level 1', orbit: 'P4', positions: 4, price: '10 USDT', description: 'First entry and activation.' },
  { level: 2, code: 'FFN-level-2', title: 'level 2', orbit: 'P12', positions: 12, price: '20 USDT', description: 'Growth layer with wider network reach.' },
  { level: 3, code: 'FFN-level-3', title: 'level 3', orbit: 'P39', positions: 39, price: '40 USDT', description: 'Expanded structure for stronger visibility.' },
  { level: 4, code: 'FFN-level-4', title: 'level 4', orbit: 'P4', positions: 4, price: '80 USDT', description: 'Re-entry into P4 Orbit with a higher earning features.' },
  { level: 5, code: 'FFN-level-5', title: 'level 5', orbit: 'P12', positions: 12, price: '160 USDT', description: 'A normal P12 orbit system with wider earning structure.' },
  { level: 6, code: 'FFN-level-6', title: 'level 6', orbit: 'P39', positions: 39, price: '320 USDT', description: 'Advanced participation layer with expanded reach.' },
  { level: 7, code: 'FFN-level-7', title: 'level 7', orbit: 'P4', positions: 4, price: '640 USDT', description: 'Higher checkpoint in the compact orbit line.' },
  { level: 8, code: 'FFN-level-8', title: 'level 8', orbit: 'P12', positions: 12, price: '1280 USDT', description: 'Deep progression layer with broad scope.' },
  { level: 9, code: 'FFN-level-9', title: 'level 9', orbit: 'P39', positions: 39, price: '2560 USDT', description: 'One of the deepest advanced structure layers.' },
  { level: 10, code: 'FFN-level-10', title: 'level 10', orbit: 'P4', positions: 4, price: '5120 USDT', description: 'Premium progression milestone.' },
]

const PROGRAMS = [
  { id: 'f-freedom-program', title: 'F-Freedom Program', description: 'The foundational participation engine of the ecosystem, built around structured progression and transparent execution.', status: 'Phase 1 Focus', badge: 'Current Program', image: '/images/program-f-freedom.jpg', isLive: true },
  { id: 'freedom-plus-program', title: 'Freedom-Plus Program', description: 'An advanced layer designed for deeper participation and long-term involvement.', status: 'Future Phase', badge: 'Coming Soon', image: '/images/program-freedom-plus.jpg', isLive: false },
  { id: 'freedom-nft-program', title: 'Freedom NFT Program', description: 'A reputation-based membership layer that unlocks access to reward pools.', status: 'Ecosystem Layer', badge: 'Coming Soon', image: '/images/program-freedom-nft.jpg', isLive: false },
  { id: 'fin-freedom-marketplace', title: 'Fin Freedom Marketplace', description: 'A marketplace designed to connect value and utility inside the ecosystem.', status: 'Expansion Layer', badge: 'Coming Soon', image: '/images/program-fin-freedom-marketplace.jpg', isLive: false },
  { id: 'fin-freedom-coin', title: 'Fin Freedom Coin', description: 'A broader ecosystem coin initiative supporting utility and brand expansion.', status: 'Ecosystem Asset', badge: 'Coming Soon', image: '/images/program-fin-freedom-coin.jpg', isLive: false },
  { id: 'fin-freedom-institute', title: 'Fin Freedom Institute', description: 'A knowledge layer focused on education and structured learning.', status: 'Education Layer', badge: 'Coming Soon', image: '/images/program-fin-freedom-institute.jpg', isLive: false },
]

const HERO_MESSAGE = 'Welcome to Fin Freedom Network Program, the biggest community in the Ecosystem, Presenting the Fin Freedom Air Program. Structured From Level 1 to 10'
const APP_USER_ID_STORAGE_KEY = 'finfreedom_app_user_id_v1'
const DUPLICATED_PROGRAMS = PROGRAMS
const TOKEN_IMAGES = { fgt: '/images/fgt-token.png', fgtr: '/images/fgtr-token.png', ffc: '/images/ffc-token.png' }

const FOOTER_SERVICES = [
  { id: 'f-freedom-program', title: 'F-Freedom Program', image: '/images/program-f-freedom.jpg', isLive: true, route: 'home' },
  { id: 'freedom-plus-program', title: 'Freedom-Plus Program', image: '/images/program-freedom-plus.jpg', isLive: false },
  { id: 'freedom-nft-program', title: 'Freedom NFT Program', image: '/images/program-freedom-nft.jpg', isLive: false },
  { id: 'fin-freedom-marketplace', title: 'Fin Freedom Marketplace', image: '/images/program-fin-freedom-marketplace.jpg', isLive: false },
  { id: 'fin-freedom-coin', title: 'Fin Freedom Coin', image: '/images/program-fin-freedom-coin.jpg', isLive: false },
  { id: 'fin-freedom-institute', title: 'Fin Freedom Institute', image: '/images/program-fin-freedom-institute.jpg', isLive: false },
]

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString() : '—'
}

const shortenAddress = (value) => value ? `${value.slice(0, 6)}...${value.slice(-4)}` : 'Not connected'

const formatUsdt = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
}

const createInternalUserId = () => {
  if (typeof window === 'undefined') return ''
  return window.crypto?.randomUUID ? `ffn-${window.crypto.randomUUID()}` : `ffn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// Token Card with Flip Animation
const TokenFlipCard = ({ image, alt, tag, title, description, bullets, variant = 'fgt', delay = 0 }) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setIsFlipped(true)
      timeoutRef.current = setTimeout(() => setIsFlipped(false), 1000)
    }, delay)

    intervalRef.current = setInterval(() => {
      setIsFlipped(true)
      timeoutRef.current = setTimeout(() => setIsFlipped(false), 1000)
    }, 18000)

    return () => {
      clearTimeout(timeoutRef.current)
      clearInterval(intervalRef.current)
    }
  }, [delay])

  return (
    <div className="landing-coins__card glass-panel">
      <div className={`landing-coins__visual landing-coins__visual--${variant} ${isFlipped ? 'token-flip' : ''}`}>
        <div className="landing-coins__visual-glow" />
        <img src={image} alt={alt} className="landing-coins__token-image" onError={(e) => e.currentTarget.style.display = 'none'} />
        <div className="landing-coins__visual-placeholder">{alt}</div>
      </div>
      <div className="landing-coins__content">
        <span className="landing-coins__tag">{tag}</span>
        <h3 className="landing-coins__title">{title}</h3>
        <p className="landing-coins__text soft-text">{description}</p>
        <div className="landing-coins__bullets">
          {bullets.map((bullet, i) => <span key={i} className="landing-coins__bullet">{bullet}</span>)}
        </div>
      </div>
    </div>
  )
}

// Orbit Visual Component
const OrbitVisual = ({ type }) => {
  const getRings = () => {
    if (type === 'P4') return [{ count: 4, size: 60 }]
    if (type === 'P12') return [{ count: 3, size: 50 }, { count: 9, size: 90 }]
    if (type === 'P39') return [{ count: 3, size: 40 }, { count: 9, size: 70 }, { count: 27, size: 100 }]
    return []
  }
  const rings = getRings()
  return (
    <div className="orbit-mini-visual">
      {rings.map((ring, idx) => (
        <div key={idx} className="orbit-mini-ring" style={{ width: ring.size, height: ring.size }}>
          {Array.from({ length: ring.count }).map((_, i) => {
            const angle = (360 / ring.count) * i
            return <span key={i} className="orbit-mini-node" style={{ transform: `rotate(${angle}deg) translate(${ring.size / 2}px) rotate(-${angle}deg)` }} />
          })}
        </div>
      ))}
      <div className="orbit-mini-core" />
    </div>
  )
}

const MiniGrowthChart = ({ series = [] }) => {
  if (!Array.isArray(series) || series.length === 0) {
    return <div className="landing-stats__chart-empty"><span className="landing-stats__chart-empty-text muted-text">Chart syncing</span></div>
  }
  const points = series.slice(-10)
  const values = points.map(item => Number(item.registrations || 0))
  const max = Math.max(...values, 1)
  return (
    <div className="landing-stats__chart" aria-hidden="true">
      {points.map((item, index) => {
        const value = Number(item.registrations || 0)
        const height = Math.max((value / max) * 100, value > 0 ? 14 : 6)
        return (
          <div key={`${item.date || index}-${index}`} className="landing-stats__chart-bar-wrap" title={`${item.date || `Point ${index + 1}`} • ${value} registrations`}>
            <span className="landing-stats__chart-bar" style={{ height: `${height}%` }} />
            <span className="landing-stats__chart-label">{(item.date || '').slice(5) || `#${index + 1}`}</span>
          </div>
        )
      })}
    </div>
  )
}

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const LandingPage = ({ onNavigate }) => {
  const { isConnected, isLoading: isWalletLoading, error: walletError, connect } = useWallet()
  const { subjectAddress, isOwnSpace, canView, switchToSelf, switchToVisitor } = useSpace()
  const { isAcknowledged, acknowledge } = useSession()

  const [publicStats, setPublicStats] = useState({ totalParticipants: null, monthlyNewUsers: null, totalAmountMade: null, readLayerReady: false, lastSyncLabel: 'Waiting for sync' })
  const [isPublicStatsLoading, setIsPublicStatsLoading] = useState(true)
  const [growthSeries, setGrowthSeries] = useState([])
  const [userState, setUserState] = useState({ isRegistered: null, highestActiveLevel: null, nextLevel: 1 })
  const [isUserStateLoading, setIsUserStateLoading] = useState(false)
  const [forceShowDisclaimer, setForceShowDisclaimer] = useState(false)
  const [internalUserId, setInternalUserId] = useState('')
  const [profileInput, setProfileInput] = useState('')
  const [profileError, setProfileError] = useState('')
  const [programModal, setProgramModal] = useState(null)
  const [typedHeroMessage, setTypedHeroMessage] = useState('')

  const showDisclaimer = forceShowDisclaimer || !isAcknowledged

  useEffect(() => {
    let index = 0
    const text = HERO_MESSAGE
    setTypedHeroMessage('')
    const interval = window.setInterval(() => {
      index += 1
      setTypedHeroMessage(text.slice(0, index))
      if (index >= text.length) window.clearInterval(interval)
    }, 28)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      let storedUserId = window.localStorage.getItem(APP_USER_ID_STORAGE_KEY)
      if (!storedUserId) {
        storedUserId = createInternalUserId()
        window.localStorage.setItem(APP_USER_ID_STORAGE_KEY, storedUserId)
      }
      setInternalUserId(storedUserId)
    } catch (error) { console.error('Failed to initialize landing page local state:', error) }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadLandingPublicData = async () => {
      setIsPublicStatsLoading(true)
      try {
        const [summaryPayload, growthPayload] = await Promise.all([fetchJson('/api/community/summary'), fetchJson('/api/community/growth?days=14')])
        if (cancelled) return
        const summary = summaryPayload?.data || {}
        const publicData = summary.public || {}
        const growthData = growthPayload?.data || {}
        setPublicStats({
          totalParticipants: Number(publicData.totalParticipants || 0),
          monthlyNewUsers: Number(publicData.totalParticipants || 0),
          totalAmountMade: Number(publicData.visibleCoreBalanceUsdt || 0),
          readLayerReady: publicData.readLayerStatus === 'Live',
          lastSyncLabel: publicData.readLayerStatus || 'Syncing',
        })
        setGrowthSeries(Array.isArray(growthData.series) ? growthData.series : [])
      } catch (error) {
        if (cancelled) return
        console.error('Landing public data load failed:', error)
        setPublicStats({ totalParticipants: null, monthlyNewUsers: null, totalAmountMade: null, readLayerReady: false, lastSyncLabel: 'Degraded read mode' })
        setGrowthSeries([])
      } finally { if (!cancelled) setIsPublicStatsLoading(false) }
    }
    loadLandingPublicData()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadUserState = async () => {
      if (!subjectAddress || !canView) { setUserState({ isRegistered: null, highestActiveLevel: null, nextLevel: 1 }); return }
      setIsUserStateLoading(true)
      try {
        const payload = await fetchJson(`/api/community/member/${subjectAddress}/summary`)
        if (cancelled) return
        const data = payload?.data || {}
        const highestActiveLevel = Number(data.highestActiveLevel || 0)
        setUserState({ isRegistered: Boolean(data.isRegistered), highestActiveLevel: highestActiveLevel || null, nextLevel: Math.min((highestActiveLevel || 0) + 1, 10) })
      } catch (error) {
        if (cancelled) return
        console.error('Landing user state load failed:', error)
        setUserState({ isRegistered: null, highestActiveLevel: null, nextLevel: 1 })
      } finally { if (!cancelled) setIsUserStateLoading(false) }
    }
    loadUserState()
    return () => { cancelled = true }
  }, [subjectAddress, canView])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction
    if (showDisclaimer || programModal) { document.body.style.overflow = 'hidden'; document.body.style.touchAction = 'none' }
    return () => { document.body.style.overflow = previousOverflow; document.body.style.touchAction = previousTouchAction }
  }, [showDisclaimer, programModal])

  const walletStateLabel = useMemo(() => isWalletLoading ? 'Connecting' : isConnected ? 'Wallet Connected' : 'Wallet Not Connected', [isConnected, isWalletLoading])
  const systemStatusLabel = useMemo(() => isPublicStatsLoading ? 'Syncing Read Layer' : publicStats.readLayerReady ? 'Live & Synced' : publicStats.lastSyncLabel || 'Awaiting Data', [isPublicStatsLoading, publicStats])
  const registrationLabel = useMemo(() => !subjectAddress ? 'No Profile Selected' : !canView ? 'Profile Locked' : isUserStateLoading || userState.isRegistered === null ? 'Checking Registration' : userState.isRegistered ? 'Registered' : 'Registration Required', [subjectAddress, canView, isUserStateLoading, userState.isRegistered])
  const nextStepLabel = useMemo(() => !isOwnSpace ? (canView ? 'Viewing Public Profile' : 'Locked Profile') : walletError ? 'Resolve Wallet Issue' : isWalletLoading ? 'Connecting Wallet' : !isConnected ? 'Connect Wallet' : isUserStateLoading || userState.isRegistered === null ? 'Loading Account' : !userState.isRegistered ? 'Register Account' : `Activate Level ${userState.nextLevel}`, [isOwnSpace, canView, walletError, isWalletLoading, isConnected, isUserStateLoading, userState])
  const primaryCtaLabel = useMemo(() => !isOwnSpace ? 'Return to My Profile' : walletError ? 'Retry Wallet' : !isConnected ? 'Connect Wallet' : !userState.isRegistered ? 'Go to Registration' : 'Open Dashboard', [isOwnSpace, walletError, isConnected, userState.isRegistered])

  const primaryCtaAction = () => {
    if (!isOwnSpace) { switchToSelf(); return }
    if (walletError || !isConnected) { connect?.(); return }
    if (!userState.isRegistered) { onNavigate?.('activation'); return }
    onNavigate?.('dashboard')
  }

  const handleAcknowledgeDisclaimer = () => { acknowledge(); setForceShowDisclaimer(false) }
  const handleOpenRiskNotice = () => setForceShowDisclaimer(true)
  const handleProgramSelect = (program) => program.isLive ? onNavigate?.(program.route || 'home') : setProgramModal(program)
  const handleServiceSelect = (service) => service.isLive ? onNavigate?.(service.route || 'home') : setProgramModal(PROGRAMS.find(p => p.id === service.id) || { ...service, badge: 'Coming Soon', status: 'Upcoming Service', description: 'This service is being prepared for a future release.' })
  const handleViewProfile = () => {
    const nextValue = profileInput.trim()
    if (!nextValue) { setProfileError('Enter a wallet address to view a public profile.'); return }
    if (!ethers.isAddress(nextValue)) { setProfileError('Enter a valid wallet address.'); return }
    setProfileError('')
    switchToVisitor(nextValue)
  }
  const handleReturnToMyProfile = () => { setProfileError(''); switchToSelf() }

  return (
    <>
      <ModalPortal>
        {showDisclaimer && (
          <div className="landing-disclaimer">
            <div className="landing-disclaimer__backdrop" onClick={() => {}} />
            <div className="landing-disclaimer__dialog glass-panel" role="dialog" aria-modal="true">
              <div className="landing-disclaimer__header">
                <div className="landing-disclaimer__badge"><ShieldAlert size={16} /><span>Important Notice</span></div>
                <h2 className="landing-disclaimer__title">Security, risk, and data-use notice</h2>
                <p className="landing-disclaimer__intro soft-text">Fin Freedom Network is a wallet-first blockchain application. Please read this notice carefully.</p>
              </div>
              <div className="landing-disclaimer__body">
                <div className="landing-disclaimer__section"><div className="landing-disclaimer__section-icon"><Wallet size={18} /></div><div><h3 className="landing-disclaimer__section-title">Wallet responsibility</h3><p className="landing-disclaimer__section-text soft-text">You are solely responsible for your wallet and private keys.</p></div></div>
                <div className="landing-disclaimer__section"><div className="landing-disclaimer__section-icon"><TriangleAlert size={18} /></div><div><h3 className="landing-disclaimer__section-title">Irreversible blockchain actions</h3><p className="landing-disclaimer__section-text soft-text">Transactions confirmed on-chain are irreversible.</p></div></div>
                <div className="landing-disclaimer__section"><div className="landing-disclaimer__section-icon"><Eye size={18} /></div><div><h3 className="landing-disclaimer__section-title">Public profiles</h3><p className="landing-disclaimer__section-text soft-text">Viewing another profile does not grant transaction authority.</p></div></div>
                <div className="landing-disclaimer__meta glass-panel"><span className="landing-disclaimer__meta-label muted-text">Internal app user ID</span><code className="landing-disclaimer__meta-value">{internalUserId || 'Preparing...'}</code></div>
              </div>
              <div className="landing-disclaimer__consent landing-disclaimer__consent--static"><span>By continuing, you confirm that you understand the notice above.</span></div>
              <div className="landing-disclaimer__actions"><button className="landing-disclaimer__primary" onClick={handleAcknowledgeDisclaimer}>I Understand</button></div>
            </div>
          </div>
        )}
        {programModal && (
          <div className="landing-program-modal">
            <div className="landing-program-modal__backdrop" onClick={() => setProgramModal(null)} />
            <div className="landing-program-modal__dialog glass-panel" role="dialog" aria-modal="true">
              <div className="landing-program-modal__media"><img src={programModal.image} alt={programModal.title} className="landing-program-modal__image" onError={(e) => e.currentTarget.style.display = 'none'} /></div>
              <div className="landing-program-modal__content">
                <span className="landing-program-modal__badge">Coming Soon</span>
                <h3 className="landing-program-modal__title">{programModal.title}</h3>
                <p className="landing-program-modal__text soft-text">{programModal.description}</p>
                <div className="landing-program-modal__loader" />
                <p className="landing-program-modal__status">Preparing release</p>
                <button className="landing-disclaimer__primary" onClick={() => setProgramModal(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      <div className="landing-page">
        <section className="landing-hero">
          <div className="landing-hero__bg" />
          <div className="landing-hero__overlay" />
          <div className="landing-hero__container">
            <div className="landing-hero__layout">
              <div className="landing-hero__content">
                <div className="landing-hero__eyebrow glass-panel"><span className="landing-hero__eyebrow-dot" /><span className="landing-hero__eyebrow-text">Wallet-first access. Transparent structure. Deterministic progression.</span></div>
                <div className="landing-hero__text-block">
                  <h1 className="landing-hero__title">Fin Freedom Network Program, Welcome to the Largest community in the Ecosystem</h1>
                  <p className="landing-hero__description soft-text">Move through activation with confidence, track public profiles, and progress through the orbit program with a cleaner wallet-first experience.</p>
                </div>
                <div className="landing-hero__panel glass-panel">
                  <div className="landing-hero__profile-switcher">
                    <div className="landing-hero__profile-switcher-head">
                      <div><span className="landing-hero__profile-switcher-label muted-text">Profile Address Viewer</span><p className="landing-hero__profile-switcher-note soft-text">While you view your own address profile you can view another valid wallet profile.</p></div>
                      {!isOwnSpace && <button className="landing-hero__profile-return" onClick={handleReturnToMyProfile}><Home size={14} /><span>Return to My Profile</span></button>}
                    </div>
                    <div className="landing-hero__profile-switcher-row">
                      <div className="landing-hero__profile-input-wrap"><Search size={16} /><input type="text" value={profileInput} onChange={(e) => setProfileInput(e.target.value)} placeholder="Enter wallet address" className="landing-hero__profile-input" /></div>
                      <button className="landing-hero__profile-submit" onClick={handleViewProfile}><ArrowRightLeft size={16} /><span>View Profile</span></button>
                    </div>
                    <div className="landing-hero__profile-meta">
                      <span className="landing-hero__profile-chip">{isOwnSpace ? <Home size={14} /> : <Eye size={14} />}<span>{isOwnSpace ? 'My Profile' : 'Visitor View'}</span></span>
                      <span className="landing-hero__profile-chip">{canView ? <Eye size={14} /> : <Lock size={14} />}<span>{canView ? 'Public Profile' : 'Private Profile'}</span></span>
                      <span className="landing-hero__profile-address muted-text">{shortenAddress(subjectAddress)}</span>
                    </div>
                    {profileError && <p className="landing-hero__profile-error">{profileError}</p>}
                  </div>
                  <div className="landing-hero__actions">
                    <button className="landing-hero__primary-btn" onClick={primaryCtaAction}>{primaryCtaLabel}</button>
                    <button className="landing-hero__secondary-btn" onClick={() => onNavigate?.('activation')}>Go to Activation Center</button>
                  </div>
                </div>
              </div>
              <div className="landing-hero__side">
                <div className="landing-hero__terminal">
                  <div className="landing-hero__terminal-top"><div className="landing-hero__terminal-dots"><span className="first" /><span className="second" /><span className="third" /></div><span className="landing-hero__terminal-label">Guide</span></div>
                  <p className="landing-hero__terminal-text">{typedHeroMessage}<span className="landing-hero__typing-caret" /></p>
                </div>
                <div className="landing-hero__trust-row landing-hero__trust-row--compact">
                  <div className="landing-hero__trust-item glass-panel"><span className="landing-hero__trust-label muted-text">Notice</span><span className="landing-hero__trust-value">{systemStatusLabel}</span></div>
                  <div className="landing-hero__trust-item glass-panel"><span className="landing-hero__trust-label muted-text">Certificate</span><span className="landing-hero__trust-value">{registrationLabel}</span></div>
                  <div className="landing-hero__trust-item glass-panel"><span className="landing-hero__trust-label muted-text">Next Action</span><span className="landing-hero__trust-value">{nextStepLabel}</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stats app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Total Members. Registration Rate.</span>
            <h2 className="landing-section-heading__title">An overview of the community activities</h2>
            <p className="landing-section-heading__text soft-text">Key Community Metrics - Track The Community Growth</p>
          </div>
          <div className="landing-stats__grid">
            <div className="landing-stats__card glass-panel"><span className="landing-stats__icon"><Users size={20} color={"goldenrod"} /></span><span className="landing-stats__label muted-text">Total Participants</span><strong className="landing-stats__value">{formatNumber(publicStats.totalParticipants)}</strong><span className="landing-stats__note soft-text">Total registered participants.</span></div>
            <div className="landing-stats__card landing-stats__card--chart glass-panel"><div className="landing-stats__card-top"><span className="landing-stats__icon"><BadgeInfo size={20} color={"goldenrod"}  /></span><div className="landing-stats__card-copy"><span className="landing-stats__label muted-text">Membership rate</span><strong className="landing-stats__value">{publicStats.lastSyncLabel}</strong></div></div><MiniGrowthChart series={growthSeries} /><span className="landing-stats__note soft-text">Recent registration movement.</span></div>
            <div className="landing-stats__card glass-panel"><span className="landing-stats__icon"><Coins size={20} color={"goldenrod"}  /></span><span className="landing-stats__label muted-text">USDT Flow</span><strong className="landing-stats__value">{formatUsdt(publicStats.totalAmountMade)} USDT</strong><span className="landing-stats__note soft-text">Combined visible value surfaced.</span></div>
          </div>
        </section>

        <section className="landing-roadmap app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Your journey through the orbit system</span>
            <h2 className="landing-section-heading__title">Level Activation Road Map</h2>
            <p className="landing-section-heading__text soft-text">.....Earn an orbit and have your own referral tree......</p>
          </div>
          <div className="landing-roadmap__grid">
            {PLANET_LEVELS.map((item) => (
              <div key={item.level} className="landing-roadmap__card glass-panel">
                <div className="landing-roadmap__card-header">
                  <span className="landing-roadmap__badge">Level {item.level}</span>
                  <span className={`landing-roadmap__orbit-badge orbit-${item.orbit.toLowerCase()}`}>{item.orbit}</span>
                </div>
                <div className="landing-roadmap__visual"><OrbitVisual type={item.orbit} /></div>
                <h3 className="landing-roadmap__planet">{item.code}</h3>
                <p className="landing-roadmap__planet-text soft-text">{item.description}</p>
                <div className="landing-roadmap__meta"><span className="landing-roadmap__meta-pill">{item.price}</span><span className="landing-roadmap__meta-pill">{item.positions} Positions</span></div>
              </div>
            ))}
          </div>
          <div className="landing-roadmap__footer"><button className="landing-hero__secondary-btn" style={{backgroundColor: "skyblue"}} onClick={() => onNavigate?.('activation')}>Go to Activation Center</button></div>
        </section>

        <section className="landing-coins app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Token Ecosystem</span>
            <h2 className="landing-section-heading__title">Utility tokens earned through verified participation</h2>
            <p className="landing-section-heading__text soft-text">Earn tokens through qualifying events, with reserved space for future ecosystem assets.</p>
          </div>
          <div className="landing-coins__grid landing-coins__grid--triple">
            <TokenFlipCard image={TOKEN_IMAGES.fgt} alt="FGT Token" tag="FGT · First Activation" title="FGT Token" description="Issued on verified first-time level activation, forming part of the ecosystem's utility design." bullets={['First-time activation reward', 'On-chain verifiable activity', 'Designed for ecosystem utility']} variant="fgt" delay={0} />
            <TokenFlipCard image={TOKEN_IMAGES.fgtr} alt="FGTr Token" tag="FGTr · Reactivation" title="FGTr Token" description="Issued during qualifying reactivation events, mirroring the utility direction of FGT." bullets={['Reactivation event reward', 'Aligned with FGT utility', 'Excluded from NFT rules']} variant="fgtr" delay={2000} />
            <div className="landing-coins__card glass-panel landing-coins__card--coming">
              <div className="landing-coins__visual landing-coins__visual--placeholder"><div className="landing-coins__visual-glow" /><img src={TOKEN_IMAGES.ffc} alt="Upcoming token" className="landing-coins__token-image" /><div className="landing-coins__visual-placeholder">Upcoming Token Artwork</div></div>
              <div className="landing-coins__content"><span className="landing-coins__tag">Reserved · Coming Soon</span><h3 className="landing-coins__title">Future Ecosystem Tokens</h3><p className="landing-coins__text soft-text">Reserved panel for the next generation of ecosystem assets.</p><div className="landing-coins__bullets"><span className="landing-coins__bullet">Reserved token slot</span><span className="landing-coins__bullet">Prepared for expansion</span></div></div>
            </div>
          </div>
        </section>

        <section className="landing-programs app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Ecosystem Programs</span>
            <h2 className="landing-section-heading__title">Programs that shape ecosystem progression</h2>
            <p className="landing-section-heading__text soft-text">Each layer plays a distinct role in onboarding, rewards, and long-term participation.</p>
          </div>
          <div className="landing-programs__viewport">
            <div className="landing-programs__track">
              {DUPLICATED_PROGRAMS.map((program, index) => (
                <button key={`${program.id}-${index}`} className="landing-programs__card glass-panel" onClick={() => handleProgramSelect(program)}>
                  <div className="landing-programs__image-layer">
                    <img src={program.image} alt={program.title} className="landing-programs__image" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex' }} />
                    <div className="landing-programs__image-placeholder"><span>{program.title} Artwork</span></div>
                  </div>
                  <div className="landing-programs__overlay">
                    <div className="landing-programs__topbar"><span className="landing-programs__status">{program.status}</span><span className={`landing-programs__badge ${program.isLive ? 'landing-programs__badge--live' : 'landing-programs__badge--soon'}`}>{program.badge}</span></div>
                    <h3 className="landing-programs__title">{program.title}</h3>
                    <p className="landing-programs__description soft-text">{program.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer__inner glass-panel">
            <div className="landing-footer__brand">
              <div className="landing-footer__brand-logo-wrap"><img src="/images/logo.jpg" alt="Fin Freedom logo" className="landing-footer__brand-logo" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'inline-flex' }} /><div className="landing-footer__brand-mark">FFN</div></div>
              <div className="landing-footer__brand-text"><strong className="landing-footer__brand-name">Fin Freedom Network</strong><span className="landing-footer__brand-note soft-text">Premium wallet-first access to structured ecosystem participation.</span></div>
            </div>
            <div className="landing-footer__socials">{SOCIAL_LINKS.map((item) => { const Icon = item.icon; return <a key={item.id} href={item.href} target="_blank" rel="noreferrer" className={`landing-footer__social-link landing-footer__social-link--${item.id}`} aria-label={item.label}><Icon size={16} /><span>{item.label}</span></a> })}</div>
            <div className="landing-footer__columns">
              <div className="landing-footer__column landing-footer__column--services"><h3 className="landing-footer__heading">Services</h3><div className="landing-footer__service-list">{FOOTER_SERVICES.map((service) => (<button key={service.id} className="landing-footer__service" onClick={() => handleServiceSelect(service)}><span className="landing-footer__service-thumb"><img src={service.image} alt={service.title} className="landing-footer__service-image" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex' }} /><span className="landing-footer__service-fallback">{service.title.slice(0, 2)}</span></span><span className="landing-footer__service-copy"><span className="landing-footer__service-title">{service.title}</span>{!service.isLive ? <span className="landing-footer__service-badge">Coming Soon</span> : <span className="landing-footer__service-badge landing-footer__service-badge--live">Current</span>}</span></button>))}</div></div>
              <div className="landing-footer__column"><h3 className="landing-footer__heading">Community</h3><button className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('community')}><MessageCircle size={16} /><span>Community</span></button><button className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('support')}><CircleHelp size={16} /><span>Support</span></button><button className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('home')}><BadgeInfo size={16} /><span>Current Program</span></button></div>
              <div className="landing-footer__column"><h3 className="landing-footer__heading">Account</h3><button className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('account')}><UserCircle2 size={16} /><span>My Account</span></button><button className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('activity')}><BadgeInfo size={16} /><span>Activity</span></button><button className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('security')}><Shield size={16} /><span>Security</span></button></div>
              <div className="landing-footer__column"><h3 className="landing-footer__heading">Legal</h3><button className="landing-footer__link landing-footer__link--icon" onClick={handleOpenRiskNotice}><TriangleAlert size={16} /><span>Risk Disclaimer</span></button><button className="landing-footer__link landing-footer__link--icon" onClick={handleOpenRiskNotice}><Scale size={16} /><span>Privacy Notice</span></button><button className="landing-footer__link landing-footer__link--icon" onClick={handleOpenRiskNotice}><ShieldCheck size={16} /><span>Security Notice</span></button></div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default LandingPage