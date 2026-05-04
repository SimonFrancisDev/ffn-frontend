const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

if (!API_BASE) {
  console.error('[API] Missing VITE_API_BASE_URL environment variable')
}

const DEFAULT_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_REQUEST_TIMEOUT_MS) || 15000
const FAST_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_FAST_REQUEST_TIMEOUT_MS) || 8000

const CACHE_TTLS = {
  orbitLevels: Number(import.meta.env.VITE_CACHE_TTL_ORBIT_LEVELS) || 1200,
  orbitLevelSnapshot: Number(import.meta.env.VITE_CACHE_TTL_ORBIT_LEVEL_SNAPSHOT) || 1200,
  orbitPositionDetails: Number(import.meta.env.VITE_CACHE_TTL_ORBIT_POSITION_DETAILS) || 1500,
  orbitCycleSnapshot: Number(import.meta.env.VITE_CACHE_TTL_ORBIT_CYCLE_SNAPSHOT) || 2500,
  addressReceipts: Number(import.meta.env.VITE_CACHE_TTL_ADDRESS_RECEIPTS) || 1500,
  activationReceipts: Number(import.meta.env.VITE_CACHE_TTL_ACTIVATION_RECEIPTS) || 2500,
}

const CACHE_MAX_ENTRIES = 300

const MAX_RETRIES = 1
const RETRY_DELAY_MS = 500

const inflightGetRequests = new Map()
const responseCache = new Map()

function buildUrl(path, query = null) {
  const url = new URL(`${API_BASE}${path}`)

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url.toString()
}

function buildCacheKey(path, query = null) {
  return buildUrl(path, query)
}

function pruneCacheIfNeeded() {
  if (responseCache.size <= CACHE_MAX_ENTRIES) return

  const oldestKey = responseCache.keys().next().value
  if (oldestKey !== undefined) {
    responseCache.delete(oldestKey)
  }
}

function getCachedValue(cacheKey) {
  const hit = responseCache.get(cacheKey)
  if (!hit) return null

  if (Date.now() > hit.expiresAt) {
    responseCache.delete(cacheKey)
    return null
  }

  return hit.value
}

function getStaleValue(cacheKey) {
  const hit = responseCache.get(cacheKey)
  if (!hit) return null
  return hit.value
}

function setCachedValue(cacheKey, value, ttlMs) {
  if (!ttlMs || ttlMs <= 0) return

  responseCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlMs,
  })

  pruneCacheIfNeeded()
}

function clearExpiredCacheEntries() {
  const now = Date.now()

  for (const [key, entry] of responseCache.entries()) {
    if (!entry || now > entry.expiresAt) {
      responseCache.delete(key)
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function handleResponse(response) {
  const text = await response.text().catch(() => '')

  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('Invalid server response')
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    )
  }

  if (!data?.ok) {
    throw new Error(data?.message || 'Request failed')
  }

  return data.data
}

async function rawGet(path, query = null, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, retryCount = 0) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(buildUrl(path, query), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    return await handleResponse(response)
  } catch (error) {
    if (error?.name === 'AbortError') {
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS)
        return rawGet(path, query, timeoutMs, retryCount + 1)
      }
      throw new Error('Request timed out')
    }

    if (error instanceof TypeError) {
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS)
        return rawGet(path, query, timeoutMs, retryCount + 1)
      }
      throw new Error('Network request failed')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

async function apiGet(path, query = null, options = {}) {
  const {
    ttlMs = 0,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    forceRefresh = false,
  } = options

  clearExpiredCacheEntries()

  const cacheKey = buildCacheKey(path, query)
  const inflightKey = forceRefresh ? `${cacheKey}::force` : cacheKey

  if (!forceRefresh) {
    const cached = getCachedValue(cacheKey)
    if (cached) {
      return cached
    }

    if (inflightGetRequests.has(cacheKey)) {
      return inflightGetRequests.get(cacheKey)
    }
  }

  const promise = (async () => {
    try {
      const data = await rawGet(path, query, timeoutMs)
      setCachedValue(cacheKey, data, ttlMs)
      return data
    } catch (error) {
      if (!forceRefresh) {
        const stale = getStaleValue(cacheKey)
        if (stale) {
          return stale
        }
      }
      throw error
    } finally {
      inflightGetRequests.delete(inflightKey)
      if (!forceRefresh) {
        inflightGetRequests.delete(cacheKey)
      }
    }
  })()

  inflightGetRequests.set(inflightKey, promise)

  if (!forceRefresh) {
    inflightGetRequests.set(cacheKey, promise)
  }

  return promise
}

export function clearOrbitsApiCache() {
  responseCache.clear()
  inflightGetRequests.clear()
}

export function clearAddressScopedOrbitsApiCache(address) {
  if (!address) return

  const raw = String(address).toLowerCase()
  const encoded = encodeURIComponent(String(address)).toLowerCase()

  for (const key of responseCache.keys()) {
    const lowerKey = key.toLowerCase()
    if (lowerKey.includes(raw) || lowerKey.includes(encoded)) {
      responseCache.delete(key)
    }
  }

  for (const key of inflightGetRequests.keys()) {
    const lowerKey = key.toLowerCase()
    if (lowerKey.includes(raw) || lowerKey.includes(encoded)) {
      inflightGetRequests.delete(key)
    }
  }
}

export async function fetchOrbitLevelsApi(address, options = {}) {
  return apiGet(
    `/api/orbits/${encodeURIComponent(address)}/levels`,
    null,
    {
      ttlMs: CACHE_TTLS.orbitLevels,
      timeoutMs: FAST_REQUEST_TIMEOUT_MS,
      forceRefresh: !!options.forceRefresh,
    }
  )
}

export async function fetchOrbitLevelSnapshotApi(address, level, options = {}) {
  return apiGet(
    `/api/orbits/${encodeURIComponent(address)}/level/${encodeURIComponent(level)}`,
    null,
    {
      ttlMs: CACHE_TTLS.orbitLevelSnapshot,
      timeoutMs: FAST_REQUEST_TIMEOUT_MS,
      forceRefresh: !!options.forceRefresh,
    }
  )
}

export async function fetchOrbitPositionDetailsApi(
  address,
  level,
  position,
  options = {}
) {
  return apiGet(
    `/api/orbits/${encodeURIComponent(address)}/level/${encodeURIComponent(level)}/position/${encodeURIComponent(position)}`,
    null,
    {
      ttlMs: CACHE_TTLS.orbitPositionDetails,
      timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
      forceRefresh: !!options.forceRefresh,
    }
  )
}

export async function fetchOrbitCycleSnapshotApi(
  address,
  level,
  cycleNumber,
  options = {}
) {
  return apiGet(
    `/api/orbits/${encodeURIComponent(address)}/level/${encodeURIComponent(level)}/cycle/${encodeURIComponent(cycleNumber)}`,
    null,
    {
      ttlMs: CACHE_TTLS.orbitCycleSnapshot,
      timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
      forceRefresh: !!options.forceRefresh,
    }
  )
}

export async function fetchAddressReceiptsApi(address, level, options = {}) {
  return apiGet(
    `/api/receipts/address/${encodeURIComponent(address)}`,
    { level },
    {
      ttlMs: CACHE_TTLS.addressReceipts,
      timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
      forceRefresh: !!options.forceRefresh,
    }
  )
}

export async function fetchActivationReceiptsApi(activationId, options = {}) {
  return apiGet(
    `/api/receipts/activation/${encodeURIComponent(activationId)}`,
    null,
    {
      ttlMs: CACHE_TTLS.activationReceipts,
      timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
      forceRefresh: !!options.forceRefresh,
    }
  )
}



export async function fetchUserSummaryApi(address, options = {}) {
  return apiGet(
    `/api/orbits/${encodeURIComponent(address)}/summary`,
    null,
    {
      ttlMs: 15000,
      forceRefresh: !!options.forceRefresh,
    }
  );
}