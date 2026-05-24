import './SupportPage.css'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { getApiUrl } from '../../Services/apiConfig'
import { useToast } from '../../components/feedback'
import { lockBodyScroll } from '../../utils/bodyScrollLock'
import {
  AlertCircle, AlertTriangle, BookOpen, Check, CheckCircle, ChevronRight, Copy,
  ExternalLink, HelpCircle, Info, LifeBuoy, Mail, RefreshCw, Rocket, Search,
  Send, Shield, TrendingUp, Wallet, Wifi, Activity, Database, X, Orbit, FileText,
  FileCheck, Lock, Video, Eye, Scale
} from 'lucide-react'
import { FaTelegramPlane, FaDiscord, FaInstagram, FaFacebookF } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

const SUPPORT_HERO_IMAGES = {
  dark: '/images/support/support-laptop-dark.png',
  light: '/images/support/support-laptop-light.png',
  mobileDark: '/images/support/support-mobile-dark.png',
  mobileLight: '/images/support/support-mobile-light.png',
}

const SUPPORT_SLIDE_DOCS = [
  {
    id: 'ffn-overview',
    title: 'Fin Freedom Network at a Glance',
    eyebrow: 'Ecosystem Overview',
    description: 'Get a clear overview of the full Fin Freedom Network ecosystem, structure, programs, token economy, marketplace, institute, and long-term vision.',
    buttonLabel: 'Open FFN Overview',
    icon: BookOpen,
    src: '/docs/fin-freedom-overview.pdf',
  },
  {
    id: 'f-freedom-program',
    title: 'First & Current Program Overview',
    eyebrow: 'F-Freedom Program',
    description: 'Understand the first live program, registration flow, level structure, Triple-P Engine, payouts, token rewards, transparency, and sustainability.',
    buttonLabel: 'Open F-Freedom Slides',
    icon: Orbit,
    src: '/docs/f-freedom-program.pdf',
  },
  {
    id: 'mobile-registration-help',
    title: 'Having Difficulty Registering on Mobile?',
    eyebrow: 'Mobile Help Guide',
    description: 'Follow the mobile guide for connecting wallet, opening the activation page, activating Level 1, confirming transactions, and fixing gas fee errors.',
    buttonLabel: 'Open Mobile Guide',
    icon: Wallet,
    src: '/docs/mobile-registration-guide.pdf',
  },
]

const TELEGRAM_COMMUNITY_LINKS = [
  {
    id: 'telegram-channel',
    title: 'Telegram Channel',
    label: 'Official updates',
    description: 'Follow announcements, release notes, and important platform updates.',
    href: 'https://t.me/Fin_Freedom_Network',
    darkImage: '/images/support/telegram-channel-dark.png',
    lightImage: '/images/support/telegram-channel-light.png',
  },
  {
    id: 'telegram-group',
    title: 'Telegram Group',
    label: 'Community support',
    description: 'Join the community group for conversations, help, and participant updates.',
    href: 'https://t.me/FinFreedomNetwork',
    darkImage: '/images/support/telegram-group-dark.png',
    lightImage: '/images/support/telegram-group-light.png',
  },
]

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

const REGISTRATION_LEVEL_ONE_GUIDE = {
  title: 'How to Register and Activate Level 1',
  brand: 'FIN FREEDOM NETWORK',
  date: 'May 13, 2026',
  intro:
    'This guide is for participants who have already set up and funded their wallet with the required assets.',
  summary:
    'This article provides a step-by-step guide on how to register and activate Level 1 of the Fin Freedom Network program using both mobile and desktop devices. Key steps include connecting your wallet, accessing the activation page, activating Level 1, confirming the transaction, and adjusting gas fees if necessary. It also includes important reminders about security and ensuring sufficient funds.',
  mobile: [
    {
      title: 'Connect Your Wallet',
      steps: [
        'Open the official Fin Freedom Network website on your mobile browser.',
        'Tap the Account Icon at the top-right corner of the screen.',
        'Select Connect and follow the prompt to connect your wallet.',
      ],
    },
    {
      title: 'Open the Activation Page',
      steps: [
        'After your wallet is connected, tap the Menu Icon at the top-right corner.',
        'Go to Services.',
        'Then tap Activation & Level Manager.',
        'This will take you to the activation page.',
      ],
    },
    {
      title: 'Activate Level 1',
      steps: [
        'On the activation page, click Activate Level 1.',
        'If required, enter or paste your referrer ID or wallet address.',
        'Then click Register & Activate Level 1.',
        'Your wallet will open and ask you to approve the transaction.',
      ],
    },
    {
      title: 'Confirm the Transaction',
      steps: [
        'When your wallet opens, review the transaction details carefully.',
        'If everything is correct, tap Confirm to sign and submit the transaction.',
        'Do not close the page while the transaction is processing.',
      ],
    },
    {
      title: 'If You See a Gas Limit or Network Fee Error',
      steps: [
        'If you see an error such as "Transaction failed: Gas limit error", open the transaction fee settings in your wallet.',
        'Tap the small pen/edit icon beside Network Fee.',
        'Select Advanced.',
        'Increase the Base Fee and Priority Fee to around 30 or above, then retry the transaction.',
      ],
    },
    {
      title: 'Confirm Your Activation',
      steps: [
        'After the transaction is successful, return to the Activation & Level Manager page.',
        'Refresh the page if necessary.',
      ],
    },
  ],
  desktop: [
    {
      title: 'Connect Your Wallet',
      steps: [
        'Open the official Fin Freedom Network website on your laptop or desktop browser.',
        'Click the Account Icon at the top-right corner of the screen.',
        'From the menu, select Connect and follow the steps to connect your wallet.',
      ],
    },
    {
      title: 'Open the Activation Page',
      steps: [
        'After your wallet is connected, go to the top menu and click Services.',
        'From the dropdown menu, select F-Freedom Program.',
        'Then click Activation & Level Manager.',
      ],
    },
    {
      title: 'Activate Level 1',
      steps: [
        'If required, paste your referrer ID or wallet address.',
        'Your wallet panel will open for you to approve the transaction.',
      ],
    },
    {
      title: 'Confirm the Transaction',
      steps: [
        'When the wallet panel opens, review the transaction details.',
        'If everything is correct, click Confirm to sign and submit the transaction.',
        'Wait for the transaction to complete successfully.',
      ],
    },
    {
      title: 'If You See a Gas Limit or Network Fee Error',
      steps: [
        'If you encounter an error such as "Transaction failed: Gas limit error", click the small pen/edit icon beside Network Fee in your wallet.',
        'Select Advanced.',
        'Increase the Base Fee and Priority Fee to around 30 or above.',
        'Then retry the transaction.',
      ],
    },
    {
      title: 'Confirm Your Activation',
      steps: [
        'Return to the Activation & Level Manager page.',
        'Refresh the page if needed.',
        'Your account should now show that Level 1 has been successfully activated.',
      ],
    },
  ],
  reminders: [
    'Make sure your wallet is connected to the correct network.',
    'Make sure you have enough funds for activation and transaction fees.',
    'Only confirm transactions you understand.',
    'Never share your Secret Recovery Phrase with anyone.',
    'Fin Freedom Network will never ask for your Secret Recovery Phrase.',
  ],
}

const FINFREEDOM_GLOSSARY = [
  ['Blockchain', 'A decentralized and distributed ledger that records transactions in a transparent, immutable, and verifiable way. It allows smart contracts and automated systems to operate without centralized control, and all transactions can be publicly verified on-chain.'],
  ['Smart Contract', 'A program stored on the blockchain that automatically executes predefined actions when specific conditions are met. Smart contracts manage registrations, placements, payouts, upgrades, and recycling without human intervention, and all operations are transparent and verifiable on-chain.'],
  ['Wallet', 'A digital wallet used to interact with the blockchain. It works like a digital identity in the crypto world and allows users to access their positions, sign transactions, and interact with smart contracts. The wallet gives the user full control over their assets and positions. The responsibility for the funds and access to the wallet belongs entirely to the owner. If the private key or seed phrase is lost, the wallet and its contents cannot be recovered.'],
  ['Transaction', 'An operation recorded on the blockchain, such as a level activation, payout, upgrade, recycle, or token generation.'],
  ['On-Chain', 'Operations that occur directly on the blockchain and can be publicly verified by anyone.'],
  ['Immutable', 'Data recorded on the blockchain that cannot be modified or deleted once confirmed.'],
  ['Decentralized', 'A system that operates without a single central authority and is managed through distributed infrastructure and smart contracts.'],
  ['Level', 'A participation stage in the F-Freedom Program with a fixed price and defined structure. Participants progress level by level.'],
  ['Activation', 'The process of purchasing and opening a level in the system.'],
  ['Orbit (P4, P12, P39)', 'Structure models that define position placement, payouts, recycling, and auto-upgrades within the F-Freedom Program.'],
  ['Structure', 'The network positions connected to a participant within the orbit system.'],
  ['Cycle', 'The process from entering a level, completing the structure, receiving payouts, and recycling into a new cycle.'],
  ['Auto-Upgrade', 'Automatic activation of the next level using part of the earnings generated in the current level.'],
  ['Recycle', 'When a level structure completes, the participant automatically repurchases the same level from their upline, receives a new empty level, and starts a new cycle.'],
  ['System Charge', 'A percentage deducted from payouts and allocated to ecosystem pools, NFT pools, and system development.'],
  ['NFT Pool', 'A pool funded by system charges and connected to NFT-related ecosystem benefits and distributions.'],
  ['NFT (Non-Fungible Token)', 'A unique digital asset stored on the blockchain that may provide access to ecosystem benefits, rewards, or participation mechanisms.'],
  ['FGT (Freedom Game Token)', 'A functional ecosystem token generated when activating new levels. FGT cannot be bought or sold and can only be earned through participation and progression in the F-Freedom Program. FGT is connected to NFT qualification and ecosystem participation.'],
  ['FGTr (Freedom Game Token Recycle)', 'A functional ecosystem token generated when a level recycles. FGTr cannot be bought or sold and can only be earned through participation and recycling activity. FGTr is connected to long-term participation within the ecosystem.'],
  ['Participation-Based System', 'A system where rewards are generated from activity, structure completion, and network participation rather than from investments or fixed returns.'],
  ['DAO (Decentralized Autonomous Organization)', 'A governance system where decisions related to the ecosystem may be made through community voting using tokens.'],
  ['Upgrade', 'Moving from one level to the next level in the system.'],
  ['Ecosystem', 'The broader Fin Freedom Network that include multiple programs, tokens, NFTs, education platforms, governance systems, and future products developed by the community.'],
  ['Referral', 'The participant who directly introduces a new participant into the system.'],
  ['Upline', 'The participant positioned above another participant in the structure who receives positions or benefits from the activity of their downline.'],
  ['Downline', 'The participants positioned below a participant in the structure.'],
  ['Placement', 'The position assigned within an orbit structure when a new participant enters or when a recycle occurs.'],
  ['Position', 'A place inside an orbit structure that can generate payouts when filled according to the system rules.'],
  ['Payout', 'A distribution automatically executed by the smart contract when a position or structure condition is completed.'],
  ['Pool', 'A fund collected through system charges and allocated for specific ecosystem purposes such as NFT pools or development.'],
  ['Qualification', 'The conditions required to access certain benefits such as NFTs, pools, or ecosystem features.'],
  ['Utility Token', 'A token that has a functional use inside a platform or ecosystem and is not designed for trading or speculation.'],
  ['Self Custody', 'A system where users have full control over their wallet and assets without relying on a centralized entity.'],
  ['Seed Phrase / Private Key', 'The cryptographic keys that give full access to a wallet. Whoever controls the private key controls the wallet and its assets.'],
  ['dApp (Decentralized Application)', 'An application that runs on the blockchain and interacts with smart contracts instead of centralized servers.'],
]

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

// Helper component for guide groups
const SupportGuideGroup = ({ groupKey, title, items }) => {
  const { t } = useTranslation()

  return (
    <div className="support-article-guide__group">
      <h3>{t(`supportPage.registrationGuide.${groupKey}.title`, title)}</h3>

      <div className="support-article-guide__steps">
        {items.map((item, index) => (
          <article className="support-article-guide__step" key={`${groupKey}-${index}`}>
            <span className="support-article-guide__step-number">{index + 1}</span>

            <div>
              <h4>{t(`supportPage.registrationGuide.${groupKey}.items.${index}.title`, item.title)}</h4>
              <ul>
                {item.steps.map((step, stepIndex) => (
                  <li key={`${groupKey}-${index}-${stepIndex}`}>
                    {t(`supportPage.registrationGuide.${groupKey}.items.${index}.steps.${stepIndex}`, step)}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// Collapsible Support Section Component
const CollapsibleSupportSection = ({
  id,
  title,
  eyebrow,
  description,
  icon: Icon,
  openSection,
  setOpenSection,
  children,
}) => {
  const { t } = useTranslation()
  const isOpen = openSection === id

  return (
    <section className={`support-collapsible glass-panel ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="support-collapsible__trigger"
        onClick={() => setOpenSection(isOpen ? '' : id)}
      >
        <span className="support-collapsible__icon">
          <Icon size={20} />
        </span>

        <span className="support-collapsible__copy">
          <small>{eyebrow}</small>
          <strong>{title}</strong>
          <em>{description}</em>
        </span>

        <span className="support-collapsible__action">
          {isOpen ? t('supportPage.collapsible.hide', 'Hide') : t('supportPage.collapsible.open', 'Open')}
          <ChevronRight size={16} />
        </span>
      </button>

      {isOpen && (
        <div className="support-collapsible__body">
          {children}
        </div>
      )}
    </section>
  )
}

// Slide Doc Modal Component
const SlideDocModal = ({ doc, onClose }) => {
  const { t } = useTranslation()

  useEffect(() => {
    if (!doc) return undefined
    return lockBodyScroll()
  }, [doc])

  if (!doc) return null

  return (
    <div className="slide-doc-modal-overlay" onClick={onClose}>
      <div className="slide-doc-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="slide-doc-modal__header">
          <div>
            <span>{t(`supportPage.slideDocs.${doc.id}.eyebrow`, doc.eyebrow)}</span>
            <h3>{t(`supportPage.slideDocs.${doc.id}.title`, doc.title)}</h3>
          </div>

          <div className="slide-doc-modal__actions">
            <a href={doc.src} target="_blank" rel="noopener noreferrer">
              {t('supportPage.slideDocModal.openFullScreen', 'Open full screen')} <ExternalLink size={15} />
            </a>

            <button type="button" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <iframe
          className="slide-doc-modal__frame"
          src={`${doc.src}#toolbar=1&navpanes=0&view=FitH`}
          title={t(`supportPage.slideDocs.${doc.id}.title`, doc.title)}
        />
      </div>
    </div>
  )
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
  const { t } = useTranslation()
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
            <Mail size={16} /> {t('supportPage.floatingActions.contactSupport', 'Contact Support')}
          </button>
          <button type="button" onClick={() => { window.open(telegramLink, '_blank', 'noopener,noreferrer'); setIsOpen(false); }}>
            <FaTelegramPlane size={16} /> {t('supportPage.floatingActions.telegram', 'Telegram')}
          </button>
          <button type="button" onClick={() => { onRefresh(); setIsOpen(false); }}>
            <RefreshCw size={16} /> {t('supportPage.floatingActions.refreshData', 'Refresh Data')}
          </button>
        </div>
      )}
    </div>
  )
}

// Modal Components for Legal Documents
const LegalModal = ({ isOpen, onClose, title, children }) => {
  const { t } = useTranslation()

  useEffect(() => {
    if (!isOpen) return undefined
    return lockBodyScroll()
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
          <button type="button" className="legal-modal__close-btn" onClick={onClose}>{t('supportPage.modal.close', 'Close')}</button>
        </div>
      </div>
    </div>
  )
}

const ComingSoonModal = ({ isOpen, onClose, title }) => {
  const { t } = useTranslation()

  useEffect(() => {
    if (!isOpen) return undefined
    return lockBodyScroll()
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
          <h4>{t('supportPage.tutorialModal.title', 'Tutorial Videos Underway')}</h4>
          <p>{t('supportPage.tutorialModal.text', 'Video tutorials are currently being prepared and will be available soon. Stay tuned for step-by-step guides on registration, level activation, orbit navigation, and more.')}</p>
        </div>
        <div className="legal-modal__footer">
          <button type="button" className="legal-modal__close-btn" onClick={onClose}>{t('supportPage.modal.close', 'Close')}</button>
        </div>
      </div>
    </div>
  )
}

const SupportPage = ({ onNavigate }) => {
  const { t } = useTranslation()
  const { isConnected, account, connect } = useWallet()
  const { contracts, loadContracts } = useContracts()
  const toast = useToast()
  const supportT = useCallback((key, fallback, options) => t(`supportPage.${key}`, fallback, options), [t])

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
  const [showRegistrationGuideModal, setShowRegistrationGuideModal] = useState(false)
  const [showGlossaryModal, setShowGlossaryModal] = useState(false)
  const [activeSlideDoc, setActiveSlideDoc] = useState(null)

  // Collapsible section state
  const [openSupportSection, setOpenSupportSection] = useState('quick-help')

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

  const normalizeFaqItem = (item, index) => ({
    ...item,
    _id: item._id || item.id || `faq-${index}`,
    question:
      item.question ||
      item.title ||
      item.questionText ||
      item.name ||
      '',
    answer:
      item.answer ||
      item.content ||
      item.body ||
      item.description ||
      '',
    category:
      item.category ||
      item.categoryName ||
      item.type ||
      'General',
  })

  const fetchFaqs = useCallback(async () => {
  try {
    const res = await fetch(getApiUrl('/api/support/faqs'))
    const data = await res.json()

    const rawItems = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.data?.items)
        ? data.data.items
        : Array.isArray(data?.items)
          ? data.items
          : []

    const items = rawItems.map(normalizeFaqItem).filter((item) => item.question || item.answer)

    console.log('[SUPPORT_FAQS_RESPONSE]', data)
    console.log('[SUPPORT_FAQS_ITEMS]', items)

    setFaqs(items)
  } catch (err) {
    console.error('Error fetching FAQs:', err)
    setFaqs([])
  }
}, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/community/announcements'))
      const data = await res.json()
      setAnnouncements(data?.ok ? data.data?.items?.slice(0, 5) || [] : [])
    } catch {
      setAnnouncements([])
    }
  }, [])

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/community/resources'))
      const data = await res.json()
      setResources(data?.ok ? data.data?.items || [] : [])
    } catch {
      setResources([])
    }
  }, [])

  const fetchSocialLinks = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/community/social-links'))
      const data = await res.json()
      setSocialLinks(data?.ok ? data.data?.items || [] : [])
    } catch {
      setSocialLinks([])
    }
  }, [])

  const fetchRecentTickets = useCallback(async () => {
    if (!account) return setRecentTickets([])
    try {
      const res = await fetch(getApiUrl(`/api/support/tickets/${account}`))
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
      const res = await fetch(getApiUrl('/api/health'))
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
    const normalizedQuery = query.trim().toLowerCase()

    setSearchQuery(query)

    if (normalizedQuery.length > 1) {
      const suggestions = faqs
        .filter((faq) => {
          const question = String(faq.question || '').toLowerCase()
          const answer = String(faq.answer || '').toLowerCase()
          const category = String(faq.category || '').toLowerCase()

          return (
            question.includes(normalizedQuery) ||
            answer.includes(normalizedQuery) ||
            category.includes(normalizedQuery)
          )
        })
        .slice(0, 6)

      setSearchSuggestions(suggestions)
    } else {
      setSearchSuggestions([])
    }
  }

  const filteredFaqs = useMemo(() => {
    let filtered = Array.isArray(faqs) ? faqs : []

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((faq) => faq.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()

      filtered = filtered.filter((faq) => {
        const question = String(faq.question || '').toLowerCase()
        const answer = String(faq.answer || '').toLowerCase()
        const category = String(faq.category || '').toLowerCase()

        return (
          question.includes(query) ||
          answer.includes(query) ||
          category.includes(query)
        )
      })
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
    toast.success(supportT('clipboard.walletCopied', 'Wallet address copied.'), { dedupeKey: 'support-wallet-copied' })
    setTimeout(() => setCopiedWallet(false), 2000)
  }

  const handleFormChange = (field, value) => setTicketForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmitTicket = async () => {
    if (!ticketForm.category || !ticketForm.subject || !ticketForm.message) {
      const message = supportT('contact.errors.requiredFields', 'Please complete the required fields before sending your request.')
      setSubmitStatus({ loading: false, success: false, error: message })
      toast.warning(message, { dedupeKey: 'support-ticket-required-fields' })
      return
    }
    setSubmitStatus({ loading: true, success: false, error: null })
    try {
      const res = await fetch(getApiUrl('/api/support/tickets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: account, ...ticketForm }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.message || supportT('contact.errors.submissionFailed', 'Submission failed'))
      setSubmitStatus({ loading: false, success: true, error: null })
      toast.success(supportT('contact.successToast', 'Support request submitted.'), { dedupeKey: 'support-ticket-submitted' })
      setTicketForm({ category: '', subject: '', message: '', txHash: '' })
      fetchRecentTickets()
      setTimeout(() => setSubmitStatus({ loading: false, success: false, error: null }), 3000)
    } catch (err) {
      const message = err.message || supportT('contact.errors.submissionFailed', 'Submission failed')
      setSubmitStatus({ loading: false, success: false, error: message })
      toast.danger(message, { dedupeKey: 'support-ticket-submit-failed' })
    }
  }

  const getCategoryIcon = (category) => {
    const Icon = categoryIcons[category] || categoryIcons.default
    return <Icon size={18} />
  }

  const scrollToContact = () => {
    setOpenSupportSection('contact')

    setTimeout(() => {
      document.getElementById('contact-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
  }

  // Early return AFTER all hooks
  if (!isConnected) {
    return (
      <section className="support-page">
        <div className="support-hero glass-panel">
          <picture className="support-hero__bg support-hero__bg--dark" aria-hidden="true">
            <source media="(max-width: 640px)" srcSet={SUPPORT_HERO_IMAGES.mobileDark} />
            <img src={SUPPORT_HERO_IMAGES.dark} alt="" />
          </picture>

          <picture className="support-hero__bg support-hero__bg--light" aria-hidden="true">
            <source media="(max-width: 640px)" srcSet={SUPPORT_HERO_IMAGES.mobileLight} />
            <img src={SUPPORT_HERO_IMAGES.light} alt="" />
          </picture>

          <div className="support-hero__left">
            <div className="support-hero__text-block">
              <h1 className="support-hero__title">{supportT('hero.title', 'Support Center')}</h1>

              <p className="support-hero__description soft-text">
                {supportT('hero.disconnectedDescription', 'Connect your wallet to access personalized support, guided help, and ticket submission.')}
              </p>
            </div>

            <button type="button" onClick={connect} className="connect-wallet-btn">
              <Wallet size={18} /> {supportT('hero.connectWallet', 'Connect Wallet')}
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="support-page">
      {/* Modals */}
      <LegalModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title={supportT('legal.privacy.title', 'Privacy Policy')}>
        <div className="legal-content">
          <h4>{supportT('legal.privacy.sections.dataCollection.heading', '1. Data Collection Philosophy')}</h4>
          <p>{supportT('legal.privacy.sections.dataCollection.text', 'Fin Freedom Network is designed to collect minimal data. The Platform does not require: names, email addresses, phone numbers, government-issued identification. The Platform is built to function without traditional user accounts or centralized identity records.')}</p>
          <h4>{supportT('legal.privacy.sections.information.heading', '2. Information Collected')}</h4>
          <p>{supportT('legal.privacy.sections.information.text', 'The Platform may collect or process: public wallet addresses, on-chain transaction data, referral relationships recorded on-chain, website usage data (if applicable).')}</p>
          <h4>{supportT('legal.privacy.sections.blockchain.heading', '3. Blockchain Transparency')}</h4>
          <p>{supportT('legal.privacy.sections.blockchain.text', 'Blockchain data is public, permanent, and accessible to anyone. Your wallet address and all transactions are publicly visible. Fin Freedom Network cannot alter, hide, or delete blockchain data.')}</p>
          <h4>{supportT('legal.privacy.sections.noSale.heading', '4. No Sale or Monetization of Data')}</h4>
          <p>{supportT('legal.privacy.sections.noSale.text', 'Fin Freedom Network does not sell, rent, trade, or monetize user data. The Platform does not engage in data brokerage or targeted advertising based on personal information.')}</p>
        </div>
      </LegalModal>

      <LegalModal isOpen={showRiskModal} onClose={() => setShowRiskModal(false)} title={supportT('legal.risk.title', 'Risk Disclaimer')}>
        <div className="legal-content">
          <p style={{ fontWeight: 'bold', color: 'var(--danger)', marginBottom: '16px' }}>{supportT('legal.risk.importantNotice', 'IMPORTANT NOTICE')}</p>
          <p>{supportT('legal.risk.intro', 'Participation in Fin Freedom Network involves significant risks. You should only participate if you fully understand and willingly accept these risks.')}</p>
          <h4>{supportT('legal.risk.sections.smartContract.heading', '1. Blockchain & Smart Contract Risks')}</h4>
          <p>{supportT('legal.risk.sections.smartContract.text', 'Smart contracts operate autonomously once deployed and may be difficult or impossible to modify. Risks include vulnerabilities, coding errors, protocol exploits, and chain reorganizations.')}</p>
          <h4>{supportT('legal.risk.sections.token.heading', '2. Token & Digital Asset Risks')}</h4>
          <p>{supportT('legal.risk.sections.token.text', 'Tokens may fluctuate in value, experience low liquidity, lose value entirely, or be affected by regulatory actions. There is no assurance that any token will maintain value or utility.')}</p>
          <h4>{supportT('legal.risk.sections.noAdvice.heading', '3. No Financial, Legal, or Tax Advice')}</h4>
          <p>{supportT('legal.risk.sections.noAdvice.text', 'Nothing provided constitutes investment, financial, legal, or tax advice. You are solely responsible for seeking independent professional advice.')}</p>
          <h4>{supportT('legal.risk.sections.security.heading', '4. User Error & Security Risks')}</h4>
          <p>{supportT('legal.risk.sections.security.text', 'Fin Freedom Network cannot reverse transactions or recover lost assets from user errors, phishing, or compromised wallets.')}</p>
        </div>
      </LegalModal>

      <LegalModal isOpen={showTransparencyModal} onClose={() => setShowTransparencyModal(false)} title={supportT('legal.transparency.title', 'Smart Contract Transparency')}>
        <div className="legal-content">
          <h4>{supportT('legal.transparency.sections.onChain.heading', 'On-Chain Smart Contracts')}</h4>
          <p>{supportT('legal.transparency.sections.onChain.text', 'Fin Freedom Network is built with transparency and safety at its core. All core mechanisms are enforced by immutable smart contracts deployed on public blockchains.')}</p>
          <h4>{supportT('legal.transparency.sections.security.heading', 'Security Features')}</h4>
          <ul>
            <li>{supportT('legal.transparency.sections.security.items.0', 'No admin access to user funds')}</li>
            <li>{supportT('legal.transparency.sections.security.items.1', 'Deterministic payout rules')}</li>
            <li>{supportT('legal.transparency.sections.security.items.2', 'Multisig governance')}</li>
            <li>{supportT('legal.transparency.sections.security.items.3', 'External audits planned')}</li>
          </ul>
          <h4>{supportT('legal.transparency.sections.verifiable.heading', 'Verifiable Operations')}</h4>
          <p>{supportT('legal.transparency.sections.verifiable.text', 'Users can independently verify all rules and transactions on-chain. Every reward follows a clear, predefined structure that cannot be altered arbitrarily.')}</p>
          <h4>{supportT('legal.transparency.sections.roadmap.heading', 'Ecosystem Roadmap')}</h4>
          <ul>
            <li>{supportT('legal.transparency.sections.roadmap.items.0', 'Phase 2: Freedom-Plus Program rollout')}</li>
            <li>{supportT('legal.transparency.sections.roadmap.items.1', 'Phase 3: Freedom NFT Program activation')}</li>
            <li>{supportT('legal.transparency.sections.roadmap.items.2', 'Phase 4: Token utilities & governance expansion')}</li>
            <li>{supportT('legal.transparency.sections.roadmap.items.3', 'Phase 5: Marketplace, Academy, and ecosystem integrations')}</li>
          </ul>
        </div>
      </LegalModal>

      <LegalModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title={supportT('legal.terms.title', 'Terms & Conditions')}>
        <div className="legal-content">
          <h4>{supportT('legal.terms.sections.acceptance.heading', '1. Acceptance of Terms')}</h4>
          <p>{supportT('legal.terms.sections.acceptance.text', 'By accessing, registering, or using any part of the Fin Freedom Network platform, you confirm that you have read, understood, and agreed to be bound by these Terms & Conditions.')}</p>
          <h4>{supportT('legal.terms.sections.nature.heading', '2. Nature of the Platform')}</h4>
          <p>{supportT('legal.terms.sections.nature.text', 'Fin Freedom Network is a decentralized, blockchain-based platform that operates through smart contracts. The Platform does not hold user funds, control user wallets, or guarantee earnings.')}</p>
          <h4>{supportT('legal.terms.sections.wallet.heading', '3. Wallet Responsibility')}</h4>
          <p>{supportT('legal.terms.sections.wallet.text', 'You are solely responsible for safeguarding your wallet credentials. Wallet addresses cannot be changed once registered. Lost private keys cannot be recovered.')}</p>
          <h4>{supportT('legal.terms.sections.noGuarantees.heading', '4. No Guarantees')}</h4>
          <p>{supportT('legal.terms.sections.noGuarantees.text', 'Fin Freedom Network makes no guarantees regarding profits, income, returns, referrals, or future platform performance.')}</p>
          <h4>{supportT('legal.terms.sections.finality.heading', '5. Smart Contract Finality')}</h4>
          <p>{supportT('legal.terms.sections.finality.text', 'Blockchain transactions are irreversible. Once confirmed, they cannot be reversed or refunded.')}</p>
        </div>
      </LegalModal>

      <ComingSoonModal isOpen={showTutorialModal} onClose={() => setShowTutorialModal(false)} title={supportT('resources.tutorials', 'Tutorial Videos')} />

      {/* Registration Guide Modal */}
      <LegalModal
        isOpen={showRegistrationGuideModal}
        onClose={() => setShowRegistrationGuideModal(false)}
        title={supportT('registrationGuide.title', REGISTRATION_LEVEL_ONE_GUIDE.title)}
      >
        <div className="support-doc-modal-content">
          <div className="support-doc-modal-content__meta">
            <span>{supportT('registrationGuide.brand', REGISTRATION_LEVEL_ONE_GUIDE.brand)}</span>
            <span>{supportT('registrationGuide.date', REGISTRATION_LEVEL_ONE_GUIDE.date)}</span>
          </div>

          <div className="support-doc-modal-content__summary">
            <strong>{supportT('registrationGuide.summaryLabel', 'Cocoon AI Summary')}</strong>
            <p>{supportT('registrationGuide.summary', REGISTRATION_LEVEL_ONE_GUIDE.summary)}</p>
          </div>

          <div className="support-doc-modal-content__intro">
            <h4>{supportT('registrationGuide.introHeading', 'HOW TO REGISTER AND ACTIVATE LEVEL 1 IN THE F-FREEDOM PROGRAM')}</h4>
            <p>{supportT('registrationGuide.intro', REGISTRATION_LEVEL_ONE_GUIDE.intro)}</p>
          </div>

          <SupportGuideGroup groupKey="mobile" title="Mobile Guide" items={REGISTRATION_LEVEL_ONE_GUIDE.mobile} />

          <SupportGuideGroup groupKey="desktop" title="Laptop/Desktop Guide" items={REGISTRATION_LEVEL_ONE_GUIDE.desktop} />

          <div className="support-doc-modal-content__reminders">
            <h4>{supportT('registrationGuide.reminders.title', 'Important Reminders')}</h4>
            <ul>
              {REGISTRATION_LEVEL_ONE_GUIDE.reminders.map((item, index) => (
                <li key={`reminder-${index}`}>
                  <CheckCircle size={15} />
                  <span>{supportT(`registrationGuide.reminders.items.${index}`, item)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </LegalModal>

      {/* Glossary Modal */}
      <LegalModal
        isOpen={showGlossaryModal}
        onClose={() => setShowGlossaryModal(false)}
        title={supportT('glossary.title', 'FinFreedom Glossary - Official Terminology (Version 1)')}
      >
        <div className="support-glossary-modal-content">
          <p className="support-glossary-modal-content__intro">
            {supportT('glossary.intro', 'This glossary defines the main terms used within the Fin Freedom ecosystem and the F-Freedom Program. These definitions are intended to create a common language for participants, leaders, developers, and community members.')}
          </p>

          <div className="support-glossary-modal-content__grid">
            {FINFREEDOM_GLOSSARY.map(([term, definition], index) => (
              <article className="support-glossary-modal-content__item" key={`glossary-${index}`}>
                <h4>{supportT(`glossary.items.${index}.term`, term)}</h4>
                <p>{supportT(`glossary.items.${index}.definition`, definition)}</p>
              </article>
            ))}
          </div>
        </div>
      </LegalModal>

      <div className="support-hero glass-panel">
        <picture className="support-hero__bg support-hero__bg--dark" aria-hidden="true">
          <source media="(max-width: 640px)" srcSet={SUPPORT_HERO_IMAGES.mobileDark} />
          <img src={SUPPORT_HERO_IMAGES.dark} alt="" />
        </picture>

        <picture className="support-hero__bg support-hero__bg--light" aria-hidden="true">
          <source media="(max-width: 640px)" srcSet={SUPPORT_HERO_IMAGES.mobileLight} />
          <img src={SUPPORT_HERO_IMAGES.light} alt="" />
        </picture>

        <div className="support-hero__left">
          <div className="support-hero__text-block">
            <h1 className="support-hero__title">{supportT('hero.title', 'Support Center')}</h1>

            <p className="support-hero__description soft-text">
              {supportT('hero.description', 'Find trusted answers, search common issues, and contact support with the right wallet details or transaction hash for faster resolution.')}
            </p>
          </div>

          <div className="support-hero__search-col">
            <div className="support-search glass-panel">
              <Search size={18} className="search-icon" />

              <input
                type="text"
                className="search-input"
                placeholder={supportT('search.placeholder', 'Search registration, activation, wallet, orbit, or support topics...')}
                value={searchQuery}
                onChange={handleSearchChange}
              />

              {searchQuery ? (
                <button
                  className="search-clear"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchSuggestions([])
                  }}
                  type="button"
                  aria-label={supportT('search.clearAriaLabel', 'Clear search')}
                >
                  <X size={14} />
                </button>
              ) : null}

              {searchSuggestions.length > 0 && (
                <div className="search-suggestions glass-panel">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion._id || suggestion.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(suggestion.question)
                        setFaqOpenIndex(suggestion._id || suggestion.id)
                        setSearchSuggestions([])
                        setOpenSupportSection('faq')
                        setTimeout(() => {
                          document.getElementById('faq-section')?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          })
                        }, 80)
                      }}
                    >
                      <Search size={12} />
                      <span>{suggestion.question}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {searchQuery ? (
            <div className="support-search-results glass-panel">
              <div className="support-search-results__header">
                <span>
                  <Search size={14} /> {supportT('search.resultsLabel', '{{count}} result{{plural}} for "{{query}}"', { count: filteredFaqs.length, plural: filteredFaqs.length === 1 ? '' : 's', query: searchQuery })}
                </span>

                <button
                  type="button"
                  className="support-search-results__link"
                  onClick={() => {
                    setOpenSupportSection('faq')
                    setTimeout(() => {
                      document.getElementById('faq-section')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      })
                    }, 80)
                  }}
                >
                  {supportT('search.viewFullResults', 'View full results')} <ChevronRight size={12} />
                </button>
              </div>

              <div className="support-search-results__list">
                {searchPreview.length ? (
                  searchPreview.map((faq) => (
                    <button
                      key={faq._id || faq.id}
                      type="button"
                      className="support-search-results__item"
                      onClick={() => {
                        setFaqOpenIndex(faq._id || faq.id)
                        setOpenSupportSection('faq')
                        setTimeout(() => {
                          document.getElementById('faq-section')?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          })
                        }, 80)
                      }}
                    >
                      <strong>{faq.question}</strong>
                      <span>{faq.category === 'General' ? supportT('faq.generalCategory', 'General') : faq.category}</span>
                    </button>
                  ))
                ) : (
                  <div className="support-search-results__empty soft-text">
                    {supportT('search.empty', 'No direct matches found yet. Try a broader keyword or use the support request section below.')}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="support-hero__community">
            <p className="support-hero__community-title">
              {supportT('community.title', 'Gain Support Through the Verified Community Platforms')}
            </p>

            <div className="support-telegram-mini-row">
              {TELEGRAM_COMMUNITY_LINKS.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="support-telegram-mini-card"
                  aria-label={supportT(`telegram.${item.id}.title`, item.title)}
                  title={supportT(`telegram.${item.id}.title`, item.title)}
                >
                  <img
                    src={item.darkImage}
                    alt={supportT(`telegram.${item.id}.title`, item.title)}
                    className="support-telegram-mini-card__image support-telegram-mini-card__image--dark"
                  />

                  <img
                    src={item.lightImage}
                    alt={supportT(`telegram.${item.id}.title`, item.title)}
                    className="support-telegram-mini-card__image support-telegram-mini-card__image--light"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Learning Center Section */}
      <section className="support-slide-library glass-panel">
        <div className="support-section-heading">
          <span className="support-section-heading__eyebrow">{supportT('learning.eyebrow', 'Learning Center')}</span>
          <h2 className="support-section-heading__title">{supportT('learning.title', 'Guides, slides, and quick onboarding help')}</h2>
          <p className="soft-text">
            {supportT('learning.description', 'Explore the ecosystem, understand the current F-Freedom Program, or get step-by-step mobile registration help.')}
          </p>
        </div>

        <div className="support-slide-library__grid">
          {SUPPORT_SLIDE_DOCS.map((doc) => {
            const Icon = doc.icon

            return (
              <article className="support-slide-card" key={doc.id}>
                <span className="support-slide-card__glow" />

                <div className="support-slide-card__icon">
                  <Icon size={22} />
                </div>

                <div className="support-slide-card__copy">
                  <span>{supportT(`slideDocs.${doc.id}.eyebrow`, doc.eyebrow)}</span>
                  <h3>{supportT(`slideDocs.${doc.id}.title`, doc.title)}</h3>
                  <p>{supportT(`slideDocs.${doc.id}.description`, doc.description)}</p>
                </div>

                <button
                  type="button"
                  className="support-slide-card__button"
                  onClick={() => setActiveSlideDoc(doc)}
                >
                  {supportT(`slideDocs.${doc.id}.buttonLabel`, doc.buttonLabel)}
                  <ExternalLink size={15} />
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <CollapsibleSupportSection
        id="quick-help"
        title={supportT('sections.quickHelp.title', 'Quick Help')}
        eyebrow={supportT('sections.quickHelp.eyebrow', 'Start here')}
        description={supportT('sections.quickHelp.description', 'Choose the issue you need help with.')}
        icon={LifeBuoy}
        openSection={openSupportSection}
        setOpenSection={setOpenSupportSection}
      >
        <div className="support-quick-help__grid">
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('registration')}>
            <span className="support-quick-help__icon"><Rocket size={24} style={{ color: 'var(--glow-teal)' }} /></span>
            <span className="support-quick-help__title">{supportT('quickHelp.registration.title', 'Registration Help')}</span>
            <span className="support-quick-help__text soft-text">{supportT('quickHelp.registration.text', 'Onboarding steps, sponsor confirmation, and irreversible registration.')}</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('levels')}>
            <span className="support-quick-help__icon"><TrendingUp size={24} style={{ color: 'var(--glow-blue)' }} /></span>
            <span className="support-quick-help__title">{supportT('quickHelp.levels.title', 'Levels & Activation')}</span>
            <span className="support-quick-help__text soft-text">{supportT('quickHelp.levels.text', '10 progressive levels, activation checks, and progression rules.')}</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('orbit')}>
            <span className="support-quick-help__icon"><Orbit size={24} style={{ color: '#8b5cf6' }} /></span>
            <span className="support-quick-help__title">{supportT('quickHelp.orbit.title', 'Orbit Issues')}</span>
            <span className="support-quick-help__text soft-text">{supportT('quickHelp.orbit.text', 'Placements, cycles (P4, P12, P39), and payout visibility.')}</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
          <button type="button" className="support-quick-help__card glass-panel" onClick={() => setActiveGuideKey('wallet')}>
            <span className="support-quick-help__icon"><Wallet size={24} style={{ color: '#f59e0b' }} /></span>
            <span className="support-quick-help__title">{supportT('quickHelp.wallet.title', 'Wallet & Network')}</span>
            <span className="support-quick-help__text soft-text">{supportT('quickHelp.wallet.text', 'Connection, network switching, and transaction confirmations.')}</span>
            <ChevronRight size={16} className="card-arrow" />
          </button>
        </div>
      </CollapsibleSupportSection>

      <CollapsibleSupportSection
        id="guides"
        title={supportT('sections.guides.title', 'Guides and Official Terms')}
        eyebrow={supportT('sections.guides.eyebrow', 'Helpful resources')}
        description={supportT('sections.guides.description', 'Open the registration guide or glossary.')}
        icon={BookOpen}
        openSection={openSupportSection}
        setOpenSection={setOpenSupportSection}
      >
        <div className="support-doc-cta__grid">
          <button
            type="button"
            className="support-doc-cta__card"
            onClick={() => setShowRegistrationGuideModal(true)}
          >
            <BookOpen size={22} />
            <span>{supportT('guideCards.registration.eyebrow', 'Step-by-step guide')}</span>
            <strong>{supportT('guideCards.registration.title', 'How to Register and Activate Level 1')}</strong>
            <p>{supportT('guideCards.registration.description', 'Mobile and desktop instructions for new participants.')}</p>
          </button>

          <button
            type="button"
            className="support-doc-cta__card"
            onClick={() => setShowGlossaryModal(true)}
          >
            <FileText size={22} />
            <span>{supportT('guideCards.glossary.eyebrow', 'Official terminology')}</span>
            <strong>{supportT('guideCards.glossary.title', 'FinFreedom Glossary')}</strong>
            <p>{supportT('guideCards.glossary.description', 'Understand the key terms used across the ecosystem.')}</p>
          </button>
        </div>
      </CollapsibleSupportSection>

      <CollapsibleSupportSection
        id="contact"
        title={supportT('sections.contact.title', 'Contact Support')}
        eyebrow={supportT('sections.contact.eyebrow', 'Send a request')}
        description={supportT('sections.contact.description', 'Submit a clear support message with wallet and transaction details.')}
        icon={Mail}
        openSection={openSupportSection}
        setOpenSection={setOpenSupportSection}
      >
        <div id="contact-section" className="support-contact">
          <div className="support-contact__grid">
            <div className="support-contact__form">
              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">{supportT('contact.category.label', 'Support Category *')}</label>
                <select className="support-contact__select glass-panel" value={ticketForm.category} onChange={(e) => handleFormChange('category', e.target.value)}>
                  <option value="">{supportT('contact.category.options.choose', 'Choose the support area')}</option>
                  <option value="registration">{supportT('contact.category.options.registration', 'Registration Issues')}</option>
                  <option value="levels">{supportT('contact.category.options.levels', 'Level Activation')}</option>
                  <option value="orbits">{supportT('contact.category.options.orbits', 'Orbit Problems')}</option>
                  <option value="referrals">{supportT('contact.category.options.referrals', 'Referral Issues')}</option>
                  <option value="wallet">{supportT('contact.category.options.wallet', 'Wallet Connection')}</option>
                  <option value="transaction">{supportT('contact.category.options.transaction', 'Transaction Errors')}</option>
                  <option value="other">{supportT('contact.category.options.other', 'Other')}</option>
                </select>
              </div>
              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">{supportT('contact.wallet.label', 'Your Wallet')}</label>
                <div className="support-contact__wallet-display glass-panel">
                  <span>{account ? `${account.slice(0, 8)}...${account.slice(-6)}` : supportT('contact.wallet.notConnected', 'Not connected')}</span>
                  {account ? <button className="copy-wallet-btn" onClick={copyWallet} type="button">{copiedWallet ? <Check size={14} /> : <Copy size={14} />}</button> : null}
                </div>
              </div>
              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">{supportT('contact.subject.label', 'Subject *')}</label>
                <input type="text" className="support-contact__input glass-panel" placeholder={supportT('contact.subject.placeholder', 'Summarize the issue clearly')} value={ticketForm.subject} onChange={(e) => handleFormChange('subject', e.target.value)} />
              </div>
              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">{supportT('contact.txHash.label', 'Transaction Hash (Optional)')}</label>
                <input type="text" className="support-contact__input glass-panel" placeholder={supportT('contact.txHash.placeholder', '0x... (include for faster resolution)')} value={ticketForm.txHash} onChange={(e) => handleFormChange('txHash', e.target.value)} />
              </div>
              <div className="support-contact__field-group">
                <label className="support-contact__label muted-text">{supportT('contact.message.label', 'Message *')}</label>
                <textarea className="support-contact__textarea glass-panel" placeholder={supportT('contact.message.placeholder', 'Describe what happened, what you expected, and the steps you already tried. Include level, cycle, and any error messages.')} value={ticketForm.message} onChange={(e) => handleFormChange('message', e.target.value)} rows={6} />
              </div>
              <div className="support-info-note glass-panel">
                <Info size={14} />
                <span className="soft-text">{supportT('contact.note', 'Blockchain transactions are irreversible. Always verify details before signing.')}</span>
              </div>
              {submitStatus.success ? <div className="support-success-message"><CheckCircle size={16} /> {supportT('contact.success', 'Support request submitted successfully. Our team will review it and respond as soon as possible.')}</div> : null}
              {submitStatus.error ? <div className="support-error-message"><AlertCircle size={16} /> {submitStatus.error}</div> : null}
              <div className="support-contact__actions">
                <button type="button" className="support-contact__primary-btn" onClick={handleSubmitTicket} disabled={submitStatus.loading}>
                  {submitStatus.loading ? <><RefreshCw size={16} className="spin" /> {supportT('contact.actions.submitting', 'Submitting...')}</> : <><Send size={16} /> {supportT('contact.actions.submit', 'Submit Request')}</>}
                </button>
                <button type="button" className="support-contact__secondary-btn" onClick={() => setTicketForm({ category: '', subject: '', message: '', txHash: '' })}>{supportT('contact.actions.clear', 'Clear Form')}</button>
              </div>
            </div>

            <div className="support-contact__side">
              <div className="support-contact__assist-card">
                <LifeBuoy size={20} />
                <div>
                  <strong>{supportT('contact.assist.beforeSubmit.title', 'Before you submit')}</strong>
                  <p className="soft-text">{supportT('contact.assist.beforeSubmit.text', 'Include your wallet address, level, cycle, and transaction hash whenever applicable. This gives support the best chance of resolving your issue quickly.')}</p>
                </div>
              </div>
              <div className="support-contact__assist-card">
                <Shield size={20} style={{ color: 'var(--glow-teal)' }} />
                <div>
                  <strong>{supportT('contact.assist.wallet.title', 'Wallet responsibility')}</strong>
                  <p className="soft-text">{supportT('contact.assist.wallet.text', 'You are solely responsible for securing your wallet. Fin Freedom Network will never request your private key or recovery phrase.')}</p>
                </div>
              </div>
              {recentTickets.length ? 
                <div className="support-recent-tickets">
                  <h4>{supportT('contact.recent.title', 'Your Recent Tickets')}</h4>
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
                    <strong>{supportT('contact.recent.emptyTitle', 'No recent tickets yet')}</strong>
                    <p className="soft-text">{supportT('contact.recent.emptyText', 'Once you submit a request, your recent support activity will appear here.')}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </CollapsibleSupportSection>

      <CollapsibleSupportSection
        id="faq"
        title={supportT('sections.faq.title', 'Frequently Asked Questions')}
        eyebrow={supportT('sections.faq.eyebrow', 'Knowledge base')}
        description={supportT('sections.faq.description', 'Search and read answers about registration, levels, wallets, and orbits.')}
        icon={HelpCircle}
        openSection={openSupportSection}
        setOpenSection={setOpenSupportSection}
      >
        <div id="faq-section" className="support-faq">
          <div className="support-section-heading">
            <span className="support-section-heading__eyebrow muted-text">{supportT('faq.eyebrow', 'Knowledge Base')}</span>
            <h2 className="support-section-heading__title">{supportT('faq.title', 'Frequently Asked Questions')}</h2>
            <p className="soft-text">{supportT('faq.description', 'Clear answers about participation, progression, and platform rules')}</p>
          </div>
          {searchQuery ? <div className="search-results-info"><Search size={14} /> {supportT('faq.foundResults', 'Found {{count}} result{{plural}} for "{{query}}"', { count: filteredFaqs.length, plural: filteredFaqs.length === 1 ? '' : 's', query: searchQuery })}</div> : null}
          {loading ? 
            <div className="faq-loading"><RefreshCw size={24} className="spin" /><span>{supportT('faq.loading', 'Loading FAQs...')}</span></div> :
            <div className="support-faq__categories">
              {Object.entries(groupedFaqs).map(([category, items]) => 
                <div key={category} className="support-faq__category">
                  <h3 className="faq-category-title">
                    {getCategoryIcon(category)}
                    <span>{category === 'General' ? supportT('faq.generalCategory', 'General') : category}</span>
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
        </div>
      </CollapsibleSupportSection>

      <CollapsibleSupportSection
        id="safety"
        title={supportT('sections.safety.title', 'Safety Guidance')}
        eyebrow={supportT('sections.safety.eyebrow', 'Security first')}
        description={supportT('sections.safety.description', 'Important wallet, transaction, and platform safety reminders.')}
        icon={Shield}
        openSection={openSupportSection}
        setOpenSection={setOpenSupportSection}
      >
        <div className="support-safety__grid">
          <div className="support-safety__item">
            <span className="support-safety__icon"><Shield size={20} style={{ color: 'var(--glow-teal)' }} /></span>
            <div>
              <h3 className="support-safety__title">{supportT('safety.seedPhrase.title', 'Never share your seed phrase')}</h3>
              <p className="support-safety__text soft-text">{supportT('safety.seedPhrase.text', 'Fin Freedom Network will never ask for your seed phrase, private keys, or recovery phrase.')}</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><AlertTriangle size={20} style={{ color: '#f59e0b' }} /></span>
            <div>
              <h3 className="support-safety__title">{supportT('safety.irreversible.title', 'Transactions are irreversible')}</h3>
              <p className="support-safety__text soft-text">{supportT('safety.irreversible.text', 'Once confirmed on the blockchain, transactions cannot be reversed or refunded. Always verify details before signing.')}</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><Eye size={20} style={{ color: 'var(--glow-blue)' }} /></span>
            <div>
              <h3 className="support-safety__title">{supportT('safety.noAdmin.title', 'No admin access to funds')}</h3>
              <p className="support-safety__text soft-text">{supportT('safety.noAdmin.text', 'Smart contracts enforce deterministic payout rules. No single individual has unilateral authority over user funds.')}</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><Search size={20} style={{ color: 'var(--glow-blue)' }} /></span>
            <div>
              <h3 className="support-safety__title">{supportT('safety.review.title', 'Review transaction details')}</h3>
              <p className="support-safety__text soft-text">{supportT('safety.review.text', 'Check the wallet prompt, value, and target action before you confirm any transaction.')}</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><AlertCircle size={20} style={{ color: '#ef4444' }} /></span>
            <div>
              <h3 className="support-safety__title">{supportT('safety.links.title', 'Avoid unofficial links')}</h3>
              <p className="support-safety__text soft-text">{supportT('safety.links.text', 'Use only trusted support channels and never send funds to unknown addresses.')}</p>
            </div>
          </div>
          <div className="support-safety__item">
            <span className="support-safety__icon"><Scale size={20} style={{ color: '#8b5cf6' }} /></span>
            <div>
              <h3 className="support-safety__title">{supportT('safety.walletFinal.title', 'Wallet addresses are final')}</h3>
              <p className="support-safety__text soft-text">{supportT('safety.walletFinal.text', 'Wallet addresses cannot be changed after registration. If compromised, you must create a new wallet before registering.')}</p>
            </div>
          </div>
        </div>
      </CollapsibleSupportSection>

      {/* Slide Doc Modal */}
      <SlideDocModal doc={activeSlideDoc} onClose={() => setActiveSlideDoc(null)} />

      {activeGuide ? 
        <div className="support-guide-modal__backdrop" onClick={() => setActiveGuideKey(null)}>
          <div className="support-guide-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="support-guide-modal__header">
              <div>
                <span className="support-section-heading__eyebrow muted-text">{supportT('quickGuideModal.eyebrow', 'Quick Help Guide')}</span>
                <h3>{supportT(`quickGuides.${activeGuideKey}.title`, activeGuide.title)}</h3>
                <p className="soft-text">{supportT(`quickGuides.${activeGuideKey}.description`, activeGuide.description)}</p>
              </div>
              <button type="button" className="support-guide-modal__close" onClick={() => setActiveGuideKey(null)}><X size={16} /></button>
            </div>
            <div className="support-guide-modal__body">
              <ol className="support-guide-modal__steps">
                {activeGuide.steps.map((step, index) => <li key={`${activeGuideKey}-${index}`}>{supportT(`quickGuides.${activeGuideKey}.steps.${index}`, step)}</li>)}
              </ol>
            </div>
            <div className="support-guide-modal__footer">
              <button type="button" className="support-contact__secondary-btn" onClick={() => setActiveGuideKey(null)}>{supportT('modal.close', 'Close')}</button>
              <button type="button" className="support-contact__primary-btn" onClick={() => { 
                setActiveGuideKey(null); 
                if (activeGuide.route === 'support') { 
                  document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' }) 
                } else { 
                  onNavigate?.(activeGuide.route) 
                } 
              }}>
                <span>{supportT(`quickGuides.${activeGuideKey}.routeLabel`, activeGuide.routeLabel)}</span>
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
