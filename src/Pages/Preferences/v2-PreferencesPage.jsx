import './PreferencesPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useSpace } from '../../context/SpaceContext'

const DEFAULT_NOTIFICATIONS = {
  platformAlerts: true,
  progressUpdates: true,
  promotionalNotices: false,
  emailDigest: false,
  pushNotifications: true,
}

const ACCENT_STYLES = [
  { id: 'default', name: 'Default Glow', color: '#1de9b6' },
  { id: 'blue', name: 'Ocean Blue', color: '#3b82f6' },
  { id: 'purple', name: 'Royal Purple', color: '#8b5cf6' },
  { id: 'gold', name: 'Golden', color: '#f59e0b' },
]

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
]

const TIMEZONES = [
  'Africa/Lagos',
  'Europe/London',
  'America/New_York',
  'Asia/Dubai',
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

const PreferencesPage = () => {
  const { isConnected, account, connect } = useWallet()
  const { isOwnSpace, subjectAddress, switchToSelf } = useSpace()

  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('English')
  const [timezone, setTimezone] = useState('Africa/Lagos')
  const [accentStyle, setAccentStyle] = useState('default')
  const [spaceVisibilityPreference, setSpaceVisibilityPreference] = useState('public')
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)
  const [saveStatus, setSaveStatus] = useState({ show: false, message: '', type: '' })

  useEffect(() => {
    const savedTheme = localStorage.getItem('ffn_theme')
    const savedLanguage = localStorage.getItem('ffn_language')
    const savedTimezone = localStorage.getItem('ffn_timezone')
    const savedAccent = localStorage.getItem('ffn_accent')
    const savedSpaceVisibility = localStorage.getItem('ffn_space_visibility_pref')
    const savedNotifications = localStorage.getItem('ffn_notifications')

    if (savedTheme) setTheme(savedTheme)
    if (savedLanguage) setLanguage(savedLanguage)
    if (savedTimezone) setTimezone(savedTimezone)
    if (savedAccent) setAccentStyle(savedAccent)
    if (savedSpaceVisibility) setSpaceVisibilityPreference(savedSpaceVisibility)

    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications))
      } catch {
        setNotifications(DEFAULT_NOTIFICATIONS)
      }
    }

    applyTheme(savedTheme || 'dark')
    applyAccent(savedAccent || 'default')
  }, [])

  const savePreferences = useCallback(() => {
    localStorage.setItem('ffn_theme', theme)
    localStorage.setItem('ffn_language', language)
    localStorage.setItem('ffn_timezone', timezone)
    localStorage.setItem('ffn_accent', accentStyle)
    localStorage.setItem('ffn_space_visibility_pref', spaceVisibilityPreference)
    localStorage.setItem('ffn_notifications', JSON.stringify(notifications))

    applyTheme(theme)
    applyAccent(accentStyle)

    setSaveStatus({ show: true, message: 'Preferences saved successfully.', type: 'success' })
    window.setTimeout(() => setSaveStatus({ show: false, message: '', type: '' }), 2500)
  }, [theme, language, timezone, accentStyle, spaceVisibilityPreference, notifications])

  const resetPreferences = useCallback(() => {
    setTheme('dark')
    setLanguage('English')
    setTimezone('Africa/Lagos')
    setAccentStyle('default')
    setSpaceVisibilityPreference('public')
    setNotifications(DEFAULT_NOTIFICATIONS)
    applyTheme('dark')
    applyAccent('default')
    setSaveStatus({ show: true, message: 'Preferences reset to defaults.', type: 'info' })
    window.setTimeout(() => setSaveStatus({ show: false, message: '', type: '' }), 2500)
  }, [])

  const toggleNotification = useCallback((key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

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
              <span className="preferences-hero__eyebrow-text">Customize Your Experience</span>
            </div>
            <div className="preferences-hero__text-block">
              <h1 className="preferences-hero__title">Preferences</h1>
              <p className="preferences-hero__description soft-text">
                Connect your wallet to manage your saved display and notification preferences.
              </p>
            </div>
            <button type="button" onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
          </div>

          <div className="preferences-hero__visual glass-panel">
            <div className="preferences-hero__visual-box">Connect to customize</div>
            <p className="preferences-hero__visual-note muted-text">Your settings are saved per device for now.</p>
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
              <span className="preferences-hero__eyebrow-text">Own Space Required</span>
            </div>
            <div className="preferences-hero__text-block">
              <h1 className="preferences-hero__title">Preferences</h1>
              <p className="preferences-hero__description soft-text">
                Preferences can only be changed in your own space.
              </p>
              <div className="small muted-text">
                Viewing: {subjectAddress ? `${subjectAddress.slice(0, 8)}...${subjectAddress.slice(-6)}` : 'Unknown'}
              </div>
            </div>
            <button type="button" onClick={switchToSelf} className="connect-wallet-btn">Return to My Space</button>
          </div>

          <div className="preferences-hero__visual glass-panel">
            <div className="preferences-hero__visual-box">Preferences are private to your own space</div>
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
            <span className="preferences-hero__eyebrow-text">Display, language, and alerts</span>
          </div>

          <div className="preferences-hero__text-block">
            <h1 className="preferences-hero__title">Preferences</h1>
            <p className="preferences-hero__description soft-text">
              Keep only the settings that matter most: appearance, language, space visibility, and notifications.
            </p>
            <div className="small muted-text">Connected: {account?.slice(0, 8)}...{account?.slice(-6)}</div>
          </div>

          <div className="preferences-hero__chips">
            <span className="preferences-hero__chip glass-panel">{theme === 'light' ? 'Light Mode' : theme === 'system' ? 'System Theme' : 'Dark Mode'}</span>
            <span className="preferences-hero__chip glass-panel">{language}</span>
            <span className="preferences-hero__chip glass-panel">{activeNotifications} alerts on</span>
          </div>
        </div>

        <div className="preferences-hero__visual glass-panel">
          <div className="preferences-hero__visual-box">
            <div className="preferences-preview">
              <div className="preferences-preview__card" style={{ '--preview-accent': currentAccent.color }}>
                <span className="preferences-preview__dot" />
                <span className="preferences-preview__text">Preview</span>
              </div>
            </div>
          </div>
          <p className="preferences-hero__visual-note muted-text">A compact preview of your active theme and accent.</p>
        </div>
      </div>

      <div className="preferences-main-grid">
        <div className="preferences-main-grid__left">
          <section className="preferences-appearance glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">Appearance</span>
              <h2 className="preferences-section-heading__title">Make the interface feel right</h2>
            </div>

            <div className="preferences-cards__grid">
              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Theme</span>
                <div className="theme-selector">
                  {['dark', 'light', 'system'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`theme-option ${theme === item ? 'active' : ''}`}
                      onClick={() => setTheme(item)}
                    >
                      {item === 'dark' ? 'Dark' : item === 'light' ? 'Light' : 'System'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Accent</span>
                <div className="accent-selector">
                  {ACCENT_STYLES.map((accent) => (
                    <button
                      key={accent.id}
                      type="button"
                      className={`accent-option ${accentStyle === accent.id ? 'active' : ''}`}
                      onClick={() => setAccentStyle(accent.id)}
                    >
                      <span className="accent-dot" style={{ background: accent.color }} />
                      <span>{accent.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="preferences-language glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">Language & Region</span>
              <h2 className="preferences-section-heading__title">Choose how the app speaks to you</h2>
            </div>

            <div className="preferences-cards__grid">
              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Language</span>
                <select className="preference-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGES.map((item) => (
                    <option key={item.code} value={item.label}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Timezone</span>
                <select className="preference-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {TIMEZONES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="preferences-main-grid__right">
          <section className="preferences-notifications glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">Notifications</span>
              <h2 className="preferences-section-heading__title">Choose the alerts you want</h2>
            </div>

            <div className="preferences-list">
              {[
                ['platformAlerts', 'Platform Alerts', 'System announcements and maintenance updates'],
                ['progressUpdates', 'Progress Updates', 'Level and orbit progress notifications'],
                ['pushNotifications', 'Push Notifications', 'Real-time browser notifications'],
                ['emailDigest', 'Email Digest', 'Periodic summary emails'],
              ].map(([key, label, desc]) => (
                <div key={key} className="preferences-list__item glass-panel">
                  <div className="preferences-list__info">
                    <span className="preferences-list__label">{label}</span>
                    <span className="preferences-list__desc soft-text">{desc}</span>
                  </div>
                  <label className="toggle-switch small">
                    <input type="checkbox" checked={notifications[key]} onChange={() => toggleNotification(key)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="preferences-appearance glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">Space Settings</span>
              <h2 className="preferences-section-heading__title">Basic visibility control</h2>
            </div>

            <div className="preferences-card glass-panel">
              <span className="preferences-card__label muted-text">Space Visibility</span>
              <div className="theme-selector">
                <button type="button" className={`theme-option ${spaceVisibilityPreference === 'public' ? 'active' : ''}`} onClick={() => setSpaceVisibilityPreference('public')}>Public</button>
                <button type="button" className={`theme-option ${spaceVisibilityPreference === 'locked' ? 'active' : ''}`} onClick={() => setSpaceVisibilityPreference('locked')}>Locked</button>
              </div>
              <p className="preferences-card__text soft-text">This prepares your preferred visibility mode for the app experience.</p>
            </div>
          </section>

          <section className="preferences-actions glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">Save Changes</span>
              <h2 className="preferences-section-heading__title">Apply your choices</h2>
            </div>

            {saveStatus.show ? <div className={`save-status ${saveStatus.type}`}>{saveStatus.message}</div> : null}

            <div className="action-buttons">
              <button type="button" className="save-btn" onClick={savePreferences}>Save Preferences</button>
              <button type="button" className="reset-btn" onClick={resetPreferences}>Reset</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}

export default PreferencesPage
