import { useEffect, useState, useRef } from 'react'
import AccountDropdown from '../../dropdowns/AccountDropdown/AccountDropdown'
import LanguageDropdown from '../../dropdowns/LanguageDropdown/LanguageDropdown'
import NotificationDropdown from '../../dropdowns/NotificationDropdown/NotificationDropdown'
import WalletPanel from '../../dropdowns/WalletPanel/WalletPanel'
import useOutsideClick from '../../../hooks/useOutsideClick'
import { Sun, Moon, Globe, Bell, UserCircle2 } from 'lucide-react'
import './MainNavbar.css'

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

  return (
    <header
      className="main-navbar"
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
              <span className="main-navbar__brand-logo-wrap">
                <img
                  src="/images/logo.jpg"
                  alt=""
                  className="main-navbar__brand-logo"
                />
              </span>

              <div className="main-navbar__brand-text">
                <span className="main-navbar__brand-name">{brand}</span>
                <span className="main-navbar__brand-tag soft-text">
                  Biggest Orbit Ecosystem
                </span>
              </div>
            </button>
          </div>

          <nav className="main-navbar__center">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`main-navbar__link ${item.active ? 'is-active' : ''}`}
                onClick={() => onNavigate?.(item.href)}
              >
                {item.label}
              </button>
            ))}
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











// import { useEffect, useState, useRef } from 'react'
// import AccountDropdown from '../../dropdowns/AccountDropdown/AccountDropdown'
// import LanguageDropdown from '../../dropdowns/LanguageDropdown/LanguageDropdown'
// import NotificationDropdown from '../../dropdowns/NotificationDropdown/NotificationDropdown'
// import WalletPanel from '../../dropdowns/WalletPanel/WalletPanel'
// import useOutsideClick from '../../../hooks/useOutsideClick'
// import { Sun, Moon, Globe, Bell, UserCircle2 } from 'lucide-react'
// import './MainNavbar.css'

// const MainNavbar = ({
//   brand = 'Fin Freedom Network',
//   navItems = [],
//   onNavigate,
//   onMenuClick,
//   theme = 'dark',
//   onToggleTheme,

//   isNotificationsOpen = false,
//   onToggleNotifications,
//   onCloseNotifications,
//   notifications = [],
//   onMarkAllNotificationsRead,
//   onClearNotifications,
//   onNotificationClick,

//   isLanguageOpen = false,
//   onToggleLanguage,
//   onCloseLanguage,
//   languages = [],
//   currentLanguage = 'English',
//   onSelectLanguage,

//   isWalletOpen = false,
//   onToggleWallet,
//   onCloseWallet,
//   wallet = null,

//   isAccountOpen = false,
//   onToggleAccount,
//   onCloseAccount,
//   account = null,

//   onConnectWallet,
//   onDisconnectWallet,
//   onOpenAdminPanel,
//   isAdmin,
// }) => {
//   const [noticeHeight, setNoticeHeight] = useState(0)

//   useEffect(() => {
//     const updateNoticeHeight = () => {
//       const noticeBar = document.querySelector('.top-notice')

//       if (noticeBar && noticeBar.offsetHeight > 0) {
//         const rect = noticeBar.getBoundingClientRect()
//         if (rect.bottom > 0) {
//           setNoticeHeight(noticeBar.offsetHeight)
//         } else {
//           setNoticeHeight(0)
//         }
//       } else {
//         setNoticeHeight(0)
//       }
//     }

//     updateNoticeHeight()

//     window.addEventListener('scroll', updateNoticeHeight)
//     window.addEventListener('resize', updateNoticeHeight)

//     const observer = new MutationObserver(updateNoticeHeight)
//     observer.observe(document.body, {
//       childList: true,
//       subtree: true,
//       attributes: true,
//       attributeFilter: ['style', 'class'],
//     })

//     return () => {
//       window.removeEventListener('scroll', updateNoticeHeight)
//       window.removeEventListener('resize', updateNoticeHeight)
//       observer.disconnect()
//     }
//   }, [])

//   const isDark = theme === 'dark'
//   const unreadCount = notifications.filter((item) => !item.read).length

//   // Button refs for anchor positioning (all dropdowns)
//   const languageButtonRef = useRef(null)
//   const notificationButtonRef = useRef(null)
//   const walletButtonRef = useRef(null)
//   const accountButtonRef = useRef(null)
  
//   // Wrapper refs - ONLY for Wallet and Account until they're portaled
//   // Language and Notifications use portal backdrops, so no useOutsideClick needed
//   const walletWrapperRef = useRef(null)
//   const accountWrapperRef = useRef(null)

//   // TEMPORARY: useOutsideClick for Wallet and Account (remove after updating to portals)
//   // Language and Notifications handle their own closing via portal backdrops
//   useOutsideClick(walletWrapperRef, onCloseWallet, isWalletOpen)
//   useOutsideClick(accountWrapperRef, onCloseAccount, isAccountOpen)

//   const walletStatus = wallet?.status || 'Disconnected'

//   const walletLabel =
//     walletStatus === 'Connected'
//       ? wallet?.address || 'Connected'
//       : walletStatus === 'Connecting'
//         ? 'Connecting...'
//         : 'Connect'

//   const walletDotClassName = [
//     'main-navbar__wallet-dot',
//     walletStatus === 'Disconnected' ? 'is-disconnected' : '',
//     walletStatus === 'Connecting' ? 'is-loading' : '',
//   ]
//     .filter(Boolean)
//     .join(' ')

//   const handleToggleNotifications = () => {
//     onToggleNotifications?.()
//   }

//   const handleCloseNotifications = () => {
//     onCloseNotifications?.()
//   }

//   return (
//     <header
//       className="main-navbar"
//       style={{ top: noticeHeight ? `${noticeHeight}px` : '0' }}
//     >
//       <div className="app-container">
//         <div className="main-navbar__inner glass-panel">
//           <div className="main-navbar__left">
//             <button
//               type="button"
//               className="main-navbar__menu-btn"
//               onClick={onMenuClick}
//             >
//               <span />
//               <span />
//               <span />
//             </button>

//             <button
//               type="button"
//               className="main-navbar__brand"
//               onClick={() => onNavigate?.('home')}
//             >
//               <span className="main-navbar__brand-logo-wrap">
//                 <img
//                   src="/images/logo.jpg"
//                   alt=""
//                   className="main-navbar__brand-logo"
//                 />
//               </span>

//               <div className="main-navbar__brand-text">
//                 <span className="main-navbar__brand-name">{brand}</span>
//                 <span className="main-navbar__brand-tag soft-text">
//                   Biggest Orbit Ecosystem
//                 </span>
//               </div>
//             </button>
//           </div>

//           <nav className="main-navbar__center">
//             {navItems.map((item) => (
//               <button
//                 key={item.label}
//                 className={`main-navbar__link ${item.active ? 'is-active' : ''}`}
//                 onClick={() => onNavigate?.(item.href)}
//               >
//                 {item.label}
//               </button>
//             ))}
//           </nav>

//           <div className="main-navbar__right">
//             <button
//               className="main-navbar__action-btn"
//               onClick={onToggleTheme}
//             >
//               {isDark ? <Sun size={18} /> : <Moon size={18} />}
//             </button>

//             {/* LANGUAGE DROPDOWN - Portal handles its own closing ✅ */}
//             <div className="main-navbar__floating-wrap">
//               <button
//                 ref={languageButtonRef}
//                 className="main-navbar__action-btn"
//                 onClick={onToggleLanguage}
//               >
//                 <Globe size={18} />
//               </button>

//               <LanguageDropdown
//                 isOpen={isLanguageOpen}
//                 anchorRef={languageButtonRef}
//                 languages={languages}
//                 currentLanguage={currentLanguage}
//                 onSelectLanguage={onSelectLanguage}
//                 onClose={onCloseLanguage}
//               />
//             </div>

//             {/* NOTIFICATION DROPDOWN - Portal handles its own closing ✅ */}
//             <div className="main-navbar__floating-wrap">
//               <button
//                 ref={notificationButtonRef}
//                 className="main-navbar__action-btn main-navbar__notification-btn"
//                 onClick={handleToggleNotifications}
//               >
//                 <Bell size={18} />
//                 {unreadCount > 0 && (
//                   <span className="main-navbar__notification-badge">
//                     {unreadCount > 9 ? '9+' : unreadCount}
//                   </span>
//                 )}
//               </button>

//               <NotificationDropdown
//                 isOpen={isNotificationsOpen}
//                 anchorRef={notificationButtonRef}
//                 notifications={notifications}
//                 onClose={handleCloseNotifications}
//                 onMarkAllRead={onMarkAllNotificationsRead}
//                 onClearNotifications={onClearNotifications}
//                 onNotificationClick={onNotificationClick}
//               />
//             </div>

//             {/* WALLET PANEL - Still uses useOutsideClick (update to portal later) */}
//             <div className="main-navbar__floating-wrap" ref={walletWrapperRef}>
//               <button
//                 ref={walletButtonRef}
//                 className="main-navbar__wallet"
//                 onClick={() => {
//                   if (walletStatus === 'Disconnected') {
//                     onConnectWallet?.()
//                     return
//                   }
//                   onToggleWallet?.()
//                 }}
//               >
//                 <span className={walletDotClassName} />
//                 <span className="main-navbar__wallet-text">{walletLabel}</span>
//               </button>

//               <WalletPanel
//                 isOpen={isWalletOpen}
//                 anchorRef={walletButtonRef}
//                 wallet={wallet}
//                 onClose={onCloseWallet}
//                 onConnect={onConnectWallet}
//                 onDisconnect={onDisconnectWallet}
//               />
//             </div>

//             {/* ACCOUNT DROPDOWN - Still uses useOutsideClick (update to portal later) */}
//             <div className="main-navbar__floating-wrap" ref={accountWrapperRef}>
//               <button
//                 ref={accountButtonRef}
//                 className="main-navbar__account"
//                 onClick={onToggleAccount}
//               >
//                 <span className="main-navbar__account-avatar">
//                   <UserCircle2 size={18} />
//                 </span>
//               </button>

//               <AccountDropdown
//                 isOpen={isAccountOpen}
//                 anchorRef={accountButtonRef}
//                 account={account}
//                 onClose={onCloseAccount}
//                 onOpenAccountPage={() => onNavigate?.('account')}
//                 onOpenPreferences={() => onNavigate?.('preferences')}
//                 onOpenSecurity={() => onNavigate?.('security')}
//                 onOpenActivity={() => onNavigate?.('activity')}
//                 onDisconnect={onDisconnectWallet}
//                 isAdmin={isAdmin}
//                 onOpenAdminPanel={onOpenAdminPanel}
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </header>
//   )
// }

// export default MainNavbar
