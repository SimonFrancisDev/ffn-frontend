import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  ArrowRightLeft,
  Lock,
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
  FaYoutube,
  FaDiscord,
} from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { PiTelegramLogoFill } from 'react-icons/pi'
import './Footer.css'

const FOOTER_LOGO = {
  dark: '/images/official_logo_2.png',
  light: '/images/official_logo_light.png',
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

const PROGRAMS = [
  {
    id: 'f-freedom-program',
    type: 'standard',
    title: 'F-Freedom Program',
    eyebrow: 'Current Program',
    status: 'Live Program',

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
      highlight: 'It’s about structure, participation, and freedom.',
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
    eyebrow: 'Advanced Growth Engine',
    status: 'Future Phase',

    headline: 'Growth Engine. Higher Levels. Greater Freedom.',

    description: `The Freedom-Plus Program is the advanced earning layer of Fin Freedom Network, designed for participants who are ready to scale beyond the F-Freedom Program.

With higher levels, wider earnings, and the Infinity Bonus Pool, it delivers greater rewards, deeper engagement, and sustainable long-term growth.`,

    features: [
      {
        title: '7 Advance Levels',
        text: '7 advance levels with price tripling from one level to the other with massive earning potential.',
        extra: [
          'L1 $50',
          'L2 $150',
          'L3 $450',
          'L4 $1,350',
          'L5 $4,050',
          'L6 $12,150',
          'L7 $36,450',
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
        text: 'Participants have the flexibility to advance at their own pace. Levels 1–7 only.',
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
    eyebrow: 'Membership & Reward Layer',
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
      'A structured digital token system powering participation, progression, and sustainable ecosystem growth.',

    coreToken: {
      name: 'FFC',
      title: 'Fin Freedom Coin',
      description: 'The foundation of the ecosystem.',
      attributes: ['Stability', 'Governance', 'Coordination'],
    },

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
        title: 'Freedom Plus Token',
        source: 'Freedom-Plus Program',
        role: 'Activation Reward',
        description: 'Higher-value tokens earned from advanced participation.',
      },
      {
        name: 'FPTr',
        title: 'Freedom Plus Reactivation Token',
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
      'The official digital marketplace of Fin Freedom Network. Discover premium products, digital assets, and services powered by blockchain trust and community.',

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
      'Electronics',
      'Lifestyle',
      'Fashion',
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
      title: 'Explore. Buy. Earn.',
      subtitle: 'Welcome to Freedom.',
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
      'A structured learning layer designed to equip builders, entrepreneurs, and ecosystem participants with digital skills, leadership capacity, and practical knowledge.',

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

const SOCIAL_LINKS = [
  { id: 'website', label: 'Website', icon: FaGlobe, href: 'https://FinFreedomNetwork.io' },
  { id: 'facebook', label: 'Facebook', icon: FaFacebookF, href: 'https://facebook.com/FinFreedomNetwork' },
  { id: 'instagram', label: 'Instagram', icon: FaInstagram, href: 'https://instagram.com/FinFreedomNetwork.com' },
  { id: 'x', label: 'X (Twitter)', icon: FaXTwitter, href: 'https://x.com/FinFreedomNetwk' },
  { id: 'telegram-channel', label: 'Telegram Channel', icon: PiTelegramLogoFill, href: 'https://t.me/Fin_Freedom_Network' },
  { id: 'telegram-group', label: 'Telegram Group', icon: PiTelegramLogoFill, href: 'https://t.me/FinFreedomNetwork' },
  { id: 'discord', label: 'Discord', icon: FaDiscord, href: 'https://discord.gg/tbFf7zJQ6v' },
  { id: 'youtube', label: 'YouTube', icon: FaYoutube, href: 'http://www.youtube.com/@FinFreedomNetwork' },
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
      ['No Guarantees', 'Fin Freedom Network makes no guarantees regarding profits, income, returns, referrals, or future platform performance. Any examples are educational only.'],
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
      ['No Sale of Data', 'Fin Freedom Network does not sell, rent, trade, or monetize user data.'],
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
      ['Earnings, Participation & System Risks', 'Rewards depend on user participation, network activity, system mechanics, and broader market conditions. No outcome is guaranteed.'],
    ],
  },

  transparency: {
    icon: Scale,
    badge: 'Transparency',
    title: 'Smart Contract Transparency',
    subtitle: 'Last Updated: December 22, 2025',
    sections: [
      ['Smart Contract Execution', 'Core platform actions are executed through smart contracts according to predefined rules.'],
      ['No Manual Payout Control', 'The Platform is designed so payout logic is determined by contract rules, not manual intervention.'],
      ['On-Chain Verification', 'Users are encouraged to verify transactions, wallet interactions, and contract activity on-chain.'],
      ['User Responsibility', 'Users remain responsible for reviewing wallet prompts, approvals, and blockchain confirmations before proceeding.'],
    ],
  },
}

function FooterLogo() {
  return (
    <>
      <img
        src={FOOTER_LOGO.dark}
        alt="Fin Freedom Network"
        className="landing-footer__brand-logo landing-footer__brand-logo--dark"
      />
      <img
        src={FOOTER_LOGO.light}
        alt="Fin Freedom Network"
        className="landing-footer__brand-logo landing-footer__brand-logo--light"
      />
    </>
  )
}

function FooterThemeImage({ image, alt, className = '' }) {
  if (!image) return null

  return (
    <>
      <img
        src={image.dark}
        alt={alt}
        className={`${className} ${className}--dark`}
      />
      <img
        src={image.light}
        alt={alt}
        className={`${className} ${className}--light`}
      />
    </>
  )
}

function LegalModal({ type, onClose }) {
  const content = LEGAL_CONTENT[type]
  if (!content) return null

  const Icon = content.icon || Scale

  return (
    <div className="landing-disclaimer landing-disclaimer--legal">
      <div className="landing-disclaimer__backdrop" />

      <div
        className="landing-disclaimer__dialog landing-disclaimer__dialog--legal"
        role="dialog"
        aria-modal="true"
      >
        <div className="legal-modal-logo-wrap">
          <a href="https://FinFreedomNetwork.io" target="_blank" rel="noreferrer">
            <FooterLogo />
          </a>
        </div>

        <button
          type="button"
          className="landing-disclaimer__close"
          onClick={onClose}
          aria-label="Close legal modal"
        >
          <X size={18} />
        </button>

        <div className="landing-disclaimer__header">
          <div className="landing-disclaimer__badge">
            <Icon size={16} />
            <span>{content.badge}</span>
          </div>

          <h2 className="landing-disclaimer__title">{content.title}</h2>
          <p className="landing-disclaimer__intro">{content.subtitle}</p>
        </div>

        <div className="landing-disclaimer__body legal-content">
          {content.warning ? (
            <p className="legal-content__warning">{content.warning}</p>
          ) : null}

          {content.sections.map(([heading, text]) => (
            <section key={heading} className="landing-disclaimer__section legal-content__section">
              <div className="landing-disclaimer__section-icon">
                <Icon size={18} />
              </div>

              <div>
                <h3 className="landing-disclaimer__section-title">{heading}</h3>
                <p className="landing-disclaimer__section-text">{text}</p>
              </div>
            </section>
          ))}
        </div>

        <div className="landing-disclaimer__actions">
          <button
            type="button"
            className="landing-btn landing-btn--primary"
            onClick={onClose}
          >
            I agree
          </button>
        </div>
      </div>
    </div>
  )
}

function ProgramIcon({ icon: Icon, className = '' }) {
  if (!Icon) return null
  return <Icon className={className} />
}

function ProgramFeatureGrid({ features = [] }) {
  if (!features.length) return null

  return (
    <div className="program-detail-grid">
      {features.map((feature) => {
        const Icon = PROGRAM_FEATURE_ICONS[feature.title] || FaCheckCircle

        return (
          <article key={feature.title} className="program-detail-box">
            <ProgramIcon icon={Icon} className="program-detail-icon" />

            <div>
              <h4>{feature.title}</h4>
              <p>{feature.text}</p>

              {feature.extra?.length ? (
                <div className="program-price-list">
                  {feature.extra.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ProgramValueStrip({ values = [] }) {
  if (!values.length) return null

  return (
    <div className="program-value-strip">
      {values.map((value) => {
        const Icon = PROGRAM_VALUE_ICONS[value] || FaCheckCircle

        return (
          <span key={value}>
            <ProgramIcon icon={Icon} />
            {value}
          </span>
        )
      })}
    </div>
  )
}

function ProgramPhilosophy({ program }) {
  if (!program?.philosophy && !program?.supportingText && !program?.proofPoints?.length) {
    return null
  }

  return (
    <div className="program-philosophy">
      {program.philosophy ? (
        <div className="program-philosophy__statement">
          <strong>{program.philosophy.title}</strong>
          <span>{program.philosophy.highlight}</span>
        </div>
      ) : null}

      {program.supportingText ? <p>{program.supportingText}</p> : null}

      {program.proofPoints?.length ? (
        <div className="program-proof-list">
          {program.proofPoints.map((point) => (
            <span key={point}>
              <FaCheckCircle />
              {point}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProgramModal({ program, onClose }) {
  if (!program) return null

  return (
    <div className="landing-disclaimer landing-program-modal">
      <div className="landing-disclaimer__backdrop" />

      <div
        className="landing-disclaimer__dialog landing-program-modal__dialog"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="landing-disclaimer__close"
          onClick={onClose}
          aria-label="Close program modal"
        >
          <X size={18} />
        </button>

        <div className="landing-program-modal__image-wrap">
          <FooterThemeImage
            image={program.image}
            alt={program.title}
            className="landing-program-modal__image"
          />

          <div className="landing-program-modal__progress-ring" aria-hidden="true" />
        </div>

        <div className="landing-program-modal__content landing-program-modal__content--simple">
            <div className="landing-disclaimer__header landing-program-modal__header">
                {!program.isLive ? (
                <div className="landing-disclaimer__badge">
                    <Sparkles size={16} />
                    <span>{program.status || 'Coming Soon'}</span>
                </div>
                ) : null}

                <h2 className="landing-disclaimer__title">{program.title}</h2>

                <p className="landing-disclaimer__intro">
                {program.headline || program.description || 'Program details coming soon.'}
                </p>
            </div>

            <div className="landing-disclaimer__actions">
                <button
                type="button"
                className="landing-btn landing-btn--primary"
                onClick={onClose}
                >
                Close Preview
                </button>
            </div>
         </div>
      </div>
    </div>
  )
}

function SecurityNoticeModal({ onClose }) {
  return (
    <div className="landing-disclaimer">
      <div className="landing-disclaimer__backdrop" />

      <div className="landing-disclaimer__dialog" role="dialog" aria-modal="true">
        <div className="legal-modal-logo-wrap">
          <a href="https://FinFreedomNetwork.io" target="_blank" rel="noreferrer">
            <FooterLogo />
          </a>
        </div>

        <button
          type="button"
          className="landing-disclaimer__close"
          onClick={onClose}
          aria-label="Close notice"
        >
          <X size={18} />
        </button>

        <div className="landing-disclaimer__header">
          <div className="landing-disclaimer__badge">
            <ShieldAlert size={16} />
            <span>Security & Legal Notice</span>
          </div>

          <h2 className="landing-disclaimer__title">
            Important Notice — Please Read Carefully
          </h2>
        </div>

        <div className="landing-disclaimer__body">
          <div className="landing-disclaimer__section">
            <div className="landing-disclaimer__section-icon">
              <Wallet size={18} />
            </div>
            <div>
              <h3 className="landing-disclaimer__section-title">Wallet Security</h3>
              <p className="landing-disclaimer__section-text">
                You are solely responsible for securing your wallet. Never share your private key or recovery phrase.
                Fin Freedom Network will never request your private key.
              </p>
            </div>
          </div>

          <div className="landing-disclaimer__section">
            <div className="landing-disclaimer__section-icon">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="landing-disclaimer__section-title">Irreversible Registration</h3>
              <p className="landing-disclaimer__section-text">
                Wallet addresses cannot be changed after registration. Blockchain transactions are final and cannot be reversed.
              </p>
            </div>
          </div>

          <div className="landing-disclaimer__section">
            <div className="landing-disclaimer__section-icon">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h3 className="landing-disclaimer__section-title">Decentralized Participation</h3>
              <p className="landing-disclaimer__section-text">
                Participation is controlled by smart contract rules, not manual admin decisions. Results depend on network activity.
              </p>
            </div>
          </div>
        </div>

        <div className="landing-disclaimer__actions">
          <button
            type="button"
            className="landing-btn landing-btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="landing-btn landing-btn--primary"
            onClick={onClose}
          >
            I Understand & Proceed
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Footer({ onNavigate }) {
  const [programModal, setProgramModal] = useState(null)
  const [legalModal, setLegalModal] = useState(null)
  const [forceShowDisclaimer, setForceShowDisclaimer] = useState(false)

  const hasOpenModal = Boolean(programModal || legalModal || forceShowDisclaimer)

  useEffect(() => {
    if (!hasOpenModal) return

    const originalOverflow = document.body.style.overflow
    const originalTouchAction = document.body.style.touchAction

    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.touchAction = originalTouchAction
    }
  }, [hasOpenModal])

  const handleProgramClick = (program) => {
    if (program.isLive) {
      onNavigate?.(program.route)
      return
    }

    setProgramModal(program)
  }

  return (
    <footer className="landing-footer glass-section">
      <div className="landing-footer__inner">
        <div className="landing-footer__brand">
          <a
            href="https://FinFreedomNetwork.io"
            target="_blank"
            rel="noreferrer"
            className="landing-footer__brand-logo-wrap"
          >
            <FooterLogo />
          </a>
        </div>

        <div className="landing-footer__columns">
          <div className="landing-footer__column">
            <h3>Programs</h3>

            {PROGRAMS.map((program) => (
              <button
                key={program.id}
                type="button"
                onClick={() => handleProgramClick(program)}
              >
                {program.title}
              </button>
            ))}
          </div>

          <div className="landing-footer__column">
            <h3>Legal</h3>

            <button type="button" onClick={() => setLegalModal('terms')}>
              Terms & Conditions
            </button>

            <button type="button" onClick={() => setLegalModal('privacy')}>
              Privacy Policy
            </button>

            <button type="button" onClick={() => setLegalModal('risk')}>
              Risk Disclaimer
            </button>

            <button type="button" onClick={() => setLegalModal('transparency')}>
              Smart Contract Transparency
            </button>
          </div>

          <div className="landing-footer__column">
            <h3>Community</h3>

            <div className="landing-footer__socials">
              {SOCIAL_LINKS.map((item) => {
                const Icon = item.icon

                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                  >
                    <Icon />
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        <div className="landing-footer__bottom">
          <span>
            © {new Date().getFullYear()} Fin Freedom Network. All rights reserved.
          </span>

          <button type="button" onClick={() => setForceShowDisclaimer(true)}>
            View security notice
          </button>
        </div>
      </div>

      {hasOpenModal &&
        createPortal(
          <>
            {legalModal ? (
              <LegalModal
                type={legalModal}
                onClose={() => setLegalModal(null)}
              />
            ) : null}

            {programModal ? (
              <ProgramModal
                program={programModal}
                onClose={() => setProgramModal(null)}
              />
            ) : null}

            {forceShowDisclaimer ? (
              <SecurityNoticeModal
                onClose={() => setForceShowDisclaimer(false)}
              />
            ) : null}
          </>,
          document.body
        )}
    </footer>
  )
}


















// import { useEffect, useState } from 'react'
// import { createPortal } from 'react-dom'
// import {
//   ArrowRight,
//   ArrowRightLeft,
//   Lock,
//   Scale,
//   ShieldAlert,
//   ShieldCheck,
//   Sparkles,
//   TriangleAlert,
//   Wallet,
//   X,
// } from 'lucide-react'
// import {
//   FaFacebookF,
//   FaInstagram,
//   FaLayerGroup,
//   FaRecycle,
//   FaCoins,
//   FaCrown,
//   FaGem,
//   FaChartLine,
//   FaUsers,
//   FaStore,
//   FaExchangeAlt,
//   FaGraduationCap,
//   FaBriefcase,
//   FaCertificate,
//   FaShieldAlt,
//   FaGlobe,
//   FaStar,
//   FaHandPointer,
//   FaTrophy,
//   FaBalanceScale,
//   FaSyncAlt,
//   FaBolt,
//   FaCube,
//   FaLeaf,
//   FaShoppingBag,
//   FaHeadphones,
//   FaClock,
//   FaTicketAlt,
//   FaGamepad,
//   FaCheckCircle,
// } from 'react-icons/fa'
// import { FaXTwitter } from 'react-icons/fa6'
// import { PiTelegramLogoFill } from 'react-icons/pi'
// import './Footer.css'

// const FOOTER_LOGO = {
//   dark: '/images/official_logo_2.png',
//   light: '/images/official_logo_light.png',
// }

// const PROGRAM_FEATURE_ICONS = {
//   '10 Progressive Levels': FaChartLine,
//   'Triple-P Orbit Engine': FaLayerGroup,
//   'Smart Contract Powered': FaShieldAlt,
//   'Automatic Recycling': FaRecycle,
//   'Token Rewards': FaCoins,

//   '7 Advance Levels': FaChartLine,
//   'Multiple-P Orbit Engine': FaLayerGroup,
//   'Manual Upgrade': FaHandPointer,
//   'Accelerated NFT Path': FaStar,

//   Shop: FaShoppingBag,
//   Trust: FaShieldAlt,
//   Connect: FaGlobe,
//   Grow: FaChartLine,
// }

// const PROGRAM_VALUE_ICONS = {
//   'Participation-Based Qualification': FaUsers,
//   'Token-Backed Membership': FaShieldAlt,
//   'Single Highest-Tier Reward Logic': FaTrophy,
//   'Fair and Sustainable Distribution': FaBalanceScale,
//   'Deflationary Alignment': FaLeaf,

//   'Participation-Based Rewards': FaUsers,
//   'Activity-Driven Value': FaBolt,
//   'Structured Token Generation': FaCube,
//   'Ecosystem Utility': FaLayerGroup,

//   'World-Class Digital Education': FaGlobe,
//   'Business & Leadership Development': FaBriefcase,
//   'NFT-Backed Certifications': FaCertificate,
//   'Structured Learning Paths': FaLayerGroup,
//   'Practical, Job-Ready Education': FaBriefcase,
//   'On-Chain Credential Verification': FaShieldAlt,
// }

// const MARKETPLACE_CATEGORY_ICONS = {
//   Electronics: FaHeadphones,
//   Lifestyle: FaClock,
//   Fashion: FaShoppingBag,
//   Events: FaTicketAlt,
//   'Digital Assets': FaGem,
//   'Online Courses': FaGraduationCap,
//   Gaming: FaGamepad,
// }

// const TOKEN_ICONS = {
//   FGT: FaCoins,
//   FGTr: FaSyncAlt,
//   FPT: FaChartLine,
//   FPTr: FaRecycle,
// }

// const TIER_ICONS = {
//   Advance: FaCrown,
//   Intermediate: FaStar,
//   Foundation: FaGem,
// }

// const PROGRAMS = [
//   {
//     id: 'f-freedom-program',
//     type: 'standard',
//     title: 'F-Freedom Program',
//     eyebrow: 'Current Program',
//     status: 'Live Program',

//     headline: 'The Core Participation Engine of Fin Freedom Network.',

//     description: `The F-Freedom Program is a structured, level-based earning system built on smart contracts and designed to reward participation, completion, and long-term engagement.

// Powered by the Triple-P Orbit Engine, it ensures predictable earnings, controlled recycling, and sustainable growth for every participant.`,

//     features: [
//       {
//         title: '10 Progressive Levels',
//         text: 'Prices double per level from $10 to $5,120.',
//       },
//       {
//         title: 'Triple-P Orbit Engine',
//         text: 'Three powerful orbit structures: P4, P12, and P39.',
//       },
//       {
//         title: 'Smart Contract Powered',
//         text: 'Transparent, secure, and automated on-chain execution.',
//       },
//       {
//         title: 'Automatic Recycling',
//         text: 'Ensures continuous participation and system sustainability.',
//       },
//       {
//         title: 'Token Rewards',
//         text: 'Earn FGT on activation and FGTr on recycling (2:1 ratio).',
//       },
//     ],

//     philosophy: {
//       title: 'F-Freedom is not about speculation.',
//       highlight: 'It’s about structure, participation, and freedom.',
//     },

//     supportingText:
//       'It is the gateway to the Fin Freedom ecosystem — designed to create real opportunities through clarity, fairness, and a system that works for everyone.',

//     proofPoints: ['No Admin Control', 'Deterministic Payouts', 'Transparent & Verifiable'],

//     footerLine: 'One system. One mission. Together we build freedom.',

//     image: {
//       dark: '/images/landing/cards/f-freedom-card-dark.png',
//       light: '/images/landing/cards/f-freedom-card-light.png',
//       mobileDark: '/images/landing/cards/f-freedom-card-mobile-dark.png',
//       mobileLight: '/images/landing/cards/f-freedom-card-mobile-light.png',
//     },

//     isLive: true,
//     route: 'activation',
//   },

//   {
//     id: 'freedom-plus-program',
//     type: 'advanced',
//     title: 'Freedom-Plus Program',
//     eyebrow: 'Advanced Growth Engine',
//     status: 'Future Phase',

//     headline: 'Growth Engine. Higher Levels. Greater Freedom.',

//     description: `The Freedom-Plus Program is the advanced earning layer of Fin Freedom Network, designed for participants who are ready to scale beyond the F-Freedom Program.

// With higher levels, wider earnings, and the Infinity Bonus Pool, it delivers greater rewards, deeper engagement, and sustainable long-term growth.`,

//     features: [
//       {
//         title: '7 Advance Levels',
//         text: '7 advance levels with price tripling from one level to the other with massive earning potential.',
//         extra: [
//           'L1 $50',
//           'L2 $150',
//           'L3 $450',
//           'L4 $1,350',
//           'L5 $4,050',
//           'L6 $12,150',
//           'L7 $36,450',
//         ],
//       },
//       {
//         title: 'Multiple-P Orbit Engine',
//         text: 'Built on powerful P3, P4, P6, P12, P14, and P39 orbits.',
//       },
//       {
//         title: 'Automatic Recycling',
//         text: 'Ensures continuous participation and system sustainability.',
//       },
//       {
//         title: 'Manual Upgrade',
//         text: 'Participants have the flexibility to advance at their own pace. Levels 1–7 only.',
//       },
//       {
//         title: 'Accelerated NFT Path',
//         text: 'Generate more FPT tokens at every level activation and recycle, unlocking faster qualification for Freedom NFT membership tiers.',
//       },
//       {
//         title: 'Token Rewards',
//         text: 'Earn FPT on activation and FPTr on recycling (2:1 ratio).',
//       },
//     ],

//     philosophy: {
//       title: 'Built for serious growth.',
//       highlight: 'Backed by structure. Driven by participation.',
//     },

//     supportingText:
//       'Freedom-Plus is where commitment meets opportunity and participation drives real, sustainable rewards.',

//     proofPoints: [
//       'Deterministic payouts',
//       'Automatic recycling',
//       'Smart contract powered',
//       'No admin interference',
//     ],

//     footerLine: 'One system. One mission. Together we build freedom.',

//     image: {
//       dark: '/images/landing/cards/freedom-plus-card-dark.png',
//       light: '/images/landing/cards/freedom-plus-card-light.png',
//       mobileDark: '/images/landing/cards/freedom-plus-card-mobile-dark.png',
//       mobileLight: '/images/landing/cards/freedom-plus-card-mobile-light.png',
//     },

//     isLive: false,
//     route: 'freedom-plus',
//   },

//   {
//     id: 'freedom-nft-program',
//     type: 'tiered',
//     title: 'Freedom NFT Program',
//     eyebrow: 'Membership & Reward Layer',
//     status: 'Coming Soon',

//     headline:
//       'A structured membership and reward system built on participation, progression, and sustainability.',

//     tiers: [
//       {
//         name: 'Advance',
//         level: 'Highest-Level Status',
//         rewards: 'Premium Rewards',
//         requirement: '62,000 FGT and/or FPT',
//         poolShare: '20%',
//         color: 'purple',
//       },
//       {
//         name: 'Intermediate',
//         level: 'Mid-Level Status',
//         rewards: 'Enhanced Rewards',
//         requirement: '18,700 FGT and/or FPT',
//         poolShare: '30%',
//         color: 'green',
//       },
//       {
//         name: 'Foundation',
//         level: 'Entry-Level Status',
//         rewards: 'Basic Rewards',
//         requirement: '5,700 FGT and/or FPT',
//         poolShare: '50%',
//         color: 'blue',
//       },
//     ],

//     values: [
//       'Participation-Based Qualification',
//       'Token-Backed Membership',
//       'Single Highest-Tier Reward Logic',
//       'Fair and Sustainable Distribution',
//       'Deflationary Alignment',
//     ],

//     image: {
//       dark: '/images/landing/cards/nft-card-dark.png',
//       light: '/images/landing/cards/nft-card-light.png',
//       mobileDark: '/images/landing/cards/nft-card-mobile-dark.png',
//       mobileLight: '/images/landing/cards/nft-card-mobile-light.png',
//     },

//     isLive: false,
//     route: 'nft',
//   },

//   {
//     id: 'fin-freedom-coin',
//     type: 'token',
//     title: 'Fin Freedom Coin',
//     eyebrow: 'Token Economy Layer',
//     status: 'Core System',

//     headline: 'The Engine of Value, Participation, and Reward.',

//     description:
//       'A structured digital token system powering participation, progression, and sustainable ecosystem growth.',

//     coreToken: {
//       name: 'FFC',
//       title: 'Fin Freedom Coin',
//       description: 'The foundation of the ecosystem.',
//       attributes: ['Stability', 'Governance', 'Coordination'],
//     },

//     tokens: [
//       {
//         name: 'FGT',
//         title: 'Freedom Game Token',
//         source: 'F-Freedom Program',
//         role: 'Activation Reward',
//         description: 'Earned when participants activate levels.',
//       },
//       {
//         name: 'FGTr',
//         title: 'Freedom Game Reactivation Token',
//         source: 'F-Freedom Program',
//         role: 'Recycling Reward',
//         description: 'Issued during level reactivation cycles.',
//       },
//       {
//         name: 'FPT',
//         title: 'Freedom Plus Token',
//         source: 'Freedom-Plus Program',
//         role: 'Activation Reward',
//         description: 'Higher-value tokens earned from advanced participation.',
//       },
//       {
//         name: 'FPTr',
//         title: 'Freedom Plus Reactivation Token',
//         source: 'Freedom-Plus Program',
//         role: 'Recycling Reward',
//         description: 'Generated during advanced reactivation cycles.',
//       },
//     ],

//     flow: [
//       'F-Freedom Program → FGT / FGTr',
//       'Freedom-Plus Program → FPT / FPTr',
//       'Used for NFT Qualification & Ecosystem Utility',
//     ],

//     values: [
//       'Participation-Based Rewards',
//       'Activity-Driven Value',
//       'Structured Token Generation',
//       'Deflationary Alignment',
//       'Ecosystem Utility',
//     ],

//     footerLine: 'Built on structure. Powered by participation. Driven by value.',

//     image: {
//       dark: '/images/landing/cards/coin-card-dark.png',
//       light: '/images/landing/cards/coin-card-light.png',
//       mobileDark: '/images/landing/cards/coin-card-mobile-dark.png',
//       mobileLight: '/images/landing/cards/coin-card-mobile-light.png',
//     },

//     isLive: false,
//     route: 'token-economy',
//   },

//   {
//     id: 'fin-freedom-marketplace',
//     type: 'marketplace',
//     title: 'FFN Marketplace',
//     eyebrow: 'Commerce Layer',
//     status: 'Coming Soon',

//     headline: 'Shop. Trust. Connect. Grow.',

//     description:
//       'The official digital marketplace of Fin Freedom Network. Discover premium products, digital assets, and services powered by blockchain trust and community.',

//     features: [
//       {
//         title: 'Shop',
//         text: 'Premium products and digital assets.',
//       },
//       {
//         title: 'Trust',
//         text: 'Secure, transparent, and reliable.',
//       },
//       {
//         title: 'Connect',
//         text: 'Global community and real value.',
//       },
//       {
//         title: 'Grow',
//         text: 'Empowering your freedom journey.',
//       },
//     ],

//     categories: [
//       'Electronics',
//       'Lifestyle',
//       'Fashion',
//       'Events',
//       'Digital Assets',
//       'Online Courses',
//       'Gaming',
//     ],

//     trust: [
//       {
//         title: 'Blockchain Secured',
//         description: 'Every transaction is protected and verifiable.',
//       },
//       {
//         title: 'FFN Token Powered',
//         description: 'Pay, earn, and grow using FFN ecosystem tokens.',
//       },
//       {
//         title: 'Community Driven',
//         description: 'Built for the community, by the community.',
//       },
//       {
//         title: 'Quality Assured',
//         description: 'Curated products and services you can trust.',
//       },
//     ],

//     cta: {
//       title: 'Explore. Buy. Earn.',
//       subtitle: 'Welcome to Freedom.',
//     },

//     footerLine: 'One Network. One Ecosystem. Endless Possibilities.',

//     image: {
//       dark: '/images/landing/cards/marketplace-card-dark.png',
//       light: '/images/landing/cards/marketplace-card-light.png',
//       mobileDark: '/images/landing/cards/marketplace-card-mobile-dark.png',
//       mobileLight: '/images/landing/cards/marketplace-card-mobile-light.png',
//     },

//     isLive: false,
//     route: 'marketplace',
//   },

//   {
//     id: 'fin-freedom-institute',
//     type: 'academy',
//     title: 'Fin Freedom Institute',
//     eyebrow: 'Education & Leadership Layer',
//     status: 'Coming Soon',

//     headline: 'One Institute. Two Academies. One Mission.',

//     description:
//       'A structured learning layer designed to equip builders, entrepreneurs, and ecosystem participants with digital skills, leadership capacity, and practical knowledge.',

//     academies: [
//       {
//         title: 'Freedom Digital Academy',
//         subtitle: 'Technology & Digital Skills',
//         topics: [
//           'Blockchain Technology',
//           'Web3 Development',
//           'Smart Contracts & DeFi',
//           'DAO Architecture',
//           'Cybersecurity & Protocol Design',
//         ],
//         outcome: 'Globally competitive digital professionals and builders.',
//       },
//       {
//         title: 'Freedom Business & Leadership Academy',
//         subtitle: 'Entrepreneurship, Leadership & Growth',
//         topics: [
//           'Digital Entrepreneurship',
//           'Online Marketing & Growth',
//           'Team Building & Community Leadership',
//           'Ethical Leadership & Governance',
//           'Strategic Decision-Making',
//         ],
//         outcome: 'Ethical entrepreneurs, leaders, and ecosystem builders.',
//       },
//     ],

//     values: [
//       'World-Class Digital Education',
//       'Business & Leadership Development',
//       'NFT-Backed Certifications',
//       'Structured Learning Paths',
//       'Practical, Job-Ready Education',
//       'On-Chain Credential Verification',
//     ],

//     footerLine: 'Educate. Empower. Elevate.',

//     image: {
//       dark: '/images/landing/cards/institute-card-dark.png',
//       light: '/images/landing/cards/institute-card-light.png',
//       mobileDark: '/images/landing/cards/institute-card-mobile-dark.png',
//       mobileLight: '/images/landing/cards/institute-card-mobile-light.png',
//     },

//     isLive: false,
//     route: 'institute',
//   },
// ]

// const SOCIAL_LINKS = [
//   { id: 'telegram', label: 'Telegram', icon: PiTelegramLogoFill, href: 'https://t.me/' },
//   { id: 'instagram', label: 'Instagram', icon: FaInstagram, href: 'https://instagram.com/' },
//   { id: 'facebook', label: 'Facebook', icon: FaFacebookF, href: 'https://facebook.com/' },
//   { id: 'x', label: 'X', icon: FaXTwitter, href: 'https://x.com/' },
// ]

// const LEGAL_CONTENT = {
//   terms: {
//     icon: Scale,
//     badge: 'Legal',
//     title: 'Terms & Conditions',
//     subtitle: 'Last Updated: December 22, 2025',
//     sections: [
//       ['Acceptance of Terms', 'By accessing, registering, or using any part of the Fin Freedom Network platform, you confirm that you have read, understood, and agreed to be bound by these Terms & Conditions. If you do not agree, you must not use the Platform.'],
//       ['Nature of the Platform', 'Fin Freedom Network is a decentralized blockchain-based platform that operates through smart contracts. The Platform does not hold user funds, control user wallets, guarantee earnings, or provide financial, investment, legal, or tax advice.'],
//       ['Eligibility', 'You confirm that you are at least 18 years old or the legal age in your jurisdiction, have legal capacity, and that participation is lawful where you reside.'],
//       ['Wallet Responsibility', 'Users must connect a self-custodial wallet. Wallet addresses cannot be changed after registration. Lost private keys or recovery phrases cannot be recovered by Fin Freedom Network.'],
//       ['No Guarantees', 'Fin Freedom Network makes no guarantees regarding profits, income, returns, referrals, or future platform performance. Any examples are educational only.'],
//     ],
//   },

//   privacy: {
//     icon: ShieldCheck,
//     badge: 'Privacy',
//     title: 'Privacy Policy',
//     subtitle: 'Last Updated: December 22, 2025',
//     sections: [
//       ['Data Collection Philosophy', 'Fin Freedom Network is designed to collect minimal data and does not require names, emails, phone numbers, government identification, or centralized user accounts.'],
//       ['Information Collected', 'The Platform may process public wallet addresses, on-chain transaction data, referral relationships recorded on-chain, and basic website usage data where applicable.'],
//       ['Blockchain Transparency', 'Blockchain data is public, permanent, and accessible to anyone. Fin Freedom Network cannot alter, hide, or delete blockchain data.'],
//       ['No Sale of Data', 'Fin Freedom Network does not sell, rent, trade, or monetize user data.'],
//     ],
//   },

//   risk: {
//     icon: TriangleAlert,
//     badge: 'Risk Warning',
//     title: 'Risk Disclaimer',
//     subtitle: 'Last Updated: December 22, 2025',
//     warning: 'Participation in Fin Freedom Network involves significant risks. Only participate if you fully understand and accept these risks.',
//     sections: [
//       ['Blockchain & Smart Contract Risks', 'Risks include smart contract vulnerabilities, coding errors, transaction failures, chain reorganizations, exploits, and infrastructure attacks.'],
//       ['Token & Digital Asset Risks', 'Tokens may fluctuate in value, have low or no liquidity, lose value entirely, or be affected by technical, governance, legal, or market events.'],
//       ['No Financial, Legal, or Tax Advice', 'Nothing on the Platform is investment, financial, legal, or tax advice. You are responsible for independent professional advice.'],
//       ['Earnings, Participation & System Risks', 'Rewards depend on user participation, network activity, system mechanics, and broader market conditions. No outcome is guaranteed.'],
//     ],
//   },

//   transparency: {
//     icon: Scale,
//     badge: 'Transparency',
//     title: 'Smart Contract Transparency',
//     subtitle: 'Last Updated: December 22, 2025',
//     sections: [
//       ['Smart Contract Execution', 'Core platform actions are executed through smart contracts according to predefined rules.'],
//       ['No Manual Payout Control', 'The Platform is designed so payout logic is determined by contract rules, not manual intervention.'],
//       ['On-Chain Verification', 'Users are encouraged to verify transactions, wallet interactions, and contract activity on-chain.'],
//       ['User Responsibility', 'Users remain responsible for reviewing wallet prompts, approvals, and blockchain confirmations before proceeding.'],
//     ],
//   },
// }

// function FooterLogo() {
//   return (
//     <>
//       <img
//         src={FOOTER_LOGO.dark}
//         alt="Fin Freedom Network"
//         className="landing-footer__brand-logo landing-footer__brand-logo--dark"
//       />
//       <img
//         src={FOOTER_LOGO.light}
//         alt="Fin Freedom Network"
//         className="landing-footer__brand-logo landing-footer__brand-logo--light"
//       />
//     </>
//   )
// }

// function FooterThemeImage({ image, alt, className = '' }) {
//   if (!image) return null

//   return (
//     <>
//       <img
//         src={image.dark}
//         alt={alt}
//         className={`${className} ${className}--dark`}
//       />
//       <img
//         src={image.light}
//         alt={alt}
//         className={`${className} ${className}--light`}
//       />
//     </>
//   )
// }

// function LegalModal({ type, onClose }) {
//   const content = LEGAL_CONTENT[type]
//   if (!content) return null

//   const Icon = content.icon || Scale

//   return (
//     <div className="landing-disclaimer landing-disclaimer--legal">
//       <div className="landing-disclaimer__backdrop" />

//       <div
//         className="landing-disclaimer__dialog landing-disclaimer__dialog--legal"
//         role="dialog"
//         aria-modal="true"
//       >
//         <div className="legal-modal-logo-wrap">
//           <FooterLogo />
//         </div>

//         <button
//           type="button"
//           className="landing-disclaimer__close"
//           onClick={onClose}
//           aria-label="Close legal modal"
//         >
//           <X size={18} />
//         </button>

//         <div className="landing-disclaimer__header">
//           <div className="landing-disclaimer__badge">
//             <Icon size={16} />
//             <span>{content.badge}</span>
//           </div>

//           <h2 className="landing-disclaimer__title">{content.title}</h2>
//           <p className="landing-disclaimer__intro">{content.subtitle}</p>
//         </div>

//         <div className="landing-disclaimer__body legal-content">
//           {content.warning ? (
//             <p className="legal-content__warning">{content.warning}</p>
//           ) : null}

//           {content.sections.map(([heading, text]) => (
//             <section key={heading} className="landing-disclaimer__section legal-content__section">
//               <div className="landing-disclaimer__section-icon">
//                 <Icon size={18} />
//               </div>

//               <div>
//                 <h3 className="landing-disclaimer__section-title">{heading}</h3>
//                 <p className="landing-disclaimer__section-text">{text}</p>
//               </div>
//             </section>
//           ))}
//         </div>

//         <div className="landing-disclaimer__actions">
//           <button
//             type="button"
//             className="landing-btn landing-btn--primary"
//             onClick={onClose}
//           >
//             I agree
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }

// function ProgramIcon({ icon: Icon, className = '' }) {
//   if (!Icon) return null
//   return <Icon className={className} />
// }

// function ProgramFeatureGrid({ features = [] }) {
//   if (!features.length) return null

//   return (
//     <div className="program-detail-grid">
//       {features.map((feature) => {
//         const Icon = PROGRAM_FEATURE_ICONS[feature.title] || FaCheckCircle

//         return (
//           <article key={feature.title} className="program-detail-box">
//             <ProgramIcon icon={Icon} className="program-detail-icon" />

//             <div>
//               <h4>{feature.title}</h4>
//               <p>{feature.text}</p>

//               {feature.extra?.length ? (
//                 <div className="program-price-list">
//                   {feature.extra.map((item) => (
//                     <span key={item}>{item}</span>
//                   ))}
//                 </div>
//               ) : null}
//             </div>
//           </article>
//         )
//       })}
//     </div>
//   )
// }

// function ProgramValueStrip({ values = [] }) {
//   if (!values.length) return null

//   return (
//     <div className="program-value-strip">
//       {values.map((value) => {
//         const Icon = PROGRAM_VALUE_ICONS[value] || FaCheckCircle

//         return (
//           <span key={value}>
//             <ProgramIcon icon={Icon} />
//             {value}
//           </span>
//         )
//       })}
//     </div>
//   )
// }

// function ProgramPhilosophy({ program }) {
//   if (!program?.philosophy && !program?.supportingText && !program?.proofPoints?.length) {
//     return null
//   }

//   return (
//     <div className="program-philosophy">
//       {program.philosophy ? (
//         <div className="program-philosophy__statement">
//           <strong>{program.philosophy.title}</strong>
//           <span>{program.philosophy.highlight}</span>
//         </div>
//       ) : null}

//       {program.supportingText ? <p>{program.supportingText}</p> : null}

//       {program.proofPoints?.length ? (
//         <div className="program-proof-list">
//           {program.proofPoints.map((point) => (
//             <span key={point}>
//               <FaCheckCircle />
//               {point}
//             </span>
//           ))}
//         </div>
//       ) : null}
//     </div>
//   )
// }

// function ProgramModal({ program, onClose }) {
//   if (!program) return null

//   return (
//     <div className="landing-disclaimer landing-program-modal">
//       <div className="landing-disclaimer__backdrop" />

//       <div
//         className="landing-disclaimer__dialog landing-program-modal__dialog"
//         role="dialog"
//         aria-modal="true"
//       >
//         <button
//           type="button"
//           className="landing-disclaimer__close"
//           onClick={onClose}
//           aria-label="Close program modal"
//         >
//           <X size={18} />
//         </button>

//         <div className="landing-program-modal__image-wrap">
//           <FooterThemeImage
//             image={program.image}
//             alt={program.title}
//             className="landing-program-modal__image"
//           />

//           <div className="landing-program-modal__progress-ring" aria-hidden="true" />
//         </div>

//         <div className="landing-program-modal__content landing-program-modal__content--simple">
//             <div className="landing-disclaimer__header landing-program-modal__header">
//                 {!program.isLive ? (
//                 <div className="landing-disclaimer__badge">
//                     <Sparkles size={16} />
//                     <span>{program.status || 'Coming Soon'}</span>
//                 </div>
//                 ) : null}

//                 <h2 className="landing-disclaimer__title">{program.title}</h2>

//                 <p className="landing-disclaimer__intro">
//                 {program.headline || program.description || 'Program details coming soon.'}
//                 </p>
//             </div>

//             <div className="landing-disclaimer__actions">
//                 <button
//                 type="button"
//                 className="landing-btn landing-btn--primary"
//                 onClick={onClose}
//                 >
//                 Close Preview
//                 </button>
//             </div>
//          </div>
//       </div>
//     </div>
//   )
// }

// function SecurityNoticeModal({ onClose }) {
//   return (
//     <div className="landing-disclaimer">
//       <div className="landing-disclaimer__backdrop" />

//       <div className="landing-disclaimer__dialog" role="dialog" aria-modal="true">
//         <div className="legal-modal-logo-wrap">
//           <FooterLogo />
//         </div>

//         <button
//           type="button"
//           className="landing-disclaimer__close"
//           onClick={onClose}
//           aria-label="Close notice"
//         >
//           <X size={18} />
//         </button>

//         <div className="landing-disclaimer__header">
//           <div className="landing-disclaimer__badge">
//             <ShieldAlert size={16} />
//             <span>Security & Legal Notice</span>
//           </div>

//           <h2 className="landing-disclaimer__title">
//             Important Notice — Please Read Carefully
//           </h2>
//         </div>

//         <div className="landing-disclaimer__body">
//           <div className="landing-disclaimer__section">
//             <div className="landing-disclaimer__section-icon">
//               <Wallet size={18} />
//             </div>
//             <div>
//               <h3 className="landing-disclaimer__section-title">Wallet Security</h3>
//               <p className="landing-disclaimer__section-text">
//                 You are solely responsible for securing your wallet. Never share your private key or recovery phrase.
//                 Fin Freedom Network will never request your private key.
//               </p>
//             </div>
//           </div>

//           <div className="landing-disclaimer__section">
//             <div className="landing-disclaimer__section-icon">
//               <Lock size={18} />
//             </div>
//             <div>
//               <h3 className="landing-disclaimer__section-title">Irreversible Registration</h3>
//               <p className="landing-disclaimer__section-text">
//                 Wallet addresses cannot be changed after registration. Blockchain transactions are final and cannot be reversed.
//               </p>
//             </div>
//           </div>

//           <div className="landing-disclaimer__section">
//             <div className="landing-disclaimer__section-icon">
//               <ArrowRightLeft size={18} />
//             </div>
//             <div>
//               <h3 className="landing-disclaimer__section-title">Decentralized Participation</h3>
//               <p className="landing-disclaimer__section-text">
//                 Participation is controlled by smart contract rules, not manual admin decisions. Results depend on network activity.
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="landing-disclaimer__actions">
//           <button
//             type="button"
//             className="landing-btn landing-btn--secondary"
//             onClick={onClose}
//           >
//             Cancel
//           </button>

//           <button
//             type="button"
//             className="landing-btn landing-btn--primary"
//             onClick={onClose}
//           >
//             I Understand & Proceed
//             <ArrowRight size={16} />
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default function Footer({ onNavigate }) {
//   const [programModal, setProgramModal] = useState(null)
//   const [legalModal, setLegalModal] = useState(null)
//   const [forceShowDisclaimer, setForceShowDisclaimer] = useState(false)

//   const hasOpenModal = Boolean(programModal || legalModal || forceShowDisclaimer)

//   useEffect(() => {
//     if (!hasOpenModal) return

//     const originalOverflow = document.body.style.overflow
//     const originalTouchAction = document.body.style.touchAction

//     document.body.style.overflow = 'hidden'
//     document.body.style.touchAction = 'none'

//     return () => {
//       document.body.style.overflow = originalOverflow
//       document.body.style.touchAction = originalTouchAction
//     }
//   }, [hasOpenModal])

//   const handleProgramClick = (program) => {
//     if (program.isLive) {
//       onNavigate?.(program.route)
//       return
//     }

//     setProgramModal(program)
//   }

//   return (
//     <footer className="landing-footer glass-section">
//       <div className="landing-footer__inner">
//         <div className="landing-footer__brand">
//           <div className="landing-footer__brand-logo-wrap">
//             <FooterLogo />
//           </div>
//         </div>

//         <div className="landing-footer__columns">
//           <div className="landing-footer__column">
//             <h3>Programs</h3>

//             {PROGRAMS.map((program) => (
//               <button
//                 key={program.id}
//                 type="button"
//                 onClick={() => handleProgramClick(program)}
//               >
//                 {program.title}
//               </button>
//             ))}
//           </div>

//           <div className="landing-footer__column">
//             <h3>Legal</h3>

//             <button type="button" onClick={() => setLegalModal('terms')}>
//               Terms & Conditions
//             </button>

//             <button type="button" onClick={() => setLegalModal('privacy')}>
//               Privacy Policy
//             </button>

//             <button type="button" onClick={() => setLegalModal('risk')}>
//               Risk Disclaimer
//             </button>

//             <button type="button" onClick={() => setLegalModal('transparency')}>
//               Smart Contract Transparency
//             </button>
//           </div>

//           <div className="landing-footer__column">
//             <h3>Community</h3>

//             <div className="landing-footer__socials">
//               {SOCIAL_LINKS.map((item) => {
//                 const Icon = item.icon

//                 return (
//                   <a
//                     key={item.id}
//                     href={item.href}
//                     target="_blank"
//                     rel="noreferrer"
//                     aria-label={item.label}
//                   >
//                     <Icon />
//                   </a>
//                 )
//               })}
//             </div>
//           </div>
//         </div>

//         <div className="landing-footer__bottom">
//           <span>
//             © {new Date().getFullYear()} Fin Freedom Network. All rights reserved.
//           </span>

//           <button type="button" onClick={() => setForceShowDisclaimer(true)}>
//             View security notice
//           </button>
//         </div>
//       </div>

//       {hasOpenModal &&
//         createPortal(
//           <>
//             {legalModal ? (
//               <LegalModal
//                 type={legalModal}
//                 onClose={() => setLegalModal(null)}
//               />
//             ) : null}

//             {programModal ? (
//               <ProgramModal
//                 program={programModal}
//                 onClose={() => setProgramModal(null)}
//               />
//             ) : null}

//             {forceShowDisclaimer ? (
//               <SecurityNoticeModal
//                 onClose={() => setForceShowDisclaimer(false)}
//               />
//             ) : null}
//           </>,
//           document.body
//         )}
//     </footer>
//   )
// }