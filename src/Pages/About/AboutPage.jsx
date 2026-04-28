import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CircleDollarSign,
  Eye,
  GraduationCap,
  Image,
  Landmark,
  LockKeyhole,
  Network,
  Orbit,
  Route,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import './AboutPage.css'

const ECOSYSTEM_LAYERS = [
  {
    id: 'f-freedom',
    icon: Orbit,
    title: 'F-Freedom Program',
    status: 'Live program',
    description: 'The core participation engine built around structured levels, orbit movement, and transparent smart-contract logic.',
  },
  {
    id: 'freedom-plus',
    icon: Sparkles,
    title: 'Freedom-Plus Program',
    status: 'Expansion layer',
    description: 'A planned service layer for broader community participation, utility access, and long-term member development.',
  },
  {
    id: 'freedom-nft',
    icon: Image,
    title: 'Freedom NFT Program',
    status: 'Creative layer',
    description: 'A future digital ownership layer designed for identity, access, recognition, and ecosystem utility.',
  },
  {
    id: 'marketplace',
    icon: ShoppingBag,
    title: 'Fin Freedom Marketplace',
    status: 'Commerce layer',
    description: 'A planned marketplace for services, digital products, ecosystem tools, and community-driven value exchange.',
  },
  {
    id: 'coin',
    icon: CircleDollarSign,
    title: 'Fin Freedom Coin',
    status: 'Future asset',
    description: 'A future ecosystem asset concept intended to support utility, access, and broader platform growth.',
  },
  {
    id: 'institute',
    icon: GraduationCap,
    title: 'Fin Freedom Institute',
    status: 'Education layer',
    description: 'A learning and development layer focused on financial education, Web3 literacy, and professional growth.',
  },
]

const ThemeImage = ({ darkSrc, lightSrc, alt, className = '' }) => (
  <>
    <img src={darkSrc} alt={alt} className={`about-theme-image about-theme-image--dark ${className}`} />
    <img src={lightSrc} alt={alt} className={`about-theme-image about-theme-image--light ${className}`} />
  </>
)

const AboutPage = ({ onNavigate }) => {
  return (
    <main className="about-page">
      <section className="about-hero about-hero--image-only" aria-label="About Fin Freedom Network">
        <div className="about-hero__picture">
          <ThemeImage
            darkSrc="/images/about/about-hero-dark.jpg"
            lightSrc="/images/about/about-hero-light.jpg"
            alt="F-Freedom Program overview"
            className="about-hero__image"
          />
        </div>
      </section>

      <section id="who-we-are" className="about-section about-cover-section">
        <div className="about-cover">
          <div className="about-cover__content about-reveal">
            <span className="about-section-heading__eyebrow">Who we are</span>
            <h2 className="about-section-heading__title">A structured Web3 ecosystem built around participation.</h2>
            <p className="about-section-heading__text">
              Fin Freedom Network is designed around transparency, long-term sustainability, and meaningful digital participation.
            </p>
            <span className="about-cover__hint">Read the visual →</span>
          </div>

          <div className="about-cover__media about-reveal">
            <ThemeImage
              darkSrc="/images/about/who-we-are-dark.jpg"
              lightSrc="/images/about/who-we-are-light.jpg"
              alt="Who we are visual"
            />
          </div>
        </div>
      </section>

      <section id="our-purpose" className="about-section about-cover-section">
        <div className="about-cover">
          <div className="about-cover__content about-reveal">
            <span className="about-section-heading__eyebrow">Our purpose</span>
            <h2 className="about-section-heading__title">Building a system where opportunity is structured and visible.</h2>
            <p className="about-section-heading__text">
              This section explains the vision, mission, and philosophy behind the Fin Freedom ecosystem.
            </p>
            <span className="about-cover__hint">Read the visual →</span>
          </div>

          <div className="about-cover__media about-reveal">
            <ThemeImage
              darkSrc="/images/about/our-purpose-dark.jpg"
              lightSrc="/images/about/our-purpose-light.jpg"
              alt="Our purpose visual"
            />
          </div>
        </div>
      </section>

      <section id="our-foundation" className="about-section about-cover-section">
        <div className="about-cover">
          <div className="about-cover__content about-reveal">
            <span className="about-section-heading__eyebrow">Our foundation</span>
            <h2 className="about-section-heading__title">Structure, technology, education, and community growth.</h2>
            <p className="about-section-heading__text">
              Fin Freedom is built on transparent systems, smart contract logic, educational empowerment, and long-term community participation.
            </p>
            <span className="about-cover__hint">Read the visual →</span>
          </div>

          <div className="about-cover__media about-reveal">
            <ThemeImage
              darkSrc="/images/about/our-foundation-dark.jpg"
              lightSrc="/images/about/our-foundation-light.jpg"
              alt="Our foundation visual"
            />
          </div>
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

          <div className="about-image-card about-image-card--program glass-panel">
            <img
              src="/images/about/triple-p-orbit-dark.jpg"
              alt="Triple-P Orbit Engine showing P4, P12 and P39 orbit structures"
              className="about-theme-image about-theme-image--dark"
            />
            <img
              src="/images/about/triple-p-orbit-light.jpg"
              alt="Triple-P Orbit Engine showing P4, P12 and P39 orbit structures"
              className="about-theme-image about-theme-image--light"
            />
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

      <section id="our-core-values" className="about-section about-cover-section">
        <div className="about-cover">
          <div className="about-cover__content about-reveal">
            <span className="about-section-heading__eyebrow">Core values</span>
            <h2 className="about-section-heading__title">Values are not stated — they are reflected in design.</h2>
            <p className="about-section-heading__text">
              The values section explains the beliefs behind participation, fairness, education, transparency, and shared prosperity.
            </p>
            <span className="about-cover__hint">Read the visual →</span>
          </div>

          <div className="about-cover__media about-reveal">
            <ThemeImage
              darkSrc="/images/about/core-values-dark.jpg"
              lightSrc="/images/about/core-values-light.jpg"
              alt="Core values visual"
            />
          </div>
        </div>
      </section>

      <section id="our-commitment" className="about-section about-cover-section">
        <div className="about-cover">
          <div className="about-cover__content about-reveal">
            <span className="about-section-heading__eyebrow">Our commitment</span>
            <h2 className="about-section-heading__title">Transparency, security, fairness, and long-term sustainability.</h2>
            <p className="about-section-heading__text">
              This section explains the standard Fin Freedom commits to as the ecosystem grows.
            </p>
            <span className="about-cover__hint">Read the visual →</span>
          </div>

          <div className="about-cover__media about-reveal">
            <ThemeImage
              darkSrc="/images/about/our-commitment-dark.jpg"
              lightSrc="/images/about/our-commitment-light.jpg"
              alt="Our commitment visual"
            />
          </div>
        </div>
      </section>

      <section className="about-section about-cover-section">
        <div className="about-cover">
          <div className="about-cover__content about-reveal">
            <span className="about-section-heading__eyebrow">Together we build freedom</span>
            <h2 className="about-section-heading__title">One network. One community. One freedom.</h2>
            <p className="about-section-heading__text">
              A closing visual message for the community, showing the movement and long-term vision.
            </p>
            <span className="about-cover__hint">Read the visual →</span>
          </div>

          <div className="about-cover__media about-reveal">
            <ThemeImage
              darkSrc="/images/about/together-dark.jpg"
              lightSrc="/images/about/together-light.jpg"
              alt="Together we build freedom visual"
            />
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
              className="about-btn about-btn--primary"
              onClick={() => onNavigate?.('activation')}
            >
              <span>Activation Center</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="about-btn about-btn--secondary"
              onClick={() => onNavigate?.('support')}
            >
              <BookOpen size={18} />
              <span>Get more resources</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default AboutPage


