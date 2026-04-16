import './SupportPage.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { ethers } from 'ethers'
import {
  HelpCircle, AlertCircle, CheckCircle, MessageCircle, Search, X,
  LifeBuoy, TrendingUp, Orbit, Wallet, Shield, Wifi, Activity,
  Database, Clock, Send, Copy, Check, ExternalLink, ChevronRight,
  BookOpen, FileText, Lock, Video, FileCheck, Users, Globe,
  Mail, MessageSquare, Phone, AlertTriangle, Info, Bell, Tag, Rocket,
  Wrench,
  ArrowRight, RefreshCw, MapPinned
} from 'lucide-react'

const API_BASE_URL = 'https://fin-freedom-backend-3.onrender.com'


const SUPPORT_COUNTRIES = Array.from({ length: 9 }, (_, index) => ({
  id: `country-${index + 1}`,
  image: `/assets/images/support-country-${index + 1}.png`,
}))

const QUICK_HELP_GUIDES = {
  registration: {
    title: 'Registration Help',
    route: 'community',
    routeLabel: 'Open Community Hub',
    description: 'Follow the cleanest path for joining with the correct sponsor, wallet, and activation flow.',
    steps: [
      'Confirm your wallet is connected to the correct network before starting registration.',
      'Use the correct sponsor or referral link and verify the sponsor address before submitting.',
      'Complete registration, then wait for the confirmation to settle before refreshing the page.',
      'If the flow stalls, copy the transaction hash and include it in a support ticket.',
    ],
  },
  levels: {
    title: 'Levels & Activation',
    route: 'activation-center',
    routeLabel: 'Open Activation Center',
    description: 'Use this guide when a level does not activate, appears delayed, or seems inconsistent.',
    steps: [
      'Check that your wallet has the required balance and network selected before activating.',
      'Confirm the previous level is active when the progression rule requires it.',
      'After submitting, allow the transaction to confirm and then refresh the page once.',
      'If the level is still not visible, include your wallet and transaction hash in a support request.',
    ],
  },
  orbit: {
    title: 'Orbit Issues',
    route: 'orbits',
    routeLabel: 'Open Orbits Page',
    description: 'Use this guide for orbit placements, cycle questions, fill behavior, and payout visibility.',
    steps: [
      'Open the Orbits page and confirm you are viewing the correct level and current wallet space.',
      'Check whether the level is showing the latest cycle or a historical cycle before comparing data.',
      'Allow a short delay for heavier orbit views like P12 and P39 to finish loading.',
      'If a placement or payout looks wrong, capture the level, cycle, and transaction hash for support.',
    ],
  },
  wallet: {
    title: 'Wallet & Network',
    route: 'support',
    routeLabel: 'Stay on Support',
    description: 'Use this guide when wallet connection, network switching, or signature prompts are failing.',
    steps: [
      'Reconnect your wallet and confirm the correct account is selected.',
      'Verify the expected chain is active before retrying any on-chain action.',
      'Clear any stuck wallet prompt, then refresh the page and try once more.',
      'If the issue continues, submit a ticket with your wallet address and what action failed.',
    ],
  },
}

const SupportPage = ({ onNavigate }) => {
  const { isConnected, account, connect } = useWallet()
  const { contracts, loadContracts } = useContracts()

  // ================= STATE =================
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  
  // System Status
  const [systemStatus, setSystemStatus] = useState({
    contracts: 'Checking...',
    network: 'Checking...',
    api: 'Checking...',
    indexer: 'Checking...',
    lastBlock: 0
  })
  
  // FAQs
  const [faqs, setFaqs] = useState([])
  const [faqOpenIndex, setFaqOpenIndex] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Announcements
  const [announcements, setAnnouncements] = useState([])
  
  // Resources & Social Links
  const [resources, setResources] = useState([])
  const [socialLinks, setSocialLinks] = useState([])
  
  // Ticket Form
  const [ticketForm, setTicketForm] = useState({
    category: '',
    subject: '',
    message: '',
    txHash: ''
  })
  const [submitStatus, setSubmitStatus] = useState({ loading: false, success: false, error: null })
  const [copiedWallet, setCopiedWallet] = useState(false)
  
  // Recent Tickets (for logged-in users)
  const [recentTickets, setRecentTickets] = useState([])
  const [activeGuideKey, setActiveGuideKey] = useState(null)

  // ================= CATEGORY ICONS =================
  const categoryIcons = {
    'Getting Started': Rocket,
    'Levels & Activation': TrendingUp,
    'Orbits System': Orbit,
    'Referrals & Commissions': Users,
    'Technical Issues': Wrench,
    'Account & Security': Shield,
    'default': HelpCircle
  }

  const statusIcons = {
    'Operational': CheckCircle,
    'Healthy': CheckCircle,
    'Active': CheckCircle,
    'Online': CheckCircle,
    'Degraded': AlertTriangle,
    'Error': AlertCircle,
    'Wrong Network': AlertTriangle,
    'Unknown': HelpCircle,
    'default': Activity
  }

  // ================= DATA FETCHING =================
  
  // Fetch FAQs from API
  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/faqs`)
      const data = await res.json()
      if (data.ok && data.data) {
        setFaqs(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch FAQs:', err)
      // Fallback to empty array
      setFaqs([])
    }
  }, [])

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/community/announcements`)
      const data = await res.json()
      if (data.ok && data.data) {
        setAnnouncements(data.data.items?.slice(0, 5) || [])
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err)
    }
  }, [])

  // Fetch resources
  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/community/resources`)
      const data = await res.json()
      if (data.ok && data.data) {
        setResources(data.data.items || [])
      }
    } catch (err) {
      console.error('Failed to fetch resources:', err)
    }
  }, [])

  // Fetch social links
  const fetchSocialLinks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/community/social-links`)
      const data = await res.json()
      if (data.ok && data.data) {
        setSocialLinks(data.data.items || [])
      }
    } catch (err) {
      console.error('Failed to fetch social links:', err)
    }
  }, [])

  // Fetch user's recent tickets
  const fetchRecentTickets = useCallback(async () => {
    if (!account) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${account}`)
      const data = await res.json()
      if (data.ok && data.data) {
        setRecentTickets(data.data.slice(0, 3))
      }
    } catch (err) {
      console.error('Failed to fetch recent tickets:', err)
    }
  }, [account])

  // Check system status
  const checkSystemStatus = useCallback(async () => {
    const status = {
      contracts: 'Checking...',
      network: 'Checking...',
      api: 'Checking...',
      indexer: 'Checking...',
      lastBlock: 0
    }
    
    // Check contracts via provider
    if (contracts?.provider) {
      try {
        const blockNumber = await contracts.provider.getBlockNumber()
        status.contracts = blockNumber > 0 ? 'Operational' : 'Degraded'
        status.lastBlock = blockNumber
      } catch {
        status.contracts = 'Error'
      }
    } else {
      status.contracts = 'Not Connected'
    }
    
    // Check network
    if (window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        status.network = chainId === '0x13882' ? 'Healthy' : 'Wrong Network'
      } catch {
        status.network = 'Unknown'
      }
    } else {
      status.network = 'No Wallet'
    }
    
    // Check API health
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`)
      const data = await res.json()
      status.api = data.ok ? 'Online' : 'Degraded'
    } catch {
      status.api = 'Offline'
    }
    
    // Check indexer status
    try {
      const res = await fetch(`${API_BASE_URL}/api/indexer/status`)
      const data = await res.json()
      if (data.ok && data.data) {
        status.indexer = data.data.status === 'idle' ? 'Synced' : 
                         data.data.status === 'running' ? 'Syncing' : 'Unknown'
      }
    } catch {
      status.indexer = 'Unknown'
    }
    
    setSystemStatus(status)
  }, [contracts])

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        checkSystemStatus(),
        fetchFaqs(),
        fetchAnnouncements(),
        fetchResources(),
        fetchSocialLinks(),
        isConnected ? fetchRecentTickets() : Promise.resolve()
      ])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Refresh failed:', err)
    } finally {
      setIsRefreshing(false)
      setLoading(false)
    }
  }, [checkSystemStatus, fetchFaqs, fetchAnnouncements, fetchResources, fetchSocialLinks, fetchRecentTickets, isConnected])

  // ================= EFFECTS =================
  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  useEffect(() => {
    setLoading(true)
    refreshAllData()
    
    const interval = setInterval(refreshAllData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [refreshAllData])

  // ================= COMPUTED VALUES =================
  
  // Filter FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    let filtered = faqs
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.category === selectedCategory)
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(f =>
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [faqs, searchQuery, selectedCategory])
  
  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(faqs.map(f => f.category))
    return ['all', ...Array.from(cats)]
  }, [faqs])
  
  // Group FAQs by category for display
  const groupedFaqs = useMemo(() => {
    const grouped = {}
    filteredFaqs.forEach(faq => {
      if (!grouped[faq.category]) {
        grouped[faq.category] = []
      }
      grouped[faq.category].push(faq)
    })
    return grouped
  }, [filteredFaqs])


  const searchPreview = useMemo(() => filteredFaqs.slice(0, 4), [filteredFaqs])

  const telegramSupportLink = useMemo(() => {
    const telegram = socialLinks.find((link) => {
      const platform = String(link?.platform || link?.label || '').toLowerCase()
      const href = String(link?.href || '')
      return platform.includes('telegram') || href.includes('t.me')
    })
    return telegram?.href || 'https://t.me/'
  }, [socialLinks])

  const activeGuide = activeGuideKey ? QUICK_HELP_GUIDES[activeGuideKey] : null

  // ================= HANDLERS =================
  
  const toggleFaq = (faqId) => {
    setFaqOpenIndex(faqOpenIndex === faqId ? null : faqId)
  }
  
  const handleFormChange = (field, value) => {
    setTicketForm(prev => ({ ...prev, [field]: value }))
  }
  
  const copyWallet = () => {
    if (account) {
      navigator.clipboard.writeText(account)
      setCopiedWallet(true)
      setTimeout(() => setCopiedWallet(false), 2000)
    }
  }
  
  const handleSubmitTicket = async () => {
    if (!ticketForm.category || !ticketForm.subject || !ticketForm.message) {
      setSubmitStatus({ loading: false, success: false, error: 'Please fill in all required fields.' })
      return
    }

    setSubmitStatus({ loading: true, success: false, error: null })

    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: account,
          ...ticketForm
        })
      })
      
      const data = await res.json()
      
      if (data.ok) {
        setSubmitStatus({ loading: false, success: true, error: null })
        setTicketForm({ category: '', subject: '', message: '', txHash: '' })
        setTimeout(() => setSubmitStatus({ loading: false, success: false, error: null }), 3000)
        fetchRecentTickets() // Refresh ticket list
      } else {
        throw new Error(data.message || 'Submission failed')
      }
    } catch (err) {
      setSubmitStatus({ loading: false, success: false, error: err.message })
    }
  }

  const getStatusIcon = (status) => {
    const Icon = statusIcons[status] || statusIcons.default
    const colors = {
      'Operational': '#22c55e',
      'Healthy': '#22c55e',
      'Online': '#22c55e',
      'Synced': '#22c55e',
      'Degraded': '#f59e0b',
      'Syncing': '#f59e0b',
      'Wrong Network': '#f59e0b',
      'Error': '#ef4444',
      'Offline': '#ef4444',
      'Not Connected': '#ef4444'
    }
    return <Icon size={16} style={{ color: colors[status] || '#8892b0' }} />
  }

  const getCategoryIcon = (category) => {
    const Icon = categoryIcons[category] || categoryIcons.default
    return <Icon size={18} />
  }

  // ================= RENDER =================
  
  if (!isConnected) {
    return (
      <section className="support-page">
        <div className="support-hero">
          <div className="support-hero__content">
            <div className="support-hero__eyebrow glass-panel">
              <span className="support-hero__eyebrow-dot" />
              <span className="support-hero__eyebrow-text">Help & Guidance</span>
            </div>
            <div className="support-hero__text-block">
              <h1 className="support-hero__title">Support Center</h1>
              <p className="support-hero__description soft-text">
                Connect your wallet to access personalized support and submit tickets.
              </p>
            </div>
            <button onClick={connect} className="connect-wallet-btn">
              <Wallet size={18} /> Connect Wallet
            </button>
          </div>
          <div className="support-hero__visual glass-panel">
            <div className="support-hero__visual-box support-hero__visual-box--countries">
              <div className="support-country-grid">
                {SUPPORT_COUNTRIES.map((country) => (
                  <a key={country.id} href="https://t.me/" className="support-country-card" target="_blank" rel="noopener noreferrer">
                    <img src={country.image} alt={country.name} className="support-country-card__image" />
                    {/* <span className="support-country-card__label">{country.name}</span> */}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="support-page">
      
      {/* HERO SECTION */}
      <div className="support-hero">
        <div className="support-hero__content">
          <div className="support-hero__eyebrow glass-panel">
            <span className="support-hero__eyebrow-dot" />
            <span className="support-hero__eyebrow-text">
              Help, guidance, issue reporting, and user safety
            </span>
          </div>

          <div className="support-hero__text-block">
            <h1 className="support-hero__title">Support Center</h1>
            <p className="support-hero__description soft-text">
              Find trusted answers, open a clean support request, and reach the right help path for registration, levels, orbits, wallet access, and security questions.
            </p>
          </div>

          <div className="support-search glass-panel">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search the knowledge base for answers, steps, and support topics"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {searchQuery ? (
            <div className="support-search-results glass-panel">
              <div className="support-search-results__header">
                <span><Search size={14} /> {filteredFaqs.length} result{filteredFaqs.length === 1 ? '' : 's'} for “{searchQuery}”</span>
                <button type="button" className="support-search-results__link" onClick={() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  View full results <ChevronRight size={12} />
                </button>
              </div>
              <div className="support-search-results__list">
                {searchPreview.length ? searchPreview.map((faq) => (
                  <button key={faq._id || faq.id} type="button" className="support-search-results__item" onClick={() => { setFaqOpenIndex(faq._id || faq.id); document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' }) }}>
                    <strong>{faq.question}</strong>
                    <span>{faq.category}</span>
                  </button>
                )) : <div className="support-search-results__empty soft-text">No direct matches found. Try a shorter keyword or open a support request below.</div>}
              </div>
            </div>
          ) : null}

          <div className="support-hero__chips">
            <button type="button" className={`support-hero__chip glass-panel ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>
              All Topics
            </button>
            {categories.slice(1, 5).map(cat => (
              <button 
                type="button"
                key={cat} 
                className={`support-hero__chip glass-panel ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="support-hero__visual glass-panel">
          <div className="support-hero__visual-box support-hero__visual-box--countries">
            <div className="support-country-panel__header">
              <div>
                <strong>Regional Telegram support</strong>
                <p className="soft-text">Choose your support country channel below.</p>
              </div>
              <button type="button" className="support-country-refresh" onClick={refreshAllData}>
                <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="support-country-grid">
              {SUPPORT_COUNTRIES.map((country) => (
                <a key={country.id} href={telegramSupportLink} className="support-country-card" target="_blank" rel="noopener noreferrer">
                  <img src={country.image} alt={country.name} className="support-country-card__image" />
                  <span className="support-country-card__label">{country.name}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="support-hero__visual-footer">
            <MapPinned size={14} />
            <span className="soft-text">Last refreshed {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* SYSTEM STATUS BAR */}
      <section className="support-status-bar glass-panel">
        <div className="status-bar-grid">
          <div className={`status-bar-item ${systemStatus.network.toLowerCase().replace(' ', '-')}`}>
            <Wifi size={14} />
            <span>Network</span>
            <strong>{systemStatus.network}</strong>
            {getStatusIcon(systemStatus.network)}
          </div>
          <div className={`status-bar-item ${systemStatus.api.toLowerCase()}`}>
            <Activity size={14} />
            <span>API</span>
            <strong>{systemStatus.api}</strong>
            {getStatusIcon(systemStatus.api)}
          </div>
          <div className="status-bar-item">
            <BookOpen size={14} />
            <span>FAQs</span>
            <strong>{faqs.length}</strong>
          </div>
          <div className="status-bar-item">
            <Database size={14} />
            <span>Resources</span>
            <strong>{resources.length || 0}</strong>
          </div>
        </div>
      </section>

      {/* QUICK HELP CARDS */}
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
            <span className="support-quick-help__text soft-text">Activation checks, progression rules, and level visibility guidance.</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>

          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('orbit')}>
            <span className="support-quick-help__icon"><Orbit size={24} style={{ color: '#8b5cf6' }} /></span>
            <span className="support-quick-help__title">Orbit Issues</span>
            <span className="support-quick-help__text soft-text">Placements, cycles, orbit loading, and payout visibility guidance.</span>
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

      {/* MAIN GRID */}
      <div className="support-main-grid">
        <div className="support-main-grid__left">
          
          {/* CONTACT SUPPORT FORM */}
          <section id="contact-section" className="support-contact glass-panel">
            <div className="support-section-heading">
              <span className="support-section-heading__eyebrow muted-text">Contact Support</span>
              <h2 className="support-section-heading__title">Send a support request</h2>
            </div>

            <div className="support-contact__form">
              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">Support Category *</label>
                <select
                  className="support-contact__select glass-panel"
                  value={ticketForm.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                >
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
                  {account && (
                    <button className="copy-wallet-btn" onClick={copyWallet}>
                      {copiedWallet ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">Subject *</label>
                <input
                  type="text"
                  className="support-contact__input glass-panel"
                  placeholder="Summarize the issue clearly"
                  value={ticketForm.subject}
                  onChange={(e) => handleFormChange('subject', e.target.value)}
                />
              </div>

              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">Transaction Hash (Optional)</label>
                <input
                  type="text"
                  className="support-contact__input glass-panel"
                  placeholder="0x..."
                  value={ticketForm.txHash}
                  onChange={(e) => handleFormChange('txHash', e.target.value)}
                />
              </div>

              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">Message *</label>
                <textarea
                  className="support-contact__textarea glass-panel"
                  placeholder="Describe what happened, what you expected, and any steps you already tried."
                  value={ticketForm.message}
                  onChange={(e) => handleFormChange('message', e.target.value)}
                  rows={5}
                />
              </div>

              {submitStatus.success && (
                <div className="support-success-message">
                  <CheckCircle size={16} /> Support request submitted successfully. Our team will review it and respond as soon as possible.
                </div>
              )}
              {submitStatus.error && (
                <div className="support-error-message">
                  <AlertCircle size={16} /> {submitStatus.error}
                </div>
              )}

              <div className="support-contact__actions">
                <button
                  type="button"
                  className="support-contact__primary-btn"
                  onClick={handleSubmitTicket}
                  disabled={submitStatus.loading}
                >
                  {submitStatus.loading ? (
                    <><RefreshCw size={16} className="spin" /> Submitting...</>
                  ) : (
                    <><Send size={16} /> Submit Request</>
                  )}
                </button>
                <button
                  type="button"
                  className="support-contact__secondary-btn"
                  onClick={() => setTicketForm({ category: '', subject: '', message: '', txHash: '' })}
                >
                  Clear Form
                </button>
              </div>
            </div>

            {/* Recent Tickets */}
            {recentTickets.length > 0 && (
              <div className="support-recent-tickets">
                <h4>Your Recent Tickets</h4>
                <div className="recent-tickets-list">
                  {recentTickets.map(ticket => (
                    <div key={ticket._id} className={`recent-ticket-item status-${ticket.status}`}>
                      <span className="ticket-subject">{ticket.subject}</span>
                      <span className="ticket-status">{ticket.status}</span>
                      <span className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* FAQ SECTION */}
          <section id="faq-section" className="support-faq glass-panel">
            <div className="support-section-heading">
              <span className="support-section-heading__eyebrow muted-text">Knowledge Base</span>
              <h2 className="support-section-heading__title">Frequently Asked Questions</h2>
            </div>

            {searchQuery && (
              <div className="search-results-info">
                <Search size={14} /> Found {filteredFaqs.length} results for "{searchQuery}"
              </div>
            )}

            {loading ? (
              <div className="faq-loading">
                <RefreshCw size={24} className="spin" />
                <span>Loading FAQs...</span>
              </div>
            ) : (
              <div className="support-faq__categories">
                {Object.entries(groupedFaqs).map(([category, items]) => (
                  <div key={category} className="support-faq__category">
                    <h3 className="faq-category-title">
                      {getCategoryIcon(category)}
                      <span>{category}</span>
                      <span className="category-count">{items.length}</span>
                    </h3>
                    {items.map((faq) => (
                      <div key={faq._id || faq.id} className="support-faq__item">
                        <div
                          className="support-faq__question-row"
                          onClick={() => toggleFaq(faq._id || faq.id)}
                        >
                          <h3 className="support-faq__question">{faq.question}</h3>
                          <span className="support-faq__icon">
                            {faqOpenIndex === (faq._id || faq.id) ? <X size={16} /> : <ChevronRight size={16} />}
                          </span>
                        </div>
                        {faqOpenIndex === (faq._id || faq.id) && (
                          <p className="support-faq__answer soft-text">{faq.answer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="support-main-grid__right">
          
          {/* ANNOUNCEMENTS */}
          <section className="support-announcements glass-panel">
            <div className="support-section-heading">
              <span className="support-section-heading__eyebrow muted-text">Updates</span>
              <h2 className="support-section-heading__title">Announcements</h2>
            </div>

            <div className="announcements-list">
              {announcements.length > 0 ? (
                announcements.map(item => (
                  <div key={item._id} className={`announcement-item type-${item.type || 'info'}`}>
                    <div className="announcement-header">
                      <span className="announcement-title">
                        {item.type === 'warning' && <AlertTriangle size={14} />}
                        {item.type === 'success' && <CheckCircle size={14} />}
                        {item.type === 'info' && <Info size={14} />}
                        {item.title}
                      </span>
                      <span className="announcement-date">{item.date}</span>
                    </div>
                    <p className="announcement-content">{item.content}</p>
                  </div>
                ))
              ) : (
                <div className="announcement-item type-info">
                  <div className="announcement-header">
                    <span className="announcement-title">System Operational</span>
                  </div>
                  <p className="announcement-content">All systems are running normally.</p>
                </div>
              )}
            </div>
          </section>

          {/* SAFETY GUIDANCE */}
          <section className="support-safety glass-panel">
            <div className="support-section-heading">
              <span className="support-section-heading__eyebrow muted-text">Security</span>
              <h2 className="support-section-heading__title">Safety Guidance</h2>
            </div>

            <div className="support-safety__list">
              <div className="support-safety__item">
                <span className="support-safety__icon"><Shield size={20} style={{ color: 'var(--glow-teal)' }} /></span>
                <div>
                  <h3 className="support-safety__title">Never share your seed phrase</h3>
                  <p className="support-safety__text soft-text">FFN will NEVER ask for your seed phrase or private keys.</p>
                </div>
              </div>

              <div className="support-safety__item">
                <span className="support-safety__icon"><AlertTriangle size={20} style={{ color: '#f59e0b' }} /></span>
                <div>
                  <h3 className="support-safety__title">Verify network before confirming</h3>
                  <p className="support-safety__text soft-text">Always ensure you're on Polygon Amoy Testnet (Chain ID: 0x13882).</p>
                </div>
              </div>

              <div className="support-safety__item">
                <span className="support-safety__icon"><Search size={20} style={{ color: 'var(--glow-blue)' }} /></span>
                <div>
                  <h3 className="support-safety__title">Check transaction details</h3>
                  <p className="support-safety__text soft-text">Review all transaction details before confirming.</p>
                </div>
              </div>

              <div className="support-safety__item">
                <span className="support-safety__icon"><AlertCircle size={20} style={{ color: '#ef4444' }} /></span>
                <div>
                  <h3 className="support-safety__title">Beware of scams</h3>
                  <p className="support-safety__text soft-text">Only use official links. Never send funds to unknown addresses.</p>
                </div>
              </div>
            </div>
          </section>

          {/* RESOURCES & COMMUNITY */}
          <section className="support-resources glass-panel">
            <div className="support-section-heading">
              <span className="support-section-heading__eyebrow muted-text">Resources</span>
              <h2 className="support-section-heading__title">Helpful Links</h2>
            </div>

            <div className="resources-grid">
              {resources.length > 0 ? (
                resources.map(item => (
                  <a 
                    key={item._id} 
                    href={item.href || '#'} 
                    className="resource-link"
                    target={item.href ? '_blank' : undefined}
                    rel={item.href ? 'noopener noreferrer' : undefined}
                  >
                    <BookOpen size={16} />
                    <span>{item.label}</span>
                    {item.href && <ExternalLink size={12} />}
                  </a>
                ))
              ) : (
                <>
                  <a href="#" className="resource-link"><FileText size={16} />Documentation</a>
                  <a href="#" className="resource-link"><FileCheck size={16} />Whitepaper</a>
                  <a href="#" className="resource-link"><Lock size={16} />Privacy Policy</a>
                  <a href="#" className="resource-link"><Video size={16} />Tutorials</a>
                </>
              )}
            </div>

            <div className="social-community">
              <h4>Join our community</h4>
              <div className="social-icons">
                {socialLinks.length > 0 ? (
                  socialLinks.map(link => (
                    <a key={link._id} href={link.href} className="social-icon" target="_blank" rel="noopener noreferrer">
                      <Globe size={14} />
                      <span>{link.platform}</span>
                    </a>
                  ))
                ) : (
                  <>
                    <a href="#" className="social-icon"><MessageSquare size={14} />Discord</a>
                    <a href="#" className="social-icon"><Send size={14} />Telegram</a>
                    <a href="#" className="social-icon"><Globe size={14} />Twitter</a>
                  </>
                )}
              </div>
            </div>

            <div className="support-contact-info">
              <h4>Direct Contact</h4>
              <div className="contact-methods">
                <a href="mailto:support@finfreedom.io" className="contact-method">
                  <Mail size={14} /> support@finfreedom.io
                </a>
                <span className="response-time">Response within 24 hours</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      


      {activeGuide ? (
        <div className="support-guide-modal__backdrop" onClick={() => setActiveGuideKey(null)}>
          <div className="support-guide-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="support-guide-modal__header">
              <div>
                <span className="support-section-heading__eyebrow muted-text">Quick Help Guide</span>
                <h3>{activeGuide.title}</h3>
                <p className="soft-text">{activeGuide.description}</p>
              </div>
              <button type="button" className="support-guide-modal__close" onClick={() => setActiveGuideKey(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="support-guide-modal__body">
              <ol className="support-guide-modal__steps">
                {activeGuide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="support-guide-modal__footer">
              <button type="button" className="support-contact__secondary-btn" onClick={() => setActiveGuideKey(null)}>
                Close
              </button>
              <button type="button" className="support-contact__primary-btn" onClick={() => {
                setActiveGuideKey(null)
                if (activeGuide.route === 'support') {
                  document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })
                } else {
                  onNavigate?.(activeGuide.route)
                }
              }}>
                <span>{activeGuide.routeLabel}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  )
}

export default SupportPage