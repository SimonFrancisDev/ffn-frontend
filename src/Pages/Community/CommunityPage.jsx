import './CommunityPage.css'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
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
} from 'react-icons/fa'
import { MdEmojiEvents } from 'react-icons/md'
import { GiLaurelCrown, GiTrophyCup } from 'react-icons/gi'

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

const CommunityPage = ({ onNavigate }) => {
  const { isConnected, account, connect } = useWallet()
  const { contracts, isLoading: contractsLoading, loadContracts } = useContracts()
  const { viewedAddress, isOwnSpace } = useSpace()

  const resolvedAddress = viewedAddress || account || ''

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
    return isOwnSpace ? 'Your space' : 'Visitor space'
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

  const handleRoute = useCallback((route) => {
    onNavigate?.(route)
  }, [onNavigate])

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
      
      // Use real earnings from API - no mock fallback
      setDownlineEarnings(data.earnings || {})
      
      // Use real cycle from API
      setCurrentCycle(data.currentCycle || 1)
    } catch (err) {
      console.error('Error fetching downline:', err)
      // On error, set empty earnings
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
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

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
      {/* Hero section with full-width background image and fade effect */}
      <div className="community-hero" style={{
        position: 'relative',
        isolation: 'isolate',
        borderRadius: '18px',
        overflow: 'hidden',
      }}>
        {/* Full-width background image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url("/images/program-f-freedom.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }} />
        
        {/* Gradient fade overlay - left to right */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, 
            var(--bg-primary) 0%, 
            color-mix(in srgb, var(--bg-primary) 90%, transparent) 15%,
            color-mix(in srgb, var(--bg-primary) 60%, transparent) 40%,
            color-mix(in srgb, var(--bg-primary) 25%, transparent) 70%,
            transparent 100%)`,
          zIndex: 1,
          pointerEvents: 'none',
        }} />
        
        <div className="community-hero__content" style={{ position: 'relative', zIndex: 2 }}>
          <div className="community-hero__eyebrow glass-panel">
            <span className="community-hero__eyebrow-dot" />
            <span className="community-hero__eyebrow-text">
              Ecosystem visibility, participation, and momentum
            </span>
          </div>

          <div className="community-hero__text-block">
            <h1 className="community-hero__title">Community Hub</h1>
            <p className="community-hero__description soft-text">
              Connect, compete, and grow together in the FFN ecosystem.
            </p>
            <div className="small muted-text">
              Last updated: {lastUpdated} • Viewing: {isOwnSpace ? 'your connected space' : 'public visitor space'}
            </div>
          </div>

          <div className="community-hero__chips">
            <span className="community-hero__chip glass-panel">
              <Users size={14} style={{ color: 'var(--glow-teal)' }} />
              <span>{formatWhole(publicReadStats.totalParticipants || communityGlobalStats.totalUsers)} Members</span>
            </span>
            <span className="community-hero__chip glass-panel">
              <Globe size={14} style={{ color: 'var(--glow-blue)' }} />
              <span>{viewerLabel}</span>
            </span>
            <span className="community-hero__chip glass-panel">
              <Route size={14} style={{ color: '#f59e0b' }} />
              <span>{viewerAddressLabel}</span>
            </span>
          </div>
        </div>

        <div className="community-hero__visual glass-panel" style={{ position: 'relative', zIndex: 2, background: 'transparent', border: 'none' }}>
          <div className="community-hero__visual-box" style={{ background: 'transparent' }}>
            <div className="hero-network-viz" aria-hidden="true" style={{ position: 'relative', zIndex: 2 }}>
              <div className="hero-network-viz__ring hero-network-viz__ring--one" />
              <div className="hero-network-viz__ring hero-network-viz__ring--two" />
              <div className="hero-network-viz__ring hero-network-viz__ring--three" />
              <div className="hero-network-viz__core">
                <Users size={22} style={{ color: 'var(--glow-teal)' }} />
              </div>
              <div className="hero-network-viz__orbit hero-network-viz__orbit--one">
                <span className="hero-network-viz__node" />
              </div>
              <div className="hero-network-viz__orbit hero-network-viz__orbit--two">
                <span className="hero-network-viz__node" />
              </div>
              <div className="hero-network-viz__orbit hero-network-viz__orbit--three">
                <span className="hero-network-viz__node" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="community-metrics glass-panel">
        <div className="community-section-heading">
          <span className="community-section-heading__eyebrow muted-text">Public Snapshot</span>
          <h2 className="community-section-heading__title">Core community indicators at a glance</h2>
        </div>

        <div className="community-metrics__grid">
          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon" style={{ background: 'linear-gradient(135deg, rgba(29, 233, 182, 0.15), rgba(77, 163, 255, 0.1))' }}>
              <Users size={18} style={{ color: 'var(--glow-teal)' }} />
            </span>
            <span className="community-metrics__label muted-text">Total Members</span>
            <strong className="community-metrics__value gradient-text-teal">
              {formatWhole(publicReadStats.totalParticipants || communityGlobalStats.totalUsers)}
            </strong>
          </div>

          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(29, 233, 182, 0.1))' }}>
              <FaCoins size={18} style={{ color: '#f59e0b' }} />
            </span>
            <span className="community-metrics__label muted-text">Core Balance</span>
            <strong className="community-metrics__value gradient-text-gold">
              {publicReadStats.visibleCoreBalance || communityGlobalStats.totalLiquid} USDT
            </strong>
          </div>

          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon" style={{ background: 'linear-gradient(135deg, rgba(77, 163, 255, 0.15), rgba(139, 92, 246, 0.1))' }}>
              <FaShieldAlt size={18} style={{ color: 'var(--glow-blue)' }} />
            </span>
            <span className="community-metrics__label muted-text">Read Layer</span>
            <strong className="community-metrics__value gradient-text-blue">
              {publicReadStats.readLayerStatus}
            </strong>
          </div>

          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon" style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(245, 158, 11, 0.1))' }}>
              <GiTrophyCup size={18} style={{ color: '#FFD700' }} />
            </span>
            <span className="community-metrics__label muted-text">Data Feeds</span>
            <strong className="community-metrics__value gradient-text-gold">
              {Object.values(communityFeedStatus).some(s => s === 'live') ? 'Active' : 'Syncing'}
            </strong>
          </div>
        </div>
      </section>

      <div className="community-main-grid">
        <div className="community-main-grid__left">
          <section className="community-referral glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">Your Referral Arsenal</span>
              <h2 className="community-section-heading__title">Share, invite, and earn together</h2>
            </div>

            {isOwnSpace ? (
              <>
                <div className="referral-stats-grid">
                  <div className="referral-stat" style={{ background: 'linear-gradient(135deg, rgba(29, 233, 182, 0.08), rgba(77, 163, 255, 0.04))' }}>
                    <span className="referral-stat-label">
                      <Users size={14} style={{ marginRight: '4px', color: 'var(--glow-teal)' }} />
                      Total Referrals
                    </span>
                    <strong className="referral-stat-value">{userReferralCount}</strong>
                  </div>
                  <div className="referral-stat" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(29, 233, 182, 0.04))' }}>
                    <span className="referral-stat-label">
                      <FaCoins size={14} style={{ marginRight: '4px', color: '#f59e0b' }} />
                      Commission Earned
                    </span>
                    <strong className="referral-stat-value">${userCommission}</strong>
                  </div>
                  <div className="referral-stat" style={{ background: 'linear-gradient(135deg, rgba(77, 163, 255, 0.08), rgba(139, 92, 246, 0.04))' }}>
                    <span className="referral-stat-label">
                      <TrendingUp size={14} style={{ marginRight: '4px', color: 'var(--glow-blue)' }} />
                      Conversion
                    </span>
                    <strong className="referral-stat-value">
                      ~{userReferralCount > 0 ? Math.floor((userReferralCount / (userReferralCount + 50)) * 100) : 0}%
                    </strong>
                  </div>
                </div>

                <div className="referral-link-container">
                  <div className="referral-link-label">Your Unique Referral Link</div>
                  <div className="referral-link-box">
                    <input type="text" className="referral-link-input" value={referralLink} readOnly />
                    <button className="copy-btn" onClick={() => copyText(referralLink, 'referral')}>
                      {copied ? <><ShieldCheck size={14} /><span>Copied</span></> : <><Copy size={14} /><span>Copy</span></>}
                    </button>
                  </div>
                  {copied ? <div className="copy-success">Referral link copied successfully.</div> : null}
                </div>

                <div className="referral-tip">
                  <Rocket size={16} style={{ color: 'var(--glow-teal)' }} />
                  <span className="tip-text">Share your personal link to onboard new participants into your own space.</span>
                </div>
              </>
            ) : (
              <div className="community-panel-empty glass-panel">
                <Globe size={18} style={{ color: 'var(--glow-blue)' }} />
                <div>
                  <strong className="community-panel-empty__title">Visitor mode is active</strong>
                  <p className="community-panel-empty__text soft-text">
                    Referral tools are available only inside your own connected space.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="community-downline glass-panel">
            <div className="community-section-heading community-section-heading--row">
              <div>
                <span className="community-section-heading__eyebrow muted-text">Your Network Tree</span>
                <h2 className="community-section-heading__title">Watch your team grow</h2>
              </div>
              <button className="section-action-btn" onClick={() => handleRoute('orbits')}>
                <Orbit size={14} />
                <span>View Orbit</span>
                <ChevronRight size={12} />
              </button>
            </div>

            <div className="downline-tree downline-tree--radar">
              <div className="downline-radar downline-radar--one" />
              <div className="downline-radar downline-radar--two" />
              <div className="downline-radar downline-radar--three" />

              <div className="tree-root">
                <div className="tree-node you">
                  <span className="node-icon">👤</span>
                  <span className="node-label">You</span>
                  <span className="node-level">Level 0</span>
                  <span className="node-cycle">Cycle {currentCycle}</span>
                </div>

                <div className="tree-children tree-children--ten">
                  {DOWNLINE_LEVEL_KEYS.map((key, index) => {
                    const value = Number(downlineStats[key] || 0)
                    const earnings = downlineEarnings[key]
                    const hasEarnings = earnings && Number(earnings) > 0
                    const width = Math.min(value * 10, 100)
                    return (
                      <div key={key} className="tree-level">
                        <div className="level-label">Level {index + 1}</div>
                        <div className="level-count">{value} members</div>
                        {value > 0 && hasEarnings && (
                          <div className="level-earnings">
                            <FaCoins size={10} style={{ marginRight: '4px', color: '#f59e0b' }} />
                            ${formatToken(earnings)}
                          </div>
                        )}
                        <div className="level-progress">
                          <div className="progress-fill" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="tree-total">
                <span>Visible Network Count:</span>
                <strong>{totalVisibleNetwork}</strong>
                <span className="tree-total-divider">•</span>
                <span>Active Levels:</span>
                <strong>{DOWNLINE_LEVEL_KEYS.filter(k => downlineStats[k] > 0).length}/10</strong>
              </div>
            </div>
          </section>

          <section className="community-growth glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">Growth Overview</span>
              <h2 className="community-section-heading__title">Community movement and momentum</h2>
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
                        title={`${item.date} • ${registrations} registrations • ${item.earningsLiquid || '0.00'} USDT`}
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
                  <p className="chart-note">Data will appear as community activity grows.</p>
                </div>
              </div>
            )}
          </section>

          <section className="community-highlights glass-panel">
            <div className="community-section-heading community-section-heading--row">
              <div>
                <span className="community-section-heading__eyebrow muted-text">Highlights</span>
                <h2 className="community-section-heading__title">Recent ecosystem moments</h2>
              </div>
              <button className="section-refresh-btn" onClick={refreshAnnouncements}>
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
            </div>

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

        <div className="community-main-grid__right">
          <section className="community-leaderboard glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">Global Leaderboard</span>
              <h2 className="community-section-heading__title">Top earners & referrers</h2>
            </div>

            <div className="leaderboard-tabs">
              {LEADERBOARD_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    className={`leaderboard-tab ${activeLeaderboardTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveLeaderboardTab(tab.id)}
                    type="button"
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
                leaderboardDataByTab.slice(0, 10).map((entry) => {
                  const isViewer = currentUserLower && currentUserLower === String(entry.address || '').toLowerCase()
                  const fullAddress = entry.address || ''
                  return (
                    <div key={`${activeLeaderboardTab}-${entry.rank}-${fullAddress}`} className={`leaderboard-item ${isViewer ? 'leaderboard-item--viewer' : ''}`}>
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
                      Rankings will appear as community activity grows.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {leaderboardDataByTab.length > 0 && (
              <div className="leaderboard-footer">
                <button className="view-all-btn" onClick={() => setIsLeaderboardModalOpen(true)}>
                  <span>View Full Board ({leaderboardDataByTab.length} total)</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </section>

          <section className="community-events glass-panel">
            <div className="community-section-heading community-section-heading--row">
              <div>
                <span className="community-section-heading__eyebrow muted-text">Upcoming Events</span>
                <h2 className="community-section-heading__title">Don't miss out</h2>
              </div>
              <button className="section-refresh-btn" onClick={refreshEvents}>
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
            </div>

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
                      AMAs, contests, and community sessions coming soon.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="community-spotlight glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">Spotlight</span>
              <h2 className="community-section-heading__title">Community achievements</h2>
            </div>

            <div className="community-spotlight__card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(29, 233, 182, 0.06), rgba(77, 163, 255, 0.03))' }}>
              <span className="community-spotlight__label muted-text">
                <GiTrophyCup size={14} style={{ marginRight: '6px', color: '#FFD700' }} />
                Milestone
              </span>
              <strong className="community-spotlight__value">
                {formatWhole(publicReadStats.totalParticipants || communityGlobalStats.totalUsers)} Members
              </strong>
              <p className="community-spotlight__text soft-text">
                Total registered participants in the ecosystem.
              </p>
            </div>

            <div className="community-spotlight__card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(77, 163, 255, 0.06), rgba(139, 92, 246, 0.03))' }}>
              <span className="community-spotlight__label muted-text">
                <FaStar size={14} style={{ marginRight: '6px', color: 'var(--glow-blue)' }} />
                Your Progress
              </span>
              <strong className="community-spotlight__value">Level {memberSummary.highestActiveLevel || 0}</strong>
              <p className="community-spotlight__text soft-text">
                {memberSummary.activeLevelsCount} active levels • Keep growing!
              </p>
            </div>

            <div className="community-spotlight__card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(29, 233, 182, 0.03))' }}>
              <span className="community-spotlight__label muted-text">
                <FaCoins size={14} style={{ marginRight: '6px', color: '#f59e0b' }} />
                Token Snapshot
              </span>
              <strong className="community-spotlight__value">{memberSummary.fgtTotal} FGT</strong>
              <p className="community-spotlight__text soft-text">
                FGTr: {memberSummary.fgtrTotal} • Earnings: ${memberSummary.totalReceiptEarnings}
              </p>
            </div>
          </section>

          <section className="community-resources glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">Resources & Support</span>
              <h2 className="community-section-heading__title">Get help and stay connected</h2>
            </div>

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
      </div>

      {/* Leaderboard Modal */}
      {isLeaderboardModalOpen && (
        <div className="leaderboard-modal-backdrop" onClick={() => setIsLeaderboardModalOpen(false)}>
          <div className="leaderboard-modal" onClick={(event) => event.stopPropagation()}>
            <div className="leaderboard-modal__header">
              <div>
                <h3>Full Leaderboard</h3>
                <p>{LEADERBOARD_TABS.find((item) => item.id === activeLeaderboardTab)?.label}</p>
              </div>
              <button className="leaderboard-modal__close" onClick={() => setIsLeaderboardModalOpen(false)}>
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

      <style>{`
        /* All theme variables are inherited from global.css */
        
        /* Animations */
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes radarPulse { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes communityOrbitSpin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* Gradient text utilities */
        .gradient-text-teal {
          background: linear-gradient(135deg, var(--text-primary), var(--glow-teal));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-gold {
          background: linear-gradient(135deg, var(--text-primary), #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-blue {
          background: linear-gradient(135deg, var(--text-primary), var(--glow-blue));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Base Styles */
        .spinner { width: 40px; height: 40px; border: 3px solid rgba(77, 163, 255, 0.2); border-top-color: var(--glow-blue); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
        .spinner-small { width: 16px; height: 16px; border: 2px solid rgba(77, 163, 255, 0.2); border-top-color: var(--glow-blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
        .loading-container { text-align: center; padding: 60px; color: var(--text-primary); }
        
        .connect-wallet-btn, .section-refresh-btn, .section-action-btn, .leaderboard-copy-btn, .leaderboard-modal__close { 
          cursor: pointer; 
          transition: all 0.3s ease;
        }
        
        .community-page { display: flex; flex-direction: column; gap: 24px; }
        
        /* Hero Section */
        .community-hero { display: grid; grid-template-columns: 1fr; gap: 24px; }
        .community-hero__content, .community-hero__text-block { display: flex; flex-direction: column; gap: 14px; }
        .community-hero__eyebrow { width: fit-content; padding: 8px 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 10px; }
        .community-hero__eyebrow-dot { width: 9px; height: 9px; border-radius: 999px; background: var(--glow-teal); animation: pulse 2s infinite; }
        .community-hero__chips { display: flex; flex-wrap: wrap; gap: 10px; }
        .community-hero__chip { min-height: 36px; padding: 0 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; }
        .community-hero__title { 
          font-size: clamp(1.9rem, 6vw, 3.5rem); 
          font-weight: 800; 
          background: linear-gradient(135deg, var(--text-primary) 0%, var(--glow-teal) 50%, var(--glow-blue) 100%); 
          -webkit-background-clip: text; 
          -webkit-text-fill-color: transparent; 
          background-clip: text; 
        }
        .community-hero__description { font-size: 1.1rem; line-height: 1.6; }
        
        /* Glass Panel */
        .glass-panel { 
          background: var(--glass-bg); 
          border: 1px solid var(--glass-border); 
          border-radius: 18px; 
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .glass-panel:hover { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); }
        
        /* Community Hero Visual */
        .community-hero__visual, .community-metrics, .community-growth, .community-highlights, 
        .community-referral, .community-spotlight, .community-downline, .community-events, 
        .community-leaderboard, .community-resources { padding: 18px; display: flex; flex-direction: column; gap: 16px; }
        
        .community-hero__visual-box { 
          min-height: 220px; 
          border-radius: 18px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          position: relative;
          overflow: hidden;
        }
        
        /* Section Headings */
        .community-section-heading { display: flex; flex-direction: column; gap: 8px; }
        .community-section-heading--row { flex-direction: row; justify-content: space-between; align-items: center; gap: 16px; }
        .community-section-heading__eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600; color: var(--text-muted); }
        .community-section-heading__title { font-size: clamp(1.2rem, 4vw, 1.8rem); font-weight: 800; color: var(--text-primary); }
        
        /* Metrics Grid */
        .community-metrics__grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .community-metrics__card, .community-spotlight__card { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
        .community-metrics__icon { width: 42px; height: 42px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; }
        .community-metrics__label, .community-spotlight__label { 
          font-size: 11px; 
          text-transform: uppercase; 
          letter-spacing: 0.1em; 
          display: flex; 
          align-items: center; 
          color: var(--text-muted);
        }
        .community-metrics__value, .community-spotlight__value { 
          font-size: clamp(1.2rem, 5vw, 1.8rem); 
          font-weight: 800; 
          color: var(--text-primary);
        }
        
        /* Main Grid */
        .community-main-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        .community-main-grid__left, .community-main-grid__right { display: flex; flex-direction: column; gap: 14px; }
        
        /* Referral Section */
        .referral-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .referral-stat { text-align: center; padding: 12px; border-radius: 16px; }
        .referral-stat-label { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 11px; 
          margin-bottom: 8px; 
          color: var(--text-secondary); 
          text-transform: uppercase; 
          letter-spacing: 0.05em; 
        }
        .referral-stat-value { font-size: 24px; font-weight: bold; color: var(--glow-teal); }
        .referral-link-box { display: flex; gap: 8px; }
        .referral-link-input { 
          flex: 1; 
          padding: 12px; 
          border-radius: 12px; 
          background: var(--surface-1); 
          border: 1px solid var(--border-soft); 
          color: var(--text-primary); 
          font-family: monospace; 
          font-size: 12px; 
        }
        .copy-btn, .section-refresh-btn, .section-action-btn { 
          padding: 10px 16px; 
          border-radius: 12px; 
          border: none; 
          background: var(--surface-2); 
          color: var(--text-primary); 
          display: inline-flex; 
          align-items: center; 
          gap: 8px; 
        }
        .copy-btn { 
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a); 
          color: var(--bg-primary); 
          font-weight: 700; 
        }
        .copy-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(29, 233, 182, 0.3); }
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
        .referral-tip { 
          background: linear-gradient(135deg, rgba(29, 233, 182, 0.1), rgba(77, 163, 255, 0.05)); 
          padding: 12px; 
          border-radius: 12px; 
          display: flex; 
          gap: 10px; 
          align-items: center; 
        }
        .tip-text, .muted-text, .soft-text { color: var(--text-secondary); }
        
        /* Downline Tree */
        .downline-tree { position: relative; overflow: hidden; padding: 16px; background: var(--surface-1); border-radius: 20px; }
        .downline-tree--radar { isolation: isolate; }
        .downline-radar { 
          position: absolute; 
          inset: 50% auto auto 50%; 
          transform: translate(-50%, -50%); 
          border: 1px solid rgba(77, 163, 255, 0.14); 
          border-radius: 999px; 
          animation: radarPulse 8s linear infinite; 
          z-index: 0; 
        }
        .downline-radar--one { width: 140px; height: 140px; }
        .downline-radar--two { width: 230px; height: 230px; animation-duration: 12s; }
        .downline-radar--three { width: 320px; height: 320px; animation-duration: 16s; }
        .tree-root, .tree-total { position: relative; z-index: 1; }
        .tree-root { text-align: center; }
        .tree-node.you { 
          display: inline-flex; 
          flex-direction: column; 
          align-items: center; 
          padding: 12px 20px; 
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a); 
          border-radius: 20px; 
          margin-bottom: 20px; 
          animation: float 4s ease-in-out infinite; 
          color: var(--bg-primary);
        }
        .node-icon { font-size: 24px; }
        .node-label { font-weight: 700; font-size: 14px; }
        .node-level { font-size: 11px; opacity: 0.8; }
        .node-cycle { font-size: 10px; opacity: 0.7; margin-top: 4px; }
        .tree-children { display: flex; gap: 16px; flex-wrap: wrap; }
        .tree-children--ten { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .tree-level { 
          text-align: center; 
          padding: 12px; 
          background: var(--surface-1); 
          border-radius: 16px; 
          border: 1px solid var(--border-soft); 
        }
        .level-label { 
          font-size: 11px; 
          margin-bottom: 8px; 
          font-weight: bold; 
          color: var(--text-secondary); 
          text-transform: uppercase; 
          letter-spacing: 0.05em; 
        }
        .level-count { font-size: 20px; font-weight: bold; margin-bottom: 4px; color: var(--text-primary); }
        .level-earnings { 
          font-size: 11px; 
          color: #f59e0b; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          margin-bottom: 8px; 
        }
        .level-progress { height: 4px; background: var(--surface-2); border-radius: 2px; overflow: hidden; }
        .progress-fill { 
          height: 100%; 
          background: linear-gradient(90deg, var(--glow-teal), var(--glow-blue)); 
          border-radius: 2px; 
          transition: width 0.5s ease; 
        }
        .tree-total { 
          text-align: center; 
          margin-top: 20px; 
          padding-top: 16px; 
          border-top: 1px solid var(--border-soft); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 8px; 
          flex-wrap: wrap; 
          color: var(--text-primary);
        }
        .tree-total-divider { color: var(--text-secondary); }
        
        /* Hero Network Viz */
        .hero-network-viz { position: relative; width: min(100%, 280px); height: 220px; display: flex; align-items: center; justify-content: center; }
        .hero-network-viz__ring, .hero-network-viz__orbit { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); border-radius: 999px; }
        .hero-network-viz__ring { 
          border: 1px solid var(--border-soft); 
          background: radial-gradient(circle, var(--surface-1), transparent 72%); 
        }
        .hero-network-viz__ring--one { width: 82px; height: 82px; }
        .hero-network-viz__ring--two { width: 136px; height: 136px; }
        .hero-network-viz__ring--three { width: 196px; height: 196px; }
        .hero-network-viz__core { 
          position: relative; 
          z-index: 2; 
          width: 58px; 
          height: 58px; 
          border-radius: 18px; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          background: linear-gradient(135deg, rgba(29, 233, 182, 0.24), rgba(77, 163, 255, 0.22)); 
        }
        .hero-network-viz__orbit--one { width: 82px; height: 82px; animation: communityOrbitSpin 7s linear infinite; }
        .hero-network-viz__orbit--two { width: 136px; height: 136px; animation: communityOrbitSpin 10s linear infinite; }
        .hero-network-viz__orbit--three { width: 196px; height: 196px; animation: communityOrbitSpin 13s linear infinite; }
        .hero-network-viz__node { 
          position: absolute; 
          top: -5px; 
          left: 50%; 
          width: 10px; 
          height: 10px; 
          margin-left: -5px; 
          border-radius: 999px; 
          background: linear-gradient(135deg, var(--glow-teal), var(--glow-blue)); 
        }
        
        /* Highlights & Events */
        .community-highlights__list, .events-list, .leaderboard-list { display: flex; flex-direction: column; gap: 12px; }
        .community-highlights__item, .leaderboard-item { 
          padding: 12px; 
          background: var(--surface-1); 
          border-radius: 12px; 
          display: flex; 
          gap: 12px; 
          align-items: center; 
          border: 1px solid var(--border-soft); 
          transition: all 0.3s ease; 
        }
        .community-highlights__item:hover { background: var(--surface-2); transform: translateX(2px); }
        .community-highlights__item.type-success { border-left: 3px solid var(--glow-teal); }
        .community-highlights__item.type-info { border-left: 3px solid var(--glow-blue); }
        .community-highlights__item.type-event { border-left: 3px solid #f59e0b; }
        .community-highlights__item.type-warning { border-left: 3px solid #ef4444; }
        .community-highlights__icon { 
          width: 40px; 
          height: 40px; 
          border-radius: 14px; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          background: var(--surface-2); 
          flex-shrink: 0; 
        }
        .community-highlights__title { font-size: 14px; margin-bottom: 4px; font-weight: 600; color: var(--text-primary); }
        .community-highlights__text { font-size: 12px; color: var(--text-secondary); }
        .highlight-date { font-size: 10px; color: var(--text-muted); display: block; margin-top: 6px; }
        
        /* Empty States */
        .community-panel-empty { 
          padding: 16px; 
          display: flex; 
          align-items: flex-start; 
          gap: 12px; 
          border-radius: 16px; 
          background: var(--surface-1); 
        }
        .community-panel-empty__title { color: var(--text-primary); }
        .community-panel-empty__text { color: var(--text-secondary); }
        .community-empty-state { 
          min-height: 180px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 14px; 
          padding: 18px; 
          border-radius: 18px; 
          background: var(--surface-1); 
          border: 1px dashed var(--border-soft); 
        }
        .community-empty-state__icon { 
          width: 48px; 
          height: 48px; 
          border-radius: 14px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: var(--surface-2); 
        }
        .community-empty-state__body { text-align: left; }
        .community-empty-state__body strong { color: var(--text-primary); }
        
        /* Growth Chart */
        .growth-chart { display: flex; align-items: flex-end; justify-content: center; gap: 8px; height: 180px; padding: 16px 0; }
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
          cursor: pointer; 
        }
        .chart-bar:hover { opacity: 0.8; }
        .chart-bar span { 
          position: absolute; 
          bottom: -22px; 
          font-size: 10px; 
          color: var(--text-secondary); 
          transform: rotate(-45deg); 
          white-space: nowrap; 
        }
        .chart-note { text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 8px; }
        
        /* Leaderboard */
        .leaderboard-tabs { 
          display: flex; 
          gap: 8px; 
          margin-bottom: 16px; 
          border-bottom: 1px solid var(--border-soft); 
          padding-bottom: 12px; 
          flex-wrap: wrap; 
        }
        .leaderboard-tab { 
          padding: 8px 16px; 
          border-radius: 30px; 
          background: transparent; 
          border: none; 
          color: var(--text-secondary); 
          cursor: pointer; 
          font-size: 12px; 
          display: inline-flex; 
          align-items: center; 
          gap: 6px; 
          transition: all 0.3s ease; 
        }
        .leaderboard-tab:hover { background: var(--surface-2); color: var(--text-primary); }
        .leaderboard-tab.active { 
          background: linear-gradient(135deg, var(--glow-teal), var(--glow-blue)); 
          color: var(--bg-primary); 
          font-weight: 600; 
        }
        .leaderboard-loading { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 8px; 
          padding: 20px; 
          color: var(--text-secondary); 
        }
        .leaderboard-item { transition: transform 0.25s ease, background 0.25s ease; }
        .leaderboard-item:hover { transform: translateY(-1px); background: var(--surface-2); }
        .leaderboard-item--viewer { 
          outline: 1px solid var(--glow-teal); 
          box-shadow: 0 0 0 1px rgba(29, 233, 182, 0.12) inset; 
          background: rgba(29, 233, 182, 0.05); 
        }
        .rank-badge { width: 40px; text-align: center; font-weight: bold; display: flex; align-items: center; justify-content: center; }
        .rank-number { font-size: 12px; color: var(--text-secondary); }
        .leaderboard-address-wrap { position: relative; flex: 1; min-width: 0; }
        .leaderboard-address { 
          font-family: monospace; 
          font-size: 12px; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          color: var(--text-primary);
        }
        .leaderboard-address-hover { 
          position: absolute; 
          left: 0; 
          top: 50%; 
          transform: translateY(-50%) scale(0.98); 
          opacity: 0; 
          pointer-events: none; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 8px 10px; 
          border-radius: 10px; 
          background: var(--bg-overlay); 
          border: 1px solid var(--border-strong); 
          transition: opacity 0.2s ease, transform 0.2s ease; 
          z-index: 8; 
          max-width: min(90vw, 420px); 
        }
        .leaderboard-item:hover .leaderboard-address-hover { opacity: 1; pointer-events: auto; transform: translateY(-50%) scale(1); }
        .leaderboard-address-full, .leaderboard-address-full-inline { 
          font-family: monospace; 
          font-size: 12px; 
          color: var(--text-primary);
        }
        .leaderboard-copy-btn { 
          width: 28px; 
          height: 28px; 
          border-radius: 10px; 
          border: 1px solid var(--border-soft); 
          background: var(--surface-2); 
          color: var(--text-primary); 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          flex-shrink: 0; 
        }
        .leaderboard-copy-btn:hover { background: var(--surface-3); }
        .leaderboard-earnings { font-weight: bold; color: var(--glow-teal); min-width: 80px; text-align: right; }
        .leaderboard-referrals { font-size: 11px; color: var(--text-secondary); min-width: 70px; text-align: right; }
        .view-all-btn { 
          width: 100%; 
          padding: 10px; 
          border-radius: 12px; 
          background: var(--surface-1); 
          border: 1px solid var(--border-soft); 
          color: var(--text-primary); 
          cursor: pointer; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          gap: 8px; 
          text-decoration: none; 
          transition: all 0.3s ease; 
        }
        .view-all-btn:hover { background: var(--surface-2); }
        
        /* Resources & Social */
        .resources-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
        .resource-link { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          padding: 12px; 
          background: var(--surface-1); 
          border-radius: 12px; 
          border: 1px solid var(--border-soft); 
          color: var(--text-secondary); 
          text-decoration: none; 
          transition: all 0.3s ease; 
        }
        .resource-link:hover { background: var(--surface-2); color: var(--text-primary); transform: translateX(2px); }
        .resource-icon { 
          width: 32px; 
          height: 32px; 
          border-radius: 10px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: var(--surface-2); 
        }
        .social-links h4 { 
          font-size: 13px; 
          text-transform: uppercase; 
          letter-spacing: 0.1em; 
          margin-bottom: 16px; 
          color: var(--text-secondary); 
        }
        .social-icons { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
        .social-icon { 
          width: 42px; 
          height: 42px; 
          border-radius: 14px; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          text-decoration: none; 
          color: var(--text-secondary); 
          background: var(--surface-1); 
          border: 1px solid var(--border-soft); 
          transition: all 0.3s ease; 
        }
        .social-icon:hover { color: var(--glow-teal); border-color: var(--glow-teal); transform: translateY(-2px); }
        
        /* Modal */
        .leaderboard-modal-backdrop { 
          position: fixed; 
          inset: 0; 
          background: var(--bg-overlay); 
          backdrop-filter: blur(12px); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          padding: 20px; 
          z-index: 999; 
        }
        .leaderboard-modal { 
          width: min(100%, 700px); 
          max-height: 85vh; 
          background: var(--bg-primary); 
          border: 1px solid var(--border-strong); 
          border-radius: 24px; 
          display: flex; 
          flex-direction: column; 
          overflow: hidden; 
        }
        .leaderboard-modal__header { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 18px 20px; 
          border-bottom: 1px solid var(--border-soft); 
        }
        .leaderboard-modal__header h3 { margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
        .leaderboard-modal__header p { margin: 4px 0 0; color: var(--text-secondary); font-size: 12px; }
        .leaderboard-modal__body { padding: 18px; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
        .leaderboard-modal__body .leaderboard-item { padding: 14px; }
        .leaderboard-modal__close { 
          width: 36px; 
          height: 36px; 
          border-radius: 12px; 
          border: 1px solid var(--border-soft); 
          background: var(--surface-1); 
          color: var(--text-primary); 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
        }
        .leaderboard-modal__close:hover { background: var(--surface-2); }
        .leaderboard-address-wrap--modal { flex: 1; }
        .leaderboard-copy-btn--modal { margin-left: 8px; }
        
        /* Utilities */
        .small { font-size: 12px; }
        .muted-text { color: var(--text-muted); }
        .soft-text { color: var(--text-secondary); line-height: 1.5; }
        
        /* Responsive */
        @media (min-width: 1024px) { 
          .community-main-grid { grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr); } 
          .community-metrics__grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } 
          .community-hero { grid-template-columns: minmax(0, 1.02fr) minmax(360px, 0.98fr); } 
          .tree-children--ten { grid-template-columns: repeat(5, minmax(0, 1fr)); } 
        }
        
        @media (max-width: 768px) {
          .referral-stats-grid, .resources-grid, .tree-children--ten { grid-template-columns: 1fr; }
          .leaderboard-item { flex-wrap: wrap; }
          .growth-chart { height: 140px; }
          .community-section-heading--row { flex-direction: column; align-items: stretch; }
          .leaderboard-address-hover { left: -8px; right: -8px; max-width: none; }
          .leaderboard-earnings, .leaderboard-referrals { text-align: left; min-width: auto; }
        }
      `}</style>
    </section>
  )
}

export default CommunityPage
