import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRightLeft,
  BadgeInfo,
  CircleHelp,
  Coins,
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
  { level: 1, title: 'Entry', orbit: 'P4', positions: 4, price: '10 USDT', description: 'Your first step — the journey to structured freedom begins.' },
  { level: 2, title: 'Growth', orbit: 'P12', positions: 12, price: '20 USDT', description: 'This is the stage where your reach begins to expand.' },
  { level: 3, title: 'Expansion', orbit: 'P39', positions: 39, price: '40 USDT', description: 'An extended structure that increases visibility and participation.' },
  { level: 4, title: 'Momentum', orbit: 'P4', positions: 4, price: '80 USDT', description: 'A renewed cycle that strengthens consistency and enhances earning potential.' },
  { level: 5, title: 'Elevation', orbit: 'P12', positions: 12, price: '160 USDT', description: 'An advanced structure that unlocks greater movement and opportunity.' },
  { level: 6, title: 'Scale', orbit: 'P39', positions: 39, price: '320 USDT', description: 'A high-capacity stage where your reach expands and activity multiplies.' },
  { level: 7, title: 'Influence', orbit: 'P4', positions: 4, price: '640 USDT', description: 'A strengthened position where your activity begins to shape outcomes.' },
  { level: 8, title: 'Leadership', orbit: 'P12', positions: 12, price: '1280 USDT', description: 'A deeper progression stage focused on coordination, guidance, and sustained growth.' },
  { level: 9, title: 'Mastery', orbit: 'P39', positions: 39, price: '2560 USDT', description: 'An advanced stage of precision, control, and optimized earning potential.' },
  { level: 10, title: 'Zenith', orbit: 'P4', positions: 4, price: '5120 USDT', description: 'The highest milestone — representing peak positioning and maximum impact.' },
]

const PROGRAMS = [
  { id: 'f-freedom-program', title: 'F-Freedom Program', description: 'The foundational participation engine of the ecosystem, built around structured progression and transparent execution.', status: 'Phase 1 Focus', badge: 'Current Program', image: '/images/f-freedom.jpg', isLive: true, route: 'activation' },
  { id: 'freedom-plus-program', title: 'Freedom-Plus Program', description: 'An advanced layer designed for deeper participation and long-term involvement.', status: 'Future Phase', badge: 'Coming Soon', image: '/images/fin-freedom-plus.jpg', isLive: false },
  { id: 'freedom-nft-program', title: 'Freedom NFT Program', description: 'A reputation-based membership layer that unlocks access to reward pools.', status: 'Ecosystem Layer', badge: 'Coming Soon', image: '/images/fin-nft-program.jpg', isLive: false },
  { id: 'fin-freedom-marketplace', title: 'Fin Freedom Marketplace', description: 'A marketplace designed to connect value and utility inside the ecosystem.', status: 'Expansion Layer', badge: 'Coming Soon', image: '/images/ffn-marketplace.jpg', isLive: false },
  { id: 'fin-freedom-coin', title: 'Fin Freedom Coin', description: 'A broader ecosystem coin initiative supporting utility and brand expansion.', status: 'Ecosystem Asset', badge: 'Coming Soon', image: '/images/token-hologram-bg.png', isLive: false },
  { id: 'fin-freedom-institute', title: 'Fin Freedom Institute', description: 'A knowledge layer focused on education and structured learning.', status: 'Education Layer', badge: 'Coming Soon', image: '/images/fin-freedom-institute.jpg', isLive: false },
]

// Updated hero message
const HERO_MESSAGE = 'A wallet-first platform where participation rules are visible, actions are confirmed by the user, and every stage follows defined on-chain logic.'
const APP_USER_ID_STORAGE_KEY = 'finfreedom_app_user_id_v1'
const DUPLICATED_PROGRAMS = [...PROGRAMS, ...PROGRAMS]
const TOKEN_IMAGES = {
  fgt: '/images/fgt-token.png',
  fgtr: '/images/fgtr-token.png',
  ffc: '/images/ffc-token.png',
}

const COIN_SLIDES = [
  {
    id: 'fgt',
    image: '/images/fgt.png',
    title: 'Freedom Game Token',
    tag: 'Activation',
    description: 'Utility token issued when you activate a level for the first tinme',
  },
  {
    id: 'fgtr',
    image: '/images/fgtr.png',
    title: 'Freedom Game Token Reactivation',
    tag: 'Reactivation',
    description: 'Gain fgtr token on level reactivation at the ration iof 2:1.',
  },
  {
    id: 'ffc',
    image: '/images/ffc.png',
    title: 'Fin Freedom Coin',
    tag: 'Upcoming Program',
    description: 'Reserved for broader ecosystem utility and future expansion.',
  },
  {
    id: 'fpt',
    image: '/images/fpt.png',
    title: 'Freedom Plus Token',
    tag: 'Planned Asset',
    description: 'Reserved for broader ecosystem utility and future expansion.',
  },
  {
    id: 'fptr',
    image: '/images/fptr.png',
    title: 'Freedom Plus Token Reactivation',
    tag: 'Planned Asset',
    description: 'Reserved for broader ecosystem utility and future expansion.',
  },
]

const FOOTER_SERVICES = [
  { id: 'f-freedom-program', title: 'F-Freedom Program', image: '/images/program-f-freedom.jpg', isLive: true, route: 'activation' },
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

const shortenAddress = (value) => (value ? `${value.slice(0, 6)}...${value.slice(-4)}` : 'Not connected')

const formatUsdt = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric)
    ? numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
}

const createInternalUserId = () => {
  if (typeof window === 'undefined') return ''
  return window.crypto?.randomUUID
    ? `ffn-${window.crypto.randomUUID()}`
    : `ffn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

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
      <div className={`landing-coins__visual landing-coins__visual--${variant}`}>
        <div className="landing-coins__visual-glow" />
        <div className={`landing-coins__image-wrapper ${isFlipped ? 'token-flip' : ''}`}>
          <img
            src={image}
            alt={alt}
            className="landing-coins__token-image"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        </div>
        <div className="landing-coins__visual-placeholder">{alt}</div>
      </div>
      <div className="landing-coins__content">
        <span className="landing-coins__tag">{tag}</span>
        <h3 className="landing-coins__title">{title}</h3>
        <p className="landing-coins__text soft-text">{description}</p>
        <div className="landing-coins__bullets">
          {bullets.map((bullet, index) => (
            <span key={index} className="landing-coins__bullet">
              {bullet}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const CoinShowcase = () => {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % COIN_SLIDES.length)
    }, 4200)

    return () => window.clearInterval(interval)
  }, [])

  const activeCoin = COIN_SLIDES[activeIndex]

  return (
    <div className="landing-coin-showcase glass-panel">
      <div className="landing-coin-showcase__visual">
        <img
          src={activeCoin.image}
          alt={activeCoin.title}
          className="landing-coin-showcase__image"
          loading="lazy"
        />
      </div>

      <div className="landing-coin-showcase__content">
        <span className="landing-coin-showcase__tag">{activeCoin.tag}</span>
        <h3>{activeCoin.title}</h3>
        <p>{activeCoin.description}</p>

        <div className="landing-coin-showcase__dots">
          {COIN_SLIDES.map((coin, index) => (
            <button
              key={coin.id}
              type="button"
              className={`landing-coin-showcase__dot ${index === activeIndex ? 'is-active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${coin.title}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const OrbitVisual = ({ type }) => {
  const getRings = () => {
    if (type === 'P4') return [{ count: 4, size: 60 }]
    if (type === 'P12') return [{ count: 3, size: 50 }, { count: 9, size: 90 }]
    if (type === 'P39') return [{ count: 3, size: 40 }, { count: 9, size: 70 }, { count: 27, size: 100 }]
    return []
  }

  const rings = getRings()

  return (
    <div className="orbit-mini-visual" aria-hidden="true">
      {rings.map((ring, ringIndex) => (
        <div key={ringIndex} className="orbit-mini-ring" style={{ width: ring.size, height: ring.size }}>
          {Array.from({ length: ring.count }).map((_, index) => {
            const angle = (360 / ring.count) * index
            return (
              <span
                key={index}
                className="orbit-mini-node"
                style={{ transform: `rotate(${angle}deg) translate(${ring.size / 2}px) rotate(-${angle}deg)` }}
              />
            )
          })}
        </div>
      ))}
      <div className="orbit-mini-core" />
    </div>
  )
}

const MiniGrowthChart = ({ series = [] }) => {
  if (!Array.isArray(series) || series.length === 0) {
    return (
      <div className="landing-stats__chart-empty">
        <span className="landing-stats__chart-empty-text muted-text">Chart syncing</span>
      </div>
    )
  }

  const points = series.slice(-10)
  const values = points.map((item) => Number(item.registrations || 0))
  const max = Math.max(...values, 1)

  return (
    <div className="landing-stats__chart" aria-hidden="true">
      {points.map((item, index) => {
        const value = Number(item.registrations || 0)
        const height = Math.max((value / max) * 100, value > 0 ? 14 : 6)

        return (
          <div
            key={`${item.date || index}-${index}`}
            className="landing-stats__chart-bar-wrap"
            title={`${item.date || `Point ${index + 1}`} • ${value} registrations`}
          >
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

  const [publicStats, setPublicStats] = useState({
    totalParticipants: null,
    monthlyNewUsers: null,
    totalAmountMade: null,
    readLayerReady: false,
    lastSyncLabel: 'Waiting for sync',
  })
  const [isPublicStatsLoading, setIsPublicStatsLoading] = useState(true)
  const [growthSeries, setGrowthSeries] = useState([])
  const [userState, setUserState] = useState({ isRegistered: null, highestActiveLevel: null, nextLevel: 1 })
  const [isUserStateLoading, setIsUserStateLoading] = useState(false)
  const [forceShowDisclaimer, setForceShowDisclaimer] = useState(false)
  const [internalUserId, setInternalUserId] = useState('')
  const [programModal, setProgramModal] = useState(null)
  const [typedHeroMessage, setTypedHeroMessage] = useState('')
  
  // New modal states for legal documents
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showRiskModal, setShowRiskModal] = useState(false)
  const [showTransparencyModal, setShowTransparencyModal] = useState(false)

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
    } catch (error) {
      console.error('Failed to initialize landing page local state:', error)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadLandingPublicData = async () => {
      setIsPublicStatsLoading(true)
      try {
        const [summaryPayload, growthPayload] = await Promise.all([
          fetchJson('/api/community/summary'),
          fetchJson('/api/community/growth?days=14'),
        ])

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
        setPublicStats({
          totalParticipants: null,
          monthlyNewUsers: null,
          totalAmountMade: null,
          readLayerReady: false,
          lastSyncLabel: 'Degraded read mode',
        })
        setGrowthSeries([])
      } finally {
        if (!cancelled) setIsPublicStatsLoading(false)
      }
    }

    loadLandingPublicData()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadUserState = async () => {
      if (!subjectAddress || !canView) {
        setUserState({ isRegistered: null, highestActiveLevel: null, nextLevel: 1 })
        return
      }

      setIsUserStateLoading(true)
      try {
        const payload = await fetchJson(`/api/community/member/${subjectAddress}/summary`)
        if (cancelled) return

        const data = payload?.data || {}
        const highestActiveLevel = Number(data.highestActiveLevel || 0)

        setUserState({
          isRegistered: Boolean(data.isRegistered),
          highestActiveLevel: highestActiveLevel || null,
          nextLevel: Math.min((highestActiveLevel || 0) + 1, 10),
        })
      } catch (error) {
        if (cancelled) return
        console.error('Landing user state load failed:', error)
        setUserState({ isRegistered: null, highestActiveLevel: null, nextLevel: 1 })
      } finally {
        if (!cancelled) setIsUserStateLoading(false)
      }
    }

    loadUserState()
    return () => {
      cancelled = true
    }
  }, [subjectAddress, canView])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction

    if (showDisclaimer || programModal || showTermsModal || showPrivacyModal || showRiskModal || showTransparencyModal) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
    }
  }, [showDisclaimer, programModal, showTermsModal, showPrivacyModal, showRiskModal, showTransparencyModal])

  const systemStatusLabel = useMemo(
    () =>
      isPublicStatsLoading
        ? 'Syncing Read Layer'
        : publicStats.readLayerReady
          ? 'Live & Synced'
          : publicStats.lastSyncLabel || 'Awaiting Data',
    [isPublicStatsLoading, publicStats],
  )

  const registrationLabel = useMemo(
    () =>
      !subjectAddress
        ? 'No Profile Selected'
        : !canView
          ? 'Profile Locked'
          : isUserStateLoading || userState.isRegistered === null
            ? 'Checking Registration'
            : userState.isRegistered
              ? 'Registered'
              : 'Registration Required',
    [subjectAddress, canView, isUserStateLoading, userState],
  )

  const nextStepLabel = useMemo(
    () =>
      !isOwnSpace
        ? canView
          ? 'Viewing Public Profile'
          : 'Locked Profile'
        : walletError
          ? 'Resolve Wallet Issue'
          : isWalletLoading
            ? 'Connecting Wallet'
            : !isConnected
              ? 'Connect Wallet'
              : isUserStateLoading || userState.isRegistered === null
                ? 'Loading Account'
                : !userState.isRegistered
                  ? 'Register Account'
                  : `Activate Level ${userState.nextLevel}`,
    [isConnected, isOwnSpace, canView, isUserStateLoading, isWalletLoading, userState, walletError],
  )

  const primaryCtaLabel = useMemo(
    () =>
      !isOwnSpace
        ? 'Return to My Profile'
        : walletError
          ? 'Retry Wallet'
          : !isConnected
            ? 'Connect Wallet'
            : !userState.isRegistered
              ? 'Go to Registration'
              : 'Open Dashboard',
    [isConnected, isOwnSpace, userState.isRegistered, walletError],
  )

  const primaryCtaAction = () => {
    if (!isOwnSpace) {
      switchToSelf()
      return
    }

    if (walletError || !isConnected) {
      connect?.()
      return
    }

    if (!userState.isRegistered) {
      onNavigate?.('activation')
      return
    }

    onNavigate?.('dashboard')
  }

  const handleAcknowledgeDisclaimer = () => {
    acknowledge()
    setForceShowDisclaimer(false)
  }

  const handleProgramSelect = (program) => {
    if (program.isLive) {
      onNavigate?.(program.route || 'activation')
      return
    }
    setProgramModal(program)
  }

  const handleServiceSelect = (service) => {
    if (service.isLive) {
      onNavigate?.(service.route || 'activation')
      return
    }

    setProgramModal(
      PROGRAMS.find((program) => program.id === service.id) || {
        ...service,
        badge: 'Coming Soon',
        status: 'Upcoming Service',
        description: 'This service is being prepared for a future release.',
      },
    )
  }

  return (
    <>
      <ModalPortal>
        {/* Pre-Registration Disclaimer Modal */}
        {showDisclaimer && (
          <div className="landing-disclaimer">
            <div className="landing-disclaimer__backdrop" onClick={() => {}} />
            <div className="landing-disclaimer__dialog glass-panel" role="dialog" aria-modal="true">
              <div className="landing-disclaimer__header">
                <div className="landing-disclaimer__badge">
                  <ShieldAlert size={16} />
                  <span>Security & Legal Notice</span>
                </div>
                <h2 className="landing-disclaimer__title">Important Notice — Please Read Carefully</h2>
              </div>

              <div className="landing-disclaimer__body">
                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">Wallet Security</h3>
                    <p className="landing-disclaimer__section-text soft-text">You are solely responsible for securing your wallet. Never share your private key or secret recovery phrase with anyone — including sponsors, support staff, or administrators. Fin Freedom Network will never request your private key.</p>
                  </div>
                </div>

                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">Irreversible Registration</h3>
                    <p className="landing-disclaimer__section-text soft-text">Wallet addresses cannot be changed after registration. If your wallet has been compromised, you must create a new wallet before registering.</p>
                  </div>
                </div>

                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">Decentralized Participation</h3>
                    <p className="landing-disclaimer__section-text soft-text">Transactions are irreversible once confirmed on the blockchain. Always verify transaction details before signing.</p>
                  </div>
                </div>

                <div className="landing-disclaimer__meta glass-panel">
                  <span className="landing-disclaimer__meta-label muted-text">Internal app user ID</span>
                  <code className="landing-disclaimer__meta-value">{internalUserId || 'Preparing...'}</code>
                </div>
              </div>

              <div className="landing-disclaimer__consent landing-disclaimer__consent--static">
                <span>By clicking "I Understand & Proceed", you confirm that you understand the above and accept full responsibility for your wallet security.</span>
              </div>

              <div className="landing-disclaimer__actions" style={{ justifyContent: 'space-between', gap: '12px' }}>
                <button type="button" className="landing-hero__secondary-btn" onClick={() => setForceShowDisclaimer(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="button" className="landing-disclaimer__primary" onClick={handleAcknowledgeDisclaimer} style={{ flex: 1 }}>
                  I Understand & Proceed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Terms & Conditions Modal */}
        {showTermsModal && (
          <div className="landing-disclaimer">
            <div className="landing-disclaimer__backdrop" onClick={() => setShowTermsModal(false)} />
            <div className="landing-disclaimer__dialog glass-panel" style={{ maxWidth: '720px', maxHeight: '85vh' }}>
              <div className="landing-disclaimer__header">
                <div className="landing-disclaimer__badge">
                  <Scale size={16} />
                  <span>Legal</span>
                </div>
                <h2 className="landing-disclaimer__title">Terms & Conditions</h2>
                <p className="landing-disclaimer__intro soft-text">Last Updated: December 22, 2025</p>
              </div>
              <div className="landing-disclaimer__body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                <div className="legal-content">
                  <h4>1. Acceptance of Terms</h4>
                  <p>By accessing, registering, or using any part of the Fin Freedom Network platform ("the Platform"), you confirm that you have read, understood, and agreed to be bound by these Terms & Conditions ("Terms"). If you do not agree with any part of these Terms, you must not use the Platform.</p>

                  <h4>2. Nature of the Platform</h4>
                  <p>Fin Freedom Network is a decentralized, blockchain-based platform that operates through smart contracts deployed on public blockchains. The Platform: does not hold user funds, does not control user wallets, does not guarantee earnings or outcomes, does not provide financial, investment, legal, or tax advice. All transactions are executed automatically on-chain according to predefined smart contract logic.</p>

                  <h4>3. Eligibility</h4>
                  <p>You confirm that: you are at least 18 years old (or the legal age in your jurisdiction), you have the legal capacity to enter into this agreement, participation is lawful in your jurisdiction. You are solely responsible for understanding and complying with all applicable laws, regulations, and obligations in your country of residence.</p>

                  <h4>4. Wallet Responsibility</h4>
                  <p>Users must connect a self-custodial wallet (e.g., MetaMask, Trust Wallet, Token Pocket). You acknowledge that: wallet addresses cannot be changed once registered, lost private keys or recovery phrases cannot be recovered, Fin Freedom Network cannot reset, restore, or replace wallets. You are solely responsible for safeguarding your wallet credentials and for all activities conducted through your wallet.</p>

                  <h4>5. Program Participation</h4>
                  <p>Participation in any program (F-Freedom, Freedom-Plus, Freedom NFT Program) is voluntary. You understand that: all program rules are enforced by immutable smart contracts, payments, upgrades, recycling, and distributions are automatic, outcomes depend on participation, network activity, and system-defined rules. No representations are made regarding individual outcomes.</p>

                  <h4>6. Assumption of Risk</h4>
                  <p>You acknowledge and agree that participation in blockchain-based systems involves inherent risks, including but not limited to: smart contract vulnerabilities or unforeseen behavior, network congestion, delays, or failures, token price volatility, failures or compromises of third-party services. You voluntarily assume full responsibility for all such risks associated with using the Platform.</p>

                  <h4>7. No Guarantees</h4>
                  <p>Fin Freedom Network makes no guarantees regarding: profits, income, returns, referrals, future platform performance. Any examples, illustrations, or scenarios provided are for educational and informational purposes only.</p>

                  <h4>8. Token Use</h4>
                  <p>Tokens (including but not limited to FFC, FGT, FPT, FGTr, FPTr): are utility tokens, do not represent equity, ownership, or profit share, do not guarantee value appreciation. Tokens may be burned, frozen, restricted, or rendered unusable according to protocol rules and governance decisions.</p>

                  <h4>9. Smart Contract Finality</h4>
                  <p>Blockchain transactions are irreversible. Once confirmed, it cannot be reversed or refunded. You acknowledge that smart contract execution is final.</p>

                  <h4>10. Prohibited Use</h4>
                  <p>You agree not to: exploit, manipulate, or attempt to interfere with smart contracts, use automation, bots, or scripts to gain unfair advantage, engage in fraudulent, deceptive, or unlawful activity, attempt to reverse-engineer or bypass platform safeguards. Violation of these rules may result in restricted interface access without affecting on-chain contract execution.</p>

                  <h4>11. Third-Party Dependencies</h4>
                  <p>The Platform relies on third-party technologies and services, including blockchain networks, wallets, and infrastructure providers. Fin Freedom Network does not control and is not responsible for: security failures, outages, changes imposed by external providers.</p>

                  <h4>12. Governance</h4>
                  <p>Certain parameters may be adjusted only through: DAO voting, protocol-defined mechanisms. No single individual has unilateral authority to alter core system logic.</p>

                  <h4>13. Limitation of Liability</h4>
                  <p>To the fullest extent permitted by law, Fin Freedom Network and its contributors, developers, and community coordinators shall not be liable for any loss, including but not limited to: financial loss, wallet compromise, regulatory or legal actions, data loss.</p>

                  <h4>14. Indemnification</h4>
                  <p>You agree to indemnify and hold harmless the Platform and its contributors from any claims, damages, or liabilities arising from: your use of the Platform, your failure to comply with applicable laws or obligations.</p>

                  <h4>15. Tax Responsibility</h4>
                  <p>You are solely responsible for determining, reporting, and paying any taxes or governmental charges arising from your participation in the Platform.</p>

                  <h4>16. Governing Law</h4>
                  <p>These Terms are intended to operate within decentralized protocol principles and are not tied to any single jurisdiction, except where required by applicable law.</p>

                  <h4>17. Acceptance</h4>
                  <p>By registering or interacting with the Platform, you confirm your acceptance of these Terms & Conditions.</p>
                </div>
              </div>
              <div className="landing-disclaimer__actions">
                <button type="button" className="landing-disclaimer__primary" onClick={() => setShowTermsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Policy Modal */}
        {showPrivacyModal && (
          <div className="landing-disclaimer">
            <div className="landing-disclaimer__backdrop" onClick={() => setShowPrivacyModal(false)} />
            <div className="landing-disclaimer__dialog glass-panel" style={{ maxWidth: '720px', maxHeight: '85vh' }}>
              <div className="landing-disclaimer__header">
                <div className="landing-disclaimer__badge">
                  <ShieldCheck size={16} />
                  <span>Privacy</span>
                </div>
                <h2 className="landing-disclaimer__title">Privacy Policy</h2>
                <p className="landing-disclaimer__intro soft-text">Last Updated: December 22, 2025</p>
              </div>
              <div className="landing-disclaimer__body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                <div className="legal-content">
                  <h4>1. Data Collection Philosophy</h4>
                  <p>Fin Freedom Network is designed to collect minimal data. The Platform does not require: names, email addresses, phone numbers, government-issued identification. The Platform is built to function without traditional user accounts or centralized identity records.</p>

                  <h4>2. Information Collected</h4>
                  <p>The Platform may collect or process: public wallet addresses, on-chain transaction data, referral relationships recorded on-chain, website usage data (if applicable).</p>

                  <h4>3. Blockchain Transparency</h4>
                  <p>Blockchain data is: public, permanent, accessible to anyone. You understand and acknowledge that: your wallet address and all transactions are publicly visible, Fin Freedom Network cannot alter, hide, or delete blockchain data, privacy on blockchain networks is governed by the underlying protocol, not the Platform.</p>

                  <h4>4. Cookies & Website Analytics</h4>
                  <p>If the Platform website uses cookies or similar technologies: they are used strictly for performance, security, and basic functionality, they are not used for behavioral profiling or sale of personal data. The Platform does not knowingly deploy invasive tracking technologies.</p>

                  <h4>5. Third-Party Services</h4>
                  <p>The Platform may integrate or rely on third-party services, including: blockchain networks, blockchain explorers, indexing and data services (e.g., The Graph), content delivery or infrastructure providers. These third-party services operate under their own privacy policies, and Fin Freedom Network does not control their data practices.</p>

                  <h4>6. Data Security</h4>
                  <p>While the Platform follows industry best practices: no system is completely secure, blockchain interactions are irreversible, users are responsible for securing their devices, wallets, and private keys. Fin Freedom Network does not store private keys, recovery phrases, or sensitive credentials.</p>

                  <h4>7. No Sale or Monetization of Data</h4>
                  <p>Fin Freedom Network does not sell, rent, trade, or monetize user data. The Platform does not engage in data brokerage or targeted advertising based on personal information.</p>

                  <h4>8. Regulatory & Jurisdictional Notice</h4>
                  <p>Because blockchain data is global and decentralized: data may be processed across multiple jurisdictions, privacy rights and protections may vary by location. Users are responsible for understanding how blockchain transparency interacts with local privacy laws.</p>

                  <h4>9. Changes to This Privacy Policy</h4>
                  <p>This Privacy Policy may be updated through: governance decisions, security or compliance requirements. Continued use of the Platform after updates constitutes acceptance of the revised Privacy Policy.</p>

                  <h4>10. Contact & Clarifications</h4>
                  <p>Because the Platform does not operate centralized user accounts, privacy-related inquiries may be addressed through official community communication channels or governance processes where applicable.</p>
                </div>
              </div>
              <div className="landing-disclaimer__actions">
                <button type="button" className="landing-disclaimer__primary" onClick={() => setShowPrivacyModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Risk Disclaimer Modal */}
        {showRiskModal && (
          <div className="landing-disclaimer">
            <div className="landing-disclaimer__backdrop" onClick={() => setShowRiskModal(false)} />
            <div className="landing-disclaimer__dialog glass-panel" style={{ maxWidth: '720px', maxHeight: '85vh' }}>
              <div className="landing-disclaimer__header">
                <div className="landing-disclaimer__badge">
                  <TriangleAlert size={16} />
                  <span>Risk Warning</span>
                </div>
                <h2 className="landing-disclaimer__title">Risk Disclaimer</h2>
                <p className="landing-disclaimer__intro soft-text">Last Updated: December 22, 2025</p>
              </div>
              <div className="landing-disclaimer__body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                <div className="legal-content">
                  <p style={{ fontWeight: 'bold', color: 'var(--danger)', marginBottom: '16px' }}>IMPORTANT NOTICE</p>
                  <p>Participation in Fin Freedom Network involves significant risks. You should only participate if you fully understand and willingly accept these risks.</p>

                  <h4>1. Blockchain & Smart Contract Risks</h4>
                  <p>Participation involves blockchain-based systems, including but not limited to risks arising from: smart contract vulnerabilities, coding errors or unforeseen logic behavior, transaction failures or stuck transactions, protocol exploits, chain reorganizations, failures or attacks on underlying blockchain infrastructure. Smart contracts operate autonomously once deployed and may be difficult or impossible to modify.</p>

                  <h4>2. Token & Digital Asset Risks</h4>
                  <p>Tokens associated with the Platform may: fluctuate in value, experience low or no liquidity, lose value entirely, be affected by market sentiment, be impacted by technical changes or governance decisions, be affected by regulatory or legal actions. There is no assurance that any token will maintain value or utility.</p>

                  <h4>3. No Financial, Legal, or Tax Advice</h4>
                  <p>Nothing provided on or through the Platform constitutes: investment advice, financial advice, legal advice, tax advice. You are solely responsible for seeking independent professional advice before participating.</p>

                  <h4>4. Regulatory & Legal Risks</h4>
                  <p>Cryptocurrency, blockchain, and digital asset regulations vary by jurisdiction and may change at any time. As a result: participation may be restricted, limited, or prohibited in some regions, regulatory actions may impact Platform availability, token use, or participation mechanics. Users are solely responsible for understanding and complying with local laws and regulations.</p>

                  <h4>5. User Error & Security Risks</h4>
                  <p>Losses may result from, including but not limited to: sending funds to incorrect or incompatible addresses, interacting with malicious or counterfeit smart contracts, phishing attacks or social engineering, compromised wallets, devices, or private keys, loss of private keys or recovery phrases. Fin Freedom Network cannot reverse transactions or recover lost assets.</p>

                  <h4>6. Earnings, Participation & System Risks</h4>
                  <p>Earnings, rewards, or benefits depend on: user participation and activity, network growth and engagement, system mechanics and constraints, availability of participants, broader market conditions. No income, reward, or outcome is guaranteed.</p>

                  <h4>7. Platform Availability & Third-Party Risks</h4>
                  <p>The Platform may rely on third-party services, including: blockchain networks, wallet providers, infrastructure services, indexing or analytics tools. Failures or disruptions of these services may impact Platform functionality.</p>

                  <h4>8. Force Majeure & External Events</h4>
                  <p>Unforeseen events such as: cyberattacks, infrastructure outages, geopolitical events, regulatory bans or enforcement actions, may disrupt or permanently affect Platform operations.</p>

                  <h4>9. Acceptance of Risk</h4>
                  <p>By accessing, registering, or interacting with the Platform, you: acknowledge that you understand the risks described herein, accept full responsibility for your participation, agree that Fin Freedom Network bears no liability for losses incurred.</p>
                </div>
              </div>
              <div className="landing-disclaimer__actions">
                <button type="button" className="landing-disclaimer__primary" onClick={() => setShowRiskModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Smart Contract Transparency Modal */}
        {showTransparencyModal && (
          <div className="landing-disclaimer">
            <div className="landing-disclaimer__backdrop" onClick={() => setShowTransparencyModal(false)} />
            <div className="landing-disclaimer__dialog glass-panel" style={{ maxWidth: '720px', maxHeight: '85vh' }}>
              <div className="landing-disclaimer__header">
                <div className="landing-disclaimer__badge">
                  <Eye size={16} />
                  <span>Transparency</span>
                </div>
                <h2 className="landing-disclaimer__title">Smart Contract Transparency</h2>
                <p className="landing-disclaimer__intro soft-text">Verifiable on-chain execution</p>
              </div>
              <div className="landing-disclaimer__body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                <div className="legal-content">
                  <h4>On-Chain Smart Contracts</h4>
                  <p>Fin Freedom Network is built with transparency and safety at its core. All core mechanisms are enforced by immutable smart contracts deployed on public blockchains.</p>

                  <h4>Security Features</h4>
                  <ul>
                    <li>No admin access to user funds</li>
                    <li>Deterministic payout rules</li>
                    <li>Multisig governance</li>
                    <li>External audits planned</li>
                  </ul>

                  <h4>Verifiable Operations</h4>
                  <p>Users can independently verify all rules and transactions on-chain. Every reward follows a clear, predefined structure that cannot be altered arbitrarily.</p>

                  <h4>Growth Pillars</h4>
                  <p>Sustainable growth comes from community engagement, not hype. Our approach includes:</p>
                  <ul>
                    <li>Transparent communication</li>
                    <li>Interactive community events</li>
                    <li>Ambassador programs</li>
                    <li>Educational content</li>
                    <li>Guided onboarding</li>
                    <li>Gamification & recognition</li>
                    <li>Referral campaigns</li>
                    <li>Community feedback forums</li>
                  </ul>

                  <h4>Ecosystem Roadmap</h4>
                  <ul>
                    <li>Phase 2: Freedom-Plus Program rollout</li>
                    <li>Phase 3: Freedom NFT Program activation</li>
                    <li>Phase 4: Token utilities & governance expansion</li>
                    <li>Phase 5: Marketplace, Academy, and ecosystem integrations</li>
                  </ul>

                  <h4>Verification</h4>
                  <p>Smart contract addresses will be published and verifiable through blockchain explorers. Users are encouraged to review contract interactions before signing transactions.</p>
                </div>
              </div>
              <div className="landing-disclaimer__actions">
                <button type="button" className="landing-disclaimer__primary" onClick={() => setShowTransparencyModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {programModal && (
          <div className="landing-program-modal">
            <div className="landing-program-modal__backdrop" onClick={() => setProgramModal(null)} />
            <div className="landing-program-modal__dialog glass-panel" role="dialog" aria-modal="true">
              <div className="landing-program-modal__media">
                <img
                  src={programModal.image}
                  alt={programModal.title}
                  className="landing-program-modal__image"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <div className="landing-program-modal__content">
                <span className="landing-program-modal__badge">Coming Soon</span>
                <h3 className="landing-program-modal__title">{programModal.title}</h3>
                <p className="landing-program-modal__text soft-text">{programModal.description}</p>
                <div className="landing-program-modal__loader" />
                <p className="landing-program-modal__status">Preparing release</p>
                <button type="button" className="landing-disclaimer__primary" onClick={() => setProgramModal(null)}>
                  Close
                </button>
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
                <div className="landing-hero__eyebrow glass-panel">
                  <span className="landing-hero__eyebrow-logo-wrap">
                    <img
                      src="/images/hero-bg.png"
                      alt="Fin Freedom Network"
                      className="landing-hero__eyebrow-logo"
                    />
                  </span>
                  <span className="landing-hero__eyebrow-text">Wallet-first participation system</span>
                </div>

                <div className="landing-hero__text-block">
                  <h1 className="landing-hero__title">
                    Fin Freedom Network — A Decentralized Path to Financial Freedom
                  </h1>
                  <p className="landing-hero__description soft-text">
                    A transparent, participation-driven ecosystem designed to reward contribution, progression, and long-term commitment. 
                    Every rule is enforced by smart contracts, and every reward follows a clear, predefined structure.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="landing-hero__cta-group" style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="landing-hero__primary-btn" 
                    onClick={() => onNavigate?.('about')}
                    style={{ minWidth: '180px' }}
                  >
                    Explore Ecosystem
                  </button>
                  <button 
                    type="button" 
                    className="landing-hero__secondary-btn" 
                    onClick={primaryCtaAction}
                    style={{ minWidth: '180px' }}
                  >
                    Join the Network
                  </button>
                </div>
              </div>

              <div className="landing-hero__side">
                <div className="landing-hero__terminal">
                  <div className="landing-hero__terminal-top">
                    <div className="landing-hero__terminal-dots" aria-hidden="true">
                      <span className="first" />
                      <span className="second" />
                      <span className="third" />
                    </div>
                    <span className="landing-hero__terminal-label">Network Message</span>
                  </div>
                  <p className="landing-hero__terminal-text">
                    {typedHeroMessage}
                    <span className="landing-hero__typing-caret" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stats app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Live Read Layer</span>
            <h2 className="landing-section-heading__title">Current platform signals</h2>
            <p className="landing-section-heading__text soft-text">
              A quick view of participation, sync health, and visible on-chain value.
            </p>
          </div>

          <div className="landing-stats__grid">
            <div className="landing-stats__card glass-panel">
              <span className="landing-stats__icon">
                <Users size={20} color="goldenrod" />
              </span>
              <span className="landing-stats__label muted-text">Total Participants</span>
              <strong className="landing-stats__value">{formatNumber(publicStats.totalParticipants)}+</strong>
              <span className="landing-stats__note soft-text">Registered wallets currently visible to the read layer.</span>
            </div>

            <div className="landing-stats__card landing-stats__card--chart glass-panel">
              <div className="landing-stats__card-top">
                <span className="landing-stats__icon">
                  <BadgeInfo size={20} color="goldenrod" />
                </span>
                <div className="landing-stats__card-copy">
                  <span className="landing-stats__label muted-text">Registration Rate Graph</span>
                  <strong className="landing-stats__value">{publicStats.lastSyncLabel}</strong>
                </div>
              </div>
              <MiniGrowthChart series={growthSeries} />
              <span className="landing-stats__note soft-text">Recent onboarding movement from the public data feed.</span>
            </div>

            <div className="landing-stats__card glass-panel">
              <span className="landing-stats__icon">
                <Coins size={20} color="goldenrod" />
              </span>
              <span className="landing-stats__label muted-text">Visible USDT Value</span>
              <strong className="landing-stats__value">{formatUsdt(publicStats.totalAmountMade)} USDT</strong>
              <span className="landing-stats__note soft-text">Publicly surfaced value from platform read data.</span>
            </div>
          </div>
        </section>

        <section className="landing-roadmap app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Ten structured milestones</span>
            <h2 className="landing-section-heading__title">Level Progression Path</h2>
            <p className="landing-section-heading__text soft-text">
              Each level represents a clearer stage of movement, responsibility, and platform depth.
            </p>
          </div>

          <div className="landing-roadmap__grid">
            {PLANET_LEVELS.map((item) => (
              <div key={item.level} className="landing-roadmap__card glass-panel">
                <div className="landing-roadmap__card-header">
                  <span className="landing-roadmap__badge">Level {item.level}</span>
                  <span className={`landing-roadmap__orbit-badge orbit-${item.orbit.toLowerCase()}`}>{item.orbit}</span>
                </div>
                <div className="landing-roadmap__visual">
                  <OrbitVisual type={item.orbit} />
                </div>
                <h3 className="landing-roadmap__planet">Level {item.level} – {item.title}</h3>
                <p className="landing-roadmap__planet-text soft-text">{item.description}</p>
                <div className="landing-roadmap__meta">
                  <span className="landing-roadmap__meta-pill">{item.price}</span>
                  <span className="landing-roadmap__meta-pill">{item.positions} Positions</span>
                </div>
              </div>
            ))}
          </div>

          <div className="landing-roadmap__footer">
            <button
              type="button"
              className="landing-hero__secondary-btn landing-roadmap__cta"
              onClick={() => onNavigate?.('activation')}
            >
              Go to Activation Center
            </button>
          </div>
        </section>

        <section className="landing-coins landing-coins--hologram app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Protocol Assets</span>
            <h2 className="landing-section-heading__title">Utility layers for participation records</h2>
            <p className="landing-section-heading__text soft-text">
              Token visuals represent internal utility roles, reactivation logic, and future ecosystem expansion.
            </p>
          </div>

          <CoinShowcase />
        </section>

        <section className="landing-programs app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Platform Layers</span>
            <h2 className="landing-section-heading__title">Services planned around the core program</h2>
            <p className="landing-section-heading__text soft-text">
              From the live F-Freedom Program to future services, each layer adds a different kind of utility.
            </p>
          </div>

          <div className="landing-programs__viewport">
            <div className="landing-programs__track">
              {DUPLICATED_PROGRAMS.map((program, index) => (
                <button
                  type="button"
                  key={`${program.id}-${index}`}
                  className="landing-programs__card glass-panel"
                  onClick={() => handleProgramSelect(program)}
                >
                  <div className="landing-programs__image-layer">
                    <img
                      src={program.image}
                      alt={program.title}
                      className="landing-programs__image"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                        event.currentTarget.nextElementSibling.style.display = 'flex'
                      }}
                    />
                    <div className="landing-programs__image-placeholder">
                      <span>{program.title} Artwork</span>
                    </div>
                  </div>

                  <div className="landing-programs__overlay">
                    <span className="landing-programs__details-chip">See details</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer__inner glass-panel">
            <div className="landing-footer__brand">
              <div className="landing-footer__brand-logo-wrap">
                <img
                  // src="/images/hero-bg.png"
                  src="/images/hero-bg.png"
                  alt="Fin Freedom logo"
                  className="landing-footer__brand-logo"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                    event.currentTarget.nextElementSibling.style.display = 'inline-flex'
                  }}
                />
                <div className="landing-footer__brand-mark">FFN</div>
              </div>

              <div className="landing-footer__brand-text">
                <strong className="landing-footer__brand-name">Fin Freedom Network</strong>
                <span className="landing-footer__brand-note soft-text">
                  A decentralized path to financial freedom through structured participation.
                </span>
              </div>
            </div>

            <div className="landing-footer__socials">
              {SOCIAL_LINKS.map((item) => {
                const Icon = item.icon
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`landing-footer__social-link landing-footer__social-link--${item.id}`}
                    aria-label={item.label}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </a>
                )
              })}
            </div>

            <div className="landing-footer__columns">
              <div className="landing-footer__column landing-footer__column--services">
                <h3 className="landing-footer__heading">Services</h3>
                <div className="landing-footer__service-list">
                  {FOOTER_SERVICES.map((service) => (
                    <button
                      type="button"
                      key={service.id}
                      className="landing-footer__service landing-footer__service--link-only"
                      onClick={() => handleServiceSelect(service)}
                    >
                      <span className="landing-footer__service-title">{service.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="landing-footer__column">
                <h3 className="landing-footer__heading">Community</h3>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('community')}>
                  <MessageCircle size={16} />
                  <span>Community</span>
                </button>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('support')}>
                  <CircleHelp size={16} />
                  <span>Support</span>
                </button>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('activation')}>
                  <BadgeInfo size={16} />
                  <span>Current Program</span>
                </button>
              </div>

              <div className="landing-footer__column">
                <h3 className="landing-footer__heading">Account</h3>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('account')}>
                  <UserCircle2 size={16} />
                  <span>My Account</span>
                </button>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('activity')}>
                  <BadgeInfo size={16} />
                  <span>Activity</span>
                </button>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => onNavigate?.('security')}>
                  <Shield size={16} />
                  <span>Security</span>
                </button>
              </div>

              <div className="landing-footer__column">
                <h3 className="landing-footer__heading">Legal</h3>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => setShowTermsModal(true)}>
                  <Scale size={16} />
                  <span>Terms & Conditions</span>
                </button>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => setShowPrivacyModal(true)}>
                  <ShieldCheck size={16} />
                  <span>Privacy Policy</span>
                </button>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => setShowRiskModal(true)}>
                  <TriangleAlert size={16} />
                  <span>Risk Disclaimer</span>
                </button>
                <button type="button" className="landing-footer__link landing-footer__link--icon" onClick={() => setShowTransparencyModal(true)}>
                  <Eye size={16} />
                  <span>Smart Contract Transparency</span>
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default LandingPage
