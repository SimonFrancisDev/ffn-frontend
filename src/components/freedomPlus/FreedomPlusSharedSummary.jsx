import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Coins, RefreshCw, ShieldCheck } from 'lucide-react'
import { FREEDOM_PLUS_ENABLED, freedomPlusApi, formatToken } from '../../Services/freedomPlus'
import { getProfileReadAuthIfLocked } from '../../Services/profilePrivacyApi'
import { useWallet } from '../../hooks/useWallet'
import './FreedomPlusSharedSummary.css'

function total(items, field = 'amount') {
  return items.reduce((sum, item) => sum + BigInt(item?.[field] || 0), 0n)
}

export default function FreedomPlusSharedSummary({ wallet, variant = 'dashboard', fullPage = false }) {
  const { account } = useWallet()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!FREEDOM_PLUS_ENABLED || !wallet) return
    setLoading(true)
    setError('')
    try {
      const headers = await getProfileReadAuthIfLocked(wallet, account)
      setData(await freedomPlusApi.participant(wallet, { headers }))
    } catch (loadError) {
      setError(loadError?.message || 'Freedom-Plus data is temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }, [wallet, account])

  useEffect(() => { load() }, [load])

  const activeLevels = useMemo(() => (data?.levels || []).filter((item) => item.active), [data])
  const payments = data?.payments || []
  const ledger = data?.ledger || []
  const fpt = ledger.filter((item) => String(item.category || '').toLowerCase().includes('fpt') && !String(item.category || '').toLowerCase().includes('fptr'))
  const fptr = ledger.filter((item) => String(item.category || '').toLowerCase().includes('fptr'))
  const registered = Boolean(data?.participant?.registered)

  if (!FREEDOM_PLUS_ENABLED || !wallet) return null

  return (
    <section className={`fp-shared fp-shared--${variant} ${fullPage ? 'fp-shared--page' : ''}`} aria-labelledby={`fp-shared-title-${variant}`}>
      <header className="fp-shared__header">
        <div><span>Freedom-Plus Program</span><h2 id={`fp-shared-title-${variant}`}>{variant === 'account' ? 'Freedom-Plus Position' : 'Freedom-Plus Progress'}</h2></div>
        <button type="button" onClick={load} disabled={loading} title="Refresh Freedom-Plus data"><RefreshCw className={loading ? 'spin' : ''} /></button>
      </header>
      {error ? <p className="fp-shared__message fp-shared__message--error">{error}</p> : (
        <>
          <div className="fp-shared__grid">
            <article><ShieldCheck /><span>Status</span><strong>{registered ? 'Registered' : 'Not registered'}</strong><small>{registered ? `Participant #${data?.participant?.participantNumber || '-'}` : 'Level 1 registration required'}</small></article>
            <article><span>Active levels</span><strong>{activeLevels.length} / 7</strong><small>{activeLevels.length === 7 ? 'All levels active' : `Level ${Math.min(activeLevels.length + 1, 7)} is next`}</small></article>
            <article><Coins /><span>FPT issued</span><strong>{formatToken(total(fpt))}</strong><small>First-activation ledger</small></article>
            <article><RefreshCw /><span>FPTr issued</span><strong>{formatToken(total(fptr))}</strong><small>Recycle ledger</small></article>
            <article><span>Wallet receipts</span><strong>{formatToken(total(payments))} USDT</strong><small>{payments.length} indexed components</small></article>
          </div>
          {fullPage ? <>
            <div className="fp-shared__section-heading"><div><span>Program intelligence</span><h3>Level progression and indexed account state</h3></div><small>Data source: staging indexer</small></div>
            <div className="fp-shared__level-grid">
              {Array.from({ length: 7 }, (_, index) => { const level = index + 1; const state = activeLevels.find((item) => Number(item.level) === level); const next = registered && level === activeLevels.length + 1; return <article key={level} className={state ? 'is-active' : next ? 'is-next' : ''}><span>Level {level}</span><strong>{state ? 'Active' : next ? 'Next' : 'Locked'}</strong><small>{state ? `Block ${state.activatedAtBlock || '-'}` : 'Sequential progression'}</small></article> })}
            </div>
            <div className="fp-shared__facts">
              <article><span>Permanent sponsor</span><strong>{data?.participant?.sponsor ? `${data.participant.sponsor.slice(0, 8)}...${data.participant.sponsor.slice(-6)}` : '-'}</strong><small>Inherited from F-Freedom</small></article>
              <article><span>Indexed placements</span><strong>{data?.positions?.length || 0}</strong><small>Structural and routed records</small></article>
              <article><span>Gateway status</span><strong>{data?.gateway?.levelOneActive ? 'Verified' : 'Required'}</strong><small>F-Freedom Level 1</small></article>
              <article><span>Latest block</span><strong>{data?.levels?.at(-1)?.activatedAtBlock || '-'}</strong><small>Most recent activation</small></article>
            </div>
          </> : null}
          <div className="fp-shared__actions">
            <a href="/freedom-plus/activation">Activation &amp; Level Manager <ArrowRight /></a>
            <a href="/freedom-plus/tokens">My Freedom-Plus Tokens <ArrowRight /></a>
          </div>
        </>
      )}
    </section>
  )
}
