import { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from './i18n'
import AppShell from './components/Layout/AppShell/AppShell'
import TopNoticeBar from './components/Layout/TopNoticeBar/TopNoticeBar'
import MainNavbar from './components/Layout/MainNavbar/MainNavbar'
import Footer from './components/Footer/Footer'
import MobileDrawer from './components/Layout/MobileDrawer/MobileDrawer'
import LandingPage from './Pages/Landing/LandingPage'
import FFreedomProgramPage from './Pages/FFreedomProgram/FFreedomProgramPage'
import AboutPage from './Pages/About/AboutPage'
import DashboardPage from './Pages/Dashboard/DashboardPage'
import ActivationCenterPage from './Pages/ActivationCenter/ActivationCenterPage'
import { MyTokens } from './Pages/MyTokens/MyTokens';
import OrbitsPage from './Pages/Orbits/OrbitsPage'
import CommunityPage from './Pages/Community/CommunityPage'
import SupportPage from './Pages/Support/SupportPage'
import AccountPage from './Pages/Account/AccountPage'
import PreferencesPage from './Pages/Preferences/PreferencesPage'
import SecurityPage from './Pages/Security/SecurityPage'
import ActivityPage from './Pages/Activity/ActivityPage'
import { AdminPanel } from './Pages/AdminPanel'
import NotificationModal from './components/Modals/NotificationModal/NotificationModal'
import { useWallet } from './hooks/useWallet'
import { useContracts } from './hooks/useContracts'
import useAppDirection from './hooks/useAppDirection'
import { SpaceProvider } from './context/SpaceContext'
import { SessionProvider } from './context/SessionContext'
import { useCompleteUserData } from './hooks/useUserData'
import { LANGUAGES } from './constants/languages'
import { DollarSign, TrendingUp, Wrench, Bell, Calendar, Megaphone } from 'lucide-react'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'https://fin-freedom-backend-3.onrender.com'

// const navItems = [
//   { label: 'Home', href: 'home', active: false },
//   { label: 'About Us', href: 'about', active: false },
//   { label: 'Dashboard', href: 'dashboard', active: false },
//   { label: 'Activation Center', href: 'activation', active: false },
//   { label: 'Orbits', href: 'orbits', active: false },
//   { label: 'Community', href: 'community', active: false },
//   { label: 'Support', href: 'support', active: false },
// ]

const navItems = [
  { label: 'Home', href: 'home', active: false },
  { label: 'About Us', href: 'about', active: false },
  { label: 'Community', href: 'community', active: false },
  { label: 'Support', href: 'support', active: false },
]

const baseNotifications = [
  {
    id: '1',
    title: 'New payout received',
    message: 'A payout has been recorded in your account activity.',
    time: '2m ago',
    icon: DollarSign,
    iconColor: '#22c55e',
    read: false,
    route: 'activity',
    noticeType: 'success',
  },
  {
    id: '2',
    title: 'Level activation available',
    message: 'You now meet the requirements to activate the next level.',
    time: '15m ago',
    icon: TrendingUp,
    iconColor: '#3b82f6',
    read: false,
    route: 'activation',
    noticeType: 'info',
  },
  {
    id: '3',
    title: 'System notice',
    message: 'Routine maintenance has been scheduled for this weekend.',
    time: '1h ago',
    icon: Wrench,
    iconColor: '#f59e0b',
    read: true,
    route: 'support',
    noticeType: 'warning',
  },
]

const NOTIFICATIONS_STORAGE_KEY = 'finfreedom_notifications_v1'
const NOTIFICATION_READ_STATUS_KEY = 'finfreedom_notification_read_status_v1'
const LANGUAGE_STORAGE_KEY = 'finfreedom_language_v1'
const THEME_STORAGE_KEY = 'finfreedom_theme_v1'
const APP_USER_ID_STORAGE_KEY = 'finfreedom_app_user_id_v1'

const routeMap = {
  '/': 'home',
  '/home': 'home',
  '/about': 'about',
  '/dashboard': 'dashboard',
  '/f-freedom-program': 'fFreedomProgram',
  '/my-tokens': 'myTokens',
  '/activation': 'activation',
  '/orbits': 'orbits',
  '/community': 'community',
  '/support': 'support',
  '/account': 'account',
  '/preferences': 'preferences',
  '/security': 'security',
  '/activity': 'activity',
  '/admin': 'admin',
}

const pageToPathMap = {
  home: '/home',
  about: '/about',
  dashboard: '/dashboard',
  fFreedomProgram: '/f-freedom-program',
  myTokens: '/my-tokens', // Add this
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

const ROUTE_ACCESS_REASON = {
  dashboard: 'Dashboard opens from your wallet/account space.',
  activation: 'Activation Center opens from the F-Freedom Program or wallet flow.',
  orbits: 'Orbit details open from a selected level or activation flow.',
  myTokens: 'My Tokens opens from your account or dashboard space.',
  account: 'Account opens from the account menu.',
  preferences: 'Preferences opens from the account menu.',
  security: 'Security opens from the account menu.',
  activity: 'Activity opens from notifications, account, or dashboard.',
  admin: 'Admin opens only from the verified admin menu.',
}

const FLOW_ONLY_PAGES = new Set([
  'dashboard',
  'activation',
  'orbits',
  'myTokens',
  'account',
  'preferences',
  'security',
  'activity',
])

const isInternalNavigationState = (state) => {
  return Boolean(state?.ffnInternalNavigation)
}

const getInitialNotifications = () => {
  if (typeof window === 'undefined') return baseNotifications

  try {
    const stored = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    if (!stored) return baseNotifications

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return baseNotifications

    return parsed.map((n) => ({
      ...n,
      icon:
        n.iconName === 'DollarSign'
          ? DollarSign
          : n.iconName === 'TrendingUp'
            ? TrendingUp
            : n.iconName === 'Wrench'
              ? Wrench
              : n.iconName === 'Megaphone'
                ? Megaphone
                : n.iconName === 'Calendar'
                  ? Calendar
                  : n.iconName === 'Bell'
                    ? Bell
                    : Bell,
    }))
  } catch (error) {
    console.error('Failed to read stored notifications:', error)
    return baseNotifications
  }
}

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'en'

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    const matched = LANGUAGES.find((language) => language.code === stored)
    return matched ? matched.code : 'en'
  } catch (error) {
    console.error('Failed to read stored language:', error)
    return 'en'
  }
}

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark'

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'dark'
  } catch (error) {
    console.error('Failed to read stored theme:', error)
    return 'dark'
  }
}

const createInternalUserId = () => {
  if (typeof window === 'undefined') return ''

  if (window.crypto?.randomUUID) {
    return `ffn-${window.crypto.randomUUID()}`
  }

  return `ffn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const getOrCreateInternalUserId = () => {
  if (typeof window === 'undefined') return ''

  try {
    let stored = window.localStorage.getItem(APP_USER_ID_STORAGE_KEY)

    if (!stored) {
      stored = createInternalUserId()
      window.localStorage.setItem(APP_USER_ID_STORAGE_KEY, stored)
    }

    return stored
  } catch (error) {
    console.error('Failed to initialize internal user id:', error)
    return ''
  }
}

const shortenAddress = (address) => {
  if (!address) return 'No wallet connected'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const cleanOldNotifications = (notifications) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return notifications.filter((n) => {
    if (!n.read) return true
    if (!n.createdAt) return true
    return new Date(n.createdAt) > thirtyDaysAgo
  })
}

function RouteAccessFallback({ title = 'Page access required', message }) {
  return (
    <div className="route-access-fallback">
      <section className="route-access-fallback__card">
        <p className="route-access-fallback__eyebrow">Fin Freedom Network</p>
        <h1>{title}</h1>
        <p>
          {message ||
            'This page is part of a guided platform flow. Please open it from the correct button, menu, or account section.'}
        </p>
        <a href="/home" className="route-access-fallback__button">
          Return Home
        </a>
      </section>
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  useAppDirection()

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [theme, setTheme] = useState(getInitialTheme)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [isWalletOpen, setIsWalletOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState(getInitialLanguage)
  const [notifications, setNotifications] = useState(getInitialNotifications)
  const [isMultisigOwner, setIsMultisigOwner] = useState(false)
  const [adminCheckComplete, setAdminCheckComplete] = useState(false)
  const [internalUserId, setInternalUserId] = useState('')
  const [modalNotification, setModalNotification] = useState(null)

  const {
    account: walletAccount,
    balance,
    isConnected,
    isLoading: isWalletLoading,
    error: walletError,
    connect,
    disconnect,
    switchToAmoy,
  } = useWallet()

  const { contracts, loadContracts } = useContracts()

  const {
    summary: userSummary,
    referrals: userReferrals,
    downline: userDownline,
  } = useCompleteUserData(walletAccount, isConnected)

  useEffect(() => {
    setInternalUserId(getOrCreateInternalUserId())
  }, [])

  useEffect(() => {
    const normalizedLanguage = currentLanguage || 'en'
    i18n.changeLanguage(normalizedLanguage)
  }, [currentLanguage])

  useEffect(() => {
    const checkMultisigOwner = async () => {
      if (!isConnected || !contracts?.simpleMultiSig || !walletAccount) {
        setIsMultisigOwner(false)
        setAdminCheckComplete(true)
        return
      }

      try {
        const isOwner = await contracts.simpleMultiSig.isOwner(walletAccount)
        setIsMultisigOwner(Boolean(isOwner))
      } catch (err) {
        console.error('Error checking multisig owner status:', err)
        setIsMultisigOwner(false)
      } finally {
        setAdminCheckComplete(true)
      }
    }

    checkMultisigOwner()
  }, [isConnected, contracts, walletAccount])

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const fetchCommunityNotifications = useCallback(async () => {
    try {
      const [announcementsRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/community/announcements`),
        fetch(`${API_BASE_URL}/api/community/events`),
      ])

      const announcementsData = await announcementsRes
        .json()
        .catch(() => ({ data: { items: [] } }))
      const eventsData = await eventsRes
        .json()
        .catch(() => ({ data: { items: [] } }))

      const announcements = announcementsData?.data?.items || []
      const events = eventsData?.data?.items || []

      const storedReadStatus =
        typeof window !== 'undefined'
          ? JSON.parse(
              window.localStorage.getItem(NOTIFICATION_READ_STATUS_KEY) || '{}'
            )
          : {}

      return [
        ...announcements.map((a) => ({
          id: `announcement-${a._id}`,
          title: a.title,
          message:
            a.content?.slice(0, 80) + (a.content?.length > 80 ? '...' : ''),
          time: a.date || new Date(a.createdAt).toLocaleDateString(),
          icon: Megaphone,
          iconColor: '#1de9b6',
          type: 'announcement',
          fullContent: a.content,
          noticeType: a.type || 'info',
          read: storedReadStatus[`announcement-${a._id}`] || false,
          createdAt: a.createdAt,
        })),
        ...events.map((e) => ({
          id: `event-${e._id}`,
          title: e.title,
          message:
            e.content?.slice(0, 80) + (e.content?.length > 80 ? '...' : ''),
          time: e.date || new Date(e.createdAt).toLocaleDateString(),
          icon: Calendar,
          iconColor: '#f59e0b',
          type: 'event',
          fullContent: e.content,
          ctaUrl: e.ctaUrl,
          ctaLabel: e.ctaLabel,
          noticeType: 'info',
          read: storedReadStatus[`event-${e._id}`] || false,
          createdAt: e.createdAt,
        })),
      ]
    } catch (err) {
      console.error('Failed to fetch community notifications:', err)
      return []
    }
  }, [])

  const refreshNotifications = useCallback(async () => {
    const communityNotifs = await fetchCommunityNotifications()

    const storedNotifications = getInitialNotifications()
    const storedReadStatus =
      typeof window !== 'undefined'
        ? JSON.parse(
            window.localStorage.getItem(NOTIFICATION_READ_STATUS_KEY) || '{}'
          )
        : {}

    const allNotifications = [...storedNotifications, ...communityNotifs].map(
      (n) => ({
        ...n,
        read:
          storedReadStatus[n.id] !== undefined ? storedReadStatus[n.id] : n.read,
      })
    )

    const uniqueNotifications = allNotifications.filter(
      (n, i, arr) => arr.findIndex((x) => x.id === n.id) === i
    )

    uniqueNotifications.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
      return dateB - dateA
    })

    const cleaned = cleanOldNotifications(uniqueNotifications)
    setNotifications(cleaned.slice(0, 50))
  }, [fetchCommunityNotifications])

  useEffect(() => {
    refreshNotifications()

    const interval = window.setInterval(refreshNotifications, 120000)
    return () => window.clearInterval(interval)
  }, [refreshNotifications])

  useEffect(() => {
    try {
      const serializable = notifications.map((n) => ({
        ...n,
        iconName:
          n.icon === DollarSign
            ? 'DollarSign'
            : n.icon === TrendingUp
              ? 'TrendingUp'
              : n.icon === Wrench
                ? 'Wrench'
                : n.icon === Megaphone
                  ? 'Megaphone'
                  : n.icon === Calendar
                    ? 'Calendar'
                    : n.icon === Bell
                      ? 'Bell'
                      : 'Bell',
        icon: undefined,
      }))
      window.localStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(serializable)
      )
    } catch (error) {
      console.error('Failed to persist notifications:', error)
    }
  }, [notifications])

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage)
    } catch (error) {
      console.error('Failed to persist language:', error)
    }
  }, [currentLanguage])

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) {
      console.error('Failed to persist theme:', error)
    }
  }, [theme])

  const closeAllUtilities = useCallback(() => {
    setIsNotificationsOpen(false)
    setIsLanguageOpen(false)
    setIsWalletOpen(false)
    setIsAccountOpen(false)
  }, [])

  const resolvedNavItems = useMemo(() => {
    const current = routeMap[location.pathname] || 'home'

    return navItems.map((item) => ({
      ...item,
      active: item.href === current,
      label: t(`navbar.navItems.${item.href}`, item.label),
    }))
  }, [location.pathname, t])

  const handleNavigate = useCallback(
    (page, section, options = {}) => {
      const nextPath = pageToPathMap[page] || '/home'

      const scrollToSection = () => {
        if (!section || typeof document === 'undefined') return

        window.setTimeout(() => {
          const target = document.getElementById(section)
          if (!target) return

          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }, 120)
      }

      const navigationState = {
        ffnInternalNavigation: true,
        fromPath: location.pathname,
        fromPage: routeMap[location.pathname] || 'home',
        openedAt: Date.now(),
        ...options,
      }

      if (location.pathname !== nextPath) {
        navigate(nextPath, {
          state: navigationState,
        })
        scrollToSection()
      } else {
        scrollToSection()
      }

      setIsDrawerOpen(false)
      closeAllUtilities()
    },
    [closeAllUtilities, location.pathname, navigate]
  )

  const handleToggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  const handleToggleNotifications = () => {
    setIsLanguageOpen(false)
    setIsWalletOpen(false)
    setIsAccountOpen(false)
    setIsNotificationsOpen((current) => !current)
  }

  const handleOpenNotifications = () => {
    setIsLanguageOpen(false)
    setIsWalletOpen(false)
    setIsAccountOpen(false)
    setIsNotificationsOpen(true)
  }

  const handleCloseNotifications = () => {
    setIsNotificationsOpen(false)
  }

  const handleToggleLanguage = () => {
    setIsNotificationsOpen(false)
    setIsWalletOpen(false)
    setIsAccountOpen(false)
    setIsLanguageOpen((current) => !current)
  }

  const handleOpenLanguage = () => {
    setIsNotificationsOpen(false)
    setIsWalletOpen(false)
    setIsAccountOpen(false)
    setIsLanguageOpen(true)
  }

  const handleCloseLanguage = () => {
    setIsLanguageOpen(false)
  }

  const handleSelectLanguage = (language) => {
    if (!language?.code) return
    setCurrentLanguage(language.code)
    setIsLanguageOpen(false)
  }

  const handleToggleWallet = () => {
    setIsNotificationsOpen(false)
    setIsLanguageOpen(false)
    setIsAccountOpen(false)
    setIsWalletOpen((current) => !current)
  }

  const handleOpenWallet = () => {
    setIsNotificationsOpen(false)
    setIsLanguageOpen(false)
    setIsAccountOpen(false)
    setIsWalletOpen(true)
  }

  const handleCloseWallet = () => {
    setIsWalletOpen(false)
  }

  const handleToggleAccount = () => {
    setIsNotificationsOpen(false)
    setIsLanguageOpen(false)
    setIsWalletOpen(false)
    setIsAccountOpen((current) => !current)
  }

  const handleOpenAccount = () => {
    setIsNotificationsOpen(false)
    setIsLanguageOpen(false)
    setIsWalletOpen(false)
    setIsAccountOpen(true)
  }

  const handleCloseAccount = () => {
    setIsAccountOpen(false)
  }

  const handleMarkAllNotificationsRead = () => {
    const nextReadStatus = {}

    setNotifications((current) =>
      current.map((item) => {
        nextReadStatus[item.id] = true
        return {
          ...item,
          read: true,
        }
      })
    )

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        NOTIFICATION_READ_STATUS_KEY,
        JSON.stringify(nextReadStatus)
      )
    }
  }

  const handleClearNotifications = useCallback(() => {
    setNotifications([])

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY)
      window.localStorage.removeItem(NOTIFICATION_READ_STATUS_KEY)
    }
  }, [])

  const handleNotificationClick = useCallback(
    (notification) => {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      )

      if (typeof window !== 'undefined') {
        const storedReadStatus = JSON.parse(
          window.localStorage.getItem(NOTIFICATION_READ_STATUS_KEY) || '{}'
        )
        storedReadStatus[notification.id] = true
        window.localStorage.setItem(
          NOTIFICATION_READ_STATUS_KEY,
          JSON.stringify(storedReadStatus)
        )
      }

      if (notification.route) {
        handleNavigate(notification.route)
        setIsNotificationsOpen(false)
      }
    },
    [handleNavigate]
  )

  const wallet = useMemo(() => {
    const status = isWalletLoading
      ? 'Connecting'
      : isConnected
        ? 'Connected'
        : 'Disconnected'

    return {
      status,
      address: walletAccount
        ? shortenAddress(walletAccount)
        : 'No wallet connected',
      network: isConnected ? 'Polygon Amoy Testnet' : 'Not connected',
      provider:
    typeof window !== 'undefined' && window.ethereum
      ? 'Browser Wallet'
      : 'No wallet provider',
      balance: balance ? Number(balance).toFixed(4) : null,
      isConnected,
      isLoading: isWalletLoading,
      rawAddress: walletAccount || '',
    }
  }, [balance, isConnected, isWalletLoading, walletAccount])

  const account = useMemo(() => {
    const walletDisplay = walletAccount
      ? shortenAddress(walletAccount)
      : 'No wallet connected'

    return {
      initials: 'U',
      name: walletDisplay,
      status: isConnected ? 'Active' : 'Disconnected',
      level: userSummary?.highestActiveLevel || 1,
      rawAddress: walletAccount || '',
      internalUserId,
      totalEarnings: userSummary?.totalReceiptEarnings || '0.00',
      fgtBalance: userSummary?.fgtAvailable || '0.00',
      fgtrBalance: userSummary?.fgtrAvailable || '0.00',
      totalReferrals: userReferrals?.totalReferrals || 0,
      commissionEarned: userReferrals?.commissionEarnedLiquid || '0.00',
      networkSize: userDownline?.total || 0,
      isRegistered: Boolean(userSummary?.isRegistered),
    }
  }, [
    internalUserId,
    isConnected,
    walletAccount,
    userSummary,
    userReferrals,
    userDownline,
  ])

  const latestUnreadNotification = useMemo(() => {
    return notifications.find((item) => !item.read) || null
  }, [notifications])

  const notices = useMemo(() => {
    const nextNotices = []

    if (typeof window !== 'undefined' && !window.ethereum) {
      nextNotices.push({
        id: 'wallet-missing',
        type: 'danger',
        label: 'Wallet Required',
        message:
          'No compatible browser wallet was detected. Install MetaMask or another EVM-compatible wallet to connect and use live platform data.',
        source: 'wallet',
        sticky: true,
        dismissible: false,
        dedupeKey: 'wallet-missing',
      })
      return nextNotices
    }

    if (walletError) {
      const lowerWalletError = walletError.toLowerCase()
      const needsNetworkSwitch =
        lowerWalletError.includes('switch') ||
        lowerWalletError.includes('amoy') ||
        lowerWalletError.includes('polygon')

      nextNotices.push({
        id: 'wallet-error',
        type: needsNetworkSwitch ? 'warning' : 'danger',
        label: needsNetworkSwitch ? 'Network Required' : 'Wallet Error',
        message: walletError,
        source: 'wallet',
        sticky: true,
        dismissible: true,
        actionLabel: needsNetworkSwitch ? 'Switch Network' : 'Retry',
        onAction: needsNetworkSwitch ? switchToAmoy : connect,
        dedupeKey: `wallet-error:${walletError}`,
      })
    } else if (isWalletLoading) {
      nextNotices.push({
        id: 'wallet-connecting',
        type: 'info',
        label: 'Connecting',
        message:
          'Connecting your wallet and preparing live platform access.',
        source: 'wallet',
        sticky: true,
        dismissible: false,
        dedupeKey: 'wallet-connecting',
      })
    } else if (!isConnected) {
      nextNotices.push({
        id: 'wallet-disconnected',
        type: 'info',
        label: 'Connect Wallet',
        message:
          'Connect your wallet to access live balances, orbit state, and account-linked data.',
        source: 'wallet',
        sticky: true,
        dismissible: true,
        actionLabel: 'Connect',
        onAction: connect,
        dedupeKey: 'wallet-disconnected',
      })
    } else if (isConnected && walletAccount) {
      nextNotices.push({
        id: 'wallet-connected',
        type: 'success',
        label: 'Wallet Connected',
        message: `Connected: ${shortenAddress(walletAccount)}. Live platform data is ready.`,
        source: 'wallet',
        sticky: false,
        dismissible: true,
        autoHideMs: 5000,
        dedupeKey: `wallet-connected:${walletAccount}`,
      })

      nextNotices.push({
        id: 'testnet-reminder',
        type: 'warning',
        label: 'Testnet Notice',
        message:
          'You are connected to Polygon Amoy Testnet. Verify transactions and values before confirming.',
        source: 'network',
        sticky: false,
        dismissible: true,
        autoHideMs: 9000,
        dedupeKey: 'testnet-reminder',
      })
    }

    if (latestUnreadNotification) {
      nextNotices.push({
        id: `notification-${latestUnreadNotification.id}`,
        type: latestUnreadNotification.noticeType || 'info',
        label: latestUnreadNotification.title,
        message: latestUnreadNotification.message,
        source: 'notifications',
        sticky: false,
        dismissible: true,
        autoHideMs: 7000,
        actionLabel: latestUnreadNotification.route ? 'Open' : '',
        onAction: latestUnreadNotification.route
          ? () => handleNotificationClick(latestUnreadNotification)
          : null,
        dedupeKey: `notification:${latestUnreadNotification.id}`,
      })
    }

    return nextNotices
  }, [
    connect,
    handleNotificationClick,
    isConnected,
    isWalletLoading,
    latestUnreadNotification,
    switchToAmoy,
    walletAccount,
    walletError,
  ])

  const hasInternalRouteAccess = isInternalNavigationState(location.state)

  const renderFlowOnlyPage = useCallback(
    (pageKey, element) => {
      if (!FLOW_ONLY_PAGES.has(pageKey)) return element

      if (!hasInternalRouteAccess) {
        return (
          <RouteAccessFallback
            title="Open this page from the app"
            message={ROUTE_ACCESS_REASON[pageKey]}
          />
        )
      }

      return element
    },
    [hasInternalRouteAccess]
  )

  const renderAdminPage = useCallback(() => {
    if (!adminCheckComplete) {
      return (
        <RouteAccessFallback
          title="Checking admin access"
          message="Please connect the verified admin wallet and open this page from the admin menu."
        />
      )
    }

    if (!hasInternalRouteAccess || !isMultisigOwner) {
      return <Navigate to="/home" replace />
    }

    return <AdminPanel />
  }, [adminCheckComplete, hasInternalRouteAccess, isMultisigOwner])

  return (
    <SessionProvider>
      <SpaceProvider walletAddress={walletAccount}>
        <>
          <AppShell
            fullWidth={location.pathname === '/' || location.pathname === '/home'}
            topbar={<TopNoticeBar notices={notices} />}
            navbar={
              <MainNavbar
                brand="Fin Freedom"
                navItems={resolvedNavItems}
                onNavigate={handleNavigate}
                onMenuClick={() => setIsDrawerOpen(true)}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                isNotificationsOpen={isNotificationsOpen}
                onToggleNotifications={handleToggleNotifications}
                onCloseNotifications={handleCloseNotifications}
                notifications={notifications}
                onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                onClearNotifications={handleClearNotifications}
                onNotificationClick={handleNotificationClick}
                isLanguageOpen={isLanguageOpen}
                onToggleLanguage={handleToggleLanguage}
                onCloseLanguage={handleCloseLanguage}
                languages={LANGUAGES}
                currentLanguage={currentLanguage}
                onSelectLanguage={handleSelectLanguage}
                isWalletOpen={isWalletOpen}
                onToggleWallet={handleToggleWallet}
                onCloseWallet={handleCloseWallet}
                wallet={wallet}
                isAccountOpen={isAccountOpen}
                onToggleAccount={handleToggleAccount}
                onCloseAccount={handleCloseAccount}
                account={account}
                onConnectWallet={connect}
                onDisconnectWallet={disconnect}
                isAdmin={isMultisigOwner}
                onOpenAdminPanel={() => handleNavigate('admin')}
              />
            }
          >
            <Routes>
              <Route path="/" element={<LandingPage onNavigate={handleNavigate} />} />
              <Route path="/home" element={<LandingPage onNavigate={handleNavigate} />} />

              <Route
                path="/f-freedom-program"
                element={<FFreedomProgramPage onNavigate={handleNavigate} />}
              />

              <Route path="/about" element={<AboutPage onNavigate={handleNavigate} />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/support" element={<SupportPage />} />

              <Route
                path="/dashboard"
                element={renderFlowOnlyPage('dashboard', <DashboardPage />)}
              />

              <Route
                path="/activation"
                element={renderFlowOnlyPage('activation', <ActivationCenterPage />)}
              />

              <Route
                path="/orbits"
                element={renderFlowOnlyPage('orbits', <OrbitsPage />)}
              />

              <Route
                path="/account"
                element={renderFlowOnlyPage('account', <AccountPage />)}
              />

              <Route
                path="/preferences"
                element={renderFlowOnlyPage('preferences', <PreferencesPage />)}
              />

              <Route
                path="/security"
                element={renderFlowOnlyPage('security', <SecurityPage />)}
              />

              <Route
                path="/activity"
                element={renderFlowOnlyPage('activity', <ActivityPage />)}
              />

              <Route
                path="/my-tokens"
                element={renderFlowOnlyPage('myTokens', <MyTokens />)}
              />

              <Route path="/admin" element={renderAdminPage()} />

              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
            <Footer
              onNavigate={handleNavigate}
              onOpenProgram={(program) => console.log(program)}
              onOpenLegal={(type) => console.log(type)}
              onOpenSecurityNotice={() => console.log('security')}
            />
          </AppShell>

          <MobileDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            brand="Fin Freedom"
            navItems={resolvedNavItems}
            onNavigate={handleNavigate}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenNotifications={handleOpenNotifications}
            onOpenLanguage={handleOpenLanguage}
            onOpenWallet={handleOpenWallet}
            onOpenAccount={handleOpenAccount}
            account={account}
            wallet={wallet}
            isAdmin={isMultisigOwner}
            onOpenAdminPanel={() => handleNavigate('admin')}
          />

          {modalNotification ? (
            <NotificationModal
              notification={modalNotification}
              onClose={() => setModalNotification(null)}
            />
          ) : null}
        </>
      </SpaceProvider>
    </SessionProvider>
  )
}

export default App