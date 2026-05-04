import { useEffect, useState, useRef } from 'react'
import AccountDropdown from '../../dropdowns/AccountDropdown/AccountDropdown'
import LanguageDropdown from '../../dropdowns/LanguageDropdown/LanguageDropdown'
import NotificationDropdown from '../../dropdowns/NotificationDropdown/NotificationDropdown'
import WalletPanel from '../../dropdowns/WalletPanel/WalletPanel'
import useOutsideClick from '../../../hooks/useOutsideClick'
import { Sun, Moon, Globe, Bell, UserCircle2, ChevronDown } from 'lucide-react'
import './MainNavbar.css'

const ABOUT_MENU_ITEMS = [
  { label: 'Who we are', href: 'about', section: 'who-we-are' },
  { label: 'Our purpose', href: 'about', section: 'our-purpose' },
  { label: 'Our foundation', href: 'about', section: 'our-foundation' },
  { label: 'Our core values', href: 'about', section: 'our-core-values' },
  { label: 'Our commitment', href: 'about', section: 'our-commitment' },
]

// const SERVICES = [
//   'F-Freedom Program',
//   'Freedom-Plus Program',
//   'Freedom NFT Program',
//   'Fin Freedom Marketplace',
//   'Fin Freedom Coin',
//   'Fin Freedom Institute',
// ]

const SERVICES = [
  {
    label: 'F-Freedom Program',
    description: 'Wallet-first participation flow, orbit progression, and live program entry.',
    links: ['Get started', 'Level Manager', 'My Tokens', 'F-Freedom Program Dashboard'],
  },
  {
    label: 'Freedom-Plus Program',
    description: 'Advanced expansion layer for future premium participation utilities.',
    links: ['Overview', 'Level Manager', 'My Tokens', 'Freedom Plus Progra Dashboard'],
  },
  {
    label: 'Freedom NFT Program',
    description: 'NFT identity, access visuals, and future collectible utility layer.',
    links: ['NFT Overview', 'Nft Foundation', 'Nft InterMediate', 'Nft Advanced', 'Utility Role', 'Nft Program Dashboard'],
  },
  {
    label: 'Fin Freedom Coin',
    description: 'Coin visual layer for future network identity and ecosystem awareness.',
    links: ['FFC Overview', 'Utility Tokens', 'Future Utility', 'FFC Program Dashboard'],
  },
  {
    label: 'Fin Freedom Marketplace',
    description: 'Future ecosystem marketplace for digital and program-related utilities.',
    links: ['Marketplace Vision', 'Vendor Layer', 'Ecosystem Use', 'Fin Freedom Store', 'My Orders'],
  },
  {
    label: 'Fin Freedom Institute',
    description: 'Learning, onboarding, training, and community education layer.',
    links: ['Overview', 'FFN-Digital Academy', 'FFN-Leadership Academy', 'Training Path', 'Community Learning', 'FFI-Dashboard'],
  },
]


const MainNavbar = ({
  brand = 'Fin Freedom Network',
  navItems = [],
  onNavigate,
  onMenuClick,
  theme = 'dark',
  onToggleTheme,

  isNotificationsOpen = false,
  onToggleNotifications,
  onCloseNotifications,
  notifications = [],
  onMarkAllNotificationsRead,
  onClearNotifications,
  onNotificationClick,

  isLanguageOpen = false,
  onToggleLanguage,
  onCloseLanguage,
  languages = [],
  currentLanguage = 'English',
  onSelectLanguage,

  isWalletOpen = false,
  onToggleWallet,
  onCloseWallet,
  wallet = null,

  isAccountOpen = false,
  onToggleAccount,
  onCloseAccount,
  account = null,

  onConnectWallet,
  onDisconnectWallet,
  onOpenAdminPanel,
  isAdmin,
}) => {
  const [noticeHeight, setNoticeHeight] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAboutMenuOpen, setIsAboutMenuOpen] = useState(false)
  const [isServicesOpen, setIsServicesOpen] = useState(false)
//const [activeService, setActiveService] = useState(null)
  const [activeService, setActiveService] = useState(SERVICES[0])
  const aboutMenuRef = useRef(null)
  const servicesRef = useRef(null)

  useEffect(() => {
    const updateNoticeHeight = () => {
      const noticeBar = document.querySelector('.top-notice')

      if (noticeBar && noticeBar.offsetHeight > 0) {
        const rect = noticeBar.getBoundingClientRect()
        if (rect.bottom > 0) {
          setNoticeHeight(noticeBar.offsetHeight)
        } else {
          setNoticeHeight(0)
        }
      } else {
        setNoticeHeight(0)
      }
    }

    updateNoticeHeight()

    window.addEventListener('scroll', updateNoticeHeight)
    window.addEventListener('resize', updateNoticeHeight)

    const observer = new MutationObserver(updateNoticeHeight)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    return () => {
      window.removeEventListener('scroll', updateNoticeHeight)
      window.removeEventListener('resize', updateNoticeHeight)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 12)
    }

    updateScrollState()

    window.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      window.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!aboutMenuRef.current) return
      if (!aboutMenuRef.current.contains(event.target)) {
        setIsAboutMenuOpen(false)
      }
      if (servicesRef.current && !servicesRef.current.contains(event.target)) {
        setIsServicesOpen(false)
        setActiveService(SERVICES[0])
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAboutMenuOpen(false)
        setIsServicesOpen(false)
        setActiveService(SERVICES[0])
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const isDark = theme === 'dark'
  const unreadCount = notifications.filter((item) => !item.read).length

  // Button refs for anchor positioning (all dropdowns)
  const languageButtonRef = useRef(null)
  const notificationButtonRef = useRef(null)
  const walletButtonRef = useRef(null)
  const accountButtonRef = useRef(null)
  
  // Wrapper ref - ONLY for Wallet until it's portaled
  // Language, Notifications, and Account use portal backdrops
  // const walletWrapperRef = useRef(null)

  // TEMPORARY: useOutsideClick only for Wallet (remove after updating to portal)
  // useOutsideClick(walletWrapperRef, onCloseWallet, isWalletOpen)

  const walletStatus = wallet?.status || 'Disconnected'

  const walletLabel =
    walletStatus === 'Connected'
      ? wallet?.address || 'Connected'
      : walletStatus === 'Connecting'
        ? 'Connecting...'
        : 'Connect'

  const walletDotClassName = [
    'main-navbar__wallet-dot',
    walletStatus === 'Disconnected' ? 'is-disconnected' : '',
    walletStatus === 'Connecting' ? 'is-loading' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleToggleNotifications = () => {
    onToggleNotifications?.()
  }

  const handleCloseNotifications = () => {
    onCloseNotifications?.()
  }

  const handleToggleAboutMenu = () => {
    setIsAboutMenuOpen((current) => !current)
  }

  const handleAboutItemClick = (aboutItem) => {
    setIsAboutMenuOpen(false)
    onNavigate?.(aboutItem.href, aboutItem.section)
  }

  return (
    <header
      className={`main-navbar ${isScrolled ? 'is-scrolled' : ''}`}
      style={{ top: noticeHeight ? `${noticeHeight}px` : '0' }}
    >
      <div className="app-container">
        <div className="main-navbar__inner glass-panel">
          <div className="main-navbar__left">
            <button
              type="button"
              className="main-navbar__menu-btn"
              onClick={onMenuClick}
            >
              <span />
              <span />
              <span />
            </button>

            <button
              type="button"
              className="main-navbar__brand"
              onClick={() => onNavigate?.('home')}
            >
              {/* <div className="main-navbar__brand-logo-wrap">
                <img
                  src="/images/official_logo_2.png"
                  alt="Fin Freedom Network"
                  className="main-navbar__brand-logo"
                />
              </div> */}
              <div className="main-navbar__brand-logo-wrap">
                <picture className="main-navbar__brand-logo-picture">
                    <img
                    src={isDark ? '/images/official_logo_2.png' : '/images/official_logo_light.png'}
                    alt="Fin Freedom Network"
                    className="main-navbar__brand-logo"
                    />
                </picture>
                </div>
            </button>
          </div>

          <nav className="main-navbar__center">

            {/* NORMAL NAV ITEMS */}
            {navItems
              .filter(item =>
                !['dashboard', 'activation', 'orbits'].includes(item.href)
              )
              .map((item) => {
                const isAbout = item.href === 'about'

                if (isAbout) {
                  return (
                    <div
                      key={item.label}
                      ref={aboutMenuRef}
                      className={`main-navbar__nav-dropdown ${isAboutMenuOpen ? 'is-open' : ''}`}
                    >
                      <button
                        className="main-navbar__link main-navbar__link--dropdown"
                        onClick={handleToggleAboutMenu}
                      >
                        {item.label}
                        <ChevronDown size={14} />
                      </button>

                      <div className="main-navbar__about-menu">
                        {ABOUT_MENU_ITEMS.map((aboutItem) => (
                          <button
                            key={aboutItem.section}
                            className="main-navbar__about-menu-item"
                            onClick={() => handleAboutItemClick(aboutItem)}
                          >
                            {aboutItem.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                }

                return (
                  <button
                    key={item.label}
                    className="main-navbar__link"
                    onClick={() => onNavigate?.(item.href)}
                  >
                    {item.label}
                  </button>
                )
              })}

            {/* 🔥 SERVICES DROPDOWN */}
            <div
              className={`main-navbar__nav-dropdown ${isServicesOpen ? 'is-open' : ''}`}
              ref={servicesRef}
            >
              <button
                className="main-navbar__link main-navbar__link--dropdown"
                onClick={() => setIsServicesOpen(!isServicesOpen)}
              >
                Services
                <ChevronDown size={14} />
              </button>

              <div className="main-navbar__services-menu">

                {/* <div className="main-navbar__services-left">
                  {SERVICES.map((service) => (
                    <button
                      key={service}
                      className={`main-navbar__service-item ${
                        activeService === service ? 'is-active' : ''
                      }`}
                      onMouseEnter={() => setActiveService(service)}
                    >
                      {service}
                    </button>
                  ))}
                </div>

                <div className="main-navbar__services-right">
                  {activeService && (
                    <div className="main-navbar__service-content">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          className="main-navbar__service-subitem"
                        >
                          {activeService} Option {i}
                        </button>
                      ))}
                    </div>
                  )}
                </div> */}

                <div className="main-navbar__services-left">
                    {SERVICES.map((service) => (
                      <button
                        key={service.label}
                        className={`main-navbar__service-item ${
                          activeService?.label === service.label ? 'is-active' : ''
                        }`}
                        onMouseEnter={() => setActiveService(service)}
                        onFocus={() => setActiveService(service)}
                        onClick={() => setActiveService(service)}
                      >
                        {service.label}
                      </button>
                    ))}
                  </div>

                  <div className="main-navbar__services-right">
                    {activeService && (
                      <div className="main-navbar__service-content">
                        <div className="main-navbar__service-summary">
                          {/* <strong>{activeService.label}</strong> */}
                          <span>{activeService.description}</span>
                        </div>

                        {activeService.links.map((link) => (
                          <button
                            key={link}
                            className="main-navbar__service-subitem"
                            onClick={() => {
                              setIsServicesOpen(false)
                              onNavigate?.('services')
                            }}
                          >
                            {link}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

              </div>
            </div>

          </nav>

          <div className="main-navbar__right">
            <button
              className="main-navbar__action-btn"
              onClick={onToggleTheme}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* LANGUAGE DROPDOWN - Portal handles its own closing ✅ */}
            <div className="main-navbar__floating-wrap">
              <button
                ref={languageButtonRef}
                className="main-navbar__action-btn"
                onClick={onToggleLanguage}
              >
                <Globe size={18} />
              </button>

              <LanguageDropdown
                isOpen={isLanguageOpen}
                anchorRef={languageButtonRef}
                languages={languages}
                currentLanguage={currentLanguage}
                onSelectLanguage={onSelectLanguage}
                onClose={onCloseLanguage}
              />
            </div>

            {/* NOTIFICATION DROPDOWN - Portal handles its own closing ✅ */}
            <div className="main-navbar__floating-wrap">
              <button
                ref={notificationButtonRef}
                className="main-navbar__action-btn main-navbar__notification-btn"
                onClick={handleToggleNotifications}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="main-navbar__notification-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <NotificationDropdown
                isOpen={isNotificationsOpen}
                anchorRef={notificationButtonRef}
                notifications={notifications}
                onClose={handleCloseNotifications}
                onMarkAllRead={onMarkAllNotificationsRead}
                onClearNotifications={onClearNotifications}
                onNotificationClick={onNotificationClick}
              />
            </div>

            {/* WALLET PANEL - Still uses useOutsideClick (update to portal later) */}
            {/* <div className="main-navbar__floating-wrap" ref={walletWrapperRef}> */}
            <div className="main-navbar__floating-wrap">
              <button
                ref={walletButtonRef}
                className="main-navbar__wallet"
                onClick={() => {
                  if (walletStatus === 'Disconnected') {
                    onConnectWallet?.()
                    return
                  }
                  onToggleWallet?.()
                }}
              >
                <span className={walletDotClassName} />
                <span className="main-navbar__wallet-text">{walletLabel}</span>
              </button>

              <WalletPanel
                isOpen={isWalletOpen}
                anchorRef={walletButtonRef}
                wallet={wallet}
                onClose={onCloseWallet}
                onConnect={onConnectWallet}
                onDisconnect={onDisconnectWallet}
              />
            </div>

            {/* ACCOUNT DROPDOWN - Portal handles its own closing ✅ */}
            <div className="main-navbar__floating-wrap">
              <button
                ref={accountButtonRef}
                className="main-navbar__account"
                onClick={onToggleAccount}
              >
                <span className="main-navbar__account-avatar">
                  <UserCircle2 size={18} />
                </span>
              </button>

              <AccountDropdown
                isOpen={isAccountOpen}
                anchorRef={accountButtonRef}
                account={account}
                onClose={onCloseAccount}
                onOpenAccountPage={() => onNavigate?.('account')}
                onOpenPreferences={() => onNavigate?.('preferences')}
                onOpenSecurity={() => onNavigate?.('security')}
                onOpenActivity={() => onNavigate?.('activity')}
                onDisconnect={onDisconnectWallet}
                isAdmin={isAdmin}
                onOpenAdminPanel={onOpenAdminPanel}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default MainNavbar
