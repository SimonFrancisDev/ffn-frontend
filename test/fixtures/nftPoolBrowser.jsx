import { createRoot } from 'react-dom/client'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../../src/styles/variables.css'
import '../../src/styles/foundation.css'
import '../../src/Pages/Landing/LandingPage.css'
import '../../src/Pages/AdminPanel.css'
import '../../src/Pages/Security/SecurityPage.css'
import '../../src/Pages/Dashboard/DashboardPage.css'
import '../../src/Pages/Community/CommunityPage.css'
import '../../src/Pages/FreedomPlus/FreedomPlusPage.css'
import '../../src/Pages/FreedomPlus/FreedomNftPages.css'
import NftPoolSummary from '../../src/components/metrics/NftPoolSummary.jsx'

const i18n = i18next.createInstance()
i18n.init({ lng: 'en', resources: { en: { translation: {} } }, initImmediate: false })
createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}>
  <main style={{ maxWidth: 1100, margin: 'auto', padding: 16, background: 'var(--ffn-surface)', color: 'var(--text-primary)' }}>
    <h1 style={{ fontSize: 20 }}>NFT pool browser fixture</h1>
    <p>Synthetic display cases, not live financial data.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 16 }}>
      {['F-Freedom dashboard', 'Freedom Plus dashboard'].map(title => <section key={title}>
        <h2 style={{ fontSize: 16 }}>{title}</h2>
        <div className="dashboard-stats__card dashboard-surface"><NftPoolSummary showDistributed /></div>
      </section>)}
      <section><h2 style={{ fontSize: 16 }}>Community</h2><div className="community-metrics__card glass-panel"><NftPoolSummary /></div></section>
      <section><h2 style={{ fontSize: 16 }}>Admin</h2><div className="metric-box-premium"><NftPoolSummary showDistributed /></div></section>
    </div>
    {['NFT overview', 'NFT membership', 'NFT rewards'].map(title => <section key={title} className="fn-pool-band">
      <h2 style={{ fontSize: 16 }}>{title}</h2><NftPoolSummary layout="wide" />
    </section>)}
  </main>
</I18nextProvider>)
