import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Alert, Badge, Card, Col, Container, Row, Spinner, Table, Tabs, Tab, Modal, Button } from 'react-bootstrap'
import { ethers } from 'ethers'
// import { useWallet } from '../hooks/useWallet'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { fetchUserSummaryApi } from '../../Services/orbitsApi' // Use the API instead of manual scraping

export const MyTokens = () => {
  const { isConnected, account } = useWallet()
  const { loadContracts, isLoading: contractsLoading } = useContracts()

  const [isFetching, setIsFetching] = useState(true)
  const [pageError, setPageError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)
  const [showAllTimeline, setShowAllTimeline] = useState(false)
  const [showAllTables, setShowAllTables] = useState({})
  
  const [balances, setBalances] = useState({
    fgtTotal: '0',
    fgtLocked: '0',
    fgtAvailable: '0',
    fgtrTotal: '0',
    fgtrLocked: '0',
    fgtrAvailable: '0',
    totalMoneyEarned: '0',
    totalMoneyEscrow: '0'
  })

  const [history, setHistory] = useState({
    timeline: [],
    fgtMints: [],
    fgtrMints: [],
    fgtBurns: [],
    fgtrBurns: [],
    fgtLocks: []
  })

  // Format reasons for the UI
  const reasonLabel = (reason) => {
    const labels = {
      manualActivation: 'Manual activation reward',
      autoUpgrade: 'Auto-upgrade reward',
      founderActivation: 'Founder free activation reward',
      recycleReward: 'Recycle completion reward',
      raffleBurn: 'Raffle burn',
      NFTLock: 'NFT utility lock'
    }
    return labels[reason] || reason || 'Protocol event'
  }

  const reasonVariant = (reason) => {
    if (['manualActivation', 'autoUpgrade', 'founderActivation'].includes(reason)) return 'primary'
    if (reason === 'recycleReward') return 'success'
    if (reason?.toLowerCase()?.includes('burn')) return 'danger'
    if (reason?.toLowerCase()?.includes('lock') || reason === 'NFTLock') return 'warning'
    return 'secondary'
  }

  const displayLevel = (level) => {
    const parsed = Number(level)

    if (Number.isNaN(parsed)) return null
    if (parsed < 1 || parsed > 10) return null

    return parsed
  }

  const buildNarrative = (entry) => {
    const amt = entry.amountFormatted
    const level = displayLevel(entry.level)

    if (entry.kind === 'FGT_MINT') {
      return level
        ? `You activated Level ${level} and earned ${amt} FGT.`
        : `You earned ${amt} FGT from a protocol activation reward.`
    }

    if (entry.kind === 'FGTR_MINT') {
      return level
        ? `Your orbit recycled on Level ${level}. Earned ${amt} FGTr.`
        : `Your orbit recycled and earned ${amt} FGTr.`
    }

    if (entry.kind.includes('BURN')) {
      return `${amt} ${entry.token} was burned for utility: ${reasonLabel(entry.reason)}.`
    }

    if (entry.kind === 'FGT_LOCK') {
      return `${amt} FGT was locked for utility: ${reasonLabel(entry.reason)}.`
    }

    return 'Protocol activity recorded.'
  }

  const fetchTokenData = useCallback(async (force = false) => {
    if (!isConnected || !account) return

    setIsFetching(true)
    setPageError('')

    try {
      const result = await fetchUserSummaryApi(account, { forceRefresh: force })
      
      // Update Balances from API
      setBalances({
        fgtTotal: result.tokens?.FGT?.total || '0',
        fgtLocked: result.tokens?.FGT?.locked || '0',
        fgtAvailable: result.tokens?.FGT?.available || '0',
        fgtrTotal: result.tokens?.FGTr?.total || '0',
        fgtrLocked: result.tokens?.FGTr?.locked || '0',
        fgtrAvailable: result.tokens?.FGTr?.available || '0',
        totalMoneyEarned: result.earnings?.totalLiquid || '0',
        totalMoneyEscrow: result.earnings?.totalEscrow || '0'
      })

      // Categorize History
      const rawHistory = result.history || []
      const categorized = {
        timeline: rawHistory.map(e => ({ ...e, narrative: buildNarrative(e) })),
        fgtMints: rawHistory.filter(e => e.kind === 'FGT_MINT'),
        fgtrMints: rawHistory.filter(e => e.kind === 'FGTR_MINT'),
        fgtBurns: rawHistory.filter(e => e.kind === 'FGT_BURN'),
        fgtrBurns: rawHistory.filter(e => e.kind === 'FGTR_BURN'),
        fgtLocks: rawHistory.filter(e => e.kind === 'FGT_LOCK'),
      }

      setHistory(categorized)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('API Fetch failed:', err)
      setPageError('Failed to sync token history from backend.')
    } finally {
      setIsFetching(false)
    }
  }, [isConnected, account])

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
      fetchTokenData()
    }
  }, [isConnected, account, loadContracts, fetchTokenData])

  const summaryCards = useMemo(() => [
    {
      title: 'FGT – Activation Rewards',
      value: balances.fgtTotal,
      subtitle: `Available ${balances.fgtAvailable} • Locked ${balances.fgtLocked}`,
      accent: 'var(--glow-blue)'
    },
    {
      title: 'FGTr – Recycle Rewards',
      value: balances.fgtrTotal,
      subtitle: `Available ${balances.fgtrAvailable}`,
      accent: 'var(--glow-teal)'
    }
  ], [balances])

  const pageStyles = `
    .token-card {
      border: 1px solid var(--border-soft);
      border-radius: 24px;
      background: var(--surface-1);
      backdrop-filter: blur(12px);
      color: var(--text-primary);
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .token-hero {
      background: linear-gradient(135deg, #001b52 0%, #002366 45%, #2b4db3 100%);
      color: white;
      border-radius: 32px;
      padding: 36px;
      position: relative;
      overflow: hidden;
    }

    .token-stat {
      border-radius: 20px;
      background: var(--surface-2);
      border: 1px solid var(--border-soft);
      padding: 20px;
      height: 100%;
    }

    .timeline-row {
      border-left: 4px solid var(--glow-blue);
      background: var(--surface-2);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 12px;
      transition: all 0.2s ease;
    }

    .timeline-row:hover {
      transform: translateX(5px);
      background: var(--surface-3);
    }

    .table-modern {
      color: var(--text-primary);
    }

    .table-modern thead th {
      background: var(--surface-3);
      color: var(--text-secondary);
      border: none;
      font-size: 0.8rem;
      text-transform: uppercase;
    }

    .nav-tabs .nav-link {
      color: var(--text-secondary);
      border: none;
      font-weight: 600;
    }

    .nav-tabs .nav-link.active {
      background: transparent;
      color: var(--glow-blue);
      border-bottom: 3px solid var(--glow-blue);
    }

    [data-theme='dark'] .token-card { background: rgba(15, 23, 42, 0.8); }
    [data-theme='light'] .token-hero { background: linear-gradient(135deg, #002366, #4a6fd4); }

    .token-stat .token-stat-title {
      color: var(--text-primary) !important;
      opacity: 1 !important;
      letter-spacing: 0.08em;
    }

    .token-stat .token-stat-subtitle {
      color: var(--text-secondary) !important;
      opacity: 0.95 !important;
    }

    .table-modern {
      color: var(--text-primary) !important;
      --bs-table-bg: transparent;
      --bs-table-color: var(--text-primary);
      --bs-table-hover-bg: var(--surface-2);
      --bs-table-hover-color: var(--text-primary);
      border-color: var(--border-soft);
    }

    .table-modern thead th {
      background: var(--surface-3) !important;
      color: var(--text-primary) !important;
      border-bottom: 1px solid var(--border-soft) !important;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }

    .table-modern tbody td {
      color: var(--text-primary) !important;
      border-color: var(--border-soft) !important;
      vertical-align: middle;
    }

    .welcome-modal .modal-content {
      background: var(--surface-1) !important;
      color: var(--text-primary) !important;
      border: 1px solid var(--border-soft) !important;
      border-radius: 24px !important;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45) !important;
      overflow: hidden;
    }

    .welcome-modal .modal-header {
      border-bottom: 1px solid var(--border-soft) !important;
      background: var(--surface-2) !important;
      color: var(--text-primary) !important;
    }

    .welcome-modal .modal-title {
      color: var(--text-primary) !important;
    }

    .welcome-modal .modal-body {
      background: var(--surface-1) !important;
      color: var(--text-primary) !important;
    }

    .welcome-modal .modal-body p {
      color: var(--text-secondary) !important;
    }

    .welcome-modal .btn-close {
      filter: none !important;
    }

    [data-theme='dark'] .welcome-modal .btn-close {
      filter: invert(1) grayscale(100%) brightness(200%) !important;
    }

    .modal-backdrop.show {
      opacity: 0.72 !important;
    }

    .timeline-date {
      color: var(--text-secondary) !important;
      opacity: 1 !important;
      font-weight: 600;
      white-space: nowrap;
    }

    .token-stat-with-image {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      min-height: 150px;
      overflow: hidden;
    }

    .token-stat-copy {
      min-width: 0;
      position: relative;
      z-index: 2;
    }

    .token-stat-img {
      width: clamp(82px, 9vw, 128px);
      height: clamp(82px, 9vw, 128px);
      object-fit: contain;
      flex: 0 0 auto;
      filter: drop-shadow(0 18px 28px rgba(0, 0, 0, 0.28));
    }

    .modal {
      z-index: 99999 !important;
    }

    .modal-backdrop {
      z-index: 99998 !important;
    }

    .token-welcome-dialog {
      max-width: 620px !important;
      margin: 1.75rem auto !important;
    }

    .token-welcome-content {
      display: block !important;
      background: var(--surface-1) !important;
      color: var(--text-primary) !important;
      border: 1px solid var(--border-soft) !important;
      border-radius: 30px !important;
      box-shadow: 0 35px 110px rgba(0, 0, 0, 0.6) !important;
      overflow: hidden !important;
      min-height: 420px !important;
    }

    .token-welcome-body {
      position: relative;
      display: flex !important;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 18px;
      padding: clamp(28px, 5vw, 52px) !important;
      background:
        radial-gradient(circle at top, rgba(56, 189, 248, 0.18), transparent 34%),
        radial-gradient(circle at bottom right, rgba(45, 212, 191, 0.14), transparent 36%),
        var(--surface-1) !important;
      color: var(--text-primary) !important;
    }

    .token-welcome-close {
      position: absolute;
      top: 18px;
      right: 20px;
      width: 38px;
      height: 38px;
      border: 1px solid var(--border-soft);
      border-radius: 999px;
      background: var(--surface-2);
      color: var(--text-primary);
      font-size: 26px;
      line-height: 1;
      cursor: pointer;
    }

    .token-welcome-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }

    .token-welcome-icon {
      width: 92px;
      height: 92px;
      object-fit: contain;
      filter: drop-shadow(0 18px 26px rgba(0, 0, 0, 0.35));
    }

    .token-welcome-icon-second {
      margin-left: -24px;
      transform: translateY(14px) scale(0.88);
    }

    .token-welcome-body h2 {
      margin: 0;
      color: var(--text-primary) !important;
      font-weight: 800;
      letter-spacing: -0.04em;
    }

    .token-welcome-body p {
      max-width: 500px;
      margin: 0;
      color: var(--text-secondary) !important;
      line-height: 1.7;
    }

    .token-welcome-points {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }

    .token-welcome-points span {
      border: 1px solid var(--border-soft);
      background: var(--surface-2);
      color: var(--text-primary);
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .token-welcome-btn {
      margin-top: 8px;
      font-weight: 800;
    }

    @media (max-width: 575px) {
      .token-stat-with-image {
        align-items: flex-start;
      }

      .token-stat-img {
        width: 78px;
        height: 78px;
      }

      .token-welcome-dialog {
        max-width: calc(100% - 24px) !important;
      }
    }
  `

  const toggleTableDisplay = (tabKey) => {
    setShowAllTables(prev => ({ ...prev, [tabKey]: !prev[tabKey] }))
  }

  if (!isConnected) return <Container className="mt-5 pt-5"><Alert variant="primary">Please connect your wallet.</Alert></Container>

  return (
    <Container className="mt-5 pt-4 pb-5">
      <style>{pageStyles}</style>

      {/* Hero Section */}
      <div className="token-hero mb-4 mt-4">
        <Row className="align-items-center">
          <Col lg={8}>
            <h1 className="fw-bold text-uppercase mb-3">My F-Freedom Token Assets</h1>
            <p className="opacity-90">
              Detailed tracking of your FGT and FGTr rewards. 
            </p>
            <div className="small opacity-75">
              Wallet: {account} {lastUpdated && `• Last synced: ${lastUpdated}`}
            </div>
          </Col>
          <Col lg={4} className="text-lg-end">
             <Button variant="light" className="rounded-pill" onClick={() => fetchTokenData(true)} disabled={isFetching}>
               {isFetching ? <Spinner size="sm" /> : '🔄 Refresh Data'}
             </Button>
          </Col>
        </Row>
      </div>

      {/* Summary Cards */}
      <Row className="g-4 mb-4">
        {summaryCards.map((card) => (
          <Col md={6} xl={6} key={card.title}>
            <div className="token-stat token-stat-with-image">
              <div className="token-stat-copy">
                <div className="small text-uppercase fw-bold token-stat-title mb-2">{card.title}</div>
                <div className="fs-3 fw-bold" style={{ color: card.accent }}>{card.value}</div>
                <div className="small token-stat-subtitle">{card.subtitle}</div>
              </div>

              <img
                src={card.title.startsWith('FGTr') ? '/images/fgtr.png' : '/images/fgt.png'}
                alt={card.title}
                className="token-stat-img"
              />
            </div>
          </Col>
        ))}
      </Row>

      {/* Timeline */}
      <Card className="token-card mb-4">
        <Card.Body className="p-4">
          <h5 className="fw-bold mb-4">Reward Activity Timeline</h5>
          {history.timeline.length === 0 ? (
            <div className="text-center py-4">No activity found.</div>
          ) : (
            <>
              {(showAllTimeline ? history.timeline : history.timeline.slice(0, 2)).map((entry, idx) => (
                <div className="timeline-row" key={idx}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex gap-2">
                      <Badge bg={reasonVariant(entry.reason)}>{entry.token}</Badge>
                      {displayLevel(entry.level) && (
                        <Badge bg="dark">
                          Level {displayLevel(entry.level)}
                        </Badge>
                      )}
                    </div>
                    <div className="small timeline-date">{new Date(entry.timestamp * 1000).toLocaleString()}</div>
                  </div>
                  <div className="fw-semibold">{entry.narrative}</div>
                  <div className="small"><a href={`https://amoy.polygonscan.com/tx/${entry.txHash}`} target="_blank" style={{color: 'var(--glow-blue)'}}>View Transaction →</a></div>
                </div>
              ))}
              <div className="text-center mt-3">
                <Button variant="link" onClick={() => setShowAllTimeline(!showAllTimeline)}>
                  {showAllTimeline ? 'Show Less' : `View All (${history.timeline.length})`}
                </Button>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Detailed Tabs */}
      <Card className="token-card">
        <Card.Body>
           <Tabs defaultActiveKey="fgt" className="mb-3">
             <Tab eventKey="fgt" title={`FGT Earned (${history.fgtMints.length})`}>
                <RecordTable
                  records={history.fgtMints}
                  reasonVariant={reasonVariant}
                  displayLevel={displayLevel}
                />
             </Tab>
             <Tab eventKey="fgtr" title={`FGTr Earned (${history.fgtrMints.length})`}>
                <RecordTable
                  records={history.fgtrMints}
                  reasonVariant={reasonVariant}
                  displayLevel={displayLevel}
                />
             </Tab>
           </Tabs>
        </Card.Body>
      </Card>

      {/* Modal */}
      <Modal
        show={showWelcomeModal}
        onHide={() => setShowWelcomeModal(false)}
        centered
        backdrop="static"
        keyboard
        dialogClassName="token-welcome-dialog"
        contentClassName="token-welcome-content"
      >
        <Modal.Body className="token-welcome-body">
          <button
            type="button"
            className="token-welcome-close"
            onClick={() => setShowWelcomeModal(false)}
            aria-label="Close welcome modal"
          >
            ×
          </button>

          <div className="token-welcome-icon-wrap">
            <img src="/images/fgt.png" alt="FGT token" className="token-welcome-icon" />
            <img src="/images/fgtr.png" alt="FGTr token" className="token-welcome-icon token-welcome-icon-second" />
          </div>

          <h2>Welcome to Your F-Freddom Token Dashboard</h2>

          <p>
            This page helps you track your FGT activation rewards, FGTr recycle rewards,
            token availability, locked balances, and your latest blockchain reward activity.
          </p>

          <div className="token-welcome-points">
            <span>Live token activity records</span>
            <span>FGT and FGTr reward records</span>
            <span>Verifiable transaction history</span>
          </div>

          <Button
            variant="primary"
            onClick={() => setShowWelcomeModal(false)}
            className="rounded-pill px-4 token-welcome-btn"
          >
            Continue to Dashboard
          </Button>
        </Modal.Body>
      </Modal>
    </Container>
  )
}

const RecordTable = ({ records, reasonVariant, displayLevel }) => (
  <div className="table-responsive">
    <Table hover className="table-modern">
      <thead>
        <tr><th>Token</th><th>Amount</th><th>Level</th><th>When</th><th>Action</th></tr>
      </thead>
      <tbody>
        {records.map((r, i) => (
          <tr key={i}>
            <td><Badge bg={reasonVariant(r.reason)}>{r.token}</Badge></td>
            <td>{r.amountFormatted}</td>
            <td>
              {displayLevel(r.level)
                ? `Level ${displayLevel(r.level)}`
                : '—'}
            </td>
            <td>{new Date(r.timestamp * 1000).toLocaleDateString()}</td>
            <td><a href={`https://amoy.polygonscan.com/tx/${r.txHash}`} target="_blank">Verify</a></td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
)










// import React, { useEffect, useMemo, useState, useCallback } from 'react'
// import { Alert, Badge, Card, Col, Container, Row, Spinner, Table, Tabs, Tab, Modal, Button } from 'react-bootstrap'
// import { ethers } from 'ethers'
// // import { useWallet } from '../hooks/useWallet'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { fetchUserSummaryApi } from '../../Services/orbitsApi' // Use the API instead of manual scraping

// export const MyTokens = () => {
//   const { isConnected, account } = useWallet()
//   const { loadContracts, isLoading: contractsLoading } = useContracts()

//   const [isFetching, setIsFetching] = useState(true)
//   const [pageError, setPageError] = useState('')
//   const [lastUpdated, setLastUpdated] = useState('')
//   const [showWelcomeModal, setShowWelcomeModal] = useState(true)
//   const [showAllTimeline, setShowAllTimeline] = useState(false)
//   const [showAllTables, setShowAllTables] = useState({})
  
//   const [balances, setBalances] = useState({
//     fgtTotal: '0',
//     fgtLocked: '0',
//     fgtAvailable: '0',
//     fgtrTotal: '0',
//     fgtrLocked: '0',
//     fgtrAvailable: '0',
//     totalMoneyEarned: '0',
//     totalMoneyEscrow: '0'
//   })

//   const [history, setHistory] = useState({
//     timeline: [],
//     fgtMints: [],
//     fgtrMints: [],
//     fgtBurns: [],
//     fgtrBurns: [],
//     fgtLocks: []
//   })

//   // Format reasons for the UI
//   const reasonLabel = (reason) => {
//     const labels = {
//       manualActivation: 'Manual activation reward',
//       autoUpgrade: 'Auto-upgrade reward',
//       founderActivation: 'Founder free activation reward',
//       recycleReward: 'Recycle completion reward',
//       raffleBurn: 'Raffle burn',
//       NFTLock: 'NFT utility lock'
//     }
//     return labels[reason] || reason || 'Protocol event'
//   }

//   const reasonVariant = (reason) => {
//     if (['manualActivation', 'autoUpgrade', 'founderActivation'].includes(reason)) return 'primary'
//     if (reason === 'recycleReward') return 'success'
//     if (reason?.toLowerCase()?.includes('burn')) return 'danger'
//     if (reason?.toLowerCase()?.includes('lock') || reason === 'NFTLock') return 'warning'
//     return 'secondary'
//   }

//   const buildNarrative = (entry) => {
//     const amt = entry.amountFormatted
//     if (entry.kind === 'FGT_MINT') {
//       return `You activated Level ${entry.level} and earned ${amt} FGT.`
//     }
//     if (entry.kind === 'FGTR_MINT') {
//       return `Your orbit recycled on Level ${entry.level}. Earned ${amt} FGTr.`
//     }
//     if (entry.kind.includes('BURN')) {
//       return `${amt} ${entry.token} was burned for utility: ${reasonLabel(entry.reason)}.`
//     }
//     if (entry.kind === 'FGT_LOCK') {
//       return `${amt} FGT was locked for utility: ${reasonLabel(entry.reason)}.`
//     }
//     return 'Protocol activity recorded.'
//   }

//   const fetchTokenData = useCallback(async (force = false) => {
//     if (!isConnected || !account) return

//     setIsFetching(true)
//     setPageError('')

//     try {
//       const result = await fetchUserSummaryApi(account, { forceRefresh: force })
      
//       // Update Balances from API
//       setBalances({
//         fgtTotal: result.tokens?.FGT?.total || '0',
//         fgtLocked: result.tokens?.FGT?.locked || '0',
//         fgtAvailable: result.tokens?.FGT?.available || '0',
//         fgtrTotal: result.tokens?.FGTr?.total || '0',
//         fgtrLocked: result.tokens?.FGTr?.locked || '0',
//         fgtrAvailable: result.tokens?.FGTr?.available || '0',
//         totalMoneyEarned: result.earnings?.totalLiquid || '0',
//         totalMoneyEscrow: result.earnings?.totalEscrow || '0'
//       })

//       // Categorize History
//       const rawHistory = result.history || []
//       const categorized = {
//         timeline: rawHistory.map(e => ({ ...e, narrative: buildNarrative(e) })),
//         fgtMints: rawHistory.filter(e => e.kind === 'FGT_MINT'),
//         fgtrMints: rawHistory.filter(e => e.kind === 'FGTR_MINT'),
//         fgtBurns: rawHistory.filter(e => e.kind === 'FGT_BURN'),
//         fgtrBurns: rawHistory.filter(e => e.kind === 'FGTR_BURN'),
//         fgtLocks: rawHistory.filter(e => e.kind === 'FGT_LOCK'),
//       }

//       setHistory(categorized)
//       setLastUpdated(new Date().toLocaleTimeString())
//     } catch (err) {
//       console.error('API Fetch failed:', err)
//       setPageError('Failed to sync token history from backend.')
//     } finally {
//       setIsFetching(false)
//     }
//   }, [isConnected, account])

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//       fetchTokenData()
//     }
//   }, [isConnected, account, loadContracts, fetchTokenData])

//   const summaryCards = useMemo(() => [
//     {
//       title: 'FGT – Activation Rewards',
//       value: balances.fgtTotal,
//       subtitle: `Available ${balances.fgtAvailable} • Locked ${balances.fgtLocked}`,
//       accent: 'var(--glow-blue)'
//     },
//     {
//       title: 'FGTr – Recycle Rewards',
//       value: balances.fgtrTotal,
//       subtitle: `Available ${balances.fgtrAvailable}`,
//       accent: 'var(--glow-teal)'
//     }
//   ], [balances])

//   const pageStyles = `
//     .token-card {
//       border: 1px solid var(--border-soft);
//       border-radius: 24px;
//       background: var(--surface-1);
//       backdrop-filter: blur(12px);
//       color: var(--text-primary);
//       box-shadow: 0 10px 30px rgba(0,0,0,0.1);
//     }
    
//     .token-hero {
//       background: linear-gradient(135deg, #001b52 0%, #002366 45%, #2b4db3 100%);
//       color: white;
//       border-radius: 32px;
//       padding: 36px;
//       position: relative;
//       overflow: hidden;
//     }

//     .token-stat {
//       border-radius: 20px;
//       background: var(--surface-2);
//       border: 1px solid var(--border-soft);
//       padding: 20px;
//       height: 100%;
//     }

//     .timeline-row {
//       border-left: 4px solid var(--glow-blue);
//       background: var(--surface-2);
//       border-radius: 16px;
//       padding: 16px 20px;
//       margin-bottom: 12px;
//       transition: all 0.2s ease;
//     }

//     .timeline-row:hover {
//       transform: translateX(5px);
//       background: var(--surface-3);
//     }

//     .table-modern {
//       color: var(--text-primary);
//     }

//     .table-modern thead th {
//       background: var(--surface-3);
//       color: var(--text-secondary);
//       border: none;
//       font-size: 0.8rem;
//       text-transform: uppercase;
//     }

//     .nav-tabs .nav-link {
//       color: var(--text-secondary);
//       border: none;
//       font-weight: 600;
//     }

//     .nav-tabs .nav-link.active {
//       background: transparent;
//       color: var(--glow-blue);
//       border-bottom: 3px solid var(--glow-blue);
//     }

//     [data-theme='dark'] .token-card { background: rgba(15, 23, 42, 0.8); }
//     [data-theme='light'] .token-hero { background: linear-gradient(135deg, #002366, #4a6fd4); }

//     .token-stat .token-stat-title {
//       color: var(--text-primary) !important;
//       opacity: 1 !important;
//       letter-spacing: 0.08em;
//     }

//     .token-stat .token-stat-subtitle {
//       color: var(--text-secondary) !important;
//       opacity: 0.95 !important;
//     }

//     .table-modern {
//       color: var(--text-primary) !important;
//       --bs-table-bg: transparent;
//       --bs-table-color: var(--text-primary);
//       --bs-table-hover-bg: var(--surface-2);
//       --bs-table-hover-color: var(--text-primary);
//       border-color: var(--border-soft);
//     }

//     .table-modern thead th {
//       background: var(--surface-3) !important;
//       color: var(--text-primary) !important;
//       border-bottom: 1px solid var(--border-soft) !important;
//       font-size: 0.78rem;
//       text-transform: uppercase;
//       letter-spacing: 0.06em;
//       white-space: nowrap;
//     }

//     .table-modern tbody td {
//       color: var(--text-primary) !important;
//       border-color: var(--border-soft) !important;
//       vertical-align: middle;
//     }

//     .welcome-modal .modal-content {
//       background: var(--surface-1) !important;
//       color: var(--text-primary) !important;
//       border: 1px solid var(--border-soft) !important;
//       border-radius: 24px !important;
//       box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45) !important;
//       overflow: hidden;
//     }

//     .welcome-modal .modal-header {
//       border-bottom: 1px solid var(--border-soft) !important;
//       background: var(--surface-2) !important;
//       color: var(--text-primary) !important;
//     }

//     .welcome-modal .modal-title {
//       color: var(--text-primary) !important;
//     }

//     .welcome-modal .modal-body {
//       background: var(--surface-1) !important;
//       color: var(--text-primary) !important;
//     }

//     .welcome-modal .modal-body p {
//       color: var(--text-secondary) !important;
//     }

//     .welcome-modal .btn-close {
//       filter: none !important;
//     }

//     [data-theme='dark'] .welcome-modal .btn-close {
//       filter: invert(1) grayscale(100%) brightness(200%) !important;
//     }

//     .modal-backdrop.show {
//       opacity: 0.72 !important;
//     }

//     .timeline-date {
//       color: var(--text-secondary) !important;
//       opacity: 1 !important;
//       font-weight: 600;
//       white-space: nowrap;
//     }

//     .token-stat-with-image {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       gap: 18px;
//       min-height: 150px;
//       overflow: hidden;
//     }

//     .token-stat-copy {
//       min-width: 0;
//       position: relative;
//       z-index: 2;
//     }

//     .token-stat-img {
//       width: clamp(82px, 9vw, 128px);
//       height: clamp(82px, 9vw, 128px);
//       object-fit: contain;
//       flex: 0 0 auto;
//       filter: drop-shadow(0 18px 28px rgba(0, 0, 0, 0.28));
//     }

//     .modal {
//       z-index: 99999 !important;
//     }

//     .modal-backdrop {
//       z-index: 99998 !important;
//     }

//     .token-welcome-dialog {
//       max-width: 620px !important;
//       margin: 1.75rem auto !important;
//     }

//     .token-welcome-content {
//       display: block !important;
//       background: var(--surface-1) !important;
//       color: var(--text-primary) !important;
//       border: 1px solid var(--border-soft) !important;
//       border-radius: 30px !important;
//       box-shadow: 0 35px 110px rgba(0, 0, 0, 0.6) !important;
//       overflow: hidden !important;
//       min-height: 420px !important;
//     }

//     .token-welcome-body {
//       position: relative;
//       display: flex !important;
//       flex-direction: column;
//       align-items: center;
//       text-align: center;
//       gap: 18px;
//       padding: clamp(28px, 5vw, 52px) !important;
//       background:
//         radial-gradient(circle at top, rgba(56, 189, 248, 0.18), transparent 34%),
//         radial-gradient(circle at bottom right, rgba(45, 212, 191, 0.14), transparent 36%),
//         var(--surface-1) !important;
//       color: var(--text-primary) !important;
//     }

//     .token-welcome-close {
//       position: absolute;
//       top: 18px;
//       right: 20px;
//       width: 38px;
//       height: 38px;
//       border: 1px solid var(--border-soft);
//       border-radius: 999px;
//       background: var(--surface-2);
//       color: var(--text-primary);
//       font-size: 26px;
//       line-height: 1;
//       cursor: pointer;
//     }

//     .token-welcome-icon-wrap {
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       margin-bottom: 4px;
//     }

//     .token-welcome-icon {
//       width: 92px;
//       height: 92px;
//       object-fit: contain;
//       filter: drop-shadow(0 18px 26px rgba(0, 0, 0, 0.35));
//     }

//     .token-welcome-icon-second {
//       margin-left: -24px;
//       transform: translateY(14px) scale(0.88);
//     }

//     .token-welcome-body h2 {
//       margin: 0;
//       color: var(--text-primary) !important;
//       font-weight: 800;
//       letter-spacing: -0.04em;
//     }

//     .token-welcome-body p {
//       max-width: 500px;
//       margin: 0;
//       color: var(--text-secondary) !important;
//       line-height: 1.7;
//     }

//     .token-welcome-points {
//       display: flex;
//       flex-wrap: wrap;
//       justify-content: center;
//       gap: 10px;
//     }

//     .token-welcome-points span {
//       border: 1px solid var(--border-soft);
//       background: var(--surface-2);
//       color: var(--text-primary);
//       border-radius: 999px;
//       padding: 8px 12px;
//       font-size: 0.82rem;
//       font-weight: 700;
//     }

//     .token-welcome-btn {
//       margin-top: 8px;
//       font-weight: 800;
//     }

//     @media (max-width: 575px) {
//       .token-stat-with-image {
//         align-items: flex-start;
//       }

//       .token-stat-img {
//         width: 78px;
//         height: 78px;
//       }

//       .token-welcome-dialog {
//         max-width: calc(100% - 24px) !important;
//       }
//     }
//   `

//   const toggleTableDisplay = (tabKey) => {
//     setShowAllTables(prev => ({ ...prev, [tabKey]: !prev[tabKey] }))
//   }

//   if (!isConnected) return <Container className="mt-5 pt-5"><Alert variant="primary">Please connect your wallet.</Alert></Container>

//   return (
//     <Container className="mt-5 pt-4 pb-5">
//       <style>{pageStyles}</style>

//       {/* Hero Section */}
//       <div className="token-hero mb-4 mt-4">
//         <Row className="align-items-center">
//           <Col lg={8}>
//             <h1 className="fw-bold text-uppercase mb-3">My F-Freedom Token Assets</h1>
//             <p className="opacity-90">
//               Detailed tracking of your FGT and FGTr rewards. 
//             </p>
//             <div className="small opacity-75">
//               Wallet: {account} {lastUpdated && `• Last synced: ${lastUpdated}`}
//             </div>
//           </Col>
//           <Col lg={4} className="text-lg-end">
//              <Button variant="light" className="rounded-pill" onClick={() => fetchTokenData(true)} disabled={isFetching}>
//                {isFetching ? <Spinner size="sm" /> : '🔄 Refresh Data'}
//              </Button>
//           </Col>
//         </Row>
//       </div>

//       {/* Summary Cards */}
//       <Row className="g-4 mb-4">
//         {summaryCards.map((card) => (
//           <Col md={6} xl={6} key={card.title}>
//             <div className="token-stat token-stat-with-image">
//               <div className="token-stat-copy">
//                 <div className="small text-uppercase fw-bold token-stat-title mb-2">{card.title}</div>
//                 <div className="fs-3 fw-bold" style={{ color: card.accent }}>{card.value}</div>
//                 <div className="small token-stat-subtitle">{card.subtitle}</div>
//               </div>

//               <img
//                 src={card.title.startsWith('FGTr') ? '/images/fgtr.png' : '/images/fgt.png'}
//                 alt={card.title}
//                 className="token-stat-img"
//               />
//             </div>
//           </Col>
//         ))}
//       </Row>

//       {/* Timeline */}
//       <Card className="token-card mb-4">
//         <Card.Body className="p-4">
//           <h5 className="fw-bold mb-4">Reward Activity Timeline</h5>
//           {history.timeline.length === 0 ? (
//             <div className="text-center py-4">No activity found.</div>
//           ) : (
//             <>
//               {(showAllTimeline ? history.timeline : history.timeline.slice(0, 2)).map((entry, idx) => (
//                 <div className="timeline-row" key={idx}>
//                   <div className="d-flex justify-content-between align-items-center mb-2">
//                     <div className="d-flex gap-2">
//                       <Badge bg={reasonVariant(entry.reason)}>{entry.token}</Badge>
//                       <Badge bg="dark">Level {entry.level}</Badge>
//                     </div>
//                     <div className="small timeline-date">{new Date(entry.timestamp * 1000).toLocaleString()}</div>
//                   </div>
//                   <div className="fw-semibold">{entry.narrative}</div>
//                   <div className="small"><a href={`https://amoy.polygonscan.com/tx/${entry.txHash}`} target="_blank" style={{color: 'var(--glow-blue)'}}>View Transaction →</a></div>
//                 </div>
//               ))}
//               <div className="text-center mt-3">
//                 <Button variant="link" onClick={() => setShowAllTimeline(!showAllTimeline)}>
//                   {showAllTimeline ? 'Show Less' : `View All (${history.timeline.length})`}
//                 </Button>
//               </div>
//             </>
//           )}
//         </Card.Body>
//       </Card>

//       {/* Detailed Tabs */}
//       <Card className="token-card">
//         <Card.Body>
//            <Tabs defaultActiveKey="fgt" className="mb-3">
//              <Tab eventKey="fgt" title={`FGT Earned (${history.fgtMints.length})`}>
//                 <RecordTable records={history.fgtMints} reasonVariant={reasonVariant} />
//              </Tab>
//              <Tab eventKey="fgtr" title={`FGTr Earned (${history.fgtrMints.length})`}>
//                 <RecordTable records={history.fgtrMints} reasonVariant={reasonVariant} />
//              </Tab>
//            </Tabs>
//         </Card.Body>
//       </Card>

//       {/* Modal */}
//       <Modal
//         show={showWelcomeModal}
//         onHide={() => setShowWelcomeModal(false)}
//         centered
//         backdrop="static"
//         keyboard
//         dialogClassName="token-welcome-dialog"
//         contentClassName="token-welcome-content"
//       >
//         <Modal.Body className="token-welcome-body">
//           <button
//             type="button"
//             className="token-welcome-close"
//             onClick={() => setShowWelcomeModal(false)}
//             aria-label="Close welcome modal"
//           >
//             ×
//           </button>

//           <div className="token-welcome-icon-wrap">
//             <img src="/images/fgt.png" alt="FGT token" className="token-welcome-icon" />
//             <img src="/images/fgtr.png" alt="FGTr token" className="token-welcome-icon token-welcome-icon-second" />
//           </div>

//           <h2>Welcome to Your Token Dashboard</h2>

//           <p>
//             This page helps you track your FGT activation rewards, FGTr recycle rewards,
//             token availability, locked balances, and your latest blockchain reward activity.
//           </p>

//           <div className="token-welcome-points">
//             <span>Live indexer synced data</span>
//             <span>FGT and FGTr reward records</span>
//             <span>Verifiable transaction history</span>
//           </div>

//           <Button
//             variant="primary"
//             onClick={() => setShowWelcomeModal(false)}
//             className="rounded-pill px-4 token-welcome-btn"
//           >
//             Continue to Dashboard
//           </Button>
//         </Modal.Body>
//       </Modal>
//     </Container>
//   )
// }

// const RecordTable = ({ records, reasonVariant }) => (
//   <div className="table-responsive">
//     <Table hover className="table-modern">
//       <thead>
//         <tr><th>Token</th><th>Amount</th><th>Level</th><th>When</th><th>Action</th></tr>
//       </thead>
//       <tbody>
//         {records.map((r, i) => (
//           <tr key={i}>
//             <td><Badge bg={reasonVariant(r.reason)}>{r.token}</Badge></td>
//             <td>{r.amountFormatted}</td>
//             <td>Level {r.level}</td>
//             <td>{new Date(r.timestamp * 1000).toLocaleDateString()}</td>
//             <td><a href={`https://amoy.polygonscan.com/tx/${r.txHash}`} target="_blank">Verify</a></td>
//           </tr>
//         ))}
//       </tbody>
//     </Table>
//   </div>
// )