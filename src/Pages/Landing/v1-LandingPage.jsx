import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRightLeft,
  BadgeInfo,
  Briefcase,
  CircleHelp,
  Coins,
  Database,
  Eye,
  Globe,
  Home,
  Link2,
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
  WalletCards,
} from 'lucide-react'
import { FaFacebookF, FaInstagram } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { PiTelegramLogoFill } from 'react-icons/pi'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { useSpace } from '../../context/SpaceContext'
import { useSession } from '../../context/SessionContext'
import './LandingPage.css'

const API_BASE_URL = 'http://localhost:5000'

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

const SOCIAL_LINKS = [
  {
    id: 'telegram',
    label: 'Telegram',
    icon: PiTelegramLogoFill,
    href: 'https://t.me/',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: FaInstagram,
    href: 'https://instagram.com/',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: FaFacebookF,
    href: 'https://facebook.com/',
  },
  {
    id: 'x',
    label: 'X',
    icon: FaXTwitter,
    href: 'https://x.com/',
  },
]

const PLANET_LEVELS = [
  {
    level: 1,
    code: 'FFN-Mercury',
    title: 'Mercury',
    orbit: 'P4',
    positions: 4,
    price: '10 USDT',
    description: 'Fast entry layer for first participation and activation.',
  },
  {
    level: 2,
    code: 'FFN-Venus',
    title: 'Venus',
    orbit: 'P12',
    positions: 12,
    price: '20 USDT',
    description: 'Growth layer with broader line movement and deeper structure.',
  },
  {
    level: 3,
    code: 'FFN-Earth',
    title: 'Earth',
    orbit: 'P39',
    positions: 39,
    price: '40 USDT',
    description: 'Expanded structure for stronger participation visibility.',
  },
  {
    level: 4,
    code: 'FFN-Mars',
    title: 'Mars',
    orbit: 'P4',
    positions: 4,
    price: '80 USDT',
    description: 'Re-entry into compact orbit progression at a higher tier.',
  },
  {
    level: 5,
    code: 'FFN-Jupiter',
    title: 'Jupiter',
    orbit: 'P12',
    positions: 12,
    price: '160 USDT',
    description: 'A larger progression layer with wider structured movement.',
  },
  {
    level: 6,
    code: 'FFN-Saturn',
    title: 'Saturn',
    orbit: 'P39',
    positions: 39,
    price: '320 USDT',
    description: 'Advanced participation layer with expanded structure.',
  },
  {
    level: 7,
    code: 'FFN-Uranus',
    title: 'Uranus',
    orbit: 'P4',
    positions: 4,
    price: '640 USDT',
    description: 'Higher checkpoint in the compact orbit line.',
  },
  {
    level: 8,
    code: 'FFN-Neptune',
    title: 'Neptune',
    orbit: 'P12',
    positions: 12,
    price: '1280 USDT',
    description: 'Deep progression layer with broad participation scope.',
  },
  {
    level: 9,
    code: 'FFN-Pluto',
    title: 'Pluto',
    orbit: 'P39',
    positions: 39,
    price: '2560 USDT',
    description: 'One of the deepest advanced structure layers.',
  },
  {
    level: 10,
    code: 'FFN-Star',
    title: 'Star',
    orbit: 'P4',
    positions: 4,
    price: '5120 USDT',
    description: 'Highest level checkpoint designed for premium progression.',
  },
]

const PROGRAMS = [
  {
    id: 'f-freedom-program',
    title: 'F-Freedom Program',
    description:
      'The foundational participation engine of the ecosystem, built around structured progression, level activation, orbit logic, and transparent on-chain execution.',
    status: 'Phase 1 Focus',
    badge: 'Current Program',
    image: '/images/program-f-freedom.jpg',
    isLive: true,
  },
  {
    id: 'freedom-plus-program',
    title: 'Freedom-Plus Program',
    description:
      'An advanced progression layer designed for deeper participation, expanded opportunity, and stronger long-term ecosystem involvement.',
    status: 'Future Phase',
    badge: 'Coming Soon',
    image: '/images/program-freedom-plus.jpg',
    isLive: false,
  },
  {
    id: 'freedom-nft-program',
    title: 'Freedom NFT Program',
    description:
      'A reputation-based membership layer that unlocks access to reward pools based on verified commitment and sustained participation.',
    status: 'Ecosystem Layer',
    badge: 'Coming Soon',
    image: '/images/program-freedom-nft.jpg',
    isLive: false,
  },
  {
    id: 'fin-freedom-marketplace',
    title: 'Fin Freedom Marketplace',
    description:
      'A marketplace layer designed to connect value, utility, services, and ecosystem exchange inside the wider Fin Freedom Network.',
    status: 'Expansion Layer',
    badge: 'Coming Soon',
    image: '/images/program-fin-freedom-marketplace.jpg',
    isLive: false,
  },
  {
    id: 'fin-freedom-coin',
    title: 'Fin Freedom Coin',
    description:
      'A broader ecosystem coin initiative intended to support utility, brand expansion, and long-term network participation across future products.',
    status: 'Ecosystem Asset',
    badge: 'Coming Soon',
    image: '/images/program-fin-freedom-coin.jpg',
    isLive: false,
  },
  {
    id: 'fin-freedom-institute',
    title: 'Fin Freedom Institute',
    description:
      'A knowledge and capacity-building layer focused on education, empowerment, and structured learning across the Fin Freedom ecosystem.',
    status: 'Education Layer',
    badge: 'Coming Soon',
    image: '/images/program-fin-freedom-institute.jpg',
    isLive: false,
  },
]

const HERO_TYPING_MESSAGES = [
  'Hi, I am Fin Freedom narrator, designed to welcome you to this space',
  'Welcome to Fin Freedom Network Program, the largest Multi Level Matrix program in the community',
  '1. This program is designed in a way that Each orbit level follows deterministic progression rules.',
  '2.Wallet connection, registration, and activation remain user-controlled.',
  '3.From Level 1 to Level 10, each ring reflects structured growth.',
  '4.Transparent movement. Visible state. Clear next steps.',
  '5. For transparency, you can view the account of another but you can perform transactions until you return to your own space',
  '......... Jump right in and own any orbti.....',
]

const APP_USER_ID_STORAGE_KEY = 'finfreedom_app_user_id_v1'

const TOKEN_IMAGES = {
  fgt: '/images/fgt-token.png',
  fgtr: '/images/fgtr-token.png',
}

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return numeric.toLocaleString()
}

const shortenAddress = (value) => {
  if (!value) return 'Not connected'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

const formatUsdt = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '0.00'
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const createInternalUserId = () => {
  if (typeof window === 'undefined') return ''

  if (window.crypto?.randomUUID) {
    return `ffn-${window.crypto.randomUUID()}`
  }

  return `ffn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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
            <span
              className="landing-stats__chart-bar"
              style={{ height: `${height}%` }}
            />
            <span className="landing-stats__chart-label">
              {(item.date || '').slice(5) || `#${index + 1}`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const OrbitVisual = ({ typingDisplay, walletStateLabel, levelLabel, subjectAddress }) => {
  return (
    <div className="landing-orbit-visual glass-panel">
      <div className="landing-orbit-visual__header">
        <div className="landing-orbit-visual__dots">
          <span />
          <span />
          <span />
        </div>
        <span className="landing-orbit-visual__title">Live Entry State</span>
      </div>

      <div className="landing-orbit-visual__body">
        <div className="landing-orbit-visual__preview landing-orbit-visual__preview--expanded">
          {[...Array(10)].map((_, index) => {
            const ringNumber = index + 1
            return (
              <div
                key={ringNumber}
                className={`landing-orbit-visual__ring landing-orbit-visual__ring--${ringNumber}`}
              >
                <div className={`landing-orbit-visual__path landing-orbit-visual__path--${ringNumber}`}>
                  <span className={`landing-orbit-visual__node landing-orbit-visual__node--${ringNumber}`} />
                </div>
              </div>
            )
          })}
          <div className="landing-orbit-visual__core">YOU</div>
        </div>

        <div className="landing-orbit-visual__typing glass-panel">
          <span className="landing-orbit-visual__typing-label muted-text">Live Orbit Guide</span>
          <p className="landing-orbit-visual__typing-text">
            {typingDisplay}
            <span className="landing-orbit-visual__typing-caret" />
          </p>
        </div>

        <div className="landing-orbit-visual__metrics">
          <div className="landing-orbit-visual__metric glass-panel">
            <span className="landing-orbit-visual__metric-label muted-text">Wallet</span>
            <span className="landing-orbit-visual__metric-value">{walletStateLabel}</span>
          </div>

          <div className="landing-orbit-visual__metric glass-panel">
            <span className="landing-orbit-visual__metric-label muted-text">Level</span>
            <span className="landing-orbit-visual__metric-value">{levelLabel}</span>
          </div>

          <div className="landing-orbit-visual__metric glass-panel">
            <span className="landing-orbit-visual__metric-label muted-text">Viewing</span>
            <span className="landing-orbit-visual__metric-value">{shortenAddress(subjectAddress)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const LandingPage = ({ onNavigate }) => {
  const {
    account,
    isConnected,
    isLoading: isWalletLoading,
    error: walletError,
    connect,
  } = useWallet()

  const {
    contracts,
    isLoading: isContractsLoading,
    error: contractsError,
    loadContracts,
  } = useContracts()

  const {
    mode,
    viewedAddress,
    subjectAddress,
    isOwnSpace,
    isLocked,
    canView,
    switchToSelf,
    switchToVisitor,
  } = useSpace()

  const { isAcknowledged, acknowledge } = useSession()

  const [publicStats, setPublicStats] = useState({
    totalParticipants: null,
    monthlyNewUsers: null,
    totalAmountMade: null,
    readLayerReady: false,
    lastSyncLabel: 'Waiting for sync',
  })

  const [growthSeries, setGrowthSeries] = useState([])

  const [userState, setUserState] = useState({
    isRegistered: null,
    highestActiveLevel: null,
    nextLevel: 1,
  })

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [forceShowDisclaimer, setForceShowDisclaimer] = useState(false)
  const [internalUserId, setInternalUserId] = useState('')
  const [spaceInput, setSpaceInput] = useState('')
  const [spaceError, setSpaceError] = useState('')

  const [typingMessageIndex, setTypingMessageIndex] = useState(0)
  const [typingDisplay, setTypingDisplay] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const showDisclaimer = forceShowDisclaimer || !isAcknowledged

  useEffect(() => {
    loadContracts().catch(() => {})
  }, [loadContracts])

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
    const loadLandingPublicData = async () => {
      if (!contracts?.registration || !contracts?.usdt) return

      try {
        const [totalParticipantsRaw, escrowRaw, p4Raw, p12Raw, p39Raw] = await Promise.all([
          contracts.registration.totalParticipants(),
          contracts.usdt.balanceOf(import.meta.env.VITE_ESCROW_ADDRESS),
          contracts.usdt.balanceOf(import.meta.env.VITE_P4_ORBIT_ADDRESS),
          contracts.usdt.balanceOf(import.meta.env.VITE_P12_ORBIT_ADDRESS),
          contracts.usdt.balanceOf(import.meta.env.VITE_P39_ORBIT_ADDRESS),
        ])

        const totalParticipants = Number(totalParticipantsRaw)
        const totalAmountMade =
          Number(ethers.formatUnits(escrowRaw, 6)) +
          Number(ethers.formatUnits(p4Raw, 6)) +
          Number(ethers.formatUnits(p12Raw, 6)) +
          Number(ethers.formatUnits(p39Raw, 6))

        setPublicStats({
          totalParticipants,
          monthlyNewUsers: totalParticipants,
          totalAmountMade,
          readLayerReady: true,
          lastSyncLabel: 'Live',
        })
      } catch (error) {
        console.error('Landing public data load failed:', error)
        setPublicStats((current) => ({
          ...current,
          readLayerReady: false,
          lastSyncLabel: 'Degraded read mode',
        }))
      }
    }

    loadLandingPublicData()
  }, [contracts])

  useEffect(() => {
    const loadGrowthSeries = async () => {
      try {
        const payload = await fetchJson('/api/community/growth?days=14')
        const data = payload?.data || {}
        setGrowthSeries(Array.isArray(data.series) ? data.series : [])
      } catch (error) {
        console.error('Landing growth chart load failed:', error)
        setGrowthSeries([])
      }
    }

    loadGrowthSeries()
  }, [])

  useEffect(() => {
    const loadUserState = async () => {
      if (!contracts?.registration || !subjectAddress || !canView) {
        setUserState({
          isRegistered: null,
          highestActiveLevel: null,
          nextLevel: 1,
        })
        return
      }

      try {
        const isRegistered = await contracts.registration.isRegistered(subjectAddress)
        let highestActiveLevel = 0

        try {
          highestActiveLevel = Number(
            await contracts.registration.highestActiveLevel(subjectAddress)
          )
        } catch (error) {
          console.error('Could not read highestActiveLevel:', error)
        }

        setUserState({
          isRegistered,
          highestActiveLevel: highestActiveLevel || null,
          nextLevel: Math.min((highestActiveLevel || 0) + 1, 10),
        })
      } catch (error) {
        console.error('Landing user state load failed:', error)
      }
    }

    loadUserState()
  }, [contracts, subjectAddress, canView])

  useEffect(() => {
    if (typeof document === 'undefined') return

    if (showDisclaimer) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = previousOverflow
      }
    }
  }, [showDisclaimer])

  useEffect(() => {
    const currentMessage = HERO_TYPING_MESSAGES[typingMessageIndex]
    const isFullyTyped = typingDisplay === currentMessage
    const isFullyDeleted = typingDisplay === ''

    let timeout

    if (!isDeleting && !isFullyTyped) {
      timeout = window.setTimeout(() => {
        setTypingDisplay(currentMessage.slice(0, typingDisplay.length + 1))
      }, 42)
    } else if (!isDeleting && isFullyTyped) {
      timeout = window.setTimeout(() => {
        setIsDeleting(true)
      }, 1800)
    } else if (isDeleting && !isFullyDeleted) {
      timeout = window.setTimeout(() => {
        setTypingDisplay(currentMessage.slice(0, typingDisplay.length - 1))
      }, 24)
    } else {
      timeout = window.setTimeout(() => {
        setIsDeleting(false)
        setTypingMessageIndex((current) => (current + 1) % HERO_TYPING_MESSAGES.length)
      }, 250)
    }

    return () => window.clearTimeout(timeout)
  }, [typingDisplay, isDeleting, typingMessageIndex])

  const walletStateLabel = useMemo(() => {
    if (isWalletLoading) return 'Connecting'
    if (isConnected) return 'Wallet Connected'
    return 'Wallet Not Connected'
  }, [isConnected, isWalletLoading])

  const systemStatusLabel = useMemo(() => {
    if (isContractsLoading) return 'Syncing Read Layer'
    if (contractsError) return 'Read Layer Degraded'
    if (publicStats.readLayerReady) return 'Live & Synced'
    return 'Awaiting Data'
  }, [contractsError, isContractsLoading, publicStats.readLayerReady])

  const registrationLabel = useMemo(() => {
    if (!subjectAddress) return 'No Space Selected'
    if (!canView) return 'Space Locked'
    if (userState.isRegistered === null) return 'Checking Registration'
    return userState.isRegistered ? 'Registered' : 'Registration Required'
  }, [subjectAddress, canView, userState.isRegistered])

  const levelLabel = useMemo(() => {
    if (!subjectAddress) return '—'
    if (!canView) return 'Locked'
    if (userState.isRegistered === null) return 'Checking...'
    if (!userState.isRegistered) return 'Level 1 Pending'
    return `Level ${userState.highestActiveLevel || 1} Active`
  }, [subjectAddress, canView, userState])

  const nextStepLabel = useMemo(() => {
    if (!isOwnSpace) return canView ? 'Viewing Public Space' : 'Locked Space'
    if (walletError) return 'Resolve Wallet Issue'
    if (isWalletLoading) return 'Connecting Wallet'
    if (!isConnected) return 'Connect Wallet'
    if (userState.isRegistered === null) return 'Loading Account State'
    if (!userState.isRegistered) return 'Register Account'
    return `Activate Level ${userState.nextLevel}`
  }, [isOwnSpace, canView, walletError, isWalletLoading, isConnected, userState])

  const primaryCtaLabel = useMemo(() => {
    if (!isOwnSpace) return 'Return to My Space'
    if (walletError) return 'Retry Wallet'
    if (!isConnected) return 'Connect Wallet'
    if (!userState.isRegistered) return 'Go to Registration'
    return 'Open Dashboard'
  }, [isOwnSpace, walletError, isConnected, userState.isRegistered])

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
    if (!disclaimerAccepted) return
    acknowledge()
    setForceShowDisclaimer(false)
  }

  const handleOpenRiskNotice = () => {
    setDisclaimerAccepted(false)
    setForceShowDisclaimer(true)
  }

  const handleViewSpace = () => {
    const nextValue = spaceInput.trim()

    if (!nextValue) {
      setSpaceError('Enter a wallet address to view a public space.')
      return
    }

    if (!ethers.isAddress(nextValue)) {
      setSpaceError('Enter a valid wallet address.')
      return
    }

    setSpaceError('')
    switchToVisitor(nextValue)
  }

  const handleReturnToMySpace = () => {
    setSpaceError('')
    switchToSelf()
  }

  return (
    <>
      <AnimatePresence>
        {showDisclaimer ? (
          <motion.div
            className="landing-disclaimer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="landing-disclaimer__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className="landing-disclaimer__dialog glass-panel"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.985 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <div className="landing-disclaimer__header">
                <div className="landing-disclaimer__badge">
                  <ShieldAlert size={16} />
                  <span>Important Notice</span>
                </div>

                <h2 className="landing-disclaimer__title">
                  Security, risk, and data-use notice
                </h2>

                <p className="landing-disclaimer__intro soft-text">
                  Fin Freedom Network is a wallet-first blockchain application. Please read this
                  notice carefully before continuing.
                </p>
              </div>

              <div className="landing-disclaimer__body">
                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">Wallet responsibility</h3>
                    <p className="landing-disclaimer__section-text soft-text">
                      You are solely responsible for your wallet, private key, recovery phrase,
                      connected accounts, and signed transactions. Fin Freedom Network will never
                      request your private key or recovery phrase.
                    </p>
                  </div>
                </div>

                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <TriangleAlert size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">
                      Irreversible blockchain actions
                    </h3>
                    <p className="landing-disclaimer__section-text soft-text">
                      Transactions confirmed on-chain are irreversible. Always review wallet prompts,
                      destination contracts, values, and network details before approving any action.
                    </p>
                  </div>
                </div>

                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">Participation and risk</h3>
                    <p className="landing-disclaimer__section-text soft-text">
                      Participation may involve smart-contract, blockchain, market, technical, and
                      regulatory risks. No guaranteed earnings, returns, or outcomes are promised.
                    </p>
                  </div>
                </div>

                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <Eye size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">Public and locked spaces</h3>
                    <p className="landing-disclaimer__section-text soft-text">
                      This platform may allow visitors to view other public wallet spaces for
                      transparency and educational purposes. Users may lock their space in account
                      preferences. Viewing another space does not grant transaction authority or
                      wallet control.
                    </p>
                  </div>
                </div>

                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <Database size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">Data and user experience</h3>
                    <p className="landing-disclaimer__section-text soft-text">
                      To improve product experience, the app may store limited technical data such as
                      interface preferences, session acknowledgments, and a unique internal app user
                      ID. This does not give the platform custody over your wallet or funds.
                    </p>
                  </div>
                </div>

                <div className="landing-disclaimer__meta glass-panel">
                  <span className="landing-disclaimer__meta-label muted-text">
                    Internal app user ID
                  </span>
                  <code className="landing-disclaimer__meta-value">
                    {internalUserId || 'Preparing...'}
                  </code>
                </div>
              </div>

              <label className="landing-disclaimer__consent">
                <input
                  type="checkbox"
                  checked={disclaimerAccepted}
                  onChange={(event) => setDisclaimerAccepted(event.target.checked)}
                />
                <span>
                  I understand the wallet, transaction, public-space transparency, risk, and
                  data-use notice above, and I choose to continue.
                </span>
              </label>

              <div className="landing-disclaimer__actions">
                <button
                  type="button"
                  className="landing-disclaimer__primary"
                  onClick={handleAcknowledgeDisclaimer}
                  disabled={!disclaimerAccepted}
                >
                  I Understand & Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="landing-page">
        <section className="landing-hero">
          <div className="landing-hero__bg" aria-hidden="true" />
          <div className="landing-hero__overlay" aria-hidden="true" />

          <div className="landing-hero__container">
            <motion.div
              className="landing-hero__content"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <div className="landing-hero__eyebrow glass-panel">
                <span className="landing-hero__eyebrow-dot" />
                <span className="landing-hero__eyebrow-text">
                  Transparent participation. Structured growth.
                </span>
              </div>

              <div className="landing-hero__text-block">
                <h1 className="landing-hero__title">
                  Connect your wallet. Register on-chain. Activate your level. Progress through
                  structured participation.
                </h1>

                <p className="landing-hero__description 
                landing-hero__description--typing soft-text">
                 {typingDisplay}
                 <span className='landing-orbit-visual__typing-caret' />
                </p>
              </div>
            </motion.div>

            <motion.div
              className="landing-hero__panel"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
            >
              <div className="landing-hero__space-switcher glass-panel">
                <div className="landing-hero__space-switcher-head">
                  <span className="landing-hero__space-switcher-label muted-text">
                    {isOwnSpace ? 'Viewing My Space' : 'Viewing Public Space'}
                  </span>

                  {!isOwnSpace ? (
                    <button
                      type="button"
                      className="landing-hero__space-return"
                      onClick={handleReturnToMySpace}
                    >
                      <Home size={14} />
                      <span>Return to My Space</span>
                    </button>
                  ) : null}
                </div>

                <div className="landing-hero__space-switcher-row">
                  <div className="landing-hero__space-input-wrap">
                    <Search size={16} />
                    <input
                      type="text"
                      value={spaceInput}
                      onChange={(event) => setSpaceInput(event.target.value)}
                      placeholder="Enter wallet address to view a public space"
                      className="landing-hero__space-input"
                    />
                  </div>

                  <button
                    type="button"
                    className="landing-hero__space-submit"
                    onClick={handleViewSpace}
                  >
                    <ArrowRightLeft size={16} />
                    <span>View Space</span>
                  </button>
                </div>

                <div className="landing-hero__space-meta">
                  <span className="landing-hero__space-chip">
                    {isOwnSpace ? <Home size={14} /> : <Eye size={14} />}
                    <span>{isOwnSpace ? 'My Space' : 'Visitor Mode'}</span>
                  </span>

                  <span className="landing-hero__space-chip">
                    {canView ? <Eye size={14} /> : <Lock size={14} />}
                    <span>{canView ? 'Public Space' : 'Locked Space'}</span>
                  </span>

                  <span className="landing-hero__space-address muted-text">
                    {shortenAddress(subjectAddress)}
                  </span>
                </div>

                {spaceError ? <p className="landing-hero__space-error">{spaceError}</p> : null}
              </div>

              {!canView && !isOwnSpace ? (
                <div className="landing-hero__locked-notice glass-panel">
                  <div className="landing-hero__locked-notice-icon">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="landing-hero__locked-notice-title">This space is locked</h3>
                    <p className="landing-hero__locked-notice-text soft-text">
                      The owner has restricted public viewing for this space. Return to your own space
                      or try another public address.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="landing-hero__actions">
                <button
                  type="button"
                  className="landing-hero__primary-btn"
                  onClick={primaryCtaAction}
                >
                  {primaryCtaLabel}
                </button>

                <button
                  type="button"
                  className="landing-hero__secondary-btn"
                  onClick={() => onNavigate?.('activation')}
                >
                  Explore Activation Flow
                </button>
              </div>

              <div className="landing-hero__trust-row">
                <div className="landing-hero__trust-item glass-panel">
                  <span className="landing-hero__trust-label muted-text">Status</span>
                  <span className="landing-hero__trust-value">{systemStatusLabel}</span>
                </div>

                <div className="landing-hero__trust-item glass-panel">
                  <span className="landing-hero__trust-label muted-text">Registration</span>
                  <span className="landing-hero__trust-value">{registrationLabel}</span>
                </div>

                <div className="landing-hero__trust-item glass-panel">
                  <span className="landing-hero__trust-label muted-text">Next Step</span>
                  <span className="landing-hero__trust-value">{nextStepLabel}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="landing-stats app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">
              Ecosystem Signals
            </span>
            <h2 className="landing-section-heading__title">
              Live visibility into core platform activity
            </h2>
            <p className="landing-section-heading__text soft-text">
              These signals help users understand what is currently visible from the live read layer.
            </p>
          </div>

          <div className="landing-stats__grid">
            <div className="landing-stats__card glass-panel">
              <span className="landing-stats__icon" aria-hidden="true">
                <Users size={20} />
              </span>
              <span className="landing-stats__label muted-text">Total Participants</span>
              <strong className="landing-stats__value">
                {formatNumber(publicStats.totalParticipants)}
              </strong>
              <span className="landing-stats__note soft-text">
                Total registered participants from the live registration contract.
              </span>
            </div>

            <div className="landing-stats__card landing-stats__card--chart glass-panel">
              <div className="landing-stats__card-top">
                <span className="landing-stats__icon" aria-hidden="true">
                  <BadgeInfo size={20} />
                </span>
                <div className="landing-stats__card-copy">
                  <span className="landing-stats__label muted-text">Read Layer Status</span>
                  <strong className="landing-stats__value">{publicStats.lastSyncLabel}</strong>
                </div>
              </div>

              <MiniGrowthChart series={growthSeries} />

              <span className="landing-stats__note soft-text">
                Growth chart from the community read layer, showing recent registration movement.
              </span>
            </div>

            <div className="landing-stats__card glass-panel">
              <span className="landing-stats__icon" aria-hidden="true">
                <Coins size={20} />
              </span>
              <span className="landing-stats__label muted-text">
                Visible Amount Across Core Contracts
              </span>
              <strong className="landing-stats__value">
                {formatUsdt(publicStats.totalAmountMade)} USDT
              </strong>
              <span className="landing-stats__note soft-text">
                Combined visible balances across escrow and orbit layers using live contract reads.
              </span>
            </div>
          </div>
        </section>

        <section className="landing-roadmap app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">
              Planet Roadmap
            </span>
            <h2 className="landing-section-heading__title">
              Progress from FFN-Mercury to FFN-Star
            </h2>
            <p className="landing-section-heading__text soft-text">
              The F-Freedom Program uses 10 progressively priced levels built around P4, P12, and
              P39 orbit structures.
            </p>
          </div>

          <div className="landing-roadmap__track glass-panel">
            <div className="landing-roadmap__line" />

            {PLANET_LEVELS.slice(0, 3).map((item, index) => (
              <div key={item.level} className="landing-roadmap__node">
                <div className="landing-roadmap__dot-wrap">
                  <span className="landing-roadmap__dot" />
                  {index < 2 ? <span className="landing-roadmap__connector" /> : null}
                </div>

                <div className="landing-roadmap__card glass-panel">
                  <div className="landing-roadmap__card-top">
                    <span className="landing-roadmap__badge">Level {item.level}</span>
                    <span className="landing-roadmap__positions">{item.positions} Positions</span>
                  </div>

                  <h3 className="landing-roadmap__planet">{item.code}</h3>
                  <p className="landing-roadmap__planet-text soft-text">{item.description}</p>

                  <div className="landing-roadmap__meta">
                    <span className="landing-roadmap__meta-pill">{item.price}</span>
                    <span className="landing-roadmap__meta-pill">{item.orbit}</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="landing-roadmap__star-goal">
              <div className="landing-roadmap__goal-bubble">
                <span className="landing-roadmap__goal-label muted-text">Highest Level</span>
                <strong className="landing-roadmap__goal-title">FFN-Star</strong>
                <span className="landing-roadmap__goal-note soft-text">
                  The Level 10 checkpoint, designed for the highest stage of Phase 1 progression.
                </span>
              </div>
            </div>
          </div>

          <div className="landing-roadmap__footer">
            <button
              type="button"
              className="landing-hero__secondary-btn"
              onClick={() => onNavigate?.('activation')}
            >
              Explore Activation Flow
            </button>
          </div>
        </section>

        <section className="landing-coins app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">
              Token Ecosystem
            </span>
            <h2 className="landing-section-heading__title">
              Reward tokens linked to activation and reactivation
            </h2>
            <p className="landing-section-heading__text soft-text">
              The F-Freedom Program issues utility tokens that reflect verified on-chain participation
              across activation and reactivation events.
            </p>
          </div>

          <div className="landing-coins__grid">
            <div className="landing-coins__card glass-panel">
              <div className="landing-coins__visual landing-coins__visual--fgt">
                <div className="landing-coins__visual-glow" />
                <img
                  src={TOKEN_IMAGES.fgt}
                  alt="FGT Token"
                  className="landing-coins__token-image landing-coins__token-image--fgt"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
                <div className="landing-coins__visual-placeholder">FGT Token Artwork</div>
              </div>

              <div className="landing-coins__content">
                <span className="landing-coins__tag">FGT · First Activation</span>
                <h3 className="landing-coins__title">FGT Token</h3>
                <p className="landing-coins__text soft-text">
                  FGT is issued when a participant activates a level for the first time. It reflects
                  verified participation within the F-Freedom Program and forms part of the broader
                  ecosystem utility structure.
                </p>

                <div className="landing-coins__bullets">
                  <span className="landing-coins__bullet">
                    Issued on first-time level activation
                  </span>
                  <span className="landing-coins__bullet">
                    Linked to structured on-chain participation
                  </span>
                  <span className="landing-coins__bullet">
                    Used within the wider ecosystem utility design
                  </span>
                </div>
              </div>
            </div>

            <div className="landing-coins__card glass-panel">
              <div className="landing-coins__visual landing-coins__visual--fgtr">
                <div className="landing-coins__visual-glow" />
                <img
                  src={TOKEN_IMAGES.fgtr}
                  alt="FGTr Token"
                  className="landing-coins__token-image landing-coins__token-image--fgtr"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
                <div className="landing-coins__visual-placeholder">FGTr Token Artwork</div>
              </div>

              <div className="landing-coins__content">
                <span className="landing-coins__tag">FGTr · Reactivation</span>
                <h3 className="landing-coins__title">FGTr Token</h3>
                <p className="landing-coins__text soft-text">
                  FGTr is issued when a completed level reactivates. It supports the same core
                  ecosystem utility as FGT, except it does not count toward NFT qualification.
                </p>

                <div className="landing-coins__bullets">
                  <span className="landing-coins__bullet">
                    Issued during qualifying reactivation events
                  </span>
                  <span className="landing-coins__bullet">
                    Shares utility alignment with FGT
                  </span>
                  <span className="landing-coins__bullet">
                    Excluded from NFT qualification rules
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-programs app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">
              Ecosystem Programs
            </span>
            <h2 className="landing-section-heading__title">
              Programs that shape progression across the ecosystem
            </h2>
            <p className="landing-section-heading__text soft-text">
              Each layer of the ecosystem plays a distinct role in onboarding, progression, rewards,
              and long-term participation.
            </p>
          </div>

          <div className="landing-programs__viewport">
            <div className="landing-programs__track">
              {[...PROGRAMS, ...PROGRAMS].map((program, index) => (
                <article key={`${program.id}-${index}`} className="landing-programs__card glass-panel">
                  <div className="landing-programs__image-layer">
                    <img
                      src={program.image}
                      alt={program.title}
                      className="landing-programs__image"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                        const fallback = event.currentTarget.nextElementSibling
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div className="landing-programs__image-placeholder">
                      <span>{program.title} Artwork</span>
                    </div>
                  </div>

                  <div className="landing-programs__overlay">
                    <div className="landing-programs__topbar">
                      <span className="landing-programs__status">{program.status}</span>
                      <span
                        className={`landing-programs__badge ${
                          program.isLive
                            ? 'landing-programs__badge--live'
                            : 'landing-programs__badge--soon'
                        }`}
                      >
                        {program.badge}
                      </span>
                    </div>

                    <h3 className="landing-programs__title">{program.title}</h3>
                    <p className="landing-programs__description soft-text">
                      {program.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-transparency app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">
              Transparency & Trust
            </span>
            <h2 className="landing-section-heading__title">
              Visible state, visible structure, and visible progression
            </h2>
            <p className="landing-section-heading__text soft-text">
              Fin Freedom is designed around user consent, non-custodial control, transparent
              execution, and deterministic on-chain logic.
            </p>
          </div>

          <div className="landing-transparency__grid">
            <div className="landing-transparency__content glass-panel">
              <div className="landing-transparency__list">
                <div className="landing-transparency__item">
                  <span className="landing-transparency__item-icon" aria-hidden="true">
                    <BadgeInfo size={18} />
                  </span>
                  <div>
                    <h3 className="landing-transparency__item-title">Clear Entry State</h3>
                    <p className="landing-transparency__item-text soft-text">
                      Users can immediately see wallet state, registration state, and their likely
                      next step before taking action.
                    </p>
                  </div>
                </div>

                <div className="landing-transparency__item">
                  <span className="landing-transparency__item-icon" aria-hidden="true">
                    <Link2 size={18} />
                  </span>
                  <div>
                    <h3 className="landing-transparency__item-title">Live Public Signals</h3>
                    <p className="landing-transparency__item-text soft-text">
                      Core visibility already comes from live contract reads, making key signals more
                      verifiable from the first page.
                    </p>
                  </div>
                </div>

                <div className="landing-transparency__item">
                  <span className="landing-transparency__item-icon" aria-hidden="true">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <h3 className="landing-transparency__item-title">Wallet-First Control</h3>
                    <p className="landing-transparency__item-text soft-text">
                      All state-changing actions are user-initiated and signed from the wallet. The
                      platform does not take custody of user funds.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-transparency__visual">
              <OrbitVisual
                typingDisplay={typingDisplay}
                walletStateLabel={walletStateLabel}
                levelLabel={levelLabel}
                subjectAddress={subjectAddress}
              />
            </div>
          </div>
        </section>

        <footer className="landing-footer glass-panel">
          <div className="landing-footer__inner app-container">
            <div className="landing-footer__brand">
              <div className="landing-footer__brand-logo-wrap">
                <img
                  src="/images/logo.jpg"
                  alt="Fin Freedom logo"
                  className="landing-footer__brand-logo"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                    const fallback = event.currentTarget.nextElementSibling
                    if (fallback) fallback.style.display = 'inline-flex'
                  }}
                />
                <div className="landing-footer__brand-mark">FFN</div>
              </div>

              <div className="landing-footer__brand-text">
                <strong className="landing-footer__brand-name">Fin Freedom Network</strong>
                <span className="landing-footer__brand-note soft-text">
                  Transparent, wallet-first participation experience
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
                    className="landing-footer__social-link"
                    aria-label={item.label}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </a>
                )
              })}
            </div>

            <div className="landing-footer__columns">
              <div className="landing-footer__column">
                <h3 className="landing-footer__heading">Services</h3>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={() => onNavigate?.('activation')}
                >
                  <WalletCards size={16} />
                  <span>Fin Freedom Network Program</span>
                </button>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={() => onNavigate?.('orbits')}
                >
                  <Globe size={16} />
                  <span>Fin Freedon Plus</span>
                </button>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={() => onNavigate?.('dashboard')}
                >
                  <Briefcase size={16} />
                  <span>Fin Freedom NFT Program</span>
                </button>


                {/* {add all of the prgrams there images has been loaded already at the top, you cann add them here} */}
              </div>

              <div className="landing-footer__column">
                <h3 className="landing-footer__heading">Community</h3>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={() => onNavigate?.('community')}
                >
                  <MessageCircle size={16} />
                  <span>Community</span>
                </button>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={() => onNavigate?.('support')}
                >
                  <CircleHelp size={16} />
                  <span>Support</span>
                </button>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={() => onNavigate?.('home')}
                >
                  <BadgeInfo size={16} />
                  <span>Current Program</span>
                </button>
              </div>

              <div className="landing-footer__column">
                <h3 className="landing-footer__heading">Account</h3>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={() => onNavigate?.('account')}
                >
                  <UserCircle2 size={16} />
                  <span>My Account</span>
                </button>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={() => onNavigate?.('activity')}
                >
                  <BadgeInfo size={16} />
                  <span>Activity</span>
                </button>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={() => onNavigate?.('security')}
                >
                  <Shield size={16} />
                  <span>Security</span>
                </button>
              </div>

              <div className="landing-footer__column">
                <h3 className="landing-footer__heading">Legal</h3>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={handleOpenRiskNotice}
                >
                  <TriangleAlert size={16} />
                  <span>Risk Disclaimer</span>
                </button>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={handleOpenRiskNotice}
                >
                  <Scale size={16} />
                  <span>Privacy Notice</span>
                </button>
                <button
                  type="button"
                  className="landing-footer__link landing-footer__link--icon"
                  onClick={handleOpenRiskNotice}
                >
                  <ShieldCheck size={16} />
                  <span>Security Notice</span>
                </button>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </>
  )
}

export default LandingPage















// import { useEffect, useMemo, useState } from 'react'
// import { ethers } from 'ethers'
// import { AnimatePresence, motion } from 'motion/react'
// import {
//   ArrowRightLeft,
//   BadgeInfo,
//   Briefcase,
//   CircleHelp,
//   Coins,
//   Database,
//   Eye,
//   Globe,
//   Home,
//   Link2,
//   Lock,
//   MessageCircle,
//   Scale,
//   Search,
//   Shield,
//   ShieldAlert,
//   ShieldCheck,
//   TriangleAlert,
//   UserCircle2,
//   Users,
//   Wallet,
//   WalletCards,
// } from 'lucide-react'
// import { FaFacebookF, FaInstagram } from 'react-icons/fa'
// import { FaXTwitter } from 'react-icons/fa6'
// import { PiTelegramLogoFill } from 'react-icons/pi'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { useSpace } from '../../context/SpaceContext'
// import { useSession } from '../../context/SessionContext'
// import './LandingPage.css'

// const SOCIAL_LINKS = [
//   {
//     id: 'telegram',
//     label: 'Telegram',
//     icon: PiTelegramLogoFill,
//     href: 'https://t.me/',
//   },
//   {
//     id: 'instagram',
//     label: 'Instagram',
//     icon: FaInstagram,
//     href: 'https://instagram.com/',
//   },
//   {
//     id: 'facebook',
//     label: 'Facebook',
//     icon: FaFacebookF,
//     href: 'https://facebook.com/',
//   },
//   {
//     id: 'x',
//     label: 'X',
//     icon: FaXTwitter,
//     href: 'https://x.com/',
//   },
// ]

// const PLANET_LEVELS = [
//   {
//     level: 1,
//     code: 'FFN-Mercury',
//     title: 'Mercury',
//     orbit: 'P4',
//     positions: 4,
//     price: '10 USDT',
//     description: 'Fast entry layer for first participation and activation.',
//   },
//   {
//     level: 2,
//     code: 'FFN-Venus',
//     title: 'Venus',
//     orbit: 'P12',
//     positions: 12,
//     price: '20 USDT',
//     description: 'Growth layer with broader line movement and deeper structure.',
//   },
//   {
//     level: 3,
//     code: 'FFN-Earth',
//     title: 'Earth',
//     orbit: 'P39',
//     positions: 39,
//     price: '40 USDT',
//     description: 'Expanded structure for stronger participation visibility.',
//   },
//   {
//     level: 4,
//     code: 'FFN-Mars',
//     title: 'Mars',
//     orbit: 'P4',
//     positions: 4,
//     price: '80 USDT',
//     description: 'Re-entry into compact orbit progression at a higher tier.',
//   },
//   {
//     level: 5,
//     code: 'FFN-Jupiter',
//     title: 'Jupiter',
//     orbit: 'P12',
//     positions: 12,
//     price: '160 USDT',
//     description: 'A larger progression layer with wider structured movement.',
//   },
//   {
//     level: 6,
//     code: 'FFN-Saturn',
//     title: 'Saturn',
//     orbit: 'P39',
//     positions: 39,
//     price: '320 USDT',
//     description: 'Advanced participation layer with expanded structure.',
//   },
//   {
//     level: 7,
//     code: 'FFN-Uranus',
//     title: 'Uranus',
//     orbit: 'P4',
//     positions: 4,
//     price: '640 USDT',
//     description: 'Higher checkpoint in the compact orbit line.',
//   },
//   {
//     level: 8,
//     code: 'FFN-Neptune',
//     title: 'Neptune',
//     orbit: 'P12',
//     positions: 12,
//     price: '1280 USDT',
//     description: 'Deep progression layer with broad participation scope.',
//   },
//   {
//     level: 9,
//     code: 'FFN-Pluto',
//     title: 'Pluto',
//     orbit: 'P39',
//     positions: 39,
//     price: '2560 USDT',
//     description: 'One of the deepest advanced structure layers.',
//   },
//   {
//     level: 10,
//     code: 'FFN-Star',
//     title: 'Star',
//     orbit: 'P4',
//     positions: 4,
//     price: '5120 USDT',
//     description: 'Highest level checkpoint designed for premium progression.',
//   },
// ]

// const PROGRAMS = [
//   {
//     id: 'f-freedom-program',
//     title: 'F-Freedom Program',
//     description:
//       'The foundational participation engine of the ecosystem, built around structured progression, level activation, orbit logic, and transparent on-chain execution.',
//     status: 'Phase 1 Focus',
//     badge: 'Current Program',
//     image: '/images/program-f-freedom.jpg',
//     isLive: true,
//   },
//   {
//     id: 'freedom-plus-program',
//     title: 'Freedom-Plus Program',
//     description:
//       'An advanced progression layer designed for deeper participation, expanded opportunity, and stronger long-term ecosystem involvement.',
//     status: 'Future Phase',
//     badge: 'Coming Soon',
//     image: '/images/program-freedom-plus.jpg',
//     isLive: false,
//   },
//   {
//     id: 'freedom-nft-program',
//     title: 'Freedom NFT Program',
//     description:
//       'A reputation-based membership layer that unlocks access to reward pools based on verified commitment and sustained participation.',
//     status: 'Ecosystem Layer',
//     badge: 'Coming Soon',
//     image: '/images/program-freedom-nft.jpg',
//     isLive: false,
//   },
// ]

// const HERO_TYPING_MESSAGES = [
//   'Level 1 begins your on-chain participation journey.',
//   'Each orbit level follows deterministic progression rules.',
//   'Wallet connection, registration, and activation remain user-controlled.',
//   'From Level 1 to Level 10, each ring reflects structured growth.',
//   'Transparent movement. Visible state. Clear next steps.',
// ]

// const APP_USER_ID_STORAGE_KEY = 'finfreedom_app_user_id_v1'

// const TOKEN_IMAGES = {
//   fgt: '/images/fgt-token.png',
//   fgtr: '/images/fgtr-token.png',
// }

// const formatNumber = (value) => {
//   if (value === null || value === undefined || value === '') return '—'
//   const numeric = Number(value)
//   if (!Number.isFinite(numeric)) return '—'
//   return numeric.toLocaleString()
// }

// const shortenAddress = (value) => {
//   if (!value) return 'Not connected'
//   return `${value.slice(0, 6)}...${value.slice(-4)}`
// }

// const formatUsdt = (value) => {
//   const numeric = Number(value)
//   if (!Number.isFinite(numeric)) return '0.00'
//   return numeric.toLocaleString(undefined, {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   })
// }

// const createInternalUserId = () => {
//   if (typeof window === 'undefined') return ''

//   if (window.crypto?.randomUUID) {
//     return `ffn-${window.crypto.randomUUID()}`
//   }

//   return `ffn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
// }

// const LandingPage = ({ onNavigate }) => {
//   const {
//     account,
//     isConnected,
//     isLoading: isWalletLoading,
//     error: walletError,
//     connect,
//   } = useWallet()

//   const {
//     contracts,
//     isLoading: isContractsLoading,
//     error: contractsError,
//     loadContracts,
//   } = useContracts()

//   // const { mode, viewedAddress, isOwnSpace, isLocked, switchToSelf, switchToVisitor } = useSpace();
//   const {
//   mode,
//   viewedAddress,
//   subjectAddress,
//   isOwnSpace,
//   isLocked,
//   canView,
//   switchToSelf,
//   switchToVisitor,
// } = useSpace()
//   const { isAcknowledged, acknowledge } = useSession()

//   const [publicStats, setPublicStats] = useState({
//     totalParticipants: null,
//     monthlyNewUsers: null,
//     totalAmountMade: null,
//     readLayerReady: false,
//     lastSyncLabel: 'Waiting for sync',
//   })

//   const [userState, setUserState] = useState({
//     isRegistered: null,
//     highestActiveLevel: null,
//     nextLevel: 1,
//   })

//   const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
//   const [forceShowDisclaimer, setForceShowDisclaimer] = useState(false)
//   const [internalUserId, setInternalUserId] = useState('')
//   const [spaceInput, setSpaceInput] = useState('')
//   const [spaceError, setSpaceError] = useState('')

//   const [typingMessageIndex, setTypingMessageIndex] = useState(0)
//   const [typingDisplay, setTypingDisplay] = useState('')
//   const [isDeleting, setIsDeleting] = useState(false)

//   const showDisclaimer = forceShowDisclaimer || !isAcknowledged

//   useEffect(() => {
//     loadContracts().catch(() => {})
//   }, [loadContracts])

//   useEffect(() => {
//     if (typeof window === 'undefined') return

//     try {
//       let storedUserId = window.localStorage.getItem(APP_USER_ID_STORAGE_KEY)

//       if (!storedUserId) {
//         storedUserId = createInternalUserId()
//         window.localStorage.setItem(APP_USER_ID_STORAGE_KEY, storedUserId)
//       }

//       setInternalUserId(storedUserId)
//     } catch (error) {
//       console.error('Failed to initialize landing page local state:', error)
//     }
//   }, [])

//   useEffect(() => {
//     const loadLandingPublicData = async () => {
//       if (!contracts?.registration || !contracts?.usdt) return

//       try {
//         const [totalParticipantsRaw, escrowRaw, p4Raw, p12Raw, p39Raw] = await Promise.all([
//           contracts.registration.totalParticipants(),
//           contracts.usdt.balanceOf(import.meta.env.VITE_ESCROW_ADDRESS),
//           contracts.usdt.balanceOf(import.meta.env.VITE_P4_ORBIT_ADDRESS),
//           contracts.usdt.balanceOf(import.meta.env.VITE_P12_ORBIT_ADDRESS),
//           contracts.usdt.balanceOf(import.meta.env.VITE_P39_ORBIT_ADDRESS),
//         ])

//         const totalParticipants = Number(totalParticipantsRaw)
//         const totalAmountMade =
//           Number(ethers.formatUnits(escrowRaw, 6)) +
//           Number(ethers.formatUnits(p4Raw, 6)) +
//           Number(ethers.formatUnits(p12Raw, 6)) +
//           Number(ethers.formatUnits(p39Raw, 6))

//         setPublicStats({
//           totalParticipants,
//           monthlyNewUsers: totalParticipants,
//           totalAmountMade,
//           readLayerReady: true,
//           lastSyncLabel: 'Live',
//         })
//       } catch (error) {
//         console.error('Landing public data load failed:', error)
//         setPublicStats((current) => ({
//           ...current,
//           readLayerReady: false,
//           lastSyncLabel: 'Degraded read mode',
//         }))
//       }
//     }

//     loadLandingPublicData()
//   }, [contracts])

//   // useEffect(() => {
//   //   const loadUserState = async () => {
//   //     if (!contracts?.registration || !viewedAddress) {
//   //       setUserState({
//   //         isRegistered: null,
//   //         highestActiveLevel: null,
//   //         nextLevel: 1,
//   //       })
//   //       return
//   //     }

//   //     try {
//   //       const isRegistered = await contracts.registration.isRegistered(viewedAddress)
//   //       let highestActiveLevel = 0

//   //       try {
//   //         highestActiveLevel = Number(await contracts.registration.highestActiveLevel(viewedAddress))
//   //       } catch (error) {
//   //         console.error('Could not read highestActiveLevel:', error)
//   //       }

//   //       setUserState({
//   //         isRegistered,
//   //         highestActiveLevel: highestActiveLevel || null,
//   //         nextLevel: Math.min((highestActiveLevel || 0) + 1, 10),
//   //       })
//   //     } catch (error) {
//   //       console.error('Landing user state load failed:', error)
//   //     }
//   //   }

//   //   loadUserState()
//   // }, [contracts, viewedAddress])


//   useEffect(() => {
//     const loadUserState = async () => {
//       if (!contracts?.registration || !subjectAddress || !canView) {
//         setUserState({
//           isRegistered: null,
//           highestActiveLevel: null,
//           nextLevel: 1,
//         })
//         return
//       }

//       try {
//         const isRegistered = await contracts.registration.isRegistered(subjectAddress)
//         let highestActiveLevel = 0

//         try {
//           highestActiveLevel = Number(
//             await contracts.registration.highestActiveLevel(subjectAddress)
//           )
//         } catch (error) {
//           console.error('Could not read highestActiveLevel:', error)
//         }

//         setUserState({
//           isRegistered,
//           highestActiveLevel: highestActiveLevel || null,
//           nextLevel: Math.min((highestActiveLevel || 0) + 1, 10),
//         })
//       } catch (error) {
//         console.error('Landing user state load failed:', error)
//       }
//     }

//     loadUserState()
//   }, [contracts, subjectAddress, canView])


//   useEffect(() => {
//     if (typeof document === 'undefined') return

//     if (showDisclaimer) {
//       const previousOverflow = document.body.style.overflow
//       document.body.style.overflow = 'hidden'
//       return () => {
//         document.body.style.overflow = previousOverflow
//       }
//     }
//   }, [showDisclaimer])

//   useEffect(() => {
//     const currentMessage = HERO_TYPING_MESSAGES[typingMessageIndex]
//     const isFullyTyped = typingDisplay === currentMessage
//     const isFullyDeleted = typingDisplay === ''

//     let timeout

//     if (!isDeleting && !isFullyTyped) {
//       timeout = window.setTimeout(() => {
//         setTypingDisplay(currentMessage.slice(0, typingDisplay.length + 1))
//       }, 42)
//     } else if (!isDeleting && isFullyTyped) {
//       timeout = window.setTimeout(() => {
//         setIsDeleting(true)
//       }, 1800)
//     } else if (isDeleting && !isFullyDeleted) {
//       timeout = window.setTimeout(() => {
//         setTypingDisplay(currentMessage.slice(0, typingDisplay.length - 1))
//       }, 24)
//     } else {
//       timeout = window.setTimeout(() => {
//         setIsDeleting(false)
//         setTypingMessageIndex((current) => (current + 1) % HERO_TYPING_MESSAGES.length)
//       }, 250)
//     }

//     return () => window.clearTimeout(timeout)
//   }, [typingDisplay, isDeleting, typingMessageIndex])

//   const walletStateLabel = useMemo(() => {
//     if (isWalletLoading) return 'Connecting'
//     if (isConnected) return 'Wallet Connected'
//     return 'Wallet Not Connected'
//   }, [isConnected, isWalletLoading])

//   const systemStatusLabel = useMemo(() => {
//     if (isContractsLoading) return 'Syncing Read Layer'
//     if (contractsError) return 'Read Layer Degraded'
//     if (publicStats.readLayerReady) return 'Live & Synced'
//     return 'Awaiting Data'
//   }, [contractsError, isContractsLoading, publicStats.readLayerReady])

//   // const registrationLabel = useMemo(() => {
//   //   if (!viewedAddress) return 'No Space Selected'
//   //   if (userState.isRegistered === null) return 'Checking Registration'
//   //   return userState.isRegistered ? 'Registered' : 'Registration Required'
//   // }, [viewedAddress, userState.isRegistered])

// const registrationLabel = useMemo(() => {
//     if (!subjectAddress) return 'No Space Selected'
//     if (!canView) return 'Space Locked'
//     if (userState.isRegistered === null) return 'Checking Registration'
//     return userState.isRegistered ? 'Registered' : 'Registration Required'
//   }, [subjectAddress, canView, userState.isRegistered])


//   // const levelLabel = useMemo(() => {
//   //   if (!viewedAddress) return '—'
//   //   if (userState.isRegistered === null) return 'Checking...'
//   //   if (!userState.isRegistered) return 'Level 1 Pending'
//   //   return `Level ${userState.highestActiveLevel || 1} Active`
//   // }, [viewedAddress, userState])

//   const levelLabel = useMemo(() => {
//     if (!subjectAddress) return '—'
//     if (!canView) return 'Locked'
//     if (userState.isRegistered === null) return 'Checking...'
//     if (!userState.isRegistered) return 'Level 1 Pending'
//     return `Level ${userState.highestActiveLevel || 1} Active`
//   }, [subjectAddress, canView, userState])

//   // const nextStepLabel = useMemo(() => {
//   //   if (!isOwnSpace) return isLocked ? 'Locked Space' : 'Viewing Public Space'
//   //   if (walletError) return 'Resolve Wallet Issue'
//   //   if (isWalletLoading) return 'Connecting Wallet'
//   //   if (!isConnected) return 'Connect Wallet'
//   //   if (userState.isRegistered === null) return 'Loading Account State'
//   //   if (!userState.isRegistered) return 'Register Account'
//   //   return `Activate Level ${userState.nextLevel}`
//   // }, [isOwnSpace, isLocked, walletError, isWalletLoading, isConnected, userState])


//   const nextStepLabel = useMemo(() => {
//     if (!isOwnSpace) return canView ? 'Viewing Public Space' : 'Locked Space'
//     if (walletError) return 'Resolve Wallet Issue'
//     if (isWalletLoading) return 'Connecting Wallet'
//     if (!isConnected) return 'Connect Wallet'
//     if (userState.isRegistered === null) return 'Loading Account State'
//     if (!userState.isRegistered) return 'Register Account'
//     return `Activate Level ${userState.nextLevel}`
//   }, [isOwnSpace, canView, walletError, isWalletLoading, isConnected, userState])


//   const primaryCtaLabel = useMemo(() => {
//     if (!isOwnSpace) return 'Return to My Space'
//     if (walletError) return 'Retry Wallet'
//     if (!isConnected) return 'Connect Wallet'
//     if (!userState.isRegistered) return 'Go to Registration'
//     return 'Open Dashboard'
//   }, [isOwnSpace, walletError, isConnected, userState.isRegistered])

//   const primaryCtaAction = () => {
//     if (!isOwnSpace) {
//       switchToSelf()
//       return
//     }

//     if (walletError || !isConnected) {
//       connect?.()
//       return
//     }

//     if (!userState.isRegistered) {
//       onNavigate?.('activation')
//       return
//     }

//     onNavigate?.('dashboard')
//   }

//   const handleAcknowledgeDisclaimer = () => {
//     if (!disclaimerAccepted) return
//     acknowledge()
//     setForceShowDisclaimer(false)
//   }

//   const handleOpenRiskNotice = () => {
//     setDisclaimerAccepted(false)
//     setForceShowDisclaimer(true)
//   }

//   const handleViewSpace = () => {
//     const nextValue = spaceInput.trim()

//     if (!nextValue) {
//       setSpaceError('Enter a wallet address to view a public space.')
//       return
//     }

//     if (!ethers.isAddress(nextValue)) {
//       setSpaceError('Enter a valid wallet address.')
//       return
//     }

//     setSpaceError('')
//     switchToVisitor(nextValue)
//   }

//   const handleReturnToMySpace = () => {
//     setSpaceError('')
//     switchToSelf()
//   }

//   return (
//     <>
//       <AnimatePresence>
//         {showDisclaimer ? (
//           <motion.div
//             className="landing-disclaimer"
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//           >
//             <motion.div
//               className="landing-disclaimer__backdrop"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//             />

//             <motion.div
//               className="landing-disclaimer__dialog glass-panel"
//               initial={{ opacity: 0, y: 24, scale: 0.98 }}
//               animate={{ opacity: 1, y: 0, scale: 1 }}
//               exit={{ opacity: 0, y: 12, scale: 0.985 }}
//               transition={{ duration: 0.28, ease: 'easeOut' }}
//             >
//               <div className="landing-disclaimer__header">
//                 <div className="landing-disclaimer__badge">
//                   <ShieldAlert size={16} />
//                   <span>Important Notice</span>
//                 </div>

//                 <h2 className="landing-disclaimer__title">
//                   Security, risk, and data-use notice
//                 </h2>

//                 <p className="landing-disclaimer__intro soft-text">
//                   Fin Freedom Network is a wallet-first blockchain application. Please read this
//                   notice carefully before continuing.
//                 </p>
//               </div>

//               <div className="landing-disclaimer__body">
//                 <div className="landing-disclaimer__section">
//                   <div className="landing-disclaimer__section-icon">
//                     <Wallet size={18} />
//                   </div>
//                   <div>
//                     <h3 className="landing-disclaimer__section-title">Wallet responsibility</h3>
//                     <p className="landing-disclaimer__section-text soft-text">
//                       You are solely responsible for your wallet, private key, recovery phrase,
//                       connected accounts, and signed transactions. Fin Freedom Network will never
//                       request your private key or recovery phrase.
//                     </p>
//                   </div>
//                 </div>

//                 <div className="landing-disclaimer__section">
//                   <div className="landing-disclaimer__section-icon">
//                     <TriangleAlert size={18} />
//                   </div>
//                   <div>
//                     <h3 className="landing-disclaimer__section-title">
//                       Irreversible blockchain actions
//                     </h3>
//                     <p className="landing-disclaimer__section-text soft-text">
//                       Transactions confirmed on-chain are irreversible. Always review wallet prompts,
//                       destination contracts, values, and network details before approving any action.
//                     </p>
//                   </div>
//                 </div>

//                 <div className="landing-disclaimer__section">
//                   <div className="landing-disclaimer__section-icon">
//                     <ShieldCheck size={18} />
//                   </div>
//                   <div>
//                     <h3 className="landing-disclaimer__section-title">Participation and risk</h3>
//                     <p className="landing-disclaimer__section-text soft-text">
//                       Participation may involve smart-contract, blockchain, market, technical, and
//                       regulatory risks. No guaranteed earnings, returns, or outcomes are promised.
//                     </p>
//                   </div>
//                 </div>

//                 <div className="landing-disclaimer__section">
//                   <div className="landing-disclaimer__section-icon">
//                     <Eye size={18} />
//                   </div>
//                   <div>
//                     <h3 className="landing-disclaimer__section-title">Public and locked spaces</h3>
//                     <p className="landing-disclaimer__section-text soft-text">
//                       This platform may allow visitors to view other public wallet spaces for
//                       transparency and educational purposes. Users may lock their space in account
//                       preferences. Viewing another space does not grant transaction authority or
//                       wallet control.
//                     </p>
//                   </div>
//                 </div>

//                 <div className="landing-disclaimer__section">
//                   <div className="landing-disclaimer__section-icon">
//                     <Database size={18} />
//                   </div>
//                   <div>
//                     <h3 className="landing-disclaimer__section-title">Data and user experience</h3>
//                     <p className="landing-disclaimer__section-text soft-text">
//                       To improve product experience, the app may store limited technical data such as
//                       interface preferences, session acknowledgments, and a unique internal app user
//                       ID. This does not give the platform custody over your wallet or funds.
//                     </p>
//                   </div>
//                 </div>

//                 <div className="landing-disclaimer__meta glass-panel">
//                   <span className="landing-disclaimer__meta-label muted-text">
//                     Internal app user ID
//                   </span>
//                   <code className="landing-disclaimer__meta-value">
//                     {internalUserId || 'Preparing...'}
//                   </code>
//                 </div>
//               </div>

//               <label className="landing-disclaimer__consent">
//                 <input
//                   type="checkbox"
//                   checked={disclaimerAccepted}
//                   onChange={(event) => setDisclaimerAccepted(event.target.checked)}
//                 />
//                 <span>
//                   I understand the wallet, transaction, public-space transparency, risk, and
//                   data-use notice above, and I choose to continue.
//                 </span>
//               </label>

//               <div className="landing-disclaimer__actions">
//                 <button
//                   type="button"
//                   className="landing-disclaimer__primary"
//                   onClick={handleAcknowledgeDisclaimer}
//                   disabled={!disclaimerAccepted}
//                 >
//                   I Understand & Continue
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         ) : null}
//       </AnimatePresence>

//       <section className="landing-page">
//         <div className="landing-hero">
//           <div className="landing-hero__content">
//             <div className="landing-hero__eyebrow glass-panel">
//               <span className="landing-hero__eyebrow-dot" />
//               <span className="landing-hero__eyebrow-text">
//                 Transparent participation. Structured growth.
//               </span>
//             </div>

//             <div className="landing-hero__text-block">
//               <h1 className="landing-hero__title">
//                 Connect your wallet. Register on-chain. Activate your level. Progress through
//                 structured participation.
//               </h1>

//               <p className="landing-hero__description soft-text">
//                 Fin Freedom Network is a transparent, participation-driven ecosystem built around
//                 structured progression, wallet-first access, and deterministic on-chain logic. From
//                 the first screen, users can clearly understand their wallet state, registration
//                 status, level access, and next step.
//               </p>
//             </div>

//             <div className="landing-hero__space-switcher glass-panel">
//               <div className="landing-hero__space-switcher-head">
//                 <span className="landing-hero__space-switcher-label muted-text">
//                   {isOwnSpace ? 'Viewing My Space' : 'Viewing Public Space'}
//                 </span>

//                 {!isOwnSpace ? (
//                   <button
//                     type="button"
//                     className="landing-hero__space-return"
//                     onClick={handleReturnToMySpace}
//                   >
//                     <Home size={14} />
//                     <span>Return to My Space</span>
//                   </button>
//                 ) : null}
//               </div>

//               <div className="landing-hero__space-switcher-row">
//                 <div className="landing-hero__space-input-wrap">
//                   <Search size={16} />
//                   <input
//                     type="text"
//                     value={spaceInput}
//                     onChange={(event) => setSpaceInput(event.target.value)}
//                     placeholder="Enter wallet address to view a public space"
//                     className="landing-hero__space-input"
//                   />
//                 </div>

//                 <button
//                   type="button"
//                   className="landing-hero__space-submit"
//                   onClick={handleViewSpace}
//                 >
//                   <ArrowRightLeft size={16} />
//                   <span>View Space</span>
//                 </button>
//               </div>

//               <div className="landing-hero__space-meta">
//                 <span className="landing-hero__space-chip">
//                   {isOwnSpace ? <Home size={14} /> : <Eye size={14} />}
//                   <span>{isOwnSpace ? 'My Space' : 'Visitor Mode'}</span>
//                 </span>

//                 {/* <span className="landing-hero__space-chip">
//                   {isLocked ? <Lock size={14} /> : <Eye size={14} />}
//                   <span>{isLocked ? 'Locked Space' : 'Public Space'}</span>
//                 </span> */}

//                 <span className="landing-hero__space-chip">
//                   {canView ? <Eye size={14} /> : <Lock size={14} />}
//                   <span>{canView ? 'Public Space' : 'Locked Space'}</span>
//                 </span>

//                 {/* <span className="landing-hero__space-address muted-text">
//                   {shortenAddress(viewedAddress)}
//                 </span> */}
//                 <span className="landing-hero__space-address muted-text">
//                   {shortenAddress(subjectAddress)}
//                 </span>
//               </div>

//               {spaceError ? <p className="landing-hero__space-error">{spaceError}</p> : null}
//             </div>

//                         {!canView && !isOwnSpace ? (
//               <div className="landing-hero__locked-notice glass-panel">
//                 <div className="landing-hero__locked-notice-icon">
//                   <Lock size={18} />
//                 </div>
//                 <div>
//                   <h3 className="landing-hero__locked-notice-title">This space is locked</h3>
//                   <p className="landing-hero__locked-notice-text soft-text">
//                     The owner has restricted public viewing for this space. Return to your own space or try
//                     another public address.
//                   </p>
//                 </div>
//               </div>
//             ) : null}

//             <div className="landing-hero__actions">
//               <button
//                 type="button"
//                 className="landing-hero__primary-btn"
//                 onClick={primaryCtaAction}
//               >
//                 {primaryCtaLabel}
//               </button>

//               <button
//                 type="button"
//                 className="landing-hero__secondary-btn"
//                 onClick={() => onNavigate?.('activation')}
//               >
//                 Explore Activation Flow
//               </button>
//             </div>

//             <div className="landing-hero__trust-row">
//               <div className="landing-hero__trust-item glass-panel">
//                 <span className="landing-hero__trust-label muted-text">Status</span>
//                 <span className="landing-hero__trust-value">{systemStatusLabel}</span>
//               </div>

//               <div className="landing-hero__trust-item glass-panel">
//                 <span className="landing-hero__trust-label muted-text">Registration</span>
//                 <span className="landing-hero__trust-value">{registrationLabel}</span>
//               </div>

//               <div className="landing-hero__trust-item glass-panel">
//                 <span className="landing-hero__trust-label muted-text">Next Step</span>
//                 <span className="landing-hero__trust-value">{nextStepLabel}</span>
//               </div>
//             </div>
//           </div>

//           <div className="landing-hero__visual">
//             <div className="landing-hero__visual-card glass-panel">
//               <div className="landing-hero__visual-header">
//                 <div className="landing-hero__visual-dots">
//                   <span />
//                   <span />
//                   <span />
//                 </div>
//                 <span className="landing-hero__visual-title">Live Entry State</span>
//               </div>

//               <div className="landing-hero__visual-body">
//                 <div className="landing-hero__preview-orbit landing-hero__preview-orbit--expanded">
//                   {[...Array(10)].map((_, index) => {
//                     const ringNumber = index + 1
//                     return (
//                       <div
//                         key={ringNumber}
//                         className={`landing-hero__orbit-ring landing-hero__orbit-ring--dynamic landing-hero__orbit-ring--${ringNumber}`}
//                       >
//                         <div
//                           className={`landing-hero__orbit-path landing-hero__orbit-path--${ringNumber}`}
//                         >
//                           <span
//                             className={`landing-hero__orbit-node landing-hero__orbit-node--${ringNumber}`}
//                           />
//                         </div>
//                       </div>
//                     )
//                   })}

//                   <div className="landing-hero__orbit-core">YOU</div>
//                 </div>

//                 <div className="landing-hero__typing glass-panel">
//                   <span className="landing-hero__typing-label muted-text">Live Orbit Guide</span>
//                   <p className="landing-hero__typing-text">
//                     {typingDisplay}
//                     <span className="landing-hero__typing-caret" />
//                   </p>
//                 </div>

//                 <div className="landing-hero__preview-metrics">
//                   <div className="landing-hero__metric glass-panel">
//                     <span className="landing-hero__metric-label muted-text">Wallet</span>
//                     <span className="landing-hero__metric-value">{walletStateLabel}</span>
//                   </div>

//                   <div className="landing-hero__metric glass-panel">
//                     <span className="landing-hero__metric-label muted-text">Level</span>
//                     <span className="landing-hero__metric-value">{levelLabel}</span>
//                   </div>

//                   <div className="landing-hero__metric glass-panel">
//                     <span className="landing-hero__metric-label muted-text">Viewing</span>
//                     {/* <span className="landing-hero__metric-value">{shortenAddress(viewedAddress)}</span> */}
//                     <span className="landing-hero__metric-value">{shortenAddress(subjectAddress)}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="landing-hero__floating-card landing-hero__floating-card--top glass-panel">
//               <span className="landing-hero__floating-title">Public Read Layer</span>
//               <span className="landing-hero__floating-text muted-text">
//                 {publicStats.lastSyncLabel}
//               </span>
//             </div>

//             <div className="landing-hero__floating-card landing-hero__floating-card--bottom glass-panel">
//               <span className="landing-hero__floating-title">Mode</span>
//               <span className="landing-hero__floating-text muted-text">
//                 {isOwnSpace ? 'My Space' : 'Visitor Space'}
//               </span>
//             </div>
//           </div>
//         </div>

//         <section className="landing-stats">
//           <div className="landing-section-heading">
//             <span className="landing-section-heading__eyebrow muted-text">
//               Ecosystem Signals
//             </span>
//             <h2 className="landing-section-heading__title">
//               Live visibility into core platform activity
//             </h2>
//             <p className="landing-section-heading__text soft-text">
//               These signals help users understand what is currently visible from the live read layer.
//             </p>
//           </div>

//           <div className="landing-stats__grid">
//             <div className="landing-stats__card glass-panel">
//               <span className="landing-stats__icon" aria-hidden="true">
//                 <Users size={20} />
//               </span>
//               <span className="landing-stats__label muted-text">Total Participants</span>
//               <strong className="landing-stats__value">
//                 {formatNumber(publicStats.totalParticipants)}
//               </strong>
//               <span className="landing-stats__note soft-text">
//                 Total registered participants from the live registration contract.
//               </span>
//             </div>

//             <div className="landing-stats__card glass-panel">
//               <span className="landing-stats__icon" aria-hidden="true">
//                 <BadgeInfo size={20} />
//               </span>
//               <span className="landing-stats__label muted-text">Read Layer Status</span>
//               <strong className="landing-stats__value">{publicStats.lastSyncLabel}</strong>
//               <span className="landing-stats__note soft-text">
//                 Monthly growth tracking will become more precise when indexed historical registration
//                 data is added.
//               </span>
//             </div>

//             <div className="landing-stats__card glass-panel">
//               <span className="landing-stats__icon" aria-hidden="true">
//                 <Coins size={20} />
//               </span>
//               <span className="landing-stats__label muted-text">
//                 Visible Amount Across Core Contracts
//               </span>
//               <strong className="landing-stats__value">
//                 {formatUsdt(publicStats.totalAmountMade)} USDT
//               </strong>
//               <span className="landing-stats__note soft-text">
//                 Combined visible balances across escrow and orbit layers using live contract reads.
//               </span>
//             </div>
//           </div>
//         </section>

//         <section className="landing-roadmap">
//           <div className="landing-section-heading">
//             <span className="landing-section-heading__eyebrow muted-text">
//               Planet Roadmap
//             </span>
//             <h2 className="landing-section-heading__title">
//               Progress from FFN-Mercury to FFN-Star
//             </h2>
//             <p className="landing-section-heading__text soft-text">
//               The F-Freedom Program uses 10 progressively priced levels built around P4, P12, and
//               P39 orbit structures.
//             </p>
//           </div>

//           <div className="landing-roadmap__track glass-panel">
//             <div className="landing-roadmap__line" />

//             {PLANET_LEVELS.slice(0, 3).map((item, index) => (
//               <div key={item.level} className="landing-roadmap__node">
//                 <div className="landing-roadmap__dot-wrap">
//                   <span className="landing-roadmap__dot" />
//                   {index < 2 ? <span className="landing-roadmap__connector" /> : null}
//                 </div>

//                 <div className="landing-roadmap__card glass-panel">
//                   <div className="landing-roadmap__card-top">
//                     <span className="landing-roadmap__badge">Level {item.level}</span>
//                     <span className="landing-roadmap__positions">{item.positions} Positions</span>
//                   </div>

//                   <h3 className="landing-roadmap__planet">{item.code}</h3>
//                   <p className="landing-roadmap__planet-text soft-text">{item.description}</p>

//                   <div className="landing-roadmap__meta">
//                     <span className="landing-roadmap__meta-pill">{item.price}</span>
//                     <span className="landing-roadmap__meta-pill">{item.orbit}</span>
//                   </div>
//                 </div>
//               </div>
//             ))}

//             <div className="landing-roadmap__star-goal">
//               <div className="landing-roadmap__goal-bubble">
//                 <span className="landing-roadmap__goal-label muted-text">Highest Level</span>
//                 <strong className="landing-roadmap__goal-title">FFN-Star</strong>
//                 <span className="landing-roadmap__goal-note soft-text">
//                   The Level 10 checkpoint, designed for the highest stage of Phase 1 progression.
//                 </span>
//               </div>
//             </div>
//           </div>

//           <div className="landing-roadmap__footer">
//             <button
//               type="button"
//               className="landing-hero__secondary-btn"
//               onClick={() => onNavigate?.('activation')}
//             >
//               Explore Activation Flow
//             </button>
//           </div>
//         </section>

//         <section className="landing-coins">
//           <div className="landing-section-heading">
//             <span className="landing-section-heading__eyebrow muted-text">
//               Token Ecosystem
//             </span>
//             <h2 className="landing-section-heading__title">
//               Reward tokens linked to activation and reactivation
//             </h2>
//             <p className="landing-section-heading__text soft-text">
//               The F-Freedom Program issues utility tokens that reflect verified on-chain participation
//               across activation and reactivation events.
//             </p>
//           </div>

//           <div className="landing-coins__grid">
//             <div className="landing-coins__card glass-panel">
//               <div className="landing-coins__visual landing-coins__visual--fgt">
//                 <div className="landing-coins__visual-glow" />
//                 <img
//                   src={TOKEN_IMAGES.fgt}
//                   alt="FGT Token"
//                   className="landing-coins__token-image landing-coins__token-image--fgt"
//                   onError={(event) => {
//                     event.currentTarget.style.display = 'none'
//                   }}
//                 />
//                 <div className="landing-coins__visual-placeholder">FGT Token Artwork</div>
//               </div>

//               <div className="landing-coins__content">
//                 <span className="landing-coins__tag">FGT · First Activation</span>
//                 <h3 className="landing-coins__title">FGT Token</h3>
//                 <p className="landing-coins__text soft-text">
//                   FGT is issued when a participant activates a level for the first time. It reflects
//                   verified participation within the F-Freedom Program and forms part of the broader
//                   ecosystem utility structure.
//                 </p>

//                 <div className="landing-coins__bullets">
//                   <span className="landing-coins__bullet">
//                     Issued on first-time level activation
//                   </span>
//                   <span className="landing-coins__bullet">
//                     Linked to structured on-chain participation
//                   </span>
//                   <span className="landing-coins__bullet">
//                     Used within the wider ecosystem utility design
//                   </span>
//                 </div>
//               </div>
//             </div>

//             <div className="landing-coins__card glass-panel">
//               <div className="landing-coins__visual landing-coins__visual--fgtr">
//                 <div className="landing-coins__visual-glow" />
//                 <img
//                   src={TOKEN_IMAGES.fgtr}
//                   alt="FGTr Token"
//                   className="landing-coins__token-image landing-coins__token-image--fgtr"
//                   onError={(event) => {
//                     event.currentTarget.style.display = 'none'
//                   }}
//                 />
//                 <div className="landing-coins__visual-placeholder">FGTr Token Artwork</div>
//               </div>

//               <div className="landing-coins__content">
//                 <span className="landing-coins__tag">FGTr · Reactivation</span>
//                 <h3 className="landing-coins__title">FGTr Token</h3>
//                 <p className="landing-coins__text soft-text">
//                   FGTr is issued when a completed level reactivates. It supports the same core
//                   ecosystem utility as FGT, except it does not count toward NFT qualification.
//                 </p>

//                 <div className="landing-coins__bullets">
//                   <span className="landing-coins__bullet">
//                     Issued during qualifying reactivation events
//                   </span>
//                   <span className="landing-coins__bullet">
//                     Shares utility alignment with FGT
//                   </span>
//                   <span className="landing-coins__bullet">
//                     Excluded from NFT qualification rules
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </section>

//         <section className="landing-programs">
//           <div className="landing-section-heading">
//             <span className="landing-section-heading__eyebrow muted-text">
//               Ecosystem Programs
//             </span>
//             <h2 className="landing-section-heading__title">
//               Programs that shape progression across the ecosystem
//             </h2>
//             <p className="landing-section-heading__text soft-text">
//               Each layer of the ecosystem plays a distinct role in onboarding, progression, rewards,
//               and long-term participation.
//             </p>
//           </div>

//           <div className="landing-programs__viewport">
//             <div className="landing-programs__track">
//               {[...PROGRAMS, ...PROGRAMS].map((program, index) => (
//                 <article key={`${program.id}-${index}`} className="landing-programs__card glass-panel">
//                   <div className="landing-programs__image-layer">
//                     <img
//                       src={program.image}
//                       alt={program.title}
//                       className="landing-programs__image"
//                       onError={(event) => {
//                         event.currentTarget.style.display = 'none'
//                         const fallback = event.currentTarget.nextElementSibling
//                         if (fallback) fallback.style.display = 'flex'
//                       }}
//                     />
//                     <div className="landing-programs__image-placeholder">
//                       <span>{program.title} Artwork</span>
//                     </div>
//                   </div>

//                   <div className="landing-programs__overlay">
//                     <div className="landing-programs__topbar">
//                       <span className="landing-programs__status">{program.status}</span>
//                       <span
//                         className={`landing-programs__badge ${
//                           program.isLive
//                             ? 'landing-programs__badge--live'
//                             : 'landing-programs__badge--soon'
//                         }`}
//                       >
//                         {program.badge}
//                       </span>
//                     </div>

//                     <h3 className="landing-programs__title">{program.title}</h3>
//                     <p className="landing-programs__description soft-text">
//                       {program.description}
//                     </p>
//                   </div>
//                 </article>
//               ))}
//             </div>
//           </div>
//         </section>

//         <section className="landing-transparency">
//           <div className="landing-section-heading">
//             <span className="landing-section-heading__eyebrow muted-text">
//               Transparency & Trust
//             </span>
//             <h2 className="landing-section-heading__title">
//               Visible state, visible structure, and visible progression
//             </h2>
//             <p className="landing-section-heading__text soft-text">
//               Fin Freedom is designed around user consent, non-custodial control, transparent
//               execution, and deterministic on-chain logic.
//             </p>
//           </div>

//           <div className="landing-transparency__grid">
//             <div className="landing-transparency__content glass-panel">
//               <div className="landing-transparency__list">
//                 <div className="landing-transparency__item">
//                   <span className="landing-transparency__item-icon" aria-hidden="true">
//                     <BadgeInfo size={18} />
//                   </span>
//                   <div>
//                     <h3 className="landing-transparency__item-title">Clear Entry State</h3>
//                     <p className="landing-transparency__item-text soft-text">
//                       Users can immediately see wallet state, registration state, and their likely
//                       next step before taking action.
//                     </p>
//                   </div>
//                 </div>

//                 <div className="landing-transparency__item">
//                   <span className="landing-transparency__item-icon" aria-hidden="true">
//                     <Link2 size={18} />
//                   </span>
//                   <div>
//                     <h3 className="landing-transparency__item-title">Live Public Signals</h3>
//                     <p className="landing-transparency__item-text soft-text">
//                       Core visibility already comes from live contract reads, making key signals more
//                       verifiable from the first page.
//                     </p>
//                   </div>
//                 </div>

//                 <div className="landing-transparency__item">
//                   <span className="landing-transparency__item-icon" aria-hidden="true">
//                     <ShieldCheck size={18} />
//                   </span>
//                   <div>
//                     <h3 className="landing-transparency__item-title">Wallet-First Control</h3>
//                     <p className="landing-transparency__item-text soft-text">
//                       All state-changing actions are user-initiated and signed from the wallet. The
//                       platform does not take custody of user funds.
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="landing-transparency__visual glass-panel">
//               <div className="landing-transparency__visual-box">{systemStatusLabel}</div>
//               <p className="landing-transparency__visual-note muted-text">
//                 Wallet: {walletStateLabel} · Registration: {registrationLabel} · Level: {levelLabel}
//               </p>
//             </div>
//           </div>
//         </section>

//         <footer className="landing-footer glass-panel">
//           <div className="landing-footer__brand">
//             <div className="landing-footer__brand-mark">FF</div>
//             <div className="landing-footer__brand-text">
//               <strong className="landing-footer__brand-name">Fin Freedom</strong>
//               <span className="landing-footer__brand-note soft-text">
//                 Transparent, wallet-first participation experience
//               </span>
//             </div>
//           </div>

//           <div className="landing-footer__socials">
//             {SOCIAL_LINKS.map((item) => {
//               const Icon = item.icon
//               return (
//                 <a
//                   key={item.id}
//                   href={item.href}
//                   target="_blank"
//                   rel="noreferrer"
//                   className="landing-footer__social-link"
//                   aria-label={item.label}
//                 >
//                   <Icon size={16} />
//                   <span>{item.label}</span>
//                 </a>
//               )
//             })}
//           </div>

//           <div className="landing-footer__columns">
//             <div className="landing-footer__column">
//               <h3 className="landing-footer__heading">Services</h3>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={() => onNavigate?.('activation')}
//               >
//                 <WalletCards size={16} />
//                 <span>Activation</span>
//               </button>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={() => onNavigate?.('orbits')}
//               >
//                 <Globe size={16} />
//                 <span>Orbit Systems</span>
//               </button>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={() => onNavigate?.('dashboard')}
//               >
//                 <Briefcase size={16} />
//                 <span>Dashboard</span>
//               </button>
//             </div>

//             <div className="landing-footer__column">
//               <h3 className="landing-footer__heading">Community</h3>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={() => onNavigate?.('community')}
//               >
//                 <MessageCircle size={16} />
//                 <span>Community</span>
//               </button>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={() => onNavigate?.('support')}
//               >
//                 <CircleHelp size={16} />
//                 <span>Support</span>
//               </button>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={() => onNavigate?.('home')}
//               >
//                 <BadgeInfo size={16} />
//                 <span>Current Program</span>
//               </button>
//             </div>

//             <div className="landing-footer__column">
//               <h3 className="landing-footer__heading">Account</h3>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={() => onNavigate?.('account')}
//               >
//                 <UserCircle2 size={16} />
//                 <span>My Account</span>
//               </button>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={() => onNavigate?.('activity')}
//               >
//                 <BadgeInfo size={16} />
//                 <span>Activity</span>
//               </button>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={() => onNavigate?.('security')}
//               >
//                 <Shield size={16} />
//                 <span>Security</span>
//               </button>
//             </div>

//             <div className="landing-footer__column">
//               <h3 className="landing-footer__heading">Legal</h3>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={handleOpenRiskNotice}
//               >
//                 <TriangleAlert size={16} />
//                 <span>Risk Disclaimer</span>
//               </button>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={handleOpenRiskNotice}
//               >
//                 <Scale size={16} />
//                 <span>Privacy Notice</span>
//               </button>
//               <button
//                 type="button"
//                 className="landing-footer__link landing-footer__link--icon"
//                 onClick={handleOpenRiskNotice}
//               >
//                 <ShieldCheck size={16} />
//                 <span>Security Notice</span>
//               </button>
//             </div>
//           </div>
//         </footer>
//       </section>
//     </>
//   )
// }

// export default LandingPage