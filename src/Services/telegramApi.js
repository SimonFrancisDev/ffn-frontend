import { buildApiUrl, getApiUrl } from './apiConfig'

async function parseResponse(response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || `Telegram request failed: ${response.status}`)
  }
  return payload
}

export async function fetchTelegramStatus(wallet) {
  return parseResponse(await fetch(buildApiUrl('/api/telegram/status', { wallet })))
}

export async function startTelegramLink({ walletAddress, language }) {
  return parseResponse(await fetch(getApiUrl('/api/telegram/link/start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, language }),
  }))
}

export async function verifyTelegramLink(payload) {
  return parseResponse(await fetch(getApiUrl('/api/telegram/link/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }))
}

export async function updateTelegramPreferences(wallet, preferences) {
  return parseResponse(await fetch(getApiUrl('/api/telegram/preferences'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, preferences }),
  }))
}

export async function unsubscribeTelegram(wallet) {
  return parseResponse(await fetch(getApiUrl('/api/telegram/unsubscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet }),
  }))
}
