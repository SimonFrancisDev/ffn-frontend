import './LandingPage.css'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Coins,
  Gem,
  GraduationCap,
  Landmark,
  LockKeyhole,
  Network,
  Orbit,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  WalletCards,
} from 'lucide-react'

const programs = [
  {
    title: 'F-Freedom Program',
    label: 'Core progression engine',
    description:
      'The main structured participation system built around activation, orbit movement, transparent progression, and user-controlled wallet access.',
    icon: Orbit,
    accent: 'gold',
  },
  {
    title: 'Freedom-Plus Program',
    label: 'Expansion layer',
    description:
      'A premium growth pathway designed to extend participation opportunities with stronger positioning and broader ecosystem access.',
    icon: Sparkles,
    accent: 'cyan',
  },
  {
    title: 'Freedom NFT Program',
    label: 'Ownership layer',
    description:
      'Digital ownership, identity, membership, collectibles, and utility access built for future ecosystem expansion.',
    icon: Gem,
    accent: 'purple',
  },
  {
    title: 'Fin Freedom Marketplace',
    label: 'Utility commerce layer',
    description:
      'A marketplace environment for ecosystem products, services, digital assets, learning tools, and community-driven offers.',
    icon: ShoppingBag,
    accent: 'green',
  },
  {
    title: 'Fin Freedom Coin',
    label: 'Value identity layer',
    description:
      'The native coin identity of the ecosystem, designed to support recognition, utility, and future value-based integrations.',
    icon: Coins,
    accent: 'orange',
  },
  {
    title: 'Fin Freedom Institute',
    label: 'Knowledge layer',
    description:
      'A learning hub for financial literacy, blockchain education, platform training, and responsible digital participation.',
    icon: GraduationCap,
    accent: 'blue',
  },
]

const ecosystemSteps = [
  'Create wallet access',
  'Choose a program',
  'Activate participation',
  'Track progress clearly',
  'Explore marketplace, coin, NFT, and institute layers',
]

const trustItems = [
  {
    title: 'Wallet-first experience',
    description:
      'Users interact through their own wallet. The experience should feel transparent, modern, and self-controlled.',
    icon: WalletCards,
  },
  {
    title: 'Structured progression',
    description:
      'Every program should feel connected to a larger system, with clear levels, roles, and movement.',
    icon: Network,
  },
  {
    title: 'Transparent participation',
    description:
      'Design language should avoid hype and focus on clarity, rules, receipts, records, and trust.',
    icon: ShieldCheck,
  },
]

const stats = [
  ['6', 'Programs'],
  ['1', 'Unified ecosystem'],
  ['24/7', 'Digital access'],
]

const LandingPage = () => {
  return (
    <main className="ff-landing">
      <section className="ff-hero">
        <div className="ff-hero__bg" aria-hidden="true">
          <span className="ff-orb ff-orb--one" />
          <span className="ff-orb ff-orb--two" />
          <span className="ff-grid-glow" />
        </div>

        <div className="ff-container ff-hero__inner">
          <div className="ff-hero__content">
            <div className="ff-eyebrow">
              <span className="ff-eyebrow__mark">
                <Landmark size={18} />
              </span>
              Fin Freedom Network
            </div>

            <h1>
              One financial ecosystem. <span>Multiple freedom programs.</span>
            </h1>

            <p className="ff-hero__text">
              Fin Freedom brings programs, digital assets, marketplace utility,
              education, and wallet-first participation into one premium,
              structured, and transparent ecosystem.
            </p>

            <div className="ff-hero__actions">
              <a href="#programs" className="ff-btn ff-btn--primary">
                Explore programs <ArrowRight size={18} />
              </a>
              <a href="#ecosystem" className="ff-btn ff-btn--ghost">
                View ecosystem
              </a>
            </div>

            <div className="ff-stats" aria-label="Platform summary">
              {stats.map(([value, label]) => (
                <div className="ff-stat" key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ff-hero-visual" aria-label="Fin Freedom ecosystem visual">
            <div className="ff-system-card">
              <div className="ff-system-card__top">
                <div>
                  <span>Unified System</span>
                  <strong>Fin Freedom</strong>
                </div>
                <BadgeCheck size={22} />
              </div>

              <div className="ff-orbit-map">
                <div className="ff-center-node">
                  <Landmark size={28} />
                  <span>FIN</span>
                </div>

                {programs.map((program, index) => {
                  const Icon = program.icon
                  return (
                    <div
                      className={`ff-node ff-node--${index + 1} ff-node--${program.accent}`}
                      key={program.title}
                    >
                      <Icon size={18} />
                    </div>
                  )
                })}
              </div>

              <div className="ff-system-card__bottom">
                <div>
                  <span>Core principle</span>
                  <strong>Structure before hype</strong>
                </div>
                <LockKeyhole size={20} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ff-section" id="ecosystem">
        <div className="ff-container">
          <div className="ff-section-head">
            <span className="ff-kicker">Ecosystem Architecture</span>
            <h2>Designed like a connected financial universe.</h2>
            <p>
              The landing page should make users immediately understand that
              every program belongs to one bigger structure.
            </p>
          </div>

          <div className="ff-architecture">
            <div className="ff-architecture__main">
              <div className="ff-mini-eyebrow">
                <Network size={18} /> System Flow
              </div>
              <h3>From entry to expansion, every layer has a role.</h3>
              <p>
                Users should not feel lost. They should see where they are,
                what each program does, and how the whole platform connects.
              </p>

              <div className="ff-flow">
                {ecosystemSteps.map((step, index) => (
                  <div className="ff-flow__item" key={step}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="ff-architecture__side">
              <div className="ff-layer-card ff-layer-card--active">
                <span>Core</span>
                <strong>F-Freedom Program</strong>
                <p>The primary participation and progression layer.</p>
              </div>
              <div className="ff-layer-card">
                <span>Growth</span>
                <strong>Freedom-Plus</strong>
                <p>Expansion pathway for deeper ecosystem access.</p>
              </div>
              <div className="ff-layer-card">
                <span>Utility</span>
                <strong>NFT • Marketplace • Coin • Institute</strong>
                <p>Ownership, exchange, identity, and learning layers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ff-section ff-section--soft" id="programs">
        <div className="ff-container">
          <div className="ff-section-head ff-section-head--split">
            <div>
              <span className="ff-kicker">Programs</span>
              <h2>Six programs. One premium experience.</h2>
            </div>
            <p>
              Each card should feel simple, confident, and clickable. No cheap
              crypto noise. Just clear purpose and beautiful structure.
            </p>
          </div>

          <div className="ff-program-grid">
            {programs.map((program) => {
              const Icon = program.icon
              return (
                <article className={`ff-program-card ff-program-card--${program.accent}`} key={program.title}>
                  <div className="ff-program-card__icon">
                    <Icon size={24} />
                  </div>
                  <span>{program.label}</span>
                  <h3>{program.title}</h3>
                  <p>{program.description}</p>
                  <a href="#get-started">
                    Learn more <ArrowRight size={16} />
                  </a>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="ff-section">
        <div className="ff-container">
          <div className="ff-showcase">
            <div className="ff-showcase__content">
              <span className="ff-kicker">Digital Asset Layer</span>
              <h2>Built to support program identity, utility, and ownership.</h2>
              <p>
                The asset section should explain tokens, coin identity, NFTs,
                and marketplace utility in a calm, responsible way. It should
                not promise returns or sound like hype.
              </p>

              <div className="ff-asset-list">
                <div>
                  <Coins size={20} />
                  <span>Coin identity and future utility</span>
                </div>
                <div>
                  <Gem size={20} />
                  <span>NFT ownership and membership design</span>
                </div>
                <div>
                  <ShoppingBag size={20} />
                  <span>Marketplace for useful ecosystem activity</span>
                </div>
              </div>
            </div>

            <div className="ff-coin-visual" aria-hidden="true">
              <div className="ff-coin">
                <span>FF</span>
              </div>
              <div className="ff-coin-base" />
            </div>
          </div>
        </div>
      </section>

      <section className="ff-section">
        <div className="ff-container">
          <div className="ff-trust-grid">
            {trustItems.map((item) => {
              const Icon = item.icon
              return (
                <article className="ff-trust-card" key={item.title}>
                  <Icon size={24} />
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="ff-section ff-section--dark" id="get-started">
        <div className="ff-container">
          <div className="ff-final">
            <div>
              <span className="ff-kicker">Start Here</span>
              <h2>Enter the Fin Freedom ecosystem with clarity.</h2>
              <p>
                Begin from the program that matches your goal, then explore the
                wider ecosystem as your participation grows.
              </p>
            </div>

            <div className="ff-final__actions">
              <a href="#programs" className="ff-btn ff-btn--primary">
                Choose a program <ArrowRight size={18} />
              </a>
              <a href="#ecosystem" className="ff-btn ff-btn--light">
                Understand the system
              </a>
            </div>
          </div>

          <div className="ff-disclaimer">
            <BookOpen size={18} />
            <p>
              Fin Freedom content should be presented as platform information,
              education, and ecosystem participation guidance. Avoid guaranteed
              earning language, hype claims, or financial advice wording.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default LandingPage
