const NOTICE_PRIORITY = {
  danger: 400,
  warning: 300,
  success: 200,
  info: 100,
}

const DEFAULT_AUTO_HIDE = {
  danger: null,
  warning: 10000,
  success: 5000,
  info: 5000,
}

export const createNotice = (notice = {}) => {
  const type = notice.type || 'info'
  const now = Date.now()

  return {
    id: notice.id || `notice-${now}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label: notice.label || '',
    message: notice.message || '',
    source: notice.source || 'system',
    priority:
      typeof notice.priority === 'number'
        ? notice.priority
        : (NOTICE_PRIORITY[type] || NOTICE_PRIORITY.info),
    dismissible: notice.dismissible !== false,
    sticky: !!notice.sticky || type === 'danger',
    autoHideMs:
      notice.autoHideMs === 0
        ? 0
        : notice.autoHideMs ?? DEFAULT_AUTO_HIDE[type],
    createdAt: notice.createdAt || now,
    expiresAt: notice.expiresAt || null,
    actionLabel: notice.actionLabel || '',
    onAction: notice.onAction || null,
    dedupeKey: notice.dedupeKey || `${notice.source || 'system'}:${type}:${notice.message || ''}`,
    dismissed: !!notice.dismissed,
  }
}

export const normalizeNotices = (notices = []) => {
  return notices
    .map(createNotice)
    .filter((notice) => !notice.dismissed)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return b.createdAt - a.createdAt
    })
}

export const getActiveNotice = (notices = []) => {
  if (!notices.length) return null
  return normalizeNotices(notices)[0] || null
}

export const dismissNoticeById = (notices = [], id) => {
  return notices.filter((notice) => notice.id !== id)
}

export const dedupeNotices = (notices = []) => {
  const seen = new Map()

  for (const rawNotice of notices) {
    const notice = createNotice(rawNotice)
    const existing = seen.get(notice.dedupeKey)

    if (!existing) {
      seen.set(notice.dedupeKey, notice)
      continue
    }

    const shouldReplace =
      notice.priority > existing.priority ||
      notice.createdAt > existing.createdAt

    if (shouldReplace) {
      seen.set(notice.dedupeKey, notice)
    }
  }

  return normalizeNotices(Array.from(seen.values()))
}

export const getRotatingNotices = (notices = []) => {
  return dedupeNotices(notices).filter((notice) => !notice.sticky)
}

export const getStickyNotices = (notices = []) => {
  return dedupeNotices(notices).filter((notice) => notice.sticky)
}