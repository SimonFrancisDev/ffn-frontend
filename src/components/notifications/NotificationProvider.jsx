import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearNotification as clearRemoteNotification,
  clearReadNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../Services/notificationsApi'

export const NOTIFICATION_TYPES = {
  PAYOUT: 'payout',
  PAYOUT_SKIPPED: 'payout_skipped',
  RECYCLE: 'recycle',
  ESCROW: 'escrow',
  AUTO_UPGRADE: 'auto_upgrade',
  TOKEN_REWARD: 'token_reward',
  SYSTEM: 'system',
  COMMUNITY: 'community',
}

export const NOTIFICATION_SEVERITIES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
}

const STORAGE_KEY = 'ffn_notification_center_v1'
const NotificationContext = createContext(null)

const normalizeNotification = (notification) => {
  const createdAt = notification.createdAt || new Date().toISOString()
  const id =
    notification.id ||
    notification.eventKey ||
    `${notification.type || NOTIFICATION_TYPES.SYSTEM}:${createdAt}:${Math.random().toString(36).slice(2, 8)}`

  return {
    id,
    type: notification.type || NOTIFICATION_TYPES.SYSTEM,
    severity: notification.severity || NOTIFICATION_SEVERITIES.INFO,
    title: notification.title || 'Notification',
    titleKey: notification.titleKey || '',
    message: notification.message || '',
    messageKey: notification.messageKey || '',
    route: notification.route || '',
    eventKey: notification.eventKey || id,
    read: Boolean(notification.read),
    createdAt,
    payload: notification.payload || {},
    i18nParams: notification.i18nParams || {},
    source: notification.source || 'local',
  }
}

export function NotificationProvider({ children, walletAddress = '' }) {
  const [notifications, setNotifications] = useState([])
  const normalizedWallet = String(walletAddress || '').toLowerCase()

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setNotifications(parsed.map(normalizeNotification))
    } catch (error) {
      console.error('Notification cache read failed:', error)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 100)))
    } catch (error) {
      console.error('Notification cache write failed:', error)
    }
  }, [notifications])

  useEffect(() => {
    if (!normalizedWallet) return undefined

    let cancelled = false

    const loadRemoteNotifications = async () => {
      try {
        const response = await fetchNotifications({ wallet: normalizedWallet, limit: 50 })
        if (cancelled) return

        const remote = (response.items || []).map((item) => normalizeNotification({
          id: item._id || item.id,
          eventKey: item.dedupeKey || item._id || item.id,
          type: item.notificationType,
          severity: item.severity,
          title: item.notificationType?.replace(/_/g, ' ') || 'Notification',
          titleKey: item.titleKey,
          message: item.notificationType?.replace(/_/g, ' ') || '',
          messageKey: item.messageKey,
          route: item.route,
          read: item.status === 'read',
          createdAt: item.createdAt,
          payload: item.routeParams || {},
          i18nParams: item.i18nParams || {},
          source: 'backend',
        }))

        setNotifications((current) => {
          const localOnly = current.filter((item) => item.source !== 'backend')
          return [...remote, ...localOnly]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 100)
        })
      } catch (error) {
        console.error('Notification feed load failed:', error)
      }
    }

    loadRemoteNotifications()
    const interval = window.setInterval(loadRemoteNotifications, 120000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [normalizedWallet])

  const upsertNotification = useCallback((notification) => {
    const normalized = normalizeNotification(notification)
    setNotifications((current) => {
      const filtered = current.filter((item) => item.eventKey !== normalized.eventKey && item.id !== normalized.id)
      return [normalized, ...filtered]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 100)
    })
    return normalized.id
  }, [])

  const markRead = useCallback((id) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item))
    if (normalizedWallet) {
      markNotificationRead(id, normalizedWallet).catch((error) => {
        console.error('Notification read sync failed:', error)
      })
    }
  }, [normalizedWallet])

  const markUnread = useCallback((id) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: false } : item))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
    if (normalizedWallet) {
      markAllNotificationsRead(normalizedWallet).catch((error) => {
        console.error('Notification read-all sync failed:', error)
      })
    }
  }, [normalizedWallet])

  const removeNotification = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
    if (normalizedWallet) {
      clearRemoteNotification(id, normalizedWallet).catch((error) => {
        console.error('Notification clear sync failed:', error)
      })
    }
  }, [normalizedWallet])

  const clearNotifications = useCallback(() => {
    setNotifications((current) => current.filter((item) => item.source === 'backend' && !item.read))
    if (normalizedWallet) {
      clearReadNotifications(normalizedWallet).catch((error) => {
        console.error('Notification clear-read sync failed:', error)
      })
    }
  }, [normalizedWallet])

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  )

  const grouped = useMemo(() => {
    return notifications.reduce((acc, item) => {
      const key = item.type || NOTIFICATION_TYPES.SYSTEM
      acc[key] = acc[key] || []
      acc[key].push(item)
      return acc
    }, {})
  }, [notifications])

  const value = useMemo(() => ({
    notifications,
    grouped,
    unreadCount,
    upsertNotification,
    markRead,
    markUnread,
    markAllRead,
    removeNotification,
    clearNotifications,
  }), [
    clearNotifications,
    grouped,
    markAllRead,
    markRead,
    markUnread,
    notifications,
    removeNotification,
    unreadCount,
    upsertNotification,
  ])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationCenter() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotificationCenter must be used inside NotificationProvider')
  return context
}
