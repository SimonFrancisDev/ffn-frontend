import './CommunityPage.css'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { useSpace } from '../../context/SpaceContext'
import { ethers } from 'ethers'
import { fetchAddressReceiptsApi } from '../../Services/orbitsApi'
import {
  ArrowRight,
  BadgeInfo,
  BookOpen,
  Copy,
  Globe,
  HelpCircle,
  Megaphone,
  MessageCircle,
  Rocket,
  Route,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { FaFacebookF, FaInstagram } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { PiTelegramLogoFill } from 'react-icons/pi'
import {
  FaChartLine,
  FaCoins,
  FaInfoCircle,
  FaLink,
  FaPeopleArrows,
  FaShieldAlt,
  FaStar,
  FaSyncAlt,
  FaWallet,
} from 'react-icons/fa'

// PATCH A — add API base helpers
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

// PATCH B — keep fallback constants but rename them
const FALLBACK_SOCIAL_LINKS = [
  {
    id: 'telegram',
    label: 'Telegram',
    href: 'https://t.me/',
    icon: PiTelegramLogoFill,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com/',
    icon: FaInstagram,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://facebook.com/',
    icon: FaFacebookF,
  },
  {
    id: 'x',
    label: 'X',
    href: 'https://x.com/',
    icon: FaXTwitter,
  },
]

const FALLBACK_COMMUNITY_RESOURCES = [
  {
    id: 'faq',
    label: 'FAQ',
    icon: HelpCircle,
    route: 'support',
  },
  {
    id: 'tutorials',
    label: 'Tutorials',
    icon: BookOpen,
    route: 'support',
  },
  {
    id: 'support',
    label: 'Support',
    icon: MessageCircle,
    route: 'support',
  },
  {
    id: 'docs',
    label: 'Docs',
    icon: BadgeInfo,
    route: 'support',
  },
]

const EMPTY_LEADERBOARD_STATE = {
  status: 'unavailable',
  items: [],
}

const EMPTY_ANNOUNCEMENT_STATE = {
  status: 'unavailable',
  items: [],
}

const CommunityPage = ({ onNavigate }) => {
  const { isConnected, account, connect } = useWallet()
  const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()
  const { viewedAddress, isOwnSpace, mode } = useSpace()
  const resolvedAddress = viewedAddress || account || ''

  // Community Data States
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [totalEarnedAllTime, setTotalEarnedAllTime] = useState('0')
  const [userReferralCount, setUserReferralCount] = useState(0)
  const [userCommission, setUserCommission] = useState('0')
  const [downlineStats, setDownlineStats] = useState({ level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0, level10: 0 })
  const [leaderboardData, setLeaderboardData] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [communityStats, setCommunityStats] = useState({
    members: 0,
    growthRate: '+0%',
    regions: 0,
    milestones: 0,
    totalDistributed: '0'
  })
  const [referralLink, setReferralLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  
  // NEW STATES FOR ENHANCEMENTS
  const [leaderboardType, setLeaderboardType] = useState('earners')
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [fullLeaderboard, setFullLeaderboard] = useState([])
  const [hoveredAddressIndex, setHoveredAddressIndex] = useState(null)
  const [copiedAddress, setCopiedAddress] = useState('')
  const [isRefreshingFeeds, setIsRefreshingFeeds] = useState(false)

  // New states from patches
  const [publicReadStats, setPublicReadStats] = useState({
    totalParticipants: 0,
    visibleCoreBalance: '0.00',
    readLayerStatus: 'Waiting for sync',
  })

  const [memberSummary, setMemberSummary] = useState({
    isRegistered: false,
    referrer: '',
    highestActiveLevel: 0,
    activeLevelsCount: 0,
    totalReceiptEarnings: '0.00',
    fgtTotal: '0.00',
    fgtrTotal: '0.00',
  })

  // PATCH C — expand state to hold live backend data
  const [communityFeedStatus, setCommunityFeedStatus] = useState({
    leaderboard: 'unavailable',
    announcements: 'unavailable',
    growth: 'unavailable',
    events: 'unavailable',
    regions: 'unavailable',
    socialLinks: 'unavailable',
    resources: 'unavailable',
  })

  const [leaderboardState, setLeaderboardState] = useState(EMPTY_LEADERBOARD_STATE)
  const [announcementState, setAnnouncementState] = useState(EMPTY_ANNOUNCEMENT_STATE)
  const [eventState, setEventState] = useState({
    status: 'unavailable',
    items: [],
  })
  const [socialLinkState, setSocialLinkState] = useState({
    status: 'unavailable',
    items: [],
  })
  const [resourceState, setResourceState] = useState({
    status: 'unavailable',
    items: [],
  })
  const [communityGrowth, setCommunityGrowth] = useState({
    rangeDays: 14,
    series: [],
  })

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
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }, [])

  const formatToken = useCallback((value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return '0.00'
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [])

  const formatWhole = useCallback((value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return '0'
    return numeric.toLocaleString()
  }, [])

  const getSourceBadgeLabel = useCallback((status) => {
    if (status === 'live') return 'Live'
    if (status === 'indexed') return 'Indexed'
    return 'Unavailable'
  }, [])

  const getSourceBadgeClass = useCallback((status) => {
    if (status === 'live') return 'source-badge source-badge--live'
    if (status === 'indexed') return 'source-badge source-badge--indexed'
    return 'source-badge source-badge--unavailable'
  }, [])

  // Viewer helpers
  const viewerLabel = useMemo(() => {
    if (!resolvedAddress) return 'No active space'
    return isOwnSpace ? 'Your space' : 'Visitor space'
  }, [resolvedAddress, isOwnSpace])

  const viewerAddressLabel = useMemo(() => {
    if (!resolvedAddress) return '—'
    return shortAddress(resolvedAddress)
  }, [resolvedAddress, shortAddress])

  const handleRoute = useCallback(
    (route) => {
      onNavigate?.(route)
    },
    [onNavigate]
  )

  // PATCH D — derived arrays for live content
  const leaderboardItems = leaderboardState.items || []
  const announcementItems = announcementState.items || []
  const eventItems = eventState.items || []
  const socialItems =
    socialLinkState.items?.length
      ? socialLinkState.items
      : FALLBACK_SOCIAL_LINKS
  const resourceItems =
    resourceState.items?.length
      ? resourceState.items
      : FALLBACK_COMMUNITY_RESOURCES

  // PATCH E — replace public summary fetch with backend route
  const fetchPublicReadStats = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/summary')
      const data = payload?.data || {}
      const publicData = data.public || {}
      const feeds = data.feeds || {}

      const totalParticipantsValue = Number(publicData.totalParticipants || 0)
      const visibleCoreBalanceValue = publicData.visibleCoreBalanceUsdt || '0.00'
      const readLayerStatusValue = publicData.readLayerStatus || 'Unavailable'

      setTotalParticipants(totalParticipantsValue)
      setPublicReadStats({
        totalParticipants: totalParticipantsValue,
        visibleCoreBalance: visibleCoreBalanceValue,
        readLayerStatus: readLayerStatusValue,
      })

      setCommunityFeedStatus((prev) => ({
        ...prev,
        announcements: feeds.announcements || 'unavailable',
        events: feeds.events || 'unavailable',
        socialLinks: feeds.socialLinks || 'unavailable',
        resources: feeds.resources || 'unavailable',
        leaderboard: feeds.leaderboard || 'unavailable',
        growth: feeds.growth || 'unavailable',
      }))

      setCommunityStats((prev) => ({
        ...prev,
        members: totalParticipantsValue,
        totalDistributed: visibleCoreBalanceValue,
      }))
    } catch (err) {
      console.error('Error fetching public read stats:', err)
      
      // FALLBACK: Try to read from contracts directly
      if (contracts?.registration && contracts?.usdt) {
        try {
          const [totalParticipantsRaw, escrowRaw, p4Raw, p12Raw, p39Raw] = await Promise.all([
            contracts.registration.totalParticipants(),
            contracts.usdt.balanceOf(import.meta.env.VITE_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000'),
            contracts.usdt.balanceOf(import.meta.env.VITE_P4_ORBIT_ADDRESS || '0x0000000000000000000000000000000000000000'),
            contracts.usdt.balanceOf(import.meta.env.VITE_P12_ORBIT_ADDRESS || '0x0000000000000000000000000000000000000000'),
            contracts.usdt.balanceOf(import.meta.env.VITE_P39_ORBIT_ADDRESS || '0x0000000000000000000000000000000000000000'),
          ])

          const totalParticipantsValue = Number(totalParticipantsRaw || 0)
          const visibleCoreBalanceValue =
            formatUsdt(escrowRaw) +
            formatUsdt(p4Raw) +
            formatUsdt(p12Raw) +
            formatUsdt(p39Raw)

          setTotalParticipants(totalParticipantsValue)
          setPublicReadStats({
            totalParticipants: totalParticipantsValue,
            visibleCoreBalance: formatToken(visibleCoreBalanceValue),
            readLayerStatus: 'Live (Contract)',
          })

          setCommunityStats((prev) => ({
            ...prev,
            members: totalParticipantsValue,
            totalDistributed: formatToken(visibleCoreBalanceValue),
          }))
        } catch (contractErr) {
          console.error('Contract fallback also failed:', contractErr)
          setPublicReadStats((prev) => ({
            ...prev,
            readLayerStatus: 'Unavailable',
          }))
        }
      } else {
        setPublicReadStats((prev) => ({
          ...prev,
          readLayerStatus: 'Unavailable',
        }))
      }
    }
  }, [contracts, formatToken, formatUsdt])

  // PATCH F — replace member summary fetch with backend route
  const fetchMemberSummary = useCallback(async () => {
    if (!resolvedAddress) return

    try {
      const payload = await fetchJson(`/api/community/member/${resolvedAddress}/summary`)
      const data = payload?.data || {}

      setMemberSummary({
        isRegistered: Boolean(data.isRegistered),
        referrer: data.referrer || '',
        highestActiveLevel: Number(data.highestActiveLevel || 0),
        activeLevelsCount: Number(data.activeLevelsCount || 0),
        totalReceiptEarnings: data.totalReceiptEarnings || '0.00',
        fgtTotal: data.fgtTotal || '0.00',
        fgtrTotal: data.fgtrTotal || '0.00',
      })
    } catch (err) {
      console.error('Error fetching member summary:', err)
    }
  }, [resolvedAddress])

  // PATCH G — replace referral stats fetch with backend route
  const fetchUserReferralStats = useCallback(async () => {
    if (!resolvedAddress) return

    try {
      if (!isOwnSpace) {
        setUserReferralCount(0)
        setUserCommission('0.00')
        return
      }

      const payload = await fetchJson(`/api/community/member/${resolvedAddress}/referrals`)
      const data = payload?.data || {}

      setUserReferralCount(Number(data.totalReferrals || 0))
      setUserCommission(data.commissionEarnedLiquid || '0.00')
    } catch (err) {
      console.error('Error fetching referral stats:', err)
      setUserReferralCount(0)
      setUserCommission('0.00')
    }
  }, [resolvedAddress, isOwnSpace])

  // PATCH H — replace downline fetch with backend route
  const fetchUserDownline = useCallback(async () => {
    if (!resolvedAddress) return

    try {
      const payload = await fetchJson(`/api/community/member/${resolvedAddress}/downline`)
      const data = payload?.data || {}

      setDownlineStats({
        level1: Number(data.level1 || 0),
        level2: Number(data.level2 || 0),
        level3: Number(data.level3 || 0),
        level4: Number(data.level4 || 0),
        level5: Number(data.level5 || 0),
        level6: Number(data.level6 || 0),
        level7: Number(data.level7 || 0),
        level8: Number(data.level8 || 0),
        level9: Number(data.level9 || 0),
        level10: Number(data.level10 || 0),
      })
    } catch (err) {
      console.error('Error fetching downline:', err)
      setDownlineStats({
        level1: 0,
        level2: 0,
        level3: 0,
        level4: 0,
        level5: 0,
        level6: 0,
        level7: 0,
        level8: 0,
        level9: 0,
        level10: 0,
      })
    }
  }, [resolvedAddress])

  // PATCH Q — fix total earned all time source
  const fetchTotalEarnedAllTime = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/stats')
      const data = payload?.data || {}
      setTotalEarnedAllTime(data.totalLiquid || '0.00')
    } catch (err) {
      console.error('Error fetching total earned:', err)
      setTotalEarnedAllTime('0.00')
    }
  }, [])

  // PATCH I — replace leaderboard fetch with backend route (UPDATED with type parameter)
  const fetchLeaderboard = useCallback(async (type = leaderboardType) => {
    try {
      const payload = await fetchJson(`/api/community/leaderboard?limit=10&type=${type}`)
      const items = Array.isArray(payload?.data) ? payload.data : []

      setLeaderboardState({
        status: items.length ? 'live' : 'unavailable',
        items,
      })

      setCommunityFeedStatus((prev) => ({
        ...prev,
        leaderboard: items.length ? 'live' : 'unavailable',
      }))
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setLeaderboardState({
        status: 'error',
        items: [],
      })
      setCommunityFeedStatus((prev) => ({
        ...prev,
        leaderboard: 'unavailable',
      }))
    }
  }, [leaderboardType])

  // NEW: Fetch full leaderboard for modal
  const fetchFullLeaderboard = useCallback(async () => {
    try {
      const payload = await fetchJson(`/api/community/leaderboard?limit=100&type=${leaderboardType}`)
      const items = Array.isArray(payload?.data) ? payload.data : []
      setFullLeaderboard(items)
    } catch (err) {
      console.error('Error fetching full leaderboard:', err)
      setFullLeaderboard([])
    }
  }, [leaderboardType])

  // PATCH J — replace announcements fetch with backend route
  const fetchAnnouncements = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/announcements')
      const data = payload?.data || {}

      setAnnouncementState({
        status: data.status || 'unavailable',
        items: Array.isArray(data.items) ? data.items : [],
      })

      setCommunityFeedStatus((prev) => ({
        ...prev,
        announcements: data.status || 'unavailable',
      }))
    } catch (err) {
      console.error('Error fetching announcements:', err)
      setAnnouncementState({
        status: 'error',
        items: [],
      })
    }
  }, [])

  // PATCH K — replace events fetch with backend route
  const fetchCommunityEvents = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/events')
      const data = payload?.data || {}

      setEventState({
        status: data.status || 'unavailable',
        items: Array.isArray(data.items) ? data.items : [],
      })

      setCommunityFeedStatus((prev) => ({
        ...prev,
        events: data.status || 'unavailable',
      }))
    } catch (err) {
      console.error('Error fetching community events:', err)
      setEventState({
        status: 'error',
        items: [],
      })
    }
  }, [])

  // PATCH L — add social links fetch
  const fetchCommunitySocialLinks = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/social-links')
      const data = payload?.data || {}

      setSocialLinkState({
        status: data.status || 'unavailable',
        items: Array.isArray(data.items) ? data.items : [],
      })

      setCommunityFeedStatus((prev) => ({
        ...prev,
        socialLinks: data.status || 'unavailable',
      }))
    } catch (err) {
      console.error('Error fetching social links:', err)
      setSocialLinkState({
        status: 'error',
        items: [],
      })
    }
  }, [])

  // PATCH M — add resources fetch
  const fetchCommunityResources = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/resources')
      const data = payload?.data || {}

      setResourceState({
        status: data.status || 'unavailable',
        items: Array.isArray(data.items) ? data.items : [],
      })

      setCommunityFeedStatus((prev) => ({
        ...prev,
        resources: data.status || 'unavailable',
      }))
    } catch (err) {
      console.error('Error fetching resources:', err)
      setResourceState({
        status: 'error',
        items: [],
      })
    }
  }, [])

  // PATCH N — replace growth fetch with backend route
  const fetchCommunityGrowthStats = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/growth?days=14')
      const data = payload?.data || {}

      setCommunityGrowth({
        rangeDays: Number(data.rangeDays || 14),
        series: Array.isArray(data.series) ? data.series : [],
      })

      const registrationsTotal = (data.series || []).reduce(
        (sum, item) => sum + Number(item.registrations || 0),
        0
      )

      setCommunityStats((prev) => ({
        ...prev,
        growthRate: registrationsTotal > 0 ? `+${registrationsTotal} recent joins` : 'No recent joins',
      }))

      setCommunityFeedStatus((prev) => ({
        ...prev,
        growth: 'live',
      }))
    } catch (err) {
      console.error('Error fetching community growth stats:', err)
      setCommunityGrowth({
        rangeDays: 14,
        series: [],
      })
      setCommunityFeedStatus((prev) => ({
        ...prev,
        growth: 'unavailable',
      }))
    }
  }, [])

  // NEW: Handle refresh feeds
  const handleRefreshFeeds = async () => {
    setIsRefreshingFeeds(true)
    try {
      await Promise.all([
        fetchAnnouncements(),
        fetchCommunityEvents()
      ])
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Error refreshing feeds:', err)
    } finally {
      setIsRefreshingFeeds(false)
    }
  }

  // NEW: Handle leaderboard tab change
  const handleLeaderboardTabChange = (type) => {
    setLeaderboardType(type)
    fetchLeaderboard(type)
  }

  // NEW: Handle copy address
  const handleCopyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      setTimeout(() => setCopiedAddress(''), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  // NEW: Open leaderboard modal
  const handleViewFullLeaderboard = async () => {
    await fetchFullLeaderboard()
    setShowLeaderboardModal(true)
  }

  // Set referral link (only for own space)
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (isOwnSpace && account) {
      setReferralLink(`${window.location.origin}/register?ref=${account}`)
      return
    }

    setReferralLink('')
  }, [account, isOwnSpace])

  // Copy referral link to clipboard
  const copyToClipboard = async () => {
    if (!referralLink) return

    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Load contracts and fetch data
  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  // Main data fetching effect
  // PATCH O — fetch all new backend feeds in main effect
  useEffect(() => {
    if (contracts) {
      fetchPublicReadStats()
      fetchTotalEarnedAllTime()
      fetchLeaderboard()
      fetchAnnouncements()
      fetchCommunityGrowthStats()
      fetchCommunityEvents()
      fetchCommunitySocialLinks()
      fetchCommunityResources()
    }

    if (resolvedAddress) {
      fetchMemberSummary()
      fetchUserDownline()
      fetchUserReferralStats()
    }
  }, [
    contracts,
    resolvedAddress,
    fetchPublicReadStats,
    fetchTotalEarnedAllTime,
    fetchLeaderboard,
    fetchAnnouncements,
    fetchCommunityGrowthStats,
    fetchCommunityEvents,
    fetchCommunitySocialLinks,
    fetchCommunityResources,
    fetchMemberSummary,
    fetchUserDownline,
    fetchUserReferralStats,
  ])

  // Auto-refresh every 30 seconds
  // PATCH P — improve auto refresh
  useEffect(() => {
    if (!contracts) return

    const interval = setInterval(() => {
      fetchPublicReadStats()
      fetchLeaderboard()
      fetchAnnouncements()
      fetchCommunityEvents()
      fetchCommunityGrowthStats()

      if (resolvedAddress) {
        fetchMemberSummary()
        fetchUserDownline()
        fetchUserReferralStats()
      }

      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)

    return () => clearInterval(interval)
  }, [
    contracts,
    resolvedAddress,
    fetchPublicReadStats,
    fetchLeaderboard,
    fetchAnnouncements,
    fetchCommunityEvents,
    fetchCommunityGrowthStats,
    fetchMemberSummary,
    fetchUserDownline,
    fetchUserReferralStats,
  ])

  // Wallet guard with visitor mode support
  if (!isConnected && !resolvedAddress) {
    return (
      <section className="community-page">
        <div className="community-hero">
          <div className="community-hero__content">
            <div className="community-hero__eyebrow glass-panel">
              <span className="community-hero__eyebrow-dot" />
              <span className="community-hero__eyebrow-text">Join the Movement</span>
            </div>
            <div className="community-hero__text-block">
              <h1 className="community-hero__title">Community</h1>
              <p className="community-hero__description soft-text">
                Connect your wallet to access referral tools, view leaderboards, and track community growth.
              </p>
            </div>
            <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
          </div>
          <div className="community-hero__visual glass-panel">
            <div className="community-hero__visual-box">
              <div style={{ textAlign: 'center' }}>
                <Users size={44} />
                <div>Connect to join the community</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (contractsLoading) {
    return (
      <section className="community-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading community data...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="community-page">
      {/* Leaderboard Full View Modal */}
      {showLeaderboardModal && (
        <div className="leaderboard-modal-overlay" onClick={() => setShowLeaderboardModal(false)}>
          <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="leaderboard-modal-header">
              <h2>Full Leaderboard</h2>
              <button className="modal-close-btn" onClick={() => setShowLeaderboardModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="leaderboard-modal-content">
              {fullLeaderboard.length ? (
                fullLeaderboard.map((entry, index) => (
                  <div 
                    key={entry.address || index} 
                    className={`leaderboard-item ${entry.address?.toLowerCase() === resolvedAddress?.toLowerCase() ? 'highlighted' : ''}`}
                  >
                    <div className={`rank-badge rank-${index + 1}`}>#{index + 1}</div>
                    <div className="leaderboard-address">
                      {shortAddress(entry.address)}
                    </div>
                    <div className="leaderboard-earnings">${formatToken(entry.totalEarned || 0)}</div>
                    <div className="leaderboard-referrals">
                      {entry.receiptCount || 0} receipts
                    </div>
                  </div>
                ))
              ) : (
                <div className="community-panel-empty">
                  <Trophy size={18} />
                  <div>
                    <strong>No leaderboard data available</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="community-hero">
        <div className="community-hero__content">
          <div className="community-hero__eyebrow glass-panel">
            <span className="community-hero__eyebrow-dot" />
            <span className="community-hero__eyebrow-text">
              Ecosystem visibility, participation, and momentum
            </span>
          </div>

          <div className="community-hero__text-block">
            <h1 className="community-hero__title">Community Hub</h1>
            <p className="community-hero__description soft-text">
              Connect, compete, and grow together in the FFN ecosystem. Track your referrals, monitor leaderboards, and celebrate community milestones.
            </p>
            <div className="small muted-text">
              Last updated: {lastUpdated} • Viewing: {isOwnSpace ? 'your connected space' : 'public visitor space'}
            </div>
          </div>

          <div className="community-hero__chips">
            <span className="community-hero__chip glass-panel">
              <Users size={14} />
              <span>{formatWhole(publicReadStats.totalParticipants)} Members</span>
            </span>

            <span className="community-hero__chip glass-panel">
              <Globe size={14} />
              <span>{viewerLabel}</span>
            </span>

            <span className="community-hero__chip glass-panel">
              <Route size={14} />
              <span>{viewerAddressLabel}</span>
            </span>
          </div>
        </div>

        <div className="community-hero__visual glass-panel">
          <div className="community-hero__visual-box">
            <div className="hero-network-viz" aria-hidden="true">
              <div className="hero-network-viz__ring hero-network-viz__ring--one" />
              <div className="hero-network-viz__ring hero-network-viz__ring--two" />
              <div className="hero-network-viz__ring hero-network-viz__ring--three" />

              <div className="hero-network-viz__core">
                <Users size={22} />
              </div>

              <div className="hero-network-viz__orbit hero-network-viz__orbit--one">
                <span className="hero-network-viz__node hero-network-viz__node--one" />
              </div>

              <div className="hero-network-viz__orbit hero-network-viz__orbit--two">
                <span className="hero-network-viz__node hero-network-viz__node--two" />
              </div>

              <div className="hero-network-viz__orbit hero-network-viz__orbit--three">
                <span className="hero-network-viz__node hero-network-viz__node--three" />
              </div>
            </div>
          </div>
          <p className="community-hero__visual-note muted-text">
            Public participation visibility improves as more live read-layer and backend community feeds are connected.
          </p>
        </div>
      </div>

      {/* Core Metrics */}
      <section className="community-metrics glass-panel">
        <div className="community-section-heading">
          <span className="community-section-heading__eyebrow muted-text">
            Public Snapshot
          </span>
          <h2 className="community-section-heading__title">
            Core community indicators at a glance
          </h2>
        </div>

        <div className="community-metrics__grid">
          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon"><Users size={18} /></span>
            <span className="community-metrics__label muted-text">Total Members</span>
            <strong className="community-metrics__value">{formatWhole(publicReadStats.totalParticipants)}</strong>
            <small className="data-source">Source: Live registration contract</small>
          </div>

          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon"><FaCoins size={18} /></span>
            <span className="community-metrics__label muted-text">Visible Core Balance</span>
            <strong className="community-metrics__value">{publicReadStats.visibleCoreBalance} USDT</strong>
            <small className="data-source">Source: Escrow + orbit contract balances</small>
          </div>

          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon"><FaShieldAlt size={18} /></span>
            <span className="community-metrics__label muted-text">Read Layer</span>
            <strong className="community-metrics__value">{publicReadStats.readLayerStatus}</strong>
            <small className="data-source">Source: Live contract reads</small>
          </div>

          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon"><Trophy size={18} /></span>
            <span className="community-metrics__label muted-text">Community Feed</span>
            <strong className="community-metrics__value">
              {getSourceBadgeLabel(communityFeedStatus.leaderboard)}
            </strong>
            <div className={getSourceBadgeClass(communityFeedStatus.leaderboard)}>
              {getSourceBadgeLabel(communityFeedStatus.leaderboard)}
            </div>
            <small className="data-source">Source: Backend/indexer required</small>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="community-main-grid">
        <div className="community-main-grid__left">
          
          {/* YOUR REFERRAL SECTION */}
          <section className="community-referral glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">
                Your Referral Arsenal
              </span>
              <h2 className="community-section-heading__title">
                Share, invite, and earn together
              </h2>
            </div>

            {isOwnSpace ? (
              <>
                <div className="referral-stats-grid">
                  <div className="referral-stat">
                    <span className="referral-stat-label">Total Referrals</span>
                    <strong className="referral-stat-value">{userReferralCount}</strong>
                  </div>

                  <div className="referral-stat">
                    <span className="referral-stat-label">Commission Earned</span>
                    <strong className="referral-stat-value">${userCommission}</strong>
                  </div>

                  <div className="referral-stat">
                    <span className="referral-stat-label">Conversion View</span>
                    <strong className="referral-stat-value">
                      ~{userReferralCount > 0 ? Math.floor((userReferralCount / (userReferralCount + 50)) * 100) : 0}%
                    </strong>
                  </div>
                </div>

                <div className="referral-link-container">
                  <div className="referral-link-label">Your Unique Referral Link</div>
                  <div className="referral-link-box">
                    <input
                      type="text"
                      className="referral-link-input"
                      value={referralLink}
                      readOnly
                    />
                    <button className="copy-btn" onClick={copyToClipboard}>
                      {copied ? (
                        <>
                          <ShieldCheck size={14} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  {copied ? (
                    <div className="copy-success">Referral link copied successfully.</div>
                  ) : null}
                </div>

                <div className="referral-tip">
                  <Rocket size={16} />
                  <span className="tip-text">
                    Share your personal link to onboard new participants into your own space.
                  </span>
                </div>
              </>
            ) : (
              <div className="community-panel-empty glass-panel">
                <Globe size={18} />
                <div>
                  <strong className="community-panel-empty__title">Visitor mode is active</strong>
                  <p className="community-panel-empty__text soft-text">
                    Referral tools are available only inside your own connected space.
                  </p>
                </div>
              </div>
            )}

            <small className="data-source">
              Source: own-space referral tools only; visitor mode hides private invite actions.
            </small>
          </section>

          {/* DOWNLINE / TEAM TREE - UPDATED WITH ALL 10 LEVELS AND RADAR EFFECT */}
          <section className="community-downline glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">
                Your Network Tree
              </span>
              <h2 className="community-section-heading__title">
                Watch your team grow
              </h2>
            </div>

            <div className="downline-tree">
              <div className="tree-root">
                <div className="tree-node you">
                  <span className="node-icon">👤</span>
                  <span className="node-label">You</span>
                  <span className="node-level">Level 0</span>
                </div>
                <div className="tree-levels-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <div className="tree-level" key={level}>
                      <div className="level-label">Level {level}</div>
                      <div className="level-count">{downlineStats[`level${level}`] || 0} members</div>
                      <div className="level-progress">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${Math.min(((downlineStats[`level${level}`] || 0) / (level * 50)) * 100, 100)}%` 
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* PATCH X — expand downline total calculation */}
              <div className="tree-total">
                Visible Network Count: <strong>{
                  downlineStats.level1 +
                  downlineStats.level2 +
                  downlineStats.level3 +
                  downlineStats.level4 +
                  (downlineStats.level5 || 0) +
                  (downlineStats.level6 || 0) +
                  (downlineStats.level7 || 0) +
                  (downlineStats.level8 || 0) +
                  (downlineStats.level9 || 0) +
                  (downlineStats.level10 || 0)
                }</strong>
              </div>
              
              <button 
                className="view-orbit-btn"
                onClick={() => handleRoute('orbit')}
              >
                <span>View Full Orbit</span>
                <ArrowRight size={14} />
              </button>
            </div>
            <small className="data-source">Source: Orbit snapshot API when available</small>
          </section>

          {/* PATCH S — make growth section real */}
          <section className="community-growth glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">
                Growth Overview
              </span>
              <h2 className="community-section-heading__title">
                Community movement and momentum
              </h2>
            </div>

            {communityGrowth.series.length ? (
              <>
                <div className="growth-chart">
                  {communityGrowth.series.map((item) => {
                    const registrations = Number(item.registrations || 0)
                    const maxRegistrations = Math.max(
                      ...communityGrowth.series.map((entry) => Number(entry.registrations || 0)),
                      1
                    )
                    const height = `${Math.max((registrations / maxRegistrations) * 100, registrations > 0 ? 12 : 4)}%`

                    return (
                      <div
                        key={item.date}
                        className="chart-bar"
                        style={{ height }}
                        title={`${item.date} • ${registrations} registrations`}
                      >
                        <span>{item.date.slice(5)}</span>
                      </div>
                    )
                  })}
                </div>

                <p className="chart-note">
                  Registrations over the last {communityGrowth.rangeDays} days
                </p>
              </>
            ) : (
              <div className="community-growth__chart community-empty-state">
                <div className="community-empty-state__icon">
                  <FaChartLine size={24} />
                </div>
                <div className="community-empty-state__body">
                  <strong>Growth history is not available yet</strong>
                  <p className="chart-note">
                    Growth data will appear here once indexed registration history is available.
                  </p>
                </div>
              </div>
            )}

            <p className="community-growth__note muted-text">
              Source status: {getSourceBadgeLabel(communityFeedStatus.growth)}
            </p>
            <small className="data-source">Source: /api/community/growth</small>
          </section>

          {/* COMMUNITY HIGHLIGHTS - WITH REFRESH BUTTON */}
          <section className="community-highlights glass-panel">
            <div className="community-section-heading">
              <div>
                <span className="community-section-heading__eyebrow muted-text">
                  Highlights
                </span>
                <h2 className="community-section-heading__title">
                  Recent ecosystem moments
                </h2>
              </div>
              <button 
                className="refresh-btn"
                onClick={handleRefreshFeeds}
                disabled={isRefreshingFeeds}
                title="Refresh announcements"
              >
                <FaSyncAlt size={16} className={isRefreshingFeeds ? 'spinning' : ''} />
              </button>
            </div>

            <div className="community-highlights__list">
              {announcementItems.length ? (
                announcementItems.map((announcement) => (
                  <div key={announcement.id} className={`community-highlights__item type-${announcement.type || 'info'}`}>
                    <span className="community-highlights__icon">
                      <Megaphone size={18} />
                    </span>
                    <div>
                      <h3 className="community-highlights__title">{announcement.title}</h3>
                      <p className="community-highlights__text soft-text">{announcement.content}</p>
                      <span className="highlight-date">{announcement.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="community-panel-empty glass-panel">
                  <Megaphone size={18} />
                  <div>
                    <strong className="community-panel-empty__title">Announcement feed not connected yet</strong>
                    <p className="community-panel-empty__text soft-text">
                      This section is ready for CMS or backend announcement publishing.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <small className="data-source">
              Source: backend/CMS announcement adapter {announcementState.status === 'unavailable' ? '(not connected)' : ''}
            </small>
          </section>
        </div>

        <div className="community-main-grid__right">
          
          {/* GLOBAL LEADERBOARD - UPDATED WITH TABS AND MODAL */}
          <section className="community-leaderboard glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">
                Global Leaderboard
              </span>
              <h2 className="community-section-heading__title">
                Top earners & referrers
              </h2>
            </div>

            <div className="leaderboard-tabs">
              <button 
                className={`leaderboard-tab ${leaderboardType === 'earners' ? 'active' : ''}`}
                onClick={() => handleLeaderboardTabChange('earners')}
              >
                Top Earners
              </button>
              <button 
                className={`leaderboard-tab ${leaderboardType === 'referrers' ? 'active' : ''}`}
                onClick={() => handleLeaderboardTabChange('referrers')}
              >
                Top Referrers
              </button>
              <button 
                className={`leaderboard-tab ${leaderboardType === 'active' ? 'active' : ''}`}
                onClick={() => handleLeaderboardTabChange('active')}
              >
                Most Active
              </button>
            </div>

            <div className="leaderboard-list">
              {leaderboardItems.length ? (
                leaderboardItems.map((entry, index) => (
                  <div 
                    key={entry.rank || index} 
                    className="leaderboard-item"
                    onMouseEnter={() => setHoveredAddressIndex(index)}
                    onMouseLeave={() => setHoveredAddressIndex(null)}
                  >
                    <div className={`rank-badge rank-${entry.rank || (index + 1)}`}>#{entry.rank || (index + 1)}</div>
                    <div className="leaderboard-address-container">
                      <div className="leaderboard-address">
                        {hoveredAddressIndex === index ? entry.address : shortAddress(entry.address)}
                      </div>
                      {hoveredAddressIndex === index && (
                        <button 
                          className="copy-address-btn"
                          onClick={() => handleCopyAddress(entry.address)}
                          title="Copy address"
                        >
                          <Copy size={12} />
                          {copiedAddress === entry.address && <span className="copied-tooltip">Copied!</span>}
                        </button>
                      )}
                    </div>
                    <div className="leaderboard-earnings">${formatToken(entry.totalEarned || 0)}</div>
                    <div className="leaderboard-referrals">
                      {entry.receiptCount || entry.referralCount || 0} {leaderboardType === 'earners' ? 'receipts' : 'referrals'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="community-panel-empty glass-panel">
                  <Trophy size={18} />
                  <div>
                    <strong className="community-panel-empty__title">Leaderboard feed not connected yet</strong>
                    <p className="community-panel-empty__text soft-text">
                      This panel is ready for backend aggregation once leaderboard services are enabled.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {leaderboardItems.length > 0 && (
              <div className="leaderboard-footer">
                <button className="view-full-board-btn" onClick={handleViewFullLeaderboard}>
                  <span>View Full Board</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
            
            <small className="data-source">
              Source: backend leaderboard adapter {leaderboardState.status === 'unavailable' ? '(not connected)' : ''}
            </small>
          </section>

          {/* ANNOUNCEMENTS / EVENTS - WITH REFRESH BUTTON */}
          <section className="community-events glass-panel">
            <div className="community-section-heading">
              <div>
                <span className="community-section-heading__eyebrow muted-text">
                  Upcoming Events
                </span>
                <h2 className="community-section-heading__title">
                  Don't miss out
                </h2>
              </div>
              <button 
                className="refresh-btn"
                onClick={handleRefreshFeeds}
                disabled={isRefreshingFeeds}
                title="Refresh events"
              >
                <FaSyncAlt size={16} className={isRefreshingFeeds ? 'spinning' : ''} />
              </button>
            </div>

            {/* PATCH T — make events section real */}
            <div className="events-list">
              {eventItems.length ? (
                eventItems.map((eventItem) => (
                  <div key={eventItem._id || eventItem.id} className="community-highlights__item type-event">
                    <span className="community-highlights__icon">
                      <FaStar size={18} />
                    </span>
                    <div>
                      <h3 className="community-highlights__title">{eventItem.title}</h3>
                      <p className="community-highlights__text soft-text">
                        {eventItem.content || 'Upcoming community event'}
                      </p>
                      <span className="highlight-date">{eventItem.date}</span>

                      {eventItem.ctaUrl ? (
                        <div style={{ marginTop: '10px' }}>
                          <a
                            href={eventItem.ctaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="view-all-btn"
                            style={{ textDecoration: 'none' }}
                          >
                            <span>{eventItem.ctaLabel || 'Open event'}</span>
                            <ArrowRight size={14} />
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="community-empty-state">
                  <div className="community-empty-state__icon">
                    <FaStar size={24} />
                  </div>
                  <div className="community-empty-state__body">
                    <strong>No scheduled community events yet</strong>
                    <p className="soft-text">
                      Upcoming AMAs, contests, launches, and community sessions will appear here once the events feed is connected.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <small className="data-source">
              Source: /api/community/events {eventState.status === 'unavailable' ? '(not connected)' : ''}
            </small>
          </section>

          {/* COMMUNITY SPOTLIGHT */}
          <section className="community-spotlight glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">
                Spotlight
              </span>
              <h2 className="community-section-heading__title">
                Community achievements
              </h2>
            </div>

            <div className="community-spotlight__card glass-panel">
              <span className="community-spotlight__label muted-text">Milestone</span>
              <strong className="community-spotlight__value">{formatWhole(publicReadStats.totalParticipants)} Members</strong>
              <p className="community-spotlight__text soft-text">
                Total registered participants currently visible from the live registration contract.
              </p>
            </div>

            <div className="community-spotlight__card glass-panel">
              <span className="community-spotlight__label muted-text">Member Progress</span>
              <strong className="community-spotlight__value">Level {memberSummary.highestActiveLevel || 0}</strong>
              <p className="community-spotlight__text soft-text">
                Your highest active level currently visible from the live registration contract.
              </p>
            </div>

            {/* PATCH W — improve spotlight with backend totals */}
            <div className="community-spotlight__card glass-panel">
              <span className="community-spotlight__label muted-text">Token Snapshot</span>
              <strong className="community-spotlight__value">{memberSummary.fgtTotal} FGT</strong>
              <p className="community-spotlight__text soft-text">
                FGTr: {memberSummary.fgtrTotal} • Receipt earnings: ${memberSummary.totalReceiptEarnings}
              </p>
            </div>
          </section>

          {/* SUPPORT & RESOURCES / SOCIAL LINKS */}
          <section className="community-resources glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">
                Resources & Support
              </span>
              <h2 className="community-section-heading__title">
                Get help and stay connected
              </h2>
            </div>

            {/* PATCH U — make resources section real */}
            <div className="resources-grid">
              {resourceItems.map((item) => {
                const Icon = item.icon
                const ResolvedIcon =
                  typeof Icon === 'function'
                    ? Icon
                    : item.key === 'faq'
                      ? HelpCircle
                      : item.key === 'tutorials'
                        ? BookOpen
                        : item.key === 'support'
                          ? MessageCircle
                          : BadgeInfo

                const isExternal = Boolean(item.href)

                return isExternal ? (
                  <a
                    key={item._id || item.id || item.key}
                    href={item.href}
                    className="resource-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="resource-icon">
                      <ResolvedIcon size={18} />
                    </span>
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <button
                    key={item._id || item.id || item.key}
                    type="button"
                    className="resource-link"
                    onClick={() => handleRoute(item.route || 'support')}
                  >
                    <span className="resource-icon">
                      <ResolvedIcon size={18} />
                    </span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="social-links">
              <h4>Follow us</h4>
              <div className="social-icons">
                {/* PATCH V — make social links section real */}
                {socialItems.map((item) => {
                  const Icon =
                    item.icon === 'telegram'
                      ? PiTelegramLogoFill
                      : item.icon === 'instagram'
                        ? FaInstagram
                        : item.icon === 'facebook'
                          ? FaFacebookF
                          : FaXTwitter
                  return (
                    <a
                      key={item._id || item.id || item.key}
                      href={item.href}
                      className="social-icon"
                      target="_blank"
                      rel="noreferrer"
                      aria-label={item.label}
                    >
                      <Icon size={18} />
                    </a>
                  )
                })}
              </div>
            </div>

            <div className="newsletter-signup">
              <h4>Community Updates</h4>
              <div className="community-empty-state community-empty-state--compact">
                <div className="community-empty-state__body">
                  <strong>Newsletter signup is not connected yet</strong>
                  <p className="newsletter-note">
                    Add your backend email endpoint before enabling subscriptions here.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <style>{`
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
        
        .data-source {
          font-size: 9px;
          color: rgba(255,255,255,0.3);
          margin-top: 12px;
          display: block;
          text-align: right;
        }
        
        .copy-success {
          margin-top: 12px;
          padding: 10px;
          background: rgba(29, 233, 182, 0.15);
          border: 1px solid var(--glow-teal);
          border-radius: 10px;
          font-size: 12px;
          color: var(--glow-teal);
          text-align: center;
        }
        
        /* Hero Network Visualization */
        .hero-network-viz {
          position: relative;
          width: min(100%, 280px);
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-network-viz__ring,
        .hero-network-viz__orbit {
          position: absolute;
          inset: 50% auto auto 50%;
          transform: translate(-50%, -50%);
          border-radius: 999px;
        }

        .hero-network-viz__ring {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: radial-gradient(circle, rgba(255,255,255,0.025), transparent 72%);
        }

        .hero-network-viz__ring--one {
          width: 82px;
          height: 82px;
        }

        .hero-network-viz__ring--two {
          width: 136px;
          height: 136px;
        }

        .hero-network-viz__ring--three {
          width: 196px;
          height: 196px;
        }

        .hero-network-viz__core {
          position: relative;
          z-index: 2;
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          background:
            linear-gradient(135deg, rgba(29, 233, 182, 0.24), rgba(77, 163, 255, 0.22));
          border: 1px solid var(--border-strong);
          box-shadow: 0 12px 34px rgba(77, 163, 255, 0.18);
        }

        .hero-network-viz__orbit--one {
          width: 82px;
          height: 82px;
          animation: communityOrbitSpin 7s linear infinite;
        }

        .hero-network-viz__orbit--two {
          width: 136px;
          height: 136px;
          animation: communityOrbitSpin 10s linear infinite;
        }

        .hero-network-viz__orbit--three {
          width: 196px;
          height: 196px;
          animation: communityOrbitSpin 13s linear infinite;
        }

        .hero-network-viz__node {
          position: absolute;
          top: -5px;
          left: 50%;
          width: 10px;
          height: 10px;
          margin-left: -5px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--glow-teal), var(--glow-blue));
          box-shadow:
            0 0 16px rgba(77, 163, 255, 0.4),
            0 0 24px rgba(29, 233, 182, 0.2);
        }

        @keyframes communityOrbitSpin {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-network-viz__orbit {
            animation: none;
          }
        }
        
        /* Source Badges */
        .source-badge {
          min-height: 26px;
          padding: 0 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
        }

        .source-badge--live {
          color: #07111f;
          background: linear-gradient(135deg, var(--glow-teal), var(--glow-blue));
        }

        .source-badge--indexed {
          color: white;
          background: rgba(77, 163, 255, 0.18);
          border: 1px solid rgba(77, 163, 255, 0.3);
        }

        .source-badge--unavailable {
          color: var(--text-secondary);
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
        }

        /* Empty States */
        .community-empty-state {
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 18px;
          text-align: left;
          border-radius: 18px;
          background: rgba(255,255,255,0.04);
          border: 1px dashed var(--border-strong);
        }

        .community-empty-state--compact {
          min-height: auto;
          text-align: center;
        }

        .community-empty-state__icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          font-size: 18px;
          flex-shrink: 0;
        }

        .community-empty-state__body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* Panel Empty */
        .community-panel-empty {
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: var(--surface-1);
          border: 1px solid var(--border-soft);
          border-radius: 16px;
        }

        .community-panel-empty__title {
          display: block;
          font-size: 14px;
          line-height: 1.2;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .community-panel-empty__text {
          font-size: 13px;
          line-height: 1.6;
        }

        /* Referral Section */
        .referral-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .referral-stat {
          text-align: center;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
        }
        .referral-stat-label {
          display: block;
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        .referral-stat-value {
          font-size: 24px;
          font-weight: bold;
          color: var(--glow-teal);
        }
        .referral-link-container {
          margin-bottom: 16px;
        }
        .referral-link-label {
          font-size: 12px;
          margin-bottom: 8px;
          color: var(--text-secondary);
        }
        .referral-link-box {
          display: flex;
          gap: 8px;
        }
        .referral-link-input {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          font-family: monospace;
          font-size: 12px;
        }
        .copy-btn {
          padding: 12px 20px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: bold;
          background: var(--glow-teal);
          color: #07111f;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .referral-tip {
          background: rgba(29, 233, 182, 0.1);
          padding: 12px;
          border-radius: 12px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .tip-icon { font-size: 18px; }
        .tip-text { font-size: 12px; color: var(--text-secondary); }
        
        /* Downline Tree - UPDATED */
        .community-downline {
          position: relative;
          overflow: hidden;
        }

        .community-downline::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(29, 233, 182, 0.06) 90deg,
            transparent 180deg,
            transparent 360deg
          );
          animation: radarSpin 12s linear infinite;
          pointer-events: none;
          z-index: 1;
        }

        .community-downline > * {
          position: relative;
          z-index: 2;
        }

        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .downline-tree {
          padding: 16px;
          background: rgba(0,0,0,0.2);
          border-radius: 20px;
        }
        .tree-root {
          text-align: center;
        }
        .tree-node.you {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 20px;
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
          border-radius: 20px;
          margin-bottom: 20px;
        }
        .node-icon { font-size: 20px; }
        .node-label { font-weight: bold; margin: 4px 0; }
        .node-level { font-size: 10px; opacity: 0.8; }
        
        .tree-levels-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .tree-level {
          text-align: center;
          padding: 12px 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
        }
        .level-label { font-size: 10px; color: var(--text-secondary); margin-bottom: 6px; font-weight: bold; }
        .level-count { font-size: 16px; font-weight: bold; margin-bottom: 6px; }
        .level-progress { height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
        .level-progress .progress-fill { height: 100%; background: var(--glow-teal); width: 0%; }
        .tree-total { text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
        
        .view-orbit-btn {
          width: 100%;
          margin-top: 16px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          border: 1px solid var(--border-soft);
          color: white;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .view-orbit-btn:hover {
          background: rgba(255,255,255,0.15);
          border-color: var(--border-strong);
        }
        
        /* Growth Chart */
        .chart-note {
          text-align: center;
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 8px;
        }
        
        .growth-chart {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 8px;
          height: 180px;
          padding: 16px 0;
        }
        
        .chart-bar {
          flex: 1;
          max-width: 40px;
          background: linear-gradient(180deg, var(--glow-teal) 0%, var(--glow-blue) 100%);
          border-radius: 6px 6px 4px 4px;
          min-height: 4px;
          transition: height 0.3s ease;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          position: relative;
        }
        
        .chart-bar span {
          position: absolute;
          bottom: -22px;
          font-size: 10px;
          color: var(--text-secondary);
          transform: rotate(-45deg);
          white-space: nowrap;
        }
        
        /* Leaderboard - UPDATED */
        .leaderboard-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 12px;
        }
        .leaderboard-tab {
          padding: 8px 16px;
          border-radius: 30px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        .leaderboard-tab:hover {
          background: rgba(255,255,255,0.1);
        }
        .leaderboard-tab.active {
          background: var(--glow-teal);
          color: #07111f;
        }
        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }
        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          transition: all 0.2s;
        }
        .leaderboard-item.highlighted {
          background: rgba(29, 233, 182, 0.15);
          border: 1px solid var(--glow-teal);
        }
        .rank-badge {
          width: 40px;
          text-align: center;
          font-weight: bold;
        }
        .rank-badge.rank-1 { color: #ffd700; }
        .rank-badge.rank-2 { color: #c0c0c0; }
        .rank-badge.rank-3 { color: #cd7f32; }
        
        .leaderboard-address-container {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }
        .leaderboard-address {
          font-family: monospace;
          font-size: 12px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .leaderboard-address:hover {
          background: rgba(255,255,255,0.1);
          padding: 4px 8px;
          border-radius: 6px;
        }
        
        .copy-address-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          position: relative;
        }
        .copy-address-btn:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }
        
        .copied-tooltip {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--glow-teal);
          color: #07111f;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
        }
        
        .leaderboard-earnings {
          font-weight: bold;
          color: var(--glow-teal);
        }
        .leaderboard-referrals {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .view-all-btn {
          width: 100%;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .view-full-board-btn {
          width: 100%;
          padding: 10px;
          border-radius: 12px;
          background: rgba(29, 233, 182, 0.15);
          border: 1px solid var(--glow-teal);
          color: white;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .view-full-board-btn:hover {
          background: rgba(29, 233, 182, 0.25);
        }
        
        /* Leaderboard Modal */
        .leaderboard-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .leaderboard-modal {
          background: var(--surface-1);
          border: 1px solid var(--border-strong);
          border-radius: 24px;
          padding: 24px;
          max-width: 800px;
          width: 90%;
          max-height: 80vh;
        }
        
        .leaderboard-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .leaderboard-modal-header h2 {
          margin: 0;
        }
        
        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-close-btn:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }
        
        .leaderboard-modal-content {
          max-height: 60vh;
          overflow-y: auto;
          padding-right: 8px;
        }
        
        .leaderboard-modal-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .leaderboard-modal-content::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
        }
        
        .leaderboard-modal-content::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        
        /* Refresh Button */
        .community-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .refresh-btn {
          padding: 8px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--border-soft);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .refresh-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
          border-color: var(--border-strong);
          color: white;
        }
        
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .refresh-btn .spinning {
          animation: spin 1s linear infinite;
        }
        
        /* Events */
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        /* Resources */
        .resources-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .resource-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          cursor: pointer;
          border: 1px solid var(--border-soft);
          color: var(--text-secondary);
          transition: transform var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
          text-decoration: none;
        }
        .resource-link:hover {
          transform: translateY(-1px);
          border-color: var(--border-strong);
          color: var(--text-primary);
          background: rgba(255,255,255,0.08);
        }
        .resource-icon { font-size: 20px; display: flex; align-items: center; }
        
        .social-links {
          text-align: center;
          margin-bottom: 20px;
        }
        .social-links h4 { margin-bottom: 12px; font-size: 14px; }
        .social-icons {
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        .social-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: var(--text-secondary);
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-soft);
          transition: transform var(--transition-fast), background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
        }
        .social-icon:hover {
          transform: translateY(-1px);
          color: var(--text-primary);
          background: rgba(255,255,255,0.08);
          border-color: var(--border-strong);
        }
        
        .newsletter-signup h4 {
          font-size: 14px;
          margin-bottom: 12px;
        }
        .newsletter-note {
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 8px;
          text-align: center;
        }
        
        .highlight-date {
          font-size: 10px;
          color: var(--text-secondary);
          display: block;
          margin-top: 6px;
        }
        
        .community-highlights__item {
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          margin-bottom: 12px;
          display: flex;
          gap: 12px;
        }
        .community-highlights__item.type-success { border-left: 3px solid var(--glow-teal); }
        .community-highlights__item.type-info { border-left: 3px solid var(--glow-blue); }
        .community-highlights__item.type-event { border-left: 3px solid #f59e0b; }
        .community-highlights__item.type-warning { border-left: 3px solid #ef4444; }
        .community-highlights__icon { font-size: 20px; }
        .community-highlights__title { font-size: 14px; margin-bottom: 4px; }
        .community-highlights__text { font-size: 12px; }
        
        .community-spotlight__card {
          padding: 16px;
          margin-bottom: 12px;
          border-radius: 16px;
        }
        .community-spotlight__label {
          display: block;
          font-size: 10px;
          margin-bottom: 8px;
        }
        .community-spotlight__value {
          display: block;
          font-size: 20px;
          margin-bottom: 8px;
        }
        .community-spotlight__text {
          font-size: 12px;
        }
        
        .small { font-size: 12px; }
        .muted-text { color: var(--text-secondary); }
        .soft-text { color: var(--text-secondary); }
        
        .community-hero__chip {
          gap: 8px;
        }
        
        .community-metrics__icon svg,
        .resource-icon svg {
          flex-shrink: 0;
        }
        
        @media (max-width: 768px) {
          .referral-stats-grid { grid-template-columns: 1fr; }
          .tree-levels-grid { grid-template-columns: repeat(2, 1fr); }
          .leaderboard-item { flex-wrap: wrap; }
          .resources-grid { grid-template-columns: 1fr; }
          .social-icons { flex-wrap: wrap; }
          .growth-chart { height: 140px; }
        }
      `}</style>
    </section>
  )
}

export default CommunityPage











// import './CommunityPage.css'
// import { useEffect, useMemo, useState, useCallback } from 'react'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { useSpace } from '../../context/SpaceContext'
// import { ethers } from 'ethers'
// import { fetchAddressReceiptsApi } from '../../Services/orbitsApi'
// import {
//   ArrowRight,
//   BadgeInfo,
//   BookOpen,
//   Copy,
//   Globe,
//   HelpCircle,
//   Megaphone,
//   MessageCircle,
//   Rocket,
//   Route,
//   ShieldCheck,
//   Trophy,
//   Users,
// } from 'lucide-react'
// import { FaFacebookF, FaInstagram } from 'react-icons/fa'
// import { FaXTwitter } from 'react-icons/fa6'
// import { PiTelegramLogoFill } from 'react-icons/pi'
// import {
//   FaChartLine,
//   FaCoins,
//   FaInfoCircle,
//   FaLink,
//   FaPeopleArrows,
//   FaShieldAlt,
//   FaStar,
//   FaSyncAlt,
//   FaWallet,
// } from 'react-icons/fa'

// // PATCH A — add API base helpers
// const API_BASE_URL ='http://localhost:5000'

// async function fetchJson(path, options = {}) {
//   const response = await fetch(`${API_BASE_URL}${path}`, {
//     headers: {
//       'Content-Type': 'application/json',
//       ...(options.headers || {}),
//     },
//     ...options,
//   })

//   const payload = await response.json().catch(() => null)

//   if (!response.ok) {
//     throw new Error(payload?.message || `Request failed: ${response.status}`)
//   }

//   return payload
// }

// // PATCH B — keep fallback constants but rename them
// const FALLBACK_SOCIAL_LINKS = [
//   {
//     id: 'telegram',
//     label: 'Telegram',
//     href: 'https://t.me/',
//     icon: PiTelegramLogoFill,
//   },
//   {
//     id: 'instagram',
//     label: 'Instagram',
//     href: 'https://instagram.com/',
//     icon: FaInstagram,
//   },
//   {
//     id: 'facebook',
//     label: 'Facebook',
//     href: 'https://facebook.com/',
//     icon: FaFacebookF,
//   },
//   {
//     id: 'x',
//     label: 'X',
//     href: 'https://x.com/',
//     icon: FaXTwitter,
//   },
// ]

// const FALLBACK_COMMUNITY_RESOURCES = [
//   {
//     id: 'faq',
//     label: 'FAQ',
//     icon: HelpCircle,
//     route: 'support',
//   },
//   {
//     id: 'tutorials',
//     label: 'Tutorials',
//     icon: BookOpen,
//     route: 'support',
//   },
//   {
//     id: 'support',
//     label: 'Support',
//     icon: MessageCircle,
//     route: 'support',
//   },
//   {
//     id: 'docs',
//     label: 'Docs',
//     icon: BadgeInfo,
//     route: 'support',
//   },
// ]

// const EMPTY_LEADERBOARD_STATE = {
//   status: 'unavailable',
//   items: [],
// }

// const EMPTY_ANNOUNCEMENT_STATE = {
//   status: 'unavailable',
//   items: [],
// }

// const CommunityPage = ({ onNavigate }) => {
//   const { isConnected, account, connect } = useWallet()
//   const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()
//   const { viewedAddress, isOwnSpace, mode } = useSpace()
//   const resolvedAddress = viewedAddress || account || ''

//   // Community Data States
//   const [totalParticipants, setTotalParticipants] = useState(0)
//   const [totalEarnedAllTime, setTotalEarnedAllTime] = useState('0')
//   const [userReferralCount, setUserReferralCount] = useState(0)
//   const [userCommission, setUserCommission] = useState('0')
//   const [downlineStats, setDownlineStats] = useState({ level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0, level10: 0 })
//   const [leaderboardData, setLeaderboardData] = useState([])
//   const [announcements, setAnnouncements] = useState([])
//   const [communityStats, setCommunityStats] = useState({
//     members: 0,
//     growthRate: '+0%',
//     regions: 0,
//     milestones: 0,
//     totalDistributed: '0'
//   })
//   const [referralLink, setReferralLink] = useState('')
//   const [copied, setCopied] = useState(false)
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())

//   // New states from patches
//   const [publicReadStats, setPublicReadStats] = useState({
//     totalParticipants: 0,
//     visibleCoreBalance: '0.00',
//     readLayerStatus: 'Waiting for sync',
//   })

//   const [memberSummary, setMemberSummary] = useState({
//     isRegistered: false,
//     referrer: '',
//     highestActiveLevel: 0,
//     activeLevelsCount: 0,
//     totalReceiptEarnings: '0.00',
//     fgtTotal: '0.00',
//     fgtrTotal: '0.00',
//   })

//   // PATCH C — expand state to hold live backend data
//   const [communityFeedStatus, setCommunityFeedStatus] = useState({
//     leaderboard: 'unavailable',
//     announcements: 'unavailable',
//     growth: 'unavailable',
//     events: 'unavailable',
//     regions: 'unavailable',
//     socialLinks: 'unavailable',
//     resources: 'unavailable',
//   })

//   const [leaderboardState, setLeaderboardState] = useState(EMPTY_LEADERBOARD_STATE)
//   const [announcementState, setAnnouncementState] = useState(EMPTY_ANNOUNCEMENT_STATE)
//   const [eventState, setEventState] = useState({
//     status: 'unavailable',
//     items: [],
//   })
//   const [socialLinkState, setSocialLinkState] = useState({
//     status: 'unavailable',
//     items: [],
//   })
//   const [resourceState, setResourceState] = useState({
//     status: 'unavailable',
//     items: [],
//   })
//   const [communityGrowth, setCommunityGrowth] = useState({
//     rangeDays: 14,
//     series: [],
//   })

//   // Helper functions
//   const formatUsdt = useCallback((value) => {
//     try {
//       return Number(ethers.formatUnits(value ?? 0, 6))
//     } catch {
//       return 0
//     }
//   }, [])

//   const shortAddress = useCallback((addr) => {
//     if (!addr || addr === ethers.ZeroAddress) return '—'
//     return `${addr.slice(0, 6)}...${addr.slice(-4)}`
//   }, [])

//   const formatToken = useCallback((value) => {
//     const numeric = Number(value)
//     if (!Number.isFinite(numeric)) return '0.00'
//     return numeric.toLocaleString(undefined, {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     })
//   }, [])

//   const formatWhole = useCallback((value) => {
//     const numeric = Number(value)
//     if (!Number.isFinite(numeric)) return '0'
//     return numeric.toLocaleString()
//   }, [])

//   const getSourceBadgeLabel = useCallback((status) => {
//     if (status === 'live') return 'Live'
//     if (status === 'indexed') return 'Indexed'
//     return 'Unavailable'
//   }, [])

//   const getSourceBadgeClass = useCallback((status) => {
//     if (status === 'live') return 'source-badge source-badge--live'
//     if (status === 'indexed') return 'source-badge source-badge--indexed'
//     return 'source-badge source-badge--unavailable'
//   }, [])

//   // Viewer helpers
//   const viewerLabel = useMemo(() => {
//     if (!resolvedAddress) return 'No active space'
//     return isOwnSpace ? 'Your space' : 'Visitor space'
//   }, [resolvedAddress, isOwnSpace])

//   const viewerAddressLabel = useMemo(() => {
//     if (!resolvedAddress) return '—'
//     return shortAddress(resolvedAddress)
//   }, [resolvedAddress, shortAddress])

//   const handleRoute = useCallback(
//     (route) => {
//       onNavigate?.(route)
//     },
//     [onNavigate]
//   )

//   // PATCH D — derived arrays for live content
//   const leaderboardItems = leaderboardState.items || []
//   const announcementItems = announcementState.items || []
//   const eventItems = eventState.items || []
//   const socialItems =
//     socialLinkState.items?.length
//       ? socialLinkState.items
//       : FALLBACK_SOCIAL_LINKS
//   const resourceItems =
//     resourceState.items?.length
//       ? resourceState.items
//       : FALLBACK_COMMUNITY_RESOURCES

//   // PATCH E — replace public summary fetch with backend route
//   const fetchPublicReadStats = useCallback(async () => {
//     try {
//       const payload = await fetchJson('/api/community/summary')
//       const data = payload?.data || {}
//       const publicData = data.public || {}
//       const feeds = data.feeds || {}

//       const totalParticipantsValue = Number(publicData.totalParticipants || 0)
//       const visibleCoreBalanceValue = publicData.visibleCoreBalanceUsdt || '0.00'
//       const readLayerStatusValue = publicData.readLayerStatus || 'Unavailable'

//       setTotalParticipants(totalParticipantsValue)
//       setPublicReadStats({
//         totalParticipants: totalParticipantsValue,
//         visibleCoreBalance: visibleCoreBalanceValue,
//         readLayerStatus: readLayerStatusValue,
//       })

//       setCommunityFeedStatus((prev) => ({
//         ...prev,
//         announcements: feeds.announcements || 'unavailable',
//         events: feeds.events || 'unavailable',
//         socialLinks: feeds.socialLinks || 'unavailable',
//         resources: feeds.resources || 'unavailable',
//         leaderboard: feeds.leaderboard || 'unavailable',
//         growth: feeds.growth || 'unavailable',
//       }))

//       setCommunityStats((prev) => ({
//         ...prev,
//         members: totalParticipantsValue,
//         totalDistributed: visibleCoreBalanceValue,
//       }))
//     } catch (err) {
//       console.error('Error fetching public read stats:', err)
//       setPublicReadStats((prev) => ({
//         ...prev,
//         readLayerStatus: 'Unavailable',
//       }))
//     }
//   }, [])

//   // PATCH F — replace member summary fetch with backend route
//   const fetchMemberSummary = useCallback(async () => {
//     if (!resolvedAddress) return

//     try {
//       const payload = await fetchJson(`/api/community/member/${resolvedAddress}/summary`)
//       const data = payload?.data || {}

//       setMemberSummary({
//         isRegistered: Boolean(data.isRegistered),
//         referrer: data.referrer || '',
//         highestActiveLevel: Number(data.highestActiveLevel || 0),
//         activeLevelsCount: Number(data.activeLevelsCount || 0),
//         totalReceiptEarnings: data.totalReceiptEarnings || '0.00',
//         fgtTotal: data.fgtTotal || '0.00',
//         fgtrTotal: data.fgtrTotal || '0.00',
//       })
//     } catch (err) {
//       console.error('Error fetching member summary:', err)
//     }
//   }, [resolvedAddress])

//   // PATCH G — replace referral stats fetch with backend route
//   const fetchUserReferralStats = useCallback(async () => {
//     if (!resolvedAddress) return

//     try {
//       if (!isOwnSpace) {
//         setUserReferralCount(0)
//         setUserCommission('0.00')
//         return
//       }

//       const payload = await fetchJson(`/api/community/member/${resolvedAddress}/referrals`)
//       const data = payload?.data || {}

//       setUserReferralCount(Number(data.totalReferrals || 0))
//       setUserCommission(data.commissionEarnedLiquid || '0.00')
//     } catch (err) {
//       console.error('Error fetching referral stats:', err)
//       setUserReferralCount(0)
//       setUserCommission('0.00')
//     }
//   }, [resolvedAddress, isOwnSpace])

//   // PATCH H — replace downline fetch with backend route
//   const fetchUserDownline = useCallback(async () => {
//     if (!resolvedAddress) return

//     try {
//       const payload = await fetchJson(`/api/community/member/${resolvedAddress}/downline`)
//       const data = payload?.data || {}

//       setDownlineStats({
//         level1: Number(data.level1 || 0),
//         level2: Number(data.level2 || 0),
//         level3: Number(data.level3 || 0),
//         level4: Number(data.level4 || 0),
//         level5: Number(data.level5 || 0),
//         level6: Number(data.level6 || 0),
//         level7: Number(data.level7 || 0),
//         level8: Number(data.level8 || 0),
//         level9: Number(data.level9 || 0),
//         level10: Number(data.level10 || 0),
//       })
//     } catch (err) {
//       console.error('Error fetching downline:', err)
//       setDownlineStats({
//         level1: 0,
//         level2: 0,
//         level3: 0,
//         level4: 0,
//         level5: 0,
//         level6: 0,
//         level7: 0,
//         level8: 0,
//         level9: 0,
//         level10: 0,
//       })
//     }
//   }, [resolvedAddress])

//   // PATCH Q — fix total earned all time source
//   const fetchTotalEarnedAllTime = useCallback(async () => {
//     try {
//       const payload = await fetchJson('/api/community/stats')
//       const data = payload?.data || {}
//       setTotalEarnedAllTime(data.totalLiquid || '0.00')
//     } catch (err) {
//       console.error('Error fetching total earned:', err)
//       setTotalEarnedAllTime('0.00')
//     }
//   }, [])

//   // PATCH I — replace leaderboard fetch with backend route
//   const fetchLeaderboard = useCallback(async () => {
//     try {
//       const payload = await fetchJson('/api/community/leaderboard?limit=10')
//       const items = Array.isArray(payload?.data) ? payload.data : []

//       setLeaderboardState({
//         status: items.length ? 'live' : 'unavailable',
//         items,
//       })

//       setCommunityFeedStatus((prev) => ({
//         ...prev,
//         leaderboard: items.length ? 'live' : 'unavailable',
//       }))
//     } catch (err) {
//       console.error('Error fetching leaderboard:', err)
//       setLeaderboardState({
//         status: 'error',
//         items: [],
//       })
//       setCommunityFeedStatus((prev) => ({
//         ...prev,
//         leaderboard: 'unavailable',
//       }))
//     }
//   }, [])

//   // PATCH J — replace announcements fetch with backend route
//   const fetchAnnouncements = useCallback(async () => {
//     try {
//       const payload = await fetchJson('/api/community/announcements')
//       const data = payload?.data || {}

//       setAnnouncementState({
//         status: data.status || 'unavailable',
//         items: Array.isArray(data.items) ? data.items : [],
//       })

//       setCommunityFeedStatus((prev) => ({
//         ...prev,
//         announcements: data.status || 'unavailable',
//       }))
//     } catch (err) {
//       console.error('Error fetching announcements:', err)
//       setAnnouncementState({
//         status: 'error',
//         items: [],
//       })
//     }
//   }, [])

//   // PATCH K — replace events fetch with backend route
//   const fetchCommunityEvents = useCallback(async () => {
//     try {
//       const payload = await fetchJson('/api/community/events')
//       const data = payload?.data || {}

//       setEventState({
//         status: data.status || 'unavailable',
//         items: Array.isArray(data.items) ? data.items : [],
//       })

//       setCommunityFeedStatus((prev) => ({
//         ...prev,
//         events: data.status || 'unavailable',
//       }))
//     } catch (err) {
//       console.error('Error fetching community events:', err)
//       setEventState({
//         status: 'error',
//         items: [],
//       })
//     }
//   }, [])

//   // PATCH L — add social links fetch
//   const fetchCommunitySocialLinks = useCallback(async () => {
//     try {
//       const payload = await fetchJson('/api/community/social-links')
//       const data = payload?.data || {}

//       setSocialLinkState({
//         status: data.status || 'unavailable',
//         items: Array.isArray(data.items) ? data.items : [],
//       })

//       setCommunityFeedStatus((prev) => ({
//         ...prev,
//         socialLinks: data.status || 'unavailable',
//       }))
//     } catch (err) {
//       console.error('Error fetching social links:', err)
//       setSocialLinkState({
//         status: 'error',
//         items: [],
//       })
//     }
//   }, [])

//   // PATCH M — add resources fetch
//   const fetchCommunityResources = useCallback(async () => {
//     try {
//       const payload = await fetchJson('/api/community/resources')
//       const data = payload?.data || {}

//       setResourceState({
//         status: data.status || 'unavailable',
//         items: Array.isArray(data.items) ? data.items : [],
//       })

//       setCommunityFeedStatus((prev) => ({
//         ...prev,
//         resources: data.status || 'unavailable',
//       }))
//     } catch (err) {
//       console.error('Error fetching resources:', err)
//       setResourceState({
//         status: 'error',
//         items: [],
//       })
//     }
//   }, [])

//   // PATCH N — replace growth fetch with backend route
//   const fetchCommunityGrowthStats = useCallback(async () => {
//     try {
//       const payload = await fetchJson('/api/community/growth?days=14')
//       const data = payload?.data || {}

//       setCommunityGrowth({
//         rangeDays: Number(data.rangeDays || 14),
//         series: Array.isArray(data.series) ? data.series : [],
//       })

//       const registrationsTotal = (data.series || []).reduce(
//         (sum, item) => sum + Number(item.registrations || 0),
//         0
//       )

//       setCommunityStats((prev) => ({
//         ...prev,
//         growthRate: registrationsTotal > 0 ? `+${registrationsTotal} recent joins` : 'No recent joins',
//       }))

//       setCommunityFeedStatus((prev) => ({
//         ...prev,
//         growth: 'live',
//       }))
//     } catch (err) {
//       console.error('Error fetching community growth stats:', err)
//       setCommunityGrowth({
//         rangeDays: 14,
//         series: [],
//       })
//       setCommunityFeedStatus((prev) => ({
//         ...prev,
//         growth: 'unavailable',
//       }))
//     }
//   }, [])

//   // Set referral link (only for own space)
//   useEffect(() => {
//     if (typeof window === 'undefined') return

//     if (isOwnSpace && account) {
//       setReferralLink(`${window.location.origin}/register?ref=${account}`)
//       return
//     }

//     setReferralLink('')
//   }, [account, isOwnSpace])

//   // Copy referral link to clipboard
//   const copyToClipboard = async () => {
//     if (!referralLink) return

//     try {
//       await navigator.clipboard.writeText(referralLink)
//       setCopied(true)
//       setTimeout(() => setCopied(false), 2000)
//     } catch (err) {
//       console.error('Failed to copy:', err)
//     }
//   }

//   // Load contracts and fetch data
//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   // Main data fetching effect
//   // PATCH O — fetch all new backend feeds in main effect
//   useEffect(() => {
//     if (contracts) {
//       fetchPublicReadStats()
//       fetchTotalEarnedAllTime()
//       fetchLeaderboard()
//       fetchAnnouncements()
//       fetchCommunityGrowthStats()
//       fetchCommunityEvents()
//       fetchCommunitySocialLinks()
//       fetchCommunityResources()
//     }

//     if (resolvedAddress) {
//       fetchMemberSummary()
//       fetchUserDownline()
//       fetchUserReferralStats()
//     }
//   }, [
//     contracts,
//     resolvedAddress,
//     fetchPublicReadStats,
//     fetchTotalEarnedAllTime,
//     fetchLeaderboard,
//     fetchAnnouncements,
//     fetchCommunityGrowthStats,
//     fetchCommunityEvents,
//     fetchCommunitySocialLinks,
//     fetchCommunityResources,
//     fetchMemberSummary,
//     fetchUserDownline,
//     fetchUserReferralStats,
//   ])

//   // Auto-refresh every 30 seconds
//   // PATCH P — improve auto refresh
//   useEffect(() => {
//     if (!contracts) return

//     const interval = setInterval(() => {
//       fetchPublicReadStats()
//       fetchLeaderboard()
//       fetchAnnouncements()
//       fetchCommunityEvents()
//       fetchCommunityGrowthStats()

//       if (resolvedAddress) {
//         fetchMemberSummary()
//         fetchUserDownline()
//         fetchUserReferralStats()
//       }

//       setLastUpdated(new Date().toLocaleTimeString())
//     }, 30000)

//     return () => clearInterval(interval)
//   }, [
//     contracts,
//     resolvedAddress,
//     fetchPublicReadStats,
//     fetchLeaderboard,
//     fetchAnnouncements,
//     fetchCommunityEvents,
//     fetchCommunityGrowthStats,
//     fetchMemberSummary,
//     fetchUserDownline,
//     fetchUserReferralStats,
//   ])

//   // Wallet guard with visitor mode support
//   if (!isConnected && !resolvedAddress) {
//     return (
//       <section className="community-page">
//         <div className="community-hero">
//           <div className="community-hero__content">
//             <div className="community-hero__eyebrow glass-panel">
//               <span className="community-hero__eyebrow-dot" />
//               <span className="community-hero__eyebrow-text">Join the Movement</span>
//             </div>
//             <div className="community-hero__text-block">
//               <h1 className="community-hero__title">Community</h1>
//               <p className="community-hero__description soft-text">
//                 Connect your wallet to access referral tools, view leaderboards, and track community growth.
//               </p>
//             </div>
//             <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
//           </div>
//           <div className="community-hero__visual glass-panel">
//             <div className="community-hero__visual-box">
//               <div style={{ textAlign: 'center' }}>
//                 <Users size={44} />
//                 <div>Connect to join the community</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>
//     )
//   }

//   if (contractsLoading) {
//     return (
//       <section className="community-page">
//         <div className="loading-container">
//           <div className="spinner"></div>
//           <p>Loading community data...</p>
//         </div>
//       </section>
//     )
//   }

//   return (
//     <section className="community-page">
//       {/* Hero Section */}
//       <div className="community-hero">
//         <div className="community-hero__content">
//           <div className="community-hero__eyebrow glass-panel">
//             <span className="community-hero__eyebrow-dot" />
//             <span className="community-hero__eyebrow-text">
//               Ecosystem visibility, participation, and momentum
//             </span>
//           </div>

//           <div className="community-hero__text-block">
//             <h1 className="community-hero__title">Community Hub</h1>
//             <p className="community-hero__description soft-text">
//               Connect, compete, and grow together in the FFN ecosystem. Track your referrals, monitor leaderboards, and celebrate community milestones.
//             </p>
//             <div className="small muted-text">
//               Last updated: {lastUpdated} • Viewing: {isOwnSpace ? 'your connected space' : 'public visitor space'}
//             </div>
//           </div>

//           <div className="community-hero__chips">
//             <span className="community-hero__chip glass-panel">
//               <Users size={14} />
//               <span>{formatWhole(publicReadStats.totalParticipants)} Members</span>
//             </span>

//             <span className="community-hero__chip glass-panel">
//               <Globe size={14} />
//               <span>{viewerLabel}</span>
//             </span>

//             <span className="community-hero__chip glass-panel">
//               <Route size={14} />
//               <span>{viewerAddressLabel}</span>
//             </span>
//           </div>
//         </div>

//         <div className="community-hero__visual glass-panel">
//           <div className="community-hero__visual-box">
//             <div className="hero-network-viz" aria-hidden="true">
//               <div className="hero-network-viz__ring hero-network-viz__ring--one" />
//               <div className="hero-network-viz__ring hero-network-viz__ring--two" />
//               <div className="hero-network-viz__ring hero-network-viz__ring--three" />

//               <div className="hero-network-viz__core">
//                 <Users size={22} />
//               </div>

//               <div className="hero-network-viz__orbit hero-network-viz__orbit--one">
//                 <span className="hero-network-viz__node hero-network-viz__node--one" />
//               </div>

//               <div className="hero-network-viz__orbit hero-network-viz__orbit--two">
//                 <span className="hero-network-viz__node hero-network-viz__node--two" />
//               </div>

//               <div className="hero-network-viz__orbit hero-network-viz__orbit--three">
//                 <span className="hero-network-viz__node hero-network-viz__node--three" />
//               </div>
//             </div>
//           </div>
//           <p className="community-hero__visual-note muted-text">
//             Public participation visibility improves as more live read-layer and backend community feeds are connected.
//           </p>
//         </div>
//       </div>

//       {/* Core Metrics */}
//       <section className="community-metrics glass-panel">
//         <div className="community-section-heading">
//           <span className="community-section-heading__eyebrow muted-text">
//             Public Snapshot
//           </span>
//           <h2 className="community-section-heading__title">
//             Core community indicators at a glance
//           </h2>
//         </div>

//         <div className="community-metrics__grid">
//           <div className="community-metrics__card glass-panel">
//             <span className="community-metrics__icon"><Users size={18} /></span>
//             <span className="community-metrics__label muted-text">Total Members</span>
//             <strong className="community-metrics__value">{formatWhole(publicReadStats.totalParticipants)}</strong>
//             <small className="data-source">Source: Live registration contract</small>
//           </div>

//           <div className="community-metrics__card glass-panel">
//             <span className="community-metrics__icon"><FaCoins size={18} /></span>
//             <span className="community-metrics__label muted-text">Visible Core Balance</span>
//             <strong className="community-metrics__value">{publicReadStats.visibleCoreBalance} USDT</strong>
//             <small className="data-source">Source: Escrow + orbit contract balances</small>
//           </div>

//           <div className="community-metrics__card glass-panel">
//             <span className="community-metrics__icon"><FaShieldAlt size={18} /></span>
//             <span className="community-metrics__label muted-text">Read Layer</span>
//             <strong className="community-metrics__value">{publicReadStats.readLayerStatus}</strong>
//             <small className="data-source">Source: Live contract reads</small>
//           </div>

//           <div className="community-metrics__card glass-panel">
//             <span className="community-metrics__icon"><Trophy size={18} /></span>
//             <span className="community-metrics__label muted-text">Community Feed</span>
//             <strong className="community-metrics__value">
//               {getSourceBadgeLabel(communityFeedStatus.leaderboard)}
//             </strong>
//             <div className={getSourceBadgeClass(communityFeedStatus.leaderboard)}>
//               {getSourceBadgeLabel(communityFeedStatus.leaderboard)}
//             </div>
//             <small className="data-source">Source: Backend/indexer required</small>
//           </div>
//         </div>
//       </section>

//       {/* Main Grid */}
//       <div className="community-main-grid">
//         <div className="community-main-grid__left">
          
//           {/* YOUR REFERRAL SECTION */}
//           <section className="community-referral glass-panel">
//             <div className="community-section-heading">
//               <span className="community-section-heading__eyebrow muted-text">
//                 Your Referral Arsenal
//               </span>
//               <h2 className="community-section-heading__title">
//                 Share, invite, and earn together
//               </h2>
//             </div>

//             {isOwnSpace ? (
//               <>
//                 <div className="referral-stats-grid">
//                   <div className="referral-stat">
//                     <span className="referral-stat-label">Total Referrals</span>
//                     <strong className="referral-stat-value">{userReferralCount}</strong>
//                   </div>

//                   <div className="referral-stat">
//                     <span className="referral-stat-label">Commission Earned</span>
//                     <strong className="referral-stat-value">${userCommission}</strong>
//                   </div>

//                   <div className="referral-stat">
//                     <span className="referral-stat-label">Conversion View</span>
//                     <strong className="referral-stat-value">
//                       ~{userReferralCount > 0 ? Math.floor((userReferralCount / (userReferralCount + 50)) * 100) : 0}%
//                     </strong>
//                   </div>
//                 </div>

//                 <div className="referral-link-container">
//                   <div className="referral-link-label">Your Unique Referral Link</div>
//                   <div className="referral-link-box">
//                     <input
//                       type="text"
//                       className="referral-link-input"
//                       value={referralLink}
//                       readOnly
//                     />
//                     <button className="copy-btn" onClick={copyToClipboard}>
//                       {copied ? (
//                         <>
//                           <ShieldCheck size={14} />
//                           <span>Copied</span>
//                         </>
//                       ) : (
//                         <>
//                           <Copy size={14} />
//                           <span>Copy</span>
//                         </>
//                       )}
//                     </button>
//                   </div>
//                   {copied ? (
//                     <div className="copy-success">Referral link copied successfully.</div>
//                   ) : null}
//                 </div>

//                 <div className="referral-tip">
//                   <Rocket size={16} />
//                   <span className="tip-text">
//                     Share your personal link to onboard new participants into your own space.
//                   </span>
//                 </div>
//               </>
//             ) : (
//               <div className="community-panel-empty glass-panel">
//                 <Globe size={18} />
//                 <div>
//                   <strong className="community-panel-empty__title">Visitor mode is active</strong>
//                   <p className="community-panel-empty__text soft-text">
//                     Referral tools are available only inside your own connected space.
//                   </p>
//                 </div>
//               </div>
//             )}

//             <small className="data-source">
//               Source: own-space referral tools only; visitor mode hides private invite actions.
//             </small>
//           </section>

//           {/* DOWNLINE / TEAM TREE */}
//           <section className="community-downline glass-panel">
//             <div className="community-section-heading">
//               <span className="community-section-heading__eyebrow muted-text">
//                 Your Network Tree
//               </span>
//               <h2 className="community-section-heading__title">
//                 Watch your team grow
//               </h2>
//             </div>

//             <div className="downline-tree">
//               <div className="tree-root">
//                 <div className="tree-node you">
//                   <span className="node-icon">👤</span>
//                   <span className="node-label">You</span>
//                   <span className="node-level">Level 0</span>
//                 </div>
//                 <div className="tree-children">
//                   <div className="tree-level">
//                     <div className="level-label">Level 1</div>
//                     <div className="level-count">{downlineStats.level1} members</div>
//                     <div className="level-progress"><div className="progress-fill" style={{ width: `${Math.min((downlineStats.level1 / 50) * 100, 100)}%` }} /></div>
//                   </div>
//                   <div className="tree-level">
//                     <div className="level-label">Level 2</div>
//                     <div className="level-count">{downlineStats.level2} members</div>
//                     <div className="level-progress"><div className="progress-fill" style={{ width: `${Math.min((downlineStats.level2 / 200) * 100, 100)}%` }} /></div>
//                   </div>
//                   <div className="tree-level">
//                     <div className="level-label">Level 3</div>
//                     <div className="level-count">{downlineStats.level3} members</div>
//                     <div className="level-progress"><div className="progress-fill" style={{ width: `${Math.min((downlineStats.level3 / 500) * 100, 100)}%` }} /></div>
//                   </div>
//                 </div>
//               </div>
//               {/* PATCH X — expand downline total calculation */}
//               <div className="tree-total">
//                 Visible Network Count: <strong>{
//                   downlineStats.level1 +
//                   downlineStats.level2 +
//                   downlineStats.level3 +
//                   downlineStats.level4 +
//                   (downlineStats.level5 || 0) +
//                   (downlineStats.level6 || 0) +
//                   (downlineStats.level7 || 0) +
//                   (downlineStats.level8 || 0) +
//                   (downlineStats.level9 || 0) +
//                   (downlineStats.level10 || 0)
//                 }</strong>
//               </div>
//             </div>
//             <small className="data-source">Source: Orbit snapshot API when available</small>
//           </section>

//           {/* PATCH S — make growth section real */}
//           <section className="community-growth glass-panel">
//             <div className="community-section-heading">
//               <span className="community-section-heading__eyebrow muted-text">
//                 Growth Overview
//               </span>
//               <h2 className="community-section-heading__title">
//                 Community movement and momentum
//               </h2>
//             </div>

//             {communityGrowth.series.length ? (
//               <>
//                 <div className="growth-chart">
//                   {communityGrowth.series.map((item) => {
//                     const registrations = Number(item.registrations || 0)
//                     const maxRegistrations = Math.max(
//                       ...communityGrowth.series.map((entry) => Number(entry.registrations || 0)),
//                       1
//                     )
//                     const height = `${Math.max((registrations / maxRegistrations) * 100, registrations > 0 ? 12 : 4)}%`

//                     return (
//                       <div
//                         key={item.date}
//                         className="chart-bar"
//                         style={{ height }}
//                         title={`${item.date} • ${registrations} registrations`}
//                       >
//                         <span>{item.date.slice(5)}</span>
//                       </div>
//                     )
//                   })}
//                 </div>

//                 <p className="chart-note">
//                   Registrations over the last {communityGrowth.rangeDays} days
//                 </p>
//               </>
//             ) : (
//               <div className="community-growth__chart community-empty-state">
//                 <div className="community-empty-state__icon">
//                   <FaChartLine size={24} />
//                 </div>
//                 <div className="community-empty-state__body">
//                   <strong>Growth history is not available yet</strong>
//                   <p className="chart-note">
//                     Growth data will appear here once indexed registration history is available.
//                   </p>
//                 </div>
//               </div>
//             )}

//             <p className="community-growth__note muted-text">
//               Source status: {getSourceBadgeLabel(communityFeedStatus.growth)}
//             </p>
//             <small className="data-source">Source: /api/community/growth</small>
//           </section>

//           {/* COMMUNITY HIGHLIGHTS */}
//           <section className="community-highlights glass-panel">
//             <div className="community-section-heading">
//               <span className="community-section-heading__eyebrow muted-text">
//                 Highlights
//               </span>
//               <h2 className="community-section-heading__title">
//                 Recent ecosystem moments
//               </h2>
//             </div>

//             <div className="community-highlights__list">
//               {announcementItems.length ? (
//                 announcementItems.map((announcement) => (
//                   <div key={announcement.id} className={`community-highlights__item type-${announcement.type || 'info'}`}>
//                     <span className="community-highlights__icon">
//                       <Megaphone size={18} />
//                     </span>
//                     <div>
//                       <h3 className="community-highlights__title">{announcement.title}</h3>
//                       <p className="community-highlights__text soft-text">{announcement.content}</p>
//                       <span className="highlight-date">{announcement.date}</span>
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 <div className="community-panel-empty glass-panel">
//                   <Megaphone size={18} />
//                   <div>
//                     <strong className="community-panel-empty__title">Announcement feed not connected yet</strong>
//                     <p className="community-panel-empty__text soft-text">
//                       This section is ready for CMS or backend announcement publishing.
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>
//             <small className="data-source">
//               Source: backend/CMS announcement adapter {announcementState.status === 'unavailable' ? '(not connected)' : ''}
//             </small>
//           </section>
//         </div>

//         <div className="community-main-grid__right">
          
//           {/* GLOBAL LEADERBOARD */}
//           <section className="community-leaderboard glass-panel">
//             <div className="community-section-heading">
//               <span className="community-section-heading__eyebrow muted-text">
//                 Global Leaderboard
//               </span>
//               <h2 className="community-section-heading__title">
//                 Top earners & referrers
//               </h2>
//             </div>

//             <div className="leaderboard-tabs">
//               <button className="leaderboard-tab active">Top Earners</button>
//               <button className="leaderboard-tab" disabled>Top Referrers</button>
//               <button className="leaderboard-tab" disabled>Most Active</button>
//             </div>

//             <div className="leaderboard-list">
//               {leaderboardItems.length ? (
//                 leaderboardItems.map((entry) => (
//                   <div key={entry.rank} className="leaderboard-item">
//                     <div className={`rank-badge rank-${entry.rank}`}>#{entry.rank}</div>
//                     <div className="leaderboard-address">{shortAddress(entry.address)}</div>
//                     {/* PATCH R — fix leaderboard rendering field names */}
//                     <div className="leaderboard-earnings">${formatToken(entry.totalEarned || 0)}</div>
//                     <div className="leaderboard-referrals">
//                       {entry.receiptCount || 0} receipts
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 <div className="community-panel-empty glass-panel">
//                   <Trophy size={18} />
//                   <div>
//                     <strong className="community-panel-empty__title">Leaderboard feed not connected yet</strong>
//                     <p className="community-panel-empty__text soft-text">
//                       This panel is ready for backend aggregation once leaderboard services are enabled.
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="leaderboard-footer">
//               <button className="view-all-btn" onClick={() => handleRoute('support')}>
//                 <span>Open support</span>
//                 <ArrowRight size={14} />
//               </button>
//             </div>
//             <small className="data-source">
//               Source: backend leaderboard adapter {leaderboardState.status === 'unavailable' ? '(not connected)' : ''}
//             </small>
//           </section>

//           {/* ANNOUNCEMENTS / EVENTS */}
//           <section className="community-events glass-panel">
//             <div className="community-section-heading">
//               <span className="community-section-heading__eyebrow muted-text">
//                 Upcoming Events
//               </span>
//               <h2 className="community-section-heading__title">
//                 Don't miss out
//               </h2>
//             </div>

//             {/* PATCH T — make events section real */}
//             <div className="events-list">
//               {eventItems.length ? (
//                 eventItems.map((eventItem) => (
//                   <div key={eventItem._id || eventItem.id} className="community-highlights__item type-event">
//                     <span className="community-highlights__icon">
//                       <FaStar size={18} />
//                     </span>
//                     <div>
//                       <h3 className="community-highlights__title">{eventItem.title}</h3>
//                       <p className="community-highlights__text soft-text">
//                         {eventItem.content || 'Upcoming community event'}
//                       </p>
//                       <span className="highlight-date">{eventItem.date}</span>

//                       {eventItem.ctaUrl ? (
//                         <div style={{ marginTop: '10px' }}>
//                           <a
//                             href={eventItem.ctaUrl}
//                             target="_blank"
//                             rel="noreferrer"
//                             className="view-all-btn"
//                             style={{ textDecoration: 'none' }}
//                           >
//                             <span>{eventItem.ctaLabel || 'Open event'}</span>
//                             <ArrowRight size={14} />
//                           </a>
//                         </div>
//                       ) : null}
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 <div className="community-empty-state">
//                   <div className="community-empty-state__icon">
//                     <FaStar size={24} />
//                   </div>
//                   <div className="community-empty-state__body">
//                     <strong>No scheduled community events yet</strong>
//                     <p className="soft-text">
//                       Upcoming AMAs, contests, launches, and community sessions will appear here once the events feed is connected.
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>
//             <small className="data-source">
//               Source: /api/community/events {eventState.status === 'unavailable' ? '(not connected)' : ''}
//             </small>
//           </section>

//           {/* COMMUNITY SPOTLIGHT */}
//           <section className="community-spotlight glass-panel">
//             <div className="community-section-heading">
//               <span className="community-section-heading__eyebrow muted-text">
//                 Spotlight
//               </span>
//               <h2 className="community-section-heading__title">
//                 Community achievements
//               </h2>
//             </div>

//             <div className="community-spotlight__card glass-panel">
//               <span className="community-spotlight__label muted-text">Milestone</span>
//               <strong className="community-spotlight__value">{formatWhole(publicReadStats.totalParticipants)} Members</strong>
//               <p className="community-spotlight__text soft-text">
//                 Total registered participants currently visible from the live registration contract.
//               </p>
//             </div>

//             <div className="community-spotlight__card glass-panel">
//               <span className="community-spotlight__label muted-text">Member Progress</span>
//               <strong className="community-spotlight__value">Level {memberSummary.highestActiveLevel || 0}</strong>
//               <p className="community-spotlight__text soft-text">
//                 Your highest active level currently visible from the live registration contract.
//               </p>
//             </div>

//             {/* PATCH W — improve spotlight with backend totals */}
//             <div className="community-spotlight__card glass-panel">
//               <span className="community-spotlight__label muted-text">Token Snapshot</span>
//               <strong className="community-spotlight__value">{memberSummary.fgtTotal} FGT</strong>
//               <p className="community-spotlight__text soft-text">
//                 FGTr: {memberSummary.fgtrTotal} • Receipt earnings: ${memberSummary.totalReceiptEarnings}
//               </p>
//             </div>
//           </section>

//           {/* SUPPORT & RESOURCES / SOCIAL LINKS */}
//           <section className="community-resources glass-panel">
//             <div className="community-section-heading">
//               <span className="community-section-heading__eyebrow muted-text">
//                 Resources & Support
//               </span>
//               <h2 className="community-section-heading__title">
//                 Get help and stay connected
//               </h2>
//             </div>

//             {/* PATCH U — make resources section real */}
//             <div className="resources-grid">
//               {resourceItems.map((item) => {
//                 const Icon = item.icon
//                 const ResolvedIcon =
//                   typeof Icon === 'function'
//                     ? Icon
//                     : item.key === 'faq'
//                       ? HelpCircle
//                       : item.key === 'tutorials'
//                         ? BookOpen
//                         : item.key === 'support'
//                           ? MessageCircle
//                           : BadgeInfo

//                 const isExternal = Boolean(item.href)

//                 return isExternal ? (
//                   <a
//                     key={item._id || item.id || item.key}
//                     href={item.href}
//                     className="resource-link"
//                     target="_blank"
//                     rel="noreferrer"
//                   >
//                     <span className="resource-icon">
//                       <ResolvedIcon size={18} />
//                     </span>
//                     <span>{item.label}</span>
//                   </a>
//                 ) : (
//                   <button
//                     key={item._id || item.id || item.key}
//                     type="button"
//                     className="resource-link"
//                     onClick={() => handleRoute(item.route || 'support')}
//                   >
//                     <span className="resource-icon">
//                       <ResolvedIcon size={18} />
//                     </span>
//                     <span>{item.label}</span>
//                   </button>
//                 )
//               })}
//             </div>

//             <div className="social-links">
//               <h4>Follow us</h4>
//               <div className="social-icons">
//                 {/* PATCH V — make social links section real */}
//                 {socialItems.map((item) => {
//                   const Icon =
//                     item.icon === 'telegram'
//                       ? PiTelegramLogoFill
//                       : item.icon === 'instagram'
//                         ? FaInstagram
//                         : item.icon === 'facebook'
//                           ? FaFacebookF
//                           : FaXTwitter
//                   return (
//                     <a
//                       key={item._id || item.id || item.key}
//                       href={item.href}
//                       className="social-icon"
//                       target="_blank"
//                       rel="noreferrer"
//                       aria-label={item.label}
//                     >
//                       <Icon size={18} />
//                     </a>
//                   )
//                 })}
//               </div>
//             </div>

//             <div className="newsletter-signup">
//               <h4>Community Updates</h4>
//               <div className="community-empty-state community-empty-state--compact">
//                 <div className="community-empty-state__body">
//                   <strong>Newsletter signup is not connected yet</strong>
//                   <p className="newsletter-note">
//                     Add your backend email endpoint before enabling subscriptions here.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </section>
//         </div>
//       </div>

//       <style>{`
//         .spinner {
//           width: 40px;
//           height: 40px;
//           border: 3px solid rgba(77, 163, 255, 0.2);
//           border-top-color: var(--glow-blue);
//           border-radius: 50%;
//           animation: spin 0.8s linear infinite;
//           margin: 0 auto 16px;
//         }
//         @keyframes spin {
//           to { transform: rotate(360deg); }
//         }
        
//         .loading-container {
//           text-align: center;
//           padding: 60px;
//         }
        
//         .connect-wallet-btn {
//           padding: 12px 28px;
//           border-radius: 12px;
//           background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//           color: #07111f;
//           font-weight: bold;
//           border: none;
//           cursor: pointer;
//           font-size: 16px;
//           width: fit-content;
//         }
        
//         .data-source {
//           font-size: 9px;
//           color: rgba(255,255,255,0.3);
//           margin-top: 12px;
//           display: block;
//           text-align: right;
//         }
        
//         .copy-success {
//           margin-top: 12px;
//           padding: 10px;
//           background: rgba(29, 233, 182, 0.15);
//           border: 1px solid var(--glow-teal);
//           border-radius: 10px;
//           font-size: 12px;
//           color: var(--glow-teal);
//           text-align: center;
//         }
        
//         /* Hero Network Visualization */
//         .hero-network-viz {
//           position: relative;
//           width: min(100%, 280px);
//           height: 220px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//         }

//         .hero-network-viz__ring,
//         .hero-network-viz__orbit {
//           position: absolute;
//           inset: 50% auto auto 50%;
//           transform: translate(-50%, -50%);
//           border-radius: 999px;
//         }

//         .hero-network-viz__ring {
//           border: 1px solid rgba(255, 255, 255, 0.14);
//           background: radial-gradient(circle, rgba(255,255,255,0.025), transparent 72%);
//         }

//         .hero-network-viz__ring--one {
//           width: 82px;
//           height: 82px;
//         }

//         .hero-network-viz__ring--two {
//           width: 136px;
//           height: 136px;
//         }

//         .hero-network-viz__ring--three {
//           width: 196px;
//           height: 196px;
//         }

//         .hero-network-viz__core {
//           position: relative;
//           z-index: 2;
//           width: 58px;
//           height: 58px;
//           border-radius: 18px;
//           display: inline-flex;
//           align-items: center;
//           justify-content: center;
//           color: var(--text-primary);
//           background:
//             linear-gradient(135deg, rgba(29, 233, 182, 0.24), rgba(77, 163, 255, 0.22));
//           border: 1px solid var(--border-strong);
//           box-shadow: 0 12px 34px rgba(77, 163, 255, 0.18);
//         }

//         .hero-network-viz__orbit--one {
//           width: 82px;
//           height: 82px;
//           animation: communityOrbitSpin 7s linear infinite;
//         }

//         .hero-network-viz__orbit--two {
//           width: 136px;
//           height: 136px;
//           animation: communityOrbitSpin 10s linear infinite;
//         }

//         .hero-network-viz__orbit--three {
//           width: 196px;
//           height: 196px;
//           animation: communityOrbitSpin 13s linear infinite;
//         }

//         .hero-network-viz__node {
//           position: absolute;
//           top: -5px;
//           left: 50%;
//           width: 10px;
//           height: 10px;
//           margin-left: -5px;
//           border-radius: 999px;
//           background: linear-gradient(135deg, var(--glow-teal), var(--glow-blue));
//           box-shadow:
//             0 0 16px rgba(77, 163, 255, 0.4),
//             0 0 24px rgba(29, 233, 182, 0.2);
//         }

//         @keyframes communityOrbitSpin {
//           from {
//             transform: translate(-50%, -50%) rotate(0deg);
//           }
//           to {
//             transform: translate(-50%, -50%) rotate(360deg);
//           }
//         }

//         @media (prefers-reduced-motion: reduce) {
//           .hero-network-viz__orbit {
//             animation: none;
//           }
//         }
        
//         /* Source Badges */
//         .source-badge {
//           min-height: 26px;
//           padding: 0 10px;
//           border-radius: 999px;
//           display: inline-flex;
//           align-items: center;
//           font-size: 11px;
//           font-weight: 700;
//         }

//         .source-badge--live {
//           color: #07111f;
//           background: linear-gradient(135deg, var(--glow-teal), var(--glow-blue));
//         }

//         .source-badge--indexed {
//           color: white;
//           background: rgba(77, 163, 255, 0.18);
//           border: 1px solid rgba(77, 163, 255, 0.3);
//         }

//         .source-badge--unavailable {
//           color: var(--text-secondary);
//           background: rgba(255,255,255,0.08);
//           border: 1px solid rgba(255,255,255,0.12);
//         }

//         /* Empty States */
//         .community-empty-state {
//           min-height: 180px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           gap: 14px;
//           padding: 18px;
//           text-align: left;
//           border-radius: 18px;
//           background: rgba(255,255,255,0.04);
//           border: 1px dashed var(--border-strong);
//         }

//         .community-empty-state--compact {
//           min-height: auto;
//           text-align: center;
//         }

//         .community-empty-state__icon {
//           width: 48px;
//           height: 48px;
//           border-radius: 16px;
//           display: inline-flex;
//           align-items: center;
//           justify-content: center;
//           background: rgba(255,255,255,0.06);
//           border: 1px solid rgba(255,255,255,0.12);
//           font-size: 18px;
//           flex-shrink: 0;
//         }

//         .community-empty-state__body {
//           display: flex;
//           flex-direction: column;
//           gap: 6px;
//         }

//         /* Panel Empty */
//         .community-panel-empty {
//           padding: 16px;
//           display: flex;
//           align-items: flex-start;
//           gap: 12px;
//           background: var(--surface-1);
//           border: 1px solid var(--border-soft);
//           border-radius: 16px;
//         }

//         .community-panel-empty__title {
//           display: block;
//           font-size: 14px;
//           line-height: 1.2;
//           color: var(--text-primary);
//           margin-bottom: 6px;
//         }

//         .community-panel-empty__text {
//           font-size: 13px;
//           line-height: 1.6;
//         }

//         /* Referral Section */
//         .referral-stats-grid {
//           display: grid;
//           grid-template-columns: repeat(3, 1fr);
//           gap: 16px;
//           margin-bottom: 20px;
//         }
//         .referral-stat {
//           text-align: center;
//           padding: 12px;
//           background: rgba(255,255,255,0.05);
//           border-radius: 16px;
//         }
//         .referral-stat-label {
//           display: block;
//           font-size: 11px;
//           color: var(--text-secondary);
//           margin-bottom: 8px;
//         }
//         .referral-stat-value {
//           font-size: 24px;
//           font-weight: bold;
//           color: var(--glow-teal);
//         }
//         .referral-link-container {
//           margin-bottom: 16px;
//         }
//         .referral-link-label {
//           font-size: 12px;
//           margin-bottom: 8px;
//           color: var(--text-secondary);
//         }
//         .referral-link-box {
//           display: flex;
//           gap: 8px;
//         }
//         .referral-link-input {
//           flex: 1;
//           padding: 12px;
//           border-radius: 12px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           font-family: monospace;
//           font-size: 12px;
//         }
//         .copy-btn {
//           padding: 12px 20px;
//           border-radius: 12px;
//           border: none;
//           cursor: pointer;
//           font-weight: bold;
//           background: var(--glow-teal);
//           color: #07111f;
//           display: inline-flex;
//           align-items: center;
//           gap: 8px;
//         }
//         .referral-tip {
//           background: rgba(29, 233, 182, 0.1);
//           padding: 12px;
//           border-radius: 12px;
//           display: flex;
//           gap: 10px;
//           align-items: center;
//         }
//         .tip-icon { font-size: 18px; }
//         .tip-text { font-size: 12px; color: var(--text-secondary); }
        
//         /* Downline Tree */
//         .downline-tree {
//           padding: 16px;
//           background: rgba(0,0,0,0.2);
//           border-radius: 20px;
//         }
//         .tree-root {
//           text-align: center;
//         }
//         .tree-node.you {
//           display: inline-flex;
//           flex-direction: column;
//           align-items: center;
//           padding: 12px 20px;
//           background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//           border-radius: 20px;
//           margin-bottom: 20px;
//         }
//         .node-icon { font-size: 20px; }
//         .node-label { font-weight: bold; margin: 4px 0; }
//         .node-level { font-size: 10px; opacity: 0.8; }
//         .tree-children {
//           display: flex;
//           justify-content: space-around;
//           gap: 16px;
//           flex-wrap: wrap;
//         }
//         .tree-level {
//           flex: 1;
//           text-align: center;
//           padding: 12px;
//           background: rgba(255,255,255,0.05);
//           border-radius: 16px;
//         }
//         .level-label { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; font-weight: bold; }
//         .level-count { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
//         .level-progress { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
//         .level-progress .progress-fill { height: 100%; background: var(--glow-teal); width: 0%; }
//         .tree-total { text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
        
//         /* Growth Chart */
//         .chart-note {
//           text-align: center;
//           font-size: 11px;
//           color: var(--text-secondary);
//           margin-top: 8px;
//         }
        
//         .growth-chart {
//           display: flex;
//           align-items: flex-end;
//           justify-content: center;
//           gap: 8px;
//           height: 180px;
//           padding: 16px 0;
//         }
        
//         .chart-bar {
//           flex: 1;
//           max-width: 40px;
//           background: linear-gradient(180deg, var(--glow-teal) 0%, var(--glow-blue) 100%);
//           border-radius: 6px 6px 4px 4px;
//           min-height: 4px;
//           transition: height 0.3s ease;
//           display: flex;
//           align-items: flex-end;
//           justify-content: center;
//           position: relative;
//         }
        
//         .chart-bar span {
//           position: absolute;
//           bottom: -22px;
//           font-size: 10px;
//           color: var(--text-secondary);
//           transform: rotate(-45deg);
//           white-space: nowrap;
//         }
        
//         /* Leaderboard */
//         .leaderboard-tabs {
//           display: flex;
//           gap: 8px;
//           margin-bottom: 16px;
//           border-bottom: 1px solid rgba(255,255,255,0.1);
//           padding-bottom: 12px;
//         }
//         .leaderboard-tab {
//           padding: 8px 16px;
//           border-radius: 30px;
//           background: transparent;
//           border: none;
//           color: var(--text-secondary);
//           cursor: pointer;
//           font-size: 12px;
//         }
//         .leaderboard-tab.active {
//           background: var(--glow-teal);
//           color: #07111f;
//         }
//         .leaderboard-tab:disabled {
//           opacity: 0.5;
//           cursor: not-allowed;
//         }
//         .leaderboard-list {
//           display: flex;
//           flex-direction: column;
//           gap: 12px;
//           margin-bottom: 16px;
//         }
//         .leaderboard-item {
//           display: flex;
//           align-items: center;
//           gap: 12px;
//           padding: 10px;
//           background: rgba(255,255,255,0.05);
//           border-radius: 12px;
//         }
//         .rank-badge {
//           width: 40px;
//           text-align: center;
//           font-weight: bold;
//         }
//         .rank-badge.rank-1 { color: #ffd700; }
//         .rank-badge.rank-2 { color: #c0c0c0; }
//         .rank-badge.rank-3 { color: #cd7f32; }
//         .leaderboard-address {
//           flex: 1;
//           font-family: monospace;
//           font-size: 12px;
//         }
//         .leaderboard-earnings {
//           font-weight: bold;
//           color: var(--glow-teal);
//         }
//         .leaderboard-referrals {
//           font-size: 11px;
//           color: var(--text-secondary);
//         }
//         .view-all-btn {
//           width: 100%;
//           padding: 10px;
//           border-radius: 12px;
//           background: rgba(255,255,255,0.1);
//           border: none;
//           color: white;
//           cursor: pointer;
//           display: inline-flex;
//           align-items: center;
//           justify-content: center;
//           gap: 8px;
//         }
        
//         /* Events */
//         .events-list {
//           display: flex;
//           flex-direction: column;
//           gap: 16px;
//         }
        
//         /* Resources */
//         .resources-grid {
//           display: grid;
//           grid-template-columns: repeat(2, 1fr);
//           gap: 12px;
//           margin-bottom: 20px;
//         }
//         .resource-link {
//           display: flex;
//           align-items: center;
//           gap: 12px;
//           padding: 12px;
//           background: rgba(255,255,255,0.05);
//           border-radius: 12px;
//           cursor: pointer;
//           border: 1px solid var(--border-soft);
//           color: var(--text-secondary);
//           transition: transform var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
//           text-decoration: none;
//         }
//         .resource-link:hover {
//           transform: translateY(-1px);
//           border-color: var(--border-strong);
//           color: var(--text-primary);
//           background: rgba(255,255,255,0.08);
//         }
//         .resource-icon { font-size: 20px; display: flex; align-items: center; }
        
//         .social-links {
//           text-align: center;
//           margin-bottom: 20px;
//         }
//         .social-links h4 { margin-bottom: 12px; font-size: 14px; }
//         .social-icons {
//           display: flex;
//           justify-content: center;
//           gap: 16px;
//         }
//         .social-icon {
//           width: 42px;
//           height: 42px;
//           border-radius: 14px;
//           display: inline-flex;
//           align-items: center;
//           justify-content: center;
//           text-decoration: none;
//           color: var(--text-secondary);
//           background: rgba(255,255,255,0.05);
//           border: 1px solid var(--border-soft);
//           transition: transform var(--transition-fast), background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
//         }
//         .social-icon:hover {
//           transform: translateY(-1px);
//           color: var(--text-primary);
//           background: rgba(255,255,255,0.08);
//           border-color: var(--border-strong);
//         }
        
//         .newsletter-signup h4 {
//           font-size: 14px;
//           margin-bottom: 12px;
//         }
//         .newsletter-note {
//           font-size: 10px;
//           color: var(--text-secondary);
//           margin-top: 8px;
//           text-align: center;
//         }
        
//         .highlight-date {
//           font-size: 10px;
//           color: var(--text-secondary);
//           display: block;
//           margin-top: 6px;
//         }
        
//         .community-highlights__item {
//           padding: 12px;
//           background: rgba(255,255,255,0.05);
//           border-radius: 12px;
//           margin-bottom: 12px;
//           display: flex;
//           gap: 12px;
//         }
//         .community-highlights__item.type-success { border-left: 3px solid var(--glow-teal); }
//         .community-highlights__item.type-info { border-left: 3px solid var(--glow-blue); }
//         .community-highlights__item.type-event { border-left: 3px solid #f59e0b; }
//         .community-highlights__item.type-warning { border-left: 3px solid #ef4444; }
//         .community-highlights__icon { font-size: 20px; }
//         .community-highlights__title { font-size: 14px; margin-bottom: 4px; }
//         .community-highlights__text { font-size: 12px; }
        
//         .community-spotlight__card {
//           padding: 16px;
//           margin-bottom: 12px;
//           border-radius: 16px;
//         }
//         .community-spotlight__label {
//           display: block;
//           font-size: 10px;
//           margin-bottom: 8px;
//         }
//         .community-spotlight__value {
//           display: block;
//           font-size: 20px;
//           margin-bottom: 8px;
//         }
//         .community-spotlight__text {
//           font-size: 12px;
//         }
        
//         .small { font-size: 12px; }
//         .muted-text { color: var(--text-secondary); }
//         .soft-text { color: var(--text-secondary); }
        
//         .community-hero__chip {
//           gap: 8px;
//         }
        
//         .community-metrics__icon svg,
//         .resource-icon svg {
//           flex-shrink: 0;
//         }
        
//         @media (max-width: 768px) {
//           .referral-stats-grid { grid-template-columns: 1fr; }
//           .tree-children { flex-direction: column; }
//           .leaderboard-item { flex-wrap: wrap; }
//           .resources-grid { grid-template-columns: 1fr; }
//           .social-icons { flex-wrap: wrap; }
//           .growth-chart { height: 140px; }
//         }
//       `}</style>
//     </section>
//   )
// }

// export default CommunityPage