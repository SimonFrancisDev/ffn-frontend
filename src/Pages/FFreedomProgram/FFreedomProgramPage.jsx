import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Coins,
  Crown,
  DoorOpen,
  Eye,
  Expand,
  Globe2,
  Layers3,
  Lock,
  Orbit,
  Recycle,
  Repeat2,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
  X,
  Zap,
  ChevronsUp,
  BadgeDollarSign,
  Award,
  Percent,
  RefreshCcw,
  WalletCards,
  CircleDollarSign,
} from 'lucide-react'
import { FaFacebookF, FaInstagram } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { PiTelegramLogoFill } from 'react-icons/pi'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './FFreedomProgramPage.css'

const FOOTER_LOGO = {
  dark: '/images/official_logo_2.png',
  light: '/images/official_logo_light.png',
  mobileDark: '/images/official_logo_2.png',
  mobileLight: '/images/official_logo_light.png',
}

const PAGE_IMAGES = {
  hero: {
    dark: '/images/ffreedom/hero-01-dark.png',
    light: '/images/ffreedom/hero-01-light.png',
    mobileDark: '/images/ffreedom/hero-01-mobile-dark.png',
    mobileLight: '/images/ffreedom/hero-01-mobile-light.png',
  },
  why: {
    dark: '/images/ffreedom/why-f-freedom-matters-dark.png',
    light: '/images/ffreedom/why-f-freedom-matters-light.png',
    mobileDark: '/images/ffreedom/why-f-freedom-matters-mobile-dark.png',
    mobileLight: '/images/ffreedom/why-f-freedom-matters-mobile-light.png',
  },
  levels: {
    dark: '/images/ffreedom/f-freedom-levels-dark.png',
    light: '/images/ffreedom/f-freedom-levels-light.png',
    mobileDark: '/images/ffreedom/f-freedom-levels-mobile-dark.png',
    mobileLight: '/images/ffreedom/f-freedom-levels-mobile-light.png',
  },
  orbits: {
    dark: '/images/ffreedom/triple-p-orbit-engine-dark.png',
    light: '/images/ffreedom/triple-p-orbit-engine-light.png',
    mobileDark: '/images/ffreedom/triple-p-orbit-engine-mobile-dark.png',
    mobileLight: '/images/ffreedom/triple-p-orbit-engine-mobile-light.png',
  },
  price: {
    dark: '/images/ffreedom/f-freedom-price-table-dark.png',
    light: '/images/ffreedom/f-freedom-price-table-light.png',
    mobileDark: '/images/ffreedom/f-freedom-price-table-mobile-dark.png',
    mobileLight: '/images/ffreedom/f-freedom-price-table-mobile-light.png',
  },
  income: {
    dark: '/images/ffreedom/f-freedom-income-table-dark.png',
    light: '/images/ffreedom/f-freedom-income-table-light.png',
    mobileDark: '/images/ffreedom/f-freedom-income-table-mobile-dark.png',
    mobileLight: '/images/ffreedom/f-freedom-income-table-mobile-light.png',
  },
}


const PROGRAM_AD_SLIDES = [
  '/images/ffreedom/ads/ad-image-1.png',
  '/images/ffreedom/ads/ad-image-2.png',
  '/images/ffreedom/ads/ad-image-3.png',
  '/images/ffreedom/ads/ad-image-4.png',
  '/images/ffreedom/ads/ad-image-5.png',
]

const PROGRAM_AD_SETTINGS = {
  storageKey: 'ffn_program_ads_v1',
  maxShowsPerDay: 3,
  showEveryMs: 2 * 60 * 1000,
  slideEveryMs: 4500,
  showLaterMs: 10 * 60 * 1000,
}

const SOCIAL_LINKS = [
  { id: 'telegram', label: 'Telegram', icon: PiTelegramLogoFill, href: 'https://t.me/' },
  { id: 'instagram', label: 'Instagram', icon: FaInstagram, href: 'https://instagram.com/' },
  { id: 'facebook', label: 'Facebook', icon: FaFacebookF, href: 'https://facebook.com/' },
  { id: 'x', label: 'X', icon: FaXTwitter, href: 'https://x.com/' },
]

const PROGRAM_LINKS = [
  { title: 'F-Freedom Program', route: 'f-freedom-program' },
  { title: 'Freedom-Plus Program', route: 'freedom-plus' },
  { title: 'Freedom NFT Program', route: 'nft' },
  { title: 'Fin Freedom Marketplace', route: 'marketplace' },
  { title: 'Fin Freedom Coin', route: 'token-economy' },
  { title: 'Fin Freedom Institute', route: 'institute' },
]

const FEATURES = [
  { title: '10 Progressive Levels', text: 'Level prices double from $10 to $5,120.', icon: BarChart3 },
  { title: 'Triple-P Orbit Engine', text: 'Three orbit structures: P4, P12, and P39.', icon: Orbit },
  { title: 'Smart Contract Powered', text: 'Transparent, secure, and automated on-chain execution.', icon: ShieldCheck },
  { title: 'Automatic Recycling', text: 'Supports continuous participation and system sustainability.', icon: Recycle },
  { title: 'Token Rewards', text: 'Earn FGT on activation and FGTr on recycling.', icon: Coins },
]

const WHY_POINTS = [
  { title: 'Fair Participation', text: 'A structured gateway into the Fin Freedom ecosystem.', icon: Users },
  { title: 'No Admin Control', text: 'No hidden manipulation. Rules drive the system.', icon: Lock },
  { title: 'Deterministic Payouts', text: 'Outcomes follow clear programmed logic.', icon: Zap },
  { title: 'Transparent & Verifiable', text: 'Transactions and system actions can be checked on-chain.', icon: Eye },
  { title: 'Predictable System Logic', text: 'Designed around clarity, repeatability, and structure.', icon: Layers3 },
  { title: 'Long-Term Sustainability', text: 'Built for continued participation and growth.', icon: Recycle },
]


const WHY_SECTION = {
  title: 'Why F-Freedom Matters',
  subtitle: 'A Structured Path Built on Fairness, Clarity, and Trust',
  statementTop: 'F-Freedom is not about speculation.',
  statementBottom: 'It is about structure, participation, and freedom.',
  description:
    'F-Freedom is the gateway to the Fin Freedom ecosystem, designed to create real opportunities through clarity, fairness, and a system that works for everyone.',
  trustCards: [
    {
      title: 'No Admin Control',
      text: 'No hidden manipulation. Rules drive the system.',
      icon: Lock,
    },
    {
      title: 'Deterministic Payouts',
      text: 'Outcomes follow clear programmed logic.',
      icon: Zap,
    },
    {
      title: 'Transparent & Verifiable',
      text: 'Transactions and system actions can be checked on-chain.',
      icon: Eye,
    },
  ],
  pillars: [
    {
      title: 'Fair Participation',
      icon: Users,
    },
    {
      title: 'Predictable System Logic',
      icon: Layers3,
    },
    {
      title: 'Long-Term Sustainability',
      icon: BarChart3,
    },
  ],
  slogan: 'Clear. Fair. Verifiable. Built for Freedom.',
}

const LEVELS = [
  {
    number: '1',
    title: 'Entry',
    text: 'Your first step — the journey to structured freedom begins.',
    icon: DoorOpen,
    tone: 'blue',
  },
  {
    number: '2',
    title: 'Growth',
    text: 'This is the stage where your reach begins to expand.',
    icon: BarChart3,
    tone: 'cyan',
  },
  {
    number: '3',
    title: 'Expansion',
    text: 'An extended structure that increases visibility and participation.',
    icon: Expand,
    tone: 'green',
  },
  {
    number: '4',
    title: 'Momentum',
    text: 'A renewed cycle that strengthens consistency and earning potential.',
    icon: Repeat2,
    tone: 'yellow',
  },
  {
    number: '5',
    title: 'Elevation',
    text: 'An advanced structure that unlocks greater movement and opportunity.',
    icon: ChevronsUp,
    tone: 'orange',
  },
  {
    number: '6',
    title: 'Scale',
    text: 'A high-capacity stage where your reach expands and activity multiplies.',
    icon: Globe2,
    tone: 'purple',
  },
  {
    number: '7',
    title: 'Influence',
    text: 'A strengthened position where your activity begins to shape outcomes.',
    icon: Users,
    tone: 'indigo',
  },
  {
    number: '8',
    title: 'Leadership',
    text: 'A deeper progression stage focused on coordination, guidance, and sustained growth.',
    icon: Crown,
    tone: 'teal',
  },
  {
    number: '9',
    title: 'Mastery',
    text: 'An advanced stage of precision, control, and optimized earning potential.',
    icon: Star,
    tone: 'pink',
  },
  {
    number: '10',
    title: 'Zenith',
    text: 'The highest milestone — representing peak positioning and maximum impact.',
    icon: Trophy,
    tone: 'gold',
  },
]

const ORBIT_SECTION = {
  titleTop: 'Triple-P',
  titleBottom: 'Orbit Engine',
  eyebrow: 'Three powerful orbits. One system. Limitless possibility.',
  ctaText: 'Join the program to earn an orbit.',
  cards: [
    {
      key: 'p4',
      name: 'P4',
      label: 'Orbit',
      positions: '4 Positions',
      description: 'Four positions aligned in a powerful orbit format.',
      rings: [4],
      tone: 'cyan',
    },
    {
      key: 'p12',
      name: 'P12',
      label: 'Orbit',
      positions: '12 Positions',
      description:
        'Twelve positions on two lines — 3 on the first line and 9 on the second line in orbit form.',
      rings: [3, 9],
      tone: 'green',
    },
    {
      key: 'p39',
      name: 'P39',
      label: 'Orbit',
      positions: '39 Positions',
      description:
        'Thirty-nine positions on three lines — 3 on the first line, 9 on the second line, and 27 on the third line in orbit form.',
      rings: [3, 9, 27],
      tone: 'purple',
    },
  ],
}

const PRICE_ROWS = [
  ['1', 'P4', '$10'], ['2', 'P12', '$20'], ['3', 'P39', '$40'], ['4', 'P4', '$80'], ['5', 'P12', '$160'],
  ['6', 'P39', '$320'], ['7', 'P4', '$640'], ['8', 'P12', '$1,280'], ['9', 'P39', '$2,560'], ['10', 'P4', '$5,120'],
]

const PRICE_TABLE_SECTION = {
  title: 'F-Freedom',
  subtitle: 'Price Table',
  columns: [
    {
      key: 'level',
      label: 'Level',
      icon: Award,
    },
    {
      key: 'orbit',
      label: 'Orbit',
      icon: Orbit,
    },
    {
      key: 'price',
      label: 'Price of Level',
      icon: BadgeDollarSign,
    },
  ],
}

const INCOME_TABLE_SECTION = {
  title: 'F-Freedom',
  subtitle: 'Income Table',
  columns: [
    {
      key: 'level',
      label: 'Level',
      icon: Award,
    },
    {
      key: 'orbit',
      label: 'Orbit',
      icon: Orbit,
    },
    {
      key: 'progress',
      label: 'Progress',
      icon: BarChart3,
    },
    {
      key: 'cost',
      label: 'Cost',
      icon: BadgeDollarSign,
    },
    {
      key: 'grossIncome',
      label: 'Gross Income',
      icon: CircleDollarSign,
    },
    {
      key: 'grossPercent',
      label: 'Gross %',
      icon: Percent,
    },
    {
      key: 'recycle',
      label: 'Recycle',
      icon: RefreshCcw,
    },
    {
      key: 'netWalletIncome',
      label: 'Net Wallet Income',
      icon: WalletCards,
    },
  ],
}

const INCOME_ROWS = [
  ['1', 'P4', 'Entry', '$10', '$37', '370%', '$10', '$27'],
  ['2', 'P12', 'Growth', '$20', '$114', '570%', '$20', '$94'],
  ['3', 'P39', 'Expansion', '$40', '$636', '1590%', '$40', '$596'],
  ['4', 'P4', 'Momentum', '$80', '$296', '370%', '$80', '$216'],
  ['5', 'P12', 'Elevation', '$160', '$912', '570%', '$160', '$752'],
  ['6', 'P39', 'Scale', '$320', '$5,088', '1590%', '$320', '$4,768'],
  ['7', 'P4', 'Influence', '$640', '$2,368', '370%', '$640', '$1,728'],
  ['8', 'P12', 'Leadership', '$1,280', '$7,296', '570%', '$1,280', '$6,016'],
  ['9', 'P39', 'Mastery', '$2,560', '$40,704', '1590%', '$2,560', '$38,144'],
  ['10', 'P4', 'Zenith', '$5,120', '$18,944', '370%', '$5,120', '$13,824'],
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

function useThemeMode() {
  const getTheme = () => {
    if (typeof document === 'undefined') return 'dark'
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  }
  const [theme, setTheme] = useState(getTheme)
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const observer = new MutationObserver(() => setTheme(getTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    setTheme(getTheme())
    return () => observer.disconnect()
  }, [])
  return theme
}

function ThemeImage({ image, alt, className }) {
  const theme = useThemeMode()
  const desktopSrc = typeof image === 'string' ? image : image?.[theme] || image?.dark || image?.light
  const mobileSrc = typeof image === 'string' ? image : theme === 'light' ? image?.mobileLight || image?.light || image?.dark : image?.mobileDark || image?.dark || image?.light
  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={mobileSrc} />
      <img src={desktopSrc} alt={alt} className={className} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none' }} />
    </picture>
  )
}

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

function LegalModal({ type, onClose }) {
  const content = LEGAL_CONTENT[type]
  if (!content) return null
  const Icon = content.icon
  return (
    <ModalPortal>
      <div className="ffp-modal">
        <div className="ffp-modal__backdrop" onClick={onClose} />
        <div className="ffp-modal__dialog ffp-modal__dialog--legal" role="dialog" aria-modal="true">
          <button type="button" className="ffp-modal__close" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
          <div className="ffp-modal__logo-wrap"><ThemeImage image={FOOTER_LOGO} alt="Fin Freedom Network" className="ffp-modal__logo" /></div>
          <div className="ffp-modal__header">
            <div className="ffp-modal__badge"><Icon size={16} /><span>{content.badge}</span></div>
            <h2>{content.title}</h2>
            <p>{content.subtitle}</p>
          </div>
          <div className="ffp-modal__body legal-content">
            {content.warning && <p className="legal-content__warning">{content.warning}</p>}
            {content.sections.map(([heading, text]) => (
              <section key={heading} className="legal-content__section"><h4>{heading}</h4><p>{text}</p></section>
            ))}
          </div>
          <div className="ffp-modal__actions"><button type="button" className="ffp-btn ffp-btn--primary" onClick={onClose}>I agree</button></div>
        </div>
      </div>
    </ModalPortal>
  )
}

function LaunchModal({ onClose, onNavigate }) {
  return (
    <ModalPortal>
      <div className="ffp-modal">
        <div className="ffp-modal__backdrop" onClick={onClose} />
        <div className="ffp-modal__dialog ffp-modal__dialog--launch" role="dialog" aria-modal="true">
          <button type="button" className="ffp-modal__close" onClick={onClose} aria-label="Close launch alert"><X size={18} /></button>
          <div className="ffp-launch-icon"><Sparkles size={26} /></div>
          <div className="ffp-modal__header">
            <div className="ffp-modal__badge"><Wallet size={16} /><span>New Program Launch Alert</span></div>
            <h2>F-Freedom Program is now live.</h2>
            <p>Connect your wallet, review the notice, and continue only when you understand the structure.</p>
          </div>
          <div className="ffp-launch-list">
            <span><CheckCircle2 size={16} /> Wallet connection required</span>
            <span><CheckCircle2 size={16} /> Deterministic smart contract logic</span>
            <span><CheckCircle2 size={16} /> No admin-controlled payout manipulation</span>
            <span><CheckCircle2 size={16} /> Review program notice before joining</span>
          </div>
          <div className="ffp-modal__actions ffp-modal__actions--split">
            <button type="button" className="ffp-btn ffp-btn--ghost" onClick={onClose}>Review Page</button>
            <button type="button" className="ffp-btn ffp-btn--primary" onClick={() => { onClose(); onNavigate?.('activation') }}>Continue to F-Freedom Program <ArrowRight size={16} /></button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}




function ProgramAdsModal({ slides = [], onClose, onShowLater }) {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    if (!slides.length) return undefined

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, PROGRAM_AD_SETTINGS.slideEveryMs)

    return () => window.clearInterval(timer)
  }, [slides.length])

  if (!slides.length) return null

  return (
    <ModalPortal>
      <div className="ffp-ad-modal">
        <div className="ffp-ad-modal__backdrop" onClick={onShowLater} />

        <div className="ffp-ad-modal__dialog" role="dialog" aria-modal="true">
          <button
            type="button"
            className="ffp-ad-modal__close"
            onClick={onShowLater}
            aria-label="Close advert popup"
          >
            <X size={18} />
          </button>

          <div className="ffp-ad-modal__slider">
            {slides.map((src, index) => (
              <img
                key={src}
                src={src}
                alt=""
                className={`ffp-ad-modal__image ${
                  index === activeSlide ? 'is-active' : ''
                }`}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>

          <div className="ffp-ad-modal__dots" aria-hidden="true">
            {slides.map((src, index) => (
              <button
                key={src}
                type="button"
                className={index === activeSlide ? 'is-active' : ''}
                onClick={() => setActiveSlide(index)}
                aria-label={`Show advert slide ${index + 1}`}
              />
            ))}
          </div>

          <div className="ffp-ad-modal__actions">
            <button
              type="button"
              className="ffp-ad-modal__btn ffp-ad-modal__btn--ghost"
              onClick={onShowLater}
            >
              Show me later
            </button>

            <button
              type="button"
              className="ffp-ad-modal__btn ffp-ad-modal__btn--soft"
              onClick={onClose}
            >
              I am excited 😍
            </button>

            <button
              type="button"
              className="ffp-ad-modal__btn ffp-ad-modal__btn--primary"
              onClick={onClose}
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}


function OrbitVisual({ rings = [], tone = 'cyan' }) {
  return (
    <div className={`ffp-orbit-engine-visual ffp-orbit-engine-visual--${tone}`}>
      <div className="ffp-orbit-engine-visual__core">
        <Orbit size={34} />
      </div>

      {rings.map((count, ringIndex) => (
        <div
          key={`${count}-${ringIndex}`}
          className={`ffp-orbit-engine-visual__ring ffp-orbit-engine-visual__ring--${ringIndex + 1}`}
        >
          {Array.from({ length: count }).map((_, nodeIndex) => (
            <span
              key={nodeIndex}
              className="ffp-orbit-engine-visual__node"
              style={{
                '--node-index': nodeIndex,
                '--node-count': count,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}





function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getStoredAdState() {
  if (typeof window === 'undefined') {
    return {
      date: getTodayKey(),
      shownCount: 0,
      lastShownAt: 0,
      snoozeUntil: 0,
    }
  }

  try {
    const raw = window.localStorage.getItem(PROGRAM_AD_SETTINGS.storageKey)
    const parsed = raw ? JSON.parse(raw) : null
    const today = getTodayKey()

    if (!parsed || parsed.date !== today) {
      return {
        date: today,
        shownCount: 0,
        lastShownAt: 0,
        snoozeUntil: 0,
      }
    }

    return {
      date: today,
      shownCount: Number(parsed.shownCount || 0),
      lastShownAt: Number(parsed.lastShownAt || 0),
      snoozeUntil: Number(parsed.snoozeUntil || 0),
    }
  } catch {
    return {
      date: getTodayKey(),
      shownCount: 0,
      lastShownAt: 0,
      snoozeUntil: 0,
    }
  }
}

function saveStoredAdState(nextState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    PROGRAM_AD_SETTINGS.storageKey,
    JSON.stringify(nextState)
  )
}

function FFreedomProgramPage({ onNavigate }) {
  // const [legalModal, setLegalModal] = useState(null)
  // const [showLaunchModal, setShowLaunchModal] = useState(false)
    const [legalModal, setLegalModal] = useState(null)
    const [showLaunchModal, setShowLaunchModal] = useState(false)
    const [showProgramAds, setShowProgramAds] = useState(false)


    useEffect(() => {
      AOS.init({
        duration: 1100,
        easing: 'ease-out-back',
        once: false,
        mirror: false,
        offset: 120,
        delay: 80,
      })

      const refreshTimer = window.setTimeout(() => {
        AOS.refreshHard()
      }, 300)

      return () => window.clearTimeout(refreshTimer)
    }, [])


  useEffect(() => {
    const key = 'ffn_f_freedom_launch_alert_seen_v1'
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(key) !== 'yes') {
      const timer = window.setTimeout(() => setShowLaunchModal(true), 700)
      window.localStorage.setItem(key, 'yes')
      return () => window.clearTimeout(timer)
    }
  }, [])



  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const tryShowAd = () => {
      const now = Date.now()
      const state = getStoredAdState()

      const hasReachedDailyLimit =
        state.shownCount >= PROGRAM_AD_SETTINGS.maxShowsPerDay

      const isStillSnoozed = state.snoozeUntil && now < state.snoozeUntil

      const isTooSoon =
        state.lastShownAt &&
        now - state.lastShownAt < PROGRAM_AD_SETTINGS.showEveryMs

      if (hasReachedDailyLimit || isStillSnoozed || isTooSoon) return

      const nextState = {
        ...state,
        shownCount: state.shownCount + 1,
        lastShownAt: now,
      }

      saveStoredAdState(nextState)
      setShowProgramAds(true)
    }

    const firstTimer = window.setTimeout(tryShowAd, 1200)
    const interval = window.setInterval(
      tryShowAd,
      PROGRAM_AD_SETTINGS.showEveryMs
    )

    return () => {
      window.clearTimeout(firstTimer)
      window.clearInterval(interval)
    }
  }, [])


  

  const heroFeatureCards = useMemo(() => FEATURES, [])

  const handleJoin = () => onNavigate?.('activation')


      const handleCloseProgramAds = () => {
      setShowProgramAds(false)
    }

    const handleShowProgramAdsLater = () => {
      const state = getStoredAdState()

      saveStoredAdState({
        ...state,
        snoozeUntil: Date.now() + PROGRAM_AD_SETTINGS.showLaterMs,
      })

      setShowProgramAds(false)
    }

  return (
    <div className="ffp-page">
      {showLaunchModal && <LaunchModal onClose={() => setShowLaunchModal(false)} onNavigate={onNavigate} />}
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      {showProgramAds && (
        <ProgramAdsModal
          slides={PROGRAM_AD_SLIDES}
          onClose={handleCloseProgramAds}
          onShowLater={handleShowProgramAdsLater}
        />
      )}

      <section className="ffp-hero">
        <div className="ffp-hero__bg"><ThemeImage image={PAGE_IMAGES.hero} alt="F-Freedom Program visual" className="ffp-hero__image" /></div>
        <div className="ffp-hero__content">
          <span className="ffp-eyebrow"><Sparkles size={15} /> Current Live Program</span>
          <h1><span>F-Freedom</span> <span style={{color: "greenyellow"}}>Program</span></h1>
          <p className="ffp-hero__subtitle">The Core Participation Engine of Fin Freedom Network</p>
          <p className="ffp-hero__text">A structured, level-based earning system built on smart contracts to reward participation, completion, and long-term engagement. Powered by the Triple-P Orbit Engine, it supports predictable earnings, controlled recycling, and sustainable growth.</p>
          <div className="ffp-actions">
            <button type="button" className="ffp-btn ffp-btn--primary" onClick={handleJoin}>Join the F-Freedom Program <ArrowRight size={17} /></button>
            <button type="button" className="ffp-btn ffp-btn--ghost" onClick={() => setLegalModal('risk')}>View Program Notice</button>
          </div>
          <div className="ffp-feature-row">
            {heroFeatureCards.map(({ title, text, icon: Icon }) => <article key={title} className="ffp-feature-mini"><Icon size={20} /><strong>{title}</strong><span>{text}</span></article>)}
          </div>
        </div>
      </section>
{/* 
      <section className="ffp-section ffp-section--why">
        <div className="ffp-section__header ffp-section__header--center">
          <span className="ffp-eyebrow"><ShieldCheck size={15} /> Why it matters</span>
          <h2>Why F-Freedom Matters</h2>
          <p>A structured path built on fairness, clarity, and trust.</p>
        </div>
        <div className="ffp-split-card">
          <div className="ffp-split-card__media"><ThemeImage image={PAGE_IMAGES.why} alt="Why F-Freedom matters" className="ffp-reference-image" /></div>
          <div className="ffp-split-card__content">
            <div className="ffp-statement"><strong>F-Freedom is not about speculation.</strong><span>It is about structure, participation, and freedom.</span></div>
            <p>F-Freedom is the gateway to the Fin Freedom ecosystem, designed to create real opportunities through clarity, fairness, and a system that works for everyone.</p>
            <div className="ffp-why-grid">{WHY_POINTS.map(({ title, text, icon: Icon }) => <article key={title}><Icon size={18} /><strong>{title}</strong><span>{text}</span></article>)}</div>
          </div>
        </div>
      </section> */}

      <section className="ffp-why-section">
            <div className="ffp-why-section__bg">
              <ThemeImage
                image={PAGE_IMAGES.why}
                alt="Why F-Freedom matters"
                className="ffp-why-section__image"
              />
            </div>

            <div className="ffp-why-section__content">
              <header className="ffp-why-section__header">
                <span className="ffp-why-section__brand">Fin Freedom Network</span>
                <h2>
                  <span>Why F-Freedom</span>
                  <strong>Matters</strong>
                </h2>
                <p>{WHY_SECTION.subtitle}</p>
              </header>

              <div className="ffp-why-section__statement">
                <div className="ffp-why-section__statement-icon">
                  <ShieldCheck size={34} />
                </div>

                <div>
                  <strong>{WHY_SECTION.statementTop}</strong>
                  <span>{WHY_SECTION.statementBottom}</span>
                </div>
              </div>

              <div className="ffp-why-section__middle">
                <div className="ffp-why-section__description">
                  <Globe2 size={38} />
                  <p>{WHY_SECTION.description}</p>
                </div>

                <div className="ffp-why-section__trust-grid">
                  {WHY_SECTION.trustCards.map(({ title, text, icon: Icon }) => (
                    <article key={title} className="ffp-why-section__trust-card">
                      <Icon size={32} />
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </article>
                  ))}
                </div>
              </div>

              <div className="ffp-why-section__pillars">
                {WHY_SECTION.pillars.map(({ title, icon: Icon }) => (
                  <article key={title} className="ffp-why-section__pillar">
                    <Icon size={34} />
                    <strong>{title}</strong>
                  </article>
                ))}
              </div>

              <div className="ffp-why-section__slogan">
                {WHY_SECTION.slogan}
              </div>
            </div>
      </section>

      <section className="ffp-levels-section">
          <div className="ffp-levels-section__inner">
            <header className="ffp-levels-section__header" data-aos="fade-up">
              <span>Your</span>
              <h2>F-Freedom</h2>
              <strong>Progression Levels</strong>
            </header>

            <div className="ffp-levels-board">
              {LEVELS.map(({ number, title, text, icon: Icon, tone }, index) => (
                // <article
                //   key={number}
                //   className={`ffp-progression-card ffp-progression-card--${tone}`}
                //   // data-aos={index < 5 ? 'fade-right' : 'fade-left'}
                //   data-aos={index < 5 ? 'ffp-fly-right' : 'ffp-fly-left'}
                //   data-aos-delay={(index % 5) * 90}
                // >
                <article
                    key={number}
                    className={`ffp-progression-card ffp-progression-card--${tone}`}
                    data-aos={index < 5 ? 'ffp-fly-right' : 'ffp-fly-left'}
                    data-aos-delay={(index % 5) * 120}
                    data-aos-duration="1100"
                  >
                  <div className="ffp-progression-card__level">
                    <span>Level</span>
                    <strong>{number}</strong>
                  </div>

                  <div className="ffp-progression-card__icon">
                    <Icon size={38} />
                  </div>

                  <div className="ffp-progression-card__content">
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

      
      
      
      
      <section className="ffp-orbit-engine-section">
            <div className="ffp-orbit-engine-section__inner">
              <header className="ffp-orbit-engine-section__header" data-aos="fade-up">
                <p className="ffp-orbit-engine-section__cta">{ORBIT_SECTION.ctaText}</p>

                <h2>
                  <span>{ORBIT_SECTION.titleTop}</span>
                  <strong>{ORBIT_SECTION.titleBottom}</strong>
                </h2>

                <div className="ffp-orbit-engine-section__eyebrow">
                  {ORBIT_SECTION.eyebrow}
                </div>
              </header>

              <div className="ffp-orbit-engine-grid">
                {ORBIT_SECTION.cards.map((orbit, index) => (
                  <article
                    key={orbit.key}
                    className={`ffp-orbit-engine-card ffp-orbit-engine-card--${orbit.tone}`}
                    data-aos="zoom-in-up"
                    data-aos-delay={index * 140}
                  >
                    <div className="ffp-orbit-engine-card__badge">
                      <strong>{orbit.name}</strong>
                      <span>{orbit.label}</span>
                    </div>

                    <p className="ffp-orbit-engine-card__positions">
                      {orbit.positions}
                    </p>

                    <OrbitVisual rings={orbit.rings} tone={orbit.tone} />

                    <p className="ffp-orbit-engine-card__description">
                      {orbit.description}
                    </p>

                    <span className="ffp-orbit-engine-card__dash" />
                  </article>
                ))}
              </div>
            </div>
      </section>

      <section className="ffp-money-section">
            <div className="ffp-money-section__inner">
              <div className="ffp-money-section__grid">
                {/* PRICE TABLE */}
                <article className="ffp-money-panel ffp-money-panel--price">
                  <header className="ffp-money-header" data-aos="fade-up">
                    <h2>{PRICE_TABLE_SECTION.title}</h2>
                    <p>{PRICE_TABLE_SECTION.subtitle}</p>
                  </header>

                  <div className="ffp-price-board" data-aos="zoom-in-up">
                    <div className="ffp-price-board__head">
                      {PRICE_TABLE_SECTION.columns.map(({ key, label, icon: Icon }) => (
                        <div key={key} className="ffp-price-board__th">
                          <span className="ffp-price-board__icon">
                            <Icon size={30} />
                          </span>
                          <strong>{label}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="ffp-price-board__body">
                      {PRICE_ROWS.map(([level, orbit, price], index) => (
                        <div
                          key={level}
                          className="ffp-price-board__row"
                          data-aos="fade-up"
                          data-aos-delay={index * 45}
                        >
                          <div className="ffp-price-board__cell ffp-price-board__cell--level">
                            <span>Level</span>
                            <strong>{level}</strong>
                          </div>

                          <div className="ffp-price-board__cell ffp-price-board__cell--orbit">
                            <span className={`ffp-price-orbit ffp-price-orbit--${orbit.toLowerCase()}`}>
                              {orbit}
                            </span>
                          </div>

                          <div className="ffp-price-board__cell ffp-price-board__cell--price">
                            {price}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>

                {/* INCOME TABLE */}
                <article className="ffp-money-panel ffp-money-panel--income">
                  <header className="ffp-money-header" data-aos="fade-up">
                    <h2>{INCOME_TABLE_SECTION.title}</h2>
                    <p>{INCOME_TABLE_SECTION.subtitle}</p>
                  </header>

                  <div className="ffp-income-board" data-aos="zoom-in-up" data-aos-delay="120">
                    <div className="ffp-income-board__head">
                      {INCOME_TABLE_SECTION.columns.map(({ key, label, icon: Icon }) => (
                        <div key={key} className="ffp-income-board__th">
                          <span className="ffp-income-board__icon">
                            <Icon size={22} />
                          </span>
                          <strong>{label}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="ffp-income-board__body">
                      {INCOME_ROWS.map(
                        ([level, orbit, progress, cost, grossIncome, grossPercent, recycle, netWalletIncome], index) => (
                          <div
                            key={level}
                            className="ffp-income-board__row"
                            data-aos="fade-up"
                            data-aos-delay={index * 45}
                          >
                            <div className="ffp-income-board__cell ffp-income-board__cell--level">
                              {level}
                            </div>

                            <div className="ffp-income-board__cell">
                              <span className={`ffp-price-orbit ffp-price-orbit--${orbit.toLowerCase()}`}>
                                {orbit}
                              </span>
                            </div>

                            <div className="ffp-income-board__cell ffp-income-board__cell--progress">
                              {progress}
                            </div>

                            <div className="ffp-income-board__cell">
                              {cost}
                            </div>

                            <div className="ffp-income-board__cell ffp-income-board__cell--gross">
                              {grossIncome}
                            </div>

                            <div className="ffp-income-board__cell ffp-income-board__cell--percent">
                              {grossPercent}
                            </div>

                            <div className="ffp-income-board__cell ffp-income-board__cell--recycle">
                              {recycle}
                            </div>

                            <div className="ffp-income-board__cell ffp-income-board__cell--net">
                              {netWalletIncome}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </article>
              </div>
            </div>
        </section>

           
      
      
      <section className="ffp-final-cta">
        <span className="ffp-eyebrow"><Wallet size={15} /> Start with the live layer</span>
        <h2>Enter through the F-Freedom Program.</h2>
        <p>Connect your wallet, review the notice, and continue into the live participation flow when ready.</p>
        <button type="button" className="ffp-btn ffp-btn--primary" onClick={handleJoin}>Join the F-Freedom Program <ArrowRight size={17} /></button>
      </section>
    </div>
  )
}

export default FFreedomProgramPage
