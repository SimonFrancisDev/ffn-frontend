
import './PreferencesPage.css'
import { useEffect, useState, useCallback } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useSpace } from '../../context/SpaceContext'

const PreferencesPage = () => {
  const { isConnected, account, connect } = useWallet()
  const { isOwnSpace, subjectAddress, switchToSelf } = useSpace()

  // Preference States with localStorage persistence
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('English')
  const [timezone, setTimezone] = useState('Africa/Lagos')
  const [accentStyle, setAccentStyle] = useState('default')
  const [spaceVisibilityPreference, setSpaceVisibilityPreference] = useState('public')
  const [notifications, setNotifications] = useState({
    platformAlerts: true,
    progressUpdates: true,
    promotionalNotices: false,
    emailDigest: false,
    pushNotifications: true
  })
  const [dataSaver, setDataSaver] = useState(false)
  const [animationLevel, setAnimationLevel] = useState('full')
  const [saveStatus, setSaveStatus] = useState({ show: false, message: '', type: '' })
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())

  // Available options
  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' }
  ]

  const timezones = [
    'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg',
    'America/New_York', 'America/Los_Angeles', 'Europe/London',
    'Europe/Paris', 'Asia/Dubai', 'Asia/Tokyo', 'Asia/Singapore'
  ]

  const accentStyles = [
    { id: 'default', name: 'Default Glow', color: '#1de9b6' },
    { id: 'blue', name: 'Ocean Blue', color: '#3b82f6' },
    { id: 'purple', name: 'Royal Purple', color: '#8b5cf6' },
    { id: 'gold', name: 'Golden', color: '#f59e0b' },
    { id: 'pink', name: 'Candy Pink', color: '#ec4899' }
  ]

  const animationLevels = [
    { id: 'full', name: 'Full Animation', description: 'All animations enabled' },
    { id: 'reduced', name: 'Reduced', description: 'Minimal animations' },
    { id: 'none', name: 'No Animation', description: 'Static interface' }
  ]

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('ffn_theme')
    const savedLanguage = localStorage.getItem('ffn_language')
    const savedTimezone = localStorage.getItem('ffn_timezone')
    const savedAccent = localStorage.getItem('ffn_accent')
    const savedSpaceVisibility = localStorage.getItem('ffn_space_visibility_pref')
    const savedNotifications = localStorage.getItem('ffn_notifications')
    const savedDataSaver = localStorage.getItem('ffn_data_saver')
    const savedAnimation = localStorage.getItem('ffn_animation')

    if (savedTheme) setTheme(savedTheme)
    if (savedLanguage) setLanguage(savedLanguage)
    if (savedTimezone) setTimezone(savedTimezone)
    if (savedAccent) setAccentStyle(savedAccent)
    if (savedSpaceVisibility) setSpaceVisibilityPreference(savedSpaceVisibility)
    if (savedDataSaver) setDataSaver(savedDataSaver === 'true')
    if (savedAnimation) setAnimationLevel(savedAnimation)
    
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications))
      } catch (e) {}
    }

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', savedTheme || 'dark')
    
    // Apply accent color to CSS variable
    const accent = accentStyles.find(a => a.id === (savedAccent || 'default'))
    if (accent) {
      document.documentElement.style.setProperty('--glow-teal', accent.color)
      document.documentElement.style.setProperty('--glow-blue', accent.color)
    }
  }, [])

  // Save all preferences
  const savePreferences = useCallback(() => {
    localStorage.setItem('ffn_theme', theme)
    localStorage.setItem('ffn_language', language)
    localStorage.setItem('ffn_timezone', timezone)
    localStorage.setItem('ffn_accent', accentStyle)
    localStorage.setItem('ffn_space_visibility_pref', spaceVisibilityPreference)
    localStorage.setItem('ffn_notifications', JSON.stringify(notifications))
    localStorage.setItem('ffn_data_saver', String(dataSaver))
    localStorage.setItem('ffn_animation', animationLevel)

    // Apply theme
    document.documentElement.setAttribute('data-theme', theme)
    
    // Apply accent color
    const accent = accentStyles.find(a => a.id === accentStyle)
    if (accent) {
      document.documentElement.style.setProperty('--glow-teal', accent.color)
      document.documentElement.style.setProperty('--glow-blue', accent.color)
    }

    setSaveStatus({ show: true, message: 'Preferences saved successfully!', type: 'success' })
    setTimeout(() => setSaveStatus({ show: false, message: '', type: '' }), 3000)
  }, [theme, language, timezone, accentStyle, spaceVisibilityPreference, notifications, dataSaver, animationLevel])

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setTheme('dark')
    setLanguage('English')
    setTimezone('Africa/Lagos')
    setAccentStyle('default')
    setSpaceVisibilityPreference('public')
    setNotifications({
      platformAlerts: true,
      progressUpdates: true,
      promotionalNotices: false,
      emailDigest: false,
      pushNotifications: true
    })
    setDataSaver(false)
    setAnimationLevel('full')
    
    setSaveStatus({ show: true, message: 'Preferences reset to defaults', type: 'info' })
    setTimeout(() => setSaveStatus({ show: false, message: '', type: '' }), 3000)
  }, [])

  // Toggle notification setting
  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Get current accent color
  const currentAccent = accentStyles.find(a => a.id === accentStyle)

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
                Connect your wallet to save and manage your preferences across devices.
              </p>
            </div>
            <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
          </div>
          <div className="preferences-hero__visual glass-panel">
            <div className="preferences-hero__visual-box">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚙️</div>
                <div>Connect to customize</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Visitor-mode guard
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
                Preferences can only be changed in your own space. You are currently viewing another
                space.
              </p>
              <div className="small muted-text">
                Viewing: {subjectAddress ? `${subjectAddress.slice(0, 8)}...${subjectAddress.slice(-6)}` : 'Unknown'}
              </div>
            </div>

            <button onClick={switchToSelf} className="connect-wallet-btn">
              Return to My Space
            </button>
          </div>

          <div className="preferences-hero__visual glass-panel">
            <div className="preferences-hero__visual-box">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏠</div>
                <div>Preferences are private to your own space</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="preferences-page">
      {/* Hero Section */}
      <div className="preferences-hero">
        <div className="preferences-hero__content">
          <div className="preferences-hero__eyebrow glass-panel">
            <span className="preferences-hero__eyebrow-dot" />
            <span className="preferences-hero__eyebrow-text">
              Display, language, and experience controls
            </span>
          </div>

          <div className="preferences-hero__text-block">
            <h1 className="preferences-hero__title">Preferences</h1>
            <p className="preferences-hero__description soft-text">
              Adjust language, appearance, notification behavior, and general platform
              experience settings from one organized control page.
            </p>
            <div className="small muted-text">Connected: {account?.slice(0, 8)}...{account?.slice(-6)}</div>
          </div>

          <div className="preferences-hero__chips">
            <span className="preferences-hero__chip glass-panel">
              {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </span>
            <span className="preferences-hero__chip glass-panel">{language}</span>
            <span className="preferences-hero__chip glass-panel">
              {notifications.platformAlerts ? '🔔 Notifications On' : '🔕 Notifications Off'}
            </span>
          </div>
        </div>

        <div className="preferences-hero__visual glass-panel">
          <div className="preferences-hero__visual-box">
            <div className="preview-settings">
              <div className="preview-card" style={{ background: currentAccent?.color }}>
                <span>🎨</span>
                <span>Preview</span>
              </div>
              <div className="preview-controls">
                <div className="preview-toggle"></div>
                <div className="preview-slider"></div>
              </div>
            </div>
          </div>
          <p className="preferences-hero__visual-note muted-text">
            Live preview of your theme and accent settings
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="preferences-main-grid">
        <div className="preferences-main-grid__left">
          
          {/* APPEARANCE SECTION */}
          <section className="preferences-appearance glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">
                Appearance
              </span>
              <h2 className="preferences-section-heading__title">
                Personalize how the platform looks and feels
              </h2>
            </div>

            <div className="preferences-cards__grid">
              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Theme</span>
                <div className="theme-selector">
                  <button 
                    className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    🌙 Dark Mode
                  </button>
                  <button 
                    className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    ☀️ Light Mode
                  </button>
                  <button 
                    className={`theme-option ${theme === 'system' ? 'active' : ''}`}
                    onClick={() => setTheme('system')}
                  >
                    💻 System Default
                  </button>
                </div>
                <p className="preferences-card__text soft-text">
                  Choose between dark, light, or system preference theme.
                </p>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Accent Style</span>
                <div className="accent-selector">
                  {accentStyles.map(accent => (
                    <button
                      key={accent.id}
                      className={`accent-option ${accentStyle === accent.id ? 'active' : ''}`}
                      style={{ '--accent-color': accent.color }}
                      onClick={() => setAccentStyle(accent.id)}
                    >
                      <span className="accent-dot" style={{ background: accent.color }}></span>
                      <span>{accent.name}</span>
                    </button>
                  ))}
                </div>
                <p className="preferences-card__text soft-text">
                  Change the platform's primary color scheme.
                </p>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Animation Level</span>
                <div className="animation-selector">
                  {animationLevels.map(level => (
                    <button
                      key={level.id}
                      className={`animation-option ${animationLevel === level.id ? 'active' : ''}`}
                      onClick={() => setAnimationLevel(level.id)}
                    >
                      {level.name}
                    </button>
                  ))}
                </div>
                <p className="preferences-card__text soft-text">
                  Control motion and animation intensity across the platform.
                </p>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Data Saver Mode</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={dataSaver}
                    onChange={(e) => setDataSaver(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">{dataSaver ? 'ON' : 'OFF'}</span>
                </label>
                <p className="preferences-card__text soft-text">
                  Reduce image quality and disable auto-play to save bandwidth.
                </p>
              </div>
            </div>
          </section>

          {/* SPACE VISIBILITY CARD */}
          <section className="preferences-appearance glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">
                Space Settings
              </span>
              <h2 className="preferences-section-heading__title">
                Control your space visibility
              </h2>
            </div>

            <div className="preferences-cards__grid">
              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Space Visibility</span>
                <div className="theme-selector">
                  <button
                    className={`theme-option ${spaceVisibilityPreference === 'public' ? 'active' : ''}`}
                    onClick={() => setSpaceVisibilityPreference('public')}
                  >
                    🌍 Public Space
                  </button>
                  <button
                    className={`theme-option ${spaceVisibilityPreference === 'locked' ? 'active' : ''}`}
                    onClick={() => setSpaceVisibilityPreference('locked')}
                  >
                    🔒 Locked Space
                  </button>
                </div>
                <p className="preferences-card__text soft-text">
                  This is the UI control point for your future space-visibility setting. In the next phase,
                  this will be wired to the final visibility model.
                </p>
              </div>
            </div>
          </section>

          {/* LANGUAGE & REGION SECTION */}
          <section className="preferences-language glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">
                Language & Region
              </span>
              <h2 className="preferences-section-heading__title">
                Choose your preferred communication setup
              </h2>
            </div>

            <div className="preferences-cards__grid">
              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Language</span>
                <select 
                  className="preference-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.label}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
                <p className="preferences-card__text soft-text">
                  Select your preferred language for the interface.
                </p>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Timezone</span>
                <select 
                  className="preference-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                  ))}
                </select>
                <p className="preferences-card__text soft-text">
                  Set your local timezone for accurate timestamps.
                </p>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Date Format</span>
                <div className="date-format-selector">
                  <button className="format-option active">MM/DD/YYYY</button>
                  <button className="format-option">DD/MM/YYYY</button>
                  <button className="format-option">YYYY-MM-DD</button>
                </div>
                <p className="preferences-card__text soft-text">
                  Choose how dates are displayed throughout the platform.
                </p>
              </div>

              <div className="preferences-card glass-panel">
                <span className="preferences-card__label muted-text">Number Format</span>
                <div className="number-format-selector">
                  <button className="format-option active">1,234.56</button>
                  <button className="format-option">1.234,56</button>
                  <button className="format-option">1 234.56</button>
                </div>
                <p className="preferences-card__text soft-text">
                  Choose your preferred number formatting.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="preferences-main-grid__right">
          
          {/* NOTIFICATION PREFERENCES */}
          <section className="preferences-notifications glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">
                Notification Preferences
              </span>
              <h2 className="preferences-section-heading__title">
                Control how you receive updates and alerts
              </h2>
            </div>

            <div className="preferences-list">
              <div className="preferences-list__item glass-panel">
                <div className="preferences-list__info">
                  <span className="preferences-list__label">Platform Alerts</span>
                  <span className="preferences-list__desc soft-text">System announcements and maintenance updates</span>
                </div>
                <label className="toggle-switch small">
                  <input 
                    type="checkbox" 
                    checked={notifications.platformAlerts}
                    onChange={() => toggleNotification('platformAlerts')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preferences-list__item glass-panel">
                <div className="preferences-list__info">
                  <span className="preferences-list__label">Progress Updates</span>
                  <span className="preferences-list__desc soft-text">Level activation and orbit activity notifications</span>
                </div>
                <label className="toggle-switch small">
                  <input 
                    type="checkbox" 
                    checked={notifications.progressUpdates}
                    onChange={() => toggleNotification('progressUpdates')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preferences-list__item glass-panel">
                <div className="preferences-list__info">
                  <span className="preferences-list__label">Promotional Notices</span>
                  <span className="preferences-list__desc soft-text">Special offers, events, and community news</span>
                </div>
                <label className="toggle-switch small">
                  <input 
                    type="checkbox" 
                    checked={notifications.promotionalNotices}
                    onChange={() => toggleNotification('promotionalNotices')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preferences-list__item glass-panel">
                <div className="preferences-list__info">
                  <span className="preferences-list__label">Email Digest</span>
                  <span className="preferences-list__desc soft-text">Weekly summary of your activity</span>
                </div>
                <label className="toggle-switch small">
                  <input 
                    type="checkbox" 
                    checked={notifications.emailDigest}
                    onChange={() => toggleNotification('emailDigest')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preferences-list__item glass-panel">
                <div className="preferences-list__info">
                  <span className="preferences-list__label">Push Notifications</span>
                  <span className="preferences-list__desc soft-text">Real-time browser notifications</span>
                </div>
                <label className="toggle-switch small">
                  <input 
                    type="checkbox" 
                    checked={notifications.pushNotifications}
                    onChange={() => toggleNotification('pushNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>

          {/* SAVE ACTIONS */}
          <section className="preferences-actions glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">
                Save Changes
              </span>
              <h2 className="preferences-section-heading__title">
                Apply your preferences
              </h2>
            </div>

            {saveStatus.show && (
              <div className={`save-status ${saveStatus.type}`}>
                {saveStatus.type === 'success' ? '✓' : 'ℹ'} {saveStatus.message}
              </div>
            )}

            <div className="action-buttons">
              <button className="save-btn" onClick={savePreferences}>
                💾 Save All Preferences
              </button>
              <button className="reset-btn" onClick={resetPreferences}>
                🔄 Reset to Defaults
              </button>
            </div>

            <p className="preferences-card__text soft-text">
              Your preferences currently apply to this app experience on this device and are prepared for
              secure profile-state syncing in a later backend phase.
            </p>
            <small className="data-source">Data Source: Local app storage (temporary phase)</small>
          </section>

          {/* VISUAL SLOT */}
          <section className="preferences-visual glass-panel">
            <div className="preferences-section-heading">
              <span className="preferences-section-heading__eyebrow muted-text">
                Visual Slot
              </span>
              <h2 className="preferences-section-heading__title">
                Reserved settings visual area
              </h2>
            </div>

            <div className="preferences-visual__box">
              <div className="settings-icon">⚙️</div>
              <div className="settings-gear"></div>
            </div>

            <p className="preferences-visual__note muted-text">
              Customize every aspect of your FFN experience.
            </p>
          </section>
        </div>
      </div>

      <style>{`
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
        
        /* Preview Settings */
        .preview-settings {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .preview-card {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 24px;
          color: white;
          transition: background 0.3s ease;
        }
        .preview-card span:last-child {
          font-size: 12px;
        }
        .preview-controls {
          display: flex;
          gap: 12px;
        }
        .preview-toggle {
          width: 40px;
          height: 20px;
          background: rgba(255,255,255,0.3);
          border-radius: 20px;
        }
        .preview-slider {
          width: 60px;
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
        }
        
        /* Theme Selector */
        .theme-selector {
          display: flex;
          gap: 12px;
          margin: 12px 0;
          flex-wrap: wrap;
        }
        .theme-option {
          padding: 8px 16px;
          border-radius: 30px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .theme-option.active {
          background: var(--glow-teal);
          color: #07111f;
          border-color: var(--glow-teal);
        }
        
        /* Accent Selector */
        .accent-selector {
          display: flex;
          gap: 12px;
          margin: 12px 0;
          flex-wrap: wrap;
        }
        .accent-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 30px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .accent-option.active {
          background: rgba(255,255,255,0.2);
          border-color: var(--accent-color);
        }
        .accent-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        
        /* Animation Selector */
        .animation-selector {
          display: flex;
          gap: 12px;
          margin: 12px 0;
          flex-wrap: wrap;
        }
        .animation-option {
          padding: 8px 16px;
          border-radius: 30px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
        }
        .animation-option.active {
          background: var(--glow-teal);
          color: #07111f;
        }
        
        /* Toggle Switch */
        .toggle-switch {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-switch .toggle-slider {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
          background: rgba(255,255,255,0.2);
          border-radius: 24px;
          transition: 0.3s;
        }
        .toggle-switch .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }
        .toggle-switch input:checked + .toggle-slider {
          background: var(--glow-teal);
        }
        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }
        .toggle-switch.small .toggle-slider {
          width: 40px;
          height: 20px;
        }
        .toggle-switch.small .toggle-slider:before {
          height: 14px;
          width: 14px;
        }
        .toggle-label {
          font-size: 12px;
        }
        
        /* Preference Select */
        .preference-select {
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          margin: 12px 0;
          cursor: pointer;
        }
        
        /* Date/Number Format Selectors */
        .date-format-selector, .number-format-selector {
          display: flex;
          gap: 8px;
          margin: 12px 0;
          flex-wrap: wrap;
        }
        .format-option {
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          cursor: pointer;
          font-size: 11px;
        }
        .format-option.active {
          background: var(--glow-teal);
          color: #07111f;
        }
        
        /* Preferences List Item */
        .preferences-list__item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .preferences-list__info {
          flex: 1;
        }
        .preferences-list__desc {
          display: block;
          font-size: 11px;
          margin-top: 4px;
        }
        
        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 16px;
          margin: 16px 0;
          flex-wrap: wrap;
        }
        .save-btn, .reset-btn {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          font-weight: bold;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .save-btn {
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
          color: #07111f;
        }
        .reset-btn {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .save-btn:hover, .reset-btn:hover {
          transform: translateY(-2px);
        }
        
        /* Save Status */
        .save-status {
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 16px;
          text-align: center;
          font-size: 13px;
        }
        .save-status.success {
          background: rgba(29, 233, 182, 0.15);
          border: 1px solid var(--glow-teal);
          color: var(--glow-teal);
        }
        .save-status.info {
          background: rgba(77, 163, 255, 0.15);
          border: 1px solid var(--glow-blue);
          color: var(--glow-blue);
        }
        
        /* Settings Visual */
        .settings-icon {
          font-size: 48px;
          animation: spin-slow 4s linear infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .small { font-size: 12px; }
        .muted-text { color: var(--text-secondary); }
        
        @media (max-width: 768px) {
          .theme-selector, .accent-selector, .animation-selector {
            flex-direction: column;
          }
          .action-buttons {
            flex-direction: column;
          }
          .preferences-list__item {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </section>
  )
}

export default PreferencesPage












// import './PreferencesPage.css'
// import { useEffect, useState, useCallback } from 'react'
// import { useWallet } from '../../hooks/useWallet'

// const PreferencesPage = () => {
//   const { isConnected, account, connect } = useWallet()

//   // Preference States with localStorage persistence
//   const [theme, setTheme] = useState('dark')
//   const [language, setLanguage] = useState('English')
//   const [timezone, setTimezone] = useState('Africa/Lagos')
//   const [accentStyle, setAccentStyle] = useState('default')
//   const [notifications, setNotifications] = useState({
//     platformAlerts: true,
//     progressUpdates: true,
//     promotionalNotices: false,
//     emailDigest: false,
//     pushNotifications: true
//   })
//   const [dataSaver, setDataSaver] = useState(false)
//   const [animationLevel, setAnimationLevel] = useState('full')
//   const [saveStatus, setSaveStatus] = useState({ show: false, message: '', type: '' })
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())

//   // Available options
//   const languages = [
//     { code: 'en', label: 'English', flag: '🇬🇧' },
//     { code: 'es', label: 'Español', flag: '🇪🇸' },
//     { code: 'fr', label: 'Français', flag: '🇫🇷' },
//     { code: 'ar', label: 'العربية', flag: '🇸🇦' },
//     { code: 'zh', label: '中文', flag: '🇨🇳' },
//     { code: 'ja', label: '日本語', flag: '🇯🇵' }
//   ]

//   const timezones = [
//     'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg',
//     'America/New_York', 'America/Los_Angeles', 'Europe/London',
//     'Europe/Paris', 'Asia/Dubai', 'Asia/Tokyo', 'Asia/Singapore'
//   ]

//   const accentStyles = [
//     { id: 'default', name: 'Default Glow', color: '#1de9b6' },
//     { id: 'blue', name: 'Ocean Blue', color: '#3b82f6' },
//     { id: 'purple', name: 'Royal Purple', color: '#8b5cf6' },
//     { id: 'gold', name: 'Golden', color: '#f59e0b' },
//     { id: 'pink', name: 'Candy Pink', color: '#ec4899' }
//   ]

//   const animationLevels = [
//     { id: 'full', name: 'Full Animation', description: 'All animations enabled' },
//     { id: 'reduced', name: 'Reduced', description: 'Minimal animations' },
//     { id: 'none', name: 'No Animation', description: 'Static interface' }
//   ]

//   // Load preferences from localStorage on mount
//   useEffect(() => {
//     const savedTheme = localStorage.getItem('ffn_theme')
//     const savedLanguage = localStorage.getItem('ffn_language')
//     const savedTimezone = localStorage.getItem('ffn_timezone')
//     const savedAccent = localStorage.getItem('ffn_accent')
//     const savedNotifications = localStorage.getItem('ffn_notifications')
//     const savedDataSaver = localStorage.getItem('ffn_data_saver')
//     const savedAnimation = localStorage.getItem('ffn_animation')

//     if (savedTheme) setTheme(savedTheme)
//     if (savedLanguage) setLanguage(savedLanguage)
//     if (savedTimezone) setTimezone(savedTimezone)
//     if (savedAccent) setAccentStyle(savedAccent)
//     if (savedDataSaver) setDataSaver(savedDataSaver === 'true')
//     if (savedAnimation) setAnimationLevel(savedAnimation)
    
//     if (savedNotifications) {
//       try {
//         setNotifications(JSON.parse(savedNotifications))
//       } catch (e) {}
//     }

//     // Apply theme to document
//     document.documentElement.setAttribute('data-theme', savedTheme || 'dark')
    
//     // Apply accent color to CSS variable
//     const accent = accentStyles.find(a => a.id === (savedAccent || 'default'))
//     if (accent) {
//       document.documentElement.style.setProperty('--glow-teal', accent.color)
//       document.documentElement.style.setProperty('--glow-blue', accent.color)
//     }
//   }, [])

//   // Save all preferences
//   const savePreferences = useCallback(() => {
//     localStorage.setItem('ffn_theme', theme)
//     localStorage.setItem('ffn_language', language)
//     localStorage.setItem('ffn_timezone', timezone)
//     localStorage.setItem('ffn_accent', accentStyle)
//     localStorage.setItem('ffn_notifications', JSON.stringify(notifications))
//     localStorage.setItem('ffn_data_saver', String(dataSaver))
//     localStorage.setItem('ffn_animation', animationLevel)

//     // Apply theme
//     document.documentElement.setAttribute('data-theme', theme)
    
//     // Apply accent color
//     const accent = accentStyles.find(a => a.id === accentStyle)
//     if (accent) {
//       document.documentElement.style.setProperty('--glow-teal', accent.color)
//       document.documentElement.style.setProperty('--glow-blue', accent.color)
//     }

//     setSaveStatus({ show: true, message: 'Preferences saved successfully!', type: 'success' })
//     setTimeout(() => setSaveStatus({ show: false, message: '', type: '' }), 3000)
//   }, [theme, language, timezone, accentStyle, notifications, dataSaver, animationLevel])

//   // Reset to defaults
//   const resetPreferences = useCallback(() => {
//     setTheme('dark')
//     setLanguage('English')
//     setTimezone('Africa/Lagos')
//     setAccentStyle('default')
//     setNotifications({
//       platformAlerts: true,
//       progressUpdates: true,
//       promotionalNotices: false,
//       emailDigest: false,
//       pushNotifications: true
//     })
//     setDataSaver(false)
//     setAnimationLevel('full')
    
//     setSaveStatus({ show: true, message: 'Preferences reset to defaults', type: 'info' })
//     setTimeout(() => setSaveStatus({ show: false, message: '', type: '' }), 3000)
//   }, [])

//   // Toggle notification setting
//   const toggleNotification = (key) => {
//     setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
//   }

//   // Get current accent color
//   const currentAccent = accentStyles.find(a => a.id === accentStyle)

//   if (!isConnected) {
//     return (
//       <section className="preferences-page">
//         <div className="preferences-hero">
//           <div className="preferences-hero__content">
//             <div className="preferences-hero__eyebrow glass-panel">
//               <span className="preferences-hero__eyebrow-dot" />
//               <span className="preferences-hero__eyebrow-text">Customize Your Experience</span>
//             </div>
//             <div className="preferences-hero__text-block">
//               <h1 className="preferences-hero__title">Preferences</h1>
//               <p className="preferences-hero__description soft-text">
//                 Connect your wallet to save and manage your preferences across devices.
//               </p>
//             </div>
//             <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
//           </div>
//           <div className="preferences-hero__visual glass-panel">
//             <div className="preferences-hero__visual-box">
//               <div style={{ textAlign: 'center' }}>
//                 <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚙️</div>
//                 <div>Connect to customize</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>
//     )
//   }

//   return (
//     <section className="preferences-page">
//       {/* Hero Section */}
//       <div className="preferences-hero">
//         <div className="preferences-hero__content">
//           <div className="preferences-hero__eyebrow glass-panel">
//             <span className="preferences-hero__eyebrow-dot" />
//             <span className="preferences-hero__eyebrow-text">
//               Display, language, and experience controls
//             </span>
//           </div>

//           <div className="preferences-hero__text-block">
//             <h1 className="preferences-hero__title">Preferences</h1>
//             <p className="preferences-hero__description soft-text">
//               Adjust language, appearance, notification behavior, and general platform
//               experience settings from one organized control page.
//             </p>
//             <div className="small muted-text">Connected: {account?.slice(0, 8)}...{account?.slice(-6)}</div>
//           </div>

//           <div className="preferences-hero__chips">
//             <span className="preferences-hero__chip glass-panel">
//               {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
//             </span>
//             <span className="preferences-hero__chip glass-panel">{language}</span>
//             <span className="preferences-hero__chip glass-panel">
//               {notifications.platformAlerts ? '🔔 Notifications On' : '🔕 Notifications Off'}
//             </span>
//           </div>
//         </div>

//         <div className="preferences-hero__visual glass-panel">
//           <div className="preferences-hero__visual-box">
//             <div className="preview-settings">
//               <div className="preview-card" style={{ background: currentAccent?.color }}>
//                 <span>🎨</span>
//                 <span>Preview</span>
//               </div>
//               <div className="preview-controls">
//                 <div className="preview-toggle"></div>
//                 <div className="preview-slider"></div>
//               </div>
//             </div>
//           </div>
//           <p className="preferences-hero__visual-note muted-text">
//             Live preview of your theme and accent settings
//           </p>
//         </div>
//       </div>

//       {/* Main Grid */}
//       <div className="preferences-main-grid">
//         <div className="preferences-main-grid__left">
          
//           {/* APPEARANCE SECTION */}
//           <section className="preferences-appearance glass-panel">
//             <div className="preferences-section-heading">
//               <span className="preferences-section-heading__eyebrow muted-text">
//                 Appearance
//               </span>
//               <h2 className="preferences-section-heading__title">
//                 Personalize how the platform looks and feels
//               </h2>
//             </div>

//             <div className="preferences-cards__grid">
//               <div className="preferences-card glass-panel">
//                 <span className="preferences-card__label muted-text">Theme</span>
//                 <div className="theme-selector">
//                   <button 
//                     className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
//                     onClick={() => setTheme('dark')}
//                   >
//                     🌙 Dark Mode
//                   </button>
//                   <button 
//                     className={`theme-option ${theme === 'light' ? 'active' : ''}`}
//                     onClick={() => setTheme('light')}
//                   >
//                     ☀️ Light Mode
//                   </button>
//                   <button 
//                     className={`theme-option ${theme === 'system' ? 'active' : ''}`}
//                     onClick={() => setTheme('system')}
//                   >
//                     💻 System Default
//                   </button>
//                 </div>
//                 <p className="preferences-card__text soft-text">
//                   Choose between dark, light, or system preference theme.
//                 </p>
//               </div>

//               <div className="preferences-card glass-panel">
//                 <span className="preferences-card__label muted-text">Accent Style</span>
//                 <div className="accent-selector">
//                   {accentStyles.map(accent => (
//                     <button
//                       key={accent.id}
//                       className={`accent-option ${accentStyle === accent.id ? 'active' : ''}`}
//                       style={{ '--accent-color': accent.color }}
//                       onClick={() => setAccentStyle(accent.id)}
//                     >
//                       <span className="accent-dot" style={{ background: accent.color }}></span>
//                       <span>{accent.name}</span>
//                     </button>
//                   ))}
//                 </div>
//                 <p className="preferences-card__text soft-text">
//                   Change the platform's primary color scheme.
//                 </p>
//               </div>

//               <div className="preferences-card glass-panel">
//                 <span className="preferences-card__label muted-text">Animation Level</span>
//                 <div className="animation-selector">
//                   {animationLevels.map(level => (
//                     <button
//                       key={level.id}
//                       className={`animation-option ${animationLevel === level.id ? 'active' : ''}`}
//                       onClick={() => setAnimationLevel(level.id)}
//                     >
//                       {level.name}
//                     </button>
//                   ))}
//                 </div>
//                 <p className="preferences-card__text soft-text">
//                   Control motion and animation intensity across the platform.
//                 </p>
//               </div>

//               <div className="preferences-card glass-panel">
//                 <span className="preferences-card__label muted-text">Data Saver Mode</span>
//                 <label className="toggle-switch">
//                   <input 
//                     type="checkbox" 
//                     checked={dataSaver}
//                     onChange={(e) => setDataSaver(e.target.checked)}
//                   />
//                   <span className="toggle-slider"></span>
//                   <span className="toggle-label">{dataSaver ? 'ON' : 'OFF'}</span>
//                 </label>
//                 <p className="preferences-card__text soft-text">
//                   Reduce image quality and disable auto-play to save bandwidth.
//                 </p>
//               </div>
//             </div>
//           </section>

//           {/* LANGUAGE & REGION SECTION */}
//           <section className="preferences-language glass-panel">
//             <div className="preferences-section-heading">
//               <span className="preferences-section-heading__eyebrow muted-text">
//                 Language & Region
//               </span>
//               <h2 className="preferences-section-heading__title">
//                 Choose your preferred communication setup
//               </h2>
//             </div>

//             <div className="preferences-cards__grid">
//               <div className="preferences-card glass-panel">
//                 <span className="preferences-card__label muted-text">Language</span>
//                 <select 
//                   className="preference-select"
//                   value={language}
//                   onChange={(e) => setLanguage(e.target.value)}
//                 >
//                   {languages.map(lang => (
//                     <option key={lang.code} value={lang.label}>
//                       {lang.flag} {lang.label}
//                     </option>
//                   ))}
//                 </select>
//                 <p className="preferences-card__text soft-text">
//                   Select your preferred language for the interface.
//                 </p>
//               </div>

//               <div className="preferences-card glass-panel">
//                 <span className="preferences-card__label muted-text">Timezone</span>
//                 <select 
//                   className="preference-select"
//                   value={timezone}
//                   onChange={(e) => setTimezone(e.target.value)}
//                 >
//                   {timezones.map(tz => (
//                     <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
//                   ))}
//                 </select>
//                 <p className="preferences-card__text soft-text">
//                   Set your local timezone for accurate timestamps.
//                 </p>
//               </div>

//               <div className="preferences-card glass-panel">
//                 <span className="preferences-card__label muted-text">Date Format</span>
//                 <div className="date-format-selector">
//                   <button className="format-option active">MM/DD/YYYY</button>
//                   <button className="format-option">DD/MM/YYYY</button>
//                   <button className="format-option">YYYY-MM-DD</button>
//                 </div>
//                 <p className="preferences-card__text soft-text">
//                   Choose how dates are displayed throughout the platform.
//                 </p>
//               </div>

//               <div className="preferences-card glass-panel">
//                 <span className="preferences-card__label muted-text">Number Format</span>
//                 <div className="number-format-selector">
//                   <button className="format-option active">1,234.56</button>
//                   <button className="format-option">1.234,56</button>
//                   <button className="format-option">1 234.56</button>
//                 </div>
//                 <p className="preferences-card__text soft-text">
//                   Choose your preferred number formatting.
//                 </p>
//               </div>
//             </div>
//           </section>
//         </div>

//         <div className="preferences-main-grid__right">
          
//           {/* NOTIFICATION PREFERENCES */}
//           <section className="preferences-notifications glass-panel">
//             <div className="preferences-section-heading">
//               <span className="preferences-section-heading__eyebrow muted-text">
//                 Notification Preferences
//               </span>
//               <h2 className="preferences-section-heading__title">
//                 Control how you receive updates and alerts
//               </h2>
//             </div>

//             <div className="preferences-list">
//               <div className="preferences-list__item glass-panel">
//                 <div className="preferences-list__info">
//                   <span className="preferences-list__label">Platform Alerts</span>
//                   <span className="preferences-list__desc soft-text">System announcements and maintenance updates</span>
//                 </div>
//                 <label className="toggle-switch small">
//                   <input 
//                     type="checkbox" 
//                     checked={notifications.platformAlerts}
//                     onChange={() => toggleNotification('platformAlerts')}
//                   />
//                   <span className="toggle-slider"></span>
//                 </label>
//               </div>

//               <div className="preferences-list__item glass-panel">
//                 <div className="preferences-list__info">
//                   <span className="preferences-list__label">Progress Updates</span>
//                   <span className="preferences-list__desc soft-text">Level activation and orbit activity notifications</span>
//                 </div>
//                 <label className="toggle-switch small">
//                   <input 
//                     type="checkbox" 
//                     checked={notifications.progressUpdates}
//                     onChange={() => toggleNotification('progressUpdates')}
//                   />
//                   <span className="toggle-slider"></span>
//                 </label>
//               </div>

//               <div className="preferences-list__item glass-panel">
//                 <div className="preferences-list__info">
//                   <span className="preferences-list__label">Promotional Notices</span>
//                   <span className="preferences-list__desc soft-text">Special offers, events, and community news</span>
//                 </div>
//                 <label className="toggle-switch small">
//                   <input 
//                     type="checkbox" 
//                     checked={notifications.promotionalNotices}
//                     onChange={() => toggleNotification('promotionalNotices')}
//                   />
//                   <span className="toggle-slider"></span>
//                 </label>
//               </div>

//               <div className="preferences-list__item glass-panel">
//                 <div className="preferences-list__info">
//                   <span className="preferences-list__label">Email Digest</span>
//                   <span className="preferences-list__desc soft-text">Weekly summary of your activity</span>
//                 </div>
//                 <label className="toggle-switch small">
//                   <input 
//                     type="checkbox" 
//                     checked={notifications.emailDigest}
//                     onChange={() => toggleNotification('emailDigest')}
//                   />
//                   <span className="toggle-slider"></span>
//                 </label>
//               </div>

//               <div className="preferences-list__item glass-panel">
//                 <div className="preferences-list__info">
//                   <span className="preferences-list__label">Push Notifications</span>
//                   <span className="preferences-list__desc soft-text">Real-time browser notifications</span>
//                 </div>
//                 <label className="toggle-switch small">
//                   <input 
//                     type="checkbox" 
//                     checked={notifications.pushNotifications}
//                     onChange={() => toggleNotification('pushNotifications')}
//                   />
//                   <span className="toggle-slider"></span>
//                 </label>
//               </div>
//             </div>
//           </section>

//           {/* SAVE ACTIONS */}
//           <section className="preferences-actions glass-panel">
//             <div className="preferences-section-heading">
//               <span className="preferences-section-heading__eyebrow muted-text">
//                 Save Changes
//               </span>
//               <h2 className="preferences-section-heading__title">
//                 Apply your preferences
//               </h2>
//             </div>

//             {saveStatus.show && (
//               <div className={`save-status ${saveStatus.type}`}>
//                 {saveStatus.type === 'success' ? '✓' : 'ℹ'} {saveStatus.message}
//               </div>
//             )}

//             <div className="action-buttons">
//               <button className="save-btn" onClick={savePreferences}>
//                 💾 Save All Preferences
//               </button>
//               <button className="reset-btn" onClick={resetPreferences}>
//                 🔄 Reset to Defaults
//               </button>
//             </div>

//             <p className="preferences-card__text soft-text">
//               Your preferences are saved locally and will persist across sessions.
//             </p>
//             <small className="data-source">Data Source: Local Storage</small>
//           </section>

//           {/* VISUAL SLOT */}
//           <section className="preferences-visual glass-panel">
//             <div className="preferences-section-heading">
//               <span className="preferences-section-heading__eyebrow muted-text">
//                 Visual Slot
//               </span>
//               <h2 className="preferences-section-heading__title">
//                 Reserved settings visual area
//               </h2>
//             </div>

//             <div className="preferences-visual__box">
//               <div className="settings-icon">⚙️</div>
//               <div className="settings-gear"></div>
//             </div>

//             <p className="preferences-visual__note muted-text">
//               Customize every aspect of your FFN experience.
//             </p>
//           </section>
//         </div>
//       </div>

//       <style>{`
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
        
//         /* Preview Settings */
//         .preview-settings {
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           gap: 16px;
//         }
//         .preview-card {
//           width: 80px;
//           height: 80px;
//           border-radius: 20px;
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: center;
//           gap: 8px;
//           font-size: 24px;
//           color: white;
//           transition: background 0.3s ease;
//         }
//         .preview-card span:last-child {
//           font-size: 12px;
//         }
//         .preview-controls {
//           display: flex;
//           gap: 12px;
//         }
//         .preview-toggle {
//           width: 40px;
//           height: 20px;
//           background: rgba(255,255,255,0.3);
//           border-radius: 20px;
//         }
//         .preview-slider {
//           width: 60px;
//           height: 4px;
//           background: rgba(255,255,255,0.3);
//           border-radius: 2px;
//         }
        
//         /* Theme Selector */
//         .theme-selector {
//           display: flex;
//           gap: 12px;
//           margin: 12px 0;
//           flex-wrap: wrap;
//         }
//         .theme-option {
//           padding: 8px 16px;
//           border-radius: 30px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           cursor: pointer;
//           transition: all 0.2s;
//         }
//         .theme-option.active {
//           background: var(--glow-teal);
//           color: #07111f;
//           border-color: var(--glow-teal);
//         }
        
//         /* Accent Selector */
//         .accent-selector {
//           display: flex;
//           gap: 12px;
//           margin: 12px 0;
//           flex-wrap: wrap;
//         }
//         .accent-option {
//           display: flex;
//           align-items: center;
//           gap: 8px;
//           padding: 8px 16px;
//           border-radius: 30px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           cursor: pointer;
//           transition: all 0.2s;
//         }
//         .accent-option.active {
//           background: rgba(255,255,255,0.2);
//           border-color: var(--accent-color);
//         }
//         .accent-dot {
//           width: 12px;
//           height: 12px;
//           border-radius: 50%;
//         }
        
//         /* Animation Selector */
//         .animation-selector {
//           display: flex;
//           gap: 12px;
//           margin: 12px 0;
//           flex-wrap: wrap;
//         }
//         .animation-option {
//           padding: 8px 16px;
//           border-radius: 30px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           cursor: pointer;
//         }
//         .animation-option.active {
//           background: var(--glow-teal);
//           color: #07111f;
//         }
        
//         /* Toggle Switch */
//         .toggle-switch {
//           position: relative;
//           display: inline-flex;
//           align-items: center;
//           gap: 12px;
//           cursor: pointer;
//         }
//         .toggle-switch input {
//           opacity: 0;
//           width: 0;
//           height: 0;
//         }
//         .toggle-switch .toggle-slider {
//           position: relative;
//           display: inline-block;
//           width: 50px;
//           height: 24px;
//           background: rgba(255,255,255,0.2);
//           border-radius: 24px;
//           transition: 0.3s;
//         }
//         .toggle-switch .toggle-slider:before {
//           position: absolute;
//           content: "";
//           height: 18px;
//           width: 18px;
//           left: 3px;
//           bottom: 3px;
//           background: white;
//           border-radius: 50%;
//           transition: 0.3s;
//         }
//         .toggle-switch input:checked + .toggle-slider {
//           background: var(--glow-teal);
//         }
//         .toggle-switch input:checked + .toggle-slider:before {
//           transform: translateX(26px);
//         }
//         .toggle-switch.small .toggle-slider {
//           width: 40px;
//           height: 20px;
//         }
//         .toggle-switch.small .toggle-slider:before {
//           height: 14px;
//           width: 14px;
//         }
//         .toggle-label {
//           font-size: 12px;
//         }
        
//         /* Preference Select */
//         .preference-select {
//           width: 100%;
//           padding: 10px;
//           border-radius: 10px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           margin: 12px 0;
//           cursor: pointer;
//         }
        
//         /* Date/Number Format Selectors */
//         .date-format-selector, .number-format-selector {
//           display: flex;
//           gap: 8px;
//           margin: 12px 0;
//           flex-wrap: wrap;
//         }
//         .format-option {
//           padding: 6px 12px;
//           border-radius: 20px;
//           background: rgba(255,255,255,0.1);
//           border: none;
//           color: white;
//           cursor: pointer;
//           font-size: 11px;
//         }
//         .format-option.active {
//           background: var(--glow-teal);
//           color: #07111f;
//         }
        
//         /* Preferences List Item */
//         .preferences-list__item {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           flex-wrap: wrap;
//           gap: 16px;
//         }
//         .preferences-list__info {
//           flex: 1;
//         }
//         .preferences-list__desc {
//           display: block;
//           font-size: 11px;
//           margin-top: 4px;
//         }
        
//         /* Action Buttons */
//         .action-buttons {
//           display: flex;
//           gap: 16px;
//           margin: 16px 0;
//           flex-wrap: wrap;
//         }
//         .save-btn, .reset-btn {
//           flex: 1;
//           padding: 12px;
//           border-radius: 12px;
//           font-weight: bold;
//           border: none;
//           cursor: pointer;
//           transition: all 0.2s;
//         }
//         .save-btn {
//           background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//           color: #07111f;
//         }
//         .reset-btn {
//           background: rgba(255,255,255,0.1);
//           color: white;
//           border: 1px solid rgba(255,255,255,0.2);
//         }
//         .save-btn:hover, .reset-btn:hover {
//           transform: translateY(-2px);
//         }
        
//         /* Save Status */
//         .save-status {
//           padding: 12px;
//           border-radius: 10px;
//           margin-bottom: 16px;
//           text-align: center;
//           font-size: 13px;
//         }
//         .save-status.success {
//           background: rgba(29, 233, 182, 0.15);
//           border: 1px solid var(--glow-teal);
//           color: var(--glow-teal);
//         }
//         .save-status.info {
//           background: rgba(77, 163, 255, 0.15);
//           border: 1px solid var(--glow-blue);
//           color: var(--glow-blue);
//         }
        
//         /* Settings Visual */
//         .settings-icon {
//           font-size: 48px;
//           animation: spin-slow 4s linear infinite;
//         }
//         @keyframes spin-slow {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }
        
//         .small { font-size: 12px; }
//         .muted-text { color: var(--text-secondary); }
        
//         @media (max-width: 768px) {
//           .theme-selector, .accent-selector, .animation-selector {
//             flex-direction: column;
//           }
//           .action-buttons {
//             flex-direction: column;
//           }
//           .preferences-list__item {
//             flex-direction: column;
//             align-items: flex-start;
//           }
//         }
//       `}</style>
//     </section>
//   )
// }

// export default PreferencesPage