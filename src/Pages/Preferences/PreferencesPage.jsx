import './PreferencesPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../../hooks/useWallet'
import { useSpace } from '../../context/SpaceContext'
import { fetchTelegramStatus, startTelegramLink, unsubscribeTelegram, updateTelegramPreferences } from '../../Services/telegramApi'
import { fetchNotificationPreferences, updateNotificationPreferences } from '../../Services/notificationsApi'
import { useToast } from '../../components/feedback'

const DEFAULT_NOTIFICATIONS = {
  paymentReceived: true,
  paymentSkipped: true,
  escrow: true,
  autoUpgrade: true,
  recycle: true,
  tokenRewards: true,
  systemNotices: true,
  communityNotices: true,
}

const ACCENT_STYLES = [
  { id: 'default', nameKey: 'accent.defaultGlow', fallback: 'Default Glow', color: '#1de9b6' },
  { id: 'blue', nameKey: 'accent.oceanBlue', fallback: 'Ocean Blue', color: '#3b82f6' },
  { id: 'purple', nameKey: 'accent.royalPurple', fallback: 'Royal Purple', color: '#8b5cf6' },
  { id: 'gold', nameKey: 'accent.golden', fallback: 'Golden', color: '#f59e0b' },
]
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },      // Hindi
  { code: 'ko', label: '한국어' },      // Korean
  { code: 'fa', label: 'فارسی' },      // Persian
  { code: 'zh', label: '中文' },       // Chinese
  { code: 'it', label: 'Italiano' },   // Italian
  { code: 'id', label: 'Bahasa Indonesia' }, // Indonesian
  { code: 'vi', label: 'Tiếng Việt' }, // Vietnamese
  { code: 'fr', label: 'Français' },   // French
  { code: 'es', label: 'Español' },    // Spanish (referred to as "Spain")
]

const TIMEZONES = [
  'Africa/Lagos',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
]

const applyTheme = (theme) => {
  const resolved = theme === 'system'
    ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme
  document.documentElement.setAttribute('data-theme', resolved)
}

const applyAccent = (accentId) => {
  const accent = ACCENT_STYLES.find((item) => item.id === accentId) || ACCENT_STYLES[0]
  document.documentElement.style.setProperty('--glow-teal', accent.color)
  document.documentElement.style.setProperty('--glow-blue', accent.color)
}

const PreferencesPage = ({
  appTheme = 'dark',
  onThemeChange,
  appLanguage = 'en',
  onLanguageChange,
}) => {
  const { t, i18n } = useTranslation()
  const preferencesT = useCallback((key, fallback, options) => t(`preferencesPage.${key}`, fallback, options), [t])
  const { isConnected, account, connect } = useWallet()
  const { isOwnSpace, subjectAddress, switchToSelf } = useSpace()
  const toast = useToast()

  const [theme, setTheme] = useState(appTheme || 'dark')
  const [language, setLanguage] = useState(appLanguage || 'en')
  const [timezone, setTimezone] = useState('Africa/Lagos')
  const [accentStyle, setAccentStyle] = useState('default')
  const [spaceVisibilityPreference, setSpaceVisibilityPreference] = useState('public')
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)
  const [telegramStatus, setTelegramStatus] = useState({ configured: false, status: 'unlinked' })
  const [telegramCode, setTelegramCode] = useState('')
  const [telegramBot, setTelegramBot] = useState({ username: '', link: '' })
  const [saveStatus, setSaveStatus] = useState({ show: false, message: '', type: '' })

  useEffect(() => {
    const savedTheme = localStorage.getItem('ffn_theme')
    const savedLanguage = localStorage.getItem('ffn_language')
    const savedTimezone = localStorage.getItem('ffn_timezone')
    const savedAccent = localStorage.getItem('ffn_accent')
    const savedSpaceVisibility = localStorage.getItem('ffn_space_visibility_pref')
    const savedNotifications = localStorage.getItem('ffn_notifications')

    if (savedTheme && !appTheme) setTheme(savedTheme)
    if (savedLanguage && !appLanguage) {
      const normalizedLanguage = LANGUAGES.some((item) => item.code === savedLanguage) ? savedLanguage : 'en'
      setLanguage(normalizedLanguage)
      i18n.changeLanguage(normalizedLanguage)
    }
    if (savedTimezone) setTimezone(savedTimezone)
    if (savedAccent) setAccentStyle(savedAccent)
    if (savedSpaceVisibility) setSpaceVisibilityPreference(savedSpaceVisibility)

    if (savedNotifications) {
      try {
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...JSON.parse(savedNotifications) })
      } catch {
        setNotifications(DEFAULT_NOTIFICATIONS)
      }
    }

    applyTheme(appTheme || savedTheme || 'dark')
    applyAccent(savedAccent || 'default')
  }, [appLanguage, appTheme, i18n])

  useEffect(() => {
    if (appTheme && appTheme !== theme) {
      setTheme(appTheme)
      applyTheme(appTheme)
    }
  }, [appTheme, theme])

  useEffect(() => {
    if (appLanguage && appLanguage !== language && LANGUAGES.some((item) => item.code === appLanguage)) {
      setLanguage(appLanguage)
      i18n.changeLanguage(appLanguage)
    }
  }, [appLanguage, i18n, language])

  const refreshNotificationPreferences = useCallback(async () => {
    if (!isConnected || !account) return

    try {
      const result = await fetchNotificationPreferences(account)
      const prefs = result?.preferences || {}
      if (prefs.language && LANGUAGES.some((item) => item.code === prefs.language)) {
        setLanguage(prefs.language)
        i18n.changeLanguage(prefs.language)
        localStorage.setItem('ffn_language', prefs.language)
      }
      if (prefs.web) {
        setNotifications((current) => ({ ...DEFAULT_NOTIFICATIONS, ...current, ...prefs.web }))
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }, [account, i18n, isConnected])

  const refreshTelegramStatus = useCallback(async ({ silent = false } = {}) => {
    if (!isConnected || !account) return null

    try {
      const status = await fetchTelegramStatus(account)
      setTelegramStatus(status)
      if (status.preferences) {
        setNotifications((current) => ({ ...DEFAULT_NOTIFICATIONS, ...current, ...status.preferences }))
      }
      if (status.status === 'active') {
        setTelegramCode('')
        setTelegramBot({ username: '', link: '' })
        if (!silent) {
          toast.success(preferencesT('notifications.telegramLinked', 'Telegram linked.'), { dedupeKey: 'preferences-telegram-linked' })
        }
      }
      return status
    } catch {
      setTelegramStatus({ configured: false, status: 'unavailable' })
      return null
    }
  }, [account, isConnected, preferencesT, toast])

  useEffect(() => {
    refreshTelegramStatus({ silent: true })
  }, [refreshTelegramStatus])

  useEffect(() => {
    refreshNotificationPreferences()
  }, [refreshNotificationPreferences])

  useEffect(() => {
    if (!isConnected || !account || telegramStatus.status !== 'pending') return undefined

    const interval = window.setInterval(() => {
      refreshTelegramStatus({ silent: false })
    }, 5000)

    return () => window.clearInterval(interval)
  }, [account, isConnected, refreshTelegramStatus, telegramStatus.status])

  const handleStartTelegramLink = useCallback(async () => {
    if (!account) return
    try {
      const result = await startTelegramLink({ walletAddress: account, language })
      setTelegramCode(result.verificationCode || '')
      setTelegramBot({
        username: result.botUsername || '',
        link: result.botDeepLink || '',
      })
      setTelegramStatus((current) => ({ ...current, status: 'pending', configured: result.configured }))
      toast.info(preferencesT('notifications.telegramCodeStarted', 'Telegram verification code created.'), { dedupeKey: 'preferences-telegram-link-started' })
    } catch (error) {
      setSaveStatus({ show: true, message: error.message, type: 'error' })
      toast.danger(error.message || preferencesT('notifications.telegramLinkFailed', 'Unable to start Telegram linking.'), { dedupeKey: 'preferences-telegram-link-failed' })
    }
  }, [account, language, preferencesT, toast])

  const handleTelegramUnsubscribe = useCallback(async () => {
    if (!account) return
    try {
      await unsubscribeTelegram(account)
      setTelegramStatus((current) => ({ ...current, status: 'unsubscribed' }))
      setTelegramCode('')
      setTelegramBot({ username: '', link: '' })
      toast.success(preferencesT('notifications.telegramUnsubscribed', 'Telegram alerts unsubscribed.'), { dedupeKey: 'preferences-telegram-unsubscribed' })
    } catch (error) {
      setSaveStatus({ show: true, message: error.message, type: 'error' })
      toast.danger(error.message || preferencesT('notifications.telegramUnsubscribeFailed', 'Unable to unsubscribe Telegram alerts.'), { dedupeKey: 'preferences-telegram-unsubscribe-failed' })
    }
  }, [account, preferencesT, toast])

  const savePreferences = useCallback(async () => {
    localStorage.setItem('ffn_theme', theme)
    localStorage.setItem('finfreedom_theme_v1', theme)
    localStorage.setItem('ffn_language', language)
    localStorage.setItem('finfreedom_language_v1', language)
    localStorage.setItem('ffn_timezone', timezone)
    localStorage.setItem('ffn_accent', accentStyle)
    localStorage.setItem('ffn_space_visibility_pref', spaceVisibilityPreference)
    localStorage.setItem('ffn_notifications', JSON.stringify(notifications))

    applyTheme(theme)
    applyAccent(accentStyle)
    i18n.changeLanguage(language)
    onThemeChange?.(theme)
    onLanguageChange?.(language)

    try {
      if (account) {
        await updateNotificationPreferences(account, {
          language,
          telegramEnabled: telegramStatus.status === 'active',
          web: notifications,
          telegram: notifications,
        })
      }

      if (account && telegramStatus.status === 'active') {
        const result = await updateTelegramPreferences(account, notifications)
        if (result.preferences) {
          setNotifications((current) => ({ ...DEFAULT_NOTIFICATIONS, ...current, ...result.preferences }))
        }
      }

      setSaveStatus({ show: true, message: preferencesT('status.saved', 'Preferences saved successfully.'), type: 'success' })
      toast.success(preferencesT('status.saved', 'Preferences saved successfully.'), { dedupeKey: 'preferences-saved' })
    } catch (error) {
      setSaveStatus({ show: true, message: error.message, type: 'error' })
      toast.danger(error.message || preferencesT('status.saveFailed', 'Preferences could not be saved.'), { dedupeKey: 'preferences-save-failed' })
    }
    window.setTimeout(() => setSaveStatus({ show: false, message: '', type: '' }), 2500)
  }, [account, theme, language, timezone, accentStyle, spaceVisibilityPreference, notifications, preferencesT, toast, telegramStatus.status, i18n, onThemeChange, onLanguageChange])

  const resetPreferences = useCallback(() => {
    setTheme('dark')
    setLanguage('en')
    setTimezone('Africa/Lagos')
    setAccentStyle('default')
    setSpaceVisibilityPreference('public')
    setNotifications(DEFAULT_NOTIFICATIONS)
    applyTheme('dark')
    applyAccent('default')
    i18n.changeLanguage('en')
    onThemeChange?.('dark')
    onLanguageChange?.('en')
    setSaveStatus({ show: true, message: preferencesT('status.reset', 'Preferences reset to defaults.'), type: 'info' })
    toast.info(preferencesT('status.reset', 'Preferences reset to defaults.'), { dedupeKey: 'preferences-reset' })
    window.setTimeout(() => setSaveStatus({ show: false, message: '', type: '' }), 2500)
  }, [i18n, onLanguageChange, onThemeChange, preferencesT, toast])

  const persistNotificationPreferences = useCallback(async (nextNotifications) => {
    localStorage.setItem('ffn_notifications', JSON.stringify(nextNotifications))
    if (!account) return
    await updateNotificationPreferences(account, {
      language,
      telegramEnabled: telegramStatus.status === 'active',
      web: nextNotifications,
      telegram: nextNotifications,
    })
    if (telegramStatus.status === 'active') {
      await updateTelegramPreferences(account, nextNotifications)
    }
  }, [account, language, telegramStatus.status])

  const toggleNotification = useCallback((key) => {
    setNotifications((prev) => {
      const next = { ...DEFAULT_NOTIFICATIONS, ...prev, [key]: !Boolean(prev[key]) }
      persistNotificationPreferences(next).catch((error) => {
        toast.danger(error.message || preferencesT('status.saveFailed', 'Preferences could not be saved.'), { dedupeKey: 'preferences-notification-save-failed' })
      })
      return next
    })
  }, [persistNotificationPreferences, preferencesT, toast])

  const handleThemeSelect = useCallback((nextTheme) => {
    setTheme(nextTheme)
    applyTheme(nextTheme)
    localStorage.setItem('ffn_theme', nextTheme)
    localStorage.setItem('finfreedom_theme_v1', nextTheme)
    onThemeChange?.(nextTheme)
  }, [onThemeChange])

  const handleLanguageSelect = useCallback((nextLanguage) => {
    setLanguage(nextLanguage)
    i18n.changeLanguage(nextLanguage)
    localStorage.setItem('ffn_language', nextLanguage)
    localStorage.setItem('finfreedom_language_v1', nextLanguage)
    onLanguageChange?.(nextLanguage)
  }, [i18n, onLanguageChange])

  const currentAccent = useMemo(
    () => ACCENT_STYLES.find((item) => item.id === accentStyle) || ACCENT_STYLES[0],
    [accentStyle]
  )

  const activeNotifications = useMemo(
    () => Object.values(notifications).filter(Boolean).length,
    [notifications]
  )

  if (!isConnected) {
    return (
      <section className="preferences-page">
        <div className="preferences-hero">
          <div className="preferences-hero__content">
            <div className="preferences-hero__eyebrow glass-panel">
              <span className="preferences-hero__eyebrow-dot" />
              <span className="preferences-hero__eyebrow-text">{preferencesT('hero.customizeExperience', 'Customize Your Experience')}</span>
            </div>
            <div className="preferences-hero__text-block">
              <h1 className="preferences-hero__title">{preferencesT('title', 'Preferences')}</h1>
              <p className="preferences-hero__description soft-text">
                {preferencesT('connect.description', 'Connect your wallet to manage your display, language, and notification preferences.')}
              </p>
            </div>
            <button type="button" onClick={connect} className="connect-wallet-btn">{preferencesT('actions.connectWallet', 'Connect Wallet')}</button>
          </div>

          <div className="preferences-hero__visual glass-panel">
            <div className="preferences-hero__visual-box">{preferencesT('connect.visual', 'Connect to customize')}</div>
            <p className="preferences-hero__visual-note muted-text">{preferencesT('connect.browserSaved', 'Your settings are saved to your browser.')}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!isOwnSpace) {
    return (
      <section className="preferences-page">
        <div className="preferences-hero">
          <div className="preferences-hero__content">
            <div className="preferences-hero__eyebrow glass-panel">
              <span className="preferences-hero__eyebrow-dot" />
              <span className="preferences-hero__eyebrow-text">{preferencesT('ownSpace.eyebrow', 'My Account View Required')}</span>
            </div>
            <div className="preferences-hero__text-block">
              <h1 className="preferences-hero__title">{preferencesT('title', 'Preferences')}</h1>
              <p className="preferences-hero__description soft-text">
                {preferencesT('ownSpace.description', 'Preferences can only be changed in My Account View.')}
              </p>
              <div className="small muted-text">
                {preferencesT('ownSpace.viewing', 'Viewing: {{address}}', { address: subjectAddress ? `${subjectAddress.slice(0, 8)}...${subjectAddress.slice(-6)}` : preferencesT('states.unknown', 'Unknown') })}
              </div>
            </div>
            <button type="button" onClick={switchToSelf} className="connect-wallet-btn">{preferencesT('actions.returnToMySpace', 'Return to My Space')}</button>
          </div>

          <div className="preferences-hero__visual glass-panel">
            <div className="preferences-hero__visual-box">{preferencesT('ownSpace.visual', 'Preferences are private to My Account View')}</div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="preferences-page">
      <div className="preferences-hero">
        <div className="preferences-hero__content">
          <div className="preferences-hero__eyebrow glass-panel">
            <span className="preferences-hero__eyebrow-dot" />
            <span className="preferences-hero__eyebrow-text">{preferencesT('hero.eyebrow', 'Display, language, and alerts')}</span>
          </div>

          <div className="preferences-hero__text-block">
            <h1 className="preferences-hero__title">{preferencesT('title', 'Preferences')}</h1>
            <p className="preferences-hero__description soft-text">
              {preferencesT('hero.description', 'Customize your experience with theme options, language selection, notification controls, and space visibility settings.')}
            </p>
            <div className="small muted-text">{preferencesT('hero.connected', 'Connected: {{address}}', { address: `${account?.slice(0, 8)}...${account?.slice(-6)}` })}</div>
          </div>

          <div className="preferences-hero__chips">
            <span className="preferences-hero__chip glass-panel">{theme === 'light' ? preferencesT('theme.lightMode', 'Light Mode') : theme === 'system' ? preferencesT('theme.systemTheme', 'System Theme') : preferencesT('theme.darkMode', 'Dark Mode')}</span>
            <span className="preferences-hero__chip glass-panel">{LANGUAGES.find((item) => item.code === language)?.label || language}</span>
            <span className="preferences-hero__chip glass-panel">{preferencesT('hero.alertsEnabled', '{{count}} alerts enabled', { count: activeNotifications })}</span>
          </div>
        </div>

        <div className="preferences-hero__visual glass-panel">
          <div className="preferences-hero__visual-box">
            <div className="preferences-preview">
              <div className="preferences-preview__card" style={{ '--preview-accent': currentAccent.color }}>
                <span className="preferences-preview__dot" />
                <span className="preferences-preview__text">{preferencesT('preview.label', 'Preview')}</span>
              </div>
            </div>
          </div>
          <p className="preferences-hero__visual-note muted-text">{preferencesT('preview.note', 'Live preview of your active theme and accent color.')}</p>
        </div>
      </div>

      <div className="preferences-main-grid">
        <div className="preferences-main-grid__left">
          <section className="preferences-appearance glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">{preferencesT('appearance.eyebrow', 'Appearance')}</span>
              <h2 className="preferences-section-heading__title">{preferencesT('appearance.title', 'Visual preferences')}</h2>
            </div>

            <div className="preferences-cards__grid">
              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">{preferencesT('appearance.theme', 'Theme')}</span>
                <div className="theme-selector">
                  {['dark', 'light', 'system'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`theme-option ${theme === item ? 'active' : ''}`}
                      onClick={() => handleThemeSelect(item)}
                    >
                      {item === 'dark' ? preferencesT('theme.dark', 'Dark') : item === 'light' ? preferencesT('theme.light', 'Light') : preferencesT('theme.system', 'System')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">{preferencesT('appearance.accentColor', 'Accent Color')}</span>
                <div className="accent-selector">
                  {ACCENT_STYLES.map((accent) => (
                    <button
                      key={accent.id}
                      type="button"
                      className={`accent-option ${accentStyle === accent.id ? 'active' : ''}`}
                      onClick={() => setAccentStyle(accent.id)}
                    >
                      <span className="accent-dot" style={{ background: accent.color }} />
                      <span>{preferencesT(accent.nameKey, accent.fallback)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="preferences-language glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">{preferencesT('language.eyebrow', 'Language & Region')}</span>
              <h2 className="preferences-section-heading__title">{preferencesT('language.title', 'Language and timezone settings')}</h2>
            </div>

            <div className="preferences-cards__grid">
              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">{preferencesT('language.label', 'Language')}</span>
                <select className="preference-select" value={language} onChange={(e) => handleLanguageSelect(e.target.value)}>
                  {LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">{preferencesT('language.timezone', 'Timezone')}</span>
                <select className="preference-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {TIMEZONES.map((item) => (
                    <option key={item} value={item}>{item.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="preferences-notifications glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">{preferencesT('notifications.eyebrow', 'Notifications')}</span>
              <h2 className="preferences-section-heading__title">{preferencesT('notifications.title', 'Choose the alerts you want')}</h2>
            </div>

            <div className="preferences-list">
              {[
                ['paymentReceived', preferencesT('notifications.paymentReceived', 'Payment Received'), preferencesT('notifications.paymentReceivedDesc', 'Liquid USDT paid directly to your wallet')],
                ['paymentSkipped', preferencesT('notifications.paymentSkipped', 'Payment Missed'), preferencesT('notifications.paymentSkippedDesc', 'Missed or skipped payout events with the reason')],
                ['escrow', preferencesT('notifications.escrow', 'Escrow Activity'), preferencesT('notifications.escrowDesc', 'Escrow locked, used, or released')],
                ['autoUpgrade', preferencesT('notifications.autoUpgrade', 'Auto Upgrade'), preferencesT('notifications.autoUpgradeDesc', 'Automatic level upgrade events')],
                ['recycle', preferencesT('notifications.recycle', 'Recycle'), preferencesT('notifications.recycleDesc', 'Orbit recycle events')],
                ['tokenRewards', preferencesT('notifications.tokenRewards', 'Token Rewards'), preferencesT('notifications.tokenRewardsDesc', 'FGT and FGTr reward updates')],
                ['systemNotices', preferencesT('notifications.systemNotices', 'System Notices'), preferencesT('notifications.systemNoticesDesc', 'System maintenance and platform status')],
                ['communityNotices', preferencesT('notifications.communityNotices', 'Community Notices'), preferencesT('notifications.communityNoticesDesc', 'Community announcements and events')],
              ].map(([key, label, desc]) => (
                <div key={key} className={`preferences-list__item glass-panel ${notifications[key] ? 'is-enabled' : 'is-disabled'}`}>
                  <div className="preferences-list__info">
                    <span className="preferences-list__label">{label}</span>
                    <span className="preferences-list__desc soft-text">{desc}</span>
                  </div>
                  <label className="preference-checkbox">
                    <input type="checkbox" checked={Boolean(notifications[key])} onChange={() => toggleNotification(key)} />
                    <span className="preference-checkbox__box" />
                  </label>
                </div>
              ))}
            </div>

            <div className="preferences-card preferences-telegram-card glass-panel">
              <div className="preferences-telegram-card__header">
                <div>
                  <span className="preferences-card__label muted-text">{preferencesT('notifications.telegramStatus', 'Telegram Status')}</span>
                  <strong className="preferences-telegram-card__title">{preferencesT('notifications.telegramAlerts', 'Telegram Alerts')}</strong>
                </div>
                <span className={`preferences-telegram-card__status is-${telegramStatus.status || 'unlinked'}`}>
                  {telegramStatus.status || 'unlinked'}
                </span>
              </div>
              <p className="preferences-card__text soft-text">
                {telegramStatus.configured
                  ? preferencesT('notifications.telegramConfigured', 'Telegram notifications are available for this environment.')
                  : preferencesT('notifications.telegramNotConfigured', 'Telegram notifications are not configured for this environment yet.')}
              </p>
              {telegramCode ? (
                <div className="preferences-card__text preferences-telegram-card__code-block">
                  <p className="preferences-telegram-card__code">
                    {preferencesT('notifications.telegramCode', 'Verification code: {{code}}', { code: telegramCode })}
                  </p>
                  {telegramBot.link ? (
                    <a className="btn btn-secondary" href={telegramBot.link} target="_blank" rel="noreferrer">
                      {preferencesT('notifications.openTelegramBot', 'Open Telegram Bot')}
                    </a>
                  ) : null}
                  <p className="soft-text">
                    {telegramBot.username
                      ? preferencesT('notifications.telegramSendCodeToBot', 'Send this code to @{{botUsername}} in Telegram.', { botUsername: telegramBot.username })
                      : preferencesT('notifications.telegramBotMissing', 'Telegram bot username is not configured. Ask support for the official bot.')}
                  </p>
                </div>
              ) : null}
              {telegramStatus.status === 'active' ? (
                <p className="preferences-telegram-card__active">
                  {preferencesT('notifications.telegramActive', 'Telegram is linked and ready for wallet alerts.')}
                </p>
              ) : null}
              <div className="preferences-actions">
                <button type="button" className="btn btn-secondary" onClick={handleStartTelegramLink} disabled={!isConnected}>
                  {preferencesT('notifications.linkTelegram', 'Link Telegram')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => refreshTelegramStatus({ silent: false })} disabled={!isConnected}>
                  {preferencesT('notifications.refreshTelegramStatus', 'Refresh Status')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={handleTelegramUnsubscribe} disabled={!isConnected}>
                  {preferencesT('notifications.unsubscribeTelegram', 'Unsubscribe')}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="preferences-main-grid__right">
          {/* Empty - both sections now combined below */}
        </div>
      </div>

      {/* Combined Full Width Section - Space Settings + Save Actions */}
      <div className="preferences-fullwidth-section">
        <section className="preferences-space glass-panel">
          <div className="preferences-section-heading">
            <span className="preferences-section-heading__eyebrow muted-text">{preferencesT('profile.eyebrow', 'Profile Settings')}</span>
            <h2 className="preferences-section-heading__title">{preferencesT('profile.title', 'Basic visibility control')}</h2>
          </div>

          <div className="preferences-card glass-panel">
            <span className="preferences-card__label muted-text">{preferencesT('profile.spaceVisibility', 'Space Visibility')}</span>
            <div className="theme-selector">
              <button 
                type="button" 
                className={`theme-option ${spaceVisibilityPreference === 'public' ? 'active' : ''}`} 
                onClick={() => setSpaceVisibilityPreference('public')}
              >
                {preferencesT('profile.public', 'Public')}
              </button>
              <button 
                type="button" 
                className={`theme-option ${spaceVisibilityPreference === 'locked' ? 'active' : ''}`} 
                onClick={() => setSpaceVisibilityPreference('locked')}
              >
                {preferencesT('profile.locked', 'Locked')}
              </button>
            </div>
            <p className="preferences-card__text soft-text">
              {preferencesT('profile.visibilityText', 'This prepares your preferred visibility mode for the app experience. Public spaces can be viewed by others; locked spaces require explicit access.')}
            </p>
          </div>
        </section>

        <section className="preferences-actions glass-panel">
          <div className="preferences-section-heading">
            <span className="preferences-section-heading__eyebrow muted-text">{preferencesT('save.eyebrow', 'Save Changes')}</span>
            <h2 className="preferences-section-heading__title">{preferencesT('save.title', 'Apply your choices')}</h2>
          </div>

          {saveStatus.show ? <div className={`save-status ${saveStatus.type}`}>{saveStatus.message}</div> : null}

          <div className="action-buttons">
            <button type="button" className="save-btn" onClick={savePreferences}>{preferencesT('actions.savePreferences', 'Save Preferences')}</button>
            <button type="button" className="reset-btn" onClick={resetPreferences}>{preferencesT('actions.reset', 'Reset')}</button>
          </div>
        </section>
      </div>
    </section>
  )
}

export default PreferencesPage
