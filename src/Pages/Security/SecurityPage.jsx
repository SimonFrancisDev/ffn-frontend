import './SecurityPage.css'
import { useEffect, useState, useCallback } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { ethers, keccak256, toUtf8Bytes } from 'ethers'
import { useSpace } from '../../context/SpaceContext'
import {
  Shield, Lock, Unlock, Key, Fingerprint, Smartphone, Mail, Bell, Globe,
  AlertTriangle, CheckCircle, XCircle, Clock, Eye, EyeOff, Copy, Trash2,
  Plus, Save, Settings, Award, TrendingUp, Wallet, Wifi, WifiOff,
  Database, Activity, ChevronRight, ExternalLink, RefreshCw, LogOut,
  User, Users, FileText, Video, BookOpen, ShieldCheck, ShieldAlert,
  ShieldOff, Radio, Zap, Moon, Sun, HelpCircle, Info, Search
} from 'lucide-react'



const SecurityPage = () => {
  const { isConnected, account, connect, switchToAmoy } = useWallet()
  const { isOwnSpace, subjectAddress, switchToSelf } = useSpace()
  const { contracts, isLoading: contractsLoading, loadContracts } = useContracts()

  // Security States
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
  
  // Security Settings
  const [transactionConfirmations, setTransactionConfirmations] = useState(true)
  const [addressWhitelist, setAddressWhitelist] = useState([])
  const [newWhitelistAddress, setNewWhitelistAddress] = useState('')
  
  // Awareness Score (renamed from Security Score)
  const [awarenessScore, setAwarenessScore] = useState(0)
  const [awarenessChecks, setAwarenessChecks] = useState({
    walletConnected: false,
    correctNetwork: false,
    profileLocked: false,
    hardwareWallet: false,
    whitelistActive: false
  })
  
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [networkWarning, setNetworkWarning] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)

  const AMOY_CHAIN_ID = '0x13882'
  
  // Check network
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

  // Load saved settings from localStorage
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
    if (savedSessionTimeout) setSessionTimeout(parseInt(savedSessionTimeout))
    if (savedAutoLock) setAutoLockEnabled(savedAutoLock === 'true')
    if (savedTxConfirmations) setTransactionConfirmations(savedTxConfirmations === 'true')
    if (savedWhitelist) setAddressWhitelist(JSON.parse(savedWhitelist))
  }, [])

  // Auto-lock timer
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

  // Update awareness score
  useEffect(() => {
    let score = 0
    if (awarenessChecks.walletConnected) score += 20
    if (awarenessChecks.correctNetwork) score += 20
    if (awarenessChecks.profileLocked) score += 20
    if (awarenessChecks.whitelistActive) score += 20
    if (awarenessChecks.hardwareWallet) score += 20
    setAwarenessScore(score)
  }, [awarenessChecks])

  // Update awareness checks
  useEffect(() => {
    setAwarenessChecks({
      walletConnected: isConnected,
      correctNetwork: !networkWarning,
      profileLocked: profileLocked,
      whitelistActive: addressWhitelist.length > 0,
      hardwareWallet: false // Cannot detect reliably
    })
  }, [isConnected, networkWarning, profileLocked, addressWhitelist])

  // Handle profile lock
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
    const updated = addressWhitelist.filter(a => a !== address)
    setAddressWhitelist(updated)
    localStorage.setItem('ffn_address_whitelist', JSON.stringify(updated))
  }

  const saveSettings = () => {
    localStorage.setItem('ffn_session_timeout', String(sessionTimeout))
    localStorage.setItem('ffn_auto_lock', String(autoLockEnabled))
    localStorage.setItem('ffn_tx_confirmations', String(transactionConfirmations))
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const getScoreColor = () => {
    if (awarenessScore >= 80) return '#22c55e'
    if (awarenessScore >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreLabel = () => {
    if (awarenessScore >= 80) return 'Excellent'
    if (awarenessScore >= 60) return 'Good'
    if (awarenessScore >= 40) return 'Fair'
    return 'Learning'
  }

  // Not connected
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
            <button onClick={connect} className="connect-wallet-btn">
              <Wallet size={18} /> Connect Wallet
            </button>
          </div>
          <div className="security-hero__visual glass-panel">
            <div className="security-hero__visual-box">
              <Shield size={48} style={{ color: 'var(--glow-teal)', marginBottom: '12px' }} />
              <div className="soft-text">Connect to view security</div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Visitor mode
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
              <h1 className="security-hero__title">Safety & Control Center</h1>
              <p className="security-hero__description soft-text">
                Safety controls can only be changed in your own space.
              </p>
              <div className="small muted-text">
                Viewing: {subjectAddress ? `${subjectAddress.slice(0, 8)}...${subjectAddress.slice(-6)}` : 'Unknown'}
              </div>
            </div>
            <button onClick={switchToSelf} className="connect-wallet-btn">
              <User size={18} /> Return to My Space
            </button>
          </div>
          <div className="security-hero__visual glass-panel">
            <div className="security-hero__visual-box">
              <Shield size={48} style={{ color: 'var(--glow-blue)', marginBottom: '12px' }} />
              <div className="soft-text">Settings are private</div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Locked screen
  if (profileLocked && isLocked) {
    return (
      <section className="security-page locked">
        <div className="lock-screen glass-panel">
          <Lock size={48} style={{ color: 'var(--glow-teal)', marginBottom: '20px' }} />
          <h2>Profile Locked</h2>
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
          <button className="unlock-btn" onClick={handleUnlock}>
            <Unlock size={16} /> Unlock
          </button>
          <button className="logout-btn" onClick={handleRemoveLock}>
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
          <div className="spinner"></div>
          <p className="soft-text">Loading security data...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="security-page">
      
      {/* Hero Section */}
      <div className="security-hero">
        <div className="security-hero__content">
          <div className="security-hero__eyebrow glass-panel">
            <span className="security-hero__eyebrow-dot" />
            <span className="security-hero__eyebrow-text">
              Account protection & safe usage
            </span>
          </div>

          <div className="security-hero__text-block">
            <h1 className="security-hero__title">Safety & Control Center</h1>
            <p className="security-hero__description soft-text">
              Review your security posture, manage app-level protection controls, and follow best
              practices for safer participation.
            </p>
            <div className="small muted-text">
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
              <div className="score-status" style={{ color: getScoreColor() }}>{getScoreLabel()}</div>
            </div>
          </div>
          <p className="security-hero__visual-note muted-text">
            Your security awareness score
          </p>
        </div>
      </div>

      {/* Network Warning */}
      {networkWarning && (
        <div className="network-warning glass-panel">
          <AlertTriangle size={24} className="text-warning" />
          <div>
            <strong>Wrong Network Detected</strong>
            <p className="soft-text">Please switch to Polygon Amoy Testnet for secure transactions.</p>
          </div>
          <button className="switch-network-btn" onClick={switchToAmoy}>
            <RefreshCw size={14} /> Switch Network
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="security-main-grid">
        <div className="security-main-grid__left">
          
          {/* PROFILE LOCK */}
          <section className="security-profile-lock glass-panel">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Lock size={12} /> Profile Lock
              </span>
              <h2 className="security-section-heading__title">
                Protect your settings with a PIN
              </h2>
            </div>

            {!profileLocked ? (
              <div className="lock-setup">
                <p className="lock-description soft-text">
                  Set up a 4-6 digit PIN to lock your profile settings when you're away.
                  This adds an app-level convenience layer.
                </p>
                <button className="setup-lock-btn" onClick={() => setShowLockModal(true)}>
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
                  <button className="lock-now-btn" onClick={handleLockNow}>
                    <Lock size={14} /> Lock Now
                  </button>
                  <button className="remove-lock-btn" onClick={handleRemoveLock}>
                    <Trash2 size={14} /> Remove Lock
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* SECURITY CHECKLIST - Educational Only */}
          <section className="security-checklist glass-panel">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Shield size={12} /> Best Practices
              </span>
              <h2 className="security-section-heading__title">
                Core security habits to follow
              </h2>
            </div>

            <div className="security-checklist__list">
              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Wallet size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Use a hardware wallet</h3>
                  <p className="security-checklist__text soft-text">
                    Hardware wallets provide the highest level of security for your assets.
                  </p>
                </div>
              </div>

              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Key size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Never share your seed phrase</h3>
                  <p className="security-checklist__text soft-text">
                    Your recovery phrase is the key to your wallet. Never enter it online.
                  </p>
                </div>
              </div>

              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Globe size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Verify network before signing</h3>
                  <p className="security-checklist__text soft-text">
                    Always confirm you're on the correct network before approving transactions.
                  </p>
                </div>
              </div>

              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Eye size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Review transaction details</h3>
                  <p className="security-checklist__text soft-text">
                    Check recipient addresses and amounts before confirming any transaction.
                  </p>
                </div>
              </div>

              <div className="security-checklist__item">
                <span className="security-checklist__icon"><Database size={18} /></span>
                <div>
                  <h3 className="security-checklist__title">Revoke unused approvals</h3>
                  <p className="security-checklist__text soft-text">
                    Regularly review and revoke token approvals you no longer need.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* COMMON RISKS */}
          <section className="security-risks glass-panel">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <AlertTriangle size={12} /> Common Risks
              </span>
              <h2 className="security-section-heading__title">
                Threats to be aware of
              </h2>
            </div>

            <div className="security-risks__grid">
              <div className="security-risk glass-panel">
                <Globe size={20} className="risk-icon" style={{ color: '#f59e0b' }} />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Wrong Network</strong>
                <p className="security-risk__desc soft-text">Always verify you're on the correct chain</p>
              </div>

              <div className="security-risk glass-panel">
                <Users size={20} className="risk-icon" style={{ color: '#ef4444' }} />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Fake Support</strong>
                <p className="security-risk__desc soft-text">Official staff never DM first</p>
              </div>

              <div className="security-risk glass-panel">
                <AlertTriangle size={20} className="risk-icon" style={{ color: '#f59e0b' }} />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Unsafe Approval</strong>
                <p className="security-risk__desc soft-text">Review token approvals before signing</p>
              </div>

              <div className="security-risk glass-panel">
                <ShieldOff size={20} className="risk-icon" style={{ color: '#ef4444' }} />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Phishing Links</strong>
                <p className="security-risk__desc soft-text">Only use official FFN links</p>
              </div>

              <div className="security-risk glass-panel">
                <TrendingUp size={20} className="risk-icon" style={{ color: '#ef4444' }} />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Rug Pull</strong>
                <p className="security-risk__desc soft-text">Research projects before investing</p>
              </div>

              <div className="security-risk glass-panel">
                <Mail size={20} className="risk-icon" style={{ color: '#f59e0b' }} />
                <span className="security-risk__label muted-text">Risk</span>
                <strong className="security-risk__value">Email Scams</strong>
                <p className="security-risk__desc soft-text">Verify sender addresses carefully</p>
              </div>
            </div>
          </section>
        </div>

        <div className="security-main-grid__right">
          
          {/* SECURITY SETTINGS */}
          <section className="security-settings glass-panel">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Settings size={12} /> Settings
              </span>
              <h2 className="security-section-heading__title">
                Configure your preferences
              </h2>
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
                  onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
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
                  <input 
                    type="checkbox" 
                    checked={autoLockEnabled}
                    onChange={(e) => setAutoLockEnabled(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Transaction Confirmations</span>
                  <span className="setting-desc">Require confirmation for transactions</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={transactionConfirmations}
                    onChange={(e) => setTransactionConfirmations(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
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

              <button className="save-settings-btn" onClick={saveSettings}>
                <Save size={14} /> Save Settings
              </button>

              <p className="soft-text" style={{ fontSize: '12px', marginTop: '12px' }}>
                Profile lock is an app-level convenience layer. Wallet security depends on your
                connected wallet and signed confirmations.
              </p>
            </div>
          </section>

          {/* ADDRESS WHITELIST */}
          <section className="security-whitelist glass-panel">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <CheckCircle size={12} /> Whitelist
              </span>
              <h2 className="security-section-heading__title">
                Trusted addresses
              </h2>
            </div>

            <div className="whitelist-add">
              <input
                type="text"
                className="whitelist-input"
                placeholder="Enter wallet address (0x...)"
                value={newWhitelistAddress}
                onChange={(e) => setNewWhitelistAddress(e.target.value)}
              />
              <button className="add-address-btn" onClick={handleAddToWhitelist}>
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="whitelist-list">
              {addressWhitelist.length === 0 ? (
                <p className="whitelist-empty soft-text">No whitelisted addresses yet</p>
              ) : (
                addressWhitelist.map((addr, idx) => (
                  <div key={idx} className="whitelist-item">
                    <span className="whitelist-address">{addr.slice(0, 10)}...{addr.slice(-8)}</span>
                    <div className="whitelist-actions">
                      <button className="copy-address-btn" onClick={() => copyToClipboard(addr)}>
                        {copyFeedback ? <CheckCircle size={12} /> : <Copy size={12} />}
                      </button>
                      <button className="remove-address-btn" onClick={() => handleRemoveFromWhitelist(addr)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="whitelist-note soft-text">
              Whitelisted addresses can be used for faster transactions
            </p>
          </section>

          {/* SECURITY TIPS */}
          <section className="security-tips glass-panel">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Award size={12} /> Pro Tips
              </span>
              <h2 className="security-section-heading__title">
                Expert recommendations
              </h2>
            </div>

            <div className="tips-list">
              <div className="tip-item">
                <ShieldCheck size={18} style={{ color: 'var(--glow-teal)' }} />
                <div>
                  <strong>Use a dedicated wallet</strong>
                  <p className="soft-text">Consider a separate wallet for DeFi interactions</p>
                </div>
              </div>
              <div className="tip-item">
                <Smartphone size={18} style={{ color: 'var(--glow-blue)' }} />
                <div>
                  <strong>Enable mobile alerts</strong>
                  <p className="soft-text">Get real-time notifications for transactions</p>
                </div>
              </div>
              <div className="tip-item">
                <Search size={18} style={{ color: '#f59e0b' }} />
                <div>
                  <strong>Revoke unused approvals</strong>
                  <p className="soft-text">Regularly review token approvals</p>
                </div>
              </div>
              <div className="tip-item">
                <RefreshCw size={18} style={{ color: '#8b5cf6' }} />
                <div>
                  <strong>Keep software updated</strong>
                  <p className="soft-text">Use the latest wallet and browser versions</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Lock Setup Modal */}
      {showLockModal && (
        <div className="modal-overlay" onClick={() => setShowLockModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLockModal(false)}>
              <XCircle size={20} />
            </button>
            <Lock size={32} style={{ color: 'var(--glow-teal)', marginBottom: '12px' }} />
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
            <button className="modal-confirm" onClick={handleSetupLock}>
              <Lock size={14} /> Enable Lock
            </button>
          </div>
        </div>
      )}

      <style>{`
        .connect-wallet-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
          color: #07111f;
          font-weight: bold;
          border: none;
          cursor: pointer;
          font-size: 16px;
          width: fit-content;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(77, 163, 255, 0.2);
          border-top-color: var(--glow-blue);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-container { text-align: center; padding: 60px; }
        
        .text-success { color: #22c55e; }
        .text-warning { color: #f59e0b; }
        .text-danger { color: #ef4444; }
        
        /* Security Score */
        .security-score { text-align: center; }
        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: conic-gradient(var(--glow-teal) 0deg, var(--glow-teal) calc(var(--score) * 3.6deg), rgba(255,255,255,0.1) calc(var(--score) * 3.6deg));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          position: relative;
        }
        .score-circle::before {
          content: '';
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: var(--glass-bg-strong);
        }
        .score-value { position: relative; font-size: 36px; font-weight: bold; z-index: 1; }
        .score-label { position: relative; font-size: 10px; z-index: 1; }
        .score-status { font-size: 14px; font-weight: bold; }
        
        /* Network Warning */
        .network-warning {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          border-radius: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .switch-network-btn {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 20px;
          border-radius: 10px;
          background: #ef4444;
          color: white;
          border: none;
          cursor: pointer;
        }
        
        /* Profile Lock */
        .lock-setup, .lock-status { text-align: center; }
        .lock-description { margin-bottom: 16px; }
        .setup-lock-btn, .lock-now-btn, .remove-lock-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: bold;
          cursor: pointer;
        }
        .setup-lock-btn {
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
          color: #07111f;
          border: none;
        }
        .lock-now-btn {
          background: #f59e0b;
          color: white;
          border: none;
          margin-right: 12px;
        }
        .remove-lock-btn {
          background: transparent;
          color: #ef4444;
          border: 1px solid #ef4444;
        }
        .lock-status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(34, 197, 94, 0.15);
          border-radius: 30px;
          margin-bottom: 16px;
        }
        
        /* Security Checklist */
        .security-checklist__item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 14px;
        }
        .security-checklist__icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .security-checklist__title { font-size: 14px; margin-bottom: 4px; }
        .security-checklist__text { font-size: 12px; }
        
        /* Security Risks */
        .security-risk {
          position: relative;
          padding: 16px;
          padding-top: 44px;
        }
        .risk-icon {
          position: absolute;
          top: 14px;
          left: 14px;
        }
        .security-risk__label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .security-risk__value {
          display: block;
          font-size: 16px;
          margin: 4px 0;
        }
        .security-risk__desc { font-size: 11px; margin-top: 6px; }
        
        /* Settings */
        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .setting-info { flex: 1; }
        .setting-label { display: block; font-weight: bold; margin-bottom: 4px; }
        .setting-desc { font-size: 11px; color: var(--text-secondary); }
        .setting-select {
          padding: 8px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
        }
        .save-settings-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 16px;
          padding: 10px 20px;
          border-radius: 10px;
          background: var(--glow-teal);
          color: #07111f;
          font-weight: bold;
          border: none;
          cursor: pointer;
        }
        
        /* Coming Soon */
        .coming-soon-section {
          margin: 16px 0;
          padding: 12px;
          background: rgba(245, 158, 11, 0.05);
          border-radius: 12px;
          border: 1px dashed rgba(245, 158, 11, 0.2);
        }
        .coming-soon-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .setting-item.disabled {
          opacity: 0.6;
        }
        .coming-soon-badge {
          padding: 2px 10px;
          border-radius: 20px;
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        /* Toggle Switch */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-switch .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255,255,255,0.2);
          transition: 0.3s;
          border-radius: 24px;
        }
        .toggle-switch .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        .toggle-switch input:checked + .toggle-slider {
          background-color: var(--glow-teal);
        }
        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }
        
        /* Whitelist */
        .whitelist-add {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .whitelist-input {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          font-family: monospace;
          font-size: 12px;
        }
        .add-address-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 16px;
          border-radius: 10px;
          background: var(--glow-teal);
          color: #07111f;
          font-weight: bold;
          border: none;
          cursor: pointer;
        }
        .whitelist-list {
          max-height: 150px;
          overflow-y: auto;
        }
        .whitelist-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .whitelist-address {
          font-family: monospace;
          font-size: 12px;
        }
        .whitelist-actions {
          display: flex;
          gap: 4px;
        }
        .copy-address-btn, .remove-address-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }
        .copy-address-btn:hover { color: var(--glow-teal); }
        .remove-address-btn:hover { color: #ef4444; }
        .whitelist-empty, .whitelist-note {
          text-align: center;
          font-size: 12px;
        }
        
        /* Tips */
        .tip-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          margin-bottom: 8px;
        }
        
        /* Lock Screen */
        .security-page.locked {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
        }
        .lock-screen {
          text-align: center;
          padding: 40px;
          max-width: 400px;
          margin: 0 auto;
        }
        .lock-input {
          width: 100%;
          padding: 12px;
          margin: 20px 0;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          text-align: center;
          font-size: 20px;
          letter-spacing: 8px;
        }
        .unlock-btn, .logout-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          font-weight: bold;
          cursor: pointer;
          margin-bottom: 12px;
        }
        .unlock-btn {
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
          color: #07111f;
          border: none;
        }
        .logout-btn {
          background: transparent;
          color: #ef4444;
          border: 1px solid #ef4444;
        }
        .lock-error { color: #ef4444; font-size: 12px; margin-bottom: 12px; }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          position: relative;
          max-width: 400px;
          width: 90%;
          padding: 24px;
          background: rgba(0,0,0,0.95);
          border-radius: 24px;
          text-align: center;
        }
        .modal-close {
          position: absolute;
          top: 16px;
          right: 20px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
        }
        .modal-input {
          width: 100%;
          padding: 12px;
          margin: 12px 0;
          border-radius: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          text-align: center;
          font-size: 18px;
          letter-spacing: 4px;
        }
        .modal-error { color: #ef4444; font-size: 12px; margin: 8px 0; }
        .modal-confirm {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
          color: #07111f;
          font-weight: bold;
          border: none;
          cursor: pointer;
          margin-top: 12px;
        }
        
        .small { font-size: 12px; }
        .muted-text { color: var(--text-muted); }
        .soft-text { color: var(--text-secondary); }
        
        @media (max-width: 768px) {
          .network-warning { flex-direction: column; text-align: center; }
          .switch-network-btn { margin-left: 0; }
          .setting-item { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </section>
  )
}

export default SecurityPage





















// import './SecurityPage.css'
// import { useEffect, useState, useCallback } from 'react'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { ethers, keccak256, toUtf8Bytes } from 'ethers'
// import { useSpace } from '../../context/SpaceContext'

// const SecurityPage = () => {
//   const { isConnected, account, connect, switchToAmoy } = useWallet()
//   const { isOwnSpace, subjectAddress, switchToSelf } = useSpace()
//   const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()

//   // Security States
//   const [profileLocked, setProfileLocked] = useState(false)
//   const [lockPin, setLockPin] = useState('')
//   const [confirmPin, setConfirmPin] = useState('')
//   const [showLockModal, setShowLockModal] = useState(false)
//   const [showUnlockModal, setShowUnlockModal] = useState(false)
//   const [enteredPin, setEnteredPin] = useState('')
//   const [lockError, setLockError] = useState('')
//   const [unlockError, setUnlockError] = useState('')
//   const [isLocked, setIsLocked] = useState(false)
//   const [lastUnlockTime, setLastUnlockTime] = useState(null)
//   const [sessionTimeout, setSessionTimeout] = useState(30) // minutes
//   const [autoLockEnabled, setAutoLockEnabled] = useState(true)
  
//   // Security Settings
//   const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
//   const [emailAlerts, setEmailAlerts] = useState(true)
//   const [transactionConfirmations, setTransactionConfirmations] = useState(true)
//   const [addressWhitelist, setAddressWhitelist] = useState([])
//   const [newWhitelistAddress, setNewWhitelistAddress] = useState('')
  
//   // Security Status
//   const [securityScore, setSecurityScore] = useState(0)
//   const [securityChecks, setSecurityChecks] = useState({
//     walletConnected: false,
//     correctNetwork: false,
//     strongPassword: false,
//     backupPhrase: false,
//     hardwareWallet: false,
//     twoFactorEnabled: false
//   })
  
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [networkWarning, setNetworkWarning] = useState('')

//   // Check network
//   const AMOY_CHAIN_ID = '0x13882'
  
//   useEffect(() => {
//     const checkNetwork = async () => {
//       if (!window.ethereum) return
//       const chainId = await window.ethereum.request({ method: 'eth_chainId' })
//       setNetworkWarning(chainId !== AMOY_CHAIN_ID)
//     }
//     checkNetwork()
//   }, [])

//   // Load profile lock from localStorage
//   // useEffect(() => {
//   //   const savedLockPin = localStorage.getItem('ffn_profile_lock_pin')
//   //   const savedLockState = localStorage.getItem('ffn_profile_locked')
//   //   const savedSessionTimeout = localStorage.getItem('ffn_session_timeout')
//   //   const savedAutoLock = localStorage.getItem('ffn_auto_lock')
//   //   const savedTwoFactor = localStorage.getItem('ffn_2fa_enabled')
//   //   const savedEmailAlerts = localStorage.getItem('ffn_email_alerts')
//   //   const savedTxConfirmations = localStorage.getItem('ffn_tx_confirmations')
//   //   const savedWhitelist = localStorage.getItem('ffn_address_whitelist')
    
//   //   if (savedLockPin) {
//   //     setProfileLocked(true)
//   //     if (savedLockState === 'locked') {
//   //       setIsLocked(true)
//   //     }
//   //   }
//   //   if (savedSessionTimeout) setSessionTimeout(parseInt(savedSessionTimeout))
//   //   if (savedAutoLock) setAutoLockEnabled(savedAutoLock === 'true')
//   //   if (savedTwoFactor) setTwoFactorEnabled(savedTwoFactor === 'true')
//   //   if (savedEmailAlerts) setEmailAlerts(savedEmailAlerts === 'true')
//   //   if (savedTxConfirmations) setTxConfirmations(savedTxConfirmations === 'true')
//   //   if (savedWhitelist) setAddressWhitelist(JSON.parse(savedWhitelist))
//   // }, [])


//   // Load profile lock from localStorage
// useEffect(() => {
//   const savedLockPin = localStorage.getItem('ffn_profile_lock_pin')
//   const savedLockState = localStorage.getItem('ffn_profile_locked')
//   const savedSessionTimeout = localStorage.getItem('ffn_session_timeout')
//   const savedAutoLock = localStorage.getItem('ffn_auto_lock')
//   const savedTwoFactor = localStorage.getItem('ffn_2fa_enabled')
//   const savedEmailAlerts = localStorage.getItem('ffn_email_alerts')
//   const savedTxConfirmations = localStorage.getItem('ffn_tx_confirmations')
//   const savedWhitelist = localStorage.getItem('ffn_address_whitelist')
  
//   if (savedLockPin) {
//     setProfileLocked(true)
//     if (savedLockState === 'locked') {
//       setIsLocked(true)
//     }
//   }
//   if (savedSessionTimeout) setSessionTimeout(parseInt(savedSessionTimeout))
//   if (savedAutoLock) setAutoLockEnabled(savedAutoLock === 'true')
//   if (savedTwoFactor) setTwoFactorEnabled(savedTwoFactor === 'true')
//   if (savedEmailAlerts) setEmailAlerts(savedEmailAlerts === 'true')
//   if (savedTxConfirmations) setTransactionConfirmations(savedTxConfirmations === 'true')  // ✅ FIXED
//   if (savedWhitelist) setAddressWhitelist(JSON.parse(savedWhitelist))
// }, [])

//   // Auto-lock session timer
//   useEffect(() => {
//     if (!autoLockEnabled || !profileLocked || !isLocked) return
    
//     const timer = setTimeout(() => {
//       if (lastUnlockTime) {
//         const minutesSinceUnlock = (Date.now() - lastUnlockTime) / (1000 * 60)
//         if (minutesSinceUnlock >= sessionTimeout) {
//           setIsLocked(true)
//           localStorage.setItem('ffn_profile_locked', 'locked')
//         }
//       }
//     }, 60000) // Check every minute
    
//     return () => clearTimeout(timer)
//   }, [lastUnlockTime, autoLockEnabled, sessionTimeout, profileLocked, isLocked])

//   // Update security score
//   useEffect(() => {
//     let score = 0
//     if (securityChecks.walletConnected) score += 15
//     if (securityChecks.correctNetwork) score += 10
//     if (securityChecks.strongPassword) score += 20
//     if (securityChecks.backupPhrase) score += 25
//     if (securityChecks.hardwareWallet) score += 20
//     if (securityChecks.twoFactorEnabled) score += 10
//     setSecurityScore(score)
//   }, [securityChecks])

//   // Update security checks based on wallet state
//   useEffect(() => {
//     setSecurityChecks(prev => ({
//       ...prev,
//       walletConnected: isConnected,
//       correctNetwork: !networkWarning,
//       twoFactorEnabled: twoFactorEnabled
//     }))
//   }, [isConnected, networkWarning, twoFactorEnabled])

//   // Handle profile lock setup
//   const handleSetupLock = () => {
//     if (!/^\d{4,6}$/.test(lockPin)) {
//       setLockError('PIN must be 4 to 6 digits')
//       return
//     }

//     if (lockPin !== confirmPin) {
//       setLockError('PINs do not match')
//       return
//     }

//     const hashedPin = keccak256(toUtf8Bytes(lockPin))

//     localStorage.setItem('ffn_profile_lock_pin', hashedPin)
//     localStorage.setItem('ffn_profile_locked', 'locked')
//     setProfileLocked(true)
//     setIsLocked(true)
//     setShowLockModal(false)
//     setLockPin('')
//     setConfirmPin('')
//     setLockError('')
//   }

//   // Handle profile unlock
//   const handleUnlock = () => {
//     const savedPin = localStorage.getItem('ffn_profile_lock_pin')
//     const enteredHashedPin = keccak256(toUtf8Bytes(enteredPin))

//     if (enteredHashedPin === savedPin) {
//       setIsLocked(false)
//       setLastUnlockTime(Date.now())
//       localStorage.setItem('ffn_profile_locked', 'unlocked')
//       setShowUnlockModal(false)
//       setEnteredPin('')
//       setUnlockError('')
//     } else {
//       setUnlockError('Invalid PIN')
//     }
//   }

//   // Handle lock now
//   const handleLockNow = () => {
//     setIsLocked(true)
//     localStorage.setItem('ffn_profile_locked', 'locked')
//   }

//   // Handle remove lock
//   const handleRemoveLock = () => {
//     localStorage.removeItem('ffn_profile_lock_pin')
//     localStorage.removeItem('ffn_profile_locked')
//     setProfileLocked(false)
//     setIsLocked(false)
//   }

//   // Handle add to whitelist
//   const handleAddToWhitelist = () => {
//     if (newWhitelistAddress && ethers.isAddress(newWhitelistAddress)) {
//       const updated = [...addressWhitelist, newWhitelistAddress]
//       setAddressWhitelist(updated)
//       localStorage.setItem('ffn_address_whitelist', JSON.stringify(updated))
//       setNewWhitelistAddress('')
//     }
//   }

//   // Handle remove from whitelist
//   const handleRemoveFromWhitelist = (address) => {
//     const updated = addressWhitelist.filter(a => a !== address)
//     setAddressWhitelist(updated)
//     localStorage.setItem('ffn_address_whitelist', JSON.stringify(updated))
//   }

//   // Save settings
//   const saveSettings = () => {
//     localStorage.setItem('ffn_session_timeout', String(sessionTimeout))
//     localStorage.setItem('ffn_auto_lock', String(autoLockEnabled))
//     localStorage.setItem('ffn_2fa_enabled', String(twoFactorEnabled))
//     localStorage.setItem('ffn_email_alerts', String(emailAlerts))
//     localStorage.setItem('ffn_tx_confirmations', String(transactionConfirmations))
    
//     setSecurityChecks(prev => ({ ...prev, twoFactorEnabled }))
//   }

//   // Get security score color
//   const getScoreColor = () => {
//     if (securityScore >= 80) return '#28a745'
//     if (securityScore >= 50) return '#f59e0b'
//     return '#ef4444'
//   }

//   // Get score label
//   const getScoreLabel = () => {
//     if (securityScore >= 80) return 'Excellent'
//     if (securityScore >= 60) return 'Good'
//     if (securityScore >= 40) return 'Fair'
//     return 'Needs Improvement'
//   }

//   if (!isConnected) {
//     return (
//       <section className="security-page">
//         <div className="security-hero">
//           <div className="security-hero__content">
//             <div className="security-hero__eyebrow glass-panel">
//               <span className="security-hero__eyebrow-dot" />
//               <span className="security-hero__eyebrow-text">Secure Your Account</span>
//             </div>
//             <div className="security-hero__text-block">
//               <h1 className="security-hero__title">Security</h1>
//               <p className="security-hero__description soft-text">
//                 Connect your wallet to view your security status and enable protection features.
//               </p>
//             </div>
//             <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
//           </div>
//           <div className="security-hero__visual glass-panel">
//             <div className="security-hero__visual-box">
//               <div style={{ textAlign: 'center' }}>
//                 <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
//                 <div>Connect to secure</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>
//     )
//   }

//   // Visitor-mode guard
//   if (!isOwnSpace) {
//     return (
//       <section className="security-page">
//         <div className="security-hero">
//           <div className="security-hero__content">
//             <div className="security-hero__eyebrow glass-panel">
//               <span className="security-hero__eyebrow-dot" />
//               <span className="security-hero__eyebrow-text">Own Space Required</span>
//             </div>

//             <div className="security-hero__text-block">
//               <h1 className="security-hero__title">Safety & Control Center</h1>
//               <p className="security-hero__description soft-text">
//                 Safety controls can only be changed in your own space. You are currently viewing
//                 another space.
//               </p>
//               <div className="small muted-text">
//                 Viewing: {subjectAddress ? `${subjectAddress.slice(0, 8)}...${subjectAddress.slice(-6)}` : 'Unknown'}
//               </div>
//             </div>

//             <button onClick={switchToSelf} className="connect-wallet-btn">
//               Return to My Space
//             </button>
//           </div>

//           <div className="security-hero__visual glass-panel">
//             <div className="security-hero__visual-box">
//               <div style={{ textAlign: 'center' }}>
//                 <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
//                 <div>Safety settings are private to your own space</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>
//     )
//   }

//   // Show locked screen
//   if (profileLocked && isLocked) {
//     return (
//       <section className="security-page locked">
//         <div className="lock-screen glass-panel">
//           <div className="lock-icon">🔒</div>
//           <h2>Profile Locked</h2>
//           <p>Enter your PIN to access security settings</p>
//           <input
//             type="password"
//             className="lock-input"
//             placeholder="Enter PIN"
//             value={enteredPin}
//             onChange={(e) => setEnteredPin(e.target.value)}
//             maxLength={6}
//             pattern="[0-9]*"
//           />
//           {unlockError && <div className="lock-error">{unlockError}</div>}
//           <button className="unlock-btn" onClick={handleUnlock}>Unlock</button>
//           <button className="logout-btn" onClick={handleRemoveLock}>Remove Lock (Reset)</button>
//         </div>
//       </section>
//     )
//   }

//   if (contractsLoading) {
//     return (
//       <section className="security-page">
//         <div className="loading-container">
//           <div className="spinner"></div>
//           <p>Loading security data...</p>
//         </div>
//       </section>
//     )
//   }

//   return (
//     <section className="security-page">
//       {/* Hero Section */}
//       <div className="security-hero">
//         <div className="security-hero__content">
//           <div className="security-hero__eyebrow glass-panel">
//             <span className="security-hero__eyebrow-dot" />
//             <span className="security-hero__eyebrow-text">
//               Account protection, wallet awareness, and safe usage
//             </span>
//           </div>

//           <div className="security-hero__text-block">
//             <h1 className="security-hero__title">Safety & Control Center</h1>
//             <p className="security-hero__description soft-text">
//               Review your wallet-safety posture, manage app-level protection controls, and follow best
//               practices for safer participation. Core blockchain security still depends on your wallet,
//               network checks, and signed actions.
//             </p>
//             <div className="small muted-text">Last updated: {lastUpdated}</div>
//           </div>

//           <div className="security-hero__chips">
//             <span className="security-hero__chip glass-panel">
//               {isConnected ? '✓ Wallet Connected' : '⚠ Wallet Disconnected'}
//             </span>
//             <span className="security-hero__chip glass-panel">
//               {!networkWarning ? '✓ Correct Network' : '⚠ Wrong Network'}
//             </span>
//             <span className="security-hero__chip glass-panel">
//               {profileLocked ? '🔒 Profile Locked' : '🔓 Profile Unlocked'}
//             </span>
//           </div>
//         </div>

//         <div className="security-hero__visual glass-panel">
//           <div className="security-hero__visual-box">
//             <div className="security-score">
//               <div className="score-circle" style={{ '--score': securityScore }}>
//                 <span className="score-value">{securityScore}</span>
//                 <span className="score-label">Security Score</span>
//               </div>
//               <div className="score-status" style={{ color: getScoreColor() }}>{getScoreLabel()}</div>
//             </div>
//           </div>
//           <p className="security-hero__visual-note muted-text">
//             Your security score based on completed safety measures
//           </p>
//         </div>
//       </div>

//       {/* Network Warning */}
//       {networkWarning && (
//         <div className="network-warning glass-panel">
//           <span className="warning-icon">⚠️</span>
//           <div>
//             <strong>Wrong Network Detected</strong>
//             <p>Please switch to Polygon Amoy Testnet for secure transactions.</p>
//           </div>
//           <button className="switch-network-btn" onClick={switchToAmoy}>Switch Network</button>
//         </div>
//       )}

//       {/* Main Grid */}
//       <div className="security-main-grid">
//         <div className="security-main-grid__left">
          
//           {/* PROFILE LOCK SECTION */}
//           <section className="security-profile-lock glass-panel">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 Profile Lock
//               </span>
//               <h2 className="security-section-heading__title">
//                 Protect your account with a PIN
//               </h2>
//             </div>

//             {!profileLocked ? (
//               <div className="lock-setup">
//                 <p className="lock-description soft-text">
//                   Set up a 4-6 digit PIN to lock your profile when you're away. This adds an extra layer of security to your account settings.
//                 </p>
//                 <button className="setup-lock-btn" onClick={() => setShowLockModal(true)}>
//                   🔒 Set Up Profile Lock
//                 </button>
//               </div>
//             ) : (
//               <div className="lock-status">
//                 <div className="lock-status-indicator active">
//                   <span className="lock-icon-small">🔒</span>
//                   <span>Profile Lock is ACTIVE</span>
//                 </div>
//                 <div className="lock-actions">
//                   <button className="lock-now-btn" onClick={handleLockNow}>Lock Now</button>
//                   <button className="remove-lock-btn" onClick={handleRemoveLock}>Remove Lock</button>
//                 </div>
//               </div>
//             )}
//           </section>

//           {/* SECURITY CHECKLIST */}
//           <section className="security-checklist glass-panel">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 Security Checklist
//               </span>
//               <h2 className="security-section-heading__title">
//                 Core behaviors every user should follow
//               </h2>
//             </div>

//             <div className="security-checklist__list">
//               <div className={`security-checklist__item ${securityChecks.walletConnected ? 'completed' : ''}`}>
//                 <span className="security-checklist__icon">🛡️</span>
//                 <div>
//                   <h3 className="security-checklist__title">Wallet Connected Securely</h3>
//                   <p className="security-checklist__text soft-text">
//                     Your wallet is connected and ready for secure transactions.
//                   </p>
//                 </div>
//                 <span className="check-status">{securityChecks.walletConnected ? '✓' : '○'}</span>
//               </div>

//               <div className={`security-checklist__item ${securityChecks.correctNetwork ? 'completed' : ''}`}>
//                 <span className="security-checklist__icon">⚠️</span>
//                 <div>
//                   <h3 className="security-checklist__title">Confirm the correct network</h3>
//                   <p className="security-checklist__text soft-text">
//                     Always verify you're on Polygon Amoy Testnet before signing transactions.
//                   </p>
//                 </div>
//                 <span className="check-status">{securityChecks.correctNetwork ? '✓' : '○'}</span>
//               </div>

//               <div className={`security-checklist__item ${securityChecks.strongPassword ? 'completed' : ''}`}>
//                 <span className="security-checklist__icon">🔑</span>
//                 <div>
//                   <h3 className="security-checklist__title">Use a strong password</h3>
//                   <p className="security-checklist__text soft-text">
//                     Ensure your wallet password is strong and unique.
//                   </p>
//                 </div>
//                 <span className="check-status">{securityChecks.strongPassword ? '✓' : '○'}</span>
//               </div>

//               <div className={`security-checklist__item ${securityChecks.backupPhrase ? 'completed' : ''}`}>
//                 <span className="security-checklist__icon">📝</span>
//                 <div>
//                   <h3 className="security-checklist__title">Backup your seed phrase</h3>
//                   <p className="security-checklist__text soft-text">
//                     Store your recovery phrase in a secure, offline location.
//                   </p>
//                 </div>
//                 <span className="check-status">{securityChecks.backupPhrase ? '✓' : '○'}</span>
//               </div>

//               <div className={`security-checklist__item ${securityChecks.hardwareWallet ? 'completed' : ''}`}>
//                 <span className="security-checklist__icon">💳</span>
//                 <div>
//                   <h3 className="security-checklist__title">Use a hardware wallet</h3>
//                   <p className="security-checklist__text soft-text">
//                     Hardware wallets provide the highest level of security for large portfolios.
//                   </p>
//                 </div>
//                 <span className="check-status">{securityChecks.hardwareWallet ? '✓' : '○'}</span>
//               </div>
//             </div>
//           </section>

//           {/* COMMON RISKS */}
//           <section className="security-risks glass-panel">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 Common Risks
//               </span>
//               <h2 className="security-section-heading__title">
//                 Issues users should be able to identify quickly
//               </h2>
//             </div>

//             <div className="security-risks__grid">
//               <div className="security-risk glass-panel">
//                 <span className="security-risk__icon">🌐</span>
//                 <span className="security-risk__label muted-text">Risk</span>
//                 <strong className="security-risk__value">Wrong Network</strong>
//                 <p className="security-risk__desc soft-text">Always verify you're on the correct chain</p>
//               </div>

//               <div className="security-risk glass-panel">
//                 <span className="security-risk__icon">🎭</span>
//                 <span className="security-risk__label muted-text">Risk</span>
//                 <strong className="security-risk__value">Fake Support</strong>
//                 <p className="security-risk__desc soft-text">Official staff never DM first</p>
//               </div>

//               <div className="security-risk glass-panel">
//                 <span className="security-risk__icon">⚠️</span>
//                 <span className="security-risk__label muted-text">Risk</span>
//                 <strong className="security-risk__value">Unsafe Approval</strong>
//                 <p className="security-risk__desc soft-text">Review token approvals before signing</p>
//               </div>

//               <div className="security-risk glass-panel">
//                 <span className="security-risk__icon">🎣</span>
//                 <span className="security-risk__label muted-text">Risk</span>
//                 <strong className="security-risk__value">Phishing Links</strong>
//                 <p className="security-risk__desc soft-text">Only use official FFN links</p>
//               </div>

//               <div className="security-risk glass-panel">
//                 <span className="security-risk__icon">💸</span>
//                 <span className="security-risk__label muted-text">Risk</span>
//                 <strong className="security-risk__value">Rug Pull</strong>
//                 <p className="security-risk__desc soft-text">Research projects before investing</p>
//               </div>

//               <div className="security-risk glass-panel">
//                 <span className="security-risk__icon">📧</span>
//                 <span className="security-risk__label muted-text">Risk</span>
//                 <strong className="security-risk__value">Email Scams</strong>
//                 <p className="security-risk__desc soft-text">Verify sender addresses carefully</p>
//               </div>
//             </div>
//           </section>
//         </div>

//         <div className="security-main-grid__right">
          
//           {/* SECURITY SETTINGS */}
//           <section className="security-settings glass-panel">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 Security Settings
//               </span>
//               <h2 className="security-section-heading__title">
//                 Configure your protection preferences
//               </h2>
//             </div>

//             <div className="settings-list">
//               <div className="setting-item">
//                 <div className="setting-info">
//                   <span className="setting-label">Session Timeout</span>
//                   <span className="setting-desc">Auto-lock after inactivity</span>
//                 </div>
//                 <select 
//                   className="setting-select"
//                   value={sessionTimeout}
//                   onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
//                 >
//                   <option value="15">15 minutes</option>
//                   <option value="30">30 minutes</option>
//                   <option value="60">1 hour</option>
//                   <option value="120">2 hours</option>
//                 </select>
//               </div>

//               <div className="setting-item">
//                 <div className="setting-info">
//                   <span className="setting-label">Auto-Lock</span>
//                   <span className="setting-desc">Automatically lock profile after timeout</span>
//                 </div>
//                 <label className="toggle-switch">
//                   <input 
//                     type="checkbox" 
//                     checked={autoLockEnabled}
//                     onChange={(e) => setAutoLockEnabled(e.target.checked)}
//                   />
//                   <span className="toggle-slider"></span>
//                 </label>
//               </div>

//               <div className="setting-item">
//                 <div className="setting-info">
//                   <span className="setting-label">Two-Factor Authentication</span>
//                   <span className="setting-desc">Planned advanced protection feature (not yet active)</span>
//                 </div>
//                 <label className="toggle-switch">
//                   <input 
//                     type="checkbox" 
//                     checked={twoFactorEnabled}
//                     disabled
//                     onChange={() => {}}
//                   />
//                   <span className="toggle-slider"></span>
//                 </label>
//               </div>

//               <div className="setting-item">
//                 <div className="setting-info">
//                   <span className="setting-label">Email Security Alerts</span>
//                   <span className="setting-desc">Planned alert system (not yet wired)</span>
//                 </div>
//                 <label className="toggle-switch">
//                   <input 
//                     type="checkbox" 
//                     checked={emailAlerts}
//                     disabled
//                     onChange={() => {}}
//                   />
//                   <span className="toggle-slider"></span>
//                 </label>
//               </div>

//               <div className="setting-item">
//                 <div className="setting-info">
//                   <span className="setting-label">Transaction Confirmations</span>
//                   <span className="setting-desc">Require confirmation for all transactions</span>
//                 </div>
//                 <label className="toggle-switch">
//                   <input 
//                     type="checkbox" 
//                     checked={transactionConfirmations}
//                     onChange={(e) => setTransactionConfirmations(e.target.checked)}
//                   />
//                   <span className="toggle-slider"></span>
//                 </label>
//               </div>

//               <button className="save-settings-btn" onClick={saveSettings}>
//                 Save Security Settings
//               </button>

//               <p className="soft-text" style={{ fontSize: '12px', marginTop: '12px' }}>
//                 Current profile-lock behavior is an app-level convenience layer for this device. Sensitive
//                 wallet actions still rely on your connected wallet and signed confirmations.
//               </p>
//             </div>
//           </section>

//           {/* ADDRESS WHITELIST */}
//           <section className="security-whitelist glass-panel">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 Address Whitelist
//               </span>
//               <h2 className="security-section-heading__title">
//                 Trusted addresses for transactions
//               </h2>
//             </div>

//             <div className="whitelist-add">
//               <input
//                 type="text"
//                 className="whitelist-input"
//                 placeholder="Enter wallet address (0x...)"
//                 value={newWhitelistAddress}
//                 onChange={(e) => setNewWhitelistAddress(e.target.value)}
//               />
//               <button className="add-address-btn" onClick={handleAddToWhitelist}>Add</button>
//             </div>

//             <div className="whitelist-list">
//               {addressWhitelist.length === 0 ? (
//                 <p className="whitelist-empty soft-text">No whitelisted addresses yet</p>
//               ) : (
//                 addressWhitelist.map((addr, idx) => (
//                   <div key={idx} className="whitelist-item">
//                     <span className="whitelist-address">{addr.slice(0, 10)}...{addr.slice(-8)}</span>
//                     <button className="remove-address-btn" onClick={() => handleRemoveFromWhitelist(addr)}>×</button>
//                   </div>
//                 ))
//               )}
//             </div>
//             <p className="whitelist-note soft-text">Transactions to whitelisted addresses require less confirmation</p>
//           </section>

//           {/* SECURITY STATUS */}
//           <section className="security-status glass-panel">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 Security Signals
//               </span>
//               <h2 className="security-section-heading__title">
//                 Awareness and environment overview
//               </h2>
//             </div>

//             <div className="security-status__list">
//               <div className={`security-status__card ${isConnected ? 'good' : 'warning'}`}>
//                 <span className="security-status__label muted-text">Wallet State</span>
//                 <strong className="security-status__value">{isConnected ? 'Connected' : 'Disconnected'}</strong>
//                 <span className="status-icon">{isConnected ? '✓' : '⚠'}</span>
//               </div>

//               <div className={`security-status__card ${!networkWarning ? 'good' : 'warning'}`}>
//                 <span className="security-status__label muted-text">Network Check</span>
//                 <strong className="security-status__value">{!networkWarning ? 'Passed' : 'Failed'}</strong>
//                 <span className="status-icon">{!networkWarning ? '✓' : '⚠'}</span>
//               </div>

//               <div className={`security-status__card ${profileLocked ? 'good' : 'warning'}`}>
//                 <span className="security-status__label muted-text">Profile Lock</span>
//                 <strong className="security-status__value">{profileLocked ? 'Active' : 'Inactive'}</strong>
//                 <span className="status-icon">{profileLocked ? '✓' : '○'}</span>
//               </div>

//               <div className={`security-status__card ${twoFactorEnabled ? 'good' : 'warning'}`}>
//                 <span className="security-status__label muted-text">2FA Status</span>
//                 <strong className="security-status__value">{twoFactorEnabled ? 'Enabled' : 'Disabled'}</strong>
//                 <span className="status-icon">{twoFactorEnabled ? '✓' : '○'}</span>
//               </div>
//             </div>
//           </section>

//           {/* SECURITY TIPS */}
//           <section className="security-tips glass-panel">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 Pro Tips
//               </span>
//               <h2 className="security-section-heading__title">
//                 Expert security recommendations
//               </h2>
//             </div>

//             <div className="tips-list">
//               <div className="tip-item">
//                 <span className="tip-icon">🔐</span>
//                 <div>
//                   <strong>Use a dedicated wallet</strong>
//                   <p className="soft-text">Consider using a separate wallet for DeFi interactions</p>
//                 </div>
//               </div>
//               <div className="tip-item">
//                 <span className="tip-icon">📱</span>
//                 <div>
//                   <strong>Enable mobile alerts</strong>
//                   <p className="soft-text">Get real-time notifications for all transactions</p>
//                 </div>
//               </div>
//               <div className="tip-item">
//                 <span className="tip-icon">🔍</span>
//                 <div>
//                   <strong>Revoke unused approvals</strong>
//                   <p className="soft-text">Regularly review and revoke token approvals</p>
//                 </div>
//               </div>
//               <div className="tip-item">
//                 <span className="tip-icon">📝</span>
//                 <div>
//                   <strong>Keep software updated</strong>
//                   <p className="soft-text">Always use the latest version of your wallet and browser</p>
//                 </div>
//               </div>
//             </div>
//           </section>
//         </div>
//       </div>

//       {/* Lock Setup Modal */}
//       {showLockModal && (
//         <div className="modal-overlay" onClick={() => setShowLockModal(false)}>
//           <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
//             <button className="modal-close" onClick={() => setShowLockModal(false)}>×</button>
//             <h3>Set Up Profile Lock</h3>
//             <p>Create a 4-6 digit PIN to secure your profile settings</p>
//             <input
//               type="password"
//               className="modal-input"
//               placeholder="Enter PIN"
//               value={lockPin}
//               onChange={(e) => setLockPin(e.target.value)}
//               maxLength={6}
//               pattern="[0-9]*"
//             />
//             <input
//               type="password"
//               className="modal-input"
//               placeholder="Confirm PIN"
//               value={confirmPin}
//               onChange={(e) => setConfirmPin(e.target.value)}
//               maxLength={6}
//               pattern="[0-9]*"
//             />
//             {lockError && <div className="modal-error">{lockError}</div>}
//             <button className="modal-confirm" onClick={handleSetupLock}>Enable Lock</button>
//           </div>
//         </div>
//       )}

//       <style>{`
//         .connect-wallet-btn {
//           padding: 12px 28px;
//           border-radius: 12px;
//           background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//           color: #07111f;
//           font-weight: bold;
//           border: none;
//           cursor: pointer;
//           font-size: 16px;
//           width: fit-content;
//         }
        
//         .spinner {
//           width: 40px;
//           height: 40px;
//           border: 3px solid rgba(77, 163, 255, 0.2);
//           border-top-color: var(--glow-blue);
//           border-radius: 50%;
//           animation: spin 0.8s linear infinite;
//           margin: 0 auto 16px;
//         }
//         @keyframes spin {
//           to { transform: rotate(360deg); }
//         }
        
//         .loading-container {
//           text-align: center;
//           padding: 60px;
//         }
        
//         /* Security Score */
//         .security-score {
//           text-align: center;
//         }
//         .score-circle {
//           width: 120px;
//           height: 120px;
//           border-radius: 50%;
//           background: conic-gradient(var(--glow-teal) 0deg, var(--glow-teal) calc(var(--score) * 3.6deg), rgba(255,255,255,0.1) calc(var(--score) * 3.6deg));
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: center;
//           margin: 0 auto 12px;
//           position: relative;
//         }
//         .score-circle::before {
//           content: '';
//           position: absolute;
//           width: 100px;
//           height: 100px;
//           border-radius: 50%;
//           background: var(--glass-bg-strong);
//         }
//         .score-value {
//           position: relative;
//           font-size: 36px;
//           font-weight: bold;
//           z-index: 1;
//         }
//         .score-label {
//           position: relative;
//           font-size: 10px;
//           z-index: 1;
//         }
//         .score-status {
//           font-size: 14px;
//           font-weight: bold;
//         }
        
//         /* Network Warning */
//         .network-warning {
//           display: flex;
//           align-items: center;
//           gap: 16px;
//           padding: 16px;
//           background: rgba(239, 68, 68, 0.15);
//           border: 1px solid #ef4444;
//           border-radius: 16px;
//           margin-bottom: 20px;
//           flex-wrap: wrap;
//         }
//         .warning-icon {
//           font-size: 24px;
//         }
//         .switch-network-btn {
//           margin-left: auto;
//           padding: 8px 20px;
//           border-radius: 10px;
//           background: #ef4444;
//           color: white;
//           border: none;
//           cursor: pointer;
//         }
        
//         /* Profile Lock */
//         .lock-setup, .lock-status {
//           text-align: center;
//         }
//         .lock-description {
//           margin-bottom: 16px;
//         }
//         .setup-lock-btn, .lock-now-btn, .remove-lock-btn {
//           padding: 12px 24px;
//           border-radius: 12px;
//           font-weight: bold;
//           cursor: pointer;
//         }
//         .setup-lock-btn {
//           background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//           color: #07111f;
//           border: none;
//         }
//         .lock-now-btn {
//           background: #f59e0b;
//           color: white;
//           border: none;
//           margin-right: 12px;
//         }
//         .remove-lock-btn {
//           background: rgba(239, 68, 68, 0.2);
//           color: #ef4444;
//           border: 1px solid #ef4444;
//         }
//         .lock-status-indicator {
//           display: inline-flex;
//           align-items: center;
//           gap: 8px;
//           padding: 8px 16px;
//           background: rgba(29, 233, 182, 0.15);
//           border-radius: 30px;
//           margin-bottom: 16px;
//         }
//         .lock-icon-small { font-size: 16px; }
        
//         /* Checklist Items */
//         .security-checklist__item {
//           position: relative;
//           padding-right: 50px;
//         }
//         .check-status {
//           position: absolute;
//           right: 16px;
//           top: 50%;
//           transform: translateY(-50%);
//           font-size: 20px;
//           font-weight: bold;
//         }
//         .security-checklist__item.completed .check-status {
//           color: var(--glow-teal);
//         }
        
//         /* Security Risks Grid */
//         .security-risk {
//           position: relative;
//           padding-top: 40px;
//         }
//         .security-risk__icon {
//           position: absolute;
//           top: 12px;
//           left: 12px;
//           font-size: 20px;
//         }
//         .security-risk__desc {
//           font-size: 11px;
//           margin-top: 8px;
//         }
        
//         /* Security Settings */
//         .settings-list {
//           display: flex;
//           flex-direction: column;
//           gap: 16px;
//         }
//         .setting-item {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           flex-wrap: wrap;
//           gap: 12px;
//         }
//         .setting-info {
//           flex: 1;
//         }
//         .setting-label {
//           display: block;
//           font-weight: bold;
//           margin-bottom: 4px;
//         }
//         .setting-desc {
//           font-size: 11px;
//           color: var(--text-secondary);
//         }
//         .setting-select {
//           padding: 8px 16px;
//           border-radius: 10px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           cursor: pointer;
//         }
//         .save-settings-btn {
//           margin-top: 8px;
//           padding: 10px;
//           border-radius: 10px;
//           background: var(--glow-teal);
//           color: #07111f;
//           font-weight: bold;
//           border: none;
//           cursor: pointer;
//         }
        
//         /* Toggle Switch */
//         .toggle-switch {
//           position: relative;
//           display: inline-block;
//           width: 50px;
//           height: 24px;
//         }
//         .toggle-switch input {
//           opacity: 0;
//           width: 0;
//           height: 0;
//         }
//         .toggle-switch .toggle-slider {
//           position: absolute;
//           cursor: pointer;
//           top: 0;
//           left: 0;
//           right: 0;
//           bottom: 0;
//           background-color: rgba(255,255,255,0.2);
//           transition: 0.3s;
//           border-radius: 24px;
//         }
//         .toggle-switch .toggle-slider:before {
//           position: absolute;
//           content: "";
//           height: 18px;
//           width: 18px;
//           left: 3px;
//           bottom: 3px;
//           background-color: white;
//           transition: 0.3s;
//           border-radius: 50%;
//         }
//         .toggle-switch input:checked + .toggle-slider {
//           background-color: var(--glow-teal);
//         }
//         .toggle-switch input:checked + .toggle-slider:before {
//           transform: translateX(26px);
//         }
//         .toggle-switch input:disabled + .toggle-slider {
//           opacity: 0.5;
//           cursor: not-allowed;
//         }
        
//         /* Address Whitelist */
//         .whitelist-add {
//           display: flex;
//           gap: 8px;
//           margin-bottom: 16px;
//         }
//         .whitelist-input {
//           flex: 1;
//           padding: 10px;
//           border-radius: 10px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           font-family: monospace;
//         }
//         .add-address-btn {
//           padding: 10px 20px;
//           border-radius: 10px;
//           background: var(--glow-teal);
//           color: #07111f;
//           font-weight: bold;
//           border: none;
//           cursor: pointer;
//         }
//         .whitelist-list {
//           max-height: 150px;
//           overflow-y: auto;
//         }
//         .whitelist-item {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           padding: 8px;
//           border-bottom: 1px solid rgba(255,255,255,0.1);
//         }
//         .whitelist-address {
//           font-family: monospace;
//           font-size: 12px;
//         }
//         .remove-address-btn {
//           background: none;
//           border: none;
//           color: #ef4444;
//           font-size: 18px;
//           cursor: pointer;
//         }
//         .whitelist-empty, .whitelist-note {
//           text-align: center;
//           font-size: 12px;
//         }
        
//         /* Security Status Cards */
//         .security-status__card {
//           position: relative;
//         }
//         .status-icon {
//           position: absolute;
//           right: 16px;
//           top: 50%;
//           transform: translateY(-50%);
//           font-size: 18px;
//         }
//         .security-status__card.good .status-icon {
//           color: var(--glow-teal);
//         }
//         .security-status__card.warning .status-icon {
//           color: #f59e0b;
//         }
        
//         /* Security Tips */
//         .tips-list {
//           display: flex;
//           flex-direction: column;
//           gap: 12px;
//         }
//         .tip-item {
//           display: flex;
//           align-items: flex-start;
//           gap: 12px;
//           padding: 10px;
//           background: rgba(255,255,255,0.03);
//           border-radius: 12px;
//         }
//         .tip-icon {
//           font-size: 20px;
//         }
        
//         /* Lock Screen */
//         .security-page.locked {
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           min-height: 60vh;
//         }
//         .lock-screen {
//           text-align: center;
//           padding: 40px;
//           max-width: 400px;
//           margin: 0 auto;
//         }
//         .lock-icon {
//           font-size: 64px;
//           margin-bottom: 20px;
//         }
//         .lock-input {
//           width: 100%;
//           padding: 12px;
//           margin: 20px 0;
//           border-radius: 12px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           text-align: center;
//           font-size: 20px;
//           letter-spacing: 8px;
//         }
//         .unlock-btn, .logout-btn {
//           width: 100%;
//           padding: 12px;
//           border-radius: 12px;
//           font-weight: bold;
//           cursor: pointer;
//           margin-bottom: 12px;
//         }
//         .unlock-btn {
//           background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//           color: #07111f;
//           border: none;
//         }
//         .logout-btn {
//           background: rgba(239, 68, 68, 0.2);
//           color: #ef4444;
//           border: 1px solid #ef4444;
//         }
//         .lock-error {
//           color: #ef4444;
//           font-size: 12px;
//           margin-bottom: 12px;
//         }
        
//         /* Modal */
//         .modal-overlay {
//           position: fixed;
//           top: 0;
//           left: 0;
//           right: 0;
//           bottom: 0;
//           background: rgba(0,0,0,0.8);
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           z-index: 1000;
//         }
//         .modal-content {
//           position: relative;
//           max-width: 400px;
//           width: 90%;
//           padding: 24px;
//           background: rgba(0,0,0,0.95);
//           border-radius: 24px;
//           text-align: center;
//         }
//         .modal-close {
//           position: absolute;
//           top: 16px;
//           right: 20px;
//           background: none;
//           border: none;
//           color: white;
//           font-size: 24px;
//           cursor: pointer;
//         }
//         .modal-input {
//           width: 100%;
//           padding: 12px;
//           margin: 12px 0;
//           border-radius: 10px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           text-align: center;
//           font-size: 18px;
//           letter-spacing: 4px;
//         }
//         .modal-error {
//           color: #ef4444;
//           font-size: 12px;
//           margin: 8px 0;
//         }
//         .modal-confirm {
//           width: 100%;
//           padding: 12px;
//           border-radius: 10px;
//           background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//           color: #07111f;
//           font-weight: bold;
//           border: none;
//           cursor: pointer;
//           margin-top: 12px;
//         }
        
//         .small { font-size: 12px; }
//         .muted-text { color: var(--text-secondary); }
//         .soft-text { color: var(--text-secondary); }
        
//         @media (max-width: 768px) {
//           .network-warning { flex-direction: column; text-align: center; }
//           .switch-network-btn { margin-left: 0; }
//           .setting-item { flex-direction: column; align-items: flex-start; }
//           .security-risk__grid { grid-template-columns: 1fr; }
//         }
//       `}</style>
//     </section>
//   )
// }

// export default SecurityPage