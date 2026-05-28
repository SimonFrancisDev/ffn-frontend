import './SecurityPage.css'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { useSpace } from '../../context/SpaceContext'
import { web3Service } from '../../Services/web3'
import { fetchProfilePrivacy, updateProfilePrivacy } from '../../Services/profilePrivacyApi'
import { clearAddressScopedOrbitsApiCache } from '../../Services/orbitsApi'
import { useToast } from '../../components/feedback'
import { CHAIN_ID, NETWORK_CONFIG } from '../../constants/addresses'
import {
  Shield, Lock, Key,
  AlertTriangle, CheckCircle, XCircle, Clock,
  ShieldCheck, ShieldOff, RefreshCw, Wallet, Wifi, WifiOff,
  Eye, AlertCircle, Scale
} from 'lucide-react'

const SecurityPage = () => {
  const { t } = useTranslation()
  const securityT = (key, fallback, options) => t(`securityPage.${key}`, fallback, options)
  const { isConnected, account, connect, switchToAmoy } = useWallet()
  const { isOwnSpace, subjectAddress, switchToSelf } = useSpace()
  const { contracts, isLoading: contractsLoading } = useContracts()
  const toast = useToast()

  const [networkWarning, setNetworkWarning] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [profilePrivacy, setProfilePrivacy] = useState({ isLocked: false })
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)

  useEffect(() => {
    const checkNetwork = async () => {
      const walletProvider = web3Service.getEip1193Provider() || window.ethereum
      if (!walletProvider?.request) return
      try {
        const chainId = await walletProvider.request({ method: 'eth_chainId' })
        setNetworkWarning(chainId?.toLowerCase() !== CHAIN_ID.toLowerCase())
      } catch {
        setNetworkWarning(true)
      }
    }
    checkNetwork()
  }, [])

  const handleSwitchNetwork = async () => {
    try {
      await switchToAmoy?.()
      toast.info(securityT('network.switchRequested', 'Network switch requested.'), { dedupeKey: 'security-switch-network-requested' })
    } catch (error) {
      toast.danger(error?.message || securityT('network.switchFailed', 'Unable to switch network.'), { dedupeKey: 'security-switch-network-failed' })
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isConnected || !account || !isOwnSpace) return

    let cancelled = false

    const loadProfilePrivacy = async () => {
      setPrivacyLoading(true)
      try {
        const data = await fetchProfilePrivacy(account)
        if (!cancelled) setProfilePrivacy(data)
      } catch (error) {
        if (!cancelled) {
          toast.warning(
            error?.message || securityT('privacy.loadFailed', 'Profile privacy status could not be loaded.'),
            { dedupeKey: 'security-profile-privacy-load-failed' }
          )
        }
      } finally {
        if (!cancelled) setPrivacyLoading(false)
      }
    }

    loadProfilePrivacy()

    return () => {
      cancelled = true
    }
  }, [account, isConnected, isOwnSpace, toast])

  const handleToggleProfileLock = async () => {
    if (!account || privacySaving) return

    const nextLocked = !profilePrivacy?.isLocked
    setPrivacySaving(true)

    try {
      const data = await updateProfilePrivacy(account, nextLocked)
      setProfilePrivacy(data)
      clearAddressScopedOrbitsApiCache(account)
      toast.success(
        nextLocked
          ? securityT('privacy.lockedToast', 'Your public profile is now locked.')
          : securityT('privacy.unlockedToast', 'Your public profile is now visible.'),
        { dedupeKey: 'security-profile-privacy-updated' }
      )
    } catch (error) {
      toast.danger(
        error?.message || securityT('privacy.updateFailed', 'Profile privacy could not be updated.'),
        { dedupeKey: 'security-profile-privacy-update-failed' }
      )
    } finally {
      setPrivacySaving(false)
    }
  }

  if (!isConnected) {
    return (
      <section className="security-page">
        <div className="security-hero">
          <div className="security-hero__content">
            <div className="security-hero__eyebrow glass-panel">
              <span className="security-hero__eyebrow-dot" />
              <span className="security-hero__eyebrow-text">{securityT('hero.walletFirst', 'Wallet-First Security')}</span>
            </div>
            <div className="security-hero__text-block">
              <h1 className="security-hero__title">{securityT('title', 'Security Center')}</h1>
              <p className="security-hero__description soft-text">
                {securityT('connect.description', 'Connect your wallet to review security best practices and understand your responsibilities.')}
              </p>
            </div>
            <button type="button" onClick={connect} className="connect-wallet-btn">
              <Wallet size={18} /> {securityT('actions.connectWallet', 'Connect Wallet')}
            </button>
          </div>
          <div className="security-hero__visual glass-panel">
            <div className="security-hero__visual-box">
              <div className="security-hero__visual-stack">
                <Shield size={48} className="security-hero__visual-icon" />
                <div className="soft-text">{securityT('connect.visual', 'Connect to view security guidance')}</div>
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
              <span className="security-hero__eyebrow-text">{securityT('ownSpace.eyebrow', 'My Account View Required')}</span>
            </div>
            <div className="security-hero__text-block">
              <h1 className="security-hero__title">{securityT('title', 'Security Center')}</h1>
              <p className="security-hero__description soft-text">
                {securityT('ownSpace.description', 'Security information is viewable from any account view, but settings can only be changed in My Account View.')}
              </p>
              <div className="small muted-text">
                {securityT('ownSpace.viewing', 'Viewing: {{address}}', { address: subjectAddress ? `${subjectAddress.slice(0, 8)}...${subjectAddress.slice(-6)}` : securityT('states.unknown', 'Unknown') })}
              </div>
            </div>
            <button type="button" onClick={switchToSelf} className="connect-wallet-btn">
              {securityT('actions.returnToMySpace', 'Return to My Space')}
            </button>
          </div>
          <div className="security-hero__visual glass-panel">
            <div className="security-hero__visual-box">
              <div className="security-hero__visual-stack">
                <Shield size={48} className="security-hero__visual-icon alt" />
                <div className="soft-text">{securityT('ownSpace.visual', 'Security guidance is publicly available')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (contractsLoading) {
    return (
      <section className="security-page">
        <div className="loading-container">
          <div className="spinner" />
          <p className="soft-text">{securityT('loading.securityInformation', 'Loading security information...')}</p>
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
            <span className="security-hero__eyebrow-text">{securityT('hero.walletFirst', 'Wallet-First Security')}</span>
          </div>

          <div className="security-hero__text-block">
            <h1 className="security-hero__title">{securityT('title', 'Security Center')}</h1>
            <p className="security-hero__description soft-text">
              {securityT('hero.description', 'Fin Freedom Network is built on transparent, on-chain mechanisms. Your security responsibilities are clear: you control your wallet, you verify transactions, you protect your keys.')}
            </p>
            <div className="small muted-text security-inline-meta">
              <Clock size={12} /> {securityT('hero.lastUpdated', 'Last updated: {{time}}', { time: lastUpdated })}
            </div>
          </div>

          <div className="security-hero__chips">
            <span className="security-hero__chip glass-panel">
              {isConnected ? <CheckCircle size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
              <span>{isConnected ? securityT('status.walletConnected', 'Wallet Connected') : securityT('status.walletDisconnected', 'Wallet Disconnected')}</span>
            </span>
            <span className="security-hero__chip glass-panel">
              {!networkWarning ? <Wifi size={14} className="text-success" /> : <WifiOff size={14} className="text-warning" />}
              <span>{!networkWarning ? securityT('status.correctNetwork', 'Correct Network') : securityT('status.wrongNetwork', 'Wrong Network')}</span>
            </span>
          </div>
        </div>

        <div className="security-hero__visual glass-panel">
          <div className="security-hero__visual-box">
            <div className="security-info-card">
              <ShieldCheck size={42} className="security-info-card__icon" />
              <div className="security-info-card__text">
                <strong>{securityT('custody.title', 'Self-Custody')}</strong>
                <span className="soft-text">{securityT('custody.text', 'You control your assets')}</span>
              </div>
            </div>
          </div>
          <p className="security-hero__visual-note muted-text">{securityT('custody.note', 'Wallet-first security model')}</p>
        </div>
      </div>

      {networkWarning && (
        <div className="network-warning glass-panel">
          <AlertTriangle size={22} className="text-warning" />
          <div className="network-warning__body">
            <strong>{securityT('network.warningTitle', 'Wrong Network Detected')}</strong>
            <p className="soft-text">{securityT('network.warningText', 'Please switch to {{network}} for secure transactions.', { network: NETWORK_CONFIG.chainName })}</p>
          </div>
          <button type="button" className="switch-network-btn" onClick={handleSwitchNetwork}>
            <RefreshCw size={14} /> {securityT('actions.switchNetwork', 'Switch Network')}
          </button>
        </div>
      )}

      <div className="security-main-grid">
        <div className="security-main-grid__left">
          <section className="security-transparency glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Lock size={12} /> {securityT('privacy.eyebrow', 'Profile Privacy')}
              </span>
              <h2 className="security-section-heading__title">{securityT('privacy.title', 'Public Profile Access')}</h2>
            </div>

            <div className="transparency-list">
              <div className="transparency-item">
                {profilePrivacy?.isLocked ? (
                  <ShieldOff size={18} className="transparency-icon warning" />
                ) : (
                  <ShieldCheck size={18} className="transparency-icon success" />
                )}
                <div>
                  <strong>
                    {profilePrivacy?.isLocked
                      ? securityT('privacy.lockedTitle', 'Profile locked')
                      : securityT('privacy.publicTitle', 'Profile visible')}
                  </strong>
                  <p className="soft-text">
                    {profilePrivacy?.isLocked
                      ? securityT('privacy.lockedText', 'Other users cannot view your account profile, downline, earnings, token totals, or orbit network through the public explorer.')
                      : securityT('privacy.publicText', 'Other users can view your public account profile from wallet lookup, referral ID lookup, leaderboard, downline, and orbit explorer entry points.')}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="switch-network-btn"
              onClick={handleToggleProfileLock}
              disabled={privacyLoading || privacySaving}
            >
              {privacySaving ? <RefreshCw size={14} /> : <Lock size={14} />}
              {profilePrivacy?.isLocked
                ? securityT('privacy.unlockAction', 'Unlock Public Profile')
                : securityT('privacy.lockAction', 'Lock Public Profile')}
            </button>
          </section>

          <section className="security-responsibility glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Shield size={12} /> {securityT('responsibility.eyebrow', 'Your Responsibility')}
              </span>
              <h2 className="security-section-heading__title">{securityT('responsibility.title', 'Wallet Security Is Your Responsibility')}</h2>
            </div>

            <div className="responsibility-list">
              <div className="responsibility-item">
                <span className="responsibility-icon"><Key size={20} /></span>
                <div>
                  <h3 className="responsibility-title">{securityT('responsibility.privateKeyTitle', 'Never share your private key')}</h3>
                  <p className="responsibility-text soft-text">
                    {securityT('responsibility.privateKeyText', 'Fin Freedom Network will never request your private key, seed phrase, or recovery phrase. Anyone asking for this information is a scammer.')}
                  </p>
                </div>
              </div>

              <div className="responsibility-item">
                <span className="responsibility-icon"><Lock size={20} /></span>
                <div>
                  <h3 className="responsibility-title">{securityT('responsibility.walletFinalTitle', 'Wallet addresses are final')}</h3>
                  <p className="responsibility-text soft-text">
                    {securityT('responsibility.walletFinalText', 'Wallet addresses cannot be changed after registration. If your wallet has been compromised, you must create a new wallet before registering.')}
                  </p>
                </div>
              </div>

              <div className="responsibility-item">
                <span className="responsibility-icon"><AlertCircle size={20} /></span>
                <div>
                  <h3 className="responsibility-title">{securityT('responsibility.irreversibleTitle', 'Transactions are irreversible')}</h3>
                  <p className="responsibility-text soft-text">
                    {securityT('responsibility.irreversibleText', 'Once confirmed on the blockchain, transactions cannot be reversed or refunded. Always verify transaction details before signing.')}
                  </p>
                </div>
              </div>

              <div className="responsibility-item">
                <span className="responsibility-icon"><Eye size={20} /></span>
                <div>
                  <h3 className="responsibility-title">{securityT('responsibility.verifyTitle', 'Verify before you sign')}</h3>
                  <p className="responsibility-text soft-text">
                    {securityT('responsibility.verifyText', 'Check the wallet prompt, recipient address, and amount before confirming any transaction. Fin Freedom Network cannot recover funds sent to incorrect addresses.')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="security-transparency glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <ShieldCheck size={12} /> {securityT('transparency.eyebrow', 'Transparency')}
              </span>
              <h2 className="security-section-heading__title">{securityT('transparency.title', 'Built on Verifiable Code')}</h2>
            </div>

            <div className="transparency-list">
              <div className="transparency-item">
                <CheckCircle size={18} className="transparency-icon success" />
                <div>
                  <strong>{securityT('transparency.smartContractsTitle', 'On-chain smart contracts')}</strong>
                  <p className="soft-text">{securityT('transparency.smartContractsText', 'All core mechanisms are enforced by immutable smart contracts on public blockchains.')}</p>
                </div>
              </div>
              <div className="transparency-item">
                <CheckCircle size={18} className="transparency-icon success" />
                <div>
                  <strong>{securityT('transparency.noAdminTitle', 'No admin access to user funds')}</strong>
                  <p className="soft-text">{securityT('transparency.noAdminText', 'No single individual has unilateral authority over user funds. Multisig governance controls protocol parameters.')}</p>
                </div>
              </div>
              <div className="transparency-item">
                <CheckCircle size={18} className="transparency-icon success" />
                <div>
                  <strong>{securityT('transparency.payoutRulesTitle', 'Deterministic payout rules')}</strong>
                  <p className="soft-text">{securityT('transparency.payoutRulesText', 'Every reward follows a clear, predefined structure that cannot be altered arbitrarily.')}</p>
                </div>
              </div>
              <div className="transparency-item">
                <CheckCircle size={18} className="transparency-icon success" />
                <div>
                  <strong>{securityT('transparency.auditsTitle', 'External audits planned')}</strong>
                  <p className="soft-text">{securityT('transparency.auditsText', 'Smart contracts will undergo independent security audits.')}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="security-main-grid__right">
          <section className="security-risks glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <AlertTriangle size={12} /> {securityT('risks.eyebrow', 'Know the Risks')}
              </span>
              <h2 className="security-section-heading__title">{securityT('risks.title', 'Participation Involves Risks')}</h2>
            </div>

            <div className="risks-list">
              <div className="risk-item">
                <ShieldOff size={18} className="risk-icon danger" />
                <div>
                  <strong className="risk-title">{securityT('risks.smartContractTitle', 'Smart Contract Vulnerabilities')}</strong>
                  <p className="risk-text soft-text">{securityT('risks.smartContractText', 'Smart contracts may contain coding errors or unforeseen behavior despite audits.')}</p>
                </div>
              </div>
              <div className="risk-item">
                <AlertTriangle size={18} className="risk-icon warning" />
                <div>
                  <strong className="risk-title">{securityT('risks.tokenVolatilityTitle', 'Token Price Volatility')}</strong>
                  <p className="risk-text soft-text">{securityT('risks.tokenVolatilityText', 'Tokens may fluctuate in value, experience low liquidity, or lose value entirely.')}</p>
                </div>
              </div>
              <div className="risk-item">
                <ShieldOff size={18} className="risk-icon danger" />
                <div>
                  <strong className="risk-title">{securityT('risks.phishingTitle', 'Phishing & Social Engineering')}</strong>
                  <p className="risk-text soft-text">{securityT('risks.phishingText', 'Only use official channels. Never share your private key or send funds to unknown addresses.')}</p>
                </div>
              </div>
              <div className="risk-item">
                <AlertCircle size={18} className="risk-icon warning" />
                <div>
                  <strong className="risk-title">{securityT('risks.userErrorTitle', 'User Error')}</strong>
                  <p className="risk-text soft-text">{securityT('risks.userErrorText', 'Sending funds to incorrect addresses or interacting with malicious contracts can result in permanent loss.')}</p>
                </div>
              </div>
              <div className="risk-item">
                <Scale size={18} className="risk-icon info" />
                <div>
                  <strong className="risk-title">{securityT('risks.regulatoryTitle', 'Regulatory Uncertainty')}</strong>
                  <p className="risk-text soft-text">{securityT('risks.regulatoryText', 'Cryptocurrency regulations vary by jurisdiction and may change at any time.')}</p>
                </div>
              </div>
            </div>

            <div className="risk-disclaimer glass-panel">
              <AlertCircle size={16} />
              <p className="soft-text">
                <strong>{securityT('risks.importantNotice', 'IMPORTANT NOTICE:')}</strong> {securityT('risks.disclaimer', 'Participation in Fin Freedom Network involves significant risks. You should only participate if you fully understand and willingly accept these risks. No guarantees are made regarding profits, income, or returns.')}
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Merged Full Width Section - Best Practices + Need Help */}
      <div className="security-fullwidth-section">
        <section className="security-best-practices glass-panel security-block">
          <div className="security-section-heading">
            <span className="security-section-heading__eyebrow muted-text">
              <ShieldCheck size={12} /> {securityT('bestPractices.eyebrow', 'Best Practices')}
            </span>
            <h2 className="security-section-heading__title">{securityT('bestPractices.title', 'Recommended Safety Habits')}</h2>
          </div>

          <div className="practices-list">
            <div className="practice-item">
              <div className="practice-number">01</div>
              <div>
                <strong>{securityT('bestPractices.officialLinksTitle', 'Use only official links')}</strong>
                <p className="soft-text">{securityT('bestPractices.officialLinksText', 'Always verify you are on the official Fin Freedom Network website and using trusted support channels.')}</p>
              </div>
            </div>
            <div className="practice-item">
              <div className="practice-number">02</div>
              <div>
                <strong>{securityT('bestPractices.verifyNetworkTitle', 'Verify network before signing')}</strong>
                <p className="soft-text">{securityT('bestPractices.verifyNetworkText', "Always confirm you're on the correct blockchain network before approving transactions.")}</p>
              </div>
            </div>
            <div className="practice-item">
              <div className="practice-number">03</div>
              <div>
                <strong>{securityT('bestPractices.reviewTransactionsTitle', 'Review transaction details')}</strong>
                <p className="soft-text">{securityT('bestPractices.reviewTransactionsText', 'Check recipient addresses, amounts, and contract interactions before signing.')}</p>
              </div>
            </div>
            <div className="practice-item">
              <div className="practice-number">04</div>
              <div>
                <strong>{securityT('bestPractices.storeKeysTitle', 'Store keys securely offline')}</strong>
                <p className="soft-text">{securityT('bestPractices.storeKeysText', 'Never store your seed phrase digitally. Use hardware wallets or secure offline storage.')}</p>
              </div>
            </div>
            <div className="practice-item">
              <div className="practice-number">05</div>
              <div>
                <strong>{securityT('bestPractices.stayInformedTitle', 'Stay informed')}</strong>
                <p className="soft-text">{securityT('bestPractices.stayInformedText', 'Follow official announcements for updates about platform security and new features.')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="security-support glass-panel security-block">
          <div className="security-section-heading">
            <span className="security-section-heading__eyebrow muted-text">
              <ShieldCheck size={12} /> {securityT('support.eyebrow', 'Need Help')}
            </span>
            <h2 className="security-section-heading__title">{securityT('support.title', 'Official Support Channels')}</h2>
          </div>

          <div className="support-info">
            <p className="soft-text">
              {securityT('support.text', 'Fin Freedom Network will never contact you first via DM or request your private key. Always use official support channels listed in the Community Hub.')}
            </p>
            <div className="support-note glass-panel">
              <AlertCircle size={14} />
              <span>{securityT('support.reportSuspicious', 'Report suspicious activity through the official support ticket system.')}</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

export default SecurityPage
