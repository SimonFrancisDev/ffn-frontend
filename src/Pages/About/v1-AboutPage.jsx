import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Compass,
  Eye,
  Globe2,
  Landmark,
  LockKeyhole,
  Network,
  Orbit,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import './AboutPage.css'

const ABOUT_PILLARS = [
  {
    id: 'wallet-first',
    icon: Wallet,
    title: 'Wallet-first access',
    description:
      'Fin Freedom Network is built around self-custodial wallet participation. Users connect their own wallets and remain responsible for protecting their keys, recovery phrase, and transaction decisions.',
  },
  {
    id: 'transparent-rules',
    icon: Eye,
    title: 'Transparent rules',
    description:
      'The F-Freedom Program follows clear orbit-based logic, visible progression, and smart-contract-driven execution so users can understand how activity moves through the system.',
  },
  {
    id: 'structured-growth',
    icon: Route,
    title: 'Structured progression',
    description:
      'The ecosystem is organized around levels, orbit structures, reactivation tokens, and upgrade paths designed to make participation more organized and easier to follow.',
  },
  {
    id: 'community',
    icon: Users,
    title: 'Community-powered movement',
    description:
      'The platform is designed for people who want to build, educate, support, and grow together through contribution, learning, and responsible participation.',
  },
]

const ORBIT_SUMMARY = [
  {
    id: 'p4',
    label: 'P4',
    title: 'Compact orbit',
    text: 'A focused structure for early movement, activation, and recycling.',
  },
  {
    id: 'p12',
    label: 'P12',
    title: 'Growth orbit',
    text: 'A wider structure designed for deeper network visibility and participation.',
  },
  {
    id: 'p39',
    label: 'P39',
    title: 'Expansion orbit',
    text: 'A larger orbit layer that supports broader progression and long-term ecosystem depth.',
  },
]

const ECOSYSTEM_LAYERS = [
  {
    id: 'f-freedom',
    icon: Orbit,
    title: 'F-Freedom Program',
    status: 'Current focus',
    description:
      'The foundation of the ecosystem, built around orbit participation, level progression, and transparent smart-contract logic.',
  },
  {
    id: 'tokens',
    icon: CircleDollarSign,
    title: 'Utility tokens',
    status: 'Protocol layer',
    description:
      'FGT and FGTr support the internal utility structure of the platform, including reactivation and participation-related flows.',
  },
  {
    id: 'marketplace',
    icon: Landmark,
    title: 'Marketplace & future services',
    status: 'Expansion layer',
    description:
      'Future ecosystem services are planned to increase utility, education, and access inside the Fin Freedom Network.',
  },
]

const SAFETY_NOTES = [
  'Fin Freedom Network does not hold your private keys or recovery phrase.',
  'Wallet addresses and blockchain transactions are public and irreversible.',
  'The platform does not guarantee income, profit, referrals, or future outcomes.',
  'Users are responsible for checking local laws, taxes, and personal risk before participating.',
]

const AboutPage = ({ onNavigate }) => {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero__bg" />
        <div className="about-hero__overlay" />

        <div className="about-hero__container">
          <div className="about-hero__layout">
            <div className="about-hero__content">
              <div className="about-hero__eyebrow glass-panel">
                <span className="about-hero__eyebrow-dot" />
                <span className="about-hero__eyebrow-text">
                  About Fin Freedom Network
                </span>
              </div>

              <div className="about-hero__text-block">
                <h1 className="about-hero__title">
                  A transparent orbit ecosystem for structured digital participation.
                </h1>

                <p className="about-hero__description soft-text">
                  Fin Freedom Network is a blockchain-powered ecosystem built to make
                  participation, progression, and contribution easier to understand.
                  The F-Freedom Program is its first major program, using wallet-first
                  access, smart-contract logic, and orbit-based structures to organize
                  how users move through the platform.
                </p>
              </div>

              <div className="about-hero__actions">
                <button
                  type="button"
                  className="about-hero__primary-btn"
                  onClick={() => onNavigate?.('activation')}
                >
                  <span>Open Activation Center</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  className="about-hero__secondary-btn"
                  onClick={() => onNavigate?.('support')}
                >
                  Learn safety rules
                </button>
              </div>
            </div>

            <aside className="about-hero__panel glass-panel">
              <div className="about-hero__panel-head">
                <div className="about-hero__panel-icon">
                  <Sparkles size={22} />
                </div>
                <div>
                  <span className="about-hero__panel-kicker muted-text">
                    Core identity
                  </span>
                  <h2 className="about-hero__panel-title">
                    Built for clarity, not confusion.
                  </h2>
                </div>
              </div>

              <div className="about-hero__signal-grid">
                <div className="about-hero__signal">
                  <span className="about-hero__signal-label muted-text">Access</span>
                  <strong>Non-custodial</strong>
                </div>
                <div className="about-hero__signal">
                  <span className="about-hero__signal-label muted-text">Logic</span>
                  <strong>Smart contracts</strong>
                </div>
                <div className="about-hero__signal">
                  <span className="about-hero__signal-label muted-text">Model</span>
                  <strong>Orbit progression</strong>
                </div>
                <div className="about-hero__signal">
                  <span className="about-hero__signal-label muted-text">Focus</span>
                  <strong>Community growth</strong>
                </div>
              </div>

              <div className="about-hero__notice">
                <ShieldCheck size={18} />
                <p>
                  Participation is voluntary. Every user should understand wallet safety,
                  transaction finality, and platform risks before joining.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="who-we-are" className="about-section about-origin">
        <div className="about-origin__container">
          <div className="about-origin__header">
            <span className="about-section-heading__eyebrow">Why this exists</span>
            <h2 className="about-section-heading__title">
              Trust isn’t given — it’s engineered.
            </h2>
          </div>

          <div className="about-origin__content">
            <p>
              This project was not created in ideal conditions. It was shaped by direct
              experience with how trust can fail in decentralized environments.
            </p>

            <p>
              The team behind Fin Freedom has operated within complex systems and has
              witnessed how opacity, misaligned incentives, and weak structures can
              undermine confidence and long-term sustainability.
            </p>

            <p>
              Instead of adapting to those patterns, a different approach was taken:
              to build a system where trust is not assumed — but verifiable.
            </p>

            <p className="about-origin__highlight">
              This project exists to reinforce the original promise of Web3:
              reducing reliance on individuals and replacing it with transparent,
              enforceable systems.
            </p>
          </div>
        </div>
      </section>

      <section id="our-purpose" className="about-section about-purpose">
        <div className="about-purpose__layout">
          <div className="about-section-heading">
            <span className="about-section-heading__eyebrow">Our purpose</span>
            <h2 className="about-section-heading__title">
              Building a structure where participation creates visible value.
            </h2>
            <p className="about-section-heading__text soft-text">
              Fin Freedom exists to replace unclear promises with transparent rules,
              wallet-first access, and systems that allow users to verify how movement,
              progression, and participation are handled.
            </p>
          </div>

          <div className="about-purpose__visual glass-panel">
            <div className="about-purpose__orbit">
              <span />
              <span />
              <span />
              <strong>FFN</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section about-mission">
        <div className="about-section-heading">
          <span className="about-section-heading__eyebrow">Our mission</span>
          <h2 className="about-section-heading__title">
            To make decentralized participation more understandable, transparent, and structured.
          </h2>
          <p className="about-section-heading__text soft-text">
            Fin Freedom Network is not designed as a bank, broker, investment company,
            or custody service. It is a digital ecosystem where users interact through
            their own wallets and follow rules executed by smart contracts.
          </p>
        </div>

        <div className="about-mission__grid">
          {ABOUT_PILLARS.map((pillar) => {
            const Icon = pillar.icon

            return (
              <article key={pillar.id} className="about-mission__card glass-panel">
                <div className="about-mission__icon">
                  <Icon size={22} />
                </div>
                <h3>{pillar.title}</h3>
                <p className="soft-text">{pillar.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section id="our-foundation" className="about-section about-principles">
        <div className="about-section-heading">
          <span className="about-section-heading__eyebrow">Core principles</span>
          <h2 className="about-section-heading__title">
            Designed to be verifiable, not assumed.
          </h2>
        </div>

        <div className="about-principles__grid">
          {[
            {
              icon: Eye,
              title: 'Verifiable transparency',
              text: 'All activity is designed to be visible and independently verifiable on-chain. No hidden wallets. No undisclosed flows.',
            },
            {
              icon: Network,
              title: 'Distributed governance',
              text: 'Decision-making power is structured to expand over time. Governance is executable, not symbolic.',
            },
            {
              icon: LockKeyhole,
              title: 'Code-enforced logic',
              text: 'Core operations are handled by smart contracts. Rules are not interpreted — they are enforced.',
            },
            {
              icon: ShieldCheck,
              title: 'Protection by design',
              text: 'Mechanisms are structured to reduce unfair advantage and system exploitation.',
            },
            {
              icon: Route,
              title: 'Sustainable growth logic',
              text: 'No artificial urgency. No hidden mechanics. Participation follows transparent progression.',
            },
          ].map((item, index) => {
            const Icon = item.icon
            return (
              <article key={index} className="about-principles__card glass-panel">
                <Icon size={22} />
                <h3>{item.title}</h3>
                <p className="soft-text">{item.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="about-section about-program">
        <div className="about-program__layout">
          <div className="about-program__content">
            <div className="about-section-heading about-section-heading--compact">
              <span className="about-section-heading__eyebrow">The F-Freedom Program</span>
              <h2 className="about-section-heading__title">
                The first participation engine inside the Fin Freedom ecosystem.
              </h2>
              <p className="about-section-heading__text soft-text">
                The F-Freedom Program organizes users across levels and orbit structures.
                Instead of hiding the process, the interface is designed to show status,
                orbit movement, receipts, history, and account activity as clearly as possible.
              </p>
            </div>

            <div className="about-program__bullets">
              <div className="about-program__bullet">
                <BadgeCheck size={18} />
                <span>Level-based participation from entry to advanced progression.</span>
              </div>
              <div className="about-program__bullet">
                <Network size={18} />
                <span>Orbit structures designed around P4, P12, and P39 patterns.</span>
              </div>
              <div className="about-program__bullet">
                <LockKeyhole size={18} />
                <span>Wallet-first access with user-controlled signing and confirmation.</span>
              </div>
            </div>
          </div>

          <div className="about-program__orbits">
            {ORBIT_SUMMARY.map((orbit) => (
              <article
                key={orbit.id}
                className={`about-program__orbit-card about-program__orbit-card--${orbit.id} glass-panel`}
              >
                <span className="about-program__orbit-label">{orbit.label}</span>
                <h3>{orbit.title}</h3>
                <p className="soft-text">{orbit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section about-ecosystem">
        <div className="about-section-heading">
          <span className="about-section-heading__eyebrow">Ecosystem direction</span>
          <h2 className="about-section-heading__title">
            More than one page. More than one feature.
          </h2>
          <p className="about-section-heading__text soft-text">
            The long-term direction is to build a cleaner ecosystem around participation,
            token utility, education, marketplace access, community updates, and better
            transparency tools.
          </p>
        </div>

        <div className="about-ecosystem__grid">
          {ECOSYSTEM_LAYERS.map((layer) => {
            const Icon = layer.icon

            return (
              <article key={layer.id} className="about-ecosystem__card glass-panel">
                <div className="about-ecosystem__top">
                  <div className="about-ecosystem__icon">
                    <Icon size={22} />
                  </div>
                  <span className="about-ecosystem__status">{layer.status}</span>
                </div>
                <h3>{layer.title}</h3>
                <p className="soft-text">{layer.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section id="our-core-values" className="about-section about-values">
        <div className="about-section-heading">
          <span className="about-section-heading__eyebrow">Core values</span>
          <h2 className="about-section-heading__title">
            Values are not stated — they are reflected in design.
          </h2>
        </div>

        <div className="about-values__long">
          <p>
            We know that today it is easy to speak great words. Far more difficult is
            to uphold them over time.
          </p>

          <p>
            For this reason, trust does not arise from what is promised, but from what
            is built. It is not words that define a system, but structure, decisions,
            and consistency.
          </p>

          <p>
            Fin Freedom was built on the belief that a different approach is possible:
            one where participation, fairness, and transparency coexist.
          </p>

          <p>
            We believe that participation is the foundation of value — not speculation,
            not privilege, and not chance.
          </p>

          <p>
            We believe in systems that are sustainable, visible, and predictable over
            time.
          </p>

          <p>
            We believe knowledge is the first instrument of freedom, and that growth
            should occur on multiple levels: human, professional, and financial.
          </p>

          <p>
            We believe in honesty, responsibility, and addressing challenges directly.
          </p>

          <p className="about-values__highlight">
            We believe that prosperity and values can coexist — and that a global
            system can be built on respect, dignity, and shared advancement.
          </p>
        </div>
      </section>

      <section id="our-commitment" className="about-section about-commitment">
        <div className="about-commitment__inner glass-panel">
          <div className="about-section-heading">
            <span className="about-section-heading__eyebrow">Our commitment</span>
            <h2 className="about-section-heading__title">
              This project does not ask for blind belief. It invites verification.
            </h2>
            <p className="about-section-heading__text soft-text">
              The system is designed so trust is minimized through verification,
              decision-making is structured, and no participant holds unchecked control.
              Its success depends on whether the system operates openly, fairly, and
              without exception.
            </p>
          </div>

          <div className="about-commitment__grid">
            <div className="about-commitment__item">No hidden wallets</div>
            <div className="about-commitment__item">No undisclosed flows</div>
            <div className="about-commitment__item">No unchecked control</div>
            <div className="about-commitment__item">No symbolic governance</div>
          </div>
        </div>
      </section>

      <section className="about-section about-cta">
        <div className="about-cta__inner glass-panel">
          <div>
            <span className="about-section-heading__eyebrow">Ready to continue?</span>
            <h2>Explore the program from the right page.</h2>
            <p className="soft-text">
              Start from the Activation Center if you want to register or activate a level.
              Open Support if you want to review wallet safety, risks, or platform guidance first.
            </p>
          </div>

          <div className="about-cta__actions">
            <button
              type="button"
              className="about-hero__primary-btn"
              onClick={() => onNavigate?.('activation')}
            >
              Activation Center
            </button>
            <button
              type="button"
              className="about-hero__secondary-btn"
              onClick={() => onNavigate?.('support')}
            >
              Open Support
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default AboutPage
