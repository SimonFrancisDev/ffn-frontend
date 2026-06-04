import { getAddress } from 'ethers'
import { getApiUrl } from './apiConfig'
import { web3Service } from './web3'

export const PROFILE_PRIVACY_UPDATE_ACTION = 'profile_privacy_update'
export const PROFILE_PRIVACY_SESSION_ACTION = 'profile_privacy_session'

const PROOF_CACHE_TTL_MS = Number(import.meta.env.VITE_WALLET_PROOF_CACHE_TTL_MS || 8 * 60 * 1000)
const SESSION_STORAGE_PREFIX = 'ffn_profile_session_v1:'
const proofCache = new Map()
const proofInflight = new Map()
const sessionInflight = new Map()

export class ProfileReadAuthError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'ProfileReadAuthError'
    this.code = 'PROFILE_READ_AUTH_REQUIRED'
    this.ownerAccess = true
    this.cause = options.cause
  }
}

export function isProfileReadAuthError(error) {
  return error?.code === 'PROFILE_READ_AUTH_REQUIRED' || error instanceof ProfileReadAuthError
}

function buildWalletProofMessage(action, walletAddress, timestamp) {
  return [
    'Fin Freedom Network',
    `Action: ${action}`,
    `Wallet: ${getAddress(walletAddress)}`,
    `Timestamp: ${timestamp}`,
  ].join('\n')
}

export function getCachedProfileWalletProof(walletAddress, action) {
  const normalizedWallet = getAddress(String(walletAddress || '').trim())
  const cacheKey = `${normalizedWallet.toLowerCase()}:${action}`
  const cached = proofCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < PROOF_CACHE_TTL_MS) {
    return cached
  }

  return null
}

export async function getProfileWalletProof(walletAddress, action, options = {}) {
  const { interactive = true, forceFresh = false } = options
  const normalizedWallet = getAddress(String(walletAddress || '').trim())
  const cacheKey = `${normalizedWallet.toLowerCase()}:${action}`
  const cached = forceFresh ? null : getCachedProfileWalletProof(normalizedWallet, action)

  if (cached) return cached
  if (!interactive) return null

  if (proofInflight.has(cacheKey)) {
    return proofInflight.get(cacheKey)
  }

  const provider = web3Service.getEip1193Provider() || window.ethereum
  if (!provider?.request) {
    throw new Error('Connect your wallet to authorize this profile action.')
  }

  const proofPromise = (async () => {
    const timestamp = Date.now()
    const message = buildWalletProofMessage(action, normalizedWallet, timestamp)
    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, normalizedWallet],
    })

    const proof = { signature, timestamp, proofWallet: normalizedWallet }
    proofCache.set(cacheKey, proof)
    return proof
  })()

  proofInflight.set(cacheKey, proofPromise)

  try {
    return await proofPromise
  } finally {
    proofInflight.delete(cacheKey)
  }
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || `Profile privacy request failed: ${response.status}`)
  }
  return payload
}

export async function fetchProfilePrivacy(address) {
  const payload = await parseResponse(await fetch(getApiUrl(`/api/profile-privacy/${encodeURIComponent(address)}`), { cache: 'no-store' }))
  return payload?.data || {}
}

export async function updateProfilePrivacy(address, isLocked) {
  const routeBeforeSign =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : ''

  if (typeof window !== 'undefined' && routeBeforeSign) {
    window.sessionStorage.setItem('ffn_profile_privacy_return_route', routeBeforeSign)
  }

  try {
    const proof = await getProfileWalletProof(address, PROFILE_PRIVACY_UPDATE_ACTION, { interactive: true, forceFresh: true })
    const payload = await parseResponse(await fetch(getApiUrl(`/api/profile-privacy/${encodeURIComponent(address)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        isLocked,
        walletAddress: address,
        signature: proof.signature,
        timestamp: proof.timestamp,
      }),
    }))
    return payload?.data || {}
  } finally {
    if (typeof window !== 'undefined') {
      const returnRoute = window.sessionStorage.getItem('ffn_profile_privacy_return_route')
      if (returnRoute && `${window.location.pathname}${window.location.search}${window.location.hash}` !== returnRoute) {
        window.history.replaceState(window.history.state, '', returnRoute)
      }
      window.sessionStorage.removeItem('ffn_profile_privacy_return_route')
    }
  }
}

function getSessionStorageKey(walletAddress) {
  return `${SESSION_STORAGE_PREFIX}${getAddress(walletAddress).toLowerCase()}`
}

function readStoredSession(walletAddress) {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(getSessionStorageKey(walletAddress))
    if (!raw) return null

    const session = JSON.parse(raw)
    if (!session?.token || !Number.isFinite(Number(session.expiresAt))) return null
    if (Date.now() > Number(session.expiresAt) - 15000) return null

    return session
  } catch {
    return null
  }
}

function storeSession(walletAddress, session) {
  if (typeof window === 'undefined' || !session?.token) return

  try {
    window.sessionStorage.setItem(getSessionStorageKey(walletAddress), JSON.stringify(session))
  } catch {
    // Session storage is an optimization; the wallet can authorize again if unavailable.
  }
}

export async function createProfileSession(address) {
  const normalizedWallet = getAddress(String(address || '').trim())
  const cached = readStoredSession(normalizedWallet)
  if (cached) return cached

  const cacheKey = normalizedWallet.toLowerCase()
  if (sessionInflight.has(cacheKey)) return sessionInflight.get(cacheKey)

  const promise = (async () => {
    const proof = await getProfileWalletProof(normalizedWallet, PROFILE_PRIVACY_SESSION_ACTION, { interactive: true })
    const payload = await parseResponse(await fetch(getApiUrl('/api/profile-privacy/session'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: normalizedWallet,
        signature: proof.signature,
        timestamp: proof.timestamp,
      }),
    }))
    const session = payload?.data || {}
    storeSession(normalizedWallet, session)
    return session
  })()

  sessionInflight.set(cacheKey, promise)

  try {
    return await promise
  } finally {
    sessionInflight.delete(cacheKey)
  }
}

export async function getProfileSessionAuth(address, options = {}) {
  const { interactive = true } = options
  const normalizedWallet = getAddress(String(address || '').trim())
  const cached = readStoredSession(normalizedWallet)
  if (cached?.token) {
    return { Authorization: `Bearer ${cached.token}` }
  }
  if (!interactive) return {}

  const session = await createProfileSession(normalizedWallet)
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {}
}

export async function getProfileReadAuthIfLocked(targetAddress, connectedAddress, options = {}) {
  const { requiredForOwner = false } = options
  if (!targetAddress || !connectedAddress) return {}

  const target = getAddress(String(targetAddress || '').trim())
  const connected = getAddress(String(connectedAddress || '').trim())
  if (target.toLowerCase() !== connected.toLowerCase()) return {}

  const selfViewHeaders = { 'X-Profile-Viewer-Address': connected }

  let privacy
  try {
    privacy = await fetchProfilePrivacy(target)
  } catch (error) {
    if (requiredForOwner) {
      throw new ProfileReadAuthError('Profile privacy status could not be verified for your wallet.', { cause: error })
    }
    return {}
  }

  if (!privacy?.isLocked) return selfViewHeaders

  return selfViewHeaders
}
