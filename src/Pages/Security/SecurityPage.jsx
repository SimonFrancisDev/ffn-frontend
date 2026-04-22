import './SecurityPage.css'
import { useEffect, useState } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { useSpace } from '../../context/SpaceContext'
import {
  Shield, Lock, Key,
  AlertTriangle, CheckCircle, XCircle, Clock,
  ShieldCheck, ShieldOff, RefreshCw, Wallet, Wifi, WifiOff,
  Eye, AlertCircle, Scale
} from 'lucide-react'

const SecurityPage = () => {
  const { isConnected, account, connect, switchToAmoy } = useWallet()
  const { isOwnSpace, subjectAddress, switchToSelf } = useSpace()
  const { contracts, isLoading: contractsLoading } = useContracts()

  const [networkWarning, setNetworkWarning] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())

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
    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!isConnected) {
    return (
      <section className="security-page">
        <div className="security-hero">
          <div className="security-hero__content">
            <div className="security-hero__eyebrow glass-panel">
              <span className="security-hero__eyebrow-dot" />
              <span className="security-hero__eyebrow-text">Wallet-First Security</span>
            </div>
            <div className="security-hero__text-block">
              <h1 className="security-hero__title">Security Center</h1>
              <p className="security-hero__description soft-text">
                Connect your wallet to review security best practices and understand your responsibilities.
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
                <div className="soft-text">Connect to view security guidance</div>
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
              <h1 className="security-hero__title">Security Center</h1>
              <p className="security-hero__description soft-text">
                Security information is viewable from any space, but settings can only be changed in your own space.
              </p>
              <div className="small muted-text">
                Viewing: {subjectAddress ? `${subjectAddress.slice(0, 8)}...${subjectAddress.slice(-6)}` : 'Unknown'}
              </div>
            </div>
            <button type="button" onClick={switchToSelf} className="connect-wallet-btn">
              Return to My Space
            </button>
          </div>
          <div className="security-hero__visual glass-panel">
            <div className="security-hero__visual-box">
              <div className="security-hero__visual-stack">
                <Shield size={48} className="security-hero__visual-icon alt" />
                <div className="soft-text">Security guidance is publicly available</div>
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
          <p className="soft-text">Loading security information...</p>
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
            <span className="security-hero__eyebrow-text">Wallet-First Security</span>
          </div>

          <div className="security-hero__text-block">
            <h1 className="security-hero__title">Security Center</h1>
            <p className="security-hero__description soft-text">
              Fin Freedom Network is built on transparent, on-chain mechanisms. Your security responsibilities are clear: you control your wallet, you verify transactions, you protect your keys.
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
          </div>
        </div>

        <div className="security-hero__visual glass-panel">
          <div className="security-hero__visual-box">
            <div className="security-info-card">
              <ShieldCheck size={42} className="security-info-card__icon" />
              <div className="security-info-card__text">
                <strong>Self-Custody</strong>
                <span className="soft-text">You control your assets</span>
              </div>
            </div>
          </div>
          <p className="security-hero__visual-note muted-text">Wallet-first security model</p>
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
          <section className="security-responsibility glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <Shield size={12} /> Your Responsibility
              </span>
              <h2 className="security-section-heading__title">Wallet Security Is Your Responsibility</h2>
            </div>

            <div className="responsibility-list">
              <div className="responsibility-item">
                <span className="responsibility-icon"><Key size={20} /></span>
                <div>
                  <h3 className="responsibility-title">Never share your private key</h3>
                  <p className="responsibility-text soft-text">
                    Fin Freedom Network will never request your private key, seed phrase, or recovery phrase. Anyone asking for this information is a scammer.
                  </p>
                </div>
              </div>

              <div className="responsibility-item">
                <span className="responsibility-icon"><Lock size={20} /></span>
                <div>
                  <h3 className="responsibility-title">Wallet addresses are final</h3>
                  <p className="responsibility-text soft-text">
                    Wallet addresses cannot be changed after registration. If your wallet has been compromised, you must create a new wallet before registering.
                  </p>
                </div>
              </div>

              <div className="responsibility-item">
                <span className="responsibility-icon"><AlertCircle size={20} /></span>
                <div>
                  <h3 className="responsibility-title">Transactions are irreversible</h3>
                  <p className="responsibility-text soft-text">
                    Once confirmed on the blockchain, transactions cannot be reversed or refunded. Always verify transaction details before signing.
                  </p>
                </div>
              </div>

              <div className="responsibility-item">
                <span className="responsibility-icon"><Eye size={20} /></span>
                <div>
                  <h3 className="responsibility-title">Verify before you sign</h3>
                  <p className="responsibility-text soft-text">
                    Check the wallet prompt, recipient address, and amount before confirming any transaction. Fin Freedom Network cannot recover funds sent to incorrect addresses.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="security-transparency glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <ShieldCheck size={12} /> Transparency
              </span>
              <h2 className="security-section-heading__title">Built on Verifiable Code</h2>
            </div>

            <div className="transparency-list">
              <div className="transparency-item">
                <CheckCircle size={18} className="transparency-icon success" />
                <div>
                  <strong>On-chain smart contracts</strong>
                  <p className="soft-text">All core mechanisms are enforced by immutable smart contracts on public blockchains.</p>
                </div>
              </div>
              <div className="transparency-item">
                <CheckCircle size={18} className="transparency-icon success" />
                <div>
                  <strong>No admin access to user funds</strong>
                  <p className="soft-text">No single individual has unilateral authority over user funds. Multisig governance controls protocol parameters.</p>
                </div>
              </div>
              <div className="transparency-item">
                <CheckCircle size={18} className="transparency-icon success" />
                <div>
                  <strong>Deterministic payout rules</strong>
                  <p className="soft-text">Every reward follows a clear, predefined structure that cannot be altered arbitrarily.</p>
                </div>
              </div>
              <div className="transparency-item">
                <CheckCircle size={18} className="transparency-icon success" />
                <div>
                  <strong>External audits planned</strong>
                  <p className="soft-text">Smart contracts will undergo independent security audits.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="security-main-grid__right">
          <section className="security-risks glass-panel security-block">
            <div className="security-section-heading">
              <span className="security-section-heading__eyebrow muted-text">
                <AlertTriangle size={12} /> Know the Risks
              </span>
              <h2 className="security-section-heading__title">Participation Involves Risks</h2>
            </div>

            <div className="risks-list">
              <div className="risk-item">
                <ShieldOff size={18} className="risk-icon danger" />
                <div>
                  <strong className="risk-title">Smart Contract Vulnerabilities</strong>
                  <p className="risk-text soft-text">Smart contracts may contain coding errors or unforeseen behavior despite audits.</p>
                </div>
              </div>
              <div className="risk-item">
                <AlertTriangle size={18} className="risk-icon warning" />
                <div>
                  <strong className="risk-title">Token Price Volatility</strong>
                  <p className="risk-text soft-text">Tokens may fluctuate in value, experience low liquidity, or lose value entirely.</p>
                </div>
              </div>
              <div className="risk-item">
                <ShieldOff size={18} className="risk-icon danger" />
                <div>
                  <strong className="risk-title">Phishing & Social Engineering</strong>
                  <p className="risk-text soft-text">Only use official channels. Never share your private key or send funds to unknown addresses.</p>
                </div>
              </div>
              <div className="risk-item">
                <AlertCircle size={18} className="risk-icon warning" />
                <div>
                  <strong className="risk-title">User Error</strong>
                  <p className="risk-text soft-text">Sending funds to incorrect addresses or interacting with malicious contracts can result in permanent loss.</p>
                </div>
              </div>
              <div className="risk-item">
                <Scale size={18} className="risk-icon info" />
                <div>
                  <strong className="risk-title">Regulatory Uncertainty</strong>
                  <p className="risk-text soft-text">Cryptocurrency regulations vary by jurisdiction and may change at any time.</p>
                </div>
              </div>
            </div>

            <div className="risk-disclaimer glass-panel">
              <AlertCircle size={16} />
              <p className="soft-text">
                <strong>IMPORTANT NOTICE:</strong> Participation in Fin Freedom Network involves significant risks. 
                You should only participate if you fully understand and willingly accept these risks. 
                No guarantees are made regarding profits, income, or returns.
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
              <ShieldCheck size={12} /> Best Practices
            </span>
            <h2 className="security-section-heading__title">Recommended Safety Habits</h2>
          </div>

          <div className="practices-list">
            <div className="practice-item">
              <div className="practice-number">01</div>
              <div>
                <strong>Use only official links</strong>
                <p className="soft-text">Always verify you are on the official Fin Freedom Network website and using trusted support channels.</p>
              </div>
            </div>
            <div className="practice-item">
              <div className="practice-number">02</div>
              <div>
                <strong>Verify network before signing</strong>
                <p className="soft-text">Always confirm you're on the correct blockchain network before approving transactions.</p>
              </div>
            </div>
            <div className="practice-item">
              <div className="practice-number">03</div>
              <div>
                <strong>Review transaction details</strong>
                <p className="soft-text">Check recipient addresses, amounts, and contract interactions before signing.</p>
              </div>
            </div>
            <div className="practice-item">
              <div className="practice-number">04</div>
              <div>
                <strong>Store keys securely offline</strong>
                <p className="soft-text">Never store your seed phrase digitally. Use hardware wallets or secure offline storage.</p>
              </div>
            </div>
            <div className="practice-item">
              <div className="practice-number">05</div>
              <div>
                <strong>Stay informed</strong>
                <p className="soft-text">Follow official announcements for updates about platform security and new features.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="security-support glass-panel security-block">
          <div className="security-section-heading">
            <span className="security-section-heading__eyebrow muted-text">
              <ShieldCheck size={12} /> Need Help?
            </span>
            <h2 className="security-section-heading__title">Official Support Channels</h2>
          </div>

          <div className="support-info">
            <p className="soft-text">
              Fin Freedom Network will never contact you first via DM or request your private key. 
              Always use official support channels listed in the Community Hub.
            </p>
            <div className="support-note glass-panel">
              <AlertCircle size={14} />
              <span>Report suspicious activity through the official support ticket system.</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

export default SecurityPage













// import './SecurityPage.css'
// import { useEffect, useState } from 'react'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { useSpace } from '../../context/SpaceContext'
// import {
//   Shield, Lock, Key,
//   AlertTriangle, CheckCircle, XCircle, Clock,
//   ShieldCheck, ShieldOff, RefreshCw, Wallet, Wifi, WifiOff,
//   Eye, AlertCircle, Scale
// } from 'lucide-react'

// const SecurityPage = () => {
//   const { isConnected, account, connect, switchToAmoy } = useWallet()
//   const { isOwnSpace, subjectAddress, switchToSelf } = useSpace()
//   const { contracts, isLoading: contractsLoading } = useContracts()

//   const [networkWarning, setNetworkWarning] = useState('')
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())

//   const AMOY_CHAIN_ID = '0x13882'

//   useEffect(() => {
//     const checkNetwork = async () => {
//       if (!window.ethereum) return
//       try {
//         const chainId = await window.ethereum.request({ method: 'eth_chainId' })
//         setNetworkWarning(chainId !== AMOY_CHAIN_ID)
//       } catch {
//         setNetworkWarning(true)
//       }
//     }
//     checkNetwork()
//   }, [])

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setLastUpdated(new Date().toLocaleTimeString())
//     }, 30000)
//     return () => clearInterval(interval)
//   }, [])

//   if (!isConnected) {
//     return (
//       <section className="security-page">
//         <div className="security-hero">
//           <div className="security-hero__content">
//             <div className="security-hero__eyebrow glass-panel">
//               <span className="security-hero__eyebrow-dot" />
//               <span className="security-hero__eyebrow-text">Wallet-First Security</span>
//             </div>
//             <div className="security-hero__text-block">
//               <h1 className="security-hero__title">Security Center</h1>
//               <p className="security-hero__description soft-text">
//                 Connect your wallet to review security best practices and understand your responsibilities.
//               </p>
//             </div>
//             <button type="button" onClick={connect} className="connect-wallet-btn">
//               <Wallet size={18} /> Connect Wallet
//             </button>
//           </div>
//           <div className="security-hero__visual glass-panel">
//             <div className="security-hero__visual-box">
//               <div className="security-hero__visual-stack">
//                 <Shield size={48} className="security-hero__visual-icon" />
//                 <div className="soft-text">Connect to view security guidance</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>
//     )
//   }

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
//               <h1 className="security-hero__title">Security Center</h1>
//               <p className="security-hero__description soft-text">
//                 Security information is viewable from any space, but settings can only be changed in your own space.
//               </p>
//               <div className="small muted-text">
//                 Viewing: {subjectAddress ? `${subjectAddress.slice(0, 8)}...${subjectAddress.slice(-6)}` : 'Unknown'}
//               </div>
//             </div>
//             <button type="button" onClick={switchToSelf} className="connect-wallet-btn">
//               Return to My Space
//             </button>
//           </div>
//           <div className="security-hero__visual glass-panel">
//             <div className="security-hero__visual-box">
//               <div className="security-hero__visual-stack">
//                 <Shield size={48} className="security-hero__visual-icon alt" />
//                 <div className="soft-text">Security guidance is publicly available</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>
//     )
//   }

//   if (contractsLoading) {
//     return (
//       <section className="security-page">
//         <div className="loading-container">
//           <div className="spinner" />
//           <p className="soft-text">Loading security information...</p>
//         </div>
//       </section>
//     )
//   }

//   return (
//     <section className="security-page">
//       <div className="security-hero">
//         <div className="security-hero__content">
//           <div className="security-hero__eyebrow glass-panel">
//             <span className="security-hero__eyebrow-dot" />
//             <span className="security-hero__eyebrow-text">Wallet-First Security</span>
//           </div>

//           <div className="security-hero__text-block">
//             <h1 className="security-hero__title">Security Center</h1>
//             <p className="security-hero__description soft-text">
//               Fin Freedom Network is built on transparent, on-chain mechanisms. Your security responsibilities are clear: you control your wallet, you verify transactions, you protect your keys.
//             </p>
//             <div className="small muted-text security-inline-meta">
//               <Clock size={12} /> Last updated: {lastUpdated}
//             </div>
//           </div>

//           <div className="security-hero__chips">
//             <span className="security-hero__chip glass-panel">
//               {isConnected ? <CheckCircle size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
//               <span>{isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}</span>
//             </span>
//             <span className="security-hero__chip glass-panel">
//               {!networkWarning ? <Wifi size={14} className="text-success" /> : <WifiOff size={14} className="text-warning" />}
//               <span>{!networkWarning ? 'Correct Network' : 'Wrong Network'}</span>
//             </span>
//           </div>
//         </div>

//         <div className="security-hero__visual glass-panel">
//           <div className="security-hero__visual-box">
//             <div className="security-info-card">
//               <ShieldCheck size={42} className="security-info-card__icon" />
//               <div className="security-info-card__text">
//                 <strong>Self-Custody</strong>
//                 <span className="soft-text">You control your assets</span>
//               </div>
//             </div>
//           </div>
//           <p className="security-hero__visual-note muted-text">Wallet-first security model</p>
//         </div>
//       </div>

//       {networkWarning && (
//         <div className="network-warning glass-panel">
//           <AlertTriangle size={22} className="text-warning" />
//           <div className="network-warning__body">
//             <strong>Wrong Network Detected</strong>
//             <p className="soft-text">Please switch to Polygon Amoy Testnet for secure transactions.</p>
//           </div>
//           <button type="button" className="switch-network-btn" onClick={switchToAmoy}>
//             <RefreshCw size={14} /> Switch Network
//           </button>
//         </div>
//       )}

//       <div className="security-main-grid">
//         <div className="security-main-grid__left">
//           <section className="security-responsibility glass-panel security-block">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 <Shield size={12} /> Your Responsibility
//               </span>
//               <h2 className="security-section-heading__title">Wallet Security Is Your Responsibility</h2>
//             </div>

//             <div className="responsibility-list">
//               <div className="responsibility-item">
//                 <span className="responsibility-icon"><Key size={20} /></span>
//                 <div>
//                   <h3 className="responsibility-title">Never share your private key</h3>
//                   <p className="responsibility-text soft-text">
//                     Fin Freedom Network will never request your private key, seed phrase, or recovery phrase. Anyone asking for this information is a scammer.
//                   </p>
//                 </div>
//               </div>

//               <div className="responsibility-item">
//                 <span className="responsibility-icon"><Lock size={20} /></span>
//                 <div>
//                   <h3 className="responsibility-title">Wallet addresses are final</h3>
//                   <p className="responsibility-text soft-text">
//                     Wallet addresses cannot be changed after registration. If your wallet has been compromised, you must create a new wallet before registering.
//                   </p>
//                 </div>
//               </div>

//               <div className="responsibility-item">
//                 <span className="responsibility-icon"><AlertCircle size={20} /></span>
//                 <div>
//                   <h3 className="responsibility-title">Transactions are irreversible</h3>
//                   <p className="responsibility-text soft-text">
//                     Once confirmed on the blockchain, transactions cannot be reversed or refunded. Always verify transaction details before signing.
//                   </p>
//                 </div>
//               </div>

//               <div className="responsibility-item">
//                 <span className="responsibility-icon"><Eye size={20} /></span>
//                 <div>
//                   <h3 className="responsibility-title">Verify before you sign</h3>
//                   <p className="responsibility-text soft-text">
//                     Check the wallet prompt, recipient address, and amount before confirming any transaction. Fin Freedom Network cannot recover funds sent to incorrect addresses.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </section>

//           <section className="security-transparency glass-panel security-block">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 <ShieldCheck size={12} /> Transparency
//               </span>
//               <h2 className="security-section-heading__title">Built on Verifiable Code</h2>
//             </div>

//             <div className="transparency-list">
//               <div className="transparency-item">
//                 <CheckCircle size={18} className="transparency-icon success" />
//                 <div>
//                   <strong>On-chain smart contracts</strong>
//                   <p className="soft-text">All core mechanisms are enforced by immutable smart contracts on public blockchains.</p>
//                 </div>
//               </div>
//               <div className="transparency-item">
//                 <CheckCircle size={18} className="transparency-icon success" />
//                 <div>
//                   <strong>No admin access to user funds</strong>
//                   <p className="soft-text">No single individual has unilateral authority over user funds. Multisig governance controls protocol parameters.</p>
//                 </div>
//               </div>
//               <div className="transparency-item">
//                 <CheckCircle size={18} className="transparency-icon success" />
//                 <div>
//                   <strong>Deterministic payout rules</strong>
//                   <p className="soft-text">Every reward follows a clear, predefined structure that cannot be altered arbitrarily.</p>
//                 </div>
//               </div>
//               <div className="transparency-item">
//                 <CheckCircle size={18} className="transparency-icon success" />
//                 <div>
//                   <strong>External audits planned</strong>
//                   <p className="soft-text">Smart contracts will undergo independent security audits.</p>
//                 </div>
//               </div>
//             </div>
//           </section>
//         </div>

//         <div className="security-main-grid__right">
//           <section className="security-risks glass-panel security-block">
//             <div className="security-section-heading">
//               <span className="security-section-heading__eyebrow muted-text">
//                 <AlertTriangle size={12} /> Know the Risks
//               </span>
//               <h2 className="security-section-heading__title">Participation Involves Risks</h2>
//             </div>

//             <div className="risks-list">
//               <div className="risk-item">
//                 <ShieldOff size={18} className="risk-icon danger" />
//                 <div>
//                   <strong className="risk-title">Smart Contract Vulnerabilities</strong>
//                   <p className="risk-text soft-text">Smart contracts may contain coding errors or unforeseen behavior despite audits.</p>
//                 </div>
//               </div>
//               <div className="risk-item">
//                 <AlertTriangle size={18} className="risk-icon warning" />
//                 <div>
//                   <strong className="risk-title">Token Price Volatility</strong>
//                   <p className="risk-text soft-text">Tokens may fluctuate in value, experience low liquidity, or lose value entirely.</p>
//                 </div>
//               </div>
//               <div className="risk-item">
//                 <ShieldOff size={18} className="risk-icon danger" />
//                 <div>
//                   <strong className="risk-title">Phishing & Social Engineering</strong>
//                   <p className="risk-text soft-text">Only use official channels. Never share your private key or send funds to unknown addresses.</p>
//                 </div>
//               </div>
//               <div className="risk-item">
//                 <AlertCircle size={18} className="risk-icon warning" />
//                 <div>
//                   <strong className="risk-title">User Error</strong>
//                   <p className="risk-text soft-text">Sending funds to incorrect addresses or interacting with malicious contracts can result in permanent loss.</p>
//                 </div>
//               </div>
//               <div className="risk-item">
//                 <Scale size={18} className="risk-icon info" />
//                 <div>
//                   <strong className="risk-title">Regulatory Uncertainty</strong>
//                   <p className="risk-text soft-text">Cryptocurrency regulations vary by jurisdiction and may change at any time.</p>
//                 </div>
//               </div>
//             </div>

//             <div className="risk-disclaimer glass-panel">
//               <AlertCircle size={16} />
//               <p className="soft-text">
//                 <strong>IMPORTANT NOTICE:</strong> Participation in Fin Freedom Network involves significant risks. 
//                 You should only participate if you fully understand and willingly accept these risks. 
//                 No guarantees are made regarding profits, income, or returns.
//               </p>
//             </div>
//           </section>
//         </div>
//       </div>

//       {/* Merged Full Width Section - Best Practices + Need Help */}
//       <div className="security-fullwidth-section">
//         <section className="security-best-practices glass-panel security-block">
//           <div className="security-section-heading">
//             <span className="security-section-heading__eyebrow muted-text">
//               <ShieldCheck size={12} /> Best Practices
//             </span>
//             <h2 className="security-section-heading__title">Recommended Safety Habits</h2>
//           </div>

//           <div className="practices-list">
//             <div className="practice-item">
//               <div className="practice-number">01</div>
//               <div>
//                 <strong>Use only official links</strong>
//                 <p className="soft-text">Always verify you are on the official Fin Freedom Network website and using trusted support channels.</p>
//               </div>
//             </div>
//             <div className="practice-item">
//               <div className="practice-number">02</div>
//               <div>
//                 <strong>Verify network before signing</strong>
//                 <p className="soft-text">Always confirm you're on the correct blockchain network before approving transactions.</p>
//               </div>
//             </div>
//             <div className="practice-item">
//               <div className="practice-number">03</div>
//               <div>
//                 <strong>Review transaction details</strong>
//                 <p className="soft-text">Check recipient addresses, amounts, and contract interactions before signing.</p>
//               </div>
//             </div>
//             <div className="practice-item">
//               <div className="practice-number">04</div>
//               <div>
//                 <strong>Store keys securely offline</strong>
//                 <p className="soft-text">Never store your seed phrase digitally. Use hardware wallets or secure offline storage.</p>
//               </div>
//             </div>
//             <div className="practice-item">
//               <div className="practice-number">05</div>
//               <div>
//                 <strong>Stay informed</strong>
//                 <p className="soft-text">Follow official announcements for updates about platform security and new features.</p>
//               </div>
//             </div>
//           </div>
//         </section>

//         <section className="security-support glass-panel security-block">
//           <div className="security-section-heading">
//             <span className="security-section-heading__eyebrow muted-text">
//               <ShieldCheck size={12} /> Need Help?
//             </span>
//             <h2 className="security-section-heading__title">Official Support Channels</h2>
//           </div>

//           <div className="support-info">
//             <p className="soft-text">
//               Fin Freedom Network will never contact you first via DM or request your private key. 
//               Always use official support channels listed in the Community Hub.
//             </p>
//             <div className="support-note glass-panel">
//               <AlertCircle size={14} />
//               <span>Report suspicious activity through the official support ticket system.</span>
//             </div>
//           </div>
//         </section>
//       </div>
//     </section>
//   )
// }

// export default SecurityPage