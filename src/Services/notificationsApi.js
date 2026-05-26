import { buildApiUrl, getApiUrl } from './apiConfig'
import { web3Service } from './web3'
import { getAddress } from 'ethers'

const NOTIFICATION_PROOF_ACTION = 'notification_manage'
const PROOF_CACHE_TTL_MS = Number(import.meta.env.VITE_WALLET_PROOF_CACHE_TTL_MS || 8 * 60 * 1000)
const proofCache = new Map()

function buildWalletProofMessage(action, walletAddress, timestamp) {
  return [
    'Fin Freedom Network',
    `Action: ${action}`,
    `Wallet: ${walletAddress}`,
    `Timestamp: ${timestamp}`,
  ].join('\n')
}

async function notificationWalletProof(wallet) {
  const normalizedWallet = getAddress(String(wallet || '').trim())
  if (!normalizedWallet) throw new Error('Wallet address is required')

  const cacheKey = `${normalizedWallet.toLowerCase()}:${NOTIFICATION_PROOF_ACTION}`
  const cached = proofCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < PROOF_CACHE_TTL_MS) {
    return cached
  }

  const provider = web3Service.getEip1193Provider() || window.ethereum
  if (!provider?.request) {
    throw new Error('Connect your wallet to authorize notification changes.')
  }

  const timestamp = Date.now()
  const message = buildWalletProofMessage(NOTIFICATION_PROOF_ACTION, normalizedWallet, timestamp)
  const signature = await provider.request({
    method: 'personal_sign',
    params: [message, normalizedWallet],
  })

  const proof = { signature, timestamp }
  proofCache.set(cacheKey, proof)
  return proof
}

async function mutationBody(wallet, extra = {}) {
  return JSON.stringify({
    wallet,
    ...(await notificationWalletProof(wallet)),
    ...extra,
  })
}

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
    body: await mutationBody(wallet),
  }))
}

export async function markAllNotificationsRead(wallet) {
  return parseResponse(await fetch(getApiUrl('/api/notifications/read-all'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: await mutationBody(wallet),
  }))
}

export async function clearNotification(id, wallet) {
  return parseResponse(await fetch(getApiUrl(`/api/notifications/${id}/clear`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: await mutationBody(wallet),
  }))
}

export async function clearReadNotifications(wallet) {
  return parseResponse(await fetch(getApiUrl('/api/notifications/clear-read'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: await mutationBody(wallet),
  }))
}

export async function clearAllNotifications(wallet) {
  return parseResponse(await fetch(getApiUrl('/api/notifications/clear-all'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: await mutationBody(wallet),
  }))
}

export async function fetchNotificationPreferences(wallet) {
  return parseResponse(await fetch(buildApiUrl('/api/notifications/preferences', { wallet })))
}

export async function updateNotificationPreferences(wallet, preferences) {
  return parseResponse(await fetch(getApiUrl('/api/notifications/preferences'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: await mutationBody(wallet, preferences),
  }))
}
