import { useEffect, useMemo, useState } from 'react'
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
  { level: 1, code: 'FFN-Mercury', title: 'Mercury', orbit: 'P4', positions: 4, price: '10 USDT', description: 'Fast entry layer for first participation and activation.' },
  { level: 2, code: 'FFN-Venus', title: 'Venus', orbit: 'P12', positions: 12, price: '20 USDT', description: 'Growth layer with broader line movement and deeper structure.' },
  { level: 3, code: 'FFN-Earth', title: 'Earth', orbit: 'P39', positions: 39, price: '40 USDT', description: 'Expanded structure for stronger participation visibility.' },
  { level: 4, code: 'FFN-Mars', title: 'Mars', orbit: 'P4', positions: 4, price: '80 USDT', description: 'Re-entry into compact orbit progression at a higher tier.' },
  { level: 5, code: 'FFN-Jupiter', title: 'Jupiter', orbit: 'P12', positions: 12, price: '160 USDT', description: 'A larger progression layer with wider structured movement.' },
  { level: 6, code: 'FFN-Saturn', title: 'Saturn', orbit: 'P39', positions: 39, price: '320 USDT', description: 'Advanced participation layer with expanded structure.' },
  { level: 7, code: 'FFN-Uranus', title: 'Uranus', orbit: 'P4', positions: 4, price: '640 USDT', description: 'Higher checkpoint in the compact orbit line.' },
  { level: 8, code: 'FFN-Neptune', title: 'Neptune', orbit: 'P12', positions: 12, price: '1280 USDT', description: 'Deep progression layer with broad participation scope.' },
  { level: 9, code: 'FFN-Pluto', title: 'Pluto', orbit: 'P39', positions: 39, price: '2560 USDT', description: 'One of the deepest advanced structure layers.' },
  { level: 10, code: 'FFN-Star', title: 'Star', orbit: 'P4', positions: 4, price: '5120 USDT', description: 'Highest level checkpoint designed for premium progression.' },
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

const HERO_MESSAGE =
  'Welcome to Fin Freedom Program. Inspect live read-layer signals, understand where you stand, and move through the ecosystem with clarity.'

const APP_USER_ID_STORAGE_KEY = 'finfreedom_app_user_id_v1'
// const DUPLICATED_PROGRAMS = [...PROGRAMS, ...PROGRAMS]
const DUPLICATED_PROGRAMS = PROGRAMS
const TOKEN_IMAGES = {
  fgt: '/images/fgt-token.png',
  fgtr: '/images/fgtr-token.png',
  ffc: '/images/ffc-token.png',
}

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
            <span className="landing-stats__chart-bar" style={{ height: `${height}%` }} />
            <span className="landing-stats__chart-label">
              {(item.date || '').slice(5) || `#${index + 1}`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// const OrbitVisual = ({ walletStateLabel, levelLabel, subjectAddress }) => {
//   return (
//     <div className="landing-orbit-visual glass-panel">
//       <div className="landing-orbit-visual__header">
//         <div className="landing-orbit-visual__dots">
//           <span />
//           <span />
//           <span />
//         </div>
//         <span className="landing-orbit-visual__title">Live Entry State</span>
//       </div>

//       <div className="landing-orbit-visual__body">
//         <div className="landing-orbit-visual__preview landing-orbit-visual__preview--expanded">
//           {[...Array(5)].map((_, index) => {
//             const ringNumber = index + 1
//             return (
//               <div
//                 key={ringNumber}
//                 className={`landing-orbit-visual__ring landing-orbit-visual__ring--${ringNumber}`}
//               >
//                 <div className={`landing-orbit-visual__path landing-orbit-visual__path--${ringNumber}`}>
//                   <span className={`landing-orbit-visual__node landing-orbit-visual__node--${ringNumber}`} />
//                 </div>
//               </div>
//             )
//           })}
//           <div className="landing-orbit-visual__core">YOU</div>
//         </div>

//         <div className="landing-orbit-visual__typing glass-panel">
//           <span className="landing-orbit-visual__typing-label muted-text">Live Orbit Guide</span>
//           <p className="landing-orbit-visual__typing-text">{HERO_MESSAGE}</p>
//         </div>

//         <div className="landing-orbit-visual__metrics">
//           <div className="landing-orbit-visual__metric glass-panel">
//             <span className="landing-orbit-visual__metric-label muted-text">Wallet</span>
//             <span className="landing-orbit-visual__metric-value">{walletStateLabel}</span>
//           </div>

//           <div className="landing-orbit-visual__metric glass-panel">
//             <span className="landing-orbit-visual__metric-label muted-text">Level</span>
//             <span className="landing-orbit-visual__metric-value">{levelLabel}</span>
//           </div>

//           <div className="landing-orbit-visual__metric glass-panel">
//             <span className="landing-orbit-visual__metric-label muted-text">Viewing</span>
//             <span className="landing-orbit-visual__metric-value">{shortenAddress(subjectAddress)}</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }


const OrbitStructure = ({ type }) => {
  const getConfig = () => {
    if (type === 'P4') return [4]
    if (type === 'P12') return [3, 9]
    if (type === 'P39') return [3, 9, 27]
    return []
  }

  const rings = getConfig()

  return (
    <div className="orbit">
      {rings.map((count, ringIndex) => {
        const size = 80 + ringIndex * 60

        return (
          <div
            key={ringIndex}
            className="orbit-ring"
            style={{
              width: size,
              height: size,
            }}
          >
            {Array.from({ length: count }).map((_, i) => {
              const angle = (360 / count) * i

              return (
                <span
                  key={i}
                  className="orbit-node"
                  style={{
                    transform: `rotate(${angle}deg) translate(${size / 2}px) rotate(-${angle}deg)`
                  }}
                />
              )
            })}
          </div>
        )
      })}

      <div className="orbit-core">YOU</div>
    </div>
  )
}

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const LandingPage = ({ onNavigate }) => {
  const {
    isConnected,
    isLoading: isWalletLoading,
    error: walletError,
    connect,
  } = useWallet()

  const {
    subjectAddress,
    isOwnSpace,
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
  const [isPublicStatsLoading, setIsPublicStatsLoading] = useState(true)

  const [growthSeries, setGrowthSeries] = useState([])
  const [userState, setUserState] = useState({
    isRegistered: null,
    highestActiveLevel: null,
    nextLevel: 1,
  })
  const [isUserStateLoading, setIsUserStateLoading] = useState(false)

  const [forceShowDisclaimer, setForceShowDisclaimer] = useState(false)
  const [internalUserId, setInternalUserId] = useState('')
  const [spaceInput, setSpaceInput] = useState('')
  const [spaceError, setSpaceError] = useState('')
  const [programModal, setProgramModal] = useState(null)

  const showDisclaimer = forceShowDisclaimer || !isAcknowledged
  const [typedHeroMessage, setTypedHeroMessage] = useState('')


  useEffect(() => {
  let index = 0
  const text = HERO_MESSAGE

  setTypedHeroMessage('')

  const interval = window.setInterval(() => {
    index += 1
    setTypedHeroMessage(text.slice(0, index))

    if (index >= text.length) {
      window.clearInterval(interval)
    }
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

        const totalParticipants = Number(publicData.totalParticipants || 0)
        const totalAmountMade = Number(publicData.visibleCoreBalanceUsdt || 0)

        setPublicStats({
          totalParticipants,
          monthlyNewUsers: totalParticipants,
          totalAmountMade,
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
        if (!cancelled) {
          setIsPublicStatsLoading(false)
        }
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
        setUserState({
          isRegistered: null,
          highestActiveLevel: null,
          nextLevel: 1,
        })
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
        setUserState({
          isRegistered: null,
          highestActiveLevel: null,
          nextLevel: 1,
        })
      } finally {
        if (!cancelled) {
          setIsUserStateLoading(false)
        }
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

    if (showDisclaimer || programModal) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
    }
  }, [showDisclaimer, programModal])

  const walletStateLabel = useMemo(() => {
    if (isWalletLoading) return 'Connecting'
    if (isConnected) return 'Wallet Connected'
    return 'Wallet Not Connected'
  }, [isConnected, isWalletLoading])

  const systemStatusLabel = useMemo(() => {
    if (isPublicStatsLoading) return 'Syncing Read Layer'
    if (publicStats.readLayerReady) return 'Live & Synced'
    return publicStats.lastSyncLabel || 'Awaiting Data'
  }, [isPublicStatsLoading, publicStats])

  const registrationLabel = useMemo(() => {
    if (!subjectAddress) return 'No Space Selected'
    if (!canView) return 'Space Locked'
    if (isUserStateLoading || userState.isRegistered === null) return 'Checking Registration'
    return userState.isRegistered ? 'Registered' : 'Registration Required'
  }, [subjectAddress, canView, isUserStateLoading, userState.isRegistered])

  const levelLabel = useMemo(() => {
    if (!subjectAddress) return '—'
    if (!canView) return 'Locked'
    if (isUserStateLoading || userState.isRegistered === null) return 'Checking...'
    if (!userState.isRegistered) return 'Level 1 Pending'
    return `Level ${userState.highestActiveLevel || 1} Active`
  }, [subjectAddress, canView, isUserStateLoading, userState])

  const nextStepLabel = useMemo(() => {
    if (!isOwnSpace) return canView ? 'Viewing Public Space' : 'Locked Space'
    if (walletError) return 'Resolve Wallet Issue'
    if (isWalletLoading) return 'Connecting Wallet'
    if (!isConnected) return 'Connect Wallet'
    if (isUserStateLoading || userState.isRegistered === null) return 'Loading Account State'
    if (!userState.isRegistered) return 'Register Account'
    return `Activate Level ${userState.nextLevel}`
  }, [isOwnSpace, canView, walletError, isWalletLoading, isConnected, isUserStateLoading, userState])

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
    acknowledge()
    setForceShowDisclaimer(false)
  }

  const handleOpenRiskNotice = () => {
    setForceShowDisclaimer(true)
  }

  const handleProgramSelect = (program) => {
    if (program.isLive) {
      if (program.route) {
        onNavigate?.(program.route)
        return
      }

      onNavigate?.('home')
      return
    }

    setProgramModal(program)
  }

  const handleServiceSelect = (service) => {
    if (service.isLive) {
      if (service.route) {
        onNavigate?.(service.route)
        return
      }

      onNavigate?.('home')
      return
    }

    const matchedProgram = PROGRAMS.find((program) => program.id === service.id) || {
      ...service,
      badge: 'Coming Soon',
      status: 'Upcoming Service',
      description: 'This service is being prepared for a future release across the ecosystem.',
    }

    setProgramModal(matchedProgram)
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
      <ModalPortal>
        {showDisclaimer ? (
          <div className="landing-disclaimer">
            <div className="landing-disclaimer__backdrop" onClick={() => {}} />

            <div
              className="landing-disclaimer__dialog glass-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="landing-disclaimer-title"
            >
              <div className="landing-disclaimer__header">
                <div className="landing-disclaimer__badge">
                  <ShieldAlert size={16} />
                  <span>Important Notice</span>
                </div>

                <h2 id="landing-disclaimer-title" className="landing-disclaimer__title">
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
                    <h3 className="landing-disclaimer__section-title">Irreversible blockchain actions</h3>
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

              <div className="landing-disclaimer__consent landing-disclaimer__consent--static">
                <span>
                  By continuing, you confirm that you understand the wallet, transaction,
                  public-space transparency, risk, and data-use notice above.
                </span>
              </div>

              <div className="landing-disclaimer__actions">
                <button
                  type="button"
                  className="landing-disclaimer__primary"
                  onClick={handleAcknowledgeDisclaimer}
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {programModal ? (
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

                <div className="landing-program-modal__loader" aria-hidden="true" />
                <p className="landing-program-modal__status">Preparing release</p>

                <button
                  type="button"
                  className="landing-disclaimer__primary"
                  onClick={() => setProgramModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </ModalPortal>

      <div className="landing-page">
        <section className="landing-hero">
          <div className="landing-hero__bg" aria-hidden="true" />
          <div className="landing-hero__overlay" aria-hidden="true" />

          <div className="landing-hero__container">
            <div className="landing-hero__layout">
              <div className="landing-hero__content">
                <div className="landing-hero__eyebrow glass-panel">
                  <span className="landing-hero__eyebrow-dot" />
                  <span className="landing-hero__eyebrow-text">
                    Wallet-first access. Transparent structure. Deterministic progression.
                  </span>
                </div>

                <div className="landing-hero__text-block">
                  <h1 className="landing-hero__title">
                    Enter a premium blockchain experience built for visible state, user-controlled
                    actions, and structured participation across every active level.
                  </h1>

                  <p className="landing-hero__description soft-text">
                    Fin Freedom Network gives each participant a clearer way to inspect system state,
                    view public spaces, confirm registration readiness, and move through activation
                    with confidence.
                  </p>
                </div>

                <div className="landing-hero__panel glass-panel">
                  <div className="landing-hero__space-switcher">
                    <div className="landing-hero__space-switcher-head">
                      <div>
                        <span className="landing-hero__space-switcher-label muted-text">
                          View My Space Panel
                        </span>
                        <p className="landing-hero__space-switcher-note soft-text">
                          Inspect your own space or review a public wallet space without gaining
                          transaction authority.
                        </p>
                      </div>

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
                        <span>Open Space View</span>
                      </button>
                    </div>

                    <div className="landing-hero__space-meta">
                      <span className="landing-hero__space-chip">
                        {isOwnSpace ? <Home size={14} /> : <Eye size={14} />}
                        <span>{isOwnSpace ? 'My Space' : 'Visitor Mode'}</span>
                      </span>

                      <span className="landing-hero__space-chip">
                        {canView ? <Eye size={14} /> : <Lock size={14} />}
                        <span>{canView ? 'Publicly Viewable' : 'Locked Space'}</span>
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
                          The owner has restricted public visibility for this wallet space. Return to
                          your own space or try another public address.
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
                </div>
              </div>

              <div className="landing-hero__side">
                <div className="landing-hero__terminal">
                  <div className="landing-hero__terminal-top">
                    <div className="landing-hero__terminal-dots">
                      <span className="first" />
                      <span className="second" />
                      <span className="third" />
                    </div>
                    <span className="landing-hero__terminal-label">FFNNarrator / live observer</span>
                  </div>

                  {/* <p className="landing-hero__terminal-text">{HERO_MESSAGE}</p> */}
                  <p className="landing-hero__terminal-text">
                    {typedHeroMessage}
                    <span className="landing-hero__typing-caret" />
                  </p>
                </div>

                <div className="landing-hero__trust-row landing-hero__trust-row--compact">
                  <div className="landing-hero__trust-item glass-panel">
                    <span className="landing-hero__trust-label muted-text">Read Layer</span>
                    <span className="landing-hero__trust-value">{systemStatusLabel}</span>
                  </div>

                  <div className="landing-hero__trust-item glass-panel">
                    <span className="landing-hero__trust-label muted-text">Registration</span>
                    <span className="landing-hero__trust-value">{registrationLabel}</span>
                  </div>

                  <div className="landing-hero__trust-item glass-panel">
                    <span className="landing-hero__trust-label muted-text">Next Action</span>
                    <span className="landing-hero__trust-value">{nextStepLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stats app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Ecosystem Signals</span>
            <h2 className="landing-section-heading__title">
              Quickly look at the live overview of community activity going on
            </h2>
            <p className="landing-section-heading__text soft-text">
              Classic signal cards that surface what the live read layer can currently verify across the ecosystem.
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
                Total registered participants from the backend read layer.
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
              <span className="landing-stats__label muted-text">Visible Amount Across Core Contracts</span>
              <strong className="landing-stats__value">
                {formatUsdt(publicStats.totalAmountMade)} USDT
              </strong>
              <span className="landing-stats__note soft-text">
                Combined visible value surfaced through the backend read layer.
              </span>
            </div>
          </div>
        </section>

        <section className="landing-roadmap app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Planet Roadmap</span>
            <h2 className="landing-section-heading__title">
              A structured path from entry to advanced progression
            </h2>
            <p className="landing-section-heading__text soft-text">
              Each level is purposefully arranged to guide onboarding, activation depth, visibility, and reward movement through the P4, P12, and P39 orbit structures.
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
            <span className="landing-section-heading__eyebrow muted-text">Token Ecosystem</span>
            <h2 className="landing-section-heading__title">
              Utility tokens earned through verified participation
            </h2>
            <p className="landing-section-heading__text soft-text">
              Earn utility tokens through qualifying activation and reactivation events, with
              reserved space for additional ecosystem tokens that will be introduced later.
            </p>
          </div>

          <div className="landing-coins__grid landing-coins__grid--triple">
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
                  FGT reflects verified first-time activation activity inside the F-Freedom Program
                  and forms part of the broader utility design of the ecosystem.
                </p>

                <div className="landing-coins__bullets">
                  <span className="landing-coins__bullet">Issued on first-time level activation</span>
                  <span className="landing-coins__bullet">Linked to verifiable on-chain activity</span>
                  <span className="landing-coins__bullet">Designed for wider ecosystem utility</span>
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
                  FGTr is issued during qualifying reactivation events and mirrors the utility
                  direction of FGT while remaining distinct within the ecosystem rules.
                </p>

                <div className="landing-coins__bullets">
                  <span className="landing-coins__bullet">Issued during qualifying reactivation events</span>
                  <span className="landing-coins__bullet">Aligned with the utility direction of FGT</span>
                  <span className="landing-coins__bullet">Excluded from NFT qualification rules</span>
                </div>
              </div>
            </div>

            <div className="landing-coins__card glass-panel landing-coins__card--coming">
              <div className="landing-coins__visual landing-coins__visual--placeholder">
                <div className="landing-coins__visual-glow" />
                <img
                  src={TOKEN_IMAGES.ffc}
                  alt="Upcoming ecosystem token"
                  className="landing-coins__token-image landing-coins__token-image--placeholder"
                />
                <div className="landing-coins__visual-placeholder">Upcoming Token Artwork</div>
              </div>

              <div className="landing-coins__content">
                <span className="landing-coins__tag">Reserved · Coming Soon</span>
                <h3 className="landing-coins__title">Future Ecosystem Tokens</h3>
                <p className="landing-coins__text soft-text">
                  This reserved panel is ready for additional token visuals and narrative when the
                  next ecosystem assets are introduced. Get ready for the Fin Freedom Coin Program.
                </p>

                <div className="landing-coins__bullets">
                  <span className="landing-coins__bullet">Reserved image-ready token slot</span>
                  <span className="landing-coins__bullet">Prepared for future token expansion</span>
                  <span className="landing-coins__bullet">Styled to drop in artwork instantly</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-programs app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Ecosystem Programs</span>
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
              {DUPLICATED_PROGRAMS.map((program, index) => (
                <button
                  key={`${program.id}-${index}`}
                  type="button"
                  className="landing-programs__card glass-panel"
                  onClick={() => handleProgramSelect(program)}
                >
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
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* <section className="landing-transparency app-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow muted-text">Transparency & Trust</span>
            <h2 className="landing-section-heading__title">
              Visible state, visible structure, and visible progression
            </h2>
            <p className="landing-section-heading__text soft-text">
              Fin Freedom is designed around user consent, non-custodial control, transparent
              execution, and deterministic on-chain logic.
            </p>
          </div>

          <div className="landing-transparency__top">
            <div className="landing-transparency__content glass-panel">
              <h3 className="landing-transparency__content-title">Why visibility matters here</h3>
              <p className="landing-transparency__content-text soft-text">
                The landing experience is built to make orientation easier before any action is
                taken. Users can inspect state, understand structure, and see where the next move
                belongs before interacting with the system.
              </p>
            </div>

            <div className="landing-transparency__visual">
              <OrbitVisual
                walletStateLabel={walletStateLabel}
                levelLabel={levelLabel}
                subjectAddress={subjectAddress}
              />
            </div>
          </div>

          <div className="landing-transparency__rail glass-panel">
            <div className="landing-transparency__item">
              <span className="landing-transparency__item-icon" aria-hidden="true">
                <BadgeInfo size={18} />
              </span>
              <div>
                <h3 className="landing-transparency__item-title">Clear Entry State</h3>
                <p className="landing-transparency__item-text soft-text">
                  Users can immediately read wallet state, registration state, and the likely next
                  action before they commit to anything.
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
                  Key ecosystem signals are exposed through readable contract and service data so the
                  first page already communicates real platform movement.
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
                  State-changing actions remain user-signed. The platform supports visibility and
                  coordination without taking custody of funds.
                </p>
              </div>
            </div>
          </div>
        </section> */}
        <section className="landing-transparency app-container">
  <div className="landing-section-heading">
    <span className="landing-section-heading__eyebrow muted-text">
      Orbit Structures
    </span>

    <h2 className="landing-section-heading__title">
      Structured progression across deterministic orbit systems
    </h2>

    <p className="landing-section-heading__text soft-text">
      Each level operates on a defined orbit structure. Your position, movement,
      and progression are transparently visible and mathematically distributed.
    </p>
  </div>

  <div className="orbit-grid">
    <div className="orbit-card glass-panel">
      <h3>P4</h3>
      <OrbitStructure type="P4" />
    </div>

    <div className="orbit-card glass-panel">
      <h3>P12</h3>
      <OrbitStructure type="P12" />
    </div>

    <div className="orbit-card glass-panel">
      <h3>P39</h3>
      <OrbitStructure type="P39" />
    </div>
  </div>

  <div className="orbit-cta">
    <button
      className="landing-hero__primary-btn"
      onClick={() => onNavigate?.('activation')}
    >
      Learn More →
    </button>
  </div>
</section>

        <footer className="landing-footer">
          <div className="landing-footer__inner glass-panel">
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
                  Premium wallet-first access to structured ecosystem participation.
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
                      key={service.id}
                      type="button"
                      className="landing-footer__service"
                      onClick={() => handleServiceSelect(service)}
                    >
                      <span className="landing-footer__service-thumb">
                        <img
                          src={service.image}
                          alt={service.title}
                          className="landing-footer__service-image"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                            const fallback = event.currentTarget.nextElementSibling
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                        <span className="landing-footer__service-fallback">{service.title.slice(0, 2)}</span>
                      </span>
                      <span className="landing-footer__service-copy">
                        <span className="landing-footer__service-title">{service.title}</span>
                        {!service.isLive ? (
                          <span className="landing-footer__service-badge">Coming Soon</span>
                        ) : (
                          <span className="landing-footer__service-badge landing-footer__service-badge--live">
                            Current
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
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
      </div>
    </>
  )
}

export default LandingPage
