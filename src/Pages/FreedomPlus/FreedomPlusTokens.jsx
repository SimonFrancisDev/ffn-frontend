import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Coins, History, LockKeyhole, RefreshCw, X } from 'lucide-react'
import { NETWORK_CONFIG } from '../../constants/addresses'
import { formatToken } from '../../Services/freedomPlus'

const FILTERS = [
  ['all', 'All activity'],
  ['fpt', 'FPT earned'],
  ['fptr', 'FPTr earned'],
  ['utility', 'Locks and utility'],
]

function categoryLabel(item) {
  const labels = {
    fpt: 'FPT activation reward',
    fptr: 'FPTr recycle reward',
    token_lock: 'Tokens locked',
    token_unlock: 'Tokens unlocked',
    token_burn: 'Tokens used for utility',
    nft_membership: 'NFT membership updated',
    nft_eligibility: 'NFT eligibility updated',
  }
  return labels[item.category] || String(item.eventName || item.category || 'Protocol activity').replaceAll('_', ' ')
}

function tokenName(item) {
  if (item.category === 'fptr' || String(item.contractKey).toLowerCase() === 'fptr') return 'FPTr'
  return 'FPT'
}

function narrative(item) {
  const amount = formatToken(item.amount)
  if (item.category === 'fpt') return `Level ${item.level} activated. ${amount} FPT was issued.`
  if (item.category === 'fptr') return `Level ${item.level} completed a cycle. ${amount} FPTr was issued.`
  if (item.category === 'token_lock') return `${amount} ${tokenName(item)} was locked for ecosystem utility.`
  if (item.category === 'token_unlock') return `${amount} ${tokenName(item)} was returned to the available balance.`
  if (item.category === 'token_burn') return `${amount} ${tokenName(item)} was used and permanently burned.`
  return categoryLabel(item)
}

function matchesFilter(item, filter) {
  if (filter === 'all') return true
  if (filter === 'fpt') return item.category === 'fpt'
  if (filter === 'fptr') return item.category === 'fptr'
  return ['token_lock', 'token_unlock', 'token_burn', 'nft_membership', 'nft_eligibility'].includes(item.category)
}

export default function FreedomPlusTokens({ account, data, loading, onRefresh, readIssues = [] }) {
  const [welcomeOpen, setWelcomeOpen] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!welcomeOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => { if (event.key === 'Escape') setWelcomeOpen(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [welcomeOpen])
  const ledger = useMemo(() => data?.ledger || [], [data?.ledger])
  const filtered = useMemo(() => ledger.filter((item) => matchesFilter(item, filter)), [filter, ledger])
  const visible = expanded ? filtered : filtered.slice(0, 5)
  const counts = useMemo(() => ({
    all: ledger.length,
    fpt: ledger.filter((item) => item.category === 'fpt').length,
    fptr: ledger.filter((item) => item.category === 'fptr').length,
    utility: ledger.filter((item) => matchesFilter(item, 'utility')).length,
  }), [ledger])
  const explorer = `${NETWORK_CONFIG.blockExplorerUrls[0].replace(/\/$/, '')}/tx/`

  const cards = [
    {
      key: 'fpt', title: 'FPT - Activation Rewards', image: '/images/fpt.png',
      total: data?.chain?.fptTotal ?? 'Unavailable',
      available: data?.chain?.fpt ?? 'Unavailable', locked: data?.chain?.fptLocked ?? 'Unavailable',
      stale: readIssues.some((item) => item.startsWith('FPT ')),
      note: 'First activation rewards. Available FPT qualifies for Freedom NFT membership.',
    },
    {
      key: 'fptr', title: 'FPTr - Recycle Rewards', image: '/images/fptr.png',
      total: data?.chain?.fptrTotal ?? 'Unavailable',
      available: data?.chain?.fptr ?? 'Unavailable', locked: data?.chain?.fptrLocked ?? 'Unavailable',
      stale: readIssues.some((item) => item.startsWith('FPTr ')),
      note: 'Issued when a Freedom-Plus orbit completes and re-enters the same level.',
    },
  ]

  return (
    <section className="fp-token-page">
      <header className="fp-token-hero">
        <div>
          <span className="fp-token-eyebrow">Freedom-Plus utility assets</span>
          <h1>My FPT and FPTr Tokens</h1>
          <p>Track activation rewards, recycle rewards, available balances and every verifiable token event.</p>
          <small title={account}>{account}</small>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="fp-token-refresh">
          <RefreshCw className={loading ? 'spin' : ''} /> {loading ? 'Refreshing' : 'Refresh data'}
        </button>
      </header>

      <div className="fp-token-card-grid">
        {cards.map((card) => (
          <article className={`fp-token-card fp-token-card--${card.key}`} key={card.key}>
            <div className="fp-token-card-copy">
              <span>{card.title}</span>
              <strong>{card.total}</strong>
              {card.stale && <em>Live verification pending</em>}
              <div><small>Available <b>{card.available}</b></small><small>Locked <b>{card.locked}</b></small></div>
              <p>{card.note}</p>
            </div>
            <img src={card.image} alt={`${card.key} token`} />
          </article>
        ))}
      </div>

      <section className="fp-token-timeline">
        <div className="fp-token-section-heading">
          <div><History /><span><b>Reward activity timeline</b><small>Newest indexed token event first</small></span></div>
          <strong>{ledger.length} records</strong>
        </div>
        {ledger.length ? visible.map((item) => (
          <article className={`fp-token-event fp-token-event--${item.category}`} key={item._id || `${item.txHash}-${item.logIndex}`}>
            <span className="fp-token-event-badge">{tokenName(item)}</span>
            <div><strong>{categoryLabel(item)}</strong><p>{narrative(item)}</p><small>{new Date(item.timestamp).toLocaleString()} · Block {item.blockNumber}</small></div>
            <a href={`${explorer}${item.txHash}`} target="_blank" rel="noreferrer" title="Verify transaction"><ArrowUpRight /></a>
          </article>
        )) : <div className="fp-token-empty"><Coins /><strong>No token activity yet</strong><p>FPT appears after a first activation. FPTr appears after a completed orbit cycle.</p></div>}
        {filtered.length > 5 && <button type="button" className="fp-token-show-all" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show less' : `View all ${filtered.length} records`}</button>}
      </section>

      <section className="fp-token-records">
        <div className="fp-token-section-heading"><div><Coins /><span><b>Detailed token records</b><small>Filter and verify indexed on-chain activity</small></span></div></div>
        <div className="fp-token-filters" role="tablist" aria-label="Token record filters">
          {FILTERS.map(([value, label]) => <button type="button" className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); setExpanded(false) }} key={value}>{label}<span>{counts[value]}</span></button>)}
        </div>
        <div className="fp-table-wrap fp-token-table"><table><thead><tr><th>Token</th><th>Amount</th><th>Level</th><th>Activity</th><th>Date</th><th>Transaction</th></tr></thead><tbody>{filtered.length ? filtered.map((item) => <tr key={item._id || `table-${item.txHash}-${item.logIndex}`}><td><span className="fp-token-table-badge">{tokenName(item)}</span></td><td>{formatToken(item.amount)}</td><td>{item.level || '-'}</td><td>{categoryLabel(item)}</td><td>{new Date(item.timestamp).toLocaleDateString()}</td><td><a href={`${explorer}${item.txHash}`} target="_blank" rel="noreferrer">Verify <ArrowUpRight /></a></td></tr>) : <tr><td colSpan="6" className="fp-no-data">No records match this filter.</td></tr>}</tbody></table></div>
      </section>

      {welcomeOpen && <div className="fp-token-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setWelcomeOpen(false) }}><section className="fp-token-modal" role="dialog" aria-modal="true" aria-labelledby="fp-token-modal-title"><button type="button" className="fp-token-modal-close" onClick={() => setWelcomeOpen(false)} aria-label="Close"><X /></button><div className="fp-token-modal-coins"><img src="/images/fpt.png" alt="FPT token" /><img src="/images/fptr.png" alt="FPTr token" /></div><span>Freedom-Plus token center</span><h2 id="fp-token-modal-title">Your participation rewards, clearly recorded</h2><p>FPT records first level activations. FPTr records completed orbit cycles and re-entry. Every record below is linked to its Amoy transaction.</p><div className="fp-token-modal-points"><span><Coins /> Activation rewards</span><span><RefreshCw /> Recycle rewards</span><span><LockKeyhole /> Available and locked balances</span></div><button type="button" className="fp-token-modal-continue" onClick={() => setWelcomeOpen(false)}>View my tokens</button></section></div>}
    </section>
  )
}
