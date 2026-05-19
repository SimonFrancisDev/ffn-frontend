// import { useEffect, useMemo, useState } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  Pause,
  Play,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react'
import {
  FaFacebookF,
  FaInstagram,
  FaLayerGroup,
  FaRecycle,
  FaCoins,
  FaCrown,
  FaGem,
  FaChartLine,
  FaUsers,
  FaStore,
  FaExchangeAlt,
  FaGraduationCap,
  FaBriefcase,
  FaCertificate,
  FaShieldAlt,
  FaGlobe,
  FaHandshake,
  FaStar,
  FaHandPointer,
  FaTrophy,
  FaBalanceScale,
  FaSyncAlt,
  FaBolt,
  FaCube,
  FaLeaf,
  FaShoppingBag,
  FaHeadphones,
  FaClock,
  FaTicketAlt,
  FaGamepad,
  FaCheckCircle,
} from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { PiTelegramLogoFill } from 'react-icons/pi'
import { useWallet } from '../../hooks/useWallet'
import { useSession } from '../../context/SessionContext'
import { getApiUrl } from '../../Services/apiConfig'
import { useToast } from '../../components/feedback'
import './LandingPage.css'

const APP_USER_ID_STORAGE_KEY = 'finfreedom_app_user_id_v1'

async function fetchJson(path, options = {}) {
  const response = await fetch(getApiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || `Request failed: ${response.status}`)
  return payload
}

function formatNumber(value) {
  if (typeof value !== 'number') return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

const FOOTER_LOGO = {
  dark: '/images/official_logo_2.png',
  light: '/images/official_logo_light.png',
  mobileDark: '/images/official_logo_2.png',
  mobileLight: '/images/official_logo_light.png',
}

const SOCIAL_LINKS = [
  { id: 'telegram', label: 'Telegram', icon: PiTelegramLogoFill, href: 'https://t.me/' },
  { id: 'instagram', label: 'Instagram', icon: FaInstagram, href: 'https://instagram.com/' },
  { id: 'facebook', label: 'Facebook', icon: FaFacebookF, href: 'https://facebook.com/' },
  { id: 'x', label: 'X', icon: FaXTwitter, href: 'https://x.com/' },
]

const HIGHLIGHT_ICONS = {
  'Transparent Systems': FaShieldAlt,
  'Real Participation': FaUsers,
  'Sustainable Growth': FaChartLine,
  'Community Driven': FaHandshake,

  'Structured Levels': FaLayerGroup,
  'Smart Contract Powered': FaShieldAlt,
  'Automatic Recycling': FaRecycle,
  'Token Rewards': FaCoins,

  'Advanced Participation': FaChartLine,
  'Expanded Utility': FaGem,
  'Future Positioning': FaGlobe,

  'Exclusive Access': FaCrown,
  'Tier Rewards': FaGem,
  'Long-Term Value': FaChartLine,
  'On-Chain Transparency': FaShieldAlt,

  'Secure Transactions': FaShieldAlt,
  'Token Powered': FaCoins,
  'Real Utility': FaStore,

  'Participation Rewards': FaUsers,
  'Structured Token Flow': FaExchangeAlt,
  'Deflationary Alignment': FaChartLine,
  'Multi-Token Utility': FaCoins,

  'Digital Skills': FaGraduationCap,
  'Leadership Growth': FaBriefcase,
  'Practical Learning': FaLayerGroup,
  'On-Chain Credentials': FaCertificate,
}

const PROGRAM_FEATURE_ICONS = {
  '10 Progressive Levels': FaChartLine,
  'Triple-P Orbit Engine': FaLayerGroup,
  'Smart Contract Powered': FaShieldAlt,
  'Automatic Recycling': FaRecycle,
  'Token Rewards': FaCoins,

  '7 Advance Levels': FaChartLine,
  'Multiple-P Orbit Engine': FaLayerGroup,
  'Manual Upgrade': FaHandPointer,
  'Accelerated NFT Path': FaStar,

  Shop: FaShoppingBag,
  Trust: FaShieldAlt,
  Connect: FaGlobe,
  Grow: FaChartLine,
}

const PROGRAM_VALUE_ICONS = {
  'Participation-Based Qualification': FaUsers,
  'Token-Backed Membership': FaShieldAlt,
  'Single Highest-Tier Reward Logic': FaTrophy,
  'Fair and Sustainable Distribution': FaBalanceScale,
  'Deflationary Alignment': FaLeaf,

  'Participation-Based Rewards': FaUsers,
  'Activity-Driven Value': FaBolt,
  'Structured Token Generation': FaCube,
  'Ecosystem Utility': FaLayerGroup,

  'World-Class Digital Education': FaGlobe,
  'Business & Leadership Development': FaBriefcase,
  'NFT-Backed Certifications': FaCertificate,
  'Structured Learning Paths': FaLayerGroup,
  'Practical, Job-Ready Education': FaBriefcase,
  'On-Chain Credential Verification': FaShieldAlt,
}

const MARKETPLACE_CATEGORY_ICONS = {
  Electronics: FaHeadphones,
  Lifestyle: FaClock,
  Fashion: FaShoppingBag,
  Events: FaTicketAlt,
  'Digital Assets': FaGem,
  'Online Courses': FaGraduationCap,
  Gaming: FaGamepad,
}

const TOKEN_ICONS = {
  FGT: FaCoins,
  FGTr: FaSyncAlt,
  FPT: FaChartLine,
  FPTr: FaRecycle,
}

const TIER_ICONS = {
  Advance: FaCrown,
  Intermediate: FaStar,
  Foundation: FaGem,
}

const ECOSYSTEM_IMAGE = {
  dark: '/images/landing/ecosystem-section-dark.png',
  light: '/images/landing/ecosystem-section-light.png',
  mobileDark: '/images/landing/ecosystem-section-mobile-dark.png',
  mobileLight: '/images/landing/ecosystem-section-mobile-light.png',
}

const ECOSYSTEM_FEATURES = [
  {
    title: 'Structured System',
    text: 'Built on clarity, transparency, and fairness.',
    icon: FaShieldAlt,
  },
  {
    title: 'Education & Empowerment',
    text: 'Knowledge and skills for personal and financial growth.',
    icon: FaGraduationCap,
  },
  {
    title: 'Global Community',
    text: 'Connecting individuals with a shared vision and purpose.',
    icon: FaUsers,
  },
  {
    title: 'Sustainable Future',
    text: 'Designed for long-term impact and generational opportunity.',
    icon: FaChartLine,
  },
]

const HERO_SLIDES = [
  {
    id: 'main-hero-network',
    programId: 'f-freedom-program',
    title: 'Fin Freedom Network',
    eyebrow: 'Complete Ecosystem',
    headline: 'Built on Participation. Driven by Value.',
    description:
      'A structured Web3 ecosystem designed around transparency, participation, and long-term sustainability.',
    highlights: ['Transparent Systems', 'Real Participation', 'Sustainable Growth', 'Community Driven'],
    ctaLabel: 'Launch App',
    secondaryLabel: 'Explore Programs',
    contentPosition: 'bottom-left',
    image: {
      dark: '/images/landing/main-hero-dark.png',
      light: '/images/landing/main-hero-light.png',
      mobileDark: '/images/landing/main-hero-mobile-dark.png',
      mobileLight: '/images/landing/main-hero-mobile-light.png',
    },
  },
  {
    id: 'hero-01-f-freedom',
    programId: 'f-freedom-program',
    title: 'F-Freedom Program',
    eyebrow: 'Current Program',
    headline: 'Enter the Core Participation Engine.',
    description: 'A structured, level-based system powered by smart contracts and designed for predictable, transparent progression.',
    highlights: ['Structured Levels', 'Smart Contract Powered', 'Automatic Recycling', 'Token Rewards'],
    ctaLabel: 'Start F-Freedom',
    secondaryLabel: 'Explore Ecosystem',
    contentPosition: 'bottom-left',
    image: {
      dark: '/images/landing/hero-01-dark.png',
      light: '/images/landing/hero-01-light.png',
      mobileDark: '/images/landing/cards/f-freedom-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/f-freedom-card-mobile-light.png',
    },
  },
  {
    id: 'hero-02-freedom-plus',
    programId: 'freedom-plus-program',
    title: 'Freedom-Plus Program',
    eyebrow: 'Future Phase',
    headline: 'Expand Beyond the Core.',
    description: 'A deeper participation layer designed for enhanced positioning, higher-value engagement, and long-term ecosystem growth.',
    highlights: ['Advanced Participation', 'Expanded Utility', 'Future Positioning'],
    ctaLabel: 'Preview Freedom-Plus',
    secondaryLabel: 'View Roadmap',
    contentPosition: 'bottom-left',
    image: {
      dark: '/images/landing/hero-02-dark.png',
      light: '/images/landing/hero-02-light.png',
      mobileDark: '/images/landing/cards/freedom-plus-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/freedom-plus-card-mobile-light.png',
    },
  },
  {
    id: 'hero-03-freedom-nft',
    programId: 'freedom-nft-program',
    title: 'Freedom NFT Program',
    eyebrow: 'Reputation Layer',
    headline: 'Own Access. Unlock Growth.',
    description: 'A membership-based NFT system built for identity, access, and long-term ecosystem participation.',
    highlights: ['Exclusive Access', 'Tier Rewards', 'Long-Term Value', 'On-Chain Transparency'],
    ctaLabel: 'Preview NFT Layer',
    secondaryLabel: 'Learn More',
    contentPosition: 'bottom-left',
    image: {
      dark: '/images/landing/hero-03-dark.png',
      light: '/images/landing/hero-03-light.png',
       mobileDark: '/images/landing/cards/nft-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/nft-card-mobile-light.png',
    },
  },
  
{
  id: 'hero-04-fin-freedom-coin',
  programId: 'fin-freedom-coin',
  title: 'Fin Freedom Coin',
  eyebrow: 'Ecosystem Asset',
  headline: 'The Engine of Value.',
  description: 'A structured token economy powering participation, rewards, and sustainable ecosystem growth.',
  highlights: ['Participation Rewards', 'Structured Token Flow', 'Deflationary Alignment', 'Multi-Token Utility'],
  ctaLabel: 'Preview Coin Layer',
  secondaryLabel: 'View Ecosystem',
  contentPosition: 'bottom-left',
  image: {
    dark: '/images/landing/hero-04-dark.png',
    light: '/images/landing/hero-04-light.png',
    mobileDark: '/images/landing/cards/coin-card-mobile-dark.png',
    mobileLight: '/images/landing/cards/coin-card-mobile-light.png',
  },
},

{
  id: 'hero-05a-fgt',
  title: 'FGT',
  image: {
    dark: '/images/landing/hero-05a-dark.png',
    light: '/images/landing/hero-05a-light.png',
    mobileDark: '/images/landing/hero-05a-mobile-dark.png',
    mobileLight: '/images/landing/hero-05a-mobile-light.png',
  },
},
{
  id: 'hero-05b-fgtr',
  title: 'FGTr',
  image: {
    dark: '/images/landing/hero-05b-dark.png',
    light: '/images/landing/hero-05b-light.png',
    mobileDark: '/images/landing/hero-05b-mobile-dark.png',
    mobileLight: '/images/landing/hero-05b-mobile-light.png',
  },
},

{
  id: 'hero-05-marketplace',
  programId: 'fin-freedom-marketplace',
  title: 'Fin Freedom Marketplace',
  eyebrow: 'Utility Marketplace',
  headline: 'Shop. Connect. Grow.',
  description: 'A blockchain-powered marketplace for digital assets, services, and real ecosystem value exchange.',
  highlights: ['Secure Transactions', 'Community Driven', 'Token Powered', 'Real Utility'],
  ctaLabel: 'Preview Marketplace',
  secondaryLabel: 'Explore Programs',
  contentPosition: 'bottom-left',
  image: {
    dark: '/images/landing/hero-05-dark.png',
    light: '/images/landing/hero-05-light.png',
    mobileDark: '/images/landing/cards/marketplace-card-mobile-dark.png',
    mobileLight: '/images/landing/cards/marketplace-card-mobile-light.png',
  },
},

  {
    id: 'hero-06-institute',
    programId: 'fin-freedom-institute',
    title: 'Fin Freedom Institute',
    eyebrow: 'Education Layer',
    headline: 'Educate. Empower. Elevate.',
    description: 'A global learning system designed to equip individuals with digital skills, leadership capacity, and real-world knowledge.',
    highlights: ['Digital Skills', 'Leadership Growth', 'Practical Learning', 'On-Chain Credentials'],
    ctaLabel: 'Explore Institute',
    secondaryLabel: '',
    contentPosition: 'bottom-center-simple',
    image: {
      dark: '/images/landing/hero-06-dark.png',
      light: '/images/landing/hero-06-light.png',
      mobileDark: '/images/landing/cards/institute-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/institute-card-mobile-light.png',
    },
  },
  {
    id: 'hero-07-ecosystem',
    programId: 'f-freedom-program',
    title: 'Fin Freedom Network',
    eyebrow: 'Complete Ecosystem',
    headline: 'One network. Multiple digital freedom layers.',
    description:
      'Fin Freedom Network brings together participation, education, marketplace utility, token concepts, and future ecosystem expansion.',
    highlights: [],
    ctaLabel: 'Launch App',
    secondaryLabel: 'Explore Programs',
    contentPosition: 'bottom-left',
    image: {
      dark: '/images/landing/hero-07-dark.png',
      light: '/images/landing/hero-07-light.png',
      mobileDark: '/images/landing/hero-07-mobile-dark.png',
      mobileLight: '/images/landing/hero-07-mobile-light.png',
    },
  },
]

const PROGRAMS = [
  {
    id: 'f-freedom-program',
    type: 'standard',
    title: 'F-Freedom Program',
    eyebrow: 'Participation Gateway',
    status: 'Current Program',

    headline: 'The Core Participation Engine of Fin Freedom Network.',

    description: `The F-Freedom Program is a structured, level-based earning system built on smart contracts and designed to reward participation, completion, and long-term engagement.

Powered by the Triple-P Orbit Engine, it ensures predictable earnings, controlled recycling, and sustainable growth for every participant.`,

    features: [
      {
        title: '10 Progressive Levels',
        text: 'Prices double per level from $10 to $5,120.',
      },
      {
        title: 'Triple-P Orbit Engine',
        text: 'Three powerful orbit structures: P4, P12, and P39.',
      },
      {
        title: 'Smart Contract Powered',
        text: 'Transparent, secure, and automated on-chain execution.',
      },
      {
        title: 'Automatic Recycling',
        text: 'Ensures continuous participation and system sustainability.',
      },
      {
        title: 'Token Rewards',
        text: 'Earn FGT on activation and FGTr on recycling (2:1 ratio).',
      },
    ],

    philosophy: {
      title: 'F-Freedom is not about speculation.',
      highlight: "It's about structure, participation, and freedom.",
    },

    supportingText:
      'It is the gateway to the Fin Freedom ecosystem — designed to create real opportunities through clarity, fairness, and a system that works for everyone.',

    proofPoints: ['No Admin Control', 'Deterministic Payouts', 'Transparent & Verifiable'],

    footerLine: 'One system. One mission. Together we build freedom.',

    image: {
      dark: '/images/landing/cards/f-freedom-card-dark.png',
      light: '/images/landing/cards/f-freedom-card-light.png',
      mobileDark: '/images/landing/cards/f-freedom-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/f-freedom-card-mobile-light.png',
    },

    isLive: true,
    route: 'activation',
  },

  {
    id: 'freedom-plus-program',
    type: 'advanced',
    title: 'Freedom-Plus Program',
    eyebrow: 'Expansion Pathway',
    status: 'Coming Soon',

    headline: 'Growth Engine. Higher Levels. Greater Freedom.',

    description: `The Freedom-Plus Program is the advanced earning layer of Fin Freedom Network, designed for participants who are ready to scale beyond the F-Freedom Program.

It delivers greater rewards, deeper engagement, and sustainable long-term growth.`,

    features: [
      {
        title: '7 Advance Levels',
        text: 'There are 7 powerful levels with price tripling from one level to the other with massive earning potential.',
        extra: [
          'L1 = $50',
          'L2 = $150',
          'L3 = $450',
          'L4 = $1,350',
          'L5 = $4,050',
          'L6 = $12,150',
          'L7 = $36,450',
        ],
      },
      {
        title: 'Multiple-P Orbit Engine',
        text: 'Built on powerful P3, P4, P6, P12, P14, and P39 orbits.',
      },
      {
        title: 'Automatic Recycling',
        text: 'Ensures continuous participation and system sustainability.',
      },
      {
        title: 'Manual Upgrade',
        text: 'Participants have the flexibility to advance at their own pace from Levels 1–7',
      },
      {
        title: 'Accelerated NFT Path',
        text: 'Generate more FPT tokens at every level activation and recycle, unlocking faster qualification for Freedom NFT membership tiers.',
      },
      {
        title: 'Token Rewards',
        text: 'Earn FPT on activation and FPTr on recycling (2:1 ratio).',
      },
    ],

    philosophy: {
      title: 'Built for serious growth.',
      highlight: 'Backed by structure. Driven by participation.',
    },

    supportingText:
      'Freedom-Plus is where commitment meets opportunity and participation drives real, sustainable rewards.',

    proofPoints: [
      'Deterministic payouts',
      'Automatic recycling',
      'Smart contract powered',
      'No admin interference',
    ],

    footerLine: 'One system. One mission. Together we build freedom.',

    image: {
      dark: '/images/landing/cards/freedom-plus-card-dark.png',
      light: '/images/landing/cards/freedom-plus-card-light.png',
      mobileDark: '/images/landing/cards/freedom-plus-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/freedom-plus-card-mobile-light.png',
    },

    isLive: false,
    route: 'freedom-plus',
  },

  {
    id: 'freedom-nft-program',
    type: 'tiered',
    title: 'Freedom NFT Program',
    eyebrow: 'Tiered Access Program',
    status: 'Coming Soon',

    headline:
      'A structured membership and reward system built on participation, progression, and sustainability.',

    tiers: [
      {
        name: 'Advance',
        level: 'Highest-Level Status',
        rewards: 'Premium Rewards',
        requirement: '62,000 FGT and/or FPT',
        poolShare: '20%',
        color: 'purple',
      },
      {
        name: 'Intermediate',
        level: 'Mid-Level Status',
        rewards: 'Enhanced Rewards',
        requirement: '18,700 FGT and/or FPT',
        poolShare: '30%',
        color: 'green',
      },
      {
        name: 'Foundation',
        level: 'Entry-Level Status',
        rewards: 'Basic Rewards',
        requirement: '5,700 FGT and/or FPT',
        poolShare: '50%',
        color: 'blue',
      },
    ],

    values: [
      'Participation-Based Qualification',
      'Token-Backed Membership',
      'Single Highest-Tier Reward Logic',
      'Fair and Sustainable Distribution',
      'Deflationary Alignment',
    ],

    image: {
      dark: '/images/landing/cards/nft-card-dark.png',
      light: '/images/landing/cards/nft-card-light.png',
      mobileDark: '/images/landing/cards/nft-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/nft-card-mobile-light.png',
    },

    isLive: false,
    route: 'nft',
  },

  {
    id: 'fin-freedom-coin',
    type: 'token',
    title: 'Fin Freedom Coin',
    eyebrow: 'Token Economy Layer',
    status: 'Core System',

    headline: 'The Engine of Value, Participation, and Reward.',

    description:
      'The core digital asset of the Fin Freedom Ecosystem designed to power ultility, governance, participation, incentives and value exchange across all interconnceted programs, platforms and services.',

   tokenShowcase: [
      {
        name: 'FGT',
        label: 'Freedom Game Token',
        image: '/images/fgt.png',
      },
      {
        name: 'FGTr',
        label: 'Freedom Game Reactivation Token',
        image: '/images/fgtr.png',
      },
      {
        name: 'FPT',
        label: 'Freedom-Plus Token',
        image: '/images/fpt.png',
      },
      {
        name: 'FPTr',
        label: 'Freedom-Plus Reactivation Token',
        image: '/images/fptr.png',
      },
  ],

    tokens: [
      {
        name: 'FGT',
        title: 'Freedom Game Token',
        source: 'F-Freedom Program',
        role: 'Activation Reward',
        description: 'Earned when participants activate levels.',
      },
      {
        name: 'FGTr',
        title: 'Freedom Game Reactivation Token',
        source: 'F-Freedom Program',
        role: 'Recycling Reward',
        description: 'Issued during level reactivation cycles.',
      },
      {
        name: 'FPT',
        title: 'Freedom-Plus Token',
        source: 'Freedom-Plus Program',
        role: 'Activation Reward',
        description: 'Higher-value tokens earned from advanced participation.',
      },
      {
        name: 'FPTr',
        title: 'Freedom-Plus Reactivation Token',
        source: 'Freedom-Plus Program',
        role: 'Recycling Reward',
        description: 'Generated during advanced reactivation cycles.',
      },
    ],

    flow: [
      'F-Freedom Program → FGT / FGTr',
      'Freedom-Plus Program → FPT / FPTr',
      'Used for NFT Qualification & Ecosystem Utility',
    ],

    values: [
      'Participation-Based Rewards',
      'Activity-Driven Value',
      'Structured Token Generation',
      'Deflationary Alignment',
      'Ecosystem Utility',
    ],

    footerLine: 'Built on structure. Powered by participation. Driven by value.',

    image: {
      dark: '/images/landing/cards/coin-card-dark.png',
      light: '/images/landing/cards/coin-card-light.png',
      mobileDark: '/images/landing/cards/coin-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/coin-card-mobile-light.png',
    },

    isLive: false,
    route: 'token-economy',
  },

  {
    id: 'fin-freedom-marketplace',
    type: 'marketplace',
    title: 'FFN Marketplace',
    eyebrow: 'Commerce Layer',
    status: 'Coming Soon',

    headline: 'Shop. Trust. Connect. Grow.',

    description:
      'The official digital marketplace of Fin Freedom Ecosystem, designed to provide access to premium products, digital assets and services within a trusted blockchain-powered ecosystem.',

    features: [
      {
        title: 'Shop',
        text: 'Premium products and digital assets.',
      },
      {
        title: 'Trust',
        text: 'Secure, transparent, and reliable.',
      },
      {
        title: 'Connect',
        text: 'Global community and real value.',
      },
      {
        title: 'Grow',
        text: 'Empowering your freedom journey.',
      },
    ],

    categories: [
      'Web3 Tools',
      'Softwares',
      'Tokenized Services',
      'Immersive Programs',
      'Events',
      'Digital Assets',
      'Online Courses',
      'Gaming',
    ],

    trust: [
      {
        title: 'Blockchain Secured',
        description: 'Every transaction is protected and verifiable.',
      },
      {
        title: 'FFN Token Powered',
        description: 'Pay, earn, and grow using FFN ecosystem tokens.',
      },
      {
        title: 'Community Driven',
        description: 'Built for the community, by the community.',
      },
      {
        title: 'Quality Assured',
        description: 'Curated products and services you can trust.',
      },
    ],

    cta: {
      title: 'Digital Marketplace',
      subtitle: 'An Access to Digital Premium Assets',
    },

    footerLine: 'One Network. One Ecosystem. Endless Possibilities.',

    image: {
      dark: '/images/landing/cards/marketplace-card-dark.png',
      light: '/images/landing/cards/marketplace-card-light.png',
      mobileDark: '/images/landing/cards/marketplace-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/marketplace-card-mobile-light.png',
    },

    isLive: false,
    route: 'marketplace',
  },

  {
    id: 'fin-freedom-institute',
    type: 'academy',
    title: 'Fin Freedom Institute',
    eyebrow: 'Education & Leadership Layer',
    status: 'Coming Soon',

    headline: 'One Institute. Two Academies. One Mission.',

    description:
      'A structured educational ecosystem designed to equip builders, entrepreneurs, leaders and ecosystem participants, with future ready digital skills, leadership capacity and pratical knowlege for the elvolving digital economy',

    academies: [
      {
        title: 'Freedom Digital Academy',
        subtitle: 'Technology & Digital Skills',
        topics: [
          'Blockchain Technology',
          'Web3 Development',
          'Smart Contracts & DeFi',
          'DAO Architecture',
          'Cybersecurity & Protocol Design',
        ],
        outcome: 'Globally competitive digital professionals and builders.',
      },
      {
        title: 'Freedom Business & Leadership Academy',
        subtitle: 'Entrepreneurship, Leadership & Growth',
        topics: [
          'Digital Entrepreneurship',
          'Online Marketing & Growth',
          'Team Building & Community Leadership',
          'Ethical Leadership & Governance',
          'Strategic Decision-Making',
        ],
        outcome: 'Ethical entrepreneurs, leaders, and ecosystem builders.',
      },
    ],

    values: [
      'World-Class Digital Education',
      'Business & Leadership Development',
      'NFT-Backed Certifications',
      'Structured Learning Paths',
      'Practical, Job-Ready Education',
      'On-Chain Credential Verification',
    ],

    footerLine: 'Educate. Empower. Elevate.',

    image: {
      dark: '/images/landing/cards/institute-card-dark.png',
      light: '/images/landing/cards/institute-card-light.png',
      mobileDark: '/images/landing/cards/institute-card-mobile-dark.png',
      mobileLight: '/images/landing/cards/institute-card-mobile-light.png',
    },

    isLive: false,
    route: 'institute',
  },
]

const LEGAL_CONTENT = {
  terms: {
    icon: Scale,
    badge: 'Legal',
    title: 'Terms & Conditions',
    subtitle: 'Last Updated: December 22, 2025',
    sections: [
      ['Acceptance of Terms', 'By accessing, registering, or using any part of the Fin Freedom Network platform, you confirm that you have read, understood, and agreed to be bound by these Terms & Conditions. If you do not agree, you must not use the Platform.'],
      ['Nature of the Platform', 'Fin Freedom Network is a decentralized blockchain-based platform that operates through smart contracts. The Platform does not hold user funds, control user wallets, guarantee earnings, or provide financial, investment, legal, or tax advice.'],
      ['Eligibility', 'You confirm that you are at least 18 years old or the legal age in your jurisdiction, have legal capacity, and that participation is lawful where you reside.'],
      ['Wallet Responsibility', 'Users must connect a self-custodial wallet. Wallet addresses cannot be changed after registration. Lost private keys or recovery phrases cannot be recovered by Fin Freedom Network.'],
      ['Program Participation', 'Participation in any program is voluntary. Program rules are enforced by smart contracts, and outcomes depend on participation, network activity, and system-defined rules.'],
      ['Assumption of Risk', 'Blockchain systems involve risks including smart contract vulnerabilities, network congestion, token volatility, and third-party failures. You voluntarily assume full responsibility for these risks.'],
      ['No Guarantees', 'Fin Freedom Network makes no guarantees regarding profits, income, returns, referrals, or future platform performance. Any examples are educational only.'],
      ['Token Use', 'Tokens including FFC, FGT, FPT, FGTr, and FPTr are utility tokens. They do not represent equity, ownership, profit share, or guaranteed value appreciation.'],
      ['Smart Contract Finality', 'Blockchain transactions are irreversible. Once confirmed, transactions cannot be reversed or refunded.'],
      ['Prohibited Use', 'You agree not to exploit, manipulate, interfere with contracts, use bots for unfair advantage, commit fraud, or bypass safeguards.'],
      ['Third-Party Dependencies', 'The Platform relies on blockchain networks, wallets, and infrastructure providers. Fin Freedom Network is not responsible for external failures or outages.'],
      ['Governance', 'Certain parameters may be adjusted only through DAO voting or protocol-defined mechanisms. No single individual has unilateral authority to alter core system logic.'],
      ['Limitation of Liability', 'Fin Freedom Network and its contributors shall not be liable for financial loss, wallet compromise, regulatory actions, data loss, or related damages.'],
      ['Indemnification', 'You agree to indemnify the Platform and contributors from claims or liabilities arising from your use of the Platform or failure to comply with laws.'],
      ['Tax Responsibility', 'You are solely responsible for determining, reporting, and paying any taxes or governmental charges arising from participation.'],
      ['Governing Law', 'These Terms are intended to operate within decentralized protocol principles except where required by applicable law.'],
      ['Acceptance', 'By registering or interacting with the Platform, you confirm your acceptance of these Terms & Conditions.'],
    ],
  },

  privacy: {
    icon: ShieldCheck,
    badge: 'Privacy',
    title: 'Privacy Policy',
    subtitle: 'Last Updated: December 22, 2025',
    sections: [
      ['Data Collection Philosophy', 'Fin Freedom Network is designed to collect minimal data and does not require names, emails, phone numbers, government identification, or centralized user accounts.'],
      ['Information Collected', 'The Platform may process public wallet addresses, on-chain transaction data, referral relationships recorded on-chain, and basic website usage data where applicable.'],
      ['Blockchain Transparency', 'Blockchain data is public, permanent, and accessible to anyone. Fin Freedom Network cannot alter, hide, or delete blockchain data.'],
      ['Cookies & Website Analytics', 'If cookies or similar technologies are used, they are used for performance, security, and basic functionality, not invasive tracking or behavioral profiling.'],
      ['Third-Party Services', 'The Platform may rely on blockchain networks, explorers, indexing services, content delivery, or infrastructure providers with their own policies.'],
      ['Data Security', 'No system is completely secure. Users remain responsible for securing wallets, devices, private keys, and recovery phrases.'],
      ['No Sale of Data', 'Fin Freedom Network does not sell, rent, trade, or monetize user data.'],
      ['Regulatory & Jurisdictional Notice', 'Blockchain data may be processed globally. Users are responsible for understanding local privacy laws.'],
      ['Changes to This Privacy Policy', 'This Privacy Policy may be updated through governance, security, or compliance requirements. Continued use means acceptance.'],
      ['Contact & Clarifications', 'Privacy-related inquiries may be addressed through official community communication channels or governance processes where applicable.'],
    ],
  },

  risk: {
    icon: TriangleAlert,
    badge: 'Risk Warning',
    title: 'Risk Disclaimer',
    subtitle: 'Last Updated: December 22, 2025',
    warning: 'Participation in Fin Freedom Network involves significant risks. Only participate if you fully understand and accept these risks.',
    sections: [
      ['Blockchain & Smart Contract Risks', 'Risks include smart contract vulnerabilities, coding errors, transaction failures, chain reorganizations, exploits, and infrastructure attacks.'],
      ['Token & Digital Asset Risks', 'Tokens may fluctuate in value, have low or no liquidity, lose value entirely, or be affected by technical, governance, legal, or market events.'],
      ['No Financial, Legal, or Tax Advice', 'Nothing on the Platform is investment, financial, legal, or tax advice. You are responsible for independent professional advice.'],
      ['Regulatory & Legal Risks', 'Blockchain and digital asset regulations vary by jurisdiction and may change. Participation may be restricted or prohibited in some regions.'],
      ['User Error & Security Risks', 'Losses may result from wrong addresses, malicious contracts, phishing, compromised wallets, lost private keys, or unsafe devices.'],
      ['Earnings, Participation & System Risks', 'Rewards depend on user participation, network activity, system mechanics, and broader market conditions. No outcome is guaranteed.'],
      ['Platform Availability & Third-Party Risks', 'Wallets, blockchain networks, infrastructure, and indexing tools may fail or become unavailable.'],
      ['Force Majeure & External Events', 'Cyberattacks, outages, geopolitical events, regulations, or enforcement actions may disrupt platform operations.'],
      ['Acceptance of Risk', 'By using the Platform, you acknowledge the risks, accept full responsibility, and agree that Fin Freedom Network bears no liability for losses.'],
    ],
  },

  transparency: {
    icon: Eye,
    badge: 'Transparency',
    title: 'Smart Contract Transparency',
    subtitle: 'Verifiable on-chain execution',
    sections: [
      ['On-Chain Smart Contracts', 'Fin Freedom Network is built with transparency and safety at its core. Core mechanisms are enforced by smart contracts deployed on public blockchains.'],
      ['Security Features', 'No admin access to user funds. Deterministic payout rules. Multisig governance. External audits planned.'],
      ['Verifiable Operations', 'Users can independently verify rules and transactions on-chain. Every reward follows a clear predefined structure.'],
      ['Growth Pillars', 'Sustainable growth comes from transparent communication, community events, ambassador programs, educational content, onboarding, gamification, referrals, and feedback forums.'],
      ['Ecosystem Roadmap', 'Phase 2: Freedom-Plus rollout. Phase 3: Freedom NFT Program activation. Phase 4: Token utilities and governance expansion. Phase 5: Marketplace, Academy, and integrations.'],
      ['Verification', 'Smart contract addresses will be published and verifiable through blockchain explorers. Users are encouraged to review interactions before signing.'],
    ],
  },
}

const createInternalUserId = () => {
  if (typeof window === 'undefined') return ''
  return window.crypto?.randomUUID
    ? `ffn-${window.crypto.randomUUID()}`
    : `ffn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

function useThemeMode() {
  const getTheme = () => {
    if (typeof document === 'undefined') return 'dark'
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  }

  const [theme, setTheme] = useState(getTheme)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const observer = new MutationObserver(() => setTheme(getTheme()))

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    setTheme(getTheme())

    return () => observer.disconnect()
  }, [])

  return theme
}

// function ThemeImage({ image, alt, className, priority = false }) {
function ThemeImage({ image, alt, className, priority = false, style }) {
  const theme = useThemeMode()

  const desktopSrc =
    typeof image === 'string'
      ? image
      : image?.[theme] || image?.dark || image?.light

  const mobileSrc =
    typeof image === 'string'
      ? image
      : theme === 'light'
        ? image?.mobileLight || image?.light || image?.dark
        : image?.mobileDark || image?.dark || image?.light

  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={mobileSrc} />
      {/* <img
        src={desktopSrc}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={(event) => {
          event.currentTarget.style.display = 'none'
        }}
      /> */}
      <img
          src={desktopSrc}
          alt={alt}
          className={className}
          style={style}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
    </picture>
  )
}

function LegalModal({ type, onClose }) {
  const { t } = useTranslation()
  const content = LEGAL_CONTENT[type]
  if (!content) return null; const Icon = content.icon
  const baseKey = `landingPage.legal.${type}`

  return (
    <div className="landing-disclaimer">
      <div className="landing-disclaimer__backdrop" onClick={onClose} />

      <div
        className="landing-disclaimer__dialog landing-disclaimer__dialog--legal"
        role="dialog"
        aria-modal="true"
      >
        <div className="legal-modal-logo-wrap">
        <ThemeImage
          image={FOOTER_LOGO}
          alt={t('landingPage.alt.logo', 'Fin Freedom Network')}
          className="legal-modal-logo"
        />
      </div>

        <button
          type="button"
          className="landing-disclaimer__close"
          onClick={onClose}
          aria-label={t('landingPage.legal.modal.closeAriaLabel', 'Close legal modal')}
        >
          <X size={18} />
        </button>

        <div className="landing-disclaimer__header">
          <div className="landing-disclaimer__badge">
            <Icon size={16} />
            <span>{t(`${baseKey}.badge`, content.badge)}</span>
          </div>

          <h2 className="landing-disclaimer__title">{t(`${baseKey}.title`, content.title)}</h2>
          <p className="landing-disclaimer__intro">{t(`${baseKey}.subtitle`, content.subtitle)}</p>
        </div>

        <div className="landing-disclaimer__body legal-content">
          {content.warning && <p className="legal-content__warning">{t(`${baseKey}.warning`, content.warning)}</p>}

          {content.sections.map(([heading, text], index) => (
            <section key={`${type}-section-${index}`} className="legal-content__section">
              <h4>{t(`${baseKey}.sections.${index}.heading`, heading)}</h4>
              <p>{t(`${baseKey}.sections.${index}.text`, text)}</p>
            </section>
          ))}
        </div>

        <div className="landing-disclaimer__actions">
          <button type="button" className="landing-btn landing-btn--primary" onClick={onClose}>
            {t('landingPage.legal.modal.agree', 'I agree')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProgramIcon({ icon: Icon }) {
  if (!Icon) return null
  return <Icon className="program-detail-icon" />
}

function ProgramFeatureGrid({ programId, features = [] }) {
  const { t } = useTranslation()
  if (!features.length) return null

  return (
    <div className="program-detail-grid">
      {features.map((feature, index) => {
        const Icon = PROGRAM_FEATURE_ICONS[feature.title] || Sparkles

        return (
          <div key={`${programId}-feature-${index}`} className="program-detail-box">
            <ProgramIcon icon={Icon} />
            <div>
              <h4>{t(`landingPage.programs.${programId}.features.${index}.title`, feature.title)}</h4>
              <p>{t(`landingPage.programs.${programId}.features.${index}.text`, feature.text)}</p>

              {feature.extra?.length > 0 && (
                <div className="program-price-list">
                  {feature.extra.map((item, extraIndex) => (
                    <span key={`${programId}-feature-${index}-extra-${extraIndex}`}>{item}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProgramPhilosophy({ program }) {
  const { t } = useTranslation()
  if (!program.philosophy && !program.supportingText && !program.proofPoints?.length) return null

  return (
    <div className="program-philosophy">
      {program.philosophy && (
        <div className="program-philosophy__statement">
          <strong>{t(`landingPage.programs.${program.id}.philosophy.title`, program.philosophy.title)}</strong>
          <span>{t(`landingPage.programs.${program.id}.philosophy.highlight`, program.philosophy.highlight)}</span>
        </div>
      )}

      {program.supportingText && <p>{t(`landingPage.programs.${program.id}.supportingText`, program.supportingText)}</p>}

      {program.proofPoints?.length > 0 && (
        <div className="program-proof-list">
          {program.proofPoints.map((item, index) => (
            <span key={`${program.id}-proof-${index}`}>
              <FaCheckCircle />
              {t(`landingPage.programs.${program.id}.proofPoints.${index}`, item)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ProgramTierGrid({ tiers = [] }) {
  const { t } = useTranslation()
  if (!tiers.length) return null

  return (
    <div className="program-tier-grid">
      {tiers.map((tier, index) => {
        const Icon = TIER_ICONS[tier.name] || FaGem

        return (
          <div key={`tier-${tier.color}-${index}`} className={`program-tier-card program-tier-card--${tier.color}`}>
            <ProgramIcon icon={Icon} />
            <h4>{t(`landingPage.programs.freedom-nft-program.tiers.${index}.name`, tier.name)}</h4>
            <p>{t(`landingPage.programs.freedom-nft-program.tiers.${index}.level`, tier.level)}</p>
            <p>{t(`landingPage.programs.freedom-nft-program.tiers.${index}.rewards`, tier.rewards)}</p>
            <div className="program-tier-meta">
              <span>{t('landingPage.programDetails.requirement', 'Requirement')}</span>
              <strong>{tier.requirement}</strong>
            </div>
            <div className="program-tier-meta">
              <span>{t('landingPage.programDetails.poolShare', 'Pool Share')}</span>
              <strong>{tier.poolShare}</strong>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProgramValueStrip({ values = [] }) {
  const { t } = useTranslation()
  if (!values.length) return null

  return (
    <div className="program-value-strip">
      {values.map((value, index) => {
        const Icon = PROGRAM_VALUE_ICONS[value] || Sparkles

        return (
          <span key={`value-${index}`}>
            <Icon />
            {t(`landingPage.programValues.${value}`, value)}
          </span>
        )
      })}
    </div>
  )
}

function ProgramTokenSystem({ program }) {
  const { t } = useTranslation()
  if (!program.tokens?.length) return null

  return (
    <>
      {/* <div className="program-core-token">
        <span>{program.coreToken.name}</span>
        <strong>{program.coreToken.title}</strong>
        <p>{program.coreToken.description}</p>
        <div>
          {program.coreToken.attributes.map((item, index) => (
            <em key={`core-token-attribute-${index}`}>{item}</em>
          ))}
        </div>
      </div> */}
      {program.tokenShowcase?.length ? (
        <div className="program-token-showcase" aria-label={t('landingPage.programDetails.tokenVisualsAriaLabel', '{{program}} token visuals', { program: program.title })}>
          <div className="program-token-showcase__orb">
            {program.tokenShowcase.map((token, index) => (
              <figure
                key={token.name}
                className="program-token-showcase__slide"
                style={{ '--token-slide-index': index }}
              >
                <img
                  src={token.image}
                  alt={t(`landingPage.programs.${program.id}.tokenShowcase.${index}.label`, token.label)}
                  className="program-token-showcase__image"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>
                  <strong>{token.name}</strong>
                  <span>{t(`landingPage.programs.${program.id}.tokenShowcase.${index}.label`, token.label)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      <div className="program-token-grid">
        {program.tokens.map((token, index) => {
          const Icon = TOKEN_ICONS[token.name] || FaCoins

          return (
            <div key={token.name} className="program-token-card">
              <ProgramIcon icon={Icon} />
              <h4>{token.name}</h4>
              <strong>{t(`landingPage.programs.${program.id}.tokens.${index}.title`, token.title)}</strong>
              <p>
                <span>{t('landingPage.programDetails.source', 'Source:')}</span> {t(`landingPage.programs.${program.id}.tokens.${index}.source`, token.source)}
              </p>
              <p>
                <span>{t('landingPage.programDetails.role', 'Role:')}</span> {t(`landingPage.programs.${program.id}.tokens.${index}.role`, token.role)}
              </p>
              <small>{t(`landingPage.programs.${program.id}.tokens.${index}.description`, token.description)}</small>
            </div>
          )
        })}
      </div>

      {program.flow?.length > 0 && (
        <div className="program-flow-strip">
          {program.flow.map((item, index) => (
            <span key={`${program.id}-flow-${index}`}>{t(`landingPage.programs.${program.id}.flow.${index}`, item)}</span>
          ))}
        </div>
      )}
    </>
  )
}

function ProgramMarketplace({ program }) {
  const { t } = useTranslation()
  return (
    <>
      <ProgramFeatureGrid programId={program.id} features={program.features} />

      {program.categories?.length > 0 && (
        <div className="program-category-cloud">
          {program.categories.map((category, index) => {
            const Icon = MARKETPLACE_CATEGORY_ICONS[category] || FaStore

            return (
              <span key={`${program.id}-category-${index}`}>
                <Icon />
                {t(`landingPage.programs.${program.id}.categories.${index}`, category)}
              </span>
            )
          })}
        </div>
      )}

      {program.trust?.length > 0 && (
        <div className="program-trust-grid">
          {program.trust.map((item, index) => (
            <div key={`${program.id}-trust-${index}`}>
              <FaShieldAlt />
              <strong>{t(`landingPage.programs.${program.id}.trust.${index}.title`, item.title)}</strong>
              <p>{t(`landingPage.programs.${program.id}.trust.${index}.description`, item.description)}</p>
            </div>
          ))}
        </div>
      )}

      {program.cta && (
        <div className="program-mini-cta">
          <strong>{t(`landingPage.programs.${program.id}.cta.title`, program.cta.title)}</strong>
          <span>{t(`landingPage.programs.${program.id}.cta.subtitle`, program.cta.subtitle)}</span>
        </div>
      )}
    </>
  )
}

function ProgramAcademies({ academies = [] }) {
  const { t } = useTranslation()
  if (!academies.length) return null

  return (
    <div className="program-academy-grid">
      {academies.map((academy, academyIndex) => (
        <div key={`academy-${academyIndex}`} className="program-academy-card">
          <FaGraduationCap className="program-detail-icon" />
          <h4>{t(`landingPage.programs.fin-freedom-institute.academies.${academyIndex}.title`, academy.title)}</h4>
          <span>{t(`landingPage.programs.fin-freedom-institute.academies.${academyIndex}.subtitle`, academy.subtitle)}</span>

          <ul>
            {academy.topics.map((topic, topicIndex) => (
              <li key={`academy-${academyIndex}-topic-${topicIndex}`}>
                <FaCheckCircle />
                {t(`landingPage.programs.fin-freedom-institute.academies.${academyIndex}.topics.${topicIndex}`, topic)}
              </li>
            ))}
          </ul>

          <p>
            <strong>{t('landingPage.programDetails.outcome', 'Outcome:')}</strong> {t(`landingPage.programs.fin-freedom-institute.academies.${academyIndex}.outcome`, academy.outcome)}
          </p>
        </div>
      ))}
    </div>
  )
}

function ProgramDetails({ program }) {
  if (program.type === 'tiered') {
    return (
      <>
        <ProgramTierGrid tiers={program.tiers} />
        <ProgramValueStrip values={program.values} />
      </>
    )
  }

  if (program.type === 'token') {
    return (
      <>
        <ProgramTokenSystem program={program} />
        <ProgramValueStrip values={program.values} />
      </>
    )
  }

  if (program.type === 'marketplace') {
    return <ProgramMarketplace program={program} />
  }

  if (program.type === 'academy') {
    return (
      <>
        <ProgramAcademies academies={program.academies} />
        <ProgramValueStrip values={program.values} />
      </>
    )
  }

  return (
    <>
      <ProgramFeatureGrid programId={program.id} features={program.features} />
      <ProgramPhilosophy program={program} />
    </>
  )
}



function MiniGrowthChart({ data = [] }) {
  const { t } = useTranslation()
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="mini-chart-empty">{t('landingPage.metrics.chartSyncing', 'Chart syncing')}</div>
  }

  const points = data.slice(-14)
  const values = points.map((item) => Number(item.registrations || item.count || 0))
  const max = Math.max(...values, 1)

  // const scaleNumbers = Array.from({ length: max }, (_, index) => max - index)
  const step = Math.max(1, Math.ceil(max / 5))

    const scaleNumbers = []
    for (let value = max; value >= 0; value -= step) {
      scaleNumbers.push(value)
    }

    if (!scaleNumbers.includes(0)) {
      scaleNumbers.push(0)
    }

  return (
    <div className="mini-chart-shell">
      <div className="mini-chart-scale" aria-hidden="true">
        {scaleNumbers.map((number) => (
          <span key={number}>{number}</span>
        ))}
      </div>

      <div className="mini-chart" aria-label={t('landingPage.metrics.chartAriaLabel', 'Registration growth chart')}>
        {points.map((item, index) => {
          const value = Number(item.registrations || item.count || 0)
          const height = Math.max((value / max) * 100, value > 0 ? 16 : 8)
          const label = item.date ? item.date.slice(5).replace('-', '/') : ''

          return (
            <div key={`${item.date || index}-${index}`} className="mini-chart-item">
              <div className="mini-chart-track">
                <span className="mini-chart-bar" style={{ height: `${height}%` }} />
              </div>
              <span className="mini-chart-date">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LandingPage({ onNavigate }) {
  const { t } = useTranslation()
  const pageT = (key, fallback, options) => t(`landingPage.${key}`, fallback, options)
  const { isConnected, isLoading: isWalletLoading, error: walletError, connect } = useWallet()
  const { isAcknowledged, acknowledge } = useSession()
  const theme = useThemeMode()
  const toast = useToast()

  const [internalUserId, setInternalUserId] = useState('')
  const [forceShowDisclaimer, setForceShowDisclaimer] = useState(false)
  const [programModal, setProgramModal] = useState(null)
  const [programModalImageX, setProgramModalImageX] = useState(50)
  const [isProgramModalImageDragging, setIsProgramModalImageDragging] = useState(false)
  const programModalImageDragRef = useRef({
    startClientX: 0,
    startImageX: 50,
  })
  const [legalModal, setLegalModal] = useState(null)
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)
  const [isHeroPaused, setIsHeroPaused] = useState(false)
  const [publicStats, setPublicStats] = useState({
    totalParticipants: null,
  })
  const [growthSeries, setGrowthSeries] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)

  const showDisclaimer = forceShowDisclaimer || !isAcknowledged

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      let storedUserId = window.localStorage.getItem(APP_USER_ID_STORAGE_KEY)
      if (!storedUserId) {
        storedUserId = createInternalUserId()
        window.localStorage.setItem(APP_USER_ID_STORAGE_KEY, storedUserId)
      }
      setInternalUserId(storedUserId)
    } catch (error) {
      console.error('Failed to initialize landing page local state:', error)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction

    if (showDisclaimer || programModal || legalModal) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
    }
  }, [showDisclaimer, programModal, legalModal])

  useEffect(() => {
    if (isHeroPaused) return undefined

    const interval = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % HERO_SLIDES.length)
    }, 6200)

    return () => window.clearInterval(interval)
  }, [isHeroPaused])

  useEffect(() => {
    let isMounted = true

    const loadStats = async () => {
      try {
        setStatsLoading(true)

        const [summary, growth] = await Promise.all([
          fetchJson('/api/community/summary'),
          fetchJson('/api/community/growth?days=14'),
        ])

        if (!isMounted) return

        setPublicStats({
          totalParticipants: summary?.data?.public?.totalParticipants ?? null,
        })

        setGrowthSeries(Array.isArray(growth?.data?.series) ? growth.data.series : [])
      } catch (err) {
        console.error('Failed to load public stats:', err)
      } finally {
        if (isMounted) setStatsLoading(false)
      }
    }

    loadStats()

    return () => {
      isMounted = false
    }
  }, [])
  


  useEffect(() => {
  setProgramModalImageX(50)
  setIsProgramModalImageDragging(false)
}, [programModal?.id])


  const primaryCtaLabel = useMemo(() => {
    if (walletError) return pageT('hero.primaryCta.retryWallet', 'Retry Wallet')
    if (isWalletLoading) return pageT('hero.primaryCta.connecting', 'Connecting...')
    if (!isConnected) return pageT('hero.primaryCta.connectWallet', 'Connect Wallet')
    return pageT('hero.primaryCta.launchApp', 'Launch App')
  }, [isConnected, isWalletLoading, pageT, walletError])

  const primaryCtaAction = async () => {
    if (walletError || !isConnected) {
      try {
        await connect?.()
        toast.success(pageT('toast.walletConnected', 'Wallet Connected'), { dedupeKey: 'landing-wallet-connected' })
      } catch (error) {
        toast.danger(error?.message || pageT('toast.walletConnectFailed', 'Wallet connection failed.'), { dedupeKey: 'landing-wallet-connect-failed' })
      }
      return
    }

    onNavigate?.('activation')
  }

  const handleProgramSelect = (program) => {
    if (program.isLive) {
      onNavigate?.(program.route || 'activation')
      return
    }

    setProgramModal(program)
  }

  const handleAcknowledgeDisclaimer = () => {
    acknowledge()
    setForceShowDisclaimer(false)
    toast.info(pageT('toast.noticeAcknowledged', 'Notice acknowledged.'), { dedupeKey: 'landing-notice-acknowledged' })
  }

  const goToPreviousHeroSlide = () => {
    setActiveHeroSlide((current) =>
      current === 0 ? HERO_SLIDES.length - 1 : current - 1
    )
  }

  const goToNextHeroSlide = () => {
    setActiveHeroSlide((current) => (current + 1) % HERO_SLIDES.length)
  }

  const goToHeroSlide = (index) => {
    setActiveHeroSlide(index)
  }

  const activeHero = HERO_SLIDES[activeHeroSlide]

  const handleHeroPrimary = (slide) => {
    const linkedProgram = PROGRAMS.find((program) => program.id === slide.programId)

    if (linkedProgram?.isLive) {
      primaryCtaAction()
      return
    }

    if (linkedProgram) {
      setProgramModal(linkedProgram)
      return
    }

    primaryCtaAction()
  }

  const handleHeroSecondary = (slide) => {
    if (slide.secondaryLabel?.toLowerCase().includes('explore')) {
      document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    const linkedProgram = PROGRAMS.find((program) => program.id === slide.programId)
    if (linkedProgram) setProgramModal(linkedProgram)
  }


const handleProgramModalImagePointerDown = (event) => {
  event.preventDefault()

  programModalImageDragRef.current = {
    startClientX: event.clientX,
    startImageX: programModalImageX,
  }

  event.currentTarget.setPointerCapture?.(event.pointerId)
  setIsProgramModalImageDragging(true)
}

const handleProgramModalImagePointerMove = (event) => {
  if (!isProgramModalImageDragging) return

  const rect = event.currentTarget.getBoundingClientRect()
  const dragDistance = event.clientX - programModalImageDragRef.current.startClientX
  const dragPercent = (dragDistance / Math.max(rect.width, 1)) * 100

  /*
    Drag right => reveal more left side.
    Drag left  => reveal more right side.
  */
  const nextPosition = programModalImageDragRef.current.startImageX - dragPercent
  const clampedPosition = Math.max(0, Math.min(100, nextPosition))

  setProgramModalImageX(clampedPosition)
}

const handleProgramModalImagePointerUp = (event) => {
  event.currentTarget.releasePointerCapture?.(event.pointerId)
  setIsProgramModalImageDragging(false)
}

  return (
    <>
      <ModalPortal>
        {showDisclaimer && (
          <div className="landing-disclaimer">
            <div className="landing-disclaimer__backdrop" />
            <div className="landing-disclaimer__dialog" role="dialog" aria-modal="true">
              <div className="legal-modal-logo-wrap">
                  <ThemeImage
                    image={FOOTER_LOGO}
                    alt={pageT('alt.logo', 'Fin Freedom Network')}
                    className="legal-modal-logo"
                  />
                </div>
              <div className="landing-disclaimer__header">
                <div className="landing-disclaimer__badge">
                  <ShieldAlert size={16} />
                  <span>{pageT('disclaimer.badge', 'Security & Legal Notice')}</span>
                </div>

                {/* <h2 className="landing-disclaimer__title">Important Notice — Please Read Carefully</h2> */}
              </div>

              <div className="landing-disclaimer__body">
                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">{pageT('disclaimer.sections.walletSecurity.title', 'Wallet Security')}</h3>
                    <p className="landing-disclaimer__section-text">
                      {pageT('disclaimer.sections.walletSecurity.text', 'You are solely responsible for securing your wallet. Never share your private key or recovery phrase. Fin Freedom Network will never request your private key.')}
                    </p>
                  </div>
                </div>

                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">{pageT('disclaimer.sections.irreversibleRegistration.title', 'Irreversible Registration')}</h3>
                    <p className="landing-disclaimer__section-text">
                      {pageT('disclaimer.sections.irreversibleRegistration.text', 'Wallet addresses cannot be changed after registration. If your wallet is compromised, create a new wallet before registering.')}
                    </p>
                  </div>
                </div>

                <div className="landing-disclaimer__section">
                  <div className="landing-disclaimer__section-icon">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <h3 className="landing-disclaimer__section-title">{pageT('disclaimer.sections.decentralizedParticipation.title', 'Decentralized Participation')}</h3>
                    <p className="landing-disclaimer__section-text">
                      {pageT('disclaimer.sections.decentralizedParticipation.text', 'Blockchain transactions are irreversible once confirmed. Always verify details before signing.')}
                    </p>
                  </div>
                </div>

                <div className="landing-disclaimer__meta">
                  <span>{pageT('disclaimer.internalUserId', 'Internal app user ID')}</span>
                  <code>{internalUserId || pageT('disclaimer.preparing', 'Preparing...')}</code>
                </div>
              </div>

              <div className="landing-disclaimer__actions">
                <button type="button" className="landing-btn landing-btn--secondary" onClick={() => setForceShowDisclaimer(false)}>
                  {pageT('disclaimer.actions.cancel', 'Cancel')}
                </button>
                <button type="button" className="landing-btn landing-btn--primary" onClick={handleAcknowledgeDisclaimer}>
                  {pageT('disclaimer.actions.proceed', 'I Understand & Proceed')}
                </button>
              </div>
            </div>
          </div>
        )}

        {programModal && (
          <div className="landing-program-modal">
            <div className="landing-program-modal__backdrop" onClick={() => setProgramModal(null)} />
            <div className="landing-program-modal__dialog" role="dialog" aria-modal="true">
              <button type="button" className="landing-modal-close" onClick={() => setProgramModal(null)} aria-label={pageT('programModal.closeAriaLabel', 'Close modal')}>
                <X size={18} />
              </button>
              <div
                className={`landing-program-modal__image-wrap ${
                  isProgramModalImageDragging ? 'is-dragging' : ''
                }`}
                role="presentation"
                onPointerDown={handleProgramModalImagePointerDown}
                onPointerMove={handleProgramModalImagePointerMove}
                onPointerUp={handleProgramModalImagePointerUp}
                onPointerCancel={handleProgramModalImagePointerUp}
              >
                <ThemeImage
                  image={programModal.image}
                  alt={pageT(`programs.${programModal.id}.title`, programModal.title)}
                  className="landing-program-modal__image"
                  style={{
                    '--program-modal-image-x': `${programModalImageX}%`,
                  }}
                />

                <div className="landing-program-modal__drag-hint">
                  {pageT('programModal.dragHint', 'Drag left or right to explore image')}
                </div>
              </div>

              <div className="landing-program-modal__content">
                <span className="landing-program-modal__badge">{pageT(`programs.${programModal.id}.status`, programModal.status)}</span>
                <h2 className="landing-program-modal__title">{pageT(`programs.${programModal.id}.title`, programModal.title)}</h2>
                <p className="landing-program-modal__text">{pageT(`programs.${programModal.id}.description`, programModal.description)}</p>
                <div className="landing-program-modal__loader" />
                <p className="landing-program-modal__note">
                  {pageT('programModal.futureRelease', 'This part of the ecosystem is being prepared for a future release.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      </ModalPortal>

      <div className="landing-page">
        <section className="landing-hero">
          <div className="landing-hero__stage">
            <div className="landing-hero__slider" aria-label={pageT('hero.sliderAriaLabel', 'Fin Freedom Network visual showcase')}>
              {HERO_SLIDES.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`landing-hero__slide ${index === activeHeroSlide ? 'is-active' : ''}`}
                  aria-hidden={index !== activeHeroSlide}
                >
                  <ThemeImage
                    image={slide.image}
                    alt={pageT(`heroSlides.${slide.id}.title`, slide.title || 'Fin Freedom Network hero visual')}
                    className="landing-hero__image"
                    priority={index === activeHeroSlide || index === 0}
                  />
                </div>
              ))}

              <div className="landing-hero__control-deck" aria-label={pageT('hero.controlsAriaLabel', 'Hero slider controls')}>
                <button
                  type="button"
                  className="landing-hero__control-btn"
                  onClick={goToPreviousHeroSlide}
                  aria-label={pageT('hero.previousSlideAriaLabel', 'Previous hero slide')}
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  className="landing-hero__control-btn landing-hero__control-btn--play"
                  onClick={() => setIsHeroPaused((current) => !current)}
                  aria-label={isHeroPaused ? pageT('hero.playAriaLabel', 'Play hero slideshow') : pageT('hero.pauseAriaLabel', 'Pause hero slideshow')}
                >
                  {isHeroPaused ? <Play size={18} /> : <Pause size={18} />}
                </button>

                <button
                  type="button"
                  className="landing-hero__control-btn"
                  onClick={goToNextHeroSlide}
                  aria-label={pageT('hero.nextSlideAriaLabel', 'Next hero slide')}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-intro">
          <div className="landing-section__header landing-section__header--center landing-section__header--animated glass-section">
            <div className="landing-section__eyebrow">{pageT('intro.eyebrow', 'Ecosystem Architecture')}</div>
            <h2 className="fly-in">{pageT('intro.title', 'One Network. Multiple Systems. Infinite Possibilities.')}</h2>
            <p>{pageT('intro.text', 'Fin Freedom Network is composed of interconnected programs - each designed to deliver structured participation, real utility, and long-term ecosystem growth.')}</p>
          </div>

          <div className="ecosystem-banner">
            <ThemeImage
              image={ECOSYSTEM_IMAGE}
              alt={pageT('alt.ecosystem', 'Fin Freedom Network ecosystem background')}
              className="ecosystem-banner__image"
            />

            <div className="ecosystem-banner__content">
              <div className="ecosystem-banner__brand">
                <Sparkles size={16} />
                <span>{pageT('ecosystem.brand', 'Fin Freedom Network')}</span>
              </div>

              <h2 className="ecosystem-banner__title ecosystem-animate-title">
                <span>{pageT('ecosystem.titleTop', 'A Complete Ecosystem')}</span>
                <strong>{pageT('ecosystem.titleBottom', 'Built for Freedom')}</strong>
              </h2>

              <p className="ecosystem-banner__text">{pageT('ecosystem.text', 'A structured digital ecosystem designed to empower individuals through participation, education, innovation, and community.')}</p>

              <div className="ecosystem-banner__slogan ecosystem-animate-slogan">{pageT('ecosystem.slogan', 'One Ecosystem. Multiple Paths. Endless Possibilities.')}</div>

              <div className="ecosystem-banner__features">
                {ECOSYSTEM_FEATURES.map((feature, index) => {
                  const Icon = feature.icon

                  return (
                    <div key={`ecosystem-feature-${index}`} className="ecosystem-feature-inline">
                      <Icon className="ecosystem-feature-icon" />

                      <h3>{pageT(`ecosystem.features.${index}.title`, feature.title)}</h3>
                      <p>{pageT(`ecosystem.features.${index}.text`, feature.text)}</p>

                      {index !== ECOSYSTEM_FEATURES.length - 1 && (
                        <div className="ecosystem-divider" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="programs" className="landing-section landing-program-showcase">
          <div className="landing-section__header landing-section__header--center glass-section">
            <div className="landing-section__eyebrow">{pageT('programShowcase.eyebrow', 'Key Components')}</div>
            <h2 className="highlight-green-yellow fly-in">{pageT('programShowcase.title', 'Explore the Fin Freedom ecosystem.')}</h2>
            <p className="center-text">{pageT('programShowcase.text', 'Six connected layers designed for participation, access, education, marketplace utility, token-powered expansion, and long-term digital growth.')}</p>
          </div>

          <div className="program-card-grid-v2">
              {PROGRAMS.map((program, index) => (
                <article
                  key={program.id}
                  className={`program-card-v2 program-card-v2--${program.type} ${
                    program.isLive ? 'program-card-v2--live' : ''
                  }`}
                  style={{ '--card-index': index }}
                >
                  <div className="program-card-v2__media">
                    <ThemeImage
                      image={program.image}
                      alt={pageT(`programs.${program.id}.title`, program.title)}
                      className="program-card-v2__image"
                    />
                  </div>

                  <div className="program-card-v2__body">
                    <div className="program-card-v2__scroll">
                      <div className="program-card-v2__badge-row">
                        <span className={program.isLive ? 'is-live' : ''}>{pageT(`programs.${program.id}.status`, program.status)}</span>
                        <span>{pageT(`programs.${program.id}.eyebrow`, program.eyebrow)}</span>
                      </div>

                      <h3>{pageT(`programs.${program.id}.title`, program.title)}</h3>

                      {program.headline && (
                        <p className="program-card-v2__headline">{pageT(`programs.${program.id}.headline`, program.headline)}</p>
                      )}

                      {program.description && (
                        <p className="program-card-v2__description">{pageT(`programs.${program.id}.description`, program.description)}</p>
                      )}

                      <ProgramDetails program={program} />

                      {program.footerLine && <div className="program-footer-line">{pageT(`programs.${program.id}.footerLine`, program.footerLine)}</div>}

                      <button
                        type="button"
                        className="landing-btn landing-btn--primary"
                        onClick={() => handleProgramSelect(program)}
                      >
                        {program.isLive ? pageT('programShowcase.actions.getStarted', 'Get Started') : pageT('programShowcase.actions.viewPreview', 'View Preview')}
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
        </section>

        <section className="landing-section landing-cta glass-section">
          <div className="live-layer-panel">
            <div className="live-layer-content">
              <span className="landing-section__eyebrow">
                <Sparkles size={14} />
                {pageT('liveLayer.eyebrow', 'Join Our Global Network')}
              </span>

              <h2>{pageT('liveLayer.title', 'Begin Your Journey Through The F-Freedom Program')}</h2>

              <p>{pageT('liveLayer.text', 'Review the program presentation, connect your Web3 wallet on the Polygon network, activate your orbit levels, and progress through the structured ecosystem.')}</p>

              <div className="live-layer-actions">
                <button
                  className="landing-btn landing-btn--primary"
                  onClick={() => {
                    if (!isConnected) connect?.()
                    else onNavigate?.('activation')
                  }}
                >
                  {isConnected ? pageT('liveLayer.actions.joinProgram', 'Join F-Freedom Program') : pageT('liveLayer.actions.connectWallet', 'Connect Wallet')}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="live-layer-metrics">
              <div className="metric-card">
                <h3>{pageT('metrics.currentParticipants', 'Current F-Freedom Participants')}</h3>
                <span className="metric-number">
                  {statsLoading ? '...' : formatNumber(publicStats.totalParticipants)}
                </span>
              </div>

              <div className="metric-card">
                <span>{pageT('metrics.growthLast14Days', 'Growth (Last 14 Days)')}</span>
                <MiniGrowthChart data={growthSeries} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default LandingPage
