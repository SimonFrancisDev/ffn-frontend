import './SupportPage.css'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import {
  AlertCircle, AlertTriangle, BookOpen, Check, CheckCircle, ChevronRight, Copy,
  ExternalLink, HelpCircle, Info, LifeBuoy, Mail, RefreshCw, Rocket, Search,
  Send, Shield, TrendingUp, Wallet, Wifi, Activity, Database, X, Orbit, FileText,
  FileCheck, Lock, Video, Eye, Scale
} from 'lucide-react'
import { FaTelegramPlane, FaDiscord, FaInstagram, FaFacebookF } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

const API_BASE_URL = 'https://fin-freedom-backend-3.onrender.com'

const SUPPORT_COUNTRIES = Array.from({ length: 9 }, (_, index) => ({
  id: `country-${index + 1}`,
  name: `Support Region ${index + 1}`,
  image: `/assets/images/support-country-${index + 1}.png`,
}))

const QUICK_HELP_GUIDES = {
  registration: {
    title: 'Registration Help',
    route: 'community',
    routeLabel: 'Open Community Hub',
    description: 'Complete the registration process correctly and confirm your sponsor relationship. Wallet addresses cannot be changed after registration.',
    steps: [
      'Confirm your wallet is connected before starting the registration flow.',
      'Verify your sponsor or referral link before submitting the registration transaction.',
      'Wait for the transaction to confirm fully on-chain before refreshing.',
      'If registration does not appear, copy your wallet address and transaction hash for support.',
    ],
  },
  levels: {
    title: 'Levels & Activation',
    route: 'activation-center',
    routeLabel: 'Open Activation Center',
    description: 'Troubleshoot level activation delays across the 10 progressive levels. Prices double from $10 to $5,120.',
    steps: [
      'Verify your wallet is on the correct network with sufficient balance.',
      'Confirm previous levels are active before attempting the next one.',
      'Allow transaction confirmation time before checking again.',
      'If level remains unavailable, include wallet address and transaction hash in your request.',
    ],
  },
  orbit: {
    title: 'Orbit Issues',
    route: 'orbits',
    routeLabel: 'Open Orbits Page',
    description: 'Resolve placement, cycle, payout visibility, and orbit rendering issues across P4, P12, and P39 structures.',
    steps: [
      'Open the Orbits page and confirm you are viewing the correct level and wallet space.',
      'Check whether you are on the current cycle or a historical cycle before comparing positions.',
      'Allow a short delay when heavier orbit views such as P12 and P39 are loading.',
      'If a placement or payout still looks wrong, include the level, cycle, and transaction hash in your support request.',
    ],
  },
  wallet: {
    title: 'Wallet & Network',
    route: 'support',
    routeLabel: 'Stay on Support',
    description: 'Resolve wallet connection, network switching, signature prompts, and submission confirmations.',
    steps: [
      'Reconnect your wallet and confirm the expected account is selected.',
      'Verify the correct chain is active before attempting any on-chain action.',
      'Clear any stuck wallet prompt, refresh once, and retry carefully.',
      'If the issue persists, submit a ticket with the exact failed action and your wallet address.',
    ],
  },
}

// Updated resources - removed Documentation and Whitepaper
const fallbackResources = [
  { id: 'privacy', label: 'Privacy Policy', href: '#', icon: 'lock', isModal: true },
  { id: 'risk', label: 'Risk Disclaimer', href: '#', icon: 'alert', isModal: true },
  { id: 'transparency', label: 'Smart Contract Transparency', href: '#', icon: 'eye', isModal: true },
  { id: 'terms', label: 'Terms & Conditions', href: '#', icon: 'scale', isModal: true },
  { id: 'tutorials', label: 'Tutorial Videos', href: '#', icon: 'video', isModal: true, isComingSoon: true },
]

function getSocialVisual(platform = '') {
  const key = String(platform).toLowerCase()
  if (key.includes('telegram')) return { icon: FaTelegramPlane, className: 'is-telegram' }
  if (key.includes('discord')) return { icon: FaDiscord, className: 'is-discord' }
  if (key.includes('instagram')) return { icon: FaInstagram, className: 'is-instagram' }
  if (key.includes('facebook')) return { icon: FaFacebookF, className: 'is-facebook' }
  return { icon: FaXTwitter, className: 'is-x' }
}

function getResourceIcon(key = '') {
  if (key.includes('privacy')) return Lock
  if (key.includes('tutorial') || key.includes('video')) return Video
  if (key.includes('risk') || key.includes('alert')) return AlertTriangle
  if (key.includes('transparency') || key.includes('eye')) return Eye
  if (key.includes('term') || key.includes('scale')) return Scale
  return FileText
}

// Animated Counter Component
const AnimatedCounter = ({ value, label, icon: Icon, suffix = '' }) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let start = 0
    const duration = 1000
    const increment = value / (duration / 16)
    
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    
    return () => clearInterval(timer)
  }, [value])
  
  return (
    <div className="status-bar-item">
      <Icon size={14} />
      <span>{label}</span>
      <strong className="counter-value">{count}{suffix}</strong>
    </div>
  )
}

// Floating Support Button Component
const FloatingSupportButton = ({ onRefresh, telegramLink, onContactScroll }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.floating-support')) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])
  
  return (
    <div className="floating-support">
      <button 
        type="button"
        className="floating-support__trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <HelpCircle size={24} />
        <span className="pulse-dot" />
      </button>
      
      {isOpen && (
        <div className="floating-support__menu glass-panel">
          <button type="button" onClick={() => { onContactScroll(); setIsOpen(false); }}>
            <Mail size={16} /> Contact Support
          </button>
          <button type="button" onClick={() => { window.open(telegramLink, '_blank', 'noopener,noreferrer'); setIsOpen(false); }}>
            <FaTelegramPlane size={16} /> Telegram
          </button>
          <button type="button" onClick={() => { onRefresh(); setIsOpen(false); }}>
            <RefreshCw size={16} /> Refresh Data
          </button>
        </div>
      )}
    </div>
  )
}

// Modal Components for Legal Documents
const LegalModal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal__header">
          <h3>{title}</h3>
          <button type="button" className="legal-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="legal-modal__body">
          {children}
        </div>
        <div className="legal-modal__footer">
          <button type="button" className="legal-modal__close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

const ComingSoonModal = ({ isOpen, onClose, title }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal__header">
          <h3>{title}</h3>
          <button type="button" className="legal-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="legal-modal__body coming-soon-body">
          <div className="coming-soon-icon">
            <Video size={48} />
          </div>
          <h4>Tutorial Videos Underway</h4>
          <p>Video tutorials are currently being prepared and will be available soon. Stay tuned for step-by-step guides on registration, level activation, orbit navigation, and more.</p>
        </div>
        <div className="legal-modal__footer">
          <button type="button" className="legal-modal__close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

const SupportPage = ({ onNavigate }) => {
  const { isConnected, account, connect } = useWallet()
  const { contracts, loadContracts } = useContracts()

  // ALL hooks at the top level
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [systemStatus, setSystemStatus] = useState({ contracts: 'Checking...', network: 'Checking...', api: 'Checking...', indexer: 'Checking...', lastBlock: 0 })
  const [faqs, setFaqs] = useState([])
  const [faqOpenIndex, setFaqOpenIndex] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [announcements, setAnnouncements] = useState([])
  const [resources, setResources] = useState([])
  const [socialLinks, setSocialLinks] = useState([])
  const [recentTickets, setRecentTickets] = useState([])
  const [activeGuideKey, setActiveGuideKey] = useState(null)
  const [ticketForm, setTicketForm] = useState({ category: '', subject: '', message: '', txHash: '' })
  const [submitStatus, setSubmitStatus] = useState({ loading: false, success: false, error: null })
  const [copiedWallet, setCopiedWallet] = useState(false)

  // Modal states
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showRiskModal, setShowRiskModal] = useState(false)
  const [showTransparencyModal, setShowTransparencyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showTutorialModal, setShowTutorialModal] = useState(false)

  const categoryIcons = {
    'Getting Started': Rocket,
    'Levels & Activation': TrendingUp,
    'Orbits System': Orbit,
    'Referrals & Commissions': HelpCircle,
    'Technical Issues': AlertTriangle,
    'Account & Security': Shield,
    default: HelpCircle,
  }

  const handleResourceClick = (item) => {
    if (item.isComingSoon) {
      setShowTutorialModal(true)
    } else if (item.id === 'privacy') {
      setShowPrivacyModal(true)
    } else if (item.id === 'risk') {
      setShowRiskModal(true)
    } else if (item.id === 'transparency') {
      setShowTransparencyModal(true)
    } else if (item.id === 'terms') {
      setShowTermsModal(true)
    }
  }

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/faqs`)
      const data = await res.json()
      setFaqs(data?.ok && data?.data ? data.data : [])
    } catch {
      setFaqs([])
    }
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/community/announcements`)
      const data = await res.json()
      setAnnouncements(data?.ok ? data.data?.items?.slice(0, 5) || [] : [])
    } catch {
      setAnnouncements([])
    }
  }, [])

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/community/resources`)
      const data = await res.json()
      setResources(data?.ok ? data.data?.items || [] : [])
    } catch {
      setResources([])
    }
  }, [])

  const fetchSocialLinks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/community/social-links`)
      const data = await res.json()
      setSocialLinks(data?.ok ? data.data?.items || [] : [])
    } catch {
      setSocialLinks([])
    }
  }, [])

  const fetchRecentTickets = useCallback(async () => {
    if (!account) return setRecentTickets([])
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${account}`)
      const data = await res.json()
      setRecentTickets(data?.ok ? data.data?.slice(0, 3) || [] : [])
    } catch {
      setRecentTickets([])
    }
  }, [account])

  const checkSystemStatusSafe = useCallback(async () => {
    const next = { contracts: 'Checking...', network: 'Checking...', api: 'Checking...', indexer: 'Checking...', lastBlock: 0 }
    if (window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        next.network = chainId === '0x13882' ? 'Healthy' : 'Wrong Network'
      } catch {
        next.network = 'Unknown'
      }
    } else {
      next.network = 'No Wallet'
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`)
      const data = await res.json()
      next.api = data?.ok ? 'Online' : 'Degraded'
    } catch {
      next.api = 'Offline'
    }
    if (contracts?.provider) {
      try {
        next.lastBlock = await contracts.provider.getBlockNumber()
      } catch {
        next.lastBlock = 0
      }
    }
    setSystemStatus(next)
  }, [contracts])

  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        checkSystemStatusSafe(),
        fetchFaqs(),
        fetchAnnouncements(),
        fetchResources(),
        fetchSocialLinks(),
        isConnected ? fetchRecentTickets() : Promise.resolve(),
      ])
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
      setLoading(false)
    }
  }, [checkSystemStatusSafe, fetchFaqs, fetchAnnouncements, fetchResources, fetchSocialLinks, fetchRecentTickets, isConnected])

  useEffect(() => {
    if (isConnected) loadContracts().catch(console.error)
  }, [isConnected, loadContracts])

  useEffect(() => {
    refreshAllData()
    const interval = setInterval(refreshAllData, 60000)
    return () => clearInterval(interval)
  }, [refreshAllData])

  useEffect(() => {
    if (!activeGuideKey) {
      document.body.classList.remove('support-modal-open')
      return
    }
    document.body.classList.add('support-modal-open')
    return () => document.body.classList.remove('support-modal-open')
  }, [activeGuideKey])

  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (query.length > 1) {
      const suggestions = faqs
        .filter(faq => 
          faq.question?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5)
      setSearchSuggestions(suggestions)
    } else {
      setSearchSuggestions([])
    }
  }

  const filteredFaqs = useMemo(() => {
    let filtered = faqs
    if (selectedCategory !== 'all') filtered = filtered.filter((faq) => faq.category === selectedCategory)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((faq) => String(faq.question || '').toLowerCase().includes(query) || String(faq.answer || '').toLowerCase().includes(query))
    }
    return filtered
  }, [faqs, selectedCategory, searchQuery])

  const categories = useMemo(() => ['all', ...Array.from(new Set(faqs.map((faq) => faq.category))).filter(Boolean)], [faqs])
  const searchPreview = useMemo(() => filteredFaqs.slice(0, 4), [filteredFaqs])
  const telegramSupportLink = useMemo(() => {
    const telegram = socialLinks.find((link) => {
      const platform = String(link?.platform || link?.label || '').toLowerCase()
      const href = String(link?.href || '')
      return platform.includes('telegram') || href.includes('t.me')
    })
    return telegram?.href || 'https://t.me/'
  }, [socialLinks])

  const groupedFaqs = useMemo(() => {
    const grouped = {}
    filteredFaqs.forEach((faq) => {
      if (!grouped[faq.category]) grouped[faq.category] = []
      grouped[faq.category].push(faq)
    })
    return grouped
  }, [filteredFaqs])

  const activeGuide = activeGuideKey ? QUICK_HELP_GUIDES[activeGuideKey] : null

  const copyWallet = () => {
    if (!account) return
    navigator.clipboard.writeText(account)
    setCopiedWallet(true)
    setTimeout(() => setCopiedWallet(false), 2000)
  }

  const handleFormChange = (field, value) => setTicketForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmitTicket = async () => {
    if (!ticketForm.category || !ticketForm.subject || !ticketForm.message) {
      setSubmitStatus({ loading: false, success: false, error: 'Please complete the required fields before sending your request.' })
      return
    }
    setSubmitStatus({ loading: true, success: false, error: null })
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: account, ...ticketForm }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.message || 'Submission failed')
      setSubmitStatus({ loading: false, success: true, error: null })
      setTicketForm({ category: '', subject: '', message: '', txHash: '' })
      fetchRecentTickets()
      setTimeout(() => setSubmitStatus({ loading: false, success: false, error: null }), 3000)
    } catch (err) {
      setSubmitStatus({ loading: false, success: false, error: err.message || 'Submission failed' })
    }
  }

  const getCategoryIcon = (category) => {
    const Icon = categoryIcons[category] || categoryIcons.default
    return <Icon size={18} />
  }

  const scrollToContact = () => {
    document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Early return AFTER all hooks
  if (!isConnected) {
    return (
      <section className="support-page">
        <div className="support-hero glass-panel">
          <div className="support-hero__left">
            <div className="support-hero__text-block">
              <h1 className="support-hero__title">Support Center</h1>
              <p className="support-hero__description soft-text">Connect your wallet to access support resources, guided help, and personalized ticket submission. Fin Freedom Network rewards intentional participation, not shortcuts.</p>
            </div>
            <button type="button" onClick={connect} className="connect-wallet-btn"><Wallet size={18} /> Connect Wallet</button>
          </div>
          <div className="support-hero__right">
            <div className="support-country-mosaic">
              {SUPPORT_COUNTRIES.map((country) => (
                <a key={country.id} href="https://t.me/" className="support-country-mosaic__card" target="_blank" rel="noopener noreferrer">
                  <img src={country.image} alt={country.name} className="support-country-mosaic__image" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="support-page">
      {/* Modals */}
      <LegalModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="Privacy Policy">
        <div className="legal-content">
          <h4>1. Data Collection Philosophy</h4>
          <p>Fin Freedom Network is designed to collect minimal data. The Platform does not require: names, email addresses, phone numbers, government-issued identification. The Platform is built to function without traditional user accounts or centralized identity records.</p>
          <h4>2. Information Collected</h4>
          <p>The Platform may collect or process: public wallet addresses, on-chain transaction data, referral relationships recorded on-chain, website usage data (if applicable).</p>
          <h4>3. Blockchain Transparency</h4>
          <p>Blockchain data is public, permanent, and accessible to anyone. Your wallet address and all transactions are publicly visible. Fin Freedom Network cannot alter, hide, or delete blockchain data.</p>
          <h4>4. No Sale or Monetization of Data</h4>
          <p>Fin Freedom Network does not sell, rent, trade, or monetize user data. The Platform does not engage in data brokerage or targeted advertising based on personal information.</p>
        </div>
      </LegalModal>

      <LegalModal isOpen={showRiskModal} onClose={() => setShowRiskModal(false)} title="Risk Disclaimer">
        <div className="legal-content">
          <p style={{ fontWeight: 'bold', color: 'var(--danger)', marginBottom: '16px' }}>IMPORTANT NOTICE</p>
          <p>Participation in Fin Freedom Network involves significant risks. You should only participate if you fully understand and willingly accept these risks.</p>
          <h4>1. Blockchain & Smart Contract Risks</h4>
          <p>Smart contracts operate autonomously once deployed and may be difficult or impossible to modify. Risks include vulnerabilities, coding errors, protocol exploits, and chain reorganizations.</p>
          <h4>2. Token & Digital Asset Risks</h4>
          <p>Tokens may fluctuate in value, experience low liquidity, lose value entirely, or be affected by regulatory actions. There is no assurance that any token will maintain value or utility.</p>
          <h4>3. No Financial, Legal, or Tax Advice</h4>
          <p>Nothing provided constitutes investment, financial, legal, or tax advice. You are solely responsible for seeking independent professional advice.</p>
          <h4>4. User Error & Security Risks</h4>
          <p>Fin Freedom Network cannot reverse transactions or recover lost assets from user errors, phishing, or compromised wallets.</p>
        </div>
      </LegalModal>

      <LegalModal isOpen={showTransparencyModal} onClose={() => setShowTransparencyModal(false)} title="Smart Contract Transparency">
        <div className="legal-content">
          <h4>On-Chain Smart Contracts</h4>
          <p>Fin Freedom Network is built with transparency and safety at its core. All core mechanisms are enforced by immutable smart contracts deployed on public blockchains.</p>
          <h4>Security Features</h4>
          <ul>
            <li>No admin access to user funds</li>
            <li>Deterministic payout rules</li>
            <li>Multisig governance</li>
            <li>External audits planned</li>
          </ul>
          <h4>Verifiable Operations</h4>
          <p>Users can independently verify all rules and transactions on-chain. Every reward follows a clear, predefined structure that cannot be altered arbitrarily.</p>
          <h4>Ecosystem Roadmap</h4>
          <ul>
            <li>Phase 2: Freedom-Plus Program rollout</li>
            <li>Phase 3: Freedom NFT Program activation</li>
            <li>Phase 4: Token utilities & governance expansion</li>
            <li>Phase 5: Marketplace, Academy, and ecosystem integrations</li>
          </ul>
        </div>
      </LegalModal>

      <LegalModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title="Terms & Conditions">
        <div className="legal-content">
          <h4>1. Acceptance of Terms</h4>
          <p>By accessing, registering, or using any part of the Fin Freedom Network platform, you confirm that you have read, understood, and agreed to be bound by these Terms & Conditions.</p>
          <h4>2. Nature of the Platform</h4>
          <p>Fin Freedom Network is a decentralized, blockchain-based platform that operates through smart contracts. The Platform does not hold user funds, control user wallets, or guarantee earnings.</p>
          <h4>3. Wallet Responsibility</h4>
          <p>You are solely responsible for safeguarding your wallet credentials. Wallet addresses cannot be changed once registered. Lost private keys cannot be recovered.</p>
          <h4>4. No Guarantees</h4>
          <p>Fin Freedom Network makes no guarantees regarding profits, income, returns, referrals, or future platform performance.</p>
          <h4>5. Smart Contract Finality</h4>
          <p>Blockchain transactions are irreversible. Once confirmed, they cannot be reversed or refunded.</p>
        </div>
      </LegalModal>

      <ComingSoonModal isOpen={showTutorialModal} onClose={() => setShowTutorialModal(false)} title="Tutorial Videos" />

      <div className="support-hero glass-panel">
        <div className="support-hero__left">
          <div className="support-hero__eyebrow glass-panel">
            <span className="support-hero__eyebrow-dot" />
            <span className="support-hero__eyebrow-text">Wallet-first support and guidance</span>
          </div>

          <div className="support-hero__text-block">
            <h1 className="support-hero__title">Support Center</h1>
            <p className="support-hero__description soft-text">
              Fin Freedom Network is built on transparent, on-chain mechanisms. Find the right help path quickly, review trusted answers, and contact support with relevant wallet addresses and transaction hashes for faster resolution.
            </p>
          </div>

          <div className="support-hero__tools">
            <div className="support-hero__search-col">
              <div className="support-search glass-panel">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search support topics, registration help, activation issues, or orbit questions..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                {searchQuery ? <button className="search-clear" onClick={() => setSearchQuery('')} type="button"><X size={14} /></button> : null}
                {searchSuggestions.length > 0 && (
                  <div className="search-suggestions glass-panel">
                    {searchSuggestions.map(suggestion => (
                      <button 
                        key={suggestion._id}
                        onClick={() => {
                          setSearchQuery(suggestion.question)
                          setSearchSuggestions([])
                        }}
                      >
                        <Search size={12} />
                        {suggestion.question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="support-hero__topics-col">
              <div className="support-hero__chips">
                <button type="button" className={`support-hero__chip glass-panel ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>All Topics</button>
                {categories.slice(1, 5).map((cat) => (
                  <button type="button" key={cat} className={`support-hero__chip glass-panel ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>
          </div>

          {searchQuery ? (
            <div className="support-search-results glass-panel">
              <div className="support-search-results__header">
                <span><Search size={14} /> {filteredFaqs.length} result{filteredFaqs.length === 1 ? '' : 's'} for "{searchQuery}"</span>
                <button type="button" className="support-search-results__link" onClick={() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })}>View full results <ChevronRight size={12} /></button>
              </div>
              <div className="support-search-results__list">
                {searchPreview.length ? searchPreview.map((faq) => (
                  <button key={faq._id || faq.id} type="button" className="support-search-results__item" onClick={() => { setFaqOpenIndex(faq._id || faq.id); document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' }) }}>
                    <strong>{faq.question}</strong>
                    <span>{faq.category}</span>
                  </button>
                )) : <div className="support-search-results__empty soft-text">No direct matches found yet. Try a broader keyword or use the support request section below.</div>}
              </div>
            </div>
          ) : null}

          <div className="support-country-strip-block">
            <p className="support-country-strip__lead soft-text">You can also get direct Telegram support with dedicated community guidance for these supported countries.</p>
          
            <div className="support-country-strip-container">
              <div className="support-country-strip">
                {SUPPORT_COUNTRIES.map((country) => (
                  <a
                    key={country.id}
                    href={telegramSupportLink}
                    className="support-country-strip__card"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img src={country.image} alt={country.name} className="support-country-strip__image" />
                    <span>{country.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="support-status-bar glass-panel">
        <div className="status-bar-grid">
          <AnimatedCounter 
            value={systemStatus.network === 'Healthy' ? 100 : systemStatus.network === 'Wrong Network' ? 50 : 0} 
            label="Network" 
            icon={Wifi} 
            suffix="%" 
          />
          <div className="status-bar-item">
            <Activity size={14} />
            <span>API</span>
            <strong>{systemStatus.api}</strong>
          </div>
          <AnimatedCounter value={faqs.length} label="FAQs" icon={BookOpen} />
          <AnimatedCounter value={resources.length || fallbackResources.length} label="Resources" icon={Database} />
        </div>
      </section>

      <section className="support-quick-help glass-panel">
        <div className="support-section-heading">
          <span className="support-section-heading__eyebrow muted-text">Quick Help</span>
          <h2 className="support-section-heading__title">Jump directly to what you need</h2>
        </div>
        <div className="support-quick-help__grid">
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('registration')}>
            <span className="support-quick-help__icon"><Rocket size={24} style={{ color: 'var(--glow-teal)' }} /></span>
            <span className="support-quick-help__title">Registration Help</span>
            <span className="support-quick-help__text soft-text">Onboarding steps, sponsor confirmation, and irreversible registration.</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('levels')}>
            <span className="support-quick-help__icon"><TrendingUp size={24} style={{ color: 'var(--glow-blue)' }} /></span>
            <span className="support-quick-help__title">Levels & Activation</span>
            <span className="support-quick-help__text soft-text">10 progressive levels, activation checks, and progression rules.</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('orbit')}>
            <span className="support-quick-help__icon"><Orbit size={24} style={{ color: '#8b5cf6' }} /></span>
            <span className="support-quick-help__title">Orbit Issues</span>
            <span className="support-quick-help__text soft-text">Placements, cycles (P4, P12, P39), and payout visibility.</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('wallet')}>
            <span className="support-quick-help__icon"><Wallet size={24} style={{ color: '#f59e0b' }} /></span>
            <span className="support-quick-help__title">Wallet & Network</span>
            <span className="support-quick-help__text soft-text">Connection, network switching, and transaction confirmations.</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
        </div>
      </section>

      <section id="contact-section" className="support-contact glass-panel">
        <div className="support-section-heading">
          <span className="support-section-heading__eyebrow muted-text">Contact Support</span>
          <h2 className="support-section-heading__title">Send a support request</h2>
        </div>
        <div className="support-contact__grid">
          <div className="support-contact__form">
            <div className="support-contact__field-group">
              <label className="support-contact__label muted-text">Support Category *</label>
              <select className="support-contact__select glass-panel" value={ticketForm.category} onChange={(e) => handleFormChange('category', e.target.value)}>
                <option value="">Choose the support area</option>
                <option value="registration">Registration Issues</option>
                <option value="levels">Level Activation</option>
                <option value="orbits">Orbit Problems</option>
                <option value="referrals">Referral Issues</option>
                <option value="wallet">Wallet Connection</option>
                <option value="transaction">Transaction Errors</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="support-contact__field-group">
              <label className="support-contact__label muted-text">Your Wallet</label>
              <div className="support-contact__wallet-display glass-panel">
                <span>{account ? `${account.slice(0, 8)}...${account.slice(-6)}` : 'Not connected'}</span>
                {account ? <button className="copy-wallet-btn" onClick={copyWallet} type="button">{copiedWallet ? <Check size={14} /> : <Copy size={14} />}</button> : null}
              </div>
            </div>
            <div className="support-contact__field-group">
              <label className="support-contact__label muted-text">Subject *</label>
              <input type="text" className="support-contact__input glass-panel" placeholder="Summarize the issue clearly" value={ticketForm.subject} onChange={(e) => handleFormChange('subject', e.target.value)} />
            </div>
            <div className="support-contact__field-group">
              <label className="support-contact__label muted-text">Transaction Hash (Optional)</label>
              <input type="text" className="support-contact__input glass-panel" placeholder="0x... (include for faster resolution)" value={ticketForm.txHash} onChange={(e) => handleFormChange('txHash', e.target.value)} />
            </div>
            <div className="support-contact__field-group">
              <label className="support-contact__label muted-text">Message *</label>
              <textarea className="support-contact__textarea glass-panel" placeholder="Describe what happened, what you expected, and the steps you already tried. Include level, cycle, and any error messages." value={ticketForm.message} onChange={(e) => handleFormChange('message', e.target.value)} rows={6} />
            </div>
            <div className="support-info-note glass-panel">
              <Info size={14} />
              <span className="soft-text">Blockchain transactions are irreversible. Always verify details before signing.</span>
            </div>
            {submitStatus.success ? <div className="support-success-message"><CheckCircle size={16} /> Support request submitted successfully. Our team will review it and respond as soon as possible.</div> : null}
            {submitStatus.error ? <div className="support-error-message"><AlertCircle size={16} /> {submitStatus.error}</div> : null}
            <div className="support-contact__actions">
              <button type="button" className="support-contact__primary-btn" onClick={handleSubmitTicket} disabled={submitStatus.loading}>
                {submitStatus.loading ? <><RefreshCw size={16} className="spin" /> Submitting...</> : <><Send size={16} /> Submit Request</>}
              </button>
              <button type="button" className="support-contact__secondary-btn" onClick={() => setTicketForm({ category: '', subject: '', message: '', txHash: '' })}>Clear Form</button>
            </div>
          </div>

          <div className="support-contact__side">
            <div className="support-contact__assist-card">
              <LifeBuoy size={20} />
              <div>
                <strong>Before you submit</strong>
                <p className="soft-text">Include your wallet address, level, cycle, and transaction hash whenever applicable. This gives support the best chance of resolving your issue quickly.</p>
              </div>
            </div>
            <div className="support-contact__assist-card">
              <Shield size={20} style={{ color: 'var(--glow-teal)' }} />
              <div>
                <strong>Wallet responsibility</strong>
                <p className="soft-text">You are solely responsible for securing your wallet. Fin Freedom Network will never request your private key or recovery phrase.</p>
              </div>
            </div>
            {recentTickets.length ? 
              <div className="support-recent-tickets">
                <h4>Your Recent Tickets</h4>
                <div className="recent-tickets-list">
                  {recentTickets.map((ticket) => 
                    <div key={ticket._id} className={`recent-ticket-item status-${ticket.status}`}>
                      <span className="ticket-subject">{ticket.subject}</span>
                      <span className="ticket-status">{ticket.status}</span>
                      <span className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div> : 
              <div className="support-contact__assist-card support-contact__assist-card--muted">
                <Info size={20} />
                <div>
                  <strong>No recent tickets yet</strong>
                  <p className="soft-text">Once you submit a request, your recent support activity will appear here.</p>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <section id="faq-section" className="support-faq glass-panel">
        <div className="support-section-heading">
          <span className="support-section-heading__eyebrow muted-text">Knowledge Base</span>
          <h2 className="support-section-heading__title">Frequently Asked Questions</h2>
          <p className="soft-text">Clear answers about participation, progression, and platform rules</p>
        </div>
        {searchQuery ? <div className="search-results-info"><Search size={14} /> Found {filteredFaqs.length} result{filteredFaqs.length === 1 ? '' : 's'} for "{searchQuery}"</div> : null}
        {loading ? 
          <div className="faq-loading"><RefreshCw size={24} className="spin" /><span>Loading FAQs...</span></div> : 
          <div className="support-faq__categories">
            {Object.entries(groupedFaqs).map(([category, items]) => 
              <div key={category} className="support-faq__category">
                <h3 className="faq-category-title">
                  {getCategoryIcon(category)}
                  <span>{category}</span>
                  <span className="category-count">{items.length}</span>
                </h3>
                {items.map((faq) => 
                  <div key={faq._id || faq.id} className="support-faq__item">
                    <div className="support-faq__question-row" onClick={() => setFaqOpenIndex(faqOpenIndex === (faq._id || faq.id) ? null : (faq._id || faq.id))}>
                      <h3 className="support-faq__question">{faq.question}</h3>
                      <span className="support-faq__icon">{faqOpenIndex === (faq._id || faq.id) ? <X size={16} /> : <ChevronRight size={16} />}</span>
                    </div>
                    {faqOpenIndex === (faq._id || faq.id) ? <p className="support-faq__answer soft-text">{faq.answer}</p> : null}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      </section>

      <section className="support-safety glass-panel">
        <div className="support-section-heading">
          <span className="support-section-heading__eyebrow muted-text">Security & Transparency</span>
          <h2 className="support-section-heading__title">Safety Guidance</h2>
        </div>
        <div className="support-safety__grid">
          <div className="support-safety__item">
            <span className="support-safety__icon"><Shield size={20} style={{ color: 'var(--glow-teal)' }} /></span>
            <div>
              <h3 className="support-safety__title">Never share your seed phrase</h3>
              <p className="support-safety__text soft-text">Fin Freedom Network will never ask for your seed phrase, private keys, or recovery phrase.</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><AlertTriangle size={20} style={{ color: '#f59e0b' }} /></span>
            <div>
              <h3 className="support-safety__title">Transactions are irreversible</h3>
              <p className="support-safety__text soft-text">Once confirmed on the blockchain, transactions cannot be reversed or refunded. Always verify details before signing.</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><Eye size={20} style={{ color: 'var(--glow-blue)' }} /></span>
            <div>
              <h3 className="support-safety__title">No admin access to funds</h3>
              <p className="support-safety__text soft-text">Smart contracts enforce deterministic payout rules. No single individual has unilateral authority over user funds.</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><Search size={20} style={{ color: 'var(--glow-blue)' }} /></span>
            <div>
              <h3 className="support-safety__title">Review transaction details</h3>
              <p className="support-safety__text soft-text">Check the wallet prompt, value, and target action before you confirm any transaction.</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><AlertCircle size={20} style={{ color: '#ef4444' }} /></span>
            <div>
              <h3 className="support-safety__title">Avoid unofficial links</h3>
              <p className="support-safety__text soft-text">Use only trusted support channels and never send funds to unknown addresses.</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><Scale size={20} style={{ color: '#8b5cf6' }} /></span>
            <div>
              <h3 className="support-safety__title">Wallet addresses are final</h3>
              <p className="support-safety__text soft-text">Wallet addresses cannot be changed after registration. If compromised, you must create a new wallet before registering.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="support-announcements glass-panel">
        <div className="support-section-heading">
          <span className="support-section-heading__eyebrow muted-text">Updates</span>
          <h2 className="support-section-heading__title">Announcements</h2>
          <p className="soft-text">Transparent communication and community updates</p>
        </div>
        <div className="announcements-list">
          {announcements.length ? announcements.map((item) => 
            <div key={item._id || item.title} className={`announcement-item type-${item.type || 'info'}`}>
              <div className="announcement-header">
                <span className="announcement-title">
                  {item.type === 'warning' ? <AlertTriangle size={14} /> : item.type === 'success' ? <CheckCircle size={14} /> : <Info size={14} />}
                  {item.title}
                </span>
                <span className="announcement-date">{item.date}</span>
              </div>
              <p className="announcement-content">{item.content}</p>
            </div>
          ) : 
            <div className="announcement-item type-info">
              <div className="announcement-header">
                <span className="announcement-title"><Info size={14} /> All systems are currently operating normally</span>
                <span className="announcement-date">Today</span>
              </div>
              <p className="announcement-content">Fresh platform announcements will appear here as soon as they are published.</p>
            </div>
          }
        </div>
      </section>

      <section className="support-resources glass-panel">
        <div className="support-section-heading">
          <span className="support-section-heading__eyebrow muted-text">Resources</span>
          <h2 className="support-section-heading__title">Helpful Links</h2>
        </div>
        <div className="resources-grid">
          {(resources.length ? resources : fallbackResources).map((item) => {
            const Icon = getResourceIcon(item.key || item.label || '')
            return (
              <button
                key={item._id || item.id || item.label}
                className="resource-link resource-link--modal"
                onClick={() => handleResourceClick(item)}
                type="button"
              >
                <span className="resource-link__icon"><Icon size={16} /></span>
                <span>{item.label}</span>
                {item.isComingSoon && <span className="coming-soon-badge">Soon</span>}
              </button>
            )
          })}
        </div>
        <div className="support-community-links">
          <h4>Join our community</h4>
          <div className="social-icons">
            {(socialLinks.length ? socialLinks : [
              { platform: 'Telegram', href: 'https://t.me/' },
              { platform: 'Discord', href: 'https://discord.gg/' },
              { platform: 'X', href: 'https://x.com/' },
            ]).map((link) => {
              const platformLabel = link.platform || link.label || link.key || 'Community'
              const visual = getSocialVisual(platformLabel)
              const SocialIcon = visual.icon
              return (
                <a key={link._id || platformLabel} href={link.href || '#'} className={`social-icon ${visual.className}`} target="_blank" rel="noopener noreferrer">
                  <span className="social-icon__badge"><SocialIcon size={15} /></span>
                </a>
              )
            })}
          </div>
        </div>
        {/* <div className="support-contact-info">
          <h4>Direct contact</h4>
          <div className="contact-methods">
            <a href="mailto:support@finfreedom.io" className="contact-method"><Mail size={14} /> support@finfreedom.io</a>
            <span className="response-time">Average response window: within 24 hours</span>
          </div>
        </div> */}
      </section>

      {activeGuide ? 
        <div className="support-guide-modal__backdrop" onClick={() => setActiveGuideKey(null)}>
          <div className="support-guide-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="support-guide-modal__header">
              <div>
                <span className="support-section-heading__eyebrow muted-text">Quick Help Guide</span>
                <h3>{activeGuide.title}</h3>
                <p className="soft-text">{activeGuide.description}</p>
              </div>
              <button type="button" className="support-guide-modal__close" onClick={() => setActiveGuideKey(null)}><X size={16} /></button>
            </div>
            <div className="support-guide-modal__body">
              <ol className="support-guide-modal__steps">
                {activeGuide.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </div>
            <div className="support-guide-modal__footer">
              <button type="button" className="support-contact__secondary-btn" onClick={() => setActiveGuideKey(null)}>Close</button>
              <button type="button" className="support-contact__primary-btn" onClick={() => { 
                setActiveGuideKey(null); 
                if (activeGuide.route === 'support') { 
                  document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' }) 
                } else { 
                  onNavigate?.(activeGuide.route) 
                } 
              }}>
                <span>{activeGuide.routeLabel}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div> : null
      }

      <FloatingSupportButton 
        onRefresh={refreshAllData}
        telegramLink={telegramSupportLink}
        onContactScroll={scrollToContact}
      />
    </section>
  )
}

export default SupportPage