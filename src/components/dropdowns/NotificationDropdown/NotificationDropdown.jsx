import './NotificationDropdown.css'
import { Bell, BellOff, X, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const NotificationDropdown = ({
  isOpen = false,
  notifications = [],
  onClose,
  onMarkAllRead,
  onClearNotifications,
  onNotificationClick,
}) => {
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [localNotifications, setLocalNotifications] = useState(notifications)

  useEffect(() => {
    setLocalNotifications(notifications)
  }, [notifications])

  const unreadCount = useMemo(
    () => localNotifications.filter((item) => !item.read).length,
    [localNotifications]
  )

  useEffect(() => {
    if (isOpen || selectedNotification) {
      const previousOverflow = document.body.style.overflow
      const previousTouchAction = document.body.style.touchAction

      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'

      return () => {
        document.body.style.overflow = previousOverflow
        document.body.style.touchAction = previousTouchAction
      }
    }

    return undefined
  }, [isOpen, selectedNotification])

  if (!isOpen && !selectedNotification) return null

  const renderIcon = (item) => {
    const IconComponent = item.icon || Bell
    return (
      <IconComponent
        size={16}
        style={{ color: item.iconColor || 'var(--text-secondary)' }}
      />
    )
  }

  const handleOpenNotification = (item) => {
    const updatedItem = { ...item, read: true }

    setLocalNotifications((prev) =>
      prev.map((notification) =>
        notification.id === item.id ? updatedItem : notification
      )
    )

    setSelectedNotification(updatedItem)
    onNotificationClick?.(updatedItem)
  }

  const handleCloseDetails = () => {
    setSelectedNotification(null)
  }

  const handleRemoveSelected = () => {
    if (!selectedNotification) return

    setLocalNotifications((prev) =>
      prev.filter((notification) => notification.id !== selectedNotification.id)
    )

    setSelectedNotification(null)
  }

  const handleRemoveRead = () => {
    setLocalNotifications((prev) =>
      prev.filter((notification) => !notification.read)
    )
  }

  return (
    <ModalPortal>
      {isOpen ? (
        <div className="notification-modal" role="presentation">
          <div
            className="notification-modal__backdrop"
            onClick={onClose}
          />

          <div
            className="notification-modal__dialog glass-panel"
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
                  className="notification-dropdown__action"
                  onClick={handleRemoveRead}
                  disabled={!localNotifications.some((item) => item.read)}
                >
                  Clear read
                </button>

                <button
                  type="button"
                  className="notification-dropdown__action notification-dropdown__action--danger"
                  onClick={onClearNotifications}
                  disabled={!localNotifications.length}
                >
                  <Trash2 size={14} />
                  <span>Clear all</span>
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

            <div className="notification-dropdown__body">
              <div className="notification-dropdown__list">
                {localNotifications.length ? (
                  localNotifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`notification-dropdown__item ${item.read ? '' : 'is-unread'}`}
                      onClick={() => handleOpenNotification(item)}
                    >
                      <div className="notification-dropdown__icon" aria-hidden="true">
                        {renderIcon(item)}
                      </div>

                      <div className="notification-dropdown__content">
                        <div className="notification-dropdown__item-top">
                          <p className="notification-dropdown__item-title">
                            {item.title}
                          </p>
                          <span className="notification-dropdown__time">
                            {item.time}
                          </span>
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
                    <p className="notification-dropdown__empty-title">
                      No notifications yet
                    </p>
                    <p className="notification-dropdown__empty-text soft-text">
                      New updates and activity alerts will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedNotification ? (
        <div className="notification-details-modal-overlay" role="presentation">
          <div
            className="notification-details-modal-overlay__backdrop"
            onClick={handleCloseDetails}
          />

          <div
            className="notification-details-modal glass-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Notification details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notification-details-modal__header">
              <div className="notification-details-modal__title-wrap">
                <h3 className="notification-details-modal__title">
                  {selectedNotification.title}
                </h3>
                <span className="notification-details-modal__time">
                  {selectedNotification.time}
                </span>
              </div>

              <button
                type="button"
                className="notification-details-modal__close"
                onClick={handleCloseDetails}
                aria-label="Close notification details"
              >
                <X size={16} />
              </button>
            </div>

            <div className="notification-details-modal__body">
              <div className="notification-details-modal__icon">
                {renderIcon(selectedNotification)}
              </div>

              <p className="notification-details-modal__message">
                {selectedNotification.message}
              </p>
            </div>

            <div className="notification-details-modal__actions">
              <button
                type="button"
                className="notification-details-modal__action"
                onClick={handleCloseDetails}
              >
                Close
              </button>

              <button
                type="button"
                className="notification-details-modal__action notification-details-modal__action--danger"
                onClick={handleRemoveSelected}
              >
                Clear this message
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ModalPortal>
  )
}

export default NotificationDropdown












// import './NotificationDropdown.css'
// import { Bell, BellOff, X, Trash2 } from 'lucide-react'
// import { useEffect, useMemo, useState } from 'react'

// const NotificationDropdown = ({
//   isOpen = false,
//   notifications = [],
//   onClose,
//   onMarkAllRead,
//   onClearNotifications,
//   onNotificationClick,
// }) => {
//   const [selectedNotification, setSelectedNotification] = useState(null)
//   const [localNotifications, setLocalNotifications] = useState(notifications)

//   useEffect(() => {
//     setLocalNotifications(notifications)
//   }, [notifications])

//   const unreadCount = useMemo(
//     () => localNotifications.filter((item) => !item.read).length,
//     [localNotifications]
//   )

//   useEffect(() => {
//     if (isOpen || selectedNotification) {
//       document.body.style.overflow = 'hidden'
//     } else {
//       document.body.style.overflow = ''
//     }

//     return () => {
//       document.body.style.overflow = ''
//     }
//   }, [isOpen, selectedNotification])

//   if (!isOpen) return null

//   const renderIcon = (item) => {
//     const IconComponent = item.icon || Bell
//     return (
//       <IconComponent
//         size={16}
//         style={{ color: item.iconColor || 'var(--text-secondary)' }}
//       />
//     )
//   }

//   const handleOpenNotification = (item) => {
//     const updatedItem = { ...item, read: true }

//     setLocalNotifications((prev) =>
//       prev.map((notification) =>
//         notification.id === item.id ? updatedItem : notification
//       )
//     )

//     setSelectedNotification(updatedItem)
//     onNotificationClick?.(updatedItem)
//   }

//   const handleCloseDetails = () => {
//     setSelectedNotification(null)
//   }

//   const handleRemoveSelected = () => {
//     if (!selectedNotification) return

//     setLocalNotifications((prev) =>
//       prev.filter((notification) => notification.id !== selectedNotification.id)
//     )

//     setSelectedNotification(null)
//   }

//   const handleRemoveRead = () => {
//     setLocalNotifications((prev) =>
//       prev.filter((notification) => !notification.read)
//     )
//   }

//   return (
//     <>
//       <div
//         className="notification-dropdown-modal-overlay"
//         onClick={onClose}
//         role="presentation"
//       >
//         <div
//           className="notification-dropdown glass-panel"
//           role="dialog"
//           aria-modal="true"
//           aria-label="Notifications"
//           onClick={(event) => event.stopPropagation()}
//         >
//           <div className="notification-dropdown__header">
//             <div className="notification-dropdown__title-group">
//               <h3 className="notification-dropdown__title">Notifications</h3>
//               <span className="notification-dropdown__count">
//                 {unreadCount} unread
//               </span>
//             </div>

//             <div className="notification-dropdown__header-actions">
//               <button
//                 type="button"
//                 className="notification-dropdown__action"
//                 onClick={onMarkAllRead}
//                 disabled={unreadCount === 0}
//               >
//                 Mark all read
//               </button>

//               <button
//                 type="button"
//                 className="notification-dropdown__action"
//                 onClick={handleRemoveRead}
//                 disabled={!localNotifications.some((item) => item.read)}
//               >
//                 Clear read
//               </button>

//               <button
//                 type="button"
//                 className="notification-dropdown__action notification-dropdown__action--danger"
//                 onClick={onClearNotifications}
//                 disabled={!localNotifications.length}
//               >
//                 <Trash2 size={14} />
//                 <span>Clear all</span>
//               </button>

//               <button
//                 type="button"
//                 className="notification-dropdown__close"
//                 onClick={onClose}
//                 aria-label="Close notifications"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//           </div>

//           <div className="notification-dropdown__body">
//             <div className="notification-dropdown__list">
//               {localNotifications.length ? (
//                 localNotifications.map((item) => (
//                   <button
//                     key={item.id}
//                     type="button"
//                     className={`notification-dropdown__item ${item.read ? '' : 'is-unread'}`}
//                     onClick={() => handleOpenNotification(item)}
//                   >
//                     <div className="notification-dropdown__icon" aria-hidden="true">
//                       {renderIcon(item)}
//                     </div>

//                     <div className="notification-dropdown__content">
//                       <div className="notification-dropdown__item-top">
//                         <p className="notification-dropdown__item-title">
//                           {item.title}
//                         </p>
//                         <span className="notification-dropdown__time">
//                           {item.time}
//                         </span>
//                       </div>

//                       <p className="notification-dropdown__message soft-text">
//                         {item.message}
//                       </p>
//                     </div>
//                   </button>
//                 ))
//               ) : (
//                 <div className="notification-dropdown__empty">
//                   <div className="notification-dropdown__empty-icon">
//                     <BellOff size={20} />
//                   </div>
//                   <p className="notification-dropdown__empty-title">
//                     No notifications yet
//                   </p>
//                   <p className="notification-dropdown__empty-text soft-text">
//                     New updates and activity alerts will appear here.
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {selectedNotification ? (
//         <div
//           className="notification-details-modal-overlay"
//           onClick={handleCloseDetails}
//           role="presentation"
//         >
//           <div
//             className="notification-details-modal glass-panel"
//             role="dialog"
//             aria-modal="true"
//             aria-label="Notification details"
//             onClick={(event) => event.stopPropagation()}
//           >
//             <div className="notification-details-modal__header">
//               <div className="notification-details-modal__title-wrap">
//                 <h3 className="notification-details-modal__title">
//                   {selectedNotification.title}
//                 </h3>
//                 <span className="notification-details-modal__time">
//                   {selectedNotification.time}
//                 </span>
//               </div>

//               <button
//                 type="button"
//                 className="notification-details-modal__close"
//                 onClick={handleCloseDetails}
//                 aria-label="Close notification details"
//               >
//                 <X size={16} />
//               </button>
//             </div>

//             <div className="notification-details-modal__body">
//               <div className="notification-details-modal__icon">
//                 {renderIcon(selectedNotification)}
//               </div>

//               <p className="notification-details-modal__message">
//                 {selectedNotification.message}
//               </p>
//             </div>

//             <div className="notification-details-modal__actions">
//               <button
//                 type="button"
//                 className="notification-details-modal__action"
//                 onClick={handleCloseDetails}
//               >
//                 Close
//               </button>

//               <button
//                 type="button"
//                 className="notification-details-modal__action notification-details-modal__action--danger"
//                 onClick={handleRemoveSelected}
//               >
//                 Clear this message
//               </button>
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </>
//   )
// }

// export default NotificationDropdown