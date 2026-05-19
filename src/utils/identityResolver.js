import { ethers } from 'ethers'
import { getApiUrl } from '../Services/apiConfig'

export const IDENTITY_TYPES = {
  WALLET: 'wallet',
  REFERRAL_ID: 'referralId',
  EMPTY: 'empty',
  INVALID: 'invalid',
}

export function normalizeIdentityInput(value = '') {
  return String(value || '').trim()
}

export function classifyIdentity(value = '') {
  const normalized = normalizeIdentityInput(value)
  if (!normalized) return { type: IDENTITY_TYPES.EMPTY, value: '' }

  if (ethers.isAddress(normalized)) {
    return {
      type: IDENTITY_TYPES.WALLET,
      value: ethers.getAddress(normalized),
    }
  }

  if (/^[a-z0-9][a-z0-9_-]{2,40}$/i.test(normalized)) {
    return {
      type: IDENTITY_TYPES.REFERRAL_ID,
      value: normalized,
    }
  }

  return {
    type: IDENTITY_TYPES.INVALID,
    value: normalized,
  }
}

export async function resolveIdentity(value, options = {}) {
  const classified = classifyIdentity(value)

  if (classified.type === IDENTITY_TYPES.WALLET) {
    return {
      ok: true,
      type: IDENTITY_TYPES.WALLET,
      walletAddress: classified.value,
      input: classified.value,
      source: 'local',
    }
  }

  if (classified.type !== IDENTITY_TYPES.REFERRAL_ID) {
    return {
      ok: false,
      type: classified.type,
      input: classified.value,
      message: classified.type === IDENTITY_TYPES.EMPTY
        ? 'Enter a wallet address or Referral ID.'
        : 'Enter a valid wallet address or Referral ID.',
    }
  }

  const response = await fetch(getApiUrl(`/api/referral/resolve/${encodeURIComponent(classified.value)}`), {
    signal: options.signal,
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok || payload?.success === false || !payload?.walletAddress) {
    return {
      ok: false,
      type: IDENTITY_TYPES.REFERRAL_ID,
      input: classified.value,
      message: payload?.message || 'Referral ID not found.',
      source: 'backend',
    }
  }

  return {
    ok: true,
    type: IDENTITY_TYPES.REFERRAL_ID,
    input: classified.value,
    walletAddress: ethers.getAddress(payload.walletAddress),
    referralId: payload.shortCode || payload.referralId || classified.value,
    source: 'backend',
    raw: payload,
  }
}

export function buildIdentityRouteState(identity, extra = {}) {
  return {
    ffnInternalNavigation: true,
    identityType: identity?.type || IDENTITY_TYPES.WALLET,
    address: identity?.walletAddress || identity?.value || '',
    displayId: identity?.referralId || identity?.input || '',
    openedAt: Date.now(),
    ...extra,
  }
}
