import './SupportPage.css'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import {
  AlertCircle, AlertTriangle, BookOpen, Check, CheckCircle, ChevronRight, Copy,
  ExternalLink, HelpCircle, Info, LifeBuoy, Mail, RefreshCw, Rocket, Search,
  Send, Shield, TrendingUp, Wallet, Wifi, Activity, Database, X, Orbit, FileText,
  FileCheck, Lock, Video
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
    description: 'Use this path when a new member needs help joining correctly and completing the first clean setup.',
    steps: [
      'Confirm the wallet is connected before starting the registration flow.',
      'Verify the sponsor or referral link before submitting the registration transaction.',
      'Wait for the transaction to confirm fully before refreshing the page.',
      'If registration still does not appear, copy the wallet address and transaction hash and send them in a support request.',
    ],
  },
  levels: {
    title: 'Levels & Activation',
    route: 'activation-center',
    routeLabel: 'Open Activation Center',
    description: 'Use this guide when a level does not activate, appears delayed, or looks inconsistent after submission.',
    steps: [
      'Check that the wallet is on the correct network and has the needed balance.',
      'Confirm the previous level is active if progression rules require it.',
      'After submitting, allow the transaction to settle before checking again.',
      'If the level is still unavailable, include the wallet and transaction hash in your support request.',
    ],
  },
  orbit: {
    title: 'Orbit Issues',
    route: 'orbits',
    routeLabel: 'Open Orbits Page',
    description: 'Use this guide for placements, cycle questions, payout visibility, and orbit rendering issues.',
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
    description: 'Use this guide when wallet connection, network switching, signature prompts, or submission confirmations are failing.',
    steps: [
      'Reconnect the wallet and confirm the expected account is selected.',
      'Verify the correct chain is active before attempting any on-chain action.',
      'Clear any stuck wallet prompt, refresh once, and retry carefully.',
      'If the issue persists, submit a ticket with the exact failed action and your wallet address.',
    ],
  },
}

const fallbackResources = [
  { id: 'docs', label: 'Documentation', href: '#', icon: 'docs' },
  { id: 'whitepaper', label: 'Whitepaper', href: '#', icon: 'file' },
  { id: 'privacy', label: 'Privacy Policy', href: '#', icon: 'lock' },
  { id: 'tutorials', label: 'Tutorial Videos', href: '#', icon: 'video' },
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
  if (key.includes('doc')) return BookOpen
  if (key.includes('white')) return FileCheck
  if (key.includes('privacy')) return Lock
  if (key.includes('tutorial') || key.includes('video')) return Video
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
        className="floating-support__trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <HelpCircle size={24} />
        <span className="pulse-dot" />
      </button>
      
      {isOpen && (
        <div className="floating-support__menu glass-panel">
          <button onClick={() => { onContactScroll(); setIsOpen(false); }}>
            <Mail size={16} /> Contact Support
          </button>
          <button onClick={() => { window.open(telegramLink, '_blank'); setIsOpen(false); }}>
            <FaTelegramPlane size={16} /> Telegram
          </button>
          <button onClick={() => { onRefresh(); setIsOpen(false); }}>
            <RefreshCw size={16} /> Refresh Data
          </button>
        </div>
      )}
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

  const categoryIcons = {
    'Getting Started': Rocket,
    'Levels & Activation': TrendingUp,
    'Orbits System': Orbit,
    'Referrals & Commissions': HelpCircle,
    'Technical Issues': AlertTriangle,
    'Account & Security': Shield,
    default: HelpCircle,
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
              <p className="support-hero__description soft-text">Connect your wallet to unlock direct support, guided help, and personalized ticket submission.</p>
            </div>
            <button onClick={connect} className="connect-wallet-btn"><Wallet size={18} /> Connect Wallet</button>
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
      <div className="support-hero glass-panel">
        <div className="support-hero__left">
          <div className="support-hero__eyebrow glass-panel">
            <span className="support-hero__eyebrow-dot" />
            <span className="support-hero__eyebrow-text">Help, guidance, issue reporting, and user safety</span>
          </div>

          <div className="support-hero__text-block">
            <h1 className="support-hero__title">Support Center</h1>
            <p className="support-hero__description soft-text">Find the right help path quickly, review trusted answers, and contact support with enough detail for faster resolution.</p>
          </div>

          <div className="support-hero__tools">
            <div className="support-hero__search-col">
              <div className="support-search glass-panel">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search support topics, onboarding help, activation issues, or wallet questions"
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
            <span className="support-quick-help__text soft-text">Onboarding steps, sponsor confirmation, and registration recovery.</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('levels')}>
            <span className="support-quick-help__icon"><TrendingUp size={24} style={{ color: 'var(--glow-blue)' }} /></span>
            <span className="support-quick-help__title">Levels & Activation</span>
            <span className="support-quick-help__text soft-text">Activation checks, progression rules, and visibility guidance.</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('orbit')}>
            <span className="support-quick-help__icon"><Orbit size={24} style={{ color: '#8b5cf6' }} /></span>
            <span className="support-quick-help__title">Orbit Issues</span>
            <span className="support-quick-help__text soft-text">Placements, cycles, orbit loading, and payout visibility.</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('wallet')}>
            <span className="support-quick-help__icon"><Wallet size={24} style={{ color: '#f59e0b' }} /></span>
            <span className="support-quick-help__title">Wallet & Network</span>
            <span className="support-quick-help__text soft-text">Connection, wrong network, wallet prompts, and transaction support.</span>
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
              <input type="text" className="support-contact__input glass-panel" placeholder="0x..." value={ticketForm.txHash} onChange={(e) => handleFormChange('txHash', e.target.value)} />
            </div>
            <div className="support-contact__field-group">
              <label className="support-contact__label muted-text">Message *</label>
              <textarea className="support-contact__textarea glass-panel" placeholder="Describe what happened, what you expected, and the steps you already tried." value={ticketForm.message} onChange={(e) => handleFormChange('message', e.target.value)} rows={6} />
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
                <p className="soft-text">Include the wallet, level, cycle, and transaction hash whenever they apply. That gives support the best chance of resolving the issue quickly.</p>
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
          <span className="support-section-heading__eyebrow muted-text">Security</span>
          <h2 className="support-section-heading__title">Safety Guidance</h2>
        </div>
        <div className="support-safety__grid">
          <div className="support-safety__item">
            <span className="support-safety__icon"><Shield size={20} style={{ color: 'var(--glow-teal)' }} /></span>
            <div>
              <h3 className="support-safety__title">Never share your seed phrase</h3>
              <p className="support-safety__text soft-text">FFN will never ask for your seed phrase or private keys.</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><AlertTriangle size={20} style={{ color: '#f59e0b' }} /></span>
            <div>
              <h3 className="support-safety__title">Verify the active network first</h3>
              <p className="support-safety__text soft-text">Always confirm the expected chain before signing or submitting a transaction.</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><Search size={20} style={{ color: 'var(--glow-blue)' }} /></span>
            <div>
              <h3 className="support-safety__title">Review transaction details carefully</h3>
              <p className="support-safety__text soft-text">Check the wallet prompt, value, and target action before you confirm anything.</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><AlertCircle size={20} style={{ color: '#ef4444' }} /></span>
            <div>
              <h3 className="support-safety__title">Avoid unofficial links and contacts</h3>
              <p className="support-safety__text soft-text">Use only trusted support channels and never send funds to unknown addresses.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="support-announcements glass-panel">
        <div className="support-section-heading">
          <span className="support-section-heading__eyebrow muted-text">Updates</span>
          <h2 className="support-section-heading__title">Announcements</h2>
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
              <a key={item._id || item.id || item.label} href={item.href || '#'} className="resource-link" target={item.href ? '_blank' : undefined} rel={item.href ? 'noopener noreferrer' : undefined}>
                <span className="resource-link__icon"><Icon size={16} /></span>
                <span>{item.label}</span>
                {item.href ? <ExternalLink size={12} /> : null}
              </a>
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
        <div className="support-contact-info">
          <h4>Direct contact</h4>
          <div className="contact-methods">
            <a href="mailto:support@finfreedom.io" className="contact-method"><Mail size={14} /> support@finfreedom.io</a>
            <span className="response-time">Average response window: within 24 hours</span>
          </div>
        </div>
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