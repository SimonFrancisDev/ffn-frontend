import { getAddress } from 'ethers'
import { buildApiUrl, getApiUrl } from './apiConfig'
import { web3Service } from './web3'

export const PROFILE_PRIVACY_READ_ACTION = 'profile_privacy_read'
export const PROFILE_PRIVACY_UPDATE_ACTION = 'profile_privacy_update'

const PROOF_CACHE_TTL_MS = Number(import.meta.env.VITE_WALLET_PROOF_CACHE_TTL_MS || 8 * 60 * 1000)
const PROOF_REJECT_COOLDOWN_MS = Number(import.meta.env.VITE_WALLET_PROOF_REJECT_COOLDOWN_MS || 2 * 60 * 1000)
const proofCache = new Map()
const proofInflight = new Map()
const proofRejectedUntil = new Map()

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
  const { interactive = true } = options
  const normalizedWallet = getAddress(String(walletAddress || '').trim())
  const cacheKey = `${normalizedWallet.toLowerCase()}:${action}`
  const cached = getCachedProfileWalletProof(normalizedWallet, action)

  if (cached) return cached
  if (!interactive) return null

  const rejectedUntil = proofRejectedUntil.get(cacheKey) || 0
  if (Date.now() < rejectedUntil) {
    throw new Error('Profile read authorization was declined. Try again shortly.')
  }

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
    proofRejectedUntil.delete(cacheKey)
    return proof
  })()

  proofInflight.set(cacheKey, proofPromise)

  try {
    return await proofPromise
  } catch (error) {
    proofRejectedUntil.set(cacheKey, Date.now() + PROOF_REJECT_COOLDOWN_MS)
    throw error
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
  const payload = await parseResponse(await fetch(getApiUrl(`/api/profile-privacy/${encodeURIComponent(address)}`)))
  return payload?.data || {}
}

export async function updateProfilePrivacy(address, isLocked) {
  const proof = await getProfileWalletProof(address, PROFILE_PRIVACY_UPDATE_ACTION, { interactive: true })
  const payload = await parseResponse(await fetch(getApiUrl(`/api/profile-privacy/${encodeURIComponent(address)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isLocked,
      walletAddress: address,
      signature: proof.signature,
      timestamp: proof.timestamp,
    }),
  }))
  return payload?.data || {}
}

export async function buildProfileReadQuery(address, options = {}) {
  const proof = await getProfileWalletProof(address, PROFILE_PRIVACY_READ_ACTION, options)
  if (!proof) return null
  return {
    proofWallet: proof.proofWallet,
    signature: proof.signature,
    timestamp: proof.timestamp,
  }
}

export async function buildProfileReadQueryIfLocked(address, options = {}) {
  const privacy = await fetchProfilePrivacy(address)
  if (!privacy?.isLocked) return null
  return buildProfileReadQuery(address, options)
}

export function buildProfileReadUrl(path, query = null) {
  return buildApiUrl(path, query)
}
