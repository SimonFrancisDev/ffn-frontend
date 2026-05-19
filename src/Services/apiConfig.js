const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '')

if (!API_BASE_URL) {
  console.error('[API] Missing VITE_API_BASE_URL environment variable')
}

export function getApiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export function buildApiUrl(path = '', query = null) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base =
    API_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  const url = new URL(`${base}${normalizedPath}`)

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url.toString()
}
