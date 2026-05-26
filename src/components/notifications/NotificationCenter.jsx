import { Bell, CheckCheck, Inbox, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, IconButton } from '../ui'
import { NOTIFICATION_SEVERITIES, useNotificationCenter } from './NotificationProvider'
import './NotificationCenter.css'

const severityTone = {
  [NOTIFICATION_SEVERITIES.SUCCESS]: 'success',
  [NOTIFICATION_SEVERITIES.WARNING]: 'warning',
  [NOTIFICATION_SEVERITIES.DANGER]: 'danger',
  [NOTIFICATION_SEVERITIES.INFO]: 'info',
}

function formatNotificationTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function NotificationCenter({
  title = 'Notifications',
  emptyTitle = 'No notifications',
  emptyMessage = 'Important account and platform updates will appear here.',
  onOpenRoute,
  className = '',
}) {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    removeNotification,
    clearNotifications,
  } = useNotificationCenter()

  const rootClass = ['ffn-notification-center', className].filter(Boolean).join(' ')

  return (
    <section className={rootClass} aria-label={title}>
      <header className="ffn-notification-center__header">
        <div>
          <h2>{title}</h2>
          <p>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        <div className="ffn-notification-center__actions">
          <IconButton label="Mark all read" icon={CheckCheck} size={34} onClick={markAllRead} disabled={!unreadCount} />
          <IconButton label="Clear notifications" icon={Trash2} size={34} onClick={clearNotifications} disabled={!notifications.length} />
        </div>
      </header>

      {notifications.length ? (
        <div className="ffn-notification-center__list">
          {notifications.map((item) => (
            <article key={item.id} className={`ffn-notification-item ${item.read ? '' : 'ffn-notification-item--unread'}`}>
              <span className="ffn-notification-item__icon">
                <Bell size={16} aria-hidden="true" />
              </span>
              <div className="ffn-notification-item__body">
                <div className="ffn-notification-item__meta">
                  <Badge tone={severityTone[item.severity] || 'info'} label={item.type?.replace(/_/g, ' ') || 'system'} />
                  <time dateTime={item.createdAt}>{formatNotificationTime(item.createdAt)}</time>
                </div>
                <h3>{item.title}</h3>
                {item.message ? <p>{item.message}</p> : null}
                {item.detail ? <p>{item.detail}</p> : null}
                <div className="ffn-notification-item__controls">
                  {!item.read ? (
                    <Button variant="ghost" size="sm" onClick={() => markRead(item.id)}>
                      Mark read
                    </Button>
                  ) : null}
                  {item.route && onOpenRoute ? (
                    <Button variant="secondary" size="sm" onClick={() => onOpenRoute(item.route, item)}>
                      Open
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => removeNotification(item.id)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={Inbox} title={emptyTitle} message={emptyMessage} />
      )}
    </section>
  )
}
