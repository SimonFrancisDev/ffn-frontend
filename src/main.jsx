import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'
import { WalletProvider } from './hooks/useWallet'
import './styles/variables.css'
import './styles/globals.css'
import './styles/foundation.css'
import './App.css'
import './i18n'

const STAGING_ACCESS_STORAGE_KEY = 'finfreedom_staging_access_v1'
const STAGING_ACCESS_HASH = String(import.meta.env.VITE_STAGING_ACCESS_KEY_SHA256 || '').trim().toLowerCase()
const STAGING_ACCESS_REQUIRED =
  String(import.meta.env.VITE_APP_ENV || '').toLowerCase() === 'staging' &&
  String(import.meta.env.VITE_STAGING_ACCESS_REQUIRED || 'true').toLowerCase() !== 'false'

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function StagingAccessGate({ children }) {
  const [accessGranted, setAccessGranted] = React.useState(() => {
    if (!STAGING_ACCESS_REQUIRED) return true
    if (!STAGING_ACCESS_HASH) return false
    return window.sessionStorage.getItem(STAGING_ACCESS_STORAGE_KEY) === STAGING_ACCESS_HASH
  })
  const [accessKey, setAccessKey] = React.useState('')
  const [error, setError] = React.useState('')
  const [isChecking, setIsChecking] = React.useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!STAGING_ACCESS_HASH) {
      setError('Staging access is not configured yet.')
      return
    }

    const candidate = accessKey.trim()
    if (!candidate) {
      setError('Enter the staging access key.')
      return
    }

    setIsChecking(true)
    try {
      const candidateHash = await sha256Hex(candidate)
      if (candidateHash !== STAGING_ACCESS_HASH) {
        setError('Invalid staging access key.')
        return
      }

      window.sessionStorage.setItem(STAGING_ACCESS_STORAGE_KEY, candidateHash)
      setAccessGranted(true)
    } catch {
      setError('This browser cannot verify the staging access key.')
    } finally {
      setIsChecking(false)
    }
  }

  if (accessGranted) return children

  return (
    <main className="staging-access">
      <form className="staging-access__panel" onSubmit={handleSubmit}>
        <div className="staging-access__badge">Staging</div>
        <h1 className="staging-access__title">Fin Freedom Test Access</h1>
        <p className="staging-access__text">
          Enter the private staging key to continue.
        </p>
        <label className="staging-access__label" htmlFor="staging-access-key">
          Access key
        </label>
        <input
          id="staging-access-key"
          className="staging-access__input"
          type="password"
          value={accessKey}
          onChange={(event) => setAccessKey(event.target.value)}
          autoComplete="off"
          autoFocus
        />
        {error ? <p className="staging-access__error">{error}</p> : null}
        <button className="staging-access__button" type="submit" disabled={isChecking}>
          {isChecking ? 'Checking...' : 'Enter Staging'}
        </button>
      </form>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StagingAccessGate>
      <BrowserRouter>
        <WalletProvider>
          <App />
        </WalletProvider>
      </BrowserRouter>
    </StagingAccessGate>
  </React.StrictMode>
)
