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

  const [noticeHeight, setNoticeHeight] = useState(0)

//   useEffect(() => {
//     const updateNoticeHeight = () => {
//       const noticeBar = document.querySelector('.top-notice')
//       if (noticeBar) {
//         const rect = noticeBar.getBoundingClientRect()
//         // If notice bar is visible (not scrolled away)
//         if (rect.bottom > 0) {
//           setNoticeHeight(noticeBar.offsetHeight)
//         } else {
//           setNoticeHeight(0)
//         }
//       }
//     }

//     updateNoticeHeight()
//     window.addEventListener('scroll', updateNoticeHeight)
//     window.addEventListener('resize', updateNoticeHeight)

//     return () => {
//       window.removeEventListener('scroll', updateNoticeHeight)
//       window.removeEventListener('resize', updateNoticeHeight)
//     }
//   }, [])

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
  
  // Watch for scroll
  window.addEventListener('scroll', updateNoticeHeight)
  window.addEventListener('resize', updateNoticeHeight)
  
  // Watch for DOM changes (when notice bar is dismissed/removed)
  const observer = new MutationObserver(updateNoticeHeight)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  })
  
  return () => {
    window.removeEventListener('scroll', updateNoticeHeight)
    window.removeEventListener('resize', updateNoticeHeight)
    observer.disconnect()
  }
}, [])

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
  ].filter(Boolean).join(' ')

  return (
    <header className="main-navbar" style={{ top: noticeHeight ? `${noticeHeight}px` : '0' }}>
      <div className="app-container">
        <div className="main-navbar__inner glass-panel">

          {/* LEFT */}
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
                <img src="/images/logo.jpg" alt="" className="main-navbar__brand-logo" />
              </span>

              <div className="main-navbar__brand-text">
                <span className="main-navbar__brand-name">Fin Freedom Network</span>
                <span className="main-navbar__brand-tag soft-text">Biggest Orbit Ecosystem</span>
              </div>
            </button>
          </div>

          {/* CENTER */}
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

          {/* RIGHT */}
          <div className="main-navbar__right">

            {/* THEME */}
            <button
              className="main-navbar__action-btn"
              onClick={onToggleTheme}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* LANGUAGE */}
            <div className="main-navbar__floating-wrap" ref={languageRef}>
              <button
                className="main-navbar__action-btn"
                onClick={onToggleLanguage}
              >
                <Globe size={18} />
              </button>

              <div className={`main-navbar__dropdown ${isLanguageOpen ? 'is-open' : ''}`}>
                <LanguageDropdown
                  isOpen={isLanguageOpen}
                  languages={languages}
                  currentLanguage={currentLanguage}
                  onSelectLanguage={onSelectLanguage}
                  onClose={onCloseLanguage}
                />
              </div>
            </div>

            {/* NOTIFICATIONS */}
            <div className="main-navbar__floating-wrap" ref={notificationsRef}>
              <button
                className="main-navbar__action-btn main-navbar__notification-btn"
                onClick={onToggleNotifications}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="main-navbar__notification-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className={`main-navbar__dropdown ${isNotificationsOpen ? 'is-open' : ''}`}>
                <NotificationDropdown
                  isOpen={isNotificationsOpen}
                  notifications={notifications}
                  onClose={onToggleNotifications}
                  onMarkAllRead={onMarkAllNotificationsRead}
                  onNotificationClick={onNotificationClick}
                />
              </div>
            </div>

            {/* WALLET */}
            <div className="main-navbar__floating-wrap" ref={walletRef}>
              <button
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

              <div className={`main-navbar__dropdown ${isWalletOpen ? 'is-open' : ''}`}>
                <WalletPanel
                  isOpen={isWalletOpen}
                  wallet={wallet}
                  onClose={onCloseWallet}
                  onConnect={onConnectWallet}
                  onDisconnect={onDisconnectWallet}
                />
              </div>
            </div>

            {/* ACCOUNT */}
            <div className="main-navbar__floating-wrap" ref={accountRef}>
              <button
                className="main-navbar__account"
                onClick={onToggleAccount}
              >
                <span className="main-navbar__account-avatar">
                  <UserCircle2 size={18} />
                </span>
              </button>

              <div className={`main-navbar__dropdown ${isAccountOpen ? 'is-open' : ''}`}>
                {/* <AccountDropdown
                  isOpen={isAccountOpen}
                  account={account}
                  onClose={onCloseAccount}
                  onOpenAccountPage={() => onNavigate?.('account')}
                  onOpenPreferences={() => onNavigate?.('preferences')}
                  onDisconnect={onDisconnectWallet}
                  isAdmin={isAdmin}
                  onOpenAdminPanel={onOpenAdminPanel}
                /> */}
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
//   notifications = [],
//   onMarkAllNotificationsRead,
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
//   isAdmin
// }) => {

//   const [noticeHeight, setNoticeHeight] = useState(0)

//   useEffect(() => {
//     const updateNoticeHeight = () => {
//       const noticeBar = document.querySelector('.top-notice')
//       if (noticeBar && noticeBar.offsetHeight > 0) {
//         setNoticeHeight(noticeBar.offsetHeight)
//       } else {
//         setNoticeHeight(0)
//       }
//     }
    
//     updateNoticeHeight()
    
//     const observer = new MutationObserver(updateNoticeHeight)
//     observer.observe(document.body, {
//       childList: true,
//       subtree: true,
//       attributes: true,
//       attributeFilter: ['style', 'class']
//     })
    
//     window.addEventListener('resize', updateNoticeHeight)
    
//     return () => {
//       observer.disconnect()
//       window.removeEventListener('resize', updateNoticeHeight)
//     }
//   }, [])

//   const isDark = theme === 'dark'
//   const unreadCount = notifications.filter((item) => !item.read).length

//   const languageRef = useRef(null)
//   const notificationsRef = useRef(null)
//   const walletRef = useRef(null)
//   const accountRef = useRef(null)

//   useOutsideClick(languageRef, onCloseLanguage, isLanguageOpen)
//   useOutsideClick(notificationsRef, onToggleNotifications, isNotificationsOpen)
//   useOutsideClick(walletRef, onCloseWallet, isWalletOpen)
//   useOutsideClick(accountRef, onCloseAccount, isAccountOpen)
  

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
//   ].filter(Boolean).join(' ')

//   return (
//     <header className="main-navbar" style={{ top: noticeHeight ? `${noticeHeight}px` : '0' }}>
//       <div className="app-container">
//         <div className="main-navbar__inner glass-panel">

//           {/* LEFT */}
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
//                 <img src="/images/logo.jpg" alt="" className="main-navbar__brand-logo" />
//               </span>

//               <div className="main-navbar__brand-text">
//                 <span className="main-navbar__brand-name">Fin Freedom Network</span>
//                 <span className="main-navbar__brand-tag soft-text">Biggest Orbit Ecosystem</span>
//               </div>
//             </button>
//           </div>

//           {/* CENTER */}
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

//           {/* RIGHT */}
//           <div className="main-navbar__right">

//             {/* THEME */}
//             <button
//               className="main-navbar__action-btn"
//               onClick={onToggleTheme}
//             >
//               {isDark ? <Sun size={18} /> : <Moon size={18} />}
//             </button>

//             {/* LANGUAGE */}
//             <div className="main-navbar__floating-wrap" ref={languageRef}>
//               <button
//                 className="main-navbar__action-btn"
//                 onClick={onToggleLanguage}
//               >
//                 <Globe size={18} />
//               </button>

//               <div className={`main-navbar__dropdown ${isLanguageOpen ? 'is-open' : ''}`}>
//                 <LanguageDropdown
//                   isOpen={isLanguageOpen}
//                   languages={languages}
//                   currentLanguage={currentLanguage}
//                   onSelectLanguage={onSelectLanguage}
//                   onClose={onCloseLanguage}
//                 />
//               </div>
//             </div>

//             {/* NOTIFICATIONS */}
//             <div className="main-navbar__floating-wrap" ref={notificationsRef}>
//               <button
//                 className="main-navbar__action-btn main-navbar__notification-btn"
//                 onClick={onToggleNotifications}
//               >
//                 <Bell size={18} />
//                 {unreadCount > 0 && (
//                   <span className="main-navbar__notification-badge">
//                     {unreadCount > 9 ? '9+' : unreadCount}
//                   </span>
//                 )}
//               </button>

//               <div className={`main-navbar__dropdown ${isNotificationsOpen ? 'is-open' : ''}`}>
//                 <NotificationDropdown
//                   isOpen={isNotificationsOpen}
//                   notifications={notifications}
//                   onClose={onToggleNotifications}
//                   onMarkAllRead={onMarkAllNotificationsRead}
//                   onNotificationClick={onNotificationClick}
//                 />
//               </div>
//             </div>

//             {/* WALLET */}
//             <div className="main-navbar__floating-wrap" ref={walletRef}>
//               <button
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

//               <div className={`main-navbar__dropdown ${isWalletOpen ? 'is-open' : ''}`}>
//                 <WalletPanel
//                   isOpen={isWalletOpen}
//                   wallet={wallet}
//                   onClose={onCloseWallet}
//                   onConnect={onConnectWallet}
//                   onDisconnect={onDisconnectWallet}
//                 />
//               </div>
//             </div>

//             {/* ACCOUNT */}
//             <div className="main-navbar__floating-wrap" ref={accountRef}>
//               <button
//                 className="main-navbar__account"
//                 onClick={onToggleAccount}
//               >
//                 <span className="main-navbar__account-avatar">
//                   <UserCircle2 size={18} />
//                 </span>
//               </button>

//               <div className={`main-navbar__dropdown ${isAccountOpen ? 'is-open' : ''}`}>
//                 <AccountDropdown
//                   isOpen={isAccountOpen}
//                   account={account}
//                   onClose={onCloseAccount}
//                   onOpenAccountPage={() => onNavigate?.('account')}
//                   onOpenPreferences={() => onNavigate?.('preferences')}
//                   onDisconnect={onDisconnectWallet}
//                   isAdmin={isAdmin}
//                   onOpenAdminPanel={onOpenAdminPanel}
//                 />
//               </div>
//             </div>

//           </div>
//         </div>
//       </div>
//     </header>
//   )
// }

// export default MainNavbar












// import AccountDropdown from '../../dropdowns/AccountDropdown/AccountDropdown'
// import LanguageDropdown from '../../dropdowns/LanguageDropdown/LanguageDropdown'
// import NotificationDropdown from '../../dropdowns/NotificationDropdown/NotificationDropdown'
// import WalletPanel from '../../dropdowns/WalletPanel/WalletPanel'
// import { useRef } from 'react'
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
//   notifications = [],
//   onMarkAllNotificationsRead,
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
//   isAdmin
// }) => {

//   const isDark = theme === 'dark'
//   const unreadCount = notifications.filter((item) => !item.read).length

//   const languageRef = useRef(null)
//   const notificationsRef = useRef(null)
//   const walletRef = useRef(null)
//   const accountRef = useRef(null)

//   useOutsideClick(languageRef, onCloseLanguage, isLanguageOpen)
//   useOutsideClick(notificationsRef, onToggleNotifications, isNotificationsOpen)
//   useOutsideClick(walletRef, onCloseWallet, isWalletOpen)
//   useOutsideClick(accountRef, onCloseAccount, isAccountOpen)
  

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
//   ].filter(Boolean).join(' ')

//   return (
//     <header className="main-navbar">
//       <div className="app-container">
//         <div className="main-navbar__inner glass-panel">

//           {/* LEFT */}
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
//                 <img src="/images/logo.jpg" alt="" className="main-navbar__brand-logo" />
//               </span>

//               <div className="main-navbar__brand-text">
//                 <span className="main-navbar__brand-name">Fin Freedom Network</span>
//                 <span className="main-navbar__brand-tag soft-text">Biggest Orbit Ecosystem</span>
//               </div>
//             </button>
//           </div>

//           {/* CENTER */}
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

//           {/* RIGHT */}
//           <div className="main-navbar__right">

//             {/* THEME */}
//             <button
//               className="main-navbar__action-btn"
//               onClick={onToggleTheme}
//             >
//               {isDark ? <Sun size={18} /> : <Moon size={18} />}
//             </button>

//             {/* LANGUAGE */}
//             <div className="main-navbar__floating-wrap" ref={languageRef}>
//               <button
//                 className="main-navbar__action-btn"
//                 onClick={onToggleLanguage}
//               >
//                 <Globe size={18} />
//               </button>

//               <div className={`main-navbar__dropdown ${isLanguageOpen ? 'is-open' : ''}`}>
//                 <LanguageDropdown
//                   isOpen={isLanguageOpen}
//                   languages={languages}
//                   currentLanguage={currentLanguage}
//                   onSelectLanguage={onSelectLanguage}
//                   onClose={onCloseLanguage}
//                 />
//               </div>
//             </div>

//             {/* NOTIFICATIONS */}
//             <div className="main-navbar__floating-wrap" ref={notificationsRef}>
//               <button
//                 className="main-navbar__action-btn main-navbar__notification-btn"
//                 onClick={onToggleNotifications}
//               >
//                 <Bell size={18} />
//                 {unreadCount > 0 && (
//                   <span className="main-navbar__notification-badge">
//                     {unreadCount > 9 ? '9+' : unreadCount}
//                   </span>
//                 )}
//               </button>

//               <div className={`main-navbar__dropdown ${isNotificationsOpen ? 'is-open' : ''}`}>
//                 <NotificationDropdown
//                   isOpen={isNotificationsOpen}
//                   notifications={notifications}
//                   onClose={onToggleNotifications}
//                   onMarkAllRead={onMarkAllNotificationsRead}
//                   onNotificationClick={onNotificationClick}
//                 />
//               </div>
//             </div>

//             {/* WALLET */}
//             <div className="main-navbar__floating-wrap" ref={walletRef}>
//               <button
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

//               <div className={`main-navbar__dropdown ${isWalletOpen ? 'is-open' : ''}`}>
//                 <WalletPanel
//                   isOpen={isWalletOpen}
//                   wallet={wallet}
//                   onClose={onCloseWallet}
//                   onConnect={onConnectWallet}
//                   onDisconnect={onDisconnectWallet}
//                 />
//               </div>
//             </div>

//             {/* ACCOUNT */}
//             <div className="main-navbar__floating-wrap" ref={accountRef}>
//               <button
//                 className="main-navbar__account"
//                 onClick={onToggleAccount}
//               >
//                 <span className="main-navbar__account-avatar">
//                   <UserCircle2 size={18} />
//                 </span>
//               </button>

//               <div className={`main-navbar__dropdown ${isAccountOpen ? 'is-open' : ''}`}>
//                 <AccountDropdown
//                   isOpen={isAccountOpen}
//                   account={account}
//                   onClose={onCloseAccount}
//                   onOpenAccountPage={() => onNavigate?.('account')}
//                   onOpenPreferences={() => onNavigate?.('preferences')}
//                   onDisconnect={onDisconnectWallet}
//                   isAdmin={isAdmin}
//                   onOpenAdminPanel={onOpenAdminPanel}
//                 />
//               </div>
//             </div>

//           </div>
//         </div>
//       </div>
//     </header>
//   )
// }

// export default MainNavbar