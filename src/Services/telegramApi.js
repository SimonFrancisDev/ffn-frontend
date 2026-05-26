import { buildApiUrl, getApiUrl } from './apiConfig'
import { ethers } from 'ethers'

async function parseResponse(response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || `Telegram request failed: ${response.status}`)
  }
  return payload
}

const TELEGRAM_ACTIONS = {
  linkStart: 'telegram_link_start',
  preferencesUpdate: 'telegram_preferences_update',
  unsubscribe: 'telegram_unsubscribe',
}

export function buildTelegramWalletMessage(action, walletAddress, timestamp) {
  const normalizedWallet = ethers.getAddress(walletAddress)
  return [
    'Fin Freedom Network',
    `Action: ${action}`,
    `Wallet: ${normalizedWallet}`,
    `Timestamp: ${timestamp}`,
  ].join('\n')
}

export async function fetchTelegramStatus(wallet) {
  return parseResponse(await fetch(buildApiUrl('/api/telegram/status', { wallet })))
}

export async function startTelegramLink({ walletAddress, language, signature, timestamp }) {
  return parseResponse(await fetch(getApiUrl('/api/telegram/link/start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, language, signature, timestamp }),
  }))
}

export async function verifyTelegramLink(payload) {
  return parseResponse(await fetch(getApiUrl('/api/telegram/link/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }))
}

export async function updateTelegramPreferences(wallet, preferences, proof = {}) {
  return parseResponse(await fetch(getApiUrl('/api/telegram/preferences'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, preferences, ...proof }),
  }))
}

export async function unsubscribeTelegram(wallet, proof = {}) {
  return parseResponse(await fetch(getApiUrl('/api/telegram/unsubscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, ...proof }),
  }))
}

export { TELEGRAM_ACTIONS }
