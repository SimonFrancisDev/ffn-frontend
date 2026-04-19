const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'https://fin-freedom-backend-3.onrender.com'

const REQUEST_TIMEOUT_MS = 15000

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

async function parseErrorResponse(response) {
  const text = await response.text().catch(() => '')
  if (!text) {
    return `Request failed with status ${response.status}`
  }

  try {
    const data = JSON.parse(text)
    return (
      data?.message ||
      data?.error ||
      data?.details ||
      `Request failed with status ${response.status}`
    )
  } catch {
    return text || `Request failed with status ${response.status}`
  }
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

async function apiGet(path, query = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(buildUrl(path, query), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    return await handleResponse(response)
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out')
    }

    if (error instanceof TypeError) {
      throw new Error('Network request failed')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchOrbitLevelsApi(address) {
  return apiGet(`/api/orbits/${encodeURIComponent(address)}/levels`)
}

export async function fetchOrbitLevelSnapshotApi(address, level) {
  return apiGet(
    `/api/orbits/${encodeURIComponent(address)}/level/${encodeURIComponent(level)}`
  )
}

export async function fetchOrbitPositionDetailsApi(address, level, position) {
  return apiGet(
    `/api/orbits/${encodeURIComponent(address)}/level/${encodeURIComponent(level)}/position/${encodeURIComponent(position)}`
  )
}

export async function fetchOrbitCycleSnapshotApi(address, level, cycleNumber) {
  return apiGet(
    `/api/orbits/${encodeURIComponent(address)}/level/${encodeURIComponent(level)}/cycle/${encodeURIComponent(cycleNumber)}`
  )
}

export async function fetchAddressReceiptsApi(address, level) {
  return apiGet(`/api/receipts/address/${encodeURIComponent(address)}`, {
    level,
  })
}

export async function fetchActivationReceiptsApi(activationId) {
  return apiGet(
    `/api/receipts/activation/${encodeURIComponent(activationId)}`
  )
}










// ============================
// FIRST VERSION
//============================
// const API_BASE =
//   import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://fin-freedom-backend-3.onrender.com'

// async function handleResponse(response) {
//   const data = await response.json().catch(() => null)

//   if (!response.ok) {
//     throw new Error(data?.message || 'Request failed')
//   }

//   if (!data?.ok) {
//     throw new Error(data?.message || 'Request failed')
//   }

//   return data.data
// }

// export async function fetchOrbitLevelsApi(address) {
//   const response = await fetch(
//     `${API_BASE}/api/orbits/${address}/levels`
//   )
//   return handleResponse(response)
// }

// export async function fetchOrbitLevelSnapshotApi(address, level) {
//   const response = await fetch(
//     `${API_BASE}/api/orbits/${address}/level/${level}`
//   )
//   return handleResponse(response)
// }

// export async function fetchOrbitPositionDetailsApi(address, level, position) {
//   const response = await fetch(
//     `${API_BASE}/api/orbits/${address}/level/${level}/position/${position}`
//   )
//   return handleResponse(response)
// }

// export async function fetchOrbitCycleSnapshotApi(address, level, cycleNumber) {
//   const response = await fetch(
//     `${API_BASE}/api/orbits/${address}/level/${level}/cycle/${cycleNumber}`
//   )
//   return handleResponse(response)
// }

// export async function fetchAddressReceiptsApi(address, level) {
//   const url = level
//     ? `${API_BASE}/api/receipts/address/${address}?level=${level}`
//     : `${API_BASE}/api/receipts/address/${address}`

//   const response = await fetch(url)
//   return handleResponse(response)
// }

// export async function fetchActivationReceiptsApi(activationId) {
//   const response = await fetch(
//     `${API_BASE}/api/receipts/activation/${activationId}`
//   )
//   return handleResponse(response)
// }