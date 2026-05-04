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
  FaWallet,
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

const TOKEN_IMAGES = {
  fgt: '/images/fgt-token.png',
  fgtr: '/images/fgtr-token.png',
}

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
  const { viewedAddress, isOwnSpace, switchToSelf, switchToVisitor } = useSpace()

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
              <span className="community-hero__eyebrow-text">Join the Ecosystem</span>
            </div>
            <div className="community-hero__text-block">
              <h1 className="community-hero__title">Community Hub</h1>
              <p className="community-hero__description soft-text">
                Connect your wallet to access referral tools, view leaderboards, and track community growth.
              </p>
            </div>
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
            <button type="button" onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
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
          <p>Loading community insights...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="community-page">
      <div className="community-hero community-hero--featured">
        <div className="community-hero__bg" />
        <div className="community-hero__overlay" />

        <div className="community-hero__content">
          <div className="community-hero__eyebrow glass-panel">
            <span className="community-hero__eyebrow-dot" />
            <span className="community-hero__eyebrow-text">
              A Decentralized Path to Financial Freedom
            </span>
          </div>

          <div className="community-hero__text-block">
            <h1 className="community-hero__title">Community Hub</h1>
            <p className="community-hero__description soft-text">
              A transparent, participation-driven ecosystem designed to reward contribution, progression, and long-term commitment. Track community momentum, monitor your network, and stay close to the latest ecosystem activity.
            </p>
            <div className="small muted-text">
              Last updated: {lastUpdated} • {isOwnSpace ? 'Your connected space' : 'Visitor space'}
            </div>
          </div>

          <div className="community-profile-switcher glass-panel">
            <div className="community-profile-switcher__head">
              <div>
                <span className="community-profile-switcher__label muted-text">
                  Profile switcher
                </span>
                <p className="community-profile-switcher__note soft-text">
                  View a public wallet space without leaving the community hub.
                </p>
              </div>

              {!isOwnSpace ? (
                <button
                  type="button"
                  className="community-profile-switcher__return"
                  onClick={handleReturnToMyProfile}
                >
                  Return to my profile
                </button>
              ) : null}
            </div>

            <div className="community-profile-switcher__row">
              <div className="community-profile-switcher__input-wrap">
                <Globe size={16} />
                <input
                  type="text"
                  className="community-profile-switcher__input"
                  value={profileInput}
                  onChange={(event) => setProfileInput(event.target.value)}
                  placeholder="Enter wallet address to view profile"
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

            <div className="community-profile-switcher__meta">
              <span className="community-profile-switcher__chip">
                {isOwnSpace ? 'Your connected space' : 'Visitor space'}
              </span>

              <span className="community-profile-switcher__address">
                {viewerAddressLabel}
              </span>
            </div>

            {profileError ? (
              <p className="community-profile-switcher__error">{profileError}</p>
            ) : null}
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

        <div className="community-hero__visual glass-panel">
          <div className="community-hero__visual-box">
            <div className="hero-network-viz" aria-hidden="true">
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
          <span className="community-section-heading__eyebrow muted-text">Ecosystem Snapshot</span>
          <h2 className="community-section-heading__title">Core community indicators at a glance</h2>
        </div>

        <div className="community-metrics__grid">
          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon" style={{ background: 'linear-gradient(135deg, rgba(29, 233, 182, 0.15), rgba(77, 163, 255, 0.1))' }}>
              <Users size={18} style={{ color: 'var(--glow-teal)' }} />
            </span>
            <span className="community-metrics__label muted-text">Total Participants</span>
            <strong className="community-metrics__value gradient-text-teal">
              {formatWhole(publicReadStats.totalParticipants || communityGlobalStats.totalUsers)}
            </strong>
          </div>

          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(29, 233, 182, 0.1))' }}>
              <FaCoins size={18} style={{ color: '#f59e0b' }} />
            </span>
            <span className="community-metrics__label muted-text">Visible Treasury</span>
            <strong className="community-metrics__value gradient-text-gold">
              {publicReadStats.visibleCoreBalance || communityGlobalStats.totalLiquid} USDT
            </strong>
          </div>

          <div className="community-metrics__card glass-panel">
            <span className="community-metrics__icon" style={{ background: 'linear-gradient(135deg, rgba(77, 163, 255, 0.15), rgba(139, 92, 246, 0.1))' }}>
              <FaShieldAlt size={18} style={{ color: 'var(--glow-blue)' }} />
            </span>
            <span className="community-metrics__label muted-text">Read Layer Status</span>
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
              <span className="community-section-heading__eyebrow muted-text">Referral Program</span>
              <h2 className="community-section-heading__title">Share your link, welcome new participants, and track your referral performance</h2>
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
                      Active Levels
                    </span>
                    <strong className="referral-stat-value">{memberSummary.activeLevelsCount}</strong>
                  </div>
                </div>

                <div className="referral-link-container">
                  <div className="referral-link-label">Your Unique Referral Link</div>
                  <div className="referral-link-box">
                    <input type="text" className="referral-link-input" value={referralLink} readOnly />
                    <button type="button" className="copy-btn" onClick={() => copyText(referralLink, 'referral')}>
                      {copied ? <><ShieldCheck size={14} /><span>Copied</span></> : <><Copy size={14} /><span>Copy</span></>}
                    </button>
                  </div>
                  {copied ? <div className="copy-success">Referral link copied successfully.</div> : null}
                </div>

                <div className="referral-tip">
                  <Rocket size={16} style={{ color: 'var(--glow-teal)' }} />
                  <span className="tip-text">Share your personal link to onboard new participants into your ecosystem network.</span>
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
                <h2 className="community-section-heading__title">Monitor your referral network across all visible levels and completed cycles</h2>
              </div>
              <button type="button" className="section-action-btn" onClick={() => onNavigate?.('orbits')}>
                <Orbit size={14} />
                <span>Explore Orbit</span>
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
                  <span className="node-level"></span>
                  <span className="node-cycle">Multi-level cycle tracking</span>
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

                        <div className="level-cycle">
                          Cycle {orbitNetwork[key]?.latestCycle || 0}
                        </div>
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
                <span>Cycle-based Member Count:</span>
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
              <h2 className="community-section-heading__title">Registration activity and growth trends from the read layer</h2>
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
                  <p className="chart-note">This view will populate as fresh growth data is indexed.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="community-main-grid__right">
          <section className="community-leaderboard glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">Global Leaderboard</span>
              <h2 className="community-section-heading__title">See the strongest performers across earnings, referrals, and participation</h2>
            </div>

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

          <section className="community-events glass-panel">
            <div className="community-section-heading community-section-heading--row">
              <div>
                <span className="community-section-heading__eyebrow muted-text">Upcoming Events</span>
                <h2 className="community-section-heading__title">Upcoming sessions and notices</h2>
              </div>
              <button type="button" className="section-refresh-btn" onClick={refreshEvents}>
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
                      Check back soon for AMAs, contests, and official community sessions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="community-spotlight glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">Spotlight</span>
              <h2 className="community-section-heading__title">Key milestones and your current standing</h2>
            </div>

            <div className="community-spotlight__card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(29, 233, 182, 0.06), rgba(77, 163, 255, 0.03))' }}>
              <span className="community-spotlight__label muted-text">
                <GiTrophyCup size={14} style={{ marginRight: '6px', color: '#FFD700' }} />
                Milestone
              </span>
              <strong className="community-spotlight__value">
                {formatWhole(publicReadStats.totalParticipants || communityGlobalStats.totalUsers)} Participants
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
                {memberSummary.activeLevelsCount} active levels • Continue your progression
              </p>
            </div>

            <div
              className="community-spotlight__card glass-panel"
              style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(29, 233, 182, 0.03))' }}
            >
              <span className="community-spotlight__label muted-text">
                <FaCoins size={14} style={{ marginRight: '6px', color: '#f59e0b' }} />
                Token Snapshot
              </span>

              <div className="token-snapshot-grid">
                <div className="token-snapshot-chip">
                  <span className="token-snapshot-chip__icon token-snapshot-chip__icon--image">
                    <img  src={TOKEN_IMAGES.fgt}  alt="FGT token" className="token-snapshot-chip__image" />
                  </span>
                  <div className="token-snapshot-chip__body">
                    <small>FGT </small>
                    <strong>{memberSummary.fgtTotal}</strong>
                  </div>
                </div>

                <div className="token-snapshot-chip">
                  <span className="token-snapshot-chip__icon token-snapshot-chip__icon--image">
                    <img src={TOKEN_IMAGES.fgtr} alt="FGTr token" className="token-snapshot-chip__image" />
                  </span>
                  <div className="token-snapshot-chip__body">
                    <small>FGTr </small>
                    <strong>{memberSummary.fgtrTotal}</strong>
                  </div>
                </div>

                <div className="token-snapshot-chip token-snapshot-chip--wallet">
                  <span className="token-snapshot-chip__icon">
                    <FaWallet size={14} />
                  </span>
                  <div className="token-snapshot-chip__body">
                    <small>Earnings</small>
                    <strong>${memberSummary.totalReceiptEarnings}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="community-resources glass-panel">
            <div className="community-section-heading">
              <span className="community-section-heading__eyebrow muted-text">Resources & Support</span>
              <h2 className="community-section-heading__title">Find support materials and official community channels</h2>
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

      <section className="community-highlights glass-panel">
      <div className="community-section-heading community-section-heading--row">
        <div>
          <span className="community-section-heading__eyebrow muted-text">Announcements</span>
          <h2 className="community-section-heading__title">Important updates, notices, and community headlines</h2>
        </div>
        <button type="button" className="section-refresh-btn" onClick={refreshAnnouncements}>
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