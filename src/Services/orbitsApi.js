const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://fin-freedom-backend-3.onrender.com'

async function handleResponse(response) {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed')
  }

  if (!data?.ok) {
    throw new Error(data?.message || 'Request failed')
  }

  return data.data
}

export async function fetchOrbitLevelsApi(address) {
  const response = await fetch(
    `${API_BASE}/api/orbits/${address}/levels`
  )
  return handleResponse(response)
}

export async function fetchOrbitLevelSnapshotApi(address, level) {
  const response = await fetch(
    `${API_BASE}/api/orbits/${address}/level/${level}`
  )
  return handleResponse(response)
}

export async function fetchOrbitPositionDetailsApi(address, level, position) {
  const response = await fetch(
    `${API_BASE}/api/orbits/${address}/level/${level}/position/${position}`
  )
  return handleResponse(response)
}

export async function fetchOrbitCycleSnapshotApi(address, level, cycleNumber) {
  const response = await fetch(
    `${API_BASE}/api/orbits/${address}/level/${level}/cycle/${cycleNumber}`
  )
  return handleResponse(response)
}

export async function fetchAddressReceiptsApi(address, level) {
  const url = level
    ? `${API_BASE}/api/receipts/address/${address}?level=${level}`
    : `${API_BASE}/api/receipts/address/${address}`

  const response = await fetch(url)
  return handleResponse(response)
}

export async function fetchActivationReceiptsApi(activationId) {
  const response = await fetch(
    `${API_BASE}/api/receipts/activation/${activationId}`
  )
  return handleResponse(response)
}