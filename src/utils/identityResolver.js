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

function extractReferralId(value) {
  try {
    const parsed = new URL(value)
    const pathMatch = parsed.pathname.match(/\/ref\/([^/?#]+)/i)
    const queryValue = parsed.searchParams.get('ref')
      || parsed.searchParams.get('referral')
      || parsed.searchParams.get('code')
    return decodeURIComponent(pathMatch?.[1] || queryValue || '').trim()
  } catch {
    return ''
  }
}

export function classifyIdentity(value = '') {
  const normalized = normalizeIdentityInput(value)
  if (!normalized) return { type: IDENTITY_TYPES.EMPTY, value: '' }

  const referralFromUrl = extractReferralId(normalized)
  if (referralFromUrl && /^[a-z0-9][a-z0-9_-]{2,40}$/i.test(referralFromUrl)) {
    return {
      type: IDENTITY_TYPES.REFERRAL_ID,
      value: referralFromUrl,
      originalInput: normalized,
    }
  }

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
        ? 'Enter a wallet address, FFN ID, or referral link.'
        : 'Enter a valid wallet address, FFN ID, or referral link.',
    }
  }

  let response
  try {
    response = await fetch(getApiUrl(`/api/referral/resolve/${encodeURIComponent(classified.value)}`), {
      signal: options.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return {
      ok: false,
      type: IDENTITY_TYPES.REFERRAL_ID,
      input: classified.value,
      message: 'Member lookup is temporarily unavailable. Please retry.',
      source: 'backend',
    }
  }
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
