import { ArrowLeft, CheckCircle2, Database, ExternalLink, RefreshCw, RotateCcw, Users, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatToken } from '../../Services/freedomPlus'
import { lockBodyScroll } from '../../utils/bodyScrollLock'
import FreedomPlusOrbit from './FreedomPlusOrbit'

const ROLE_NAMES = { 1: 'Primary recipient', 2: 'Secondary recipient', 3: 'Final recipient' }
const short = (value = '') => value ? `${value.slice(0, 7)}...${value.slice(-5)}` : 'Not available'

function PositionModal({ position, onClose }) {
  useEffect(() => {
    if (!position) return undefined
    const release = lockBodyScroll()
    const close = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => { release(); window.removeEventListener('keydown', close) }
  }, [onClose, position])

  if (!position) return null
  const payments = position.payments || []
  const total = payments.reduce((sum, item) => sum + BigInt(item.amount || 0), 0n)
  return <div className="fp-position-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="fp-position-modal" role="dialog" aria-modal="true" aria-labelledby="fp-position-title">
      <header><div><span>Freedom-Plus indexed position</span><h2 id="fp-position-title">Position {position.position}</h2></div><button type="button" onClick={onClose} aria-label="Close position details"><X /></button></header>
      {position.empty ? <div className="fp-position-empty"><span>{position.position}</span><h3>Available position</h3><p>This position has no indexed participant in the selected cycle.</p><dl><div><dt>Ring</dt><dd>{position.ring}</dd></div><div><dt>Data source</dt><dd>Indexed records</dd></div></dl></div> : <>
        <div className="fp-position-status"><CheckCircle2 /><div><span>Position holder</span><strong title={position.participant}>{short(position.participant)}</strong></div><em>{position.financial ? 'Payment-linked' : 'Structural'}</em></div>
        <div className="fp-position-facts"><div><span>Ring / cycle</span><strong>{position.ring} / {position.cycle}</strong></div><div><span>Recorded amount</span><strong>{formatToken(position.amount)} USDT</strong></div><div><span>Settlement total</span><strong>{formatToken(total)} USDT</strong></div><div><span>Data source</span><strong>Indexed</strong></div></div>
        <div className="fp-position-section"><h3><Users />Placement details</h3><dl><div><dt>Participant</dt><dd title={position.participant}>{short(position.participant)}</dd></div><div><dt>Matrix parent</dt><dd title={position.structuralParent}>{short(position.structuralParent)}</dd></div><div><dt>Activation ID</dt><dd title={position.activationId}>{short(position.activationId)}</dd></div><div><dt>Placement ID</dt><dd title={position.placementId}>{short(position.placementId)}</dd></div><div><dt>Recorded block</dt><dd>{position.blockNumber}</dd></div><div><dt>Recorded at</dt><dd>{position.timestamp ? new Date(position.timestamp).toLocaleString() : 'Not available'}</dd></div></dl></div>
        <div className="fp-position-section"><h3><Database />Beneficiary summary</h3>{payments.length ? <div className="fp-beneficiary-list">{payments.map((payment) => <article key={`${payment.activationId}-${payment.role}`}><div><strong>{ROLE_NAMES[payment.role] || `Role ${payment.role}`}</strong><span>{Number(payment.bps || 0) / 100}%</span></div><dl><div><dt>Recipient</dt><dd title={payment.recipient}>{short(payment.recipient)}</dd></div><div><dt>Original candidate</dt><dd title={payment.originalCandidate}>{short(payment.originalCandidate)}</dd></div><div><dt>Amount</dt><dd>{formatToken(payment.amount)} USDT</dd></div><div><dt>Route</dt><dd>{payment.id1Fallback ? 'ID1 fallback' : 'Candidate paid'}</dd></div></dl></article>)}</div> : <div className="fp-no-distribution"><strong>No settlement movement recorded</strong><span>This placement has no matching indexed payment records.</span></div>}</div>
        {position.txHash && <a className="fp-position-proof" href={`https://amoy.polygonscan.com/tx/${position.txHash}`} target="_blank" rel="noreferrer">View transaction proof <ExternalLink /></a>}
      </>}
    </section>
  </div>
}

export default function FreedomPlusFocusedOrbit(props) {
  const { account, levels, activeLevels, selectedLevel, setSelectedLevel, cycle, setCycle, positions, config, cycles, loading, selectedPosition, setSelectedPosition, onRefresh, onBack } = props
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const clampPan = (next, value = zoom) => {
    if (value <= 1 || !canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const maxX = rect.width * (value - 1) / 2
    const maxY = rect.height * (value - 1) / 2
    return { x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) }
  }
  const changeZoom = (next) => { const value = Math.max(.75, Math.min(1.7, Number(next.toFixed(2)))); setZoom(value); setPan((current) => clampPan(current, value)) }
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }
  const stopPanning = useCallback(() => { dragRef.current = null; setPanning(false) }, [])
  const pointerDown = (event) => { if (zoom <= 1 || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { x: event.clientX, y: event.clientY, pan }; setPanning(true) }
  const pointerMove = (event) => { if (!dragRef.current) return; setPan(clampPan({ x: dragRef.current.pan.x + event.clientX - dragRef.current.x, y: dragRef.current.pan.y + event.clientY - dragRef.current.y })) }
  const pointerUp = (event) => { stopPanning(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); stopPanning() }, [cycle, selectedLevel, stopPanning])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const fitPan = () => setPan((current) => {
      if (zoom <= 1) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const maxX = rect.width * (zoom - 1) / 2
      const maxY = rect.height * (zoom - 1) / 2
      return { x: Math.max(-maxX, Math.min(maxX, current.x)), y: Math.max(-maxY, Math.min(maxY, current.y)) }
    })
    const observer = new ResizeObserver(fitPan)
    observer.observe(canvas)
    window.addEventListener('blur', stopPanning)
    window.addEventListener('orientationchange', fitPan)
    return () => { observer.disconnect(); window.removeEventListener('blur', stopPanning); window.removeEventListener('orientationchange', fitPan) }
  }, [stopPanning, zoom])
  return <section className="fp-focused-orbit">
    <header className="fp-focused-orbit__header"><button type="button" onClick={onBack}><ArrowLeft />Activation</button><div><span>Focused Orbit View</span><h1>Level {selectedLevel} - {config?.orbit}</h1><p>Inspect this level using indexed placement and settlement records.</p></div><div className="fp-focused-orbit__member"><span>Orbit owner</span><strong title={account}>{short(account)}</strong><small>{activeLevels.has(selectedLevel) ? "Level active" : "Level not active"}</small></div></header>
    <div className="fp-focused-orbit__controls"><label>Level<select value={selectedLevel} onChange={(event) => { resetView(); setSelectedLevel(Number(event.target.value)); setCycle(""); setSelectedPosition(null) }}>{levels.map((item) => <option key={item.level} value={item.level} disabled={!activeLevels.has(item.level)}>Level {item.level} / {item.orbit}</option>)}</select></label><label>Cycle<select value={cycle} onChange={(event) => { resetView(); setCycle(event.target.value); setSelectedPosition(null) }}><option value="">Current</option>{cycles.map((item) => <option value={item} key={item}>Cycle {item}</option>)}</select></label><button type="button" onClick={onRefresh} disabled={loading}><RefreshCw className={loading ? "spin" : ""} />Refresh</button></div>
    <div className="fp-focused-orbit__summary"><article><span>Orbit engine</span><strong>{config?.orbit}</strong></article><article><span>Filled positions</span><strong>{positions.length} / {config?.positions}</strong></article><article><span>Ring structure</span><strong>{config?.rings}</strong></article><article><span>Source</span><strong>Indexer</strong></article></div>
    <div className="fp-orbit-zoom" aria-label="Orbit zoom controls"><button type="button" onClick={() => changeZoom(zoom - .1)} disabled={zoom <= .75} aria-label="Zoom out"><ZoomOut /></button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => changeZoom(zoom + .1)} disabled={zoom >= 1.7} aria-label="Zoom in"><ZoomIn /></button><button type="button" onClick={resetView} disabled={zoom === 1 && pan.x === 0 && pan.y === 0}><RotateCcw />Reset</button></div>
    <div ref={canvasRef} className={"fp-focused-orbit__canvas " + (zoom > 1 ? "is-pannable" : "") + (panning ? " is-panning" : "")} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={stopPanning}><div className="fp-focused-orbit__transform" style={{ transform: "translate(" + pan.x + "px," + pan.y + "px) scale(" + zoom + ")" }}><FreedomPlusOrbit orbitType={config?.orbit} positions={positions} owner={account} onSelect={setSelectedPosition} selectedPosition={selectedPosition} /></div></div>
    <PositionModal position={selectedPosition} onClose={() => setSelectedPosition(null)} />
  </section>
}
