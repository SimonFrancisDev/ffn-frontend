import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const SpaceContext = createContext(null)

export const SpaceProvider = ({ walletAddress, children }) => {
  const [mode, setMode] = useState('self')
  const [viewedAddress, setViewedAddress] = useState(walletAddress || null)
  const [isLocked, setIsLocked] = useState(false)

  const connectedAddress = walletAddress || null

  const switchToSelf = useCallback(() => {
    setMode('self')
    setViewedAddress(walletAddress || null)
    setIsLocked(false)
  }, [walletAddress])

  const switchToVisitor = useCallback((address) => {
    if (!address) return
    setMode('visitor')
    setViewedAddress(address)
  }, [])

  useEffect(() => {
    if (mode === 'self') {
      setViewedAddress(walletAddress || null)
    }
  }, [walletAddress, mode])

  const value = useMemo(() => {
    const isOwnSpace = mode === 'self'
    const subjectAddress = isOwnSpace ? connectedAddress : viewedAddress
    const canView = !isLocked || isOwnSpace
    const canTransact = isOwnSpace && !!connectedAddress

    return {
      mode,
      connectedAddress,
      viewedAddress,
      subjectAddress,
      isOwnSpace,
      isLocked,
      canView,
      canTransact,
      switchToSelf,
      switchToVisitor,
      setIsLocked,
    }
  }, [
    mode,
    connectedAddress,
    viewedAddress,
    isLocked,
    switchToSelf,
    switchToVisitor,
  ])

  return (
    <SpaceContext.Provider value={value}>
      {children}
    </SpaceContext.Provider>
  )
}

export const useSpace = () => {
  const ctx = useContext(SpaceContext)
  if (!ctx) throw new Error('useSpace must be used inside SpaceProvider')
  return ctx
}