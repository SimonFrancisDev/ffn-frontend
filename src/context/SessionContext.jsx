import { createContext, useContext, useEffect, useState } from 'react'

const SessionContext = createContext(null)

const SESSION_KEY = 'ffn_session_ack'

export const SessionProvider = ({ children }) => {
  const [isAcknowledged, setIsAcknowledged] = useState(false)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored === 'true') {
        setIsAcknowledged(true)
      }
    } catch (err) {
      console.error('Session read error', err)
    }
  }, [])

  const acknowledge = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true')
    } catch (err) {
      console.error('Session write error', err)
    }
    setIsAcknowledged(true)
  }

  return (
    <SessionContext.Provider
      value={{
        isAcknowledged,
        acknowledge,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}