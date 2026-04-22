
import AccountDropdown from '../../dropdowns/AccountDropdown/AccountDropdown'
import LanguageDropdown from '../../dropdowns/LanguageDropdown/LanguageDropdown'
import NotificationDropdown from '../../dropdowns/NotificationDropdown/NotificationDropdown'
import WalletPanel from '../../dropdowns/WalletPanel/WalletPanel'
import { useRef } from 'react'
import useOutsideClick from '../../../hooks/useOutsideClick'
// import { Sun, Moon, Globe, Bell } from 'lucide-react'
import { Sun, Moon, Globe, Bell, UserCircle2 } from 'lucide-react'
import './MainNavbar.css'

const MainNavbar = ({
  brand = 'Fin Freedom',
  navItems = [],
  onNavigate,
  onMenuClick,
  theme = 'dark',
  onToggleTheme,
  isNotificationsOpen = false,
  onToggleNotifications,
  notifications = [],
  onMarkAllNotificationsRead,
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
  isAdmin

}) => {
  const isDark = theme === 'dark'
  const unreadCount = notifications.filter((item) => !item.read).length
  const languageRef = useRef(null)
  const notificationsRef = useRef(null)
  const walletRef = useRef(null)
  const accountRef = useRef(null)

  useOutsideClick(languageRef, onCloseLanguage, isLanguageOpen)
  useOutsideClick(notificationsRef, onToggleNotifications, isNotificationsOpen)
  useOutsideClick(walletRef, onCloseWallet, isWalletOpen)
  useOutsideClick(accountRef, onCloseAccount, isAccountOpen)

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

  return (
    <header className="main-navbar theme-transition">
      <div className="app-container">
        <div className="main-navbar__inner glass-panel">
          <div className="main-navbar__left">
            <button
              type="button"
              className="main-navbar__menu-btn"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
            >
              <span />
              <span />
              <span />
            </button>

            {/* <button
              type="button"
              className="main-navbar__brand"
              aria-label={brand}
              onClick={() => onNavigate?.('home')}
            >
              <div className="main-navbar__brand-mark" aria-hidden="true">
                FF
              </div>
              <div className="main-navbar__brand-text">
                <span className="main-navbar__brand-name">{brand}</span>
                <span className="main-navbar__brand-tag soft-text">Live platform</span>
              </div>
            </button> */}
            <button
              type="button"
              className="main-navbar__brand"
              aria-label={brand}
              onClick={() => onNavigate?.('home')}
            >
              <span className="main-navbar__brand-logo-wrap" aria-hidden="true">
                <img
                  src="/images/logo.jpg"
                  alt=""
                  className="main-navbar__brand-logo"
                />
              </span>

              <div className="main-navbar__brand-text">
                <span className="main-navbar__brand-name">{brand}</span>
                <span className="main-navbar__brand-tag soft-text">Live platform</span>
              </div>
            </button>
          </div>

          <nav className="main-navbar__center" aria-label="Primary navigation">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`main-navbar__link ${item.active ? 'is-active' : ''}`}
                onClick={() => onNavigate?.(item.href)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="main-navbar__right">
            <button
              type="button"
              className="main-navbar__action-btn"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={onToggleTheme}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="main-navbar__language" ref={languageRef}>
              <button
                type="button"
                className="main-navbar__action-btn"
                aria-label="Change language"
                onClick={onToggleLanguage}
              >
                <Globe size={18} />
              </button>

              <LanguageDropdown
                isOpen={isLanguageOpen}
                languages={languages}
                currentLanguage={currentLanguage}
                onSelectLanguage={onSelectLanguage}
                onClose={onCloseLanguage}
              />
            </div>

            <div className="main-navbar__notifications" ref={notificationsRef}>
              <button
                type="button"
                className="main-navbar__action-btn main-navbar__notification-btn"
                aria-label="Notifications"
                onClick={onToggleNotifications}
              >
                <Bell size={18} />
                {unreadCount > 0 ? (
                  <span className="main-navbar__notification-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>

              <NotificationDropdown
                isOpen={isNotificationsOpen}
                notifications={notifications}
                onClose={onToggleNotifications}
                onMarkAllRead={onMarkAllNotificationsRead}
                onNotificationClick={onNotificationClick}
              />
            </div>

            <div className="main-navbar__wallet-wrap" ref={walletRef}>
              <button
                type="button"
                className="main-navbar__wallet"
                aria-label={
                  walletStatus === 'Connected'
                    ? `Wallet connected: ${wallet?.address || ''}`
                    : walletStatus === 'Connecting'
                      ? 'Wallet connecting'
                      : 'Connect wallet'
                }
                onClick={() => {
                  if (walletStatus === 'Disconnected' && onConnectWallet) {
                    onConnectWallet()
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
                wallet={wallet}
                onClose={onCloseWallet}
                onConnect={onConnectWallet}
                onDisconnect={onDisconnectWallet}
                onSwitchNetwork={() => onNavigate?.('preferences')}
                onOpenWalletSettings={() => onNavigate?.('preferences')}
              />
            </div>

            <div className="main-navbar__account-wrap" ref={accountRef}>
              {/* <button
                type="button"
                className="main-navbar__account"
                aria-label="Account menu"
                onClick={onToggleAccount}
              >
                <span className="main-navbar__account-avatar">
                  {account?.initials || 'U'}
                </span>
              </button> */}
              <button
                type="button"
                className="main-navbar__account"
                aria-label="Account menu"
                onClick={onToggleAccount}
              >
                <span className="main-navbar__account-avatar" aria-hidden="true">
                  <UserCircle2 size={18} />
                </span>
              </button>

              <AccountDropdown
                isOpen={isAccountOpen}
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
