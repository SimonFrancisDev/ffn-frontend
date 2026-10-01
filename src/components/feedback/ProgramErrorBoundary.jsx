import { Component } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default class ProgramErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, details) {
    console.error('[PROGRAM_VIEW_FAILED]', { error, details })
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
        <section role="alert" style={{ width: 'min(100%, 560px)', padding: '24px', border: '1px solid rgba(245,158,11,.4)', background: 'var(--surface-primary, #fff)', color: 'var(--text-primary, #172033)' }}>
          <AlertTriangle size={32} color="#f59e0b" />
          <h1 style={{ fontSize: '1.4rem', margin: '14px 0 8px' }}>This program view could not be displayed</h1>
          <p style={{ color: 'var(--text-secondary, #64748b)', lineHeight: 1.6 }}>Your wallet transaction and on-chain data are not affected. Reload this view to retry the live and indexed data checks.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
            <button type="button" onClick={() => window.location.reload()} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 14px' }}><RefreshCw size={17} />Reload view</button>
            <button type="button" onClick={() => { window.location.href = '/' }} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 14px' }}><Home size={17} />Return home</button>
          </div>
        </section>
      </main>
    )
  }
}
