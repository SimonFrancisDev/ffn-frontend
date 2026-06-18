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
import { OverlayProvider } from './components/overlay'
import { ToastProvider, useToast } from './components/feedback'
import { NotificationProvider } from './components/notifications'
import { useCompleteUserData } from './hooks/useUserData'
import { LANGUAGES } from './constants/languages'
import { getApiUrl } from './Services/apiConfig'
import { NETWORK_CONFIG } from './constants/addresses'
import {
  clearAllNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './Services/notificationsApi'
import { fetchTelegramStatus } from './Services/telegramApi'
import { DollarSign, TrendingUp, Wrench, Bell, Calendar, Megaphone } from 'lucide-react'

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

const baseNotifications = []

const BASE_NOTIFICATION_TRANSLATION_KEYS = {
  1: {
    titleKey: 'appNotifications.base.payout.title',
    messageKey: 'appNotifications.base.payout.message',
    timeKey: 'appNotifications.base.payout.time',
  },
  2: {
    titleKey: 'appNotifications.base.levelActivation.title',
    messageKey: 'appNotifications.base.levelActivation.message',
    timeKey: 'appNotifications.base.levelActivation.time',
  },
  3: {
    titleKey: 'appNotifications.base.systemNotice.title',
    messageKey: 'appNotifications.base.systemNotice.message',
    timeKey: 'appNotifications.base.systemNotice.time',
  },
}

const NOTIFICATIONS_STORAGE_KEY = 'finfreedom_notifications_v1'
const NOTIFICATION_READ_STATUS_KEY = 'finfreedom_notification_read_status_v1'
const LANGUAGE_STORAGE_KEY = 'finfreedom_language_v1'
const THEME_STORAGE_KEY = 'finfreedom_theme_v1'
const APP_USER_ID_STORAGE_KEY = 'finfreedom_app_user_id_v1'
const TELEGRAM_PROMPT_DISMISSED_KEY = 'finfreedom_telegram_prompt_dismissed_v1'
const TELEGRAM_PROMPT_SESSION_KEY = 'finfreedom_telegram_prompt_seen_v1'
const EARLY_ACCESS_STORAGE_KEY = 'finfreedom_early_access_v1'
const LAUNCH_GATE_MODE = String(import.meta.env.VITE_LAUNCH_GATE_MODE || 'open').toLowerCase()
const EARLY_ACCESS_CODE = String(import.meta.env.VITE_EARLY_ACCESS_CODE || '').trim()
const PUBLIC_LAUNCH_AT = String(import.meta.env.VITE_PUBLIC_LAUNCH_AT || '').trim()

const scopedStorageKey = (baseKey, wallet) => {
  const suffix = wallet ? String(wallet).trim().toLowerCase() : 'guest'
  return `${baseKey}:${suffix}`
}

const routeMap = {
  '/': 'home',
  '/home': 'home',
  '/about': 'about',
  '/dashboard': 'dashboard',
  '/f-freedom-program': 'fFreedomProgram',
  '/my-tokens': 'myTokens',
  '/activation': 'activation',
  '/ref': 'activation',
  '/orbits': 'orbits',
  '/community': 'community',
  '/support': 'support',
  '/account': 'account',
  '/preferences': 'preferences',
  '/security': 'security',
  '/activity': 'activity',
  '/admin': 'admin',
}



const resolveCurrentPage = (pathname) => {
  if (pathname === '/' || pathname === '/home') return 'home'
  if (pathname.startsWith('/ref/')) return 'activation'
  return routeMap[pathname] || 'home'
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
  // dashboard: 'Dashboard opens from your wallet/account space.',
  // // orbits: 'Orbit details open from a selected level or activation flow.',
  // myTokens: 'My Tokens opens from your account or dashboard space.',
  // account: 'Account opens from the account menu.',
  // preferences: 'Preferences opens from the account menu.',
  // security: 'Security opens from the account menu.',
  // activity: 'Activity opens from notifications, account, or dashboard.',
  // admin: 'Admin opens only from the verified admin menu.',
}

const FLOW_ONLY_PAGES = new Set([
  // 'dashboard',
  // 'orbits',
  // 'myTokens',
  // 'account',
  // 'preferences',
  // 'security',
  // 'activity',
])

const isInternalNavigationState = (state) => {
  return Boolean(state?.ffnInternalNavigation)
}

const getInitialNotifications = () => {
  return baseNotifications
}

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'en'

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    const matched = LANGUAGES.find((language) => language.code === stored)
    if (matched) return matched.code

    const detectedLanguage = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
    const detectedMatch = LANGUAGES.find((language) => language.code === detectedLanguage)
    return detectedMatch ? detectedMatch.code : 'en'
  } catch (error) {
    console.error('Failed to read stored language:', error)
    return 'en'
  }
}

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark'

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark'
  } catch (error) {
    console.error('Failed to read stored theme:', error)
    return 'dark'
  }
}

const resolveThemeMode = (theme) => {
  if (theme !== 'system') return theme
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const formatLaunchCountdown = (nowMs) => {
  const configuredTarget = PUBLIC_LAUNCH_AT ? Date.parse(PUBLIC_LAUNCH_AT) : NaN
  if (!Number.isFinite(configuredTarget)) return '00:00:00'

  const targetMs = configuredTarget
  const remaining = Math.max(0, targetMs - nowMs)
  const hours = Math.floor(remaining / 3600000)
  const minutes = Math.floor((remaining % 3600000) / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

const getLaunchTargetMs = () => {
  const configuredTarget = PUBLIC_LAUNCH_AT ? Date.parse(PUBLIC_LAUNCH_AT) : NaN
  return Number.isFinite(configuredTarget) ? configuredTarget : null
}

const formatLaunchUtcText = (targetMs) => {
  if (!targetMs) return 'Opening soon'
  const date = new Date(targetMs)
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${month} ${day}, ${year}, ${hours}:${minutes} UTC`
}

const isLaunchGateOpen = (nowMs = Date.now()) => {
  if (LAUNCH_GATE_MODE === 'open') return true

  if (LAUNCH_GATE_MODE !== 'early' && LAUNCH_GATE_MODE !== 'closed') return true

  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  const suppliedCode = params.get('access') || params.get('code') || ''
  if (EARLY_ACCESS_CODE && suppliedCode === EARLY_ACCESS_CODE) {
    window.sessionStorage.setItem(EARLY_ACCESS_STORAGE_KEY, '1')
    return true
  }

  if (LAUNCH_GATE_MODE === 'early') {
    const launchTargetMs = getLaunchTargetMs()
    if (launchTargetMs && nowMs >= launchTargetMs) return true
  }

  return window.sessionStorage.getItem(EARLY_ACCESS_STORAGE_KEY) === '1'
}

const applyStoredAccent = () => {
  if (typeof window === 'undefined') return
  const accents = {
    default: '#1de9b6',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    gold: '#f59e0b',
  }
  const accent = accents[window.localStorage.getItem('ffn_accent')] || accents.default
  document.documentElement.style.setProperty('--glow-teal', accent)
  document.documentElement.style.setProperty('--glow-blue', accent)
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

function LaunchGate({ nowMs }) {
  const countdown = formatLaunchCountdown(nowMs)
  const launchText = PUBLIC_LAUNCH_AT ? formatLaunchUtcText(getLaunchTargetMs()) : 'Stay tuned'

  return (
    <main className="launch-gate">
      <section className="launch-gate__card">
        <div className="launch-gate__logo-wrap">
          <img
            src="/images/official_logo_2.png"
            alt="Fin Freedom Network"
            className="launch-gate__logo"
          />
        </div>
        <p className="launch-gate__eyebrow">Fin Freedom Network</p>
        <h1 className="launch-gate__title">
          <span>Launching</span>
          <strong>Soon</strong>
        </h1>
        <p className="launch-gate__text">Launching soon. Stay tuned.</p>
        <div className="launch-gate__countdown" aria-label={`Time left: ${countdown}`}>
          {countdown}
        </div>
        <p className="launch-gate__note">{launchText}</p>
      </section>
    </main>
  )
}

function TelegramLinkPrompt({ walletAccount, isConnected, currentPage, onNavigate }) {
  const toast = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    if (!isConnected || !walletAccount || currentPage === 'preferences') return undefined
    if (typeof window === 'undefined') return undefined

    const normalizedWallet = walletAccount.toLowerCase()
    const dismissedKey = `${TELEGRAM_PROMPT_DISMISSED_KEY}:${normalizedWallet}`
    const sessionKey = `${TELEGRAM_PROMPT_SESSION_KEY}:${normalizedWallet}`

    if (
      window.localStorage.getItem(dismissedKey) === '1' ||
      window.sessionStorage.getItem(sessionKey) === '1'
    ) {
      return undefined
    }

    let cancelled = false
    const timerId = window.setTimeout(async () => {
      try {
        const status = await fetchTelegramStatus(walletAccount)
        if (cancelled || status?.status === 'active') return

        const promptId = `telegram-link-prompt:${normalizedWallet}`
        window.sessionStorage.setItem(sessionKey, '1')
        toast.info(
          t(
            'appNotifications.telegramPrompt.message',
            'Link Telegram to receive wallet alerts, payout updates, and system notices instantly.'
          ),
          {
            title: t('appNotifications.telegramPrompt.title', 'Telegram alerts'),
            emoji: '💬',
            variant: 'telegram',
            timeoutMs: 14000,
            id: promptId,
            dedupeKey: promptId,
            action: (
              <button
                type="button"
                className="ffn-toast__action-button"
                onClick={() => {
                  onNavigate('preferences')
                  toast.dismissToast(promptId, 'action')
                }}
              >
                {t('appNotifications.telegramPrompt.action', 'Open Preferences')}
              </button>
            ),
            onDismiss: (reason) => {
              if (reason === 'manual') {
                window.localStorage.setItem(dismissedKey, '1')
              }
            },
          }
        )
      } catch (error) {
        if (!cancelled) {
          console.warn('Telegram status prompt check failed:', error)
        }
      }
    }, 1800)

    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [currentPage, isConnected, onNavigate, t, toast, walletAccount])

  return null
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
  const [launchNowMs, setLaunchNowMs] = useState(Date.now())

  const {
    account: walletAccount,
    balance,
    isConnected,
    isLoading: isWalletLoading,
    error: walletError,
    walletLabel,
    hasMobileWalletSupport,
    connect,
    disconnect,
    switchToConfiguredNetwork,
  } = useWallet()

  const { contracts, loadContracts } = useContracts()
  const launchGateOpen = isLaunchGateOpen(launchNowMs)

  const {
    summary: userSummary,
    referrals: userReferrals,
    downline: userDownline,
  } = useCompleteUserData(walletAccount, isConnected)

  useEffect(() => {
    setInternalUserId(getOrCreateInternalUserId())
    applyStoredAccent()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const returnRoute = window.sessionStorage.getItem('ffn_profile_privacy_return_route')
    if (!returnRoute) return

    const currentRoute = `${location.pathname}${location.search}${location.hash}`
    if (returnRoute !== currentRoute) {
      navigate(returnRoute, { replace: true })
    }
  }, [location.hash, location.pathname, location.search, navigate])

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
    const applyResolvedTheme = () => {
      document.documentElement.setAttribute('data-theme', resolveThemeMode(theme))
    }

    applyResolvedTheme()

    if (theme !== 'system') return undefined
    const media = window.matchMedia?.('(prefers-color-scheme: light)')
    media?.addEventListener?.('change', applyResolvedTheme)
    return () => media?.removeEventListener?.('change', applyResolvedTheme)
  }, [theme])

  useEffect(() => {
    const interval = window.setInterval(() => setLaunchNowMs(Date.now()), 73)
    return () => window.clearInterval(interval)
  }, [])

  const fetchCommunityNotifications = useCallback(async () => {
    try {
      const [announcementsRes, eventsRes] = await Promise.all([
        fetch(getApiUrl('/api/community/announcements')),
        fetch(getApiUrl('/api/community/events')),
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
              window.localStorage.getItem(scopedStorageKey(NOTIFICATION_READ_STATUS_KEY, walletAccount)) || '{}'
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
  }, [walletAccount])

  const fetchBackendNotifications = useCallback(async () => {
    if (!isConnected || !walletAccount) return []

    try {
      const response = await fetchNotifications({ wallet: walletAccount, limit: 50 })
      return (response.items || []).map((item) => ({
        id: item._id || item.id,
        titleKey: item.titleKey,
        title: item.notificationType?.replace(/_/g, ' ') || 'Notification',
        messageKey: item.messageKey,
        message: item.notificationType?.replace(/_/g, ' ') || '',
        detailKey: item.detailKey,
        detail: '',
        time: item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
        icon: Bell,
        iconColor:
          item.severity === 'success'
            ? '#22c55e'
            : item.severity === 'warning'
              ? '#f59e0b'
              : item.severity === 'danger' || item.severity === 'critical'
                ? '#ef4444'
                : '#3b82f6',
        type: item.notificationType,
        noticeType: item.severity || 'info',
        read: item.status === 'read',
        route: item.route || 'activity',
        createdAt: item.createdAt,
        i18nParams: item.i18nParams || {},
        source: 'backend',
      }))
    } catch (err) {
      console.error('Failed to fetch backend notifications:', err)
      return []
    }
  }, [isConnected, walletAccount])

  const refreshNotifications = useCallback(async () => {
    const backendNotifs = await fetchBackendNotifications()
    const storedReadStatus =
      typeof window !== 'undefined'
        ? JSON.parse(
            window.localStorage.getItem(scopedStorageKey(NOTIFICATION_READ_STATUS_KEY, walletAccount)) || '{}'
          )
        : {}

    const allNotifications = backendNotifs.map(
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
  }, [fetchBackendNotifications, walletAccount])

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
        scopedStorageKey(NOTIFICATIONS_STORAGE_KEY, walletAccount),
        JSON.stringify(serializable)
      )
    } catch (error) {
      console.error('Failed to persist notifications:', error)
    }
  }, [notifications, walletAccount])

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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history) return undefined

    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    return () => {
      window.history.scrollRestoration = previousRestoration
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const targetSection = location.hash?.replace('#', '') || location.state?.targetSection
    const scrollPage = () => {
      if (targetSection && typeof document !== 'undefined') {
        const target = document.getElementById(targetSection)
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
          return
        }
      }

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      })
    }

    let timeoutId
    const frame = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(scrollPage, targetSection ? 120 : 0)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [location.hash, location.key, location.pathname, location.search, location.state])

  const closeAllUtilities = useCallback(() => {
    setIsNotificationsOpen(false)
    setIsLanguageOpen(false)
    setIsWalletOpen(false)
    setIsAccountOpen(false)
  }, [])

  const resolvedNavItems = useMemo(() => {
    // const current = routeMap[location.pathname] || 'home'
    const current = resolveCurrentPage(location.pathname)

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
        // fromPage: routeMap[location.pathname] || 'home',
        fromPage: resolveCurrentPage(location.pathname),
        openedAt: Date.now(),
        targetSection: section,
        ...options,
      }

      if (location.pathname !== nextPath) {
        navigate(nextPath, {
          state: navigationState,
        })
      } else if (section) {
        scrollToSection()
      } else {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto',
        })
      }

      setIsDrawerOpen(false)
      closeAllUtilities()
    },
    [closeAllUtilities, location.pathname, navigate]
  )

  const handleToggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  const handleSetTheme = useCallback((nextTheme) => {
    if (!['dark', 'light', 'system'].includes(nextTheme)) return
    setTheme(nextTheme)
  }, [])

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

  const handleSetLanguageCode = useCallback((languageCode) => {
    const matched = LANGUAGES.find((language) => language.code === languageCode)
    if (!matched) return
    setCurrentLanguage(matched.code)
  }, [])

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
        scopedStorageKey(NOTIFICATION_READ_STATUS_KEY, walletAccount),
        JSON.stringify(nextReadStatus)
      )
    }

    if (walletAccount) {
      markAllNotificationsRead(walletAccount).catch((error) => {
        console.error('Failed to sync notification read state:', error)
      })
    }
  }

  const handleClearNotifications = useCallback(() => {
    setNotifications([])

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(scopedStorageKey(NOTIFICATIONS_STORAGE_KEY, walletAccount))
      window.localStorage.removeItem(scopedStorageKey(NOTIFICATION_READ_STATUS_KEY, walletAccount))
    }

    if (walletAccount) {
      clearAllNotifications(walletAccount).catch((error) => {
        console.error('Failed to clear backend notifications:', error)
      })
    }
  }, [walletAccount])

  const handleNotificationClick = useCallback(
    (notification) => {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      )

      if (typeof window !== 'undefined') {
        const storedReadStatus = JSON.parse(
          window.localStorage.getItem(scopedStorageKey(NOTIFICATION_READ_STATUS_KEY, walletAccount)) || '{}'
        )
        storedReadStatus[notification.id] = true
        window.localStorage.setItem(
          scopedStorageKey(NOTIFICATION_READ_STATUS_KEY, walletAccount),
          JSON.stringify(storedReadStatus)
        )
      }

      if (notification.source === 'backend' && walletAccount) {
        markNotificationRead(notification.id, walletAccount).catch((error) => {
          console.error('Failed to sync notification read state:', error)
        })
      }

      if (notification.route) {
        handleNavigate(notification.route)
        setIsNotificationsOpen(false)
      }
    },
    [handleNavigate, walletAccount]
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
      network: isConnected ? NETWORK_CONFIG.chainName : 'Not connected',
      provider: walletLabel || (hasMobileWalletSupport ? 'WalletConnect ready' : 'No wallet provider'),
      balance: balance ? Number(balance).toFixed(4) : null,
      isConnected,
      isLoading: isWalletLoading,
      rawAddress: walletAccount || '',
    }
  }, [balance, hasMobileWalletSupport, isConnected, isWalletLoading, walletAccount, walletLabel])

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

    if (typeof window !== 'undefined' && !window.ethereum && !hasMobileWalletSupport) {
      nextNotices.push({
        id: 'wallet-missing',
        type: 'danger',
        label: t('topNotice.walletRequired.label', 'Wallet Required'),
        message: t(
          'topNotice.walletRequired.message',
          'No browser wallet was detected. Enable WalletConnect support or install an EVM-compatible wallet to connect and use live platform data.'
        ),
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
        label: needsNetworkSwitch
          ? t('topNotice.walletError.networkRequired', 'Network Required')
          : t('topNotice.walletError.walletError', 'Wallet Error'),
        message: walletError,
        source: 'wallet',
        sticky: true,
        dismissible: true,
        actionLabel: needsNetworkSwitch
          ? t('topNotice.walletError.switchNetwork', 'Switch Network')
          : t('topNotice.walletError.retry', 'Retry'),
        onAction: needsNetworkSwitch ? switchToConfiguredNetwork : connect,
        dedupeKey: `wallet-error:${walletError}`,
      })
    } else if (isWalletLoading) {
      nextNotices.push({
        id: 'wallet-connecting',
        type: 'info',
        label: t('topNotice.connecting.label', 'Connecting'),
        message: t(
          'topNotice.connecting.message',
          'Connecting your wallet and preparing live platform access.'
        ),
        source: 'wallet',
        sticky: true,
        dismissible: false,
        dedupeKey: 'wallet-connecting',
      })
    } else if (!isConnected) {
      nextNotices.push({
        id: 'wallet-disconnected',
        type: 'info',
        label: t('topNotice.connectWallet.label', 'Connect Wallet'),
        message: t(
          'topNotice.connectWallet.message',
          'Connect your wallet to access live balances, orbit state, and account-linked data.'
        ),
        source: 'wallet',
        sticky: true,
        dismissible: true,
        actionLabel: t('topNotice.connectWallet.action', 'Connect'),
        onAction: connect,
        dedupeKey: 'wallet-disconnected',
      })
    } else if (isConnected && walletAccount) {
      nextNotices.push({
        id: 'wallet-connected',
        type: 'success',
        label: t('topNotice.walletConnected.label', 'Wallet Connected'),
        message: t(
          'topNotice.walletConnected.message',
          'Connected: {{address}}. Live platform data is ready.',
          { address: shortenAddress(walletAccount) }
        ),
        source: 'wallet',
        sticky: false,
        dismissible: true,
        autoHideMs: 5000,
        dedupeKey: `wallet-connected:${walletAccount}`,
      })

    }

    if (latestUnreadNotification) {
      nextNotices.push({
        id: `notification-${latestUnreadNotification.id}`,
        type: latestUnreadNotification.noticeType || 'info',
        label: latestUnreadNotification.titleKey
          ? t(latestUnreadNotification.titleKey, latestUnreadNotification.title)
          : latestUnreadNotification.title,
        message: latestUnreadNotification.messageKey
          ? t(latestUnreadNotification.messageKey, latestUnreadNotification.message)
          : latestUnreadNotification.message,
        source: 'notifications',
        sticky: false,
        dismissible: true,
        autoHideMs: 7000,
        actionLabel: latestUnreadNotification.route
          ? t('topNotice.notification.open', 'Open')
          : '',
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
    hasMobileWalletSupport,
    isConnected,
    isWalletLoading,
    latestUnreadNotification,
    switchToConfiguredNetwork,
    t,
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

    if (!isMultisigOwner) {
      return (
        <RouteAccessFallback
          title="Admin wallet required"
          message="Connect a verified multisig owner wallet to open the admin panel."
        />
      )
    }

    return <AdminPanel />
  }, [adminCheckComplete, isMultisigOwner])

  if (!launchGateOpen) {
    return <LaunchGate nowMs={launchNowMs} />
  }

  return (
    <SessionProvider>
      <SpaceProvider walletAddress={walletAccount}>
        <NotificationProvider walletAddress={walletAccount}>
          <OverlayProvider>
            <ToastProvider>
              <>
          <TelegramLinkPrompt
            walletAccount={walletAccount}
            isConnected={isConnected}
            currentPage={resolveCurrentPage(location.pathname)}
            onNavigate={handleNavigate}
          />
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
              <Route path="/ref/:refCode" element={<ActivationCenterPage />} />

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
                element={renderFlowOnlyPage('preferences', (
                  <PreferencesPage
                    appTheme={theme}
                    onThemeChange={handleSetTheme}
                    appLanguage={currentLanguage}
                    onLanguageChange={handleSetLanguageCode}
                  />
                ))}
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
            </ToastProvider>
          </OverlayProvider>
        </NotificationProvider>
      </SpaceProvider>
    </SessionProvider>
  )
}

export default App
