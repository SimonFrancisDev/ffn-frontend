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
  ArrowRight, RefreshCw
} from 'lucide-react'

const API_BASE_URL = 'https://fin-freedom-backend-3.onrender.com'

const SupportPage = () => {
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
            <div className="support-hero__visual-box">
              <LifeBuoy size={48} style={{ color: 'var(--glow-teal)', marginBottom: '12px' }} />
              <div className="soft-text">Connect for support</div>
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
              Get help with account issues, progression questions, orbit understanding,
              wallet concerns, and platform notices.
            </p>
          </div>

          {/* Search Bar */}
          <div className="support-search glass-panel">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="support-hero__chips">
            <span className="support-hero__chip glass-panel" onClick={() => setSelectedCategory('all')}>
              All Topics
            </span>
            {categories.slice(1, 5).map(cat => (
              <span 
                key={cat} 
                className={`support-hero__chip glass-panel ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        <div className="support-hero__visual glass-panel">
          <div className="support-hero__visual-box">
            <div className="hero-support-viz">
              <LifeBuoy size={40} className="support-icon" style={{ color: 'var(--glow-teal)' }} />
              <MessageCircle size={32} className="support-icon small" style={{ color: 'var(--glow-blue)' }} />
              <Mail size={32} className="support-icon small" style={{ color: '#f59e0b' }} />
              <BookOpen size={32} className="support-icon small" style={{ color: '#8b5cf6' }} />
            </div>
          </div>
          <div className="support-hero__visual-footer">
            <RefreshCw 
              size={14} 
              className={isRefreshing ? 'spin' : ''} 
              onClick={refreshAllData}
              style={{ cursor: 'pointer' }}
            />
            <span className="soft-text">Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* SYSTEM STATUS BAR */}
      <section className="support-status-bar glass-panel">
        <div className="status-bar-grid">
          <div className={`status-bar-item ${systemStatus.contracts.toLowerCase()}`}>
            <Database size={14} />
            <span>Contracts</span>
            <strong>{systemStatus.contracts}</strong>
            {getStatusIcon(systemStatus.contracts)}
          </div>
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
          <div className={`status-bar-item ${systemStatus.indexer.toLowerCase()}`}>
            <Clock size={14} />
            <span>Indexer</span>
            <strong>{systemStatus.indexer}</strong>
            {getStatusIcon(systemStatus.indexer)}
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
          <div className="support-quick-help__card glass-panel" onClick={() => setSelectedCategory('Getting Started')}>
            <span className="support-quick-help__icon"><Rocket size={24} style={{ color: 'var(--glow-teal)' }} /></span>
            <span className="support-quick-help__title">Registration Help</span>
            <span className="support-quick-help__text soft-text">Onboarding, sponsor issues, setup flow.</span>
            <ChevronRight size={16} className="card-arrow" />
          </div>

          <div className="support-quick-help__card glass-panel" onClick={() => setSelectedCategory('Levels & Activation')}>
            <span className="support-quick-help__icon"><TrendingUp size={24} style={{ color: 'var(--glow-blue)' }} /></span>
            <span className="support-quick-help__title">Levels & Activation</span>
            <span className="support-quick-help__text soft-text">Progression, eligibility, activation questions.</span>
            <ChevronRight size={16} className="card-arrow" />
          </div>

          <div className="support-quick-help__card glass-panel" onClick={() => setSelectedCategory('Orbits System')}>
            <span className="support-quick-help__icon"><Orbit size={24} style={{ color: '#8b5cf6' }} /></span>
            <span className="support-quick-help__title">Orbit Issues</span>
            <span className="support-quick-help__text soft-text">Placements, cycles, payouts, orbit behavior.</span>
            <ChevronRight size={16} className="card-arrow" />
          </div>

          <div className="support-quick-help__card glass-panel" onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="support-quick-help__icon"><Wallet size={24} style={{ color: '#f59e0b' }} /></span>
            <span className="support-quick-help__title">Wallet & Network</span>
            <span className="support-quick-help__text soft-text">Connection, switching networks, wallet issues.</span>
            <ChevronRight size={16} className="card-arrow" />
          </div>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="support-main-grid">
        <div className="support-main-grid__left">
          
          {/* CONTACT SUPPORT FORM */}
          <section id="contact-section" className="support-contact glass-panel">
            <div className="support-section-heading">
              <span className="support-section-heading__eyebrow muted-text">Contact Support</span>
              <h2 className="support-section-heading__title">Submit a support ticket</h2>
            </div>

            <div className="support-contact__form">
              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">Issue Category *</label>
                <select
                  className="support-contact__select glass-panel"
                  value={ticketForm.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                >
                  <option value="">Select a category</option>
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
                  placeholder="Brief description of your issue"
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
                  placeholder="Please describe your issue in detail..."
                  value={ticketForm.message}
                  onChange={(e) => handleFormChange('message', e.target.value)}
                  rows={5}
                />
              </div>

              {submitStatus.success && (
                <div className="support-success-message">
                  <CheckCircle size={16} /> Ticket submitted successfully! We'll respond within 24 hours.
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        
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
        
        /* System Status Bar */
        .support-status-bar {
          padding: 4px 20px;
          margin-bottom: 24px;
        }
        .status-bar-grid {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-around;
          gap: 24px;
        }
        .status-bar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .status-bar-item strong {
          font-weight: 600;
        }
        .status-bar-item.operational strong,
        .status-bar-item.healthy strong,
        .status-bar-item.online strong,
        .status-bar-item.synced strong { color: #22c55e; }
        .status-bar-item.degraded strong,
        .status-bar-item.syncing strong,
        .status-bar-item.wrong-network strong { color: #f59e0b; }
        .status-bar-item.error strong,
        .status-bar-item.offline strong,
        .status-bar-item.not-connected strong { color: #ef4444; }
        
        /* Search */
        .support-search {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: var(--surface-1);
          border-radius: 60px;
          margin-top: 8px;
        }
        .search-icon { color: var(--text-secondary); }
        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          font-size: 14px;
          outline: none;
        }
        .search-input::placeholder { color: var(--text-secondary); }
        .search-clear {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }
        
        /* Hero Chips */
        .support-hero__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .support-hero__chip {
          padding: 6px 14px;
          border-radius: 30px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .support-hero__chip.active {
          background: var(--glow-teal);
          color: #07111f;
        }
        .support-hero__chip:hover:not(.active) {
          background: var(--surface-2);
        }
        
        /* Hero Visual */
        .support-hero__visual-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          font-size: 12px;
        }
        .hero-support-viz {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .support-icon {
          animation: float 3s ease-in-out infinite;
        }
        .support-icon.small {
          animation-delay: 0.5s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        
        /* Quick Help Cards */
        .support-quick-help__card {
          position: relative;
          padding: 18px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .support-quick-help__card:hover {
          transform: translateY(-2px);
          border-color: var(--glow-teal);
        }
        .card-arrow {
          position: absolute;
          bottom: 16px;
          right: 16px;
          opacity: 0.5;
          transition: opacity 0.2s;
        }
        .support-quick-help__card:hover .card-arrow {
          opacity: 1;
          color: var(--glow-teal);
        }
        
        /* Contact Form */
        .support-contact__wallet-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          font-family: monospace;
          font-size: 13px;
        }
        .copy-wallet-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }
        .copy-wallet-btn:hover { color: var(--glow-teal); }
        
        .support-contact__primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
          color: #07111f;
          font-weight: bold;
          border: none;
          cursor: pointer;
        }
        .support-contact__primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .support-contact__secondary-btn {
          padding: 12px 24px;
          border-radius: 12px;
          background: var(--surface-1);
          border: 1px solid var(--border-soft);
          color: var(--text-primary);
          cursor: pointer;
        }
        
        /* Recent Tickets */
        .support-recent-tickets {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-soft);
        }
        .support-recent-tickets h4 {
          font-size: 14px;
          margin-bottom: 12px;
        }
        .recent-tickets-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .recent-ticket-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--surface-1);
          border-radius: 10px;
          font-size: 12px;
        }
        .ticket-subject { flex: 1; }
        .ticket-status {
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-open .ticket-status { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .status-closed .ticket-status { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .ticket-date { color: var(--text-muted); }
        
        /* FAQ */
        .faq-category-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: bold;
          color: var(--glow-teal);
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .category-count {
          margin-left: auto;
          font-size: 11px;
          background: var(--surface-1);
          padding: 2px 8px;
          border-radius: 20px;
        }
        .faq-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px;
          color: var(--text-secondary);
        }
        
        /* Announcements */
        .announcement-item .announcement-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        /* Resources */
        .resource-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          text-decoration: none;
          color: white;
          font-size: 13px;
          transition: all 0.2s;
        }
        .resource-link:hover {
          background: rgba(255,255,255,0.08);
          transform: translateX(2px);
        }
        
        .support-contact-info {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border-soft);
        }
        .support-contact-info h4 {
          font-size: 13px;
          margin-bottom: 12px;
        }
        .contact-methods {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .contact-method {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--glow-teal);
          text-decoration: none;
          font-size: 13px;
        }
        
        @media (max-width: 768px) {
          .status-bar-grid { justify-content: flex-start; }
          .support-quick-help__grid { grid-template-columns: 1fr; }
          .support-contact__actions { flex-direction: column; }
        }
      `}</style>
    </section>
  )
}

export default SupportPage













// import './SupportPage.css'
// import { useEffect, useState, useCallback } from 'react'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { ethers } from 'ethers'

// const SupportPage = () => {
//   const { isConnected, account, connect } = useWallet()
//   const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()

//   // State for support page
//   const [systemStatus, setSystemStatus] = useState({
//     support: 'Available',
//     system: 'Operational',
//     network: 'Healthy',
//     contracts: 'Active',
//     api: 'Online'
//   })
//   const [faqOpenIndex, setFaqOpenIndex] = useState(null)
//   const [ticketForm, setTicketForm] = useState({
//     category: '',
//     subject: '',
//     message: '',
//     txHash: ''
//   })
//   const [submitStatus, setSubmitStatus] = useState({ loading: false, success: false, error: null })
//   const [searchQuery, setSearchQuery] = useState('')
//   const [filteredFaqs, setFilteredFaqs] = useState([])
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [announcements, setAnnouncements] = useState([])

//   // FAQ Data
//   const faqs = [
//     {
//       id: 1,
//       category: 'Getting Started',
//       question: 'How do I connect my wallet to FFN?',
//       answer: 'Click the "Connect Wallet" button in the top right corner. Select MetaMask (or your preferred wallet), approve the connection, and ensure you are on the Polygon Amoy Testnet. Your wallet address will appear once connected.'
//     },
//     {
//       id: 2,
//       category: 'Getting Started',
//       question: 'How do I register for the protocol?',
//       answer: 'Go to the Activation Center, enter a referrer address (optional), approve 10 USDT, and click "Register". Registration includes Level 1 activation and costs 10 USDT total.'
//     },
//     {
//       id: 3,
//       category: 'Levels & Activation',
//       question: 'Why is my level not activating yet?',
//       answer: 'Levels must be activated sequentially. You need to activate Level 1 before Level 2, Level 2 before Level 3, etc. Also ensure you have sufficient USDT balance and allowance approved for the level price.'
//     },
//     {
//       id: 4,
//       category: 'Levels & Activation',
//       question: 'What are the level prices?',
//       answer: 'Level 1: 10 USDT, Level 2: 20 USDT, Level 3: 40 USDT, Level 4: 80 USDT, Level 5: 160 USDT, Level 6: 320 USDT, Level 7: 640 USDT, Level 8: 1280 USDT, Level 9: 2560 USDT, Level 10: 5120 USDT.'
//     },
//     {
//       id: 5,
//       category: 'Orbits System',
//       question: 'How do orbits work?',
//       answer: 'Each level is associated with an orbit type: P4 (Levels 1,4,7,10), P12 (Levels 2,5,8), P39 (Levels 3,6,9). When you activate a level, you occupy a position in that orbit. As positions fill, payouts are distributed according to smart contract rules.'
//     },
//     {
//       id: 6,
//       category: 'Orbits System',
//       question: 'Why does my orbit activity look different?',
//       answer: 'Orbit views show the current cycle. You can view historical cycles using the cycle switcher. Positions may appear differently based on whether you are viewing the live orbit or a completed cycle.'
//     },
//     {
//       id: 7,
//       category: 'Referrals & Commissions',
//       question: 'How do I earn commissions from referrals?',
//       answer: 'When someone registers using your referral link, you earn commissions from their level activations. Commission structure is built into the orbit contracts and varies by level.'
//     },
//     {
//       id: 8,
//       category: 'Referrals & Commissions',
//       question: 'How do I find my referral link?',
//       answer: 'Go to the Community Hub page. Your unique referral link is displayed in the "Your Referral Arsenal" section. Copy and share it with friends.'
//     },
//     {
//       id: 9,
//       category: 'Technical Issues',
//       question: 'How do I confirm I am on the correct network?',
//       answer: 'Check your wallet network - it should show "Polygon Amoy Testnet". If not, click the network dropdown in your wallet and select/add Polygon Amoy. The chain ID is 0x13882.'
//     },
//     {
//       id: 10,
//       category: 'Technical Issues',
//       question: 'My transaction is stuck / pending. What should I do?',
//       answer: 'Try increasing gas fees, resetting your wallet nonce, or waiting for network congestion to clear. You can also check the transaction status on Polygonscan using your transaction hash.'
//     },
//     {
//       id: 11,
//       category: 'Technical Issues',
//       question: 'What does "insufficient allowance" mean?',
//       answer: 'You need to approve USDT spending before activating a level. Click the "Approve" button for the specific level amount, confirm the transaction, then try activating again.'
//     },
//     {
//       id: 12,
//       category: 'Account & Security',
//       question: 'Is my wallet safe on this platform?',
//       answer: 'FFN is a non-custodial platform - your funds remain in your wallet. Always verify transaction details before signing. Never share your seed phrase with anyone.'
//     },
//     {
//       id: 13,
//       category: 'Account & Security',
//       question: 'What is the ID1 wallet?',
//       answer: 'The ID1 wallet is a special wallet that has all levels auto-activated. It serves as the root referrer for users who register without a referrer.'
//     }
//   ]

//   // Announcements data (from backend API eventually)
//   const fetchAnnouncements = useCallback(async () => {
//     // Data Source: Backend CMS / API
//     setAnnouncements([
//       { id: 1, title: '📢 v2.1.0 Released', date: '2024-01-15', content: 'New features added to orbit visualization and improved performance.', type: 'info' },
//       { id: 2, title: '⚠️ Scheduled Maintenance', date: '2024-01-20', content: 'Platform will be under maintenance for 2 hours on Jan 22nd.', type: 'warning' },
//       { id: 3, title: '🎉 New FAQ Articles Added', date: '2024-01-10', content: 'Check out our updated help center with 10+ new guides.', type: 'success' }
//     ])
//   }, [])

//   // Check system status (live from contracts)
//   const checkSystemStatus = useCallback(async () => {
//     if (!contracts) return
    
//     try {
//       // Check contract availability
//       const blockNumber = await contracts.provider?.getBlockNumber()
//       const isContractActive = blockNumber !== undefined && blockNumber > 0
      
//       setSystemStatus(prev => ({
//         ...prev,
//         contracts: isContractActive ? 'Active' : 'Degraded',
//         system: isContractActive ? 'Operational' : 'Degraded'
//       }))
//     } catch (err) {
//       console.error('Error checking system status:', err)
//       setSystemStatus(prev => ({
//         ...prev,
//         contracts: 'Error',
//         system: 'Degraded'
//       }))
//     }
//   }, [contracts])

//   // Fetch network status
//   const checkNetworkStatus = useCallback(async () => {
//     if (!window.ethereum) return
    
//     try {
//       const chainId = await window.ethereum.request({ method: 'eth_chainId' })
//       const isCorrectNetwork = chainId === '0x13882' // Polygon Amoy
//       setSystemStatus(prev => ({
//         ...prev,
//         network: isCorrectNetwork ? 'Healthy' : 'Wrong Network'
//       }))
//     } catch (err) {
//       setSystemStatus(prev => ({ ...prev, network: 'Unknown' }))
//     }
//   }, [])

//   // Filter FAQs based on search
//   useEffect(() => {
//     if (searchQuery.trim() === '') {
//       setFilteredFaqs(faqs)
//     } else {
//       const filtered = faqs.filter(faq =>
//         faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         faq.category.toLowerCase().includes(searchQuery.toLowerCase())
//       )
//       setFilteredFaqs(filtered)
//     }
//   }, [searchQuery])

//   // Toggle FAQ accordion
//   const toggleFaq = (index) => {
//     setFaqOpenIndex(faqOpenIndex === index ? null : index)
//   }

//   // Handle form input changes
//   const handleFormChange = (field, value) => {
//     setTicketForm(prev => ({ ...prev, [field]: value }))
//   }

//   // Handle ticket submission
//   const handleSubmitTicket = async () => {
//     if (!ticketForm.category || !ticketForm.subject || !ticketForm.message) {
//       setSubmitStatus({ loading: false, success: false, error: 'Please fill in all required fields.' })
//       return
//     }

//     setSubmitStatus({ loading: true, success: false, error: null })

//     try {
//       // Data Source: Backend API endpoint for support tickets
//       // For now, simulate API call
//       await new Promise(resolve => setTimeout(resolve, 1000))
      
//       console.log('Support ticket submitted:', {
//         wallet: account,
//         ...ticketForm,
//         timestamp: new Date().toISOString()
//       })
      
//       setSubmitStatus({ loading: false, success: true, error: null })
//       setTicketForm({ category: '', subject: '', message: '', txHash: '' })
      
//       setTimeout(() => setSubmitStatus({ loading: false, success: false, error: null }), 3000)
//     } catch (err) {
//       setSubmitStatus({ loading: false, success: false, error: 'Failed to submit ticket. Please try again.' })
//     }
//   }

//   // Load data on mount
//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   useEffect(() => {
//     if (contracts) {
//       checkSystemStatus()
//       checkNetworkStatus()
//       fetchAnnouncements()
//     }
//   }, [contracts, checkSystemStatus, checkNetworkStatus, fetchAnnouncements])

//   // Auto-refresh system status every 30 seconds
//   useEffect(() => {
//     if (!contracts) return
//     const interval = setInterval(() => {
//       checkSystemStatus()
//       checkNetworkStatus()
//       setLastUpdated(new Date().toLocaleTimeString())
//     }, 30000)
//     return () => clearInterval(interval)
//   }, [contracts, checkSystemStatus, checkNetworkStatus])

//   // Group FAQs by category for display
//   const categories = [...new Set(faqs.map(f => f.category))]

//   if (!isConnected) {
//     return (
//       <section className="support-page">
//         <div className="support-hero">
//           <div className="support-hero__content">
//             <div className="support-hero__eyebrow glass-panel">
//               <span className="support-hero__eyebrow-dot" />
//               <span className="support-hero__eyebrow-text">Help & Guidance</span>
//             </div>
//             <div className="support-hero__text-block">
//               <h1 className="support-hero__title">Support Center</h1>
//               <p className="support-hero__description soft-text">
//                 Connect your wallet to access personalized support and submit tickets.
//               </p>
//             </div>
//             <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
//           </div>
//           <div className="support-hero__visual glass-panel">
//             <div className="support-hero__visual-box">
//               <div style={{ textAlign: 'center' }}>
//                 <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛟</div>
//                 <div>Connect for support</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>
//     )
//   }

//   return (
//     <section className="support-page">
//       {/* Hero Section with Search */}
//       <div className="support-hero">
//         <div className="support-hero__content">
//           <div className="support-hero__eyebrow glass-panel">
//             <span className="support-hero__eyebrow-dot" />
//             <span className="support-hero__eyebrow-text">
//               Help, guidance, issue reporting, and user safety
//             </span>
//           </div>

//           <div className="support-hero__text-block">
//             <h1 className="support-hero__title">Support Center</h1>
//             <p className="support-hero__description soft-text">
//               Get help with account issues, progression questions, orbit understanding,
//               wallet concerns, and platform notices from one structured support experience.
//             </p>
//           </div>

//           {/* Search Bar */}
//           <div className="support-search glass-panel">
//             <span className="search-icon">🔍</span>
//             <input
//               type="text"
//               className="search-input"
//               placeholder="Search for answers..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//             />
//           </div>

//           <div className="support-hero__chips">
//             <span className="support-hero__chip glass-panel">Help Center</span>
//             <span className="support-hero__chip glass-panel">Safety First</span>
//             <span className="support-hero__chip glass-panel">Guided Support</span>
//             <span className="support-hero__chip glass-panel">24/7 Assistance</span>
//           </div>
//         </div>

//         <div className="support-hero__visual glass-panel">
//           <div className="support-hero__visual-box">
//             <div className="hero-support-viz">
//               <div className="support-icon">🛟</div>
//               <div className="support-icon small">💬</div>
//               <div className="support-icon small">📧</div>
//               <div className="support-icon small">📚</div>
//             </div>
//           </div>
//           <p className="support-hero__visual-note muted-text">
//             We're here to help. Reach out anytime.
//           </p>
//         </div>
//       </div>

//       {/* Quick Actions */}
//       <section className="support-quick-help glass-panel">
//         <div className="support-section-heading">
//           <span className="support-section-heading__eyebrow muted-text">
//             Quick Help
//           </span>
//           <h2 className="support-section-heading__title">
//             Jump directly into the kind of support you need
//           </h2>
//         </div>

//         <div className="support-quick-help__grid">
//           <button type="button" className="support-quick-help__card glass-panel" onClick={() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })}>
//             <span className="support-quick-help__icon">📝</span>
//             <span className="support-quick-help__title">Registration Help</span>
//             <span className="support-quick-help__text soft-text">
//               Assistance with onboarding, sponsor issues, or setup flow.
//             </span>
//           </button>

//           <button type="button" className="support-quick-help__card glass-panel" onClick={() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })}>
//             <span className="support-quick-help__icon">📈</span>
//             <span className="support-quick-help__title">Levels & Activation</span>
//             <span className="support-quick-help__text soft-text">
//               Support for progression, eligibility, and level activation questions.
//             </span>
//           </button>

//           <button type="button" className="support-quick-help__card glass-panel" onClick={() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })}>
//             <span className="support-quick-help__icon">🪐</span>
//             <span className="support-quick-help__title">Orbit Issues</span>
//             <span className="support-quick-help__text soft-text">
//               Help understanding placements, cycles, payouts, or orbit behavior.
//             </span>
//           </button>

//           <button type="button" className="support-quick-help__card glass-panel" onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}>
//             <span className="support-quick-help__icon">👛</span>
//             <span className="support-quick-help__title">Wallet & Network</span>
//             <span className="support-quick-help__text soft-text">
//               Guidance for connection, switching networks, or wallet-related issues.
//             </span>
//           </button>
//         </div>
//       </section>

//       <div className="support-main-grid">
//         <div className="support-main-grid__left">
          
//           {/* CONTACT SUPPORT SECTION */}
//           <section id="contact-section" className="support-contact glass-panel">
//             <div className="support-section-heading">
//               <span className="support-section-heading__eyebrow muted-text">
//                 Contact Support
//               </span>
//               <h2 className="support-section-heading__title">
//                 Report an issue clearly and quickly
//               </h2>
//             </div>

//             <div className="support-contact__form">
//               <div className="support-contact__field-group">
//                 <label className="support-contact__label muted-text">Issue Category *</label>
//                 <select
//                   className="support-contact__select glass-panel"
//                   value={ticketForm.category}
//                   onChange={(e) => handleFormChange('category', e.target.value)}
//                 >
//                   <option value="">Select a category</option>
//                   <option value="registration">Registration Issues</option>
//                   <option value="levels">Level Activation</option>
//                   <option value="orbits">Orbit Problems</option>
//                   <option value="referrals">Referral Issues</option>
//                   <option value="wallet">Wallet Connection</option>
//                   <option value="transaction">Transaction Errors</option>
//                   <option value="other">Other</option>
//                 </select>
//               </div>

//               <div className="support-contact__field-group">
//                 <label className="support-contact__label muted-text">Your Wallet</label>
//                 <div className="support-contact__wallet-display glass-panel">
//                   {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : 'Not connected'}
//                 </div>
//               </div>

//               <div className="support-contact__field-group">
//                 <label className="support-contact__label muted-text">Subject *</label>
//                 <input
//                   type="text"
//                   className="support-contact__input glass-panel"
//                   placeholder="Brief description of your issue"
//                   value={ticketForm.subject}
//                   onChange={(e) => handleFormChange('subject', e.target.value)}
//                 />
//               </div>

//               <div className="support-contact__field-group">
//                 <label className="support-contact__label muted-text">Transaction Hash (Optional)</label>
//                 <input
//                   type="text"
//                   className="support-contact__input glass-panel"
//                   placeholder="0x..."
//                   value={ticketForm.txHash}
//                   onChange={(e) => handleFormChange('txHash', e.target.value)}
//                 />
//               </div>

//               <div className="support-contact__field-group">
//                 <label className="support-contact__label muted-text">Message *</label>
//                 <textarea
//                   className="support-contact__textarea glass-panel"
//                   placeholder="Please describe your issue in detail..."
//                   value={ticketForm.message}
//                   onChange={(e) => handleFormChange('message', e.target.value)}
//                   rows={5}
//                 />
//               </div>

//               {submitStatus.success && (
//                 <div className="support-success-message">✓ Ticket submitted successfully! We'll respond within 24 hours.</div>
//               )}
//               {submitStatus.error && (
//                 <div className="support-error-message">⚠ {submitStatus.error}</div>
//               )}

//               <div className="support-contact__actions">
//                 <button
//                   type="button"
//                   className="support-contact__primary-btn"
//                   onClick={handleSubmitTicket}
//                   disabled={submitStatus.loading}
//                 >
//                   {submitStatus.loading ? 'Submitting...' : 'Submit Request'}
//                 </button>
//                 <button
//                   type="button"
//                   className="support-contact__secondary-btn"
//                   onClick={() => setTicketForm({ category: '', subject: '', message: '', txHash: '' })}
//                 >
//                   Clear Form
//                 </button>
//               </div>
//             </div>

//             <div className="support-alternative-contact">
//               <h4>Other ways to reach us</h4>
//               <div className="alternative-links">
//                 <a href="#" className="alternative-link">💬 Discord: /ffn-support</a>
//                 <a href="#" className="alternative-link">📱 Telegram: t.me/ffn_help</a>
//                 <a href="#" className="alternative-link">📧 Email: support@finfreedom.io</a>
//               </div>
//               <p className="response-time">Response time: &lt; 24 hours</p>
//             </div>
//             <small className="data-source">Data Source: Backend API / Support System</small>
//           </section>

//           {/* FAQ SECTION */}
//           <section id="faq-section" className="support-faq glass-panel">
//             <div className="support-section-heading">
//               <span className="support-section-heading__eyebrow muted-text">
//                 FAQ Shortcuts
//               </span>
//               <h2 className="support-section-heading__title">
//                 Common support questions users usually ask
//               </h2>
//             </div>

//             {searchQuery && (
//               <div className="search-results-info">
//                 Found {filteredFaqs.length} results for "{searchQuery}"
//               </div>
//             )}

//             <div className="support-faq__categories">
//               {categories.map(category => (
//                 <div key={category} className="support-faq__category">
//                   <h3 className="faq-category-title">{category}</h3>
//                   {filteredFaqs.filter(f => f.category === category).map((faq, idx) => (
//                     <div key={faq.id} className="support-faq__item">
//                       <div
//                         className="support-faq__question-row"
//                         onClick={() => toggleFaq(`${category}-${idx}`)}
//                       >
//                         <h3 className="support-faq__question">{faq.question}</h3>
//                         <span className="support-faq__icon">
//                           {faqOpenIndex === `${category}-${idx}` ? '−' : '+'}
//                         </span>
//                       </div>
//                       {faqOpenIndex === `${category}-${idx}` && (
//                         <p className="support-faq__answer soft-text">{faq.answer}</p>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               ))}
//             </div>
//             <small className="data-source">Data Source: Static FAQ Database</small>
//           </section>
//         </div>

//         <div className="support-main-grid__right">
          
//           {/* SYSTEM STATUS */}
//           <section className="support-status glass-panel">
//             <div className="support-section-heading">
//               <span className="support-section-heading__eyebrow muted-text">
//                 System Status
//               </span>
//               <h2 className="support-section-heading__title">
//                 Live platform health
//               </h2>
//             </div>

//             <div className="support-status__list">
//               <div className={`support-status__card glass-panel status-${systemStatus.support.toLowerCase()}`}>
//                 <span className="support-status__label muted-text">Support Status</span>
//                 <strong className="support-status__value">{systemStatus.support}</strong>
//                 <span className="status-dot available"></span>
//               </div>

//               <div className={`support-status__card glass-panel status-${systemStatus.system.toLowerCase()}`}>
//                 <span className="support-status__label muted-text">System Status</span>
//                 <strong className="support-status__value">{systemStatus.system}</strong>
//               </div>

//               <div className={`support-status__card glass-panel status-${systemStatus.contracts.toLowerCase()}`}>
//                 <span className="support-status__label muted-text">Smart Contracts</span>
//                 <strong className="support-status__value">{systemStatus.contracts}</strong>
//               </div>

//               <div className={`support-status__card glass-panel status-${systemStatus.network.toLowerCase().replace(' ', '-')}`}>
//                 <span className="support-status__label muted-text">Network State</span>
//                 <strong className="support-status__value">{systemStatus.network}</strong>
//               </div>
//             </div>

//             <div className="status-updated">
//               Last checked: {lastUpdated}
//             </div>
//             <small className="data-source">Data Source: Contract Health Checks</small>
//           </section>

//           {/* ANNOUNCEMENTS & UPDATES */}
//           <section className="support-announcements glass-panel">
//             <div className="support-section-heading">
//               <span className="support-section-heading__eyebrow muted-text">
//                 Announcements
//               </span>
//               <h2 className="support-section-heading__title">
//                 Latest updates & known issues
//               </h2>
//             </div>

//             <div className="announcements-list">
//               {announcements.map(announcement => (
//                 <div key={announcement.id} className={`announcement-item type-${announcement.type}`}>
//                   <div className="announcement-header">
//                     <span className="announcement-title">{announcement.title}</span>
//                     <span className="announcement-date">{announcement.date}</span>
//                   </div>
//                   <p className="announcement-content">{announcement.content}</p>
//                 </div>
//               ))}
//             </div>
//             <small className="data-source">Data Source: Backend CMS / API</small>
//           </section>

//           {/* SAFETY GUIDANCE */}
//           <section className="support-safety glass-panel">
//             <div className="support-section-heading">
//               <span className="support-section-heading__eyebrow muted-text">
//                 Safety Guidance
//               </span>
//               <h2 className="support-section-heading__title">
//                 Important wallet and platform safety reminders
//               </h2>
//             </div>

//             <div className="support-safety__list">
//               <div className="support-safety__item">
//                 <span className="support-safety__icon">🛡️</span>
//                 <div>
//                   <h3 className="support-safety__title">Never share your seed phrase</h3>
//                   <p className="support-safety__text soft-text">
//                     FFN will NEVER ask for your seed phrase or private keys. Keep them secure and offline.
//                   </p>
//                 </div>
//               </div>

//               <div className="support-safety__item">
//                 <span className="support-safety__icon">⚠️</span>
//                 <div>
//                   <h3 className="support-safety__title">Verify network before confirming</h3>
//                   <p className="support-safety__text soft-text">
//                     Always ensure you're on Polygon Amoy Testnet (Chain ID: 0x13882) before signing transactions.
//                   </p>
//                 </div>
//               </div>

//               <div className="support-safety__item">
//                 <span className="support-safety__icon">🔍</span>
//                 <div>
//                   <h3 className="support-safety__title">Check transaction details carefully</h3>
//                   <p className="support-safety__text soft-text">
//                     Review all transaction details before confirming. Verify amounts and contract addresses.
//                   </p>
//                 </div>
//               </div>

//               <div className="support-safety__item">
//                 <span className="support-safety__icon">🚫</span>
//                 <div>
//                   <h3 className="support-safety__title">Beware of scams</h3>
//                   <p className="support-safety__text soft-text">
//                     Only use official links. Never send funds to unknown addresses claiming to be support.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </section>

//           {/* RESOURCES & LINKS */}
//           <section className="support-resources glass-panel">
//             <div className="support-section-heading">
//               <span className="support-section-heading__eyebrow muted-text">
//                 Resources
//               </span>
//               <h2 className="support-section-heading__title">
//                 Helpful links & documentation
//               </h2>
//             </div>

//             <div className="resources-grid">
//               <a href="#" className="resource-link">📚 Documentation</a>
//               <a href="#" className="resource-link">📄 Whitepaper</a>
//               <a href="#" className="resource-link">🔗 Contract Addresses</a>
//               <a href="#" className="resource-link">🎥 Video Tutorials</a>
//               <a href="#" className="resource-link">📋 Terms of Service</a>
//               <a href="#" className="resource-link">🔒 Privacy Policy</a>
//             </div>

//             <div className="social-community">
//               <h4>Join our community</h4>
//               <div className="social-icons">
//                 <a href="#" className="social-icon">💬 Discord</a>
//                 <a href="#" className="social-icon">📱 Telegram</a>
//                 <a href="#" className="social-icon">🐦 Twitter</a>
//                 <a href="#" className="social-icon">📘 Facebook</a>
//               </div>
//             </div>
//           </section>
//         </div>
//       </div>

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
        
//         .data-source {
//           font-size: 9px;
//           color: rgba(255,255,255,0.3);
//           margin-top: 12px;
//           display: block;
//           text-align: right;
//         }
        
//         /* Search Bar */
//         .support-search {
//           display: flex;
//           align-items: center;
//           gap: 12px;
//           padding: 8px 16px;
//           background: var(--surface-1);
//           border-radius: 60px;
//           margin-top: 8px;
//         }
//         .search-icon {
//           font-size: 18px;
//         }
//         .search-input {
//           flex: 1;
//           background: transparent;
//           border: none;
//           color: white;
//           font-size: 14px;
//           outline: none;
//         }
//         .search-input::placeholder {
//           color: var(--text-secondary);
//         }
        
//         /* Hero Visualization */
//         .hero-support-viz {
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           gap: 20px;
//           flex-wrap: wrap;
//         }
//         .support-icon {
//           font-size: 48px;
//           animation: float 3s ease-in-out infinite;
//         }
//         .support-icon.small {
//           font-size: 32px;
//           animation-delay: 0.5s;
//         }
//         @keyframes float {
//           0%, 100% { transform: translateY(0); }
//           50% { transform: translateY(-10px); }
//         }
        
//         /* Contact Form */
//         .support-contact__field-group {
//           margin-bottom: 16px;
//         }
//         .support-contact__label {
//           display: block;
//           margin-bottom: 8px;
//         }
//         .support-contact__select,
//         .support-contact__input,
//         .support-contact__textarea {
//           width: 100%;
//           padding: 12px;
//           border-radius: 12px;
//           background: rgba(255,255,255,0.05);
//           border: 1px solid rgba(255,255,255,0.1);
//           color: white;
//           font-size: 14px;
//           outline: none;
//         }
//         .support-contact__select option {
//           background: #1a1a2e;
//         }
//         .support-contact__wallet-display {
//           padding: 12px;
//           font-family: monospace;
//           font-size: 13px;
//         }
//         .support-contact__textarea {
//           resize: vertical;
//         }
//         .support-success-message {
//           padding: 12px;
//           background: rgba(29, 233, 182, 0.15);
//           border: 1px solid var(--glow-teal);
//           border-radius: 10px;
//           color: var(--glow-teal);
//           font-size: 13px;
//           margin-bottom: 16px;
//         }
//         .support-error-message {
//           padding: 12px;
//           background: rgba(239, 68, 68, 0.15);
//           border: 1px solid #ef4444;
//           border-radius: 10px;
//           color: #ef4444;
//           font-size: 13px;
//           margin-bottom: 16px;
//         }
        
//         /* Alternative Contact */
//         .support-alternative-contact {
//           margin-top: 20px;
//           padding-top: 16px;
//           border-top: 1px solid rgba(255,255,255,0.1);
//         }
//         .support-alternative-contact h4 {
//           font-size: 13px;
//           margin-bottom: 12px;
//         }
//         .alternative-links {
//           display: flex;
//           flex-wrap: wrap;
//           gap: 16px;
//           margin-bottom: 12px;
//         }
//         .alternative-link {
//           color: var(--glow-teal);
//           text-decoration: none;
//           font-size: 12px;
//         }
//         .response-time {
//           font-size: 11px;
//           color: var(--text-secondary);
//         }
        
//         /* FAQ Categories */
//         .search-results-info {
//           padding: 8px 12px;
//           background: rgba(77, 163, 255, 0.1);
//           border-radius: 8px;
//           font-size: 12px;
//           margin-bottom: 16px;
//         }
//         .support-faq__categories {
//           display: flex;
//           flex-direction: column;
//           gap: 20px;
//         }
//         .faq-category-title {
//           font-size: 14px;
//           font-weight: bold;
//           color: var(--glow-teal);
//           margin-bottom: 12px;
//           padding-bottom: 6px;
//           border-bottom: 1px solid rgba(255,255,255,0.1);
//         }
//         .support-faq__item {
//           cursor: pointer;
//           margin-bottom: 8px;
//         }
//         .support-faq__question-row {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           padding: 12px;
//           background: rgba(255,255,255,0.03);
//           border-radius: 12px;
//           transition: background 0.2s;
//         }
//         .support-faq__question-row:hover {
//           background: rgba(255,255,255,0.08);
//         }
//         .support-faq__question {
//           font-size: 13px;
//           font-weight: 600;
//           margin: 0;
//         }
//         .support-faq__icon {
//           font-size: 18px;
//           font-weight: bold;
//         }
//         .support-faq__answer {
//           margin-top: 8px;
//           padding: 12px;
//           background: rgba(0,0,0,0.2);
//           border-radius: 10px;
//           font-size: 12px;
//           line-height: 1.5;
//         }
        
//         /* System Status Cards */
//         .support-status__card {
//           position: relative;
//         }
//         .status-dot {
//           position: absolute;
//           top: 14px;
//           right: 14px;
//           width: 10px;
//           height: 10px;
//           border-radius: 50%;
//         }
//         .status-dot.available { background: var(--glow-teal); box-shadow: 0 0 8px var(--glow-teal); }
//         .status-operational .support-status__value { color: var(--glow-teal); }
//         .status-degraded .support-status__value { color: #f59e0b; }
//         .status-error .support-status__value { color: #ef4444; }
//         .status-wrong-network .support-status__value { color: #f59e0b; }
        
//         .status-updated {
//           font-size: 10px;
//           color: var(--text-secondary);
//           text-align: center;
//           margin-top: 12px;
//         }
        
//         /* Announcements */
//         .announcements-list {
//           display: flex;
//           flex-direction: column;
//           gap: 12px;
//         }
//         .announcement-item {
//           padding: 12px;
//           border-radius: 12px;
//           background: rgba(255,255,255,0.03);
//           border-left: 3px solid;
//         }
//         .announcement-item.type-info { border-left-color: var(--glow-blue); }
//         .announcement-item.type-warning { border-left-color: #f59e0b; }
//         .announcement-item.type-success { border-left-color: var(--glow-teal); }
//         .announcement-header {
//           display: flex;
//           justify-content: space-between;
//           margin-bottom: 8px;
//           flex-wrap: wrap;
//           gap: 8px;
//         }
//         .announcement-title {
//           font-weight: bold;
//           font-size: 13px;
//         }
//         .announcement-date {
//           font-size: 10px;
//           color: var(--text-secondary);
//         }
//         .announcement-content {
//           font-size: 12px;
//           color: var(--text-secondary);
//           margin: 0;
//         }
        
//         /* Resources */
//         .resources-grid {
//           display: grid;
//           grid-template-columns: repeat(2, 1fr);
//           gap: 12px;
//           margin-bottom: 20px;
//         }
//         .resource-link {
//           padding: 10px;
//           background: rgba(255,255,255,0.05);
//           border-radius: 10px;
//           text-decoration: none;
//           color: white;
//           font-size: 12px;
//           transition: background 0.2s;
//         }
//         .resource-link:hover {
//           background: rgba(255,255,255,0.1);
//         }
//         .social-community {
//           text-align: center;
//         }
//         .social-community h4 {
//           font-size: 13px;
//           margin-bottom: 12px;
//         }
//         .social-icons {
//           display: flex;
//           justify-content: center;
//           gap: 16px;
//           flex-wrap: wrap;
//         }
//         .social-icon {
//           text-decoration: none;
//           color: var(--glow-teal);
//           font-size: 12px;
//           padding: 6px 12px;
//           background: rgba(255,255,255,0.05);
//           border-radius: 20px;
//           transition: background 0.2s;
//         }
//         .social-icon:hover {
//           background: rgba(255,255,255,0.1);
//         }
        
//         .small { font-size: 12px; }
//         .muted-text { color: var(--text-secondary); }
        
//         @media (max-width: 768px) {
//           .alternative-links { flex-direction: column; gap: 8px; }
//           .resources-grid { grid-template-columns: 1fr; }
//           .support-faq__question { font-size: 12px; }
//         }
//       `}</style>
//     </section>
//   )
// }

// export default SupportPage