import './WalletPanel.css'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { lockBodyScroll } from '../../../utils/bodyScrollLock'

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const WalletPanel = ({
  isOpen = false,
  wallet = null,
  onClose,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
  onOpenWalletSettings,
  anchorRef = null, // NEW: Accept anchor ref for positioning
}) => {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const [desktopPosition, setDesktopPosition] = useState({
    top: 76,
    left: null,
    right: 20,
  })
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  )

  // Body scroll lock - only on mobile
  useEffect(() => {
    if (!isOpen) return undefined
    if (typeof window === 'undefined') return undefined

    // Desktop dropdowns should not lock the page like a modal.
    if (window.innerWidth >= 768) return undefined

    return lockBodyScroll()
  }, [isOpen])

  // Desktop detection effect
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const updateMode = () => {
      setIsDesktop(window.innerWidth >= 768)
    }

    updateMode()

    window.addEventListener('resize', updateMode)

    return () => {
      window.removeEventListener('resize', updateMode)
    }
  }, [])

  // Desktop positioning logic
  const updateDesktopPosition = () => {
    if (typeof window === 'undefined') return
    if (window.innerWidth < 768) return

    const anchorEl = anchorRef?.current
    const dialogEl = dialogRef.current

    if (!dialogEl) return

    const dialogWidth = dialogEl.offsetWidth || 340
    const viewportWidth = window.innerWidth
    const gap = 12
    const minMargin = 12

    if (!anchorEl) {
      setDesktopPosition({
        top: 82,
        left: Math.max(minMargin, viewportWidth - dialogWidth - 20),
        right: 'auto',
      })
      return
    }

    const rect = anchorEl.getBoundingClientRect()

    let left = rect.right - dialogWidth
    left = Math.max(minMargin, left)
    left = Math.min(left, viewportWidth - dialogWidth - minMargin)

    setDesktopPosition({
      top: rect.bottom + gap,
      left,
      right: 'auto',
    })
  }

  // Position update on open/resize/scroll
  useEffect(() => {
    if (!isOpen) return undefined

    const frame = window.requestAnimationFrame(updateDesktopPosition)

    const handleResize = () => updateDesktopPosition()
    const handleScroll = () => updateDesktopPosition()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, anchorRef])

  // Laptop outside-click handler
  useEffect(() => {
    if (!isOpen || !isDesktop) return undefined

    const handlePointerDown = (event) => {
      const dialogEl = dialogRef.current
      const anchorEl = anchorRef?.current

      if (dialogEl?.contains(event.target)) return
      if (anchorEl?.contains(event.target)) return

      onClose?.()
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen, isDesktop, anchorRef, onClose])

  if (!isOpen || !wallet) return null

  const isConnected = !!wallet.isConnected
  const isLoading = !!wallet.isLoading
  const rawAddress = wallet.rawAddress || ''
  const explorerBaseUrl = 'https://amoy.polygonscan.com/address/'
  const canCopy = !!rawAddress
  const canOpenExplorer = !!rawAddress
  const canDisconnect = isConnected && !isLoading
  const canSwitchNetwork = !isLoading
  const canOpenSettings = true

  const handleCopyAddress = async () => {
    if (!rawAddress) return
    try {
      await navigator.clipboard.writeText(rawAddress)
    } catch (error) {
      console.error('Failed to copy wallet address:', error)
    }
  }

  const handleViewOnExplorer = () => {
    if (!rawAddress) return
    window.open(`${explorerBaseUrl}${rawAddress}`, '_blank', 'noopener,noreferrer')
  }

  const handleSwitchNetwork = () => {
    if (onSwitchNetwork) onSwitchNetwork()
  }

  const handleDisconnect = () => {
    if (onDisconnect) onDisconnect()
    if (onClose) onClose()
  }

  const handleConnect = () => {
    if (onConnect) onConnect()
    if (onClose) onClose()
  }

  const handleOpenWalletSettings = () => {
    if (onOpenWalletSettings) onOpenWalletSettings()
    if (onClose) onClose()
  }

  const statusDotClassName = [
    'wallet-panel__status-dot',
    !isConnected ? 'is-disconnected' : '',
    isLoading ? 'is-loading' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ModalPortal>
      <div
        className={`wallet-modal ${
          isDesktop ? 'wallet-modal--desktop' : 'wallet-modal--mobile'
        }`}
        role="presentation"
      >
        {/* Backdrop for click-outside — mobile only */}
        {!isDesktop && (
          <div
            className="wallet-modal__backdrop"
            onClick={onClose}
          />
        )}

        <div
          ref={dialogRef}
          className={`wallet-modal__dialog ${
            isDesktop ? 'wallet-modal__dialog--desktop' : 'wallet-modal__dialog--mobile'
          } glass-panel theme-transition`}
          role="dialog"
          aria-label={t('walletPanel.ariaLabel', 'Wallet panel')}
          onClick={(event) => event.stopPropagation()}
          style={
            isDesktop
              ? {
                  position: 'fixed',
                  top: `${desktopPosition.top}px`,
                  left:
                    typeof desktopPosition.left === 'number'
                      ? `${desktopPosition.left}px`
                      : 'auto',
                  right:
                    typeof desktopPosition.right === 'number'
                      ? `${desktopPosition.right}px`
                      : desktopPosition.right || 'auto',
                  width: '340px',
                  minWidth: '340px',
                  maxWidth: '340px',
                }
              : undefined
          }
        >
          <div className="wallet-panel__header">
            <div className="wallet-panel__title-group">
              <h3 className="wallet-panel__title">
                {t('walletPanel.title', 'Wallet')}
              </h3>
              <p className="wallet-panel__subtitle soft-text">
                {t('walletPanel.subtitle', 'Connection and network details')}
              </p>
            </div>

            <button
              type="button"
              className="wallet-panel__close"
              onClick={onClose}
              aria-label={t('walletPanel.closeAriaLabel', 'Close wallet panel')}
            >
              ✕
            </button>
          </div>

          <div className="wallet-panel__summary">
            <div className="wallet-panel__status-row">
              <span className={statusDotClassName} />
              <span className="wallet-panel__status-text">
                {wallet.status || t('walletPanel.status.disconnected', 'Disconnected')}
              </span>
            </div>

            <div className="wallet-panel__address-block">
              <span className="wallet-panel__label soft-text">
                {t('walletPanel.labels.walletAddress', 'Wallet Address')}
              </span>
              <p className="wallet-panel__value">
                {rawAddress || wallet.address || t('walletPanel.emptyAddress', 'No wallet connected')}
              </p>
            </div>

            <div className="wallet-panel__meta-grid">
              <div className="wallet-panel__meta-card">
                <span className="wallet-panel__meta-label soft-text">
                  {t('walletPanel.labels.network', 'Network')}
                </span>
                <span className="wallet-panel__meta-value">
                  {wallet.network || t('walletPanel.unknown', 'Unknown')}
                </span>
              </div>

              <div className="wallet-panel__meta-card">
                <span className="wallet-panel__meta-label soft-text">
                  {t('walletPanel.labels.provider', 'Provider')}
                </span>
                <span className="wallet-panel__meta-value">
                  {wallet.provider || t('walletPanel.unknown', 'Unknown')}
                </span>
              </div>

              <div className="wallet-panel__meta-card wallet-panel__meta-card--full">
                <span className="wallet-panel__meta-label soft-text">
                  {t('walletPanel.labels.balance', 'Balance')}
                </span>
                <span className="wallet-panel__meta-value">
                  {wallet.balance ? `${wallet.balance} POL` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="wallet-panel__actions">
            {!isConnected ? (
              <button
                type="button"
                className="wallet-panel__action-btn wallet-panel__action-btn--primary"
                onClick={handleConnect}
                disabled={isLoading}
              >
                {isLoading
                  ? t('walletPanel.actions.connecting', 'Connecting...')
                  : t('walletPanel.actions.connectWallet', 'Connect Wallet')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="wallet-panel__action-btn"
                  onClick={handleCopyAddress}
                  disabled={!canCopy}
                >
                  {t('walletPanel.actions.copyAddress', 'Copy Address')}
                </button>

                <button
                  type="button"
                  className="wallet-panel__action-btn"
                  onClick={handleViewOnExplorer}
                  disabled={!canOpenExplorer}
                >
                  {t('walletPanel.actions.viewOnExplorer', 'View on Explorer')}
                </button>

                <button
                  type="button"
                  className="wallet-panel__action-btn"
                  onClick={handleSwitchNetwork}
                  disabled={!canSwitchNetwork}
                >
                  {t('walletPanel.actions.switchNetwork', 'Switch Network')}
                </button>

                <button
                  type="button"
                  className="wallet-panel__action-btn"
                  onClick={handleOpenWalletSettings}
                  disabled={!canOpenSettings}
                >
                  {t('walletPanel.actions.walletSettings', 'Wallet Settings')}
                </button>

                <button
                  type="button"
                  className="wallet-panel__action-btn wallet-panel__action-btn--danger"
                  onClick={handleDisconnect}
                  disabled={!canDisconnect}
                >
                  {t('walletPanel.actions.disconnect', 'Disconnect')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default WalletPanel













// import './WalletPanel.css'
// import { useEffect, useRef, useState } from 'react'
// import { createPortal } from 'react-dom'

// function ModalPortal({ children }) {
//   if (typeof document === 'undefined') return null
//   return createPortal(children, document.body)
// }

// const WalletPanel = ({
//   isOpen = false,
//   wallet = null,
//   onClose,
//   onConnect,
//   onDisconnect,
//   onSwitchNetwork,
//   onOpenWalletSettings,
//   anchorRef = null, // NEW: Accept anchor ref for positioning
// }) => {
//   const dialogRef = useRef(null)
//   const [desktopPosition, setDesktopPosition] = useState({
//     top: 76,
//     left: null,
//     right: 20,
//   })

//   // Body scroll lock - exactly like NotificationDropdown
//   useEffect(() => {
//     if (!isOpen) return undefined

//     const previousOverflow = document.body.style.overflow
//     const previousTouchAction = document.body.style.touchAction

//     document.body.style.overflow = 'hidden'
//     document.body.style.touchAction = 'none'

//     return () => {
//       document.body.style.overflow = previousOverflow
//       document.body.style.touchAction = previousTouchAction
//     }
//   }, [isOpen])

//   // Desktop positioning logic
//   const updateDesktopPosition = () => {
//     if (typeof window === 'undefined') return
//     if (window.innerWidth < 768) return

//     const anchorEl = anchorRef?.current
//     const dialogEl = dialogRef.current

//     if (!anchorEl || !dialogEl) {
//       setDesktopPosition({ top: 76, left: null, right: 20 })
//       return
//     }

//     const rect = anchorEl.getBoundingClientRect()
//     const dialogWidth = dialogEl.offsetWidth || 340
//     const viewportWidth = window.innerWidth
//     const gap = 12
//     const minMargin = 12

//     // Align dropdown right edge with anchor right edge
//     let left = rect.right - dialogWidth
//     left = Math.max(minMargin, left)
//     left = Math.min(left, viewportWidth - dialogWidth - minMargin)

//     const top = rect.bottom + gap

//     setDesktopPosition({
//       top,
//       left,
//       right: 'auto',
//     })
//   }

//   // Position update on open/resize/scroll
//   useEffect(() => {
//     if (!isOpen) return undefined

//     updateDesktopPosition()

//     const handleResize = () => updateDesktopPosition()
//     const handleScroll = () => updateDesktopPosition()

//     window.addEventListener('resize', handleResize)
//     window.addEventListener('scroll', handleScroll, true)

//     return () => {
//       window.removeEventListener('resize', handleResize)
//       window.removeEventListener('scroll', handleScroll, true)
//     }
//   }, [isOpen, anchorRef])

//   if (!isOpen || !wallet) return null

//   const isConnected = !!wallet.isConnected
//   const isLoading = !!wallet.isLoading
//   const rawAddress = wallet.rawAddress || ''
//   const explorerBaseUrl = 'https://amoy.polygonscan.com/address/'
//   const canCopy = !!rawAddress
//   const canOpenExplorer = !!rawAddress
//   const canDisconnect = isConnected && !isLoading
//   const canSwitchNetwork = !isLoading
//   const canOpenSettings = true

//   const handleCopyAddress = async () => {
//     if (!rawAddress) return
//     try {
//       await navigator.clipboard.writeText(rawAddress)
//     } catch (error) {
//       console.error('Failed to copy wallet address:', error)
//     }
//   }

//   const handleViewOnExplorer = () => {
//     if (!rawAddress) return
//     window.open(`${explorerBaseUrl}${rawAddress}`, '_blank', 'noopener,noreferrer')
//   }

//   const handleSwitchNetwork = () => {
//     if (onSwitchNetwork) onSwitchNetwork()
//   }

//   const handleDisconnect = () => {
//     if (onDisconnect) onDisconnect()
//     if (onClose) onClose()
//   }

//   const handleConnect = () => {
//     if (onConnect) onConnect()
//     if (onClose) onClose()
//   }

//   const handleOpenWalletSettings = () => {
//     if (onOpenWalletSettings) onOpenWalletSettings()
//     if (onClose) onClose()
//   }

//   const statusDotClassName = [
//     'wallet-panel__status-dot',
//     !isConnected ? 'is-disconnected' : '',
//     isLoading ? 'is-loading' : '',
//   ]
//     .filter(Boolean)
//     .join(' ')

//   return (
//     <ModalPortal>
//       <div className="wallet-modal" role="presentation">
//         {/* Backdrop for click-outside */}
//         <div
//           className="wallet-modal__backdrop"
//           onClick={onClose}
//         />

//         <div
//           ref={dialogRef}
//           className="wallet-modal__dialog glass-panel theme-transition"
//           role="dialog"
//           aria-label="Wallet panel"
//           onClick={(event) => event.stopPropagation()}
//           style={
//             typeof desktopPosition.left === 'number'
//               ? {
//                   top: `${desktopPosition.top}px`,
//                   left: `${desktopPosition.left}px`,
//                   right: desktopPosition.right,
//                 }
//               : undefined
//           }
//         >
//           <div className="wallet-panel__header">
//             <div className="wallet-panel__title-group">
//               <h3 className="wallet-panel__title">Wallet</h3>
//               <p className="wallet-panel__subtitle soft-text">
//                 Connection and network details
//               </p>
//             </div>

//             <button
//               type="button"
//               className="wallet-panel__close"
//               onClick={onClose}
//               aria-label="Close wallet panel"
//             >
//               ✕
//             </button>
//           </div>

//           <div className="wallet-panel__summary">
//             <div className="wallet-panel__status-row">
//               <span className={statusDotClassName} />
//               <span className="wallet-panel__status-text">
//                 {wallet.status || 'Disconnected'}
//               </span>
//             </div>

//             <div className="wallet-panel__address-block">
//               <span className="wallet-panel__label soft-text">Wallet Address</span>
//               <p className="wallet-panel__value">
//                 {rawAddress || wallet.address || 'No wallet connected'}
//               </p>
//             </div>

//             <div className="wallet-panel__meta-grid">
//               <div className="wallet-panel__meta-card">
//                 <span className="wallet-panel__meta-label soft-text">Network</span>
//                 <span className="wallet-panel__meta-value">{wallet.network || 'Unknown'}</span>
//               </div>

//               <div className="wallet-panel__meta-card">
//                 <span className="wallet-panel__meta-label soft-text">Provider</span>
//                 <span className="wallet-panel__meta-value">{wallet.provider || 'Unknown'}</span>
//               </div>

//               <div className="wallet-panel__meta-card wallet-panel__meta-card--full">
//                 <span className="wallet-panel__meta-label soft-text">Balance</span>
//                 <span className="wallet-panel__meta-value">
//                   {wallet.balance ? `${wallet.balance} POL` : '—'}
//                 </span>
//               </div>
//             </div>
//           </div>

//           <div className="wallet-panel__actions">
//             {!isConnected ? (
//               <button
//                 type="button"
//                 className="wallet-panel__action-btn wallet-panel__action-btn--primary"
//                 onClick={handleConnect}
//                 disabled={isLoading}
//               >
//                 {isLoading ? 'Connecting...' : 'Connect Wallet'}
//               </button>
//             ) : (
//               <>
//                 <button
//                   type="button"
//                   className="wallet-panel__action-btn"
//                   onClick={handleCopyAddress}
//                   disabled={!canCopy}
//                 >
//                   Copy Address
//                 </button>

//                 <button
//                   type="button"
//                   className="wallet-panel__action-btn"
//                   onClick={handleViewOnExplorer}
//                   disabled={!canOpenExplorer}
//                 >
//                   View on Explorer
//                 </button>

//                 <button
//                   type="button"
//                   className="wallet-panel__action-btn"
//                   onClick={handleSwitchNetwork}
//                   disabled={!canSwitchNetwork}
//                 >
//                   Switch Network
//                 </button>

//                 <button
//                   type="button"
//                   className="wallet-panel__action-btn"
//                   onClick={handleOpenWalletSettings}
//                   disabled={!canOpenSettings}
//                 >
//                   Wallet Settings
//                 </button>

//                 <button
//                   type="button"
//                   className="wallet-panel__action-btn wallet-panel__action-btn--danger"
//                   onClick={handleDisconnect}
//                   disabled={!canDisconnect}
//                 >
//                   Disconnect
//                 </button>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </ModalPortal>
//   )
// }

// export default WalletPanel
