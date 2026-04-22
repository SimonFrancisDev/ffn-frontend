import './NotificationDropdown.css'
import { Bell, BellOff, X, Trash2 } from 'lucide-react'

const NotificationDropdown = ({
  isOpen = false,
  notifications = [],
  onClose,
  onMarkAllRead,
  onClearNotifications,
  onNotificationClick,
}) => {
  if (!isOpen) return null

  const unreadNotifications = notifications.filter((item) => !item.read)
  const unreadCount = unreadNotifications.length

  const renderIcon = (item) => {
    const IconComponent = item.icon || Bell
    return (
      <IconComponent
        size={16}
        style={{ color: item.iconColor || 'var(--text-secondary)' }}
      />
    )
  }

  const handleItemClick = (item) => {
    onClose?.()

    window.setTimeout(() => {
      onNotificationClick?.(item)
    }, 0)
  }

  return (
    <>
      <button
        type="button"
        className="notification-dropdown__backdrop"
        aria-label="Close notifications"
        onClick={onClose}
      />

      <div
        className="notification-dropdown glass-panel theme-transition"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="notification-dropdown__header">
          <div className="notification-dropdown__title-group">
            <h3 className="notification-dropdown__title">Notifications</h3>
            <span className="notification-dropdown__count">
              {unreadCount} unread
            </span>
          </div>

          <div className="notification-dropdown__header-actions">
            <button
              type="button"
              className="notification-dropdown__action"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>

            <button
              type="button"
              className="notification-dropdown__action notification-dropdown__action--danger"
              onClick={onClearNotifications}
              disabled={!notifications.length}
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>

            <button
              type="button"
              className="notification-dropdown__close"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="notification-dropdown__list">
          {unreadNotifications.length ? (
            unreadNotifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className="notification-dropdown__item is-unread"
                onClick={() => handleItemClick(item)}
              >
                <div className="notification-dropdown__icon" aria-hidden="true">
                  {renderIcon(item)}
                </div>

                <div className="notification-dropdown__content">
                  <div className="notification-dropdown__item-top">
                    <p className="notification-dropdown__item-title">{item.title}</p>
                    <span className="notification-dropdown__time">{item.time}</span>
                  </div>

                  <p className="notification-dropdown__message soft-text">
                    {item.message}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="notification-dropdown__empty">
              <div className="notification-dropdown__empty-icon">
                <BellOff size={20} />
              </div>
              <p className="notification-dropdown__empty-title">No unread notifications</p>
              <p className="notification-dropdown__empty-text soft-text">
                New updates and activity alerts will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default NotificationDropdown













// import './NotificationDropdown.css'
// import { Bell, BellOff, X } from 'lucide-react'

// const NotificationDropdown = ({
//   isOpen = false,
//   notifications = [],
//   onClose,
//   onMarkAllRead,
//   onNotificationClick,
// }) => {
//   if (!isOpen) return null

//   const unreadCount = notifications.filter((item) => !item.read).length

//   const renderIcon = (item) => {
//     const IconComponent = item.icon || Bell
//     return (
//       <IconComponent
//         size={16}
//         style={{ color: item.iconColor || 'var(--text-secondary)' }}
//       />
//     )
//   }

//   const handleItemClick = (item) => {
//     onNotificationClick?.(item)
//     onClose?.()
//   }

//   return (
//     <>
//       <button
//         type="button"
//         className="notification-dropdown__backdrop"
//         aria-label="Close notifications"
//         onClick={onClose}
//       />

//       <div
//         className="notification-dropdown glass-panel theme-transition"
//         role="dialog"
//         aria-modal="true"
//         aria-label="Notifications"
//         onClick={(event) => event.stopPropagation()}
//       >
//         <div className="notification-dropdown__header">
//           <div className="notification-dropdown__title-group">
//             <h3 className="notification-dropdown__title">Notifications</h3>
//             <span className="notification-dropdown__count">
//               {unreadCount} unread
//             </span>
//           </div>

//           <div className="notification-dropdown__header-actions">
//             <button
//               type="button"
//               className="notification-dropdown__mark-read"
//               onClick={onMarkAllRead}
//               disabled={!notifications.length || unreadCount === 0}
//             >
//               Mark all read
//             </button>

//             <button
//               type="button"
//               className="notification-dropdown__close"
//               onClick={onClose}
//               aria-label="Close notifications"
//             >
//               <X size={16} />
//             </button>
//           </div>
//         </div>

//         <div className="notification-dropdown__list">
//           {notifications.length ? (
//             notifications.map((item) => (
//               <button
//                 key={item.id}
//                 type="button"
//                 className={`notification-dropdown__item ${item.read ? '' : 'is-unread'}`}
//                 onClick={() => handleItemClick(item)}
//               >
//                 <div className="notification-dropdown__icon" aria-hidden="true">
//                   {renderIcon(item)}
//                 </div>

//                 <div className="notification-dropdown__content">
//                   <div className="notification-dropdown__item-top">
//                     <p className="notification-dropdown__item-title">{item.title}</p>
//                     <span className="notification-dropdown__time">{item.time}</span>
//                   </div>

//                   <p className="notification-dropdown__message soft-text">
//                     {item.message}
//                   </p>
//                 </div>
//               </button>
//             ))
//           ) : (
//             <div className="notification-dropdown__empty">
//               <div className="notification-dropdown__empty-icon">
//                 <BellOff size={20} />
//               </div>
//               <p className="notification-dropdown__empty-title">No notifications yet</p>
//               <p className="notification-dropdown__empty-text soft-text">
//                 Important updates and activity alerts will appear here.
//               </p>
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   )
// }

// export default NotificationDropdown














// import './NotificationDropdown.css'
// import { Bell, BellOff, X, Megaphone, Calendar } from 'lucide-react'

// const NotificationDropdown = ({
//   isOpen = false,
//   notifications = [],
//   onClose,
//   onMarkAllRead,
//   onNotificationClick,
// }) => {
//   if (!isOpen) return null

//   const unreadCount = notifications.filter((item) => !item.read).length

//   const renderIcon = (item) => {
//     const IconComponent = item.icon || Bell
//     return <IconComponent size={16} style={{ color: item.iconColor || 'var(--text-secondary)' }} />
//   }

//   return (
//     <div className="notification-dropdown glass-panel theme-transition">
//       <div className="notification-dropdown__header">
//         <div className="notification-dropdown__title-group">
//           <h3 className="notification-dropdown__title">Notifications</h3>
//           <span className="notification-dropdown__count">
//             {unreadCount} unread
//           </span>
//         </div>

//         <div className="notification-dropdown__header-actions">
//           <button
//             type="button"
//             className="notification-dropdown__mark-read"
//             onClick={onMarkAllRead}
//             disabled={!notifications.length || unreadCount === 0}
//           >
//             Mark all read
//           </button>

//           <button
//             type="button"
//             className="notification-dropdown__close"
//             onClick={onClose}
//             aria-label="Close notifications"
//           >
//             <X size={16} />
//           </button>
//         </div>
//       </div>

//       <div className="notification-dropdown__list">
//         {notifications.length ? (
//           notifications.map((item) => (
//             <button
//               key={item.id}
//               type="button"
//               className={`notification-dropdown__item ${item.read ? '' : 'is-unread'}`}
//               onClick={() => onNotificationClick?.(item)}
//             >
//               <div className="notification-dropdown__icon" aria-hidden="true">
//                 {renderIcon(item)}
//               </div>

//               <div className="notification-dropdown__content">
//                 <div className="notification-dropdown__item-top">
//                   <p className="notification-dropdown__item-title">{item.title}</p>
//                   <span className="notification-dropdown__time">{item.time}</span>
//                 </div>

//                 <p className="notification-dropdown__message soft-text">
//                   {item.message}
//                 </p>
//               </div>
//             </button>
//           ))
//         ) : (
//           <div className="notification-dropdown__empty">
//             <div className="notification-dropdown__empty-icon">
//               <BellOff size={20} />
//             </div>
//             <p className="notification-dropdown__empty-title">No notifications yet</p>
//             <p className="notification-dropdown__empty-text soft-text">
//               Important updates and activity alerts will appear here.
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// export default NotificationDropdown













// import './NotificationDropdown.css'

// const NotificationDropdown = ({
//   isOpen = false,
//   notifications = [],
//   onClose,
//   onMarkAllRead,
//   onNotificationClick,
// }) => {
//   if (!isOpen) return null

//   const unreadCount = notifications.filter((item) => !item.read).length

//   return (
//     <div className="notification-dropdown glass-panel theme-transition">
//       <div className="notification-dropdown__header">
//         <div className="notification-dropdown__title-group">
//           <h3 className="notification-dropdown__title">Notifications</h3>
//           <span className="notification-dropdown__count">
//             {unreadCount} unread
//           </span>
//         </div>

//         <div className="notification-dropdown__header-actions">
//           <button
//             type="button"
//             className="notification-dropdown__mark-read"
//             onClick={onMarkAllRead}
//             disabled={!notifications.length || unreadCount === 0}
//           >
//             Mark all read
//           </button>

//           <button
//             type="button"
//             className="notification-dropdown__close"
//             onClick={onClose}
//             aria-label="Close notifications"
//           >
//             ✕
//           </button>
//         </div>
//       </div>

//       <div className="notification-dropdown__list">
//         {notifications.length ? (
//           notifications.map((item) => (
//             <button
//               key={item.id}
//               type="button"
//               className={`notification-dropdown__item ${item.read ? '' : 'is-unread'}`}
//               onClick={() => onNotificationClick?.(item)}
//             >
//               <div className="notification-dropdown__icon" aria-hidden="true">
//                 {item.icon || '🔔'}
//               </div>

//               <div className="notification-dropdown__content">
//                 <div className="notification-dropdown__item-top">
//                   <p className="notification-dropdown__item-title">{item.title}</p>
//                   <span className="notification-dropdown__time">{item.time}</span>
//                 </div>

//                 <p className="notification-dropdown__message soft-text">
//                   {item.message}
//                 </p>
//               </div>
//             </button>
//           ))
//         ) : (
//           <div className="notification-dropdown__empty">
//             <div className="notification-dropdown__empty-icon">🔕</div>
//             <p className="notification-dropdown__empty-title">No notifications yet</p>
//             <p className="notification-dropdown__empty-text soft-text">
//               Important updates and activity alerts will appear here.
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// export default NotificationDropdown