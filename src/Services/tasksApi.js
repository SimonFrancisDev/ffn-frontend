import { getApiUrl } from './apiConfig'
import { earlyAccessHeaders } from './earlyAccess'
import { getProfileSessionAuth } from './profilePrivacyApi'

async function request(path, account, options = {}) {
  const auth = await getProfileSessionAuth(account, { interactive: options.interactive !== false })
  const response = await fetch(getApiUrl(`/api/tasks${path}`), {
    ...options,
    headers: { ...(options.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }), ...earlyAccessHeaders(), ...auth, ...(options.headers || {}) },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || `Tasks request failed: ${response.status}`)
  return payload?.data
}
export const fetchTasks = (account, options) => request('/', account, options)
export const joinTask = (account, id) => request(`/${id}/join`, account, { method: 'POST' })
export const submitTask = (account, id, body) => request(`/${id}/submissions`, account, { method: 'POST', body: JSON.stringify(body) })
export const fetchTaskComments = (account, id, options) => request(`/${id}/comments`, account, options)
export const addTaskComment = (account, id, body) => request(`/${id}/comments`, account, { method: 'POST', body: JSON.stringify(body) })
export const reactToTaskItem = (account, id, body) => request(`/${id}/reactions`, account, { method: 'POST', body: JSON.stringify(body) })
export const fetchTaskRewards = (account, options) => request('/rewards', account, options)
export async function uploadTaskProof(account, file) {
  const auth = await getProfileSessionAuth(account)
  const response = await fetch(getApiUrl('/api/tasks/media'), { method: 'POST', headers: { ...earlyAccessHeaders(), ...auth, 'Content-Type': file.type, 'X-File-Name': file.name }, body: file })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || `Proof upload failed: ${response.status}`)
  return payload?.data
}
export async function subscribeTaskEvents(account, onEvent, signal) {
  const auth = await getProfileSessionAuth(account, { interactive: false })
  if (!auth.Authorization) return
  const response = await fetch(getApiUrl('/api/tasks/events'), { headers: { ...earlyAccessHeaders(), ...auth }, signal })
  if (!response.ok || !response.body) return
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = ''
  while (!signal.aborted) {
    const { value, done } = await reader.read(); if (done) break
    pending += decoder.decode(value, { stream: true })
    const chunks = pending.split('\n\n'); pending = chunks.pop() || ''
    for (const chunk of chunks) if (chunk.includes('data:')) onEvent()
  }
}
