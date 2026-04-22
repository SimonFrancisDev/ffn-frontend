import './AccountDropdown.css'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const AccountDropdown = ({
  isOpen = false,
  account = null,
  onClose,
  onOpenAccountPage,
  onOpenPreferences,
  onOpenSecurity,
  onOpenActivity,
  onOpenAdminPanel,
  onDisconnect,
  isAdmin = false,
  anchorRef = null, // NEW: Accept anchor ref for positioning
}) => {
  const dialogRef = useRef(null)
  const [desktopPosition, setDesktopPosition] = useState({
    top: 76,
    left: null,
    right: 20,
  })

  // Body scroll lock - exactly like NotificationDropdown
  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction

    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
    }
  }, [isOpen])

  // Desktop positioning logic
  const updateDesktopPosition = () => {
    if (typeof window === 'undefined') return
    if (window.innerWidth < 768) return

    const anchorEl = anchorRef?.current
    const dialogEl = dialogRef.current

    if (!anchorEl || !dialogEl) {
      setDesktopPosition({ top: 76, left: null, right: 20 })
      return
    }

    const rect = anchorEl.getBoundingClientRect()
    const dialogWidth = dialogEl.offsetWidth || 360
    const viewportWidth = window.innerWidth
    const gap = 12
    const minMargin = 12

    // Align dropdown right edge with anchor right edge
    let left = rect.right - dialogWidth
    left = Math.max(minMargin, left)
    left = Math.min(left, viewportWidth - dialogWidth - minMargin)

    const top = rect.bottom + gap

    setDesktopPosition({
      top,
      left,
      right: 'auto',
    })
  }

  // Position update on open/resize/scroll
  useEffect(() => {
    if (!isOpen) return undefined

    updateDesktopPosition()

    const handleResize = () => updateDesktopPosition()
    const handleScroll = () => updateDesktopPosition()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, anchorRef])

  if (!isOpen || !account) return null

  const handleAction = (callback) => {
    if (onClose) onClose()
    if (callback) callback()
  }

  return (
    <ModalPortal>
      <div className="account-modal" role="presentation">
        {/* Backdrop for click-outside */}
        <div
          className="account-modal__backdrop"
          onClick={onClose}
        />

        <div
          ref={dialogRef}
          className="account-modal__dialog glass-panel theme-transition"
          role="dialog"
          aria-label="Account menu"
          onClick={(event) => event.stopPropagation()}
          style={
            typeof desktopPosition.left === 'number'
              ? {
                  top: `${desktopPosition.top}px`,
                  left: `${desktopPosition.left}px`,
                  right: desktopPosition.right,
                }
              : undefined
          }
        >
          <div className="account-dropdown__header">
            <div className="account-dropdown__title-group">
              <h3 className="account-dropdown__title">Account</h3>
              <p className="account-dropdown__subtitle soft-text">
                Profile and preferences
              </p>
            </div>

            <button
              type="button"
              className="account-dropdown__close"
              onClick={onClose}
              aria-label="Close account menu"
            >
              ✕
            </button>
          </div>

          <div className="account-dropdown__profile">
            <div className="account-dropdown__avatar">
              {account.initials || 'U'}
            </div>

            <div className="account-dropdown__identity">
              <p className="account-dropdown__name">{account.name}</p>
              <p className="account-dropdown__meta soft-text">{account.emailOrWallet}</p>
            </div>
          </div>

          <div className="account-dropdown__chips">
            <span className="account-dropdown__chip">
              {account.status || 'Active'}
            </span>
            <span className="account-dropdown__chip">
              Level {account.level || 1}
            </span>
            {isAdmin && (
              <span className="account-dropdown__chip admin-chip">
                🔧 Admin
              </span>
            )}
          </div>

          <div className="account-dropdown__menu">
            <button
              type="button"
              className="account-dropdown__item"
              onClick={() => handleAction(onOpenAccountPage)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">👤</span>
                <span className="account-dropdown__item-text">My Account</span>
              </span>
              <span className="account-dropdown__item-arrow">›</span>
            </button>

            <button
              type="button"
              className="account-dropdown__item"
              onClick={() => handleAction(onOpenPreferences)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">⚙️</span>
                <span className="account-dropdown__item-text">Preferences</span>
              </span>
              <span className="account-dropdown__item-arrow">›</span>
            </button>

            <button
              type="button"
              className="account-dropdown__item"
              onClick={() => handleAction(onOpenSecurity)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">🔐</span>
                <span className="account-dropdown__item-text">Security</span>
              </span>
              <span className="account-dropdown__item-arrow">›</span>
            </button>

            <button
              type="button"
              className="account-dropdown__item"
              onClick={() => handleAction(onOpenActivity)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">🧾</span>
                <span className="account-dropdown__item-text">Activity</span>
              </span>
              <span className="account-dropdown__item-arrow">›</span>
            </button>

            {/* Admin Panel - Only shown if user is multisig owner */}
            {isAdmin && (
              <button
                type="button"
                className="account-dropdown__item admin-item"
                onClick={() => handleAction(onOpenAdminPanel)}
              >
                <span className="account-dropdown__item-left">
                  <span className="account-dropdown__item-icon">🛡️</span>
                  <span className="account-dropdown__item-text">Admin Panel</span>
                </span>
                <span className="account-dropdown__item-arrow">›</span>
              </button>
            )}

            <button
              type="button"
              className="account-dropdown__item account-dropdown__item--danger"
              onClick={() => handleAction(onDisconnect)}
            >
              <span className="account-dropdown__item-left">
                <span className="account-dropdown__item-icon">↪</span>
                <span className="account-dropdown__item-text">Disconnect</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default AccountDropdown













// import './AccountDropdown.css'

// const AccountDropdown = ({
//   isOpen = false,
//   account = null,
//   onClose,
//   onOpenAccountPage,
//   onOpenPreferences,
//   onOpenSecurity,
//   onOpenActivity,
//   onOpenAdminPanel,
//   onDisconnect,
//   isAdmin = false, // New prop to check if user is multisig owner
// }) => {
//   if (!isOpen || !account) return null

//   const handleAction = (callback) => {
//     if (onClose) onClose()
//     if (callback) callback()
//   }

//   return (
//     <div className="account-dropdown glass-panel theme-transition">
//       <div className="account-dropdown__header">
//         <div className="account-dropdown__title-group">
//           <h3 className="account-dropdown__title">Account</h3>
//           <p className="account-dropdown__subtitle soft-text">
//             Profile and preferences
//           </p>
//         </div>

//         <button
//           type="button"
//           className="account-dropdown__close"
//           onClick={onClose}
//           aria-label="Close account menu"
//         >
//           ✕
//         </button>
//       </div>

//       <div className="account-dropdown__profile">
//         <div className="account-dropdown__avatar">
//           {account.initials || 'U'}
//         </div>

//         <div className="account-dropdown__identity">
//           <p className="account-dropdown__name">{account.name}</p>
//           <p className="account-dropdown__meta soft-text">{account.emailOrWallet}</p>
//         </div>
//       </div>

//       <div className="account-dropdown__chips">
//         <span className="account-dropdown__chip">
//           {account.status || 'Active'}
//         </span>
//         <span className="account-dropdown__chip">
//           Level {account.level || 1}
//         </span>
//         {isAdmin && (
//           <span className="account-dropdown__chip admin-chip">
//             🔧 Admin
//           </span>
//         )}
//       </div>

//       <div className="account-dropdown__menu">
//         <button
//           type="button"
//           className="account-dropdown__item"
//           onClick={() => handleAction(onOpenAccountPage)}
//         >
//           <span className="account-dropdown__item-left">
//             <span className="account-dropdown__item-icon">👤</span>
//             <span className="account-dropdown__item-text">My Account</span>
//           </span>
//           <span className="account-dropdown__item-arrow">›</span>
//         </button>

//         <button
//           type="button"
//           className="account-dropdown__item"
//           onClick={() => handleAction(onOpenPreferences)}
//         >
//           <span className="account-dropdown__item-left">
//             <span className="account-dropdown__item-icon">⚙️</span>
//             <span className="account-dropdown__item-text">Preferences</span>
//           </span>
//           <span className="account-dropdown__item-arrow">›</span>
//         </button>

//         <button
//           type="button"
//           className="account-dropdown__item"
//           onClick={() => handleAction(onOpenSecurity)}
//         >
//           <span className="account-dropdown__item-left">
//             <span className="account-dropdown__item-icon">🔐</span>
//             <span className="account-dropdown__item-text">Security</span>
//           </span>
//           <span className="account-dropdown__item-arrow">›</span>
//         </button>

//         <button
//           type="button"
//           className="account-dropdown__item"
//           onClick={() => handleAction(onOpenActivity)}
//         >
//           <span className="account-dropdown__item-left">
//             <span className="account-dropdown__item-icon">🧾</span>
//             <span className="account-dropdown__item-text">Activity</span>
//           </span>
//           <span className="account-dropdown__item-arrow">›</span>
//         </button>

//         {/* Admin Panel - Only shown if user is multisig owner */}
//         {isAdmin && (
//           <button
//             type="button"
//             className="account-dropdown__item admin-item"
//             onClick={() => handleAction(onOpenAdminPanel)}
//           >
//             <span className="account-dropdown__item-left">
//               <span className="account-dropdown__item-icon">🛡️</span>
//               <span className="account-dropdown__item-text">Admin Panel</span>
//             </span>
//             <span className="account-dropdown__item-arrow">›</span>
//           </button>
//         )}

//         <button
//           type="button"
//           className="account-dropdown__item account-dropdown__item--danger"
//           onClick={() => handleAction(onDisconnect)}
//         >
//           <span className="account-dropdown__item-left">
//             <span className="account-dropdown__item-icon">↪</span>
//             <span className="account-dropdown__item-text">Disconnect</span>
//           </span>
//         </button>
//       </div>
//     </div>
//   )
// }

// export default AccountDropdown
