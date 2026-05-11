import './CommunityPage.css'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { useWallet } from '../../hooks/useWallet'
import { useSpace } from '../../context/SpaceContext'
import { ethers } from 'ethers'
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
  RefreshCw,
  X,
  Orbit,
  TrendingUp,
  DollarSign,
  Activity,
  ChevronRight,
  Network,
  Leaf,
} from 'lucide-react'
import { FaFacebookF, FaInstagram, FaDiscord } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { PiTelegramLogoFill } from 'react-icons/pi'
import {
  FaChartLine,
  FaCoins,
  FaShieldAlt,
  FaStar,
  FaMedal,
  FaCrown,
  FaAward,
  FaWallet,
} from 'react-icons/fa'
import { MdEmojiEvents } from 'react-icons/md'
import { GiLaurelCrown, GiTrophyCup } from 'react-icons/gi'

const API_BASE_URL = 'https://fin-freedom-backend-3.onrender.com'

const HERO_SLIDES = [
  {
    id: 1,
    images: {
      dark: '/images/community/community-hero-1-dark.png',
      light: '/images/community/community-hero-1-light.png',
      mobileDark: '/images/community/community-hero-1-mobile-dark.png',
      mobileLight: '/images/community/community-hero-1-mobile-light.png',
    },
    titleTop: 'FIN FREEDOM',
    titleMain: 'NETWORK COMMUNITY',
    tagline: 'Connect. Participate. Grow Together.',
    description:
      'A global community built on structure, participation, and shared progress.',
  },
  {
    id: 2,
    images: {
      dark: '/images/community/community-hero-2-dark.png',
      light: '/images/community/community-hero-2-light.png',
      mobileDark: '/images/community/community-hero-2-mobile-dark.png',
      mobileLight: '/images/community/community-hero-2-mobile-light.png',
    },
    titleTop: 'REAL PARTICIPATION',
    titleMain: 'REAL GROWTH',
    tagline: 'Engage. Contribute. Earn Together.',
    description:
      'Monitor real participation, track growth, and explore the live ecosystem.',
  },
]

const HERO_FEATURES = [
  { icon: Users, title: 'Global Community', text: 'Uniting people worldwide' },
  { icon: Network, title: 'Connect', text: 'Build meaningful relationships' },
  { icon: TrendingUp, title: 'Participate', text: 'Engage and contribute' },
  { icon: Leaf, title: 'Grow', text: 'Learn and achieve more' },
  { icon: Globe, title: 'Together', text: 'Stronger together' },
]

function HeroSlide({ slide, active }) {
  return (
    <div className={`community-hero__slide ${active ? 'is-active' : ''}`}>
      <picture className="community-hero__picture community-hero__picture--dark">
        <source media="(max-width: 640px)" srcSet={slide.images.mobileDark} />
        <img src={slide.images.dark} alt="" className="community-hero__image" />
      </picture>

      <picture className="community-hero__picture community-hero__picture--light">
        <source media="(max-width: 640px)" srcSet={slide.images.mobileLight} />
        <img src={slide.images.light} alt="" className="community-hero__image" />
      </picture>
    </div>
  )
}

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

const FALLBACK_SOCIAL_LINKS = [
  { id: 'telegram', key: 'telegram', label: 'Telegram', href: 'https://t.me/', icon: 'telegram' },
  { id: 'discord', key: 'discord', label: 'Discord', href: 'https://discord.gg/', icon: 'discord' },
  { id: 'x', key: 'x', label: 'X', href: 'https://x.com/', icon: 'x' },
]

const FALLBACK_COMMUNITY_RESOURCES = [
  { id: 'faq', key: 'faq', label: 'FAQ', route: 'support' },
  { id: 'tutorials', key: 'tutorials', label: 'Tutorials', route: 'support' },
  { id: 'support', key: 'support', label: 'Support', route: 'support' },
  { id: 'docs', key: 'docs', label: 'Documentation', route: 'support' },
]

const EMPTY_LEADERBOARD_STATE = { status: 'unavailable', items: [] }
const EMPTY_ANNOUNCEMENT_STATE = { status: 'unavailable', items: [] }

const LEADERBOARD_TABS = [
  { id: 'topEarners', label: 'Top Earners', icon: DollarSign },
  { id: 'topReferrers', label: 'Top Referrers', icon: Users },
  { id: 'mostActive', label: 'Most Active', icon: Activity },
]

const DOWNLINE_LEVEL_KEYS = Array.from({ length: 10 }, (_, index) => `level${index + 1}`)

const TOKEN_IMAGES = {
  fgt: '/images/fgt-token.png',
  fgtr: '/images/fgtr-token.png',
}

const ECOSYSTEM_PROGRAMS = [
  {
    id: 'fFreedom',
    title: 'F-Freedom Program',
    status: 'Live',
    icon: Users,
    type: 'live',
  },
  {
    id: 'freedomPlus',
    title: 'Freedom-Plus Program',
    status: 'Coming Soon',
    icon: Rocket,
    type: 'soon',
  },
  {
    id: 'freedomNft',
    title: 'Freedom NFT Program',
    status: 'Coming Soon',
    icon: ShieldCheck,
    type: 'soon',
  },
  {
    id: 'finFreedomCoin',
    title: 'Fin Freedom Coin',
    status: 'Coming Soon',
    icon: FaCoins,
    type: 'soon',
  },
  {
    id: 'marketplace',
    title: 'FFN Marketplace',
    status: 'Coming Soon',
    icon: Globe,
    type: 'soon',
  },
  {
    id: 'institute',
    title: 'Fin Freedom Institute',
    status: 'Coming Soon',
    icon: BookOpen,
    type: 'soon',
  },
]

// Medal components for top 3 ranks - static colors preserved
const RankMedal = ({ rank }) => {
  if (rank === 1) return <FaCrown size={16} style={{ color: '#FFD700', filter: 'drop-shadow(0 2px 4px rgba(255,215,0,0.3))' }} />
  if (rank === 2) return <FaMedal size={16} style={{ color: '#C0C0C0', filter: 'drop-shadow(0 2px 4px rgba(192,192,192,0.3))' }} />
  if (rank === 3) return <FaAward size={16} style={{ color: '#CD7F32', filter: 'drop-shadow(0 2px 4px rgba(205,127,50,0.3))' }} />
  return <span className="rank-number">#{rank}</span>
}

function resolveSocialIcon(icon) {
  if (icon === 'telegram') return PiTelegramLogoFill
  if (icon === 'instagram') return FaInstagram
  if (icon === 'facebook') return FaFacebookF
  if (icon === 'discord') return FaDiscord
  return FaXTwitter
}

function resolveResourceIcon(key) {
  if (key === 'faq') return HelpCircle
  if (key === 'tutorials') return BookOpen
  if (key === 'support') return MessageCircle
  return BadgeInfo
}

function CommunitySection({ eyebrow, title, text, children, className = '', aos = 'fade-up' }) {
  const aosProps = aos ? { 'data-aos': aos } : {}

  return (
    <div className={`community-section-block ${className}`} {...aosProps}>
      <header className="community-section-title" data-aos="fade-up">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </header>

      {children}
    </div>
  )
}

const CommunityPage = ({ onNavigate }) => {
  const navigate = useNavigate()

  const pageToPathMap = {
    home: '/home',
    about: '/about',
    dashboard: '/dashboard',
    fFreedomProgram: '/f-freedom-program',
    activation: '/activation',
    orbits: '/orbits',
    community: '/community',
    support: '/support',
    account: '/account',
    preferences: '/preferences',
    security: '/security',
    activity: '/activity',
    admin: '/admin',
  }

  const { isConnected, account, connect } = useWallet()
  const { viewedAddress, isOwnSpace, switchToSelf, switchToVisitor } = useSpace()

  const resolvedAddress = viewedAddress || account || ''

  const [activeSlide, setActiveSlide] = useState(0)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [isJoinPromptOpen, setIsJoinPromptOpen] = useState(false)
  const [hasDismissedJoinPrompt, setHasDismissedJoinPrompt] = useState(false)
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true)
  const [userReferralCount, setUserReferralCount] = useState(0)
  const [userCommission, setUserCommission] = useState('0.00')
  const [downlineStats, setDownlineStats] = useState({
    level1: 0, level2: 0, level3: 0, level4: 0, level5: 0,
    level6: 0, level7: 0, level8: 0, level9: 0, level10: 0,
  })
  const [downlineEarnings, setDownlineEarnings] = useState({})
  const [currentCycle, setCurrentCycle] = useState(1)
  const [referralLink, setReferralLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState('topEarners')
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false)
  const [profileInput, setProfileInput] = useState('')
  const [profileError, setProfileError] = useState('')
  

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

  const [communityFeedStatus, setCommunityFeedStatus] = useState({
    leaderboard: 'unavailable',
    announcements: 'unavailable',
    growth: 'unavailable',
    events: 'unavailable',
    socialLinks: 'unavailable',
    resources: 'unavailable',
  })

  const [leaderboardState, setLeaderboardState] = useState(EMPTY_LEADERBOARD_STATE)
  const [announcementState, setAnnouncementState] = useState(EMPTY_ANNOUNCEMENT_STATE)
  const [eventState, setEventState] = useState({ status: 'unavailable', items: [] })
  const [socialLinkState, setSocialLinkState] = useState({ status: 'unavailable', items: [] })
  const [resourceState, setResourceState] = useState({ status: 'unavailable', items: [] })
  const [communityGrowth, setCommunityGrowth] = useState({ rangeDays: 14, series: [] })
  const [communityGlobalStats, setCommunityGlobalStats] = useState({
    totalUsers: 0,
    totalReceipts: 0,
    totalLiquid: '0.00',
    totalGross: '0.00',
    totalEscrow: '0.00',
  })

  const [topReferrersData, setTopReferrersData] = useState([])
  const [mostActiveData, setMostActiveData] = useState([])
  const [isLoadingTabData, setIsLoadingTabData] = useState(false)
  const [orbitNetwork, setOrbitNetwork] = useState({})
  const [nftBalance, setNftBalance] = useState('0.00')
  const [opsBalance, setOpsBalance] = useState('0.00')
  const [escrowBalance, setEscrowBalance] = useState('0.00')
  const [liveParticipantCount, setLiveParticipantCount] = useState(0)

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

  const shortAddress = useCallback((addr) => {
    if (!addr || addr === ethers.ZeroAddress) return '—'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }, [])

  const viewerLabel = useMemo(() => {
    if (!resolvedAddress) return 'No active space'
    return isOwnSpace ? 'Your connected space' : 'Visitor space'
  }, [resolvedAddress, isOwnSpace])

  const viewerAddressLabel = useMemo(() => {
    if (!resolvedAddress) return '—'
    return shortAddress(resolvedAddress)
  }, [resolvedAddress, shortAddress])

  const leaderboardItems = leaderboardState.items || []
  const announcementItems = announcementState.items || []
  const eventItems = eventState.items || []
  const socialItems = socialLinkState.items?.length ? socialLinkState.items : FALLBACK_SOCIAL_LINKS
  const resourceItems = resourceState.items?.length ? resourceState.items : FALLBACK_COMMUNITY_RESOURCES

  const totalVisibleNetwork = useMemo(() => {
    return DOWNLINE_LEVEL_KEYS.reduce((sum, key) => sum + Number(downlineStats[key] || 0), 0)
  }, [downlineStats])

  const currentUserLower = (resolvedAddress || '').toLowerCase()

  const leaderboardDataByTab = useMemo(() => {
    if (activeLeaderboardTab === 'topReferrers') {
      if (topReferrersData.length > 0) {
        return topReferrersData
      }
      const base = Array.isArray(leaderboardItems) ? leaderboardItems : []
      return base.map((item, index) => ({
        ...item,
        rank: index + 1,
        totalReferrals: item.receiptCount || 0,
        commissionEarned: item.totalEarned || '0.00'
      }))
    }
    
    if (activeLeaderboardTab === 'mostActive') {
      if (mostActiveData.length > 0) {
        return mostActiveData
      }
      const base = Array.isArray(leaderboardItems) ? leaderboardItems : []
      return base.map((item, index) => ({
        ...item,
        rank: index + 1,
        receiptCount: item.receiptCount || 0,
        totalVolume: item.totalGross || '0.00'
      }))
    }
    
    const base = Array.isArray(leaderboardItems) ? leaderboardItems : []
    return base.map((item, index) => ({
      ...item,
      rank: index + 1
    }))
  }, [activeLeaderboardTab, leaderboardItems, topReferrersData, mostActiveData])

  const SYSTEM_WALLETS = [
    '0x884e48f9897E8633238747b608DD49dE12bF94df'.toLowerCase(),
  ]

  const isSystemWallet =
    resolvedAddress &&
    SYSTEM_WALLETS.includes(resolvedAddress.toLowerCase())

  const isRegisteredUser =
    Boolean(memberSummary?.isRegistered) || isSystemWallet

  const shouldShowPrivateMoneyMetrics =
    !isCheckingRegistration && isRegisteredUser

  const shouldShowPublicOnlyMetrics =
    isCheckingRegistration || !isRegisteredUser

  const canShowJoinPrompt = !isCheckingRegistration && !isRegisteredUser

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    AOS.init({
      duration: 900,
      easing: 'ease-in-out-cubic',
      once: false,
      mirror: true,
      offset: 90,
    })
  }, [])

  useEffect(() => {
    if (isCheckingRegistration) return

    if (!isRegisteredUser && !hasDismissedJoinPrompt) {
      setIsJoinPromptOpen(true)
    }

    if (isRegisteredUser) {
      setIsJoinPromptOpen(false)
      setHasDismissedJoinPrompt(false)
    }
  }, [isCheckingRegistration, isRegisteredUser, hasDismissedJoinPrompt])

  const handleRoute = useCallback((route, section) => {
    if (onNavigate) {
      onNavigate(route, section)
      return
    }

    const nextPath = pageToPathMap[route] || '/home'
    navigate(nextPath)

    if (section) {
      window.setTimeout(() => {
        document.getElementById(section)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 160)
    }
  }, [navigate, onNavigate])

  const copyText = useCallback(async (value, type = 'generic') => {
    try {
      await navigator.clipboard.writeText(value)
      if (type === 'referral') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      if (type === 'address') {
        setCopiedAddress(value)
        setTimeout(() => setCopiedAddress(''), 2000)
      }
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }, [])

  const handleViewProfile = useCallback(() => {
    const nextValue = profileInput.trim()

    if (!nextValue) {
      setProfileError('Enter a wallet address to view a public profile.')
      return
    }

    if (!ethers.isAddress(nextValue)) {
      setProfileError('Enter a valid wallet address.')
      return
    }

    setProfileError('')
    switchToVisitor?.(nextValue)
    setProfileModalOpen(false)
  }, [profileInput, switchToVisitor])

  const handleReturnToMyProfile = useCallback(() => {
    setProfileError('')
    setProfileInput('')
    switchToSelf?.()
  }, [switchToSelf])

  const fetchPublicReadStats = useCallback(async () => {
    try {
      const [summaryPayload, statsPayload] = await Promise.all([
        fetchJson('/api/community/summary'),
        fetchJson('/api/community/stats').catch(() => ({ data: {} })),
      ])

      const data = summaryPayload?.data || {}
      const publicData = data.public || {}
      const feeds = data.feeds || {}
      const statsData = statsPayload?.data || {}

      const totalParticipantsValue =
        Number(publicData.totalParticipants || 0) ||
        Number(statsData.totalUsers || 0) ||
        0

      const visibleCoreBalanceValue =
        publicData.visibleCoreBalanceUsdt ||
        statsData.totalLiquid ||
        '0.00'

      const readLayerStatusValue = publicData.readLayerStatus || 'Syncing'

      setPublicReadStats({
        totalParticipants: totalParticipantsValue,
        visibleCoreBalance: visibleCoreBalanceValue,
        readLayerStatus: readLayerStatusValue,
      })

      setCommunityGlobalStats({
        totalUsers: Number(statsData.totalUsers || 0),
        totalReceipts: Number(statsData.totalReceipts || 0),
        totalLiquid: statsData.totalLiquid || '0.00',
        totalGross: statsData.totalGross || '0.00',
        totalEscrow: statsData.totalEscrow || '0.00',
      })

      setEscrowBalance(
        statsData.totalEscrow ??
        publicData.totalEscrow ??
        publicData.escrow ??
        publicData.escrowBalance ??
        publicData.escrowBalanceUsdt ??
        '0.00'
      )
      // Set NFT and Operations from public data
      setNftBalance(
        publicData.nftPool ??
        publicData.nftPoolBalance ??
        publicData.nftPoolBalanceUsdt ??
        '0.00'
      )

      setOpsBalance(
        publicData.operations ??
        publicData.operationsBalance ??
        publicData.operationsBalanceUsdt ??
        publicData.opsBalance ??
        '0.00'
      )

      setCommunityFeedStatus((prev) => ({
        ...prev,
        announcements: feeds.announcements || 'unavailable',
        events: feeds.events || 'unavailable',
        socialLinks: feeds.socialLinks || 'unavailable',
        resources: feeds.resources || 'unavailable',
        leaderboard: feeds.leaderboard || 'live',
        growth: feeds.growth || 'live',
      }))
    } catch (err) {
      console.error('Error fetching public read stats:', err)
    }
  }, [])

  const fetchMemberSummary = useCallback(async () => {
    if (!resolvedAddress) {
      setIsCheckingRegistration(false)
      return
    }

    setIsCheckingRegistration(true)

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
    } finally {
      setIsCheckingRegistration(false)
    }
  }, [resolvedAddress])

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

  const fetchUserDownline = useCallback(async () => {
    if (!resolvedAddress) return
    try {
      const payload = await fetchJson(`/api/community/member/${resolvedAddress}/orbit-network`)
      const data = payload?.data || {}
      const levels = data.levels || {}
      setOrbitNetwork(levels)

      setDownlineStats({
        level1: Number(levels.level1?.totalMembersAcrossCycles || 0),
        level2: Number(levels.level2?.totalMembersAcrossCycles || 0),
        level3: Number(levels.level3?.totalMembersAcrossCycles || 0),
        level4: Number(levels.level4?.totalMembersAcrossCycles || 0),
        level5: Number(levels.level5?.totalMembersAcrossCycles || 0),
        level6: Number(levels.level6?.totalMembersAcrossCycles || 0),
        level7: Number(levels.level7?.totalMembersAcrossCycles || 0),
        level8: Number(levels.level8?.totalMembersAcrossCycles || 0),
        level9: Number(levels.level9?.totalMembersAcrossCycles || 0),
        level10: Number(levels.level10?.totalMembersAcrossCycles || 0),
      })

      setDownlineEarnings({})
      setCurrentCycle(Number(levels.level1?.latestCycle || 1))
    } catch (err) {
      console.error('Error fetching downline:', err)
      setDownlineEarnings({})
    }
  }, [resolvedAddress])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/leaderboard?limit=50')
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
      setLeaderboardState({ status: 'error', items: [] })
    }
  }, [])

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
      setAnnouncementState({ status: 'error', items: [] })
    }
  }, [])

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
      setEventState({ status: 'error', items: [] })
    }
  }, [])

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
      setSocialLinkState({ status: 'error', items: [] })
    }
  }, [])

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
      setResourceState({ status: 'error', items: [] })
    }
  }, [])

  const fetchCommunityGrowthStats = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/growth?days=14')
      const data = payload?.data || {}
      setCommunityGrowth({
        rangeDays: Number(data.rangeDays || 14),
        series: Array.isArray(data.series) ? data.series : [],
      })
      setCommunityFeedStatus((prev) => ({
        ...prev,
        growth: 'live',
      }))
    } catch (err) {
      console.error('Error fetching community growth stats:', err)
      setCommunityGrowth({ rangeDays: 14, series: [] })
      setCommunityFeedStatus((prev) => ({
        ...prev,
        growth: 'unavailable',
      }))
    }
  }, [])

  const fetchTopReferrers = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/top-referrers?limit=50')
      const data = Array.isArray(payload?.data) ? payload.data : []
      setTopReferrersData(data)
      return data
    } catch (err) {
      console.error('Error fetching top referrers:', err)
      return []
    }
  }, [])

  const fetchMostActive = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/community/most-active?limit=50&days=30')
      const data = Array.isArray(payload?.data) ? payload.data : []
      setMostActiveData(data)
      return data
    } catch (err) {
      console.error('Error fetching most active:', err)
      return []
    }
  }, [])

  const refreshAnnouncements = useCallback(() => {
    fetchAnnouncements()
    setLastUpdated(new Date().toLocaleTimeString())
  }, [fetchAnnouncements])

  const refreshEvents = useCallback(() => {
    fetchCommunityEvents()
    setLastUpdated(new Date().toLocaleTimeString())
  }, [fetchCommunityEvents])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isOwnSpace && account) {
      setReferralLink(`${window.location.origin}/register?ref=${account}`)
      return
    }
    setReferralLink('')
  }, [account, isOwnSpace])

  useEffect(() => {
    fetchPublicReadStats()
    fetchLeaderboard()
    fetchAnnouncements()
    fetchCommunityEvents()
    fetchCommunityGrowthStats()
    fetchCommunitySocialLinks()
    fetchCommunityResources()

    if (resolvedAddress) {
      fetchMemberSummary()
      fetchUserDownline()
      fetchUserReferralStats()
    }
  }, [
    fetchPublicReadStats,
    fetchLeaderboard,
    fetchAnnouncements,
    fetchCommunityEvents,
    fetchCommunityGrowthStats,
    fetchCommunitySocialLinks,
    fetchCommunityResources,
    fetchMemberSummary,
    fetchUserDownline,
    fetchUserReferralStats,
    resolvedAddress,
  ])

  useEffect(() => {
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
    fetchPublicReadStats,
    fetchLeaderboard,
    fetchAnnouncements,
    fetchCommunityEvents,
    fetchCommunityGrowthStats,
    fetchMemberSummary,
    fetchUserDownline,
    fetchUserReferralStats,
    resolvedAddress,
  ])

  useEffect(() => {
    AOS.refresh()
  }, [
    publicReadStats.totalParticipants,
    communityGlobalStats.totalGross,
    communityGlobalStats.totalLiquid,
    communityGlobalStats.totalEscrow,
    nftBalance,
    opsBalance,
    leaderboardDataByTab.length,
    communityGrowth.series.length,
  ])

  useEffect(() => {
    const loadTabData = async () => {
      setIsLoadingTabData(true)
      
      if (activeLeaderboardTab === 'topReferrers' && topReferrersData.length === 0) {
        await fetchTopReferrers()
      } else if (activeLeaderboardTab === 'mostActive' && mostActiveData.length === 0) {
        await fetchMostActive()
      }
      
      setIsLoadingTabData(false)
    }
    
    loadTabData()
  }, [activeLeaderboardTab, fetchTopReferrers, fetchMostActive, topReferrersData.length, mostActiveData.length])

  return (
    <section className="community-page community-page--refined">
      <section className="community-hero community-hero--poster">
        <div className="community-hero__slider" aria-hidden="true">
          {HERO_SLIDES.map((slide, index) => (
            <HeroSlide key={slide.id} slide={slide} active={index === activeSlide} />
          ))}
        </div>

        <div className="community-hero__poster-content">
          <div className="community-hero__brandline">
            Fin Freedom <span>Network</span>
          </div>

          <h1 className="community-hero__poster-title">
            <span>FIN FREEDOM</span>
            <strong>NETWORK</strong>
            <em>COMMUNITY</em>
          </h1>

          <p className="community-hero__poster-tagline">
            Connect. <span>Participate.</span> Grow Together.
          </p>

          <p className="community-hero__poster-description">
            A global community built on structure, participation, and <span>shared progress.</span>
          </p>

          <div className="community-hero__poster-features">
            {HERO_FEATURES.map(({ icon: Icon, title, text }, index) => (
              <article
                key={title}
                className={`community-hero-feature community-hero-feature--${index + 1}`}
                data-aos="zoom-in-up"
                data-aos-delay={String(index * 100)}
              >
                <div className="community-hero-feature__icon">
                  <Icon size={28} />
                </div>
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="community-hero__poster-strip">
            One Community. One Vision. Limitless Freedom.
          </div>
        </div>
      </section>

      <button
        type="button"
        className="community-lookup-tool"
        onClick={() => setProfileModalOpen(true)}
        aria-label="Search for any member of the community"
      >
        <span className="community-lookup-tool__icon">?</span>
        <span className="community-lookup-tool__label">Look up tool</span>
      </button>

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="community-profile-modal-backdrop" onClick={() => setProfileModalOpen(false)}>
          <div className="community-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="community-profile-switcher glass-panel">
              <div className="community-profile-switcher__head">
                <div>
                  <span className="community-profile-switcher__label muted-text">
                    Profile switcher
                  </span>
                  <p className="community-profile-switcher__note soft-text">
                    Enter a wallet address to view a public community profile.
                  </p>
                </div>
              </div>

              <div className="community-profile-switcher__row">
                <div className="community-profile-switcher__input-wrap">
                  <Globe size={16} />
                  <input
                    type="text"
                    className="community-profile-switcher__input"
                    value={profileInput}
                    onChange={(event) => setProfileInput(event.target.value)}
                    placeholder="Enter wallet address"
                  />
                </div>

                <button
                  type="button"
                  className="community-profile-switcher__submit"
                  onClick={handleViewProfile}
                >
                  View Profile
                </button>
              </div>

              {profileError ? (
                <p className="community-profile-switcher__error">{profileError}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Join Prompt Modal */}
      {canShowJoinPrompt && isJoinPromptOpen ? (
        <div
          className="community-join-modal-backdrop"
          onClick={() => {
            setIsJoinPromptOpen(false)
            setHasDismissedJoinPrompt(true)
          }}
        >
          <div
            className="community-join-modal glass-panel"
            onClick={(event) => event.stopPropagation()}
            data-aos="zoom-in"
          >
            <button
              type="button"
              className="community-join-modal__close"
              onClick={() => {
                setIsJoinPromptOpen(false)
                setHasDismissedJoinPrompt(true)
              }}
              aria-label="Close join prompt"
            >
              <X size={16} />
            </button>

            <span className="community-join-modal__eyebrow">Community access</span>

            <h2>It seems you are not registered yet</h2>

            <p>
              To join the community experience, enter through the F-Freedom Program.
              You can activate your route now or learn more before continuing.
            </p>

            <div className="community-join-modal__actions">
              <button type="button" onClick={() => handleRoute('activation')}>
                Join F-Freedom Program
                <ArrowRight size={16} />
              </button>

              <button type="button" onClick={() => handleRoute('fFreedomProgram')}>
                Learn More
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canShowJoinPrompt && hasDismissedJoinPrompt ? (
        <button
          type="button"
          className="community-join-info-fab"
          onClick={() => setIsJoinPromptOpen(true)}
          aria-label="Open community join information"
        >
          <BadgeInfo size={22} />
        </button>
      ) : null}

      <CommunitySection
        eyebrow="Ecosystem Snapshot"
        title="Live community signals"
        text="Live dashboard-aligned metrics from the F-Freedom contract layer."
        className="community-ecosystem-programs-section"
      >
        <div
          className={`community-metrics__grid ${
            shouldShowPublicOnlyMetrics ? 'community-metrics__grid--public-only' : ''
          }`}
        >
          <div className="community-metrics__card glass-panel community-metrics__card--participants" data-aos="fade-right" data-aos-delay="0">
            <div className="community-metrics__icon">
              <Users size={18} />
            </div>

            <span className="community-metrics__label muted-text">
              F-Freedom Participants
            </span>

            <strong className="community-metrics__value gradient-text-teal">
              {formatWhole(liveParticipantCount || publicReadStats.totalParticipants || communityGlobalStats.totalUsers)}
            </strong>

            {shouldShowPublicOnlyMetrics && (
              <div className="community-metrics__join-cta">
                <p className="muted-text">
                  Join the community to unlock full ecosystem metrics and insights.
                </p>

                <button
                  type="button"
                  className="connect-wallet-btn"
                  onClick={() => handleRoute('activation')}
                >
                  Join Community
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>

          {shouldShowPrivateMoneyMetrics ? (
            <>
              <div className="community-metrics__card glass-panel" data-aos="fade-right" data-aos-delay="90">
                <div className="community-metrics__icon">
                  <FaCoins size={18} />
                </div>
                <span className="community-metrics__label muted-text">Indexed F-Freedom Payouts</span>
                <strong className="community-metrics__value gradient-text-blue">
                  ${formatToken(communityGlobalStats.totalGross || communityGlobalStats.totalLiquid || 0)}
                </strong>
              </div>

              <div className="community-metrics__card glass-panel" data-aos="fade-right" data-aos-delay="180">
                <span className="community-metrics__icon">
                  <ShieldCheck size={18} />
                </span>
                <span className="community-metrics__label muted-text">Indexed Escrow Balance</span>
                <strong className="community-metrics__value gradient-text-gold">
                  ${formatToken(escrowBalance)}
                </strong>
              </div>

              <div className="community-metrics__card glass-panel" data-aos="fade-right" data-aos-delay="270">
                <div className="community-metrics__icon">
                  <FaShieldAlt size={18} />
                </div>
                <span className="community-metrics__label muted-text">Live NFT Pool Balance</span>
                <strong className="community-metrics__value gradient-text-gold">
                  ${formatToken(nftBalance)}
                </strong>
              </div>

              <div className="community-metrics__card glass-panel" data-aos="fade-right" data-aos-delay="360">
                <div className="community-metrics__icon">
                  <FaWallet size={18} />
                </div>
                <span className="community-metrics__label muted-text">Live Operations Balance</span>
                <strong className="community-metrics__value gradient-text-blue">
                  ${formatToken(opsBalance)}
                </strong>
              </div>
            </>
          ) : null}
        </div>
      </CommunitySection>

      <CommunitySection
        eyebrow="Public Dashboard"
        title="Growth and community activity"
        text="Track participation movement and active contributors."
        className="community-public-dashboard-wide"
      >
        <div className="community-dashboard-card community-dashboard-card--wide glass-panel">
          <section className="community-growth">
            {communityGrowth.series.length ? (
              <>
                <div className="growth-chart">
                  {communityGrowth.series.map((item, idx) => {
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
                        title={`${item.date} • ${registrations} registrations • ${item.earningsLiquid || '0.00'} USDT`}
                        data-aos="zoom-in"
                        data-aos-delay={idx * 30}
                      >
                        <span>{item.date.slice(5)}</span>
                      </div>
                    )
                  })}
                </div>

                <p className="chart-note">
                  Daily registrations over the last {communityGrowth.rangeDays} days
                </p>
              </>
            ) : (
              <div className="community-growth__chart community-empty-state">
                <div className="community-empty-state__icon">
                  <FaChartLine size={24} style={{ color: 'var(--glow-teal)' }} />
                </div>
                <div className="community-empty-state__body">
                  <strong>Growth history is initializing</strong>
                  <p className="chart-note">This view will populate as fresh growth data is indexed.</p>
                </div>
              </div>
            )}
          </section>

          <section className="community-leaderboard">
            <div className="leaderboard-tabs">
              {LEADERBOARD_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button type="button"
                    key={tab.id}
                    className={`leaderboard-tab ${activeLeaderboardTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveLeaderboardTab(tab.id)}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {isLoadingTabData && (
              <div className="leaderboard-loading">
                <div className="spinner-small"></div>
                <span>Loading data...</span>
              </div>
            )}

            <div className="leaderboard-list">
              {leaderboardDataByTab.length ? (
                leaderboardDataByTab.slice(0, 10).map((entry, idx) => {
                  const isViewer = currentUserLower && currentUserLower === String(entry.address || '').toLowerCase()
                  const fullAddress = entry.address || ''
                  return (
                    <div
                      key={`${activeLeaderboardTab}-${entry.rank}-${fullAddress}`}
                      className={`leaderboard-item ${isViewer ? 'leaderboard-item--viewer' : ''}`}
                      data-aos="fade-right"
                      data-aos-delay={idx * 40}
                    >
                      <div className={`rank-badge rank-${entry.rank}`}>
                        <RankMedal rank={entry.rank} />
                      </div>
                      <div className="leaderboard-address-wrap">
                        <div className="leaderboard-address">{shortAddress(fullAddress)}</div>
                        <div className="leaderboard-address-hover">
                          <span className="leaderboard-address-full">{fullAddress}</span>
                          <button
                            type="button"
                            className="leaderboard-copy-btn"
                            onClick={() => copyText(fullAddress, 'address')}
                          >
                            {copiedAddress === fullAddress ? <ShieldCheck size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                      <div className="leaderboard-earnings">
                        {activeLeaderboardTab === 'topEarners' && `$${formatToken(entry.totalEarned || 0)}`}
                        {activeLeaderboardTab === 'topReferrers' && formatWhole(entry.totalReferrals || 0)}
                        {activeLeaderboardTab === 'mostActive' && formatWhole(entry.receiptCount || 0)}
                      </div>
                      <div className="leaderboard-referrals">
                        {activeLeaderboardTab === 'topEarners' && `${entry.receiptCount || 0} receipts`}
                        {activeLeaderboardTab === 'topReferrers' && `$${formatToken(entry.commissionEarned || 0)} earned`}
                        {activeLeaderboardTab === 'mostActive' && `$${formatToken(entry.totalVolume || entry.totalEarned || 0)} volume`}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="community-panel-empty glass-panel">
                  <GiTrophyCup size={18} style={{ color: '#FFD700' }} />
                  <div>
                    <strong className="community-panel-empty__title">Leaderboard loading</strong>
                    <p className="community-panel-empty__text soft-text">
                      The leaderboard will populate as indexed activity becomes available.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {leaderboardDataByTab.length > 0 && (
              <div className="leaderboard-footer">
                <button type="button" className="view-all-btn" onClick={() => setIsLeaderboardModalOpen(true)}>
                  <span>View Full Board ({leaderboardDataByTab.length} total)</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </section>
        </div>
      </CommunitySection>

      {canShowJoinPrompt ? (
        <section className="community-inline-join-card glass-panel" data-aos="fade-up">
          <BadgeInfo size={24} />
          <div>
            <h2>Join the community through F-Freedom</h2>
            <p>
              Public community signals are visible. Full referral, downline, token,
              events, and resource tools unlock after registration.
            </p>
          </div>

          <div className="community-inline-join-card__actions">
            <button type="button" onClick={() => handleRoute('activation')}>
              Join Program
            </button>
            <button type="button" onClick={() => handleRoute('fFreedomProgram')}>
              Learn More
            </button>
          </div>
        </section>
      ) : (
        <>
          <CommunitySection
            eyebrow="Member Dashboard"
            title="Your community space"
            text="Referral tools, downline visibility, and account-linked activity."
            className="community-member-dashboard-section"
            aos=""
          >
            <div className="community-final-dashboard-shell">
              <section className="community-final-card community-final-events">
                <div className="events-list">
                  {eventItems.length ? (
                    eventItems.map((eventItem) => (
                      <div key={eventItem._id || eventItem.id || eventItem.title} className="community-highlights__item type-event">
                        <span className="community-highlights__icon">
                          <MdEmojiEvents size={18} style={{ color: '#f59e0b' }} />
                        </span>
                        <div>
                          <h3 className="community-highlights__title">{eventItem.title}</h3>
                          <p className="community-highlights__text soft-text">
                            {eventItem.content || 'Upcoming community event'}
                          </p>
                          <span className="highlight-date">{eventItem.date}</span>
                          {eventItem.ctaUrl && (
                            <div style={{ marginTop: '10px' }}>
                              <a href={eventItem.ctaUrl} target="_blank" rel="noreferrer" className="view-all-btn" style={{ textDecoration: 'none' }}>
                                <span>{eventItem.ctaLabel || 'Open event'}</span>
                                <ArrowRight size={14} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="community-empty-state">
                      <div className="community-empty-state__icon">
                        <MdEmojiEvents size={24} style={{ color: '#f59e0b' }} />
                      </div>
                      <div className="community-empty-state__body">
                        <strong>No scheduled events yet</strong>
                        <p className="soft-text">
                          Check back soon for AMAs, contests, and official community sessions.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="community-final-card community-final-resources">
                <div className="resources-grid">
                  {resourceItems.map((item) => {
                    const ResolvedIcon = resolveResourceIcon(item.key)
                    const isExternal = Boolean(item.href)
                    return isExternal ? (
                      <a key={item._id || item.id || item.key} href={item.href} className="resource-link" target="_blank" rel="noreferrer">
                        <span className="resource-icon">
                          <ResolvedIcon size={18} style={{ color: 'var(--glow-blue)' }} />
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
                          <ResolvedIcon size={18} style={{ color: 'var(--glow-blue)' }} />
                        </span>
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="social-links">
                  <h4>Follow us</h4>
                  <div className="social-icons">
                    {socialItems.map((item) => {
                      const Icon = resolveSocialIcon(item.icon)
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
              </section>
            </div>
          </CommunitySection>

          <CommunitySection
            eyebrow="Community Updates"
            title="Announcements, events, and resources"
            text="Stay connected with live community information."
            className="community-updates-section"
            aos=""
          >
            <div className="community-final-dashboard-shell">
              <section className="community-final-card community-final-updates">
                <div className="community-highlights__list">
                  {announcementItems.length ? (
                    announcementItems.map((announcement) => (
                      <div key={announcement._id || announcement.id || announcement.title} className={`community-highlights__item type-${announcement.type || 'info'}`}>
                        <span className="community-highlights__icon">
                          <Megaphone size={18} style={{ color: 'var(--glow-blue)' }} />
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
                      <Megaphone size={18} style={{ color: 'var(--glow-blue)' }} />
                      <div>
                        <strong className="community-panel-empty__title">Announcements coming soon</strong>
                        <p className="community-panel-empty__text soft-text">
                          Stay tuned for important updates and community news.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </CommunitySection>
        </>
      )}

      {/* Leaderboard Modal */}
      {isLeaderboardModalOpen && (
        <div className="leaderboard-modal-backdrop" onClick={() => setIsLeaderboardModalOpen(false)}>
          <div className="leaderboard-modal" onClick={(event) => event.stopPropagation()}>
            <div className="leaderboard-modal__header">
              <div>
                <h3>Full Leaderboard</h3>
                <p>{LEADERBOARD_TABS.find((item) => item.id === activeLeaderboardTab)?.label}</p>
              </div>
              <button type="button" className="leaderboard-modal__close" onClick={() => setIsLeaderboardModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="leaderboard-modal__body">
              {leaderboardDataByTab.map((entry) => {
                const fullAddress = entry.address || ''
                const isViewer = currentUserLower && currentUserLower === String(fullAddress).toLowerCase()
                return (
                  <div key={`modal-${activeLeaderboardTab}-${entry.rank}-${fullAddress}`} className={`leaderboard-item ${isViewer ? 'leaderboard-item--viewer' : ''}`}>
                    <div className={`rank-badge rank-${entry.rank}`}>
                      <RankMedal rank={entry.rank} />
                    </div>
                    <div className="leaderboard-address-wrap leaderboard-address-wrap--modal">
                      <div className="leaderboard-address-full-inline">{fullAddress}</div>
                    </div>
                    <div className="leaderboard-earnings">
                      {activeLeaderboardTab === 'topEarners' && `$${formatToken(entry.totalEarned || 0)}`}
                      {activeLeaderboardTab === 'topReferrers' && formatWhole(entry.totalReferrals || 0)}
                      {activeLeaderboardTab === 'mostActive' && formatWhole(entry.receiptCount || 0)}
                    </div>
                    <div className="leaderboard-referrals">
                      {activeLeaderboardTab === 'topEarners' && `${entry.receiptCount || 0} receipts`}
                      {activeLeaderboardTab === 'topReferrers' && `$${formatToken(entry.commissionEarned || 0)}`}
                      {activeLeaderboardTab === 'mostActive' && `$${formatToken(entry.totalVolume || entry.totalEarned || 0)}`}
                    </div>
                    <button
                      type="button"
                      className="leaderboard-copy-btn leaderboard-copy-btn--modal"
                      onClick={() => copyText(fullAddress, 'address')}
                    >
                      {copiedAddress === fullAddress ? <ShieldCheck size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default CommunityPage
