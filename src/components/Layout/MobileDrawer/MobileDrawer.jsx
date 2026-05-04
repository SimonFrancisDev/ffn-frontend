import './MobileDrawer.css'
import { useEffect, useState } from 'react'
import { Sun, Moon, Globe, Bell, Wallet, User, X, ChevronDown } from 'lucide-react'

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

const MobileDrawer = ({
  isOpen = false,
  onClose,
  brand = 'Fin Freedom',
  navItems = [],
  onNavigate,
  theme = 'dark',
  onToggleTheme,
  onOpenNotifications,
  onOpenLanguage,
  onOpenWallet,
  onOpenAccount,
  account = null,
  wallet = null,
  isAdmin = false,
  onOpenAdminPanel,
}) => {
  const isDark = theme === 'dark'
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isServicesOpen, setIsServicesOpen] = useState(false)
  // const [activeService, setActiveService] = useState(null)
  const [activeService, setActiveService] = useState(SERVICES[0])
  const profileName = account?.name || 'Your Account'
  const profileStatus =
    wallet?.status === 'Connected'
      ? `Wallet connected • ${wallet?.address || ''}`
      : wallet?.status === 'Connecting'
        ? 'Wallet connecting...'
        : 'Wallet disconnected'

  useEffect(() => {
    if (!isOpen) {
      setIsAboutOpen(false)
      setIsServicesOpen(false)
      setActiveService(null)
    }
  }, [isOpen])

  const openAfterClose = (callback) => {
    onClose?.()
    window.setTimeout(() => {
      callback?.()
    }, 220)
  }

  const handleNotificationsClick = () => {
    openAfterClose(onOpenNotifications)
  }

  const handleLanguageClick = () => {
    openAfterClose(onOpenLanguage)
  }

  const handleWalletClick = () => {
    openAfterClose(onOpenWallet)
  }

  const handleAccountClick = () => {
    openAfterClose(onOpenAccount)
  }

  const handleNavigate = (page, section) => {
    onNavigate?.(page, section)
    onClose?.()
  }

  const handleToggleAbout = () => {
    setIsAboutOpen((current) => !current)
  }

  return (
    <>
      <div
        className={`mobile-drawer__overlay ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <aside
        className={`mobile-drawer ${isOpen ? 'is-open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="mobile-drawer__header">
          <button
            type="button"
            className="mobile-drawer__brand"
            onClick={() => handleNavigate('home')}
          >
            <div className="mobile-drawer__brand-text">
              <span className="mobile-drawer__brand-name">{brand}</span>
              <span className="mobile-drawer__brand-tag soft-text">
                Live platform
              </span>
            </div>
          </button>

          <button
            type="button"
            className="mobile-drawer__close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mobile-drawer__profile glass-panel">
          <div className="mobile-drawer__avatar">{account?.initials || 'U'}</div>
          <div className="mobile-drawer__profile-text">
            <span className="mobile-drawer__profile-name">{profileName}</span>
            <span className="mobile-drawer__profile-status soft-text">
              {profileStatus}
            </span>
          </div>
        </div>

        <nav className="mobile-drawer__nav" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const isAbout = item.href === 'about'

            if (isAbout) {
              return (
                <div
                  key={item.label}
                  className={`mobile-drawer__nav-group ${item.active ? 'is-active' : ''} ${
                    isAboutOpen ? 'is-open' : ''
                  }`}
                >
                  <button
                    type="button"
                    className={`mobile-drawer__link mobile-drawer__link--about ${item.active ? 'is-active' : ''}`}
                    onClick={handleToggleAbout}
                    aria-expanded={isAboutOpen}
                    aria-controls="mobile-about-submenu"
                  >
                    <span className="mobile-drawer__link-text">{item.label}</span>
                    <ChevronDown size={16} />
                  </button>

                  <div
                    id="mobile-about-submenu"
                    className="mobile-drawer__submenu"
                    aria-hidden={!isAboutOpen}
                  >
                    {ABOUT_MENU_ITEMS.map((aboutItem) => (
                      <button
                        key={aboutItem.section}
                        type="button"
                        className="mobile-drawer__submenu-link"
                        onClick={() => handleNavigate(aboutItem.href, aboutItem.section)}
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
                type="button"
                className={`mobile-drawer__link ${item.active ? 'is-active' : ''}`}
                onClick={() => handleNavigate(item.href)}
              >
                <span className="mobile-drawer__link-text">{item.label}</span>
                <span className="mobile-drawer__link-arrow">›</span>
              </button>
            )
          })}


          {/* SERVICES SECTION */}
              <div
                className={`mobile-drawer__nav-group mobile-drawer__nav-group--services ${
                  isServicesOpen ? 'is-open' : ''
                }`}
              >
                <button
                  type="button"
                  className="mobile-drawer__link mobile-drawer__link--about"
                  onClick={() => setIsServicesOpen((current) => !current)}
                  aria-expanded={isServicesOpen}
                  aria-controls="mobile-services-submenu"
                >
                  <span className="mobile-drawer__link-text">Services</span>
                  <ChevronDown size={16} />
                </button>

                <div
                  id="mobile-services-submenu"
                  className="mobile-drawer__submenu"
                  aria-hidden={!isServicesOpen}
                >
                  {SERVICES.map((service) => (
                    <div
                      key={service.label}
                      className={`mobile-drawer__service-group ${
                        activeService?.label === service.label ? 'is-open' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="mobile-drawer__submenu-link mobile-drawer__service-main"
                        onClick={() =>
                          setActiveService(
                            activeService?.label === service.label ? null : service
                          )
                        }
                      >
                        <span>{service.label}</span>
                        <ChevronDown size={14} />
                      </button>

                      <div className="mobile-drawer__service-submenu">
                        <p className="mobile-drawer__service-description">
                          {service.description}
                        </p>

                        {service.links.map((link) => (
                          <button
                            key={link}
                            type="button"
                            className="mobile-drawer__service-subitem"
                            onClick={() => handleNavigate('services')}
                          >
                            {link}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

          {isAdmin && (
            <button
              type="button"
              className="mobile-drawer__link"
              onClick={() => handleNavigate('admin')}
            >
              <span className="mobile-drawer__link-text">Admin Panel</span>
              <span className="mobile-drawer__link-arrow">›</span>
            </button>
          )}
        </nav>

        <div className="mobile-drawer__utilities">
          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={handleLanguageClick}
            aria-label="Open language menu"
          >
            <span className="mobile-drawer__utility-icon">
              <Globe size={18} />
            </span>
            <span className="mobile-drawer__utility-text">Language</span>
          </button>

          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={handleNotificationsClick}
            aria-label="Open notifications"
          >
            <span className="mobile-drawer__utility-icon">
              <Bell size={18} />
            </span>
            <span className="mobile-drawer__utility-text">Notifications</span>
          </button>

          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <span className="mobile-drawer__utility-icon">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            <span className="mobile-drawer__utility-text">
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={handleWalletClick}
            aria-label="Open wallet panel"
          >
            <span className="mobile-drawer__utility-icon">
              <Wallet size={18} />
            </span>
            <span className="mobile-drawer__utility-text">
              {wallet?.status === 'Connected' ? 'Wallet' : 'Connect Wallet'}
            </span>
          </button>

          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={handleAccountClick}
            aria-label="Open account menu"
          >
            <span className="mobile-drawer__utility-icon">
              <User size={18} />
            </span>
            <span className="mobile-drawer__utility-text">Account</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default MobileDrawer