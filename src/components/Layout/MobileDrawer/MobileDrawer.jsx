import './MobileDrawer.css'
import { Sun, Moon, Globe, Bell, Wallet, User, X } from 'lucide-react'

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
  const profileName = account?.name || 'Your Account'
  const profileStatus =
    wallet?.status === 'Connected'
      ? `Wallet connected • ${wallet?.address || ''}`
      : wallet?.status === 'Connecting'
        ? 'Wallet connecting...'
        : 'Wallet disconnected'

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

  const handleNavigate = (page) => {
    onNavigate?.(page)
    onClose?.()
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
            <div className="mobile-drawer__brand-mark">FF</div>
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
          {navItems.map((item) => (
            <button
              key={item.label}
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















// import './MobileDrawer.css'
// import { Sun, Moon, Globe, Bell, Wallet, User, X } from 'lucide-react'

// const MobileDrawer = ({
//   isOpen = false,
//   onClose,
//   brand = 'Fin Freedom',
//   navItems = [],
//   onNavigate,
//   theme = 'dark',
//   onToggleTheme,
//   onOpenNotifications,
//   onOpenLanguage,
//   onOpenWallet,
//   onOpenAccount,
//   account = null,
//   wallet = null,
//   isAdmin = false,
//   onOpenAdminPanel,
// }) => {
//   const isDark = theme === 'dark'
//   const profileName = account?.name || 'Your Account'
//   const profileStatus =
//     wallet?.status === 'Connected'
//       ? `Wallet connected • ${wallet?.address || ''}`
//       : wallet?.status === 'Connecting'
//         ? 'Wallet connecting...'
//         : 'Wallet disconnected'

//   const handleNotificationsClick = () => {
//     if (onClose) onClose()
//     if (onOpenNotifications) onOpenNotifications()
//   }

//   const handleLanguageClick = () => {
//     if (onClose) onClose()
//     if (onOpenLanguage) onOpenLanguage()
//   }

//   const handleWalletClick = () => {
//     if (onClose) onClose()
//     if (onOpenWallet) onOpenWallet()
//   }

//   const handleAccountClick = () => {
//     if (onClose) onClose()
//     if (onOpenAccount) onOpenAccount()
//   }

//   const handleNavigate = (page) => {
//     if (onNavigate) onNavigate(page)
//   }

//   return (
//     <>
//       <div
//         className={`mobile-drawer__overlay ${isOpen ? 'is-open' : ''}`}
//         onClick={onClose}
//         aria-hidden={!isOpen}
//       />

//       <aside
//         className={`mobile-drawer ${isOpen ? 'is-open' : ''}`}
//         aria-hidden={!isOpen}
//       >
//         <div className="mobile-drawer__header">
//           <button
//             type="button"
//             className="mobile-drawer__brand"
//             onClick={() => handleNavigate('home')}
//           >
//             <div className="mobile-drawer__brand-mark">FF</div>
//             <div className="mobile-drawer__brand-text">
//               <span className="mobile-drawer__brand-name">{brand}</span>
//               <span className="mobile-drawer__brand-tag soft-text">Live platform</span>
//             </div>
//           </button>

//           <button
//             type="button"
//             className="mobile-drawer__close"
//             onClick={onClose}
//             aria-label="Close navigation menu"
//           >
//             <X size={18} />
//           </button>
//         </div>

//         <div className="mobile-drawer__profile glass-panel">
//           <div className="mobile-drawer__avatar">{account?.initials || 'U'}</div>
//           <div className="mobile-drawer__profile-text">
//             <span className="mobile-drawer__profile-name">{profileName}</span>
//             <span className="mobile-drawer__profile-status soft-text">
//               {profileStatus}
//             </span>
//           </div>
//         </div>

//         <nav className="mobile-drawer__nav" aria-label="Mobile navigation">
//           {navItems.map((item) => (
//             <button
//               key={item.label}
//               type="button"
//               className={`mobile-drawer__link ${item.active ? 'is-active' : ''}`}
//               onClick={() => handleNavigate(item.href)}
//             >
//               <span className="mobile-drawer__link-text">{item.label}</span>
//               <span className="mobile-drawer__link-arrow">›</span>
//             </button>
//           ))}
//           {isAdmin && (
//             <button
//               type="button"
//               className="mobile-drawer__link"
//               onClick={() => handleNavigate('admin')}
//             >
//               <span className="mobile-drawer__link-text">Admin Panel</span>
//               <span className="mobile-drawer__link-arrow">›</span>
//             </button>
//           )}
//         </nav>

//         <div className="mobile-drawer__utilities">
//           <button
//             type="button"
//             className="mobile-drawer__utility glass-panel"
//             onClick={handleLanguageClick}
//             aria-label="Open language menu"
//           >
//             <span className="mobile-drawer__utility-icon"><Globe size={18} /></span>
//             <span className="mobile-drawer__utility-text">Language</span>
//           </button>

//           <button
//             type="button"
//             className="mobile-drawer__utility glass-panel"
//             onClick={handleNotificationsClick}
//             aria-label="Open notifications"
//           >
//             <span className="mobile-drawer__utility-icon"><Bell size={18} /></span>
//             <span className="mobile-drawer__utility-text">Notifications</span>
//           </button>

//           <button
//             type="button"
//             className="mobile-drawer__utility glass-panel"
//             onClick={onToggleTheme}
//             aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
//           >
//             <span className="mobile-drawer__utility-icon">
//               {isDark ? <Sun size={18} /> : <Moon size={18} />}
//             </span>
//             <span className="mobile-drawer__utility-text">
//               {isDark ? 'Light Mode' : 'Dark Mode'}
//             </span>
//           </button>

//           <button
//             type="button"
//             className="mobile-drawer__utility glass-panel"
//             onClick={handleWalletClick}
//             aria-label="Open wallet panel"
//           >
//             <span className="mobile-drawer__utility-icon"><Wallet size={18} /></span>
//             <span className="mobile-drawer__utility-text">
//               {wallet?.status === 'Connected' ? 'Wallet' : 'Connect Wallet'}
//             </span>
//           </button>

//           <button
//             type="button"
//             className="mobile-drawer__utility glass-panel"
//             onClick={handleAccountClick}
//             aria-label="Open account menu"
//           >
//             <span className="mobile-drawer__utility-icon"><User size={18} /></span>
//             <span className="mobile-drawer__utility-text">Account</span>
//           </button>
//         </div>
//       </aside>
//     </>
//   )
// }

// export default MobileDrawer
