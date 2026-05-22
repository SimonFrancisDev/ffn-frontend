import { buildApiUrl, getApiUrl } from './apiConfig'

async function parseResponse(response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || `Notification request failed: ${response.status}`)
  }
  return payload
}

export async function fetchNotifications({ wallet, status, type, severity, cursor, limit = 50 } = {}) {
  const url = buildApiUrl('/api/notifications', { wallet, status, type, severity, cursor, limit })
  return parseResponse(await fetch(url))
}

export async function markNotificationRead(id, wallet) {
  return parseResponse(await fetch(getApiUrl(`/api/notifications/${id}/read`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet }),
  }))
}

export async function markAllNotificationsRead(wallet) {
  return parseResponse(await fetch(getApiUrl('/api/notifications/read-all'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet }),
  }))
}

export async function clearNotification(id, wallet) {
  return parseResponse(await fetch(getApiUrl(`/api/notifications/${id}/clear`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet }),
  }))
}

export async function clearReadNotifications(wallet) {
  return parseResponse(await fetch(getApiUrl('/api/notifications/clear-read'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet }),
  }))
}

export async function clearAllNotifications(wallet) {
  return parseResponse(await fetch(getApiUrl('/api/notifications/clear-all'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet }),
  }))
}

export async function fetchNotificationPreferences(wallet) {
  return parseResponse(await fetch(buildApiUrl('/api/notifications/preferences', { wallet })))
}

export async function updateNotificationPreferences(wallet, preferences) {
  return parseResponse(await fetch(getApiUrl('/api/notifications/preferences'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, ...preferences }),
  }))
}
