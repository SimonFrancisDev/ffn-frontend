import './NotificationDropdown.css'
import { Bell, BellOff, X, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const STORAGE_KEY = 'ffn_notification_dropdown_state_v1'

const NotificationDropdown = ({
  isOpen = false,
  notifications = [],
  onClose,
  onMarkAllRead,
  onClearNotifications,
  onNotificationClick,
  anchorRef = null,
}) => {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [localNotifications, setLocalNotifications] = useState([])
  const [desktopPosition, setDesktopPosition] = useState({
    top: 76,
    left: null,
    right: 20,
  })
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLocalNotifications(notifications)
      return
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const saved = raw ? JSON.parse(raw) : null

      if (!saved) {
        setLocalNotifications(notifications)
        return
      }

      const removedIds = new Set(saved.removedIds || [])
      const readIds = new Set(saved.readIds || [])

      const merged = notifications
        .filter((item) => !removedIds.has(item.id))
        .map((item) => ({
          ...item,
          read: item.read || readIds.has(item.id),
        }))

      setLocalNotifications(merged)
    } catch {
      setLocalNotifications(notifications)
    }
  }, [notifications])

  const persistState = (items) => {
    if (typeof window === 'undefined') return

    try {
      const removedIds = []
      const incomingIds = new Set(notifications.map((item) => item.id))
      const currentIds = new Set(items.map((item) => item.id))
      const readIds = items.filter((item) => item.read).map((item) => item.id)

      notifications.forEach((item) => {
        if (!currentIds.has(item.id) && incomingIds.has(item.id)) {
          removedIds.push(item.id)
        }
      })

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          removedIds,
          readIds,
        })
      )
    } catch {
      // no-op
    }
  }

  const updateNotifications = (updater) => {
    setLocalNotifications((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      persistState(next)
      return next
    })
  }

  const unreadCount = useMemo(
    () => localNotifications.filter((item) => !item.read).length,
    [localNotifications]
  )

  // Body scroll lock - only on mobile or when notification details modal is open
  useEffect(() => {
    if (!(isOpen || selectedNotification)) return undefined
    if (typeof window === 'undefined') return undefined

    const shouldLockBody = selectedNotification || window.innerWidth < 768

    if (!shouldLockBody) return undefined

    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction

    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
    }
  }, [isOpen, selectedNotification])

  // Desktop detection effect
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const updateMode = () => {
      setIsDesktop(window.innerWidth >= 768)
    }

    updateMode()

    window.addEventListener('resize', updateMode)

    return () => {
      window.removeEventListener('resize', updateMode)
    }
  }, [])

  const updateDesktopPosition = () => {
    if (typeof window === 'undefined') return
    if (window.innerWidth < 768) return

    const anchorEl = anchorRef?.current
    const dialogEl = dialogRef.current

    if (!dialogEl) return

    const dialogWidth = dialogEl.offsetWidth || 380
    const viewportWidth = window.innerWidth
    const gap = 12
    const minMargin = 12

    if (!anchorEl) {
      setDesktopPosition({
        top: 82,
        left: Math.max(minMargin, viewportWidth - dialogWidth - 20),
        right: 'auto',
      })
      return
    }

    const rect = anchorEl.getBoundingClientRect()

    let left = rect.right - dialogWidth
    left = Math.max(minMargin, left)
    left = Math.min(left, viewportWidth - dialogWidth - minMargin)

    setDesktopPosition({
      top: rect.bottom + gap,
      left,
      right: 'auto',
    })
  }

  useEffect(() => {
    if (!isOpen) return undefined

    const frame = window.requestAnimationFrame(updateDesktopPosition)

    const handleResize = () => updateDesktopPosition()
    const handleScroll = () => updateDesktopPosition()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, anchorRef])

  // Laptop outside-click handler
  useEffect(() => {
    if (!isOpen || !isDesktop) return undefined

    const handlePointerDown = (event) => {
      const dialogEl = dialogRef.current
      const anchorEl = anchorRef?.current

      if (dialogEl?.contains(event.target)) return
      if (anchorEl?.contains(event.target)) return

      onClose?.()
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen, isDesktop, anchorRef, onClose])

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

    updateNotifications((prev) =>
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

    updateNotifications((prev) =>
      prev.filter(
        (notification) => notification.id !== selectedNotification.id
      )
    )

    setSelectedNotification(null)
  }

  const handleRemoveRead = () => {
    updateNotifications((prev) =>
      prev.filter((notification) => !notification.read)
    )
  }

  const handleMarkAllRead = () => {
    updateNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read: true,
      }))
    )

    onMarkAllRead?.()
  }

  const handleClearAll = () => {
    updateNotifications([])
    onClearNotifications?.()
  }

  return (
    <ModalPortal>
      {isOpen ? (
        <div
          className={`notification-modal ${
            isDesktop ? 'notification-modal--desktop' : 'notification-modal--mobile'
          }`}
          role="presentation"
        >
          {!isDesktop && (
            <div
              className="notification-modal__backdrop"
              onClick={onClose}
            />
          )}

          <div
            ref={dialogRef}
            className={`notification-modal__dialog ${
              isDesktop ? 'notification-modal__dialog--desktop' : 'notification-modal__dialog--mobile'
            } glass-panel`}
            role="dialog"
            aria-modal="true"
            aria-label={t('notificationDropdown.ariaLabel', 'Notifications')}
            onClick={(event) => event.stopPropagation()}
            style={
              isDesktop
                ? {
                    position: 'fixed',
                    top: `${desktopPosition.top}px`,
                    left:
                      typeof desktopPosition.left === 'number'
                        ? `${desktopPosition.left}px`
                        : 'auto',
                    right:
                      typeof desktopPosition.right === 'number'
                        ? `${desktopPosition.right}px`
                        : desktopPosition.right || 'auto',
                    width: '380px',
                    minWidth: '380px',
                    maxWidth: '380px',
                  }
                : undefined
            }
          >
            <div className="notification-dropdown__header">
              <div className="notification-dropdown__title-group">
                <h3 className="notification-dropdown__title">
                  {t('notificationDropdown.title', 'Notifications')}
                </h3>
                <span className="notification-dropdown__count">
                  {t('notificationDropdown.unreadCount', '{{count}} unread', {
                    count: unreadCount,
                  })}
                </span>
              </div>

              <div className="notification-dropdown__header-actions">
                <button
                  type="button"
                  className="notification-dropdown__action"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  {t('notificationDropdown.actions.markAllRead', 'Mark all read')}
                </button>

                <button
                  type="button"
                  className="notification-dropdown__action"
                  onClick={handleRemoveRead}
                  disabled={!localNotifications.some((item) => item.read)}
                >
                  {t('notificationDropdown.actions.clearRead', 'Clear read')}
                </button>

                <button
                  type="button"
                  className="notification-dropdown__action notification-dropdown__action--danger"
                  onClick={handleClearAll}
                  disabled={!localNotifications.length}
                >
                  <Trash2 size={14} />
                  <span>{t('notificationDropdown.actions.clearAll', 'Clear all')}</span>
                </button>

                <button
                  type="button"
                  className="notification-dropdown__close"
                  onClick={onClose}
                  aria-label={t('notificationDropdown.closeAriaLabel', 'Close notifications')}
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
                      <div
                        className="notification-dropdown__icon"
                        aria-hidden="true"
                      >
                        {renderIcon(item)}
                      </div>

                      <div className="notification-dropdown__content">
                        <div className="notification-dropdown__item-top">
                          <p className="notification-dropdown__item-title">
                            {item.titleKey ? t(item.titleKey, { ...(item.i18nParams || {}), defaultValue: item.title }) : item.title}
                          </p>
                          <span className="notification-dropdown__time">
                            {item.timeKey ? t(item.timeKey, item.time) : item.time}
                          </span>
                        </div>

                        <p className="notification-dropdown__message soft-text">
                          {item.messageKey ? t(item.messageKey, { ...(item.i18nParams || {}), defaultValue: item.message }) : item.message}
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
                      {t('notificationDropdown.empty.title', 'No notifications yet')}
                    </p>
                    <p className="notification-dropdown__empty-text soft-text">
                      {t(
                        'notificationDropdown.empty.text',
                        'New updates and activity alerts will appear here.'
                      )}
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
            aria-label={t('notificationDropdown.details.ariaLabel', 'Notification details')}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notification-details-modal__header">
              <div className="notification-details-modal__title-wrap">
                <h3 className="notification-details-modal__title">
                  {selectedNotification.titleKey
                    ? t(selectedNotification.titleKey, {
                        ...(selectedNotification.i18nParams || {}),
                        defaultValue: selectedNotification.title,
                      })
                    : selectedNotification.title}
                </h3>
                <span className="notification-details-modal__time">
                  {selectedNotification.timeKey
                    ? t(selectedNotification.timeKey, selectedNotification.time)
                    : selectedNotification.time}
                </span>
              </div>

              <button
                type="button"
                className="notification-details-modal__close"
                onClick={handleCloseDetails}
                aria-label={t(
                  'notificationDropdown.details.closeAriaLabel',
                  'Close notification details'
                )}
              >
                <X size={16} />
              </button>
            </div>

            <div className="notification-details-modal__body">
              <div className="notification-details-modal__icon">
                {renderIcon(selectedNotification)}
              </div>

              <p className="notification-details-modal__message">
                {selectedNotification.messageKey
                  ? t(selectedNotification.messageKey, {
                      ...(selectedNotification.i18nParams || {}),
                      defaultValue: selectedNotification.message,
                    })
                  : selectedNotification.message}
              </p>
            </div>

            <div className="notification-details-modal__actions">
              <button
                type="button"
                className="notification-details-modal__action"
                onClick={handleCloseDetails}
              >
                {t('notificationDropdown.actions.close', 'Close')}
              </button>

              <button
                type="button"
                className="notification-details-modal__action notification-details-modal__action--danger"
                onClick={handleRemoveSelected}
              >
                {t('notificationDropdown.actions.clearThisMessage', 'Clear this message')}
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
// import { useEffect, useMemo, useRef, useState } from 'react'
// import { createPortal } from 'react-dom'

// function ModalPortal({ children }) {
//   if (typeof document === 'undefined') return null
//   return createPortal(children, document.body)
// }

// const STORAGE_KEY = 'ffn_notification_dropdown_state_v1'

// const NotificationDropdown = ({
//   isOpen = false,
//   notifications = [],
//   onClose,
//   onMarkAllRead,
//   onClearNotifications,
//   onNotificationClick,
//   anchorRef = null,
// }) => {
//   const dialogRef = useRef(null)
//   const [selectedNotification, setSelectedNotification] = useState(null)
//   const [localNotifications, setLocalNotifications] = useState([])
//   const [desktopPosition, setDesktopPosition] = useState({
//     top: 76,
//     left: null,
//     right: 20,
//   })

//   useEffect(() => {
//     if (typeof window === 'undefined') {
//       setLocalNotifications(notifications)
//       return
//     }

//     try {
//       const raw = window.localStorage.getItem(STORAGE_KEY)
//       const saved = raw ? JSON.parse(raw) : null

//       if (!saved) {
//         setLocalNotifications(notifications)
//         return
//       }

//       const removedIds = new Set(saved.removedIds || [])
//       const readIds = new Set(saved.readIds || [])

//       const merged = notifications
//         .filter((item) => !removedIds.has(item.id))
//         .map((item) => ({
//           ...item,
//           read: item.read || readIds.has(item.id),
//         }))

//       setLocalNotifications(merged)
//     } catch {
//       setLocalNotifications(notifications)
//     }
//   }, [notifications])

//   const persistState = (items) => {
//     if (typeof window === 'undefined') return

//     try {
//       const removedIds = []
//       const incomingIds = new Set(notifications.map((item) => item.id))
//       const currentIds = new Set(items.map((item) => item.id))
//       const readIds = items.filter((item) => item.read).map((item) => item.id)

//       notifications.forEach((item) => {
//         if (!currentIds.has(item.id) && incomingIds.has(item.id)) {
//           removedIds.push(item.id)
//         }
//       })

//       window.localStorage.setItem(
//         STORAGE_KEY,
//         JSON.stringify({
//           removedIds,
//           readIds,
//         })
//       )
//     } catch {
//       // no-op
//     }
//   }

//   const updateNotifications = (updater) => {
//     setLocalNotifications((prev) => {
//       const next = typeof updater === 'function' ? updater(prev) : updater
//       persistState(next)
//       return next
//     })
//   }

//   const unreadCount = useMemo(
//     () => localNotifications.filter((item) => !item.read).length,
//     [localNotifications]
//   )

//   useEffect(() => {
//     if (!(isOpen || selectedNotification)) return undefined

//     const previousOverflow = document.body.style.overflow
//     const previousTouchAction = document.body.style.touchAction

//     document.body.style.overflow = 'hidden'
//     document.body.style.touchAction = 'none'

//     return () => {
//       document.body.style.overflow = previousOverflow
//       document.body.style.touchAction = previousTouchAction
//     }
//   }, [isOpen, selectedNotification])

//   const updateDesktopPosition = () => {
//     if (typeof window === 'undefined') return
//     if (window.innerWidth < 768) return

//     const anchorEl = anchorRef?.current
//     const dialogEl = dialogRef.current

//     if (!anchorEl || !dialogEl) {
//       setDesktopPosition({ top: 76, left: null, right: 20 })
//       return
//     }

//     const rect = anchorEl.getBoundingClientRect()
//     const dialogWidth = dialogEl.offsetWidth || 360
//     const viewportWidth = window.innerWidth
//     const gap = 12
//     const minMargin = 12

//     let left = rect.right - dialogWidth
//     left = Math.max(minMargin, left)
//     left = Math.min(left, viewportWidth - dialogWidth - minMargin)

//     const top = rect.bottom + gap

//     setDesktopPosition({
//       top,
//       left,
//       right: 'auto',
//     })
//   }

//   useEffect(() => {
//     if (!isOpen) return undefined

//     updateDesktopPosition()

//     const handleResize = () => updateDesktopPosition()
//     const handleScroll = () => updateDesktopPosition()

//     window.addEventListener('resize', handleResize)
//     window.addEventListener('scroll', handleScroll, true)

//     return () => {
//       window.removeEventListener('resize', handleResize)
//       window.removeEventListener('scroll', handleScroll, true)
//     }
//   }, [isOpen, anchorRef])

//   if (!isOpen && !selectedNotification) return null

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

//     updateNotifications((prev) =>
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

//     updateNotifications((prev) =>
//       prev.filter(
//         (notification) => notification.id !== selectedNotification.id
//       )
//     )

//     setSelectedNotification(null)
//   }

//   const handleRemoveRead = () => {
//     updateNotifications((prev) =>
//       prev.filter((notification) => !notification.read)
//     )
//   }

//   const handleMarkAllRead = () => {
//     updateNotifications((prev) =>
//       prev.map((item) => ({
//         ...item,
//         read: true,
//       }))
//     )

//     onMarkAllRead?.()
//   }

//   const handleClearAll = () => {
//     updateNotifications([])
//     onClearNotifications?.()
//   }

//   return (
//     <ModalPortal>
//       {isOpen ? (
//         <div className="notification-modal" role="presentation">
//           <div
//             className="notification-modal__backdrop"
//             onClick={onClose}
//           />

//           <div
//             ref={dialogRef}
//             className="notification-modal__dialog glass-panel"
//             role="dialog"
//             aria-modal="true"
//             aria-label="Notifications"
//             onClick={(event) => event.stopPropagation()}
//             style={
//               typeof desktopPosition.left === 'number'
//                 ? {
//                     top: `${desktopPosition.top}px`,
//                     left: `${desktopPosition.left}px`,
//                     right: desktopPosition.right,
//                   }
//                 : undefined
//             }
//           >
//             <div className="notification-dropdown__header">
//               <div className="notification-dropdown__title-group">
//                 <h3 className="notification-dropdown__title">Notifications</h3>
//                 <span className="notification-dropdown__count">
//                   {unreadCount} unread
//                 </span>
//               </div>

//               <div className="notification-dropdown__header-actions">
//                 <button
//                   type="button"
//                   className="notification-dropdown__action"
//                   onClick={handleMarkAllRead}
//                   disabled={unreadCount === 0}
//                 >
//                   Mark all read
//                 </button>

//                 <button
//                   type="button"
//                   className="notification-dropdown__action"
//                   onClick={handleRemoveRead}
//                   disabled={!localNotifications.some((item) => item.read)}
//                 >
//                   Clear read
//                 </button>

//                 <button
//                   type="button"
//                   className="notification-dropdown__action notification-dropdown__action--danger"
//                   onClick={handleClearAll}
//                   disabled={!localNotifications.length}
//                 >
//                   <Trash2 size={14} />
//                   <span>Clear all</span>
//                 </button>

//                 <button
//                   type="button"
//                   className="notification-dropdown__close"
//                   onClick={onClose}
//                   aria-label="Close notifications"
//                 >
//                   <X size={16} />
//                 </button>
//               </div>
//             </div>

//             <div className="notification-dropdown__body">
//               <div className="notification-dropdown__list">
//                 {localNotifications.length ? (
//                   localNotifications.map((item) => (
//                     <button
//                       key={item.id}
//                       type="button"
//                       className={`notification-dropdown__item ${item.read ? '' : 'is-unread'}`}
//                       onClick={() => handleOpenNotification(item)}
//                     >
//                       <div
//                         className="notification-dropdown__icon"
//                         aria-hidden="true"
//                       >
//                         {renderIcon(item)}
//                       </div>

//                       <div className="notification-dropdown__content">
//                         <div className="notification-dropdown__item-top">
//                           <p className="notification-dropdown__item-title">
//                             {item.title}
//                           </p>
//                           <span className="notification-dropdown__time">
//                             {item.time}
//                           </span>
//                         </div>

//                         <p className="notification-dropdown__message soft-text">
//                           {item.message}
//                         </p>
//                       </div>
//                     </button>
//                   ))
//                 ) : (
//                   <div className="notification-dropdown__empty">
//                     <div className="notification-dropdown__empty-icon">
//                       <BellOff size={20} />
//                     </div>
//                     <p className="notification-dropdown__empty-title">
//                       No notifications yet
//                     </p>
//                     <p className="notification-dropdown__empty-text soft-text">
//                       New updates and activity alerts will appear here.
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       ) : null}

//       {selectedNotification ? (
//         <div className="notification-details-modal-overlay" role="presentation">
//           <div
//             className="notification-details-modal-overlay__backdrop"
//             onClick={handleCloseDetails}
//           />

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
//     </ModalPortal>
//   )
// }

// export default NotificationDropdown
