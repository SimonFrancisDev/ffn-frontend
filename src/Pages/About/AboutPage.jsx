import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AOS from 'aos'
import 'aos/dist/aos.css'
import {
  ArrowRight,
  BookOpen,
  Users,
  Gem,
  TrendingUp,
  ShieldCheck,
  Target,
  Mountain,
  Lightbulb,
  Settings,
  Handshake,
  Network,
  Scale,
  Lock,
  Globe2,
  X,
  Eye,
  TriangleAlert,
  Sparkles,
} from 'lucide-react'
import { FaFacebookF, FaInstagram } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { PiTelegramLogoFill } from 'react-icons/pi'
import './AboutPage.css'

const ABOUT_IMAGES = {
  whoWeAre: {
    dark: '/images/about/who-we-are-dark.png',
    light: '/images/about/who-we-are-light.png',
    mobileDark: '/images/about/who-we-are-mobile-dark.png',
    mobileLight: '/images/about/who-we-are-mobile-light.png',
  },
  ourPurpose: {
    dark: '/images/about/our-purpose-dark.png',
    light: '/images/about/our-purpose-light.png',
    mobileDark: '/images/about/our-purpose-mobile-dark.png',
    mobileLight: '/images/about/our-purpose-mobile-light.png',
  },
  ourFoundation: {
    dark: '/images/about/our-foundation-dark.png',
    light: '/images/about/our-foundation-light.png',
    mobileDark: '/images/about/our-foundation-mobile-dark.png',
    mobileLight: '/images/about/our-foundation-mobile-light.png',
  },
  coreValues: {
    dark: '/images/about/core-values-dark.png',
    light: '/images/about/core-values-light.png',
    mobileDark: '/images/about/core-values-mobile-dark.png',
    mobileLight: '/images/about/core-values-mobile-light.png',
  },
  ourCommitment: {
    dark: '/images/about/our-commitment-dark.png',
    light: '/images/about/our-commitment-light.png',
    mobileDark: '/images/about/our-commitment-mobile-dark.png',
    mobileLight: '/images/about/our-commitment-mobile-light.png',
  },
  together: {
    dark: '/images/about/together-dark.png',
    light: '/images/about/together-light.png',
    mobileDark: '/images/about/together-mobile-dark.png',
    mobileLight: '/images/about/together-mobile-light.png',
  },
}

const ABOUT_WHO_WE_ARE = {
  brand: 'Fin Freedom Network',
  titleTop: 'WHO',
  titleBottom: 'WE ARE',
  intro:
    'Fin Freedom Network is a structured Web3 ecosystem built to redefine how individuals participate, grow, and create value in the digital economy.',
  emphasis: 'We are not a speculative platform.',
  closing:
    'We are a system designed around participation, transparency, and long-term sustainability.',
  pillars: [
    {
      title: 'Participation',
      lines: ['Everyone has a role.', 'Everyone creates value.'],
      icon: Users,
      tone: 'blue',
    },
    {
      title: 'Transparency',
      lines: ['Open systems.', 'Clear rules.', 'Visible results.'],
      icon: ShieldCheck,
      tone: 'green',
    },
    {
      title: 'Growth',
      lines: ['Consistent progress.', 'Real impact.'],
      icon: TrendingUp,
      tone: 'purple',
    },
    {
      title: 'Sustainability',
      lines: ['Built to last.', 'Designed for generations.'],
      icon: Gem,
      tone: 'gold',
    },
  ],
}

const ABOUT_OUR_PURPOSE = {
  brand: 'Fin Freedom Network',
  titleTop: 'OUR',
  titleBottom: 'PURPOSE',
  cards: [
    {
      title: 'Our Vision',
      text: 'To build a global digital ecosystem where individuals can participate meaningfully, grow consistently, and achieve structured financial progress.',
      icon: Target,
      tone: 'blue',
    },
    {
      title: 'Our Mission',
      text: 'To create a fair, transparent, and scalable system that empowers individuals through participation, education, and opportunity.',
      icon: Mountain,
      tone: 'green',
    },
    {
      title: 'Our Philosophy',
      intro: 'We believe:',
      bullets: [
        'Value should be created through participation',
        'Systems should be transparent and predictable',
        'Growth should be sustainable',
        'Opportunity should be accessible',
      ],
      icon: Lightbulb,
      tone: 'purple',
    },
  ],
}

const ABOUT_OUR_FOUNDATION = {
  brand: 'Fin Freedom Network',
  titleTop: 'OUR',
  titleBottom: 'FOUNDATION',
  cards: [
    {
      title: 'Our Approach',
      intro: 'Fin Freedom Network combines:',
      bullets: [
        'Structured system design',
        'Smart contract technology',
        'Educational empowerment',
        'Community-driven growth',
      ],
      icon: Settings,
      tone: 'blue',
    },
    {
      title: 'Our Commitment',
      intro: 'We are committed to:',
      bullets: ['Transparency', 'Security', 'Fairness', 'Long-term sustainability'],
      icon: Handshake,
      tone: 'green',
    },
  ],
}

const ABOUT_CORE_VALUES = {
  brand: 'Fin Freedom Network',
  titleTop: 'OUR',
  titleBottom: 'CORE VALUES',
  intro: [
    'We know that today it is easy to speak great words. Far more difficult is to uphold them over time.',
    'For this reason, we believe that trust should not arise from what is promised, but from what is built. It is not our words that define who we are, but the structure we design, the choices we make, and the consistency with which we uphold these values.',
  ],
  cards: [
    {
      title: 'A Different Way to Build the Future',
      text: 'Fin Freedom was born from a simple conviction: a different way of building the future is possible.',
      icon: Users,
      tone: 'blue',
    },
    {
      title: 'Freedom Through Shared Growth',
      text: 'We believe every individual has the right to pursue their dreams and build their freedom through collaboration, shared growth, and collective advancement.',
      icon: Network,
      tone: 'green',
    },
    {
      title: 'Participation Creates Value',
      text: 'We believe participation is the foundation of value. Progress and opportunity are generated through engagement, guided by transparent rules and fair structures.',
      icon: Users,
      tone: 'purple',
    },
    {
      title: 'Sustainability, Transparency & Fairness',
      text: 'We design systems that are built to endure, where outcomes are predictable, mechanisms are visible, and value can grow responsibly over time.',
      icon: ShieldCheck,
      tone: 'gold',
    },
  ],
}

const ABOUT_OUR_COMMITMENT = {
  brand: 'Fin Freedom Network',
  titleTop: 'OUR',
  titleBottom: 'COMMITMENT',
  intro: 'We are committed to:',
  rows: [
    {
      title: 'Transparency',
      values: ['Open communication.', 'Clear processes.', 'Visible information.'],
      icon: ShieldCheck,
      tone: 'blue',
    },
    {
      title: 'Security',
      values: ['Advanced technology.', 'Strong protection.', 'Your trust, our priority.'],
      icon: Lock,
      tone: 'green',
    },
    {
      title: 'Fairness',
      values: ['Equal opportunities.', 'Fair rules.', 'No favoritism.'],
      icon: Scale,
      tone: 'purple',
    },
    {
      title: 'Long-Term Sustainability',
      values: ['Built to last.', 'Designed for generations.'],
      icon: TrendingUp,
      tone: 'gold',
    },
  ],
  // website: 'www.finfreedomnetwork.io',
}

const ABOUT_TOGETHER = {
  brand: 'Fin Freedom Network',
  titleTop: 'TOGETHER',
  titleMiddle: 'WE BUILD',
  titleBottom: 'FREEDOM',
  intro: 'Fin Freedom Network is more than a platform.',
  highlight: 'It is a movement.',
  paragraphs: [
    'A global community united by shared values, a common vision, and the belief that a better future is possible.',
    'Together, we are building a system where opportunity is accessible, growth is sustainable, and freedom is within reach for all.',
  ],
  sideStatement: ['One Network.', 'One Community.', 'One Freedom.'],
  slogan: 'TOGETHER, WE BUILD FREEDOM.',
  // website: 'www.finfreedomnetwork.io',
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

const PROGRAM_LINKS = [
  { title: 'F-Freedom Program', route: 'fFreedomProgram' },
  { title: 'Freedom-Plus Program', route: 'freedom-plus' },
  { title: 'Freedom NFT Program', route: 'nft' },
  { title: 'Fin Freedom Marketplace', route: 'marketplace' },
  { title: 'Fin Freedom Coin', route: 'token-economy' },
  { title: 'Fin Freedom Institute', route: 'institute' },
]

const LEGAL_CONTENT = {
  terms: {
    icon: Scale,
    badge: 'Legal',
    title: 'Terms & Conditions',
    subtitle: 'Last Updated: December 22, 2025',
    sections: [
      ['Acceptance of Terms', 'By accessing, registering, or using any part of the Fin Freedom Network platform, you confirm that you have read, understood, and agreed to be bound by these Terms & Conditions.'],
      ['Nature of the Platform', 'Fin Freedom Network is a decentralized blockchain-based platform that operates through smart contracts. The Platform does not hold user funds, control user wallets, guarantee earnings, or provide financial, investment, legal, or tax advice.'],
      ['Wallet Responsibility', 'Users must connect a self-custodial wallet. Wallet addresses cannot be changed after registration. Lost private keys or recovery phrases cannot be recovered by Fin Freedom Network.'],
      ['No Guarantees', 'Fin Freedom Network makes no guarantees regarding profits, income, returns, referrals, or future platform performance. Any examples are educational only.'],
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
      ['Blockchain & Smart Contract Risks', 'Risks include smart contract vulnerabilities, coding errors, transaction failures, exploits, and infrastructure attacks.'],
      ['No Financial, Legal, or Tax Advice', 'Nothing on the Platform is investment, financial, legal, or tax advice.'],
      ['Acceptance of Risk', 'By using the Platform, you acknowledge the risks, accept full responsibility, and agree that Fin Freedom Network bears no liability for losses.'],
    ],
  },
  transparency: {
    icon: Eye,
    badge: 'Transparency',
    title: 'Smart Contract Transparency',
    subtitle: 'Verifiable on-chain execution',
    sections: [
      ['On-Chain Smart Contracts', 'Core mechanisms are enforced by smart contracts deployed on public blockchains.'],
      ['Security Features', 'No admin access to user funds. Deterministic payout rules. Multisig governance. External audits planned.'],
      ['Verifiable Operations', 'Users can independently verify rules and transactions on-chain.'],
    ],
  },
}

const ThemeImage = ({ image, darkSrc, lightSrc, mobileDarkSrc, mobileLightSrc, alt, className = '' }) => {
  const resolvedImage = image || {
    dark: darkSrc,
    light: lightSrc,
    mobileDark: mobileDarkSrc || darkSrc,
    mobileLight: mobileLightSrc || lightSrc || darkSrc,
  }

  if (!resolvedImage?.dark && !resolvedImage?.light) return null

  return (
    <>
      <picture className="about-theme-picture about-theme-picture--dark">
        <source
          media="(max-width: 640px)"
          srcSet={resolvedImage.mobileDark || resolvedImage.dark}
        />
        <img
          src={resolvedImage.dark}
          alt={alt}
          className={className}
          loading="lazy"
        />
      </picture>

      <picture className="about-theme-picture about-theme-picture--light">
        <source
          media="(max-width: 640px)"
          srcSet={resolvedImage.mobileLight || resolvedImage.light || resolvedImage.dark}
        />
        <img
          src={resolvedImage.light || resolvedImage.dark}
          alt={alt}
          className={className}
          loading="lazy"
        />
      </picture>
    </>
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
      <div className="about-modal">
        <div className="about-modal__backdrop" onClick={onClose} />

        <div className="about-modal__dialog" role="dialog" aria-modal="true">
          <button type="button" className="about-modal__close" onClick={onClose}>
            <X size={18} />
          </button>

          <div className="about-modal__logo-wrap">
            <ThemeImage image={FOOTER_LOGO} alt="Fin Freedom Network" className="about-modal__logo" />
          </div>

          <div className="about-modal__header">
            <div className="about-modal__badge">
              <Icon size={16} />
              <span>{content.badge}</span>
            </div>

            <h2>{content.title}</h2>
            <p>{content.subtitle}</p>
          </div>

          <div className="about-modal__body legal-content">
            {content.warning && <p className="legal-content__warning">{content.warning}</p>}

            {content.sections.map(([heading, text]) => (
              <section key={heading} className="legal-content__section">
                <h4>{heading}</h4>
                <p>{text}</p>
              </section>
            ))}
          </div>

          <div className="about-modal__actions">
            <button type="button" className="about-btn about-btn--primary" onClick={onClose}>
              I agree
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

const AboutPage = ({ onNavigate }) => {
  const [legalModal, setLegalModal] = useState(null)
  const [showProgramNotice, setShowProgramNotice] = useState(true)

  useEffect(() => {
    AOS.init({
      duration: 900,
      easing: 'ease-out-cubic',
      once: true,
      offset: 90,
    })

    window.setTimeout(() => AOS.refreshHard(), 250)
  }, [])

  return (
    <main className="about-page">
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      <section id="who-we-are" className="about-story-section about-who-section" data-aos="fade-right">
        <div className="about-story-section__bg">
          <ThemeImage
            image={ABOUT_IMAGES.whoWeAre}
            alt="Who we are background"
            className="about-story-section__image"
          />
        </div>

        <div className="about-who-section__content">
          <header className="about-who-section__header" data-aos="fade-in">
            <span>{ABOUT_WHO_WE_ARE.brand}</span>

            <h1>
              <strong>{ABOUT_WHO_WE_ARE.titleTop}</strong>
              <em>{ABOUT_WHO_WE_ARE.titleBottom}</em>
            </h1>
          </header>

          <div className="about-who-section__copy" data-aos="fade-in" data-aos-delay="120">
            <p>{ABOUT_WHO_WE_ARE.intro}</p>
            <p className="about-who-section__emphasis">
              We are <span>not a speculative platform.</span>
            </p>
            <p>{ABOUT_WHO_WE_ARE.closing}</p>
          </div>

          <div className="about-who-section__pillars">
            {ABOUT_WHO_WE_ARE.pillars.map(({ title, lines, icon: Icon, tone }, index) => (
              <article
                key={title}
                className={`about-who-pillar about-who-pillar--${tone}`}
                data-aos="zoom-in-up"
                data-aos-delay={180 + index * 90}
              >
                <Icon size={46} />

                <div>
                  <strong>{title}</strong>
                  {lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="our-purpose" className="about-story-section about-purpose-section" data-aos="fade-in">
        <div className="about-story-section__bg">
          <ThemeImage
            image={ABOUT_IMAGES.ourPurpose}
            alt="Our purpose background"
            className="about-story-section__image"
          />
        </div>

        <div className="about-purpose-section__content">
          <header className="about-purpose-section__header" data-aos="fade-in">
            <span>{ABOUT_OUR_PURPOSE.brand}</span>

            <h2>
              <strong>{ABOUT_OUR_PURPOSE.titleTop}</strong>
              <em>{ABOUT_OUR_PURPOSE.titleBottom}</em>
            </h2>
          </header>

          <div className="about-purpose-section__cards">
            {ABOUT_OUR_PURPOSE.cards.map(({ title, text, intro, bullets, icon: Icon, tone }, index) => (
              <article
                key={title}
                className={`about-purpose-card about-purpose-card--${tone}`}
                data-aos="zoom-in-up"
                data-aos-delay={160 + index * 110}
              >
                <Icon size={54} />

                <div>
                  <strong>{title}</strong>

                  {text && <p>{text}</p>}

                  {intro && <p className="about-purpose-card__intro">{intro}</p>}

                  {bullets && (
                    <ul>
                      {bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="our-foundation" className="about-story-section about-foundation-section" data-aos="fade-in">
        <div className="about-story-section__bg">
          <ThemeImage image={ABOUT_IMAGES.ourFoundation} alt="Our foundation background" className="about-story-section__image" />
        </div>

        <div className="about-foundation-section__content">
          <header className="about-designed-header" data-aos="fade-in">
            <span>{ABOUT_OUR_FOUNDATION.brand}</span>
            <h2>
              <strong>{ABOUT_OUR_FOUNDATION.titleTop}</strong>
              <em>{ABOUT_OUR_FOUNDATION.titleBottom}</em>
            </h2>
          </header>

          <div className="about-foundation-section__cards">
            {ABOUT_OUR_FOUNDATION.cards.map(({ title, intro, bullets, icon: Icon, tone }, index) => (
              <article key={title} className={`about-designed-card about-designed-card--${tone}`} data-aos="zoom-in-up" data-aos-delay={160 + index * 110}>
                <Icon size={58} />
                <div>
                  <strong>{title}</strong>
                  <p>{intro}</p>
                  <ul>
                    {bullets.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="our-core-values" className="about-story-section about-values-section" data-aos="fade-in">
        <div className="about-story-section__bg">
          <ThemeImage image={ABOUT_IMAGES.coreValues} alt="Core values background" className="about-story-section__image" />
        </div>

        <div className="about-values-section__content">
          <header className="about-designed-header" data-aos="fade-in">
            <span>{ABOUT_CORE_VALUES.brand}</span>
            <h2>
              <strong>{ABOUT_CORE_VALUES.titleTop}</strong>
              <em>{ABOUT_CORE_VALUES.titleBottom}</em>
            </h2>
          </header>

          <div className="about-values-section__intro" data-aos="fade-in" data-aos-delay="120">
            {ABOUT_CORE_VALUES.intro.map((text) => <p key={text}>{text}</p>)}
          </div>

          <div className="about-values-section__cards">
            {ABOUT_CORE_VALUES.cards.map(({ title, text, icon: Icon, tone }, index) => (
              <article key={title} className={`about-value-card about-designed-card--${tone}`} data-aos="zoom-in-up" data-aos-delay={180 + index * 90}>
                <Icon size={42} />
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="our-commitment" className="about-story-section about-commitment-section-v2" data-aos="fade-in">
        <div className="about-story-section__bg">
          <ThemeImage image={ABOUT_IMAGES.ourCommitment} alt="Our commitment background" className="about-story-section__image" />
        </div>

        <div className="about-commitment-section-v2__content">
          <header className="about-designed-header" data-aos="fade-in">
            <span>{ABOUT_OUR_COMMITMENT.brand}</span>
            <h2>
              <strong>{ABOUT_OUR_COMMITMENT.titleTop}</strong>
              <em>{ABOUT_OUR_COMMITMENT.titleBottom}</em>
            </h2>
            <p>{ABOUT_OUR_COMMITMENT.intro}</p>
          </header>

          <div className="about-commitment-section-v2__rows">
            {ABOUT_OUR_COMMITMENT.rows.map(({ title, values, icon: Icon, tone }, index) => (
              <article key={title} className={`about-commitment-row about-commitment-row--${tone}`} data-aos="fade-in" data-aos-delay={160 + index * 90}>
                <Icon size={42} />
                <strong>{title}</strong>
                {values.map((item) => <span key={item}>{item}</span>)}
              </article>
            ))}
          </div>

          <div className="about-section-website" data-aos="fade-in" data-aos-delay="520">
            <Globe2 size={18} />
            <span>{ABOUT_OUR_COMMITMENT.website}</span>
          </div>
        </div>
      </section>

      <section id="together" className="about-story-section about-together-section" data-aos="fade-in">
        <div className="about-story-section__bg">
          <ThemeImage image={ABOUT_IMAGES.together} alt="Together we build freedom background" className="about-story-section__image" />
        </div>

        <div className="about-together-section__content">
          <header className="about-designed-header about-designed-header--together" data-aos="fade-in">
            <span>{ABOUT_TOGETHER.brand}</span>
            <h2>
              <strong>{ABOUT_TOGETHER.titleTop}</strong>
              <em>{ABOUT_TOGETHER.titleMiddle}</em>
              <em>{ABOUT_TOGETHER.titleBottom}</em>
            </h2>
          </header>

          <div className="about-together-section__copy" data-aos="fade-in" data-aos-delay="130">
            <p>{ABOUT_TOGETHER.intro}</p>
            <p className="about-together-section__highlight">{ABOUT_TOGETHER.highlight}</p>
            {ABOUT_TOGETHER.paragraphs.map((text) => <p key={text}>{text}</p>)}
          </div>

          <div className="about-together-section__side" data-aos="zoom-in-up" data-aos-delay="260">
            <Users size={44} />
            <div>
              {ABOUT_TOGETHER.sideStatement.map((item, index) => (
                <span key={item} className={index === 2 ? 'is-highlight' : ''}>{item}</span>
              ))}
            </div>
          </div>

          <strong className="about-together-section__slogan" data-aos="fade-in" data-aos-delay="360">
            {ABOUT_TOGETHER.slogan}
          </strong>

          <div className="about-section-website about-section-website--together" data-aos="fade-in" data-aos-delay="450">
            <Globe2 size={18} />
            <span>{ABOUT_TOGETHER.website}</span>
          </div>
        </div>
      </section>

      {showProgramNotice && (
        <aside className="about-program-notice" data-aos="fade-left">
          <button
            type="button"
            className="about-program-notice__close"
            onClick={() => setShowProgramNotice(false)}
            aria-label="Close program notice"
          >
            <X size={16} />
          </button>

          <div className="about-program-notice__badge">
            <Sparkles size={15} />
            <span>Live Now</span>
          </div>

          <h3>We are already in the first program</h3>
          <p>
            The <strong>F-Freedom Program</strong> is currently live. Learn how it works,
            join the program, or get support.
          </p>

          <div className="about-program-notice__actions">
            <button type="button" onClick={() => onNavigate?.('fFreedomProgram')}>
              Learn More
            </button>

            <button type="button" onClick={() => onNavigate?.('activation')}>
              Join Program
            </button>

            <button type="button" onClick={() => onNavigate?.('support')}>
              Gain Support
            </button>
          </div>
        </aside>
      )}
    </main>
  )
}

export default AboutPage