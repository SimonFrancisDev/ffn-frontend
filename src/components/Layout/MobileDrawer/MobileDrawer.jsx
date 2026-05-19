import './MobileDrawer.css'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Globe, Bell, Wallet, User, X, ChevronDown } from 'lucide-react'

const ABOUT_MENU_ITEMS = [
  { label: 'Who we are', labelKey: 'navbar.menus.about.whoWeAre', href: 'about', section: 'who-we-are' },
  { label: 'Our purpose', labelKey: 'navbar.menus.about.ourPurpose', href: 'about', section: 'our-purpose' },
  { label: 'Our foundation', labelKey: 'navbar.menus.about.ourFoundation', href: 'about', section: 'our-foundation' },
  { label: 'Our core values', labelKey: 'navbar.menus.about.ourCoreValues', href: 'about', section: 'our-core-values' },
  { label: 'Our commitment', labelKey: 'navbar.menus.about.ourCommitment', href: 'about', section: 'our-commitment' },
]

const SERVICES = [
  {
    label: 'F-Freedom Program',
    labelKey: 'navbar.menus.services.fFreedomProgram.label',
    description: 'Wallet-first participation flow, orbit progression, and live program entry.',
    descriptionKey: 'navbar.menus.services.fFreedomProgram.description',
    links: [
      {
        label: 'F-Freedom Overview',
        labelKey: 'navbar.menus.services.fFreedomProgram.links.overview',
        target: 'fFreedomProgram',
      },
      {
        label: 'Activations & Level Manager',
        labelKey: 'navbar.menus.services.fFreedomProgram.links.activation',
        target: 'activation',
      },
      {
        label: 'My F-Freedom Tokens',
        labelKey: 'navbar.menus.services.fFreedomProgram.links.tokens',
        target: 'myTokens',
      },
      {
        label: 'F-Freedom Program Dashboard',
        labelKey: 'navbar.menus.services.fFreedomProgram.links.dashboard',
        target: 'dashboard',
      },
    ],
  },
  {
    label: 'Freedom-Plus Program',
    labelKey: 'navbar.menus.services.freedomPlusProgram.label',
    description: 'Advanced expansion layer for future premium participation utilities.',
    descriptionKey: 'navbar.menus.services.freedomPlusProgram.description',
    links: [
      {
        label: 'Freedom-Plus Overview',
        labelKey: 'navbar.menus.services.freedomPlusProgram.links.overview',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Freedom-Plus Activations & Level Manager',
        labelKey: 'navbar.menus.services.freedomPlusProgram.links.activation',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'My Freedom-Plus Tokens',
        labelKey: 'navbar.menus.services.freedomPlusProgram.links.tokens',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Freedom-Plus Program Dashboard',
        labelKey: 'navbar.menus.services.freedomPlusProgram.links.dashboard',
        target: 'home',
        section: 'programs',
      },
    ],
  },
  {
    label: 'Freedom NFT Program',
    labelKey: 'navbar.menus.services.freedomNftProgram.label',
    description: 'NFT identity, access visuals, and future collectible utility layer.',
    descriptionKey: 'navbar.menus.services.freedomNftProgram.description',
    links: [
      {
        label: 'NFT Overview',
        labelKey: 'navbar.menus.services.freedomNftProgram.links.overview',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'NFT Foundation',
        labelKey: 'navbar.menus.services.freedomNftProgram.links.foundation',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'NFT Intermediate',
        labelKey: 'navbar.menus.services.freedomNftProgram.links.intermediate',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'NFT Advanced',
        labelKey: 'navbar.menus.services.freedomNftProgram.links.advanced',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Utility Role',
        labelKey: 'navbar.menus.services.freedomNftProgram.links.utilityRole',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'NFT Program Dashboard',
        labelKey: 'navbar.menus.services.freedomNftProgram.links.dashboard',
        target: 'home',
        section: 'programs',
      },
    ],
  },
  {
    label: 'Fin Freedom Coin',
    labelKey: 'navbar.menus.services.finFreedomCoin.label',
    description: 'Coin visual layer for future network identity and ecosystem awareness.',
    descriptionKey: 'navbar.menus.services.finFreedomCoin.description',
    links: [
      {
        label: 'FFC Overview',
        labelKey: 'navbar.menus.services.finFreedomCoin.links.overview',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Utility Tokens',
        labelKey: 'navbar.menus.services.finFreedomCoin.links.utilityTokens',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Future Utility',
        labelKey: 'navbar.menus.services.finFreedomCoin.links.futureUtility',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'FFC Program Dashboard',
        labelKey: 'navbar.menus.services.finFreedomCoin.links.dashboard',
        target: 'home',
        section: 'programs',
      },
    ],
  },
  {
    label: 'Fin Freedom Marketplace',
    labelKey: 'navbar.menus.services.finFreedomMarketplace.label',
    description: 'Future ecosystem marketplace for digital and program-related utilities.',
    descriptionKey: 'navbar.menus.services.finFreedomMarketplace.description',
    links: [
      {
        label: 'Marketplace Overview',
        labelKey: 'navbar.menus.services.finFreedomMarketplace.links.overview',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Vendor Layer',
        labelKey: 'navbar.menus.services.finFreedomMarketplace.links.vendorLayer',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Ecosystem Use',
        labelKey: 'navbar.menus.services.finFreedomMarketplace.links.ecosystemUse',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Fin Freedom Store',
        labelKey: 'navbar.menus.services.finFreedomMarketplace.links.store',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Checkout',
        labelKey: 'navbar.menus.services.finFreedomMarketplace.links.checkout',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'My Orders',
        labelKey: 'navbar.menus.services.finFreedomMarketplace.links.orders',
        target: 'home',
        section: 'programs',
      },
    ],
  },
  {
    label: 'Fin Freedom Institute',
    labelKey: 'navbar.menus.services.finFreedomInstitute.label',
    description: 'Learning, onboarding, training, and community education layer.',
    descriptionKey: 'navbar.menus.services.finFreedomInstitute.description',
    links: [
      {
        label: 'Freedom Institute Overview',
        labelKey: 'navbar.menus.services.finFreedomInstitute.links.overview',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'FFN Digital Academy',
        labelKey: 'navbar.menus.services.finFreedomInstitute.links.digitalAcademy',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'FFN Leadership Academy',
        labelKey: 'navbar.menus.services.finFreedomInstitute.links.leadershipAcademy',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Training Path',
        labelKey: 'navbar.menus.services.finFreedomInstitute.links.trainingPath',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'Community Learning',
        labelKey: 'navbar.menus.services.finFreedomInstitute.links.communityLearning',
        target: 'home',
        section: 'programs',
      },
      {
        label: 'FFI Dashboard',
        labelKey: 'navbar.menus.services.finFreedomInstitute.links.dashboard',
        target: 'home',
        section: 'programs',
      },
    ],
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
  const { t } = useTranslation()
  const isDark = theme === 'dark'
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isServicesOpen, setIsServicesOpen] = useState(false)
  const [activeService, setActiveService] = useState(SERVICES[0])
  const profileName = account?.name || t('mobileDrawer.yourAccount', 'Your Account')
  const profileStatus =
    wallet?.status === 'Connected'
      ? t('mobileDrawer.walletConnected', 'Wallet connected • {{address}}', { address: wallet?.address || '' })
      : wallet?.status === 'Connecting'
        ? t('mobileDrawer.walletConnecting', 'Wallet connecting...')
        : t('mobileDrawer.walletDisconnected', 'Wallet disconnected')

  useEffect(() => {
    if (!isOpen) {
      setIsAboutOpen(false)
      setIsServicesOpen(false)
      setActiveService(SERVICES[0])
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

  const handleServiceLinkClick = (link) => {
    handleNavigate(link?.target || 'home', link?.section)
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
                {t('mobileDrawer.livePlatform', 'Live platform')}
              </span>
            </div>
          </button>

          <button
            type="button"
            className="mobile-drawer__close"
            onClick={onClose}
            aria-label={t('mobileDrawer.closeAriaLabel', 'Close navigation menu')}
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

        <nav className="mobile-drawer__nav" aria-label={t('mobileDrawer.mobileNavAriaLabel', 'Mobile navigation')}>
          {navItems
            .filter((item) => item.href === 'home' || item.href === 'about')
            .map((item) => {
              const isAbout = item.href === 'about'

              if (isAbout) {
                return (
                  <div
                    key={item.href}
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
                      <span className="mobile-drawer__link-text">
                        {t('navbar.menus.about.label', 'About')}
                      </span>
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
                          {t(aboutItem.labelKey, aboutItem.label)}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <button
                  key={item.href}
                  type="button"
                  className={`mobile-drawer__link ${item.active ? 'is-active' : ''}`}
                  onClick={() => handleNavigate(item.href)}
                >
                  <span className="mobile-drawer__link-text">{item.label}</span>
                  <span className="mobile-drawer__link-arrow">›</span>
                </button>
              )
            })}

          <div
            className={`mobile-drawer__nav-group mobile-drawer__nav-group--services ${
              isServicesOpen ? 'is-open' : ''
            }`}
          >
            <button
              type="button"
              className="mobile-drawer__link mobile-drawer__link--about"
              onClick={() => {
                setIsServicesOpen((current) => !current)
                setActiveService(SERVICES[0])
              }}
              aria-expanded={isServicesOpen}
              aria-controls="mobile-services-submenu"
            >
              <span className="mobile-drawer__link-text">
                {t('navbar.menus.services.label', 'Services')}
              </span>
              <ChevronDown size={16} />
            </button>

            <div
              id="mobile-services-submenu"
              className="mobile-drawer__submenu mobile-drawer__submenu--services"
              aria-hidden={!isServicesOpen}
            >
              {SERVICES.map((service) => (
                <div
                  key={service.labelKey}
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
                    <span>{t(service.labelKey, service.label)}</span>
                    <ChevronDown size={14} />
                  </button>

                  <div className="mobile-drawer__service-submenu">
                    <p className="mobile-drawer__service-description">
                      {t(service.descriptionKey, service.description)}
                    </p>

                    {service.links.map((link) => (
                      <button
                        key={`${link.labelKey}-${link.target}`}
                        type="button"
                        className="mobile-drawer__service-subitem"
                        onClick={() => handleServiceLinkClick(link)}
                      >
                        <span>{t(link.labelKey, link.label)}</span>

                        {link.target === 'home' && (
                          <small className="mobile-drawer__service-coming-soon">
                            {t('navbar.menus.services.comingSoon', 'Coming soon')}
                          </small>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {navItems
            .filter((item) => item.href === 'community' || item.href === 'support')
            .map((item) => (
              <button
                key={item.href}
                type="button"
                className={`mobile-drawer__link ${item.active ? 'is-active' : ''}`}
                onClick={() => handleNavigate(item.href)}
              >
                <span className="mobile-drawer__link-text">{item.label}</span>
                <span className="mobile-drawer__link-arrow">›</span>
              </button>
            ))}

          {isAdmin && (
            <button
              type="button"
              className="mobile-drawer__link"
              onClick={() => handleNavigate('admin')}
            >
              <span className="mobile-drawer__link-text">
                {t('mobileDrawer.adminPanel', 'Admin Panel')}
              </span>
              <span className="mobile-drawer__link-arrow">›</span>
            </button>
          )}
        </nav>

        <div className="mobile-drawer__utilities">
          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={handleLanguageClick}
            aria-label={t('mobileDrawer.openLanguageAriaLabel', 'Open language menu')}
          >
            <span className="mobile-drawer__utility-icon">
              <Globe size={18} />
            </span>
            <span className="mobile-drawer__utility-text">
              {t('mobileDrawer.language', 'Language')}
            </span>
          </button>

          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={handleNotificationsClick}
            aria-label={t('mobileDrawer.openNotificationsAriaLabel', 'Open notifications')}
          >
            <span className="mobile-drawer__utility-icon">
              <Bell size={18} />
            </span>
            <span className="mobile-drawer__utility-text">
              {t('mobileDrawer.notifications', 'Notifications')}
            </span>
          </button>

          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={onToggleTheme}
            aria-label={
              isDark
                ? t('mobileDrawer.switchToLightThemeAriaLabel', 'Switch to light theme')
                : t('mobileDrawer.switchToDarkThemeAriaLabel', 'Switch to dark theme')
            }
          >
            <span className="mobile-drawer__utility-icon">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            <span className="mobile-drawer__utility-text">
              {isDark ? t('mobileDrawer.lightMode', 'Light Mode') : t('mobileDrawer.darkMode', 'Dark Mode')}
            </span>
          </button>

          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={handleWalletClick}
            aria-label={t('mobileDrawer.openWalletAriaLabel', 'Open wallet panel')}
          >
            <span className="mobile-drawer__utility-icon">
              <Wallet size={18} />
            </span>
            <span className="mobile-drawer__utility-text">
              {wallet?.status === 'Connected'
                ? t('mobileDrawer.wallet', 'Wallet')
                : t('mobileDrawer.connectWallet', 'Connect Wallet')}
            </span>
          </button>

          <button
            type="button"
            className="mobile-drawer__utility glass-panel"
            onClick={handleAccountClick}
            aria-label={t('mobileDrawer.openAccountAriaLabel', 'Open account menu')}
          >
            <span className="mobile-drawer__utility-icon">
              <User size={18} />
            </span>
            <span className="mobile-drawer__utility-text">
              {t('mobileDrawer.account', 'Account')}
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default MobileDrawer
