import './AccountDropdown.css'

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
  isAdmin = false, // New prop to check if user is multisig owner
}) => {
  if (!isOpen || !account) return null

  const handleAction = (callback) => {
    if (onClose) onClose()
    if (callback) callback()
  }

  return (
    <div className="account-dropdown glass-panel theme-transition">
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
//   onDisconnect,
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

