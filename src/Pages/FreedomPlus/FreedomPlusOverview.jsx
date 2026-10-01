import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FREEDOM_PLUS_LEVELS } from '../../Services/freedomPlus'
import {
  ArrowRight,
  CheckCircle2,
  ChevronsUp,
  Coins,
  Compass,
  DoorOpen,
  Eye,
  Expand,
  Gem,
  Gauge,
  Layers3,
  LockKeyhole,
  Network,
  Orbit,
  Recycle,
  ShieldCheck,
  Sparkles,
  Trophy,
  Star,
  Zap,
  Wallet,
  X,
} from 'lucide-react'

const HERO_IMAGES = {
  dark: '/images/freedom-plus/freedom-plus-hero-dark.png',
  light: '/images/freedom-plus/freedom-plus-hero-light.png',
  mobileDark: '/images/freedom-plus/freedom-plus-hero-mobile-dark.png',
  mobileLight: '/images/freedom-plus/freedom-plus-hero-mobile-light.png',
}

const HERO_FEATURES = [
  { title: '7 Premium Levels', text: 'Manual advancement from 50 to 36,450 USDT.', icon: Layers3 },
  { title: 'Multiple Orbit Engines', text: 'P39, P14, P12, P6, P4 and P3 structures.', icon: Orbit },
  { title: 'Manual Progression', text: 'You decide when to activate each next level.', icon: CheckCircle2 },
  { title: 'Automatic Recycling', text: 'Completed cycles reopen the same active level.', icon: Recycle },
  { title: 'Token Rewards', text: 'FPT on activation and FPTr on recycle.', icon: Coins },
]

const WHY_IMAGES = {
  dark: '/images/freedom-plus/why-freedom-plus-dark.png',
  light: '/images/freedom-plus/why-freedom-plus-light.png',
  mobileDark: '/images/freedom-plus/why-freedom-plus-mobile-dark.png',
  mobileLight: '/images/freedom-plus/why-freedom-plus-mobile-light.png',
}

const WHY_TRUST_POINTS = [
  { title: 'Manual Control', text: 'You choose when to activate each next level.', icon: LockKeyhole },
  { title: 'Defined Execution', text: 'Placements, payments and cycles follow programmed rules.', icon: Eye },
  { title: 'Structured Opportunity', text: 'Seven levels provide a clear path for deeper participation.', icon: Compass },
]

const WHY_PILLARS = [
  { title: 'Advanced Ecosystem Positioning', icon: Network },
  { title: 'FPT and FPTr Utility', icon: Coins },
  { title: 'Freedom NFT Qualification Path', icon: Gem },
]

const LEVEL_PRESENTATION = {
  1: { text: 'Registration activates Level 1 and begins your Freedom-Plus journey.', icon: DoorOpen, tone: 'blue' },
  2: { text: 'Your first participant-controlled progression into a new orbit structure.', icon: Zap, tone: 'cyan' },
  3: { text: 'A broader participation stage built around two structured rings.', icon: Expand, tone: 'green' },
  4: { text: 'A focused six-position orbit for deliberate continued progression.', icon: Gauge, tone: 'yellow' },
  5: { text: 'An advanced four-position orbit with participant-controlled entry.', icon: ChevronsUp, tone: 'orange' },
  6: { text: 'A higher-commitment P4 stage for deeper ecosystem positioning.', icon: Star, tone: 'purple' },
  7: { text: 'The final Freedom-Plus level and highest progression milestone.', icon: Trophy, tone: 'gold' },
}

const PROGRESSION_LEVELS = FREEDOM_PLUS_LEVELS.map(({ level, stage, orbit, price }) => ({
  ...LEVEL_PRESENTATION[level],
  number: level,
  title: stage,
  orbit,
  price: price.toLocaleString('en-US'),
}))

const ORBIT_ENGINES = [
  { name: 'P39', label: '3 rings', rings: [3, 9, 27], parents: [0, 0, 0, 1, 2, 3, 1, 2, 3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 4, 5, 6, 7, 8, 9, 10, 11, 12, 4, 5, 6, 7, 8, 9, 10, 11, 12], tone: 'blue', description: 'Three first-ring positions, each parenting three second-ring positions, which each parent three third-ring positions.' },
  { name: 'P14', label: '3 rings', rings: [2, 4, 8], parents: [0, 0, 1, 2, 1, 2, 3, 4, 5, 6, 3, 4, 5, 6], tone: 'cyan', description: 'Two first-ring positions, each parenting two second-ring positions, which each parent two third-ring positions.' },
  { name: 'P12', label: '2 rings', rings: [3, 9], parents: [0, 0, 0, 1, 2, 3, 1, 2, 3, 1, 2, 3], tone: 'green', description: 'Three first-ring positions, each structurally parenting three second-ring positions.' },
  { name: 'P6', label: '2 rings', rings: [2, 4], parents: [0, 0, 1, 2, 1, 2], tone: 'yellow', description: 'Two first-ring positions, each structurally parenting two second-ring positions.' },
  { name: 'P4', label: '1 ring', rings: [4], parents: [0, 0, 0, 0], tone: 'orange', description: 'Four direct positions: three payable arrivals and one complete recycle arrival.' },
  { name: 'P3', label: '1 ring', rings: [3], parents: [0, 0, 0], tone: 'purple', description: 'Three direct positions: two payable arrivals and one complete recycle arrival.' },
]

const ECONOMICS = [
  { level: 1, orbit: 'P39', price: '50', distribution: '20% / 20% / 50%', charge: '5', gross: '795', recycle: '50', net: '745' },
  { level: 2, orbit: 'P14', price: '150', distribution: '15% / 25% / 50%', charge: '15', gross: '795', recycle: '150', net: '645' },
  { level: 3, orbit: 'P12', price: '450', distribution: '40% / 50%', charge: '45', gross: '2,565', recycle: '450', net: '2,115' },
  { level: 4, orbit: 'P6', price: '1,350', distribution: '40% / 50%', charge: '135', gross: '3,780', recycle: '1,350', net: '2,430' },
  { level: 5, orbit: 'P4', price: '4,050', distribution: '90% payable', charge: '405', gross: '14,985', recycle: '4,050', net: '10,935' },
  { level: 6, orbit: 'P4', price: '12,150', distribution: '90% payable', charge: '1,215', gross: '44,955', recycle: '12,150', net: '32,805' },
  { level: 7, orbit: 'P3', price: '36,450', distribution: '90% payable', charge: '3,645', gross: '102,060', recycle: '36,450', net: '65,610' },
]

function buildOrbitNodes(rings) {
  const center = 145
  const radii = rings.length === 1 ? [106] : rings.length === 2 ? [66, 124] : [54, 96, 136]
  const nodes = []
  let firstPosition = 1

  rings.forEach((count, ringIndex) => {
    for (let offset = 0; offset < count; offset += 1) {
      const position = firstPosition + offset
      const angle = -90 + (360 / count) * offset
      const radians = angle * Math.PI / 180
      nodes.push({
        position,
        ring: ringIndex + 1,
        x: center + Math.cos(radians) * radii[ringIndex],
        y: center + Math.sin(radians) * radii[ringIndex],
      })
    }
    firstPosition += count
  })

  return nodes
}

function OrbitDiagram({ engine }) {
  const nodes = buildOrbitNodes(engine.rings)

  return (
    <div className={`fp-orbit-diagram fp-orbit-diagram--${engine.rings.length}`} aria-label={`${engine.name}: ${engine.rings.join(', ')} positions grouped by structural parent`}>
      <div className="fp-orbit-diagram__stage">
        <svg viewBox="0 0 290 290" aria-hidden="true">
          {engine.rings.map((_, index) => <circle key={index} cx="145" cy="145" r={engine.rings.length === 1 ? 106 : engine.rings.length === 2 ? [66, 124][index] : [54, 96, 136][index]} className={`fp-orbit-diagram__track fp-orbit-diagram__track--${index + 1}`} />)}
        </svg>
        <span className="fp-orbit-diagram__core"><Orbit /></span>
        {engine.rings.map((_, ringIndex) => (
          <span key={ringIndex} className={`fp-orbit-diagram__node-layer fp-orbit-diagram__node-layer--${ringIndex + 1}`}>
            {nodes.filter((node) => node.ring === ringIndex + 1).map((node) => <i key={node.position} className={`fp-orbit-diagram__node fp-orbit-diagram__node--ring-${node.ring}`} style={{ left: `${node.x / 2.9}%`, top: `${node.y / 2.9}%` }}><b>{node.position}</b></i>)}
          </span>
        ))}
      </div>
    </div>
  )
}

function useThemeMode() {
  const readTheme = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

function HeroImage() {
  const theme = useThemeMode()
  const desktop = theme === 'light' ? HERO_IMAGES.light : HERO_IMAGES.dark
  const mobile = theme === 'light' ? HERO_IMAGES.mobileLight : HERO_IMAGES.mobileDark

  return (
    <picture className="fp-program-hero__picture">
      <source media="(max-width: 640px)" srcSet={mobile} />
      <img src={desktop} alt="Freedom-Plus Program" className="fp-program-hero__image" />
    </picture>
  )
}

function WhyImage() {
  const theme = useThemeMode()
  const desktop = theme === 'light' ? WHY_IMAGES.light : WHY_IMAGES.dark
  const mobile = theme === 'light' ? WHY_IMAGES.mobileLight : WHY_IMAGES.mobileDark

  return (
    <picture className="fp-program-why__picture">
      <source media="(max-width: 640px)" srcSet={mobile} />
      <img src={desktop} alt="A structured progression pathway through Freedom-Plus" className="fp-program-why__image" />
    </picture>
  )
}

function ProgramNotice({ onClose }) {
  return createPortal(
    <div className="fp-program-notice" role="dialog" aria-modal="true" aria-labelledby="fp-program-notice-title">
      <button type="button" className="fp-program-notice__backdrop" onClick={onClose} aria-label="Close program notice" />
      <div className="fp-program-notice__dialog">
        <button type="button" className="fp-program-notice__close" onClick={onClose} aria-label="Close"><X /></button>
        <span className="fp-program-notice__badge"><ShieldCheck />Program notice</span>
        <h2 id="fp-program-notice-title">Participate with a clear understanding of the rules.</h2>
        <p>Freedom-Plus uses sequential manual activation. Registration activates Level 1, while Levels 2 through 7 are activated only when you choose to proceed.</p>
        <div className="fp-program-notice__points">
          <span><CheckCircle2 />Your existing FFN identity and permanent sponsor are retained.</span>
          <span><CheckCircle2 />There is no automatic upgrade to a higher level.</span>
          <span><CheckCircle2 />A completed orbit automatically reopens that same level.</span>
          <span><CheckCircle2 />All activations, placements, payments and token rewards execute on-chain.</span>
        </div>
        <button type="button" className="fp-program-notice__accept" onClick={onClose}>I understand</button>
      </div>
    </div>,
    document.body
  )
}

export default function FreedomPlusOverview({ registered, openView }) {
  const [noticeOpen, setNoticeOpen] = useState(false)

  return (
    <>
      <section className="fp-program-hero">
        <div className="fp-program-hero__background"><HeroImage /></div>
        <div className="fp-program-hero__overlay" />
        <div className="fp-program-hero__content">
          <span className="fp-program-eyebrow"><Sparkles />Advanced participation program</span>
          <p className="fp-program-hero__subtitle">Advanced Participation, Earning &amp; Progression Layer</p>
          <p className="fp-program-hero__description">A seven-level program for participants who want deeper ecosystem involvement, intentional manual progression, stronger token positioning and a direct pathway toward Freedom NFT membership.</p>
          <div className="fp-program-hero__actions">
            <button type="button" className="fp-program-button fp-program-button--primary" onClick={() => openView('levels')}>
              {registered ? 'Open Level Manager' : 'Join Freedom-Plus'}<ArrowRight />
            </button>
            <button type="button" className="fp-program-button fp-program-button--ghost" onClick={() => setNoticeOpen(true)}>View Program Notice</button>
          </div>
          <div className="fp-program-hero__features">
            {HERO_FEATURES.map((feature) => {
              const FeatureIcon = feature.icon
              return <article key={feature.title}><FeatureIcon /><strong>{feature.title}</strong><span>{feature.text}</span></article>
            })}
          </div>
        </div>
      </section>
      <section className="fp-program-why">
        <div className="fp-program-why__background"><WhyImage /></div>
        <div className="fp-program-why__content">
          <header className="fp-program-why__header">
            <span>Fin Freedom Network</span>
            <h2>Why Freedom-Plus <strong>Matters</strong></h2>
            <p>Intentional growth, strategic decisions and long-term commitment.</p>
          </header>

          <div className="fp-program-why__statement">
            <ShieldCheck />
            <div><strong>Progress is never forced.</strong><span>You choose when to move forward.</span></div>
          </div>

          <div className="fp-program-why__explanation">
            <Orbit />
            <p>Freedom-Plus is the advanced participation layer for members who want deeper ecosystem involvement, stronger token positioning and a deliberate route toward Freedom NFT membership.</p>
          </div>

          <div className="fp-program-why__trust-grid">
            {WHY_TRUST_POINTS.map((point) => {
              const PointIcon = point.icon
              return <article key={point.title}><PointIcon /><strong>{point.title}</strong><span>{point.text}</span></article>
            })}
          </div>

          <div className="fp-program-why__pillars">
            {WHY_PILLARS.map((pillar) => {
              const PillarIcon = pillar.icon
              return <article key={pillar.title}><PillarIcon /><strong>{pillar.title}</strong></article>
            })}
          </div>

          <p className="fp-program-why__slogan">Progress with purpose. Position for the future.</p>
        </div>
      </section>
      <section className="fp-program-levels">
        <div className="fp-program-levels__inner">
          <header className="fp-program-levels__header">
            <span>Your</span>
            <h2>Freedom-Plus</h2>
            <strong>7 Premium Levels</strong>
            <p>Seven sequential levels. Six orbit engines. Progress only when you choose.</p>
          </header>

          <div className="fp-program-levels__rules" aria-label="Freedom-Plus progression rules">
            <span><CheckCircle2 />Level 1 activates with registration</span>
            <span><LockKeyhole />Levels 2–7 are activated manually</span>
            <span><Recycle />Recycling reopens the same level</span>
          </div>

          <div className="fp-program-levels__board">
            {PROGRESSION_LEVELS.map((level) => {
              const LevelIcon = level.icon
              return (
                <article key={level.number} className={`fp-program-level-card fp-program-level-card--${level.tone}`}>
                  <div className="fp-program-level-card__number"><span>Level</span><strong>{level.number}</strong></div>
                  <div className="fp-program-level-card__icon"><LevelIcon /></div>
                  <div className="fp-program-level-card__content">
                    <div className="fp-program-level-card__heading"><h3>{level.title}</h3><span>{level.orbit} Orbit</span></div>
                    <strong className="fp-program-level-card__price">{level.price} <small>USDT</small></strong>
                    <p>{level.text}</p>
                    <div className="fp-program-level-card__rewards"><span>FPT on first activation</span><span>FPTr on recycle</span></div>
                  </div>
                </article>
              )
            })}
          </div>

          <footer className="fp-program-levels__footer">
            <span>Total Levels 1–7</span><strong>54,650 USDT</strong><small>No automatic upgrade to a higher level</small>
          </footer>
        </div>
      </section>
      <section className="fp-program-orbits">
        <div className="fp-program-orbits__inner">
          <header className="fp-program-section-header">
            <span>Deterministic placement</span>
            <h2>Multiple Orbit Engines</h2>
            <p>Every position has a fixed ring, sequence and structural parent.</p>
          </header>
          <div className="fp-program-orbits__grid">
            {ORBIT_ENGINES.map((engine) => (
              <article key={engine.name} className={`fp-program-orbit-card fp-program-orbit-card--${engine.tone}`}>
                <header><strong>{engine.name}</strong><span>{engine.label}</span></header>
                <OrbitDiagram engine={engine} />
                <p>{engine.description}</p>
                <div>{engine.rings.map((count, index) => <span key={index}>Ring {index + 1}: <b>{count}</b></span>)}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="fp-program-economics">
        <div className="fp-program-economics__inner">
          <header className="fp-program-section-header">
            <span>Transparent level economics</span>
            <h2>Price and Income Tables</h2>
            <p>Confirmed activation prices, payout roles, system charges and completed-cycle figures.</p>
          </header>
          <div className="fp-program-price-grid">
            {ECONOMICS.map((row) => (
              <article key={row.level}><span>Level {row.level}</span><strong>{row.orbit}</strong><b>{row.price} <small>USDT</small></b></article>
            ))}
          </div>
          <div className="fp-program-income-table" role="region" aria-label="Freedom-Plus completed-cycle income table" tabIndex="0">
            <table>
              <thead><tr><th>Level</th><th>Orbit</th><th>Price</th><th>Payout roles</th><th>System charge</th><th>Gross cycle</th><th>Recycle</th><th>Net wallet</th></tr></thead>
              <tbody>{ECONOMICS.map((row) => <tr key={row.level}><td>{row.level}</td><td><b>{row.orbit}</b></td><td>{row.price}</td><td>{row.distribution}</td><td>{row.charge}</td><td>{row.gross}</td><td>{row.recycle}</td><td><strong>{row.net}</strong></td></tr>)}</tbody>
            </table>
          </div>
          <p className="fp-program-economics__note">All values are in USDT. The 10% system charge applies to payable positions. Recycle-only arrivals reopen the same level without an additional charge.</p>
        </div>
      </section>
      <section className="fp-program-final">
        <span><Wallet />Ready for intentional progression?</span>
        <h2>Enter the Freedom-Plus Program.</h2>
        <p>Use your existing FFN identity, activate Level 1 with registration and progress through the remaining levels when you choose.</p>
        <button type="button" className="fp-program-button fp-program-button--primary" onClick={() => openView('levels')}>
          {registered ? 'Open Level Manager' : 'Join Freedom-Plus'}<ArrowRight />
        </button>
      </section>
      {noticeOpen && <ProgramNotice onClose={() => setNoticeOpen(false)} />}
    </>
  )
}
