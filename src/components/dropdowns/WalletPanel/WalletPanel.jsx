import './WalletPanel.css'

const WalletPanel = ({
  isOpen = false,
  wallet = null,
  onClose,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
  onOpenWalletSettings,
}) => {
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
    <div className="wallet-panel glass-panel theme-transition">
      <div className="wallet-panel__header">
        <div className="wallet-panel__title-group">
          <h3 className="wallet-panel__title">Wallet</h3>
          <p className="wallet-panel__subtitle soft-text">
            Connection and network details
          </p>
        </div>

        <button
          type="button"
          className="wallet-panel__close"
          onClick={onClose}
          aria-label="Close wallet panel"
        >
          ✕
        </button>
      </div>

      <div className="wallet-panel__summary">
        <div className="wallet-panel__status-row">
          <span className={statusDotClassName} />
          <span className="wallet-panel__status-text">
            {wallet.status || 'Disconnected'}
          </span>
        </div>

        <div className="wallet-panel__address-block">
          <span className="wallet-panel__label soft-text">Wallet Address</span>
          <p className="wallet-panel__value">
            {rawAddress || wallet.address || 'No wallet connected'}
          </p>
        </div>

        <div className="wallet-panel__meta-grid">
          <div className="wallet-panel__meta-card">
            <span className="wallet-panel__meta-label soft-text">Network</span>
            <span className="wallet-panel__meta-value">{wallet.network || 'Unknown'}</span>
          </div>

          <div className="wallet-panel__meta-card">
            <span className="wallet-panel__meta-label soft-text">Provider</span>
            <span className="wallet-panel__meta-value">{wallet.provider || 'Unknown'}</span>
          </div>

          <div className="wallet-panel__meta-card wallet-panel__meta-card--full">
            <span className="wallet-panel__meta-label soft-text">Balance</span>
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
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="wallet-panel__action-btn"
              onClick={handleCopyAddress}
              disabled={!canCopy}
            >
              Copy Address
            </button>

            <button
              type="button"
              className="wallet-panel__action-btn"
              onClick={handleViewOnExplorer}
              disabled={!canOpenExplorer}
            >
              View on Explorer
            </button>

            <button
              type="button"
              className="wallet-panel__action-btn"
              onClick={handleSwitchNetwork}
              disabled={!canSwitchNetwork}
            >
              Switch Network
            </button>

            <button
              type="button"
              className="wallet-panel__action-btn"
              onClick={handleOpenWalletSettings}
              disabled={!canOpenSettings}
            >
              Wallet Settings
            </button>

            <button
              type="button"
              className="wallet-panel__action-btn wallet-panel__action-btn--danger"
              onClick={handleDisconnect}
              disabled={!canDisconnect}
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default WalletPanel