import './SecurityPage.css'
import { useEffect, useState } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { ethers, keccak256, toUtf8Bytes } from 'ethers'
import { useSpace } from '../../context/SpaceContext'
import {
  Shield, Lock, Unlock, Key, Smartphone, Mail,
  AlertTriangle, CheckCircle, XCircle, Clock, Eye, Copy, Trash2,
  Plus, Save, Settings, Award, TrendingUp, Wallet, Wifi, WifiOff,
  Database, RefreshCw, User, Users, ShieldCheck,
  ShieldOff, Zap, Search, X, Globe
} from 'lucide-react'

const SecurityPage = () => {
  const { isConnected, account, connect, switchToAmoy } = useWallet()
  const { isOwnSpace, subjectAddress, switchToSelf } = useSpace()
  const { contracts, isLoading: contractsLoading } = useContracts()

  const [profileLocked, setProfileLocked] = useState(false)
  const [lockPin, setLockPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showLockModal, setShowLockModal] = useState(false)
  const [enteredPin, setEnteredPin] = useState('')
  const [lockError, setLockError] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [lastUnlockTime, setLastUnlockTime] = useState(null)
  const [sessionTimeout, setSessionTimeout] = useState(30)
  const [autoLockEnabled, setAutoLockEnabled] = useState(true)

  const [transactionConfirmations, setTransactionConfirmations] = useState(true)
  const [addressWhitelist, setAddressWhitelist] = useState([])
  const [newWhitelistAddress, setNewWhitelistAddress] = useState('')

  const [awarenessScore, setAwarenessScore] = useState(0)
  const [awarenessChecks, setAwarenessChecks] = useState({
    walletConnected: false,
    correctNetwork: false,
    profileLocked: false,
    hardwareWallet: false,
    whitelistActive: false,
  })

  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [networkWarning, setNetworkWarning] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')

  const AMOY_CHAIN_ID = '0x13882'

  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) return
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        setNetworkWarning(chainId !== AMOY_CHAIN_ID)
      } catch {
        setNetworkWarning(true)
      }
    }
    checkNetwork()
  }, [])

  useEffect(() => {
    const savedLockPin = localStorage.getItem('ffn_profile_lock_pin')
    const savedLockState = localStorage.getItem('ffn_profile_locked')
    const savedSessionTimeout = localStorage.getItem('ffn_session_timeout')
    const savedAutoLock = localStorage.getItem('ffn_auto_lock')
    const savedTxConfirmations = localStorage.getItem('ffn_tx_confirmations')
    const savedWhitelist = localStorage.getItem('ffn_address_whitelist')

    if (savedLockPin) {
      setProfileLocked(true)
      if (savedLockState === 'locked') setIsLocked(true)
    }
    if (savedSessionTimeout) setSessionTimeout(parseInt(savedSessionTimeout, 10))
    if (savedAutoLock) setAutoLockEnabled(savedAutoLock === 'true')
    if (savedTxConfirmations) setTransactionConfirmations(savedTxConfirmations === 'true')
    if (savedWhitelist) setAddressWhitelist(JSON.parse(savedWhitelist))
  }, [])

  useEffect(() => {
    if (!autoLockEnabled || !profileLocked || isLocked) return

    const timer = setInterval(() => {
      if (lastUnlockTime) {
        const minutesSinceUnlock = (Date.now() - lastUnlockTime) / (1000 * 60)
        if (minutesSinceUnlock >= sessionTimeout) {
          setIsLocked(true)
          localStorage.setItem('ffn_profile_locked', 'locked')
        }
      }
    }, 60000)

    return () => clearInterval(timer)
  }, [lastUnlockTime, autoLockEnabled, sessionTimeout, profileLocked, isLocked])

  useEffect(() => {
    let score = 0
    if (awarenessChecks.walletConnected) score += 20
    if (awarenessChecks.correctNetwork) score += 20
    if (awarenessChecks.profileLocked) score += 20
    if (awarenessChecks.whitelistActive) score += 20
    if (awarenessChecks.hardwareWallet) score += 20
    setAwarenessScore(score)
  }, [awarenessChecks])

  useEffect(() => {
    setAwarenessChecks({
      walletConnected: isConnected,
      correctNetwork: !networkWarning,
      profileLocked,
      whitelistActive: addressWhitelist.length > 0,
      hardwareWallet: false,
    })
    setLastUpdated(new Date().toLocaleTimeString())
  }, [isConnected, networkWarning, profileLocked, addressWhitelist])

  const handleSetupLock = () => {
    if (!/^\d{4,6}$/.test(lockPin)) {
      setLockError('PIN must be 4 to 6 digits')
      return
    }
    if (lockPin !== confirmPin) {
      setLockError('PINs do not match')
      return
    }

    const hashedPin = keccak256(toUtf8Bytes(lockPin))
    localStorage.setItem('ffn_profile_lock_pin', hashedPin)
    localStorage.setItem('ffn_profile_locked', 'locked')
    setProfileLocked(true)
    setIsLocked(true)
    setShowLockModal(false)
    setLockPin('')
    setConfirmPin('')
    setLockError('')
  }

  const handleUnlock = () => {
    const savedPin = localStorage.getItem('ffn_profile_lock_pin')
    const enteredHashedPin = keccak256(toUtf8Bytes(enteredPin))

    if (enteredHashedPin === savedPin) {
      setIsLocked(false)
      setLastUnlockTime(Date.now())
      localStorage.setItem('ffn_profile_locked', 'unlocked')
      setEnteredPin('')
      setUnlockError('')
    } else {
      setUnlockError('Invalid PIN')
    }
  }

  const handleLockNow = () => {
    setIsLocked(true)
    localStorage.setItem('ffn_profile_locked', 'locked')
  }

  const handleRemoveLock = () => {
    localStorage.removeItem('ffn_profile_lock_pin')
    localStorage.removeItem('ffn_profile_locked')
    setProfileLocked(false)
    setIsLocked(false)
  }

  const handleAddToWhitelist = () => {
    if (newWhitelistAddress && ethers.isAddress(newWhitelistAddress)) {
      const updated = [...addressWhitelist, newWhitelistAddress]
      setAddressWhitelist(updated)
      localStorage.setItem('ffn_address_whitelist', JSON.stringify(updated))
      setNewWhitelistAddress('')
    }
  }

  const handleRemoveFromWhitelist = (address) => {
    const updated = addressWhitelist.filter((a) => a !== address)
    setAddressWhitelist(updated)
    localStorage.setItem('ffn_address_whitelist', JSON.stringify(updated))
  }

  const saveSettings = () => {
    localStorage.setItem('ffn_session_timeout', String(sessionTimeout))
    localStorage.setItem('ffn_auto_lock', String(autoLockEnabled))
    localStorage.setItem('ffn_tx_confirmations', String(transactionConfirmations))
    setLastUpdated(new Date().toLocaleTimeString())
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopyFeedback(text)
    setTimeout(() => setCopyFeedback(''), 2000)
  }

  const getScoreColorClass = () => {
    if (awarenessScore >= 80) return 'is-good'
    if (awarenessScore >= 50) return 'is-mid'
    return 'is-low'
  }

  const getScoreLabel = () => {
    if (awarenessScore >= 80) return 'Excellent'
    if (awarenessScore >= 60) return 'Good'
    if (awarenessScore >= 40) return 'Fair'
    return 'Learning'
  }

  if (!isConnected) {
    return (
      <section className="security-page">
        <div className="security-hero">
          <div className="security-hero__content">
            <div className="security-hero__eyebrow glass-panel">
              <span className="security-hero__eyebrow-dot" />
              <span className="security-hero__eyebrow-text">Secure Your Account</span>
            </div>
            <div className="security-hero__text-block">
              <h1 className="security-hero__title">Security Center</h1>
              <p className="security-hero__description soft-text">
                Connect your wallet to view security status and enable protection features.
              </p>
            </div>
            <button type="button" onClick={connect} className="connect-wallet-btn">
              <Wallet size={18} /> Connect Wallet
            </button>
          </div>
          <div className="security-hero__visual glass-panel">
            <div className="security-hero__visual-box">
              <div className="security-hero__visual-stack">
                <Shield size={48} className="security-hero__visual-icon" />
                <div className="soft-text">Connect to view security</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!isOwnSpace) {
    return (
      <section className="security-page">
        <div className="security-hero">
          <div className="security-hero__content">
            <div className="security-hero__eyebrow glass-panel">
              <span className="security-hero__eyebrow-dot" />
              <span className="security-hero__eyebrow-text">Own Space Required</span>
            </div>
            <div className="security-hero__text-block">
              <h1 className="security-hero__title">Safety &amp; Control Center</h1>
              <p className="security-hero__description soft-text">
                Safety controls can only be changed in your own space.
              </p>
              <div className="small muted-text">
                Viewing: {subjectAddress ? `${subjectAddress.slice(0, 8)}...${subjectAddress.slice(-6)}` : 'Unknown'}
              </div>
            </div>
            <button type="button" onClick={switchToSelf} className="connect-wallet-btn">
              <User size={18} /> Return to My Space
            </button>
          </div>
          <div className="security-hero__visual glass-panel">
            <div className="security-hero__visual-box">
              <div className="security-hero__visual-stack">
                <Shield size={48} className="security-hero__visual-icon alt" />
                <div className="soft-text">Settings are private</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (profileLocked && isLocked) {
    return (
      <section className="security-page locked">
        <div className="lock-screen glass-panel">
          <Lock size={48} className="lock-screen__icon" />
          <h2 className="lock-screen__title">Profile Locked</h2>
          <p className="soft-text">Enter your PIN to access security settings</p>
          <input
            type="password"
            className="lock-input"
            placeholder="Enter PIN"
            value={enteredPin}
            onChange={(e) => setEnteredPin(e.target.value)}
            maxLength={6}
            inputMode="numeric"
          />
          {unlockError && <div className="lock-error">{unlockError}</div>}
          <button type="button" className="unlock-btn" onClick={handleUnlock}>
            <Unlock size={16} /> Unlock
          </button>
          <button type="button" className="logout-btn" onClick={handleRemoveLock}>
            <Trash2 size={16} /> Remove Lock (Reset)
          </button>
        </div>
      </section>
    )
  }

  if (contractsLoading) {
    return (
      <section className="security-page">
        <div className="loading-container">
          <div className="spinner" />
          <p className="soft-text">Loading security data...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="security-page">
      <div className="security-hero">
        <div className="security-hero__content">
          <div className="security-hero__eyebrow glass-panel">
            <span className="security-hero__eyebrow-dot" />
            <span className="security-hero__eyebrow-text">Account protection &amp; safe usage</span>
          </div>

          <div className="security-hero__text-block">
            <h1 className="security-hero__title">Safety &amp; Control Center</h1>
            <p className="security-hero__description soft-text">
              Review your security posture, manage app-level protection controls, and follow best
              practices for safer participation.
            </p>
            <div className="small muted-text security-inline-meta">
              <Clock size={12} /> Last updated: {lastUpdated}
            </div>
          </div>

          <div className="security-hero__chips">
            <span className="security-hero__chip glass-panel">
              {isConnected ? <CheckCircle size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
              <span>{isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}</span>
            </span>
            <span className="security-hero__chip glass-panel">
              {!networkWarning ? <Wifi size={14} className="text-success" /> : <WifiOff size={14} className="text-warning" />}
              <span>{!networkWarning ? 'Correct Network' : 'Wrong Network'}</span>
            </span>
            <span className="security-hero__chip glass-panel">
              {profileLocked ? <Lock size={14} className="text-success" /> : <Unlock size={14} className="text-warning" />}
              <span>{profileLocked ? 'Profile Locked' : 'Profile Unlocked'}</span>
            </span>
          </div>
        </div>

        <div className="security-hero__visual glass-panel">
          <div className="security-hero__visual-box">
            <div className="security-score">
              <div className="score-circle" style={{ '--score': awarenessScore }}>
                <span className="score-value">{awarenessScore}</span>
                <span className="score-label">Awareness</span>
              </div>
              <div className={`score-status ${getScoreColorClass()}`}>{getScoreLabel()}</div>
            </div>
          </div>
          <p className="security-hero__visual-note muted-text">Your security awareness score</p>
        </div>
      </div>

      {networkWarning && (
        <div className="network-warning glass-panel">
          <AlertTriangle size={22} className="text-warning" />
          <div className="network-warning__body">
            <strong>Wrong Network Detected</strong>
            <p className="soft-text">Please switch to Polygon Amoy Testnet for secure transactions.</p>
          </div>
          <button type="button" className="switch-network-btn" onClick={switchToAmoy}>
            <RefreshCw size={14} /> Switch Network
          </button>
        </div>
      )}

      <div className="security-main-grid">
        <div className="security-main-grid__left">
          <section className="security-profile-lock glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Lock size={12} /> Profile Lock
              </span>
              <h2 className="security-section-heading__title">Protect your settings with a PIN</h2>
            </div>

            {!profileLocked ? (
              <div className="lock-setup">
                <p className="lock-description soft-text">
                  Set up a 4-6 digit PIN to lock your profile settings when you're away.
                  This adds an app-level convenience layer.
                </p>
                <button type="button" className="setup-lock-btn" onClick={() => setShowLockModal(true)}>
                  <Lock size={16} /> Set Up Profile Lock
                </button>
              </div>
            ) : (
              <div className="lock-status">
                <div className="lock-status-indicator active">
                  <ShieldCheck size={16} className="text-success" />
                  <span>Profile Lock is ACTIVE</span>
                </div>
                <div className="lock-actions">
                  <button type="button" className="lock-now-btn" onClick={handleLockNow}>
                    <Lock size={14} /> Lock Now
                  </button>
                  <button type="button" className="remove-lock-btn" onClick={handleRemoveLock}>
                    <Trash2 size={14} /> Remove Lock
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="security-checklist glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Shield size={12} /> Best Practices
              </span>
              <h2 className="security-section-heading__title">Core security habits to follow</h2>
            </div>

            <div className="security-checklist__list">
              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Wallet size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Use a hardware wallet</h3>
                  <p className="security-checklist__text soft-text">Hardware wallets provide the highest level of security for your assets.</p>
                </div>
              </div>
              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Key size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Never share your seed phrase</h3>
                  <p className="security-checklist__text soft-text">Your recovery phrase is the key to your wallet. Never enter it online.</p>
                </div>
              </div>
              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Shield size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Verify network before signing</h3>
                  <p className="security-checklist__text soft-text">Always confirm you're on the correct network before approving transactions.</p>
                </div>
              </div>
              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Eye size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Review transaction details</h3>
                  <p className="security-checklist__text soft-text">Check recipient addresses and amounts before confirming any transaction.</p>
                </div>
              </div>
              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Database size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Revoke unused approvals</h3>
                  <p className="security-checklist__text soft-text">Regularly review and revoke token approvals you no longer need.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="security-risks glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <AlertTriangle size={12} /> Common Risks
              </span>
              <h2 className="security-section-heading__title">Threats to be aware of</h2>
            </div>

            <div className="security-risks__grid">
              <div className="security-risk">
                <Globe size={20} className="risk-icon risk-warning" />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Wrong Network</strong>
                <p className="security-risk__desc soft-text">Always verify you're on the correct chain.</p>
              </div>
              <div className="security-risk">
                <Users size={20} className="risk-icon risk-danger" />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Fake Support</strong>
                <p className="security-risk__desc soft-text">Official staff never DM first.</p>
              </div>
              <div className="security-risk">
                <AlertTriangle size={20} className="risk-icon risk-warning" />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Unsafe Approval</strong>
                <p className="security-risk__desc soft-text">Review token approvals before signing.</p>
              </div>
              <div className="security-risk">
                <ShieldOff size={20} className="risk-icon risk-danger" />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Phishing Links</strong>
                <p className="security-risk__desc soft-text">Only use official FFN links.</p>
              </div>
              <div className="security-risk">
                <TrendingUp size={20} className="risk-icon risk-danger" />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Rug Pull</strong>
                <p className="security-risk__desc soft-text">Research projects before investing.</p>
              </div>
              <div className="security-risk">
                <Mail size={20} className="risk-icon risk-warning" />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Email Scams</strong>
                <p className="security-risk__desc soft-text">Verify sender addresses carefully.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="security-main-grid__right">
          <section className="security-settings glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Settings size={12} /> Settings
              </span>
              <h2 className="security-section-heading__title">Configure your preferences</h2>
            </div>

            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Session Timeout</span>
                  <span className="setting-desc">Auto-lock after inactivity</span>
                </div>
                <select
                  className="setting-select"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10))}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Auto-Lock</span>
                  <span className="setting-desc">Automatically lock after timeout</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={autoLockEnabled} onChange={(e) => setAutoLockEnabled(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Transaction Confirmations</span>
                  <span className="setting-desc">Require confirmation for transactions</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={transactionConfirmations} onChange={(e) => setTransactionConfirmations(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="coming-soon-section">
                <div className="coming-soon-header">
                  <Zap size={14} className="text-warning" />
                  <span>Advanced Features (Coming Soon)</span>
                </div>
                <div className="setting-item disabled">
                  <div className="setting-info">
                    <span className="setting-label">Two-Factor Authentication</span>
                    <span className="setting-desc">Additional verification layer</span>
                  </div>
                  <span className="coming-soon-badge">Planned</span>
                </div>
                <div className="setting-item disabled">
                  <div className="setting-info">
                    <span className="setting-label">Email Security Alerts</span>
                    <span className="setting-desc">Real-time threat notifications</span>
                  </div>
                  <span className="coming-soon-badge">Planned</span>
                </div>
              </div>

              <button type="button" className="save-settings-btn" onClick={saveSettings}>
                <Save size={14} /> Save Settings
              </button>

              <p className="settings-note soft-text">
                Profile lock is an app-level convenience layer. Wallet security depends on your
                connected wallet and signed confirmations.
              </p>
            </div>
          </section>

          <section className="security-whitelist glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <CheckCircle size={12} /> Whitelist
              </span>
              <h2 className="security-section-heading__title">Trusted addresses</h2>
            </div>

            <div className="whitelist-add">
              <input
                type="text"
                className="whitelist-input"
                placeholder="Enter wallet address (0x...)"
                value={newWhitelistAddress}
                onChange={(e) => setNewWhitelistAddress(e.target.value)}
              />
              <button type="button" className="add-address-btn" onClick={handleAddToWhitelist}>
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="whitelist-list">
              {addressWhitelist.length === 0 ? (
                <p className="whitelist-empty soft-text">No whitelisted addresses yet</p>
              ) : (
                addressWhitelist.map((addr, idx) => (
                  <div key={`${addr}-${idx}`} className="whitelist-item">
                    <span className="whitelist-address">{addr.slice(0, 10)}...{addr.slice(-8)}</span>
                    <div className="whitelist-actions">
                      <button type="button" className="copy-address-btn" onClick={() => copyToClipboard(addr)}>
                        {copyFeedback === addr ? <CheckCircle size={12} /> : <Copy size={12} />}
                      </button>
                      <button type="button" className="remove-address-btn" onClick={() => handleRemoveFromWhitelist(addr)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="whitelist-note soft-text">Whitelisted addresses can be used for faster transactions.</p>
          </section>

          <section className="security-tips glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Award size={12} /> Pro Tips
              </span>
              <h2 className="security-section-heading__title">Expert recommendations</h2>
            </div>

            <div className="tips-list">
              <div className="tip-item">
                <ShieldCheck size={18} className="tip-icon tip-good" />
                <div>
                  <strong>Use a dedicated wallet</strong>
                  <p className="soft-text">Consider a separate wallet for DeFi interactions.</p>
                </div>
              </div>
              <div className="tip-item">
                <Smartphone size={18} className="tip-icon tip-blue" />
                <div>
                  <strong>Enable mobile alerts</strong>
                  <p className="soft-text">Get real-time notifications for transactions.</p>
                </div>
              </div>
              <div className="tip-item">
                <Search size={18} className="tip-icon tip-warn" />
                <div>
                  <strong>Revoke unused approvals</strong>
                  <p className="soft-text">Regularly review token approvals.</p>
                </div>
              </div>
              <div className="tip-item">
                <RefreshCw size={18} className="tip-icon tip-purple" />
                <div>
                  <strong>Keep software updated</strong>
                  <p className="soft-text">Use the latest wallet and browser versions.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showLockModal && (
        <div className="modal-overlay" onClick={() => setShowLockModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowLockModal(false)}>
              <X size={20} />
            </button>
            <Lock size={32} className="modal-icon" />
            <h3>Set Up Profile Lock</h3>
            <p className="soft-text">Create a 4-6 digit PIN to secure your settings</p>
            <input
              type="password"
              className="modal-input"
              placeholder="Enter PIN"
              value={lockPin}
              onChange={(e) => setLockPin(e.target.value)}
              maxLength={6}
              inputMode="numeric"
            />
            <input
              type="password"
              className="modal-input"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              maxLength={6}
              inputMode="numeric"
            />
            {lockError && <div className="modal-error">{lockError}</div>}
            <button type="button" className="modal-confirm" onClick={handleSetupLock}>
              <Lock size={14} /> Enable Lock
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default SecurityPage
