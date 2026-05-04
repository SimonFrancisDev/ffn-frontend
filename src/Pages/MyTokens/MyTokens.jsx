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

  const buildNarrative = (entry) => {
    const amt = entry.amountFormatted
    if (entry.kind === 'FGT_MINT') {
      return `You activated Level ${entry.level} and earned ${amt} FGT.`
    }
    if (entry.kind === 'FGTR_MINT') {
      return `Your orbit recycled on Level ${entry.level}. Earned ${amt} FGTr.`
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
    },
    {
      title: 'Total USDT Earned',
      value: balances.totalMoneyEarned,
      subtitle: 'Liquid earnings from orbits',
      accent: '#22c55e'
    },
    {
      title: 'USDT in Escrow',
      value: balances.totalMoneyEscrow,
      subtitle: 'Reserved for auto-upgrades',
      accent: '#facc15'
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
            <h1 className="fw-bold text-uppercase mb-3">My Token Assets</h1>
            <p className="opacity-90">
              Detailed tracking of your FGT and FGTr rewards. This data is synced in real-time from the blockchain indexer.
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
          <Col md={6} xl={3} key={card.title}>
            <div className="token-stat">
              <div className="small text-uppercase fw-bold text-muted mb-2">{card.title}</div>
              <div className="fs-3 fw-bold" style={{ color: card.accent }}>{card.value}</div>
              <div className="small text-muted">{card.subtitle}</div>
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
              {(showAllTimeline ? history.timeline : history.timeline.slice(0, 5)).map((entry, idx) => (
                <div className="timeline-row" key={idx}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex gap-2">
                      <Badge bg={reasonVariant(entry.reason)}>{entry.token}</Badge>
                      <Badge bg="dark">Level {entry.level}</Badge>
                    </div>
                    <div className="small text-muted">{new Date(entry.timestamp * 1000).toLocaleString()}</div>
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
                <RecordTable records={history.fgtMints} reasonVariant={reasonVariant} />
             </Tab>
             <Tab eventKey="fgtr" title={`FGTr Earned (${history.fgtrMints.length})`}>
                <RecordTable records={history.fgtrMints} reasonVariant={reasonVariant} />
             </Tab>
           </Tabs>
        </Card.Body>
      </Card>

      {/* Modals remain unchanged as requested */}
      <Modal show={showWelcomeModal} onHide={() => setShowWelcomeModal(false)} centered className="welcome-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="fw-bold">Welcome to Your Token Dashboard</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p className="text-muted">Track your FGT rewards, FGTr recycles, and USDT earnings in one view.</p>
          <Button variant="primary" onClick={() => setShowWelcomeModal(false)} className="rounded-pill px-4">Got it!</Button>
        </Modal.Body>
      </Modal>
    </Container>
  )
}

const RecordTable = ({ records, reasonVariant }) => (
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
            <td>Level {r.level}</td>
            <td>{new Date(r.timestamp * 1000).toLocaleDateString()}</td>
            <td><a href={`https://amoy.polygonscan.com/tx/${r.txHash}`} target="_blank">Verify</a></td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
)