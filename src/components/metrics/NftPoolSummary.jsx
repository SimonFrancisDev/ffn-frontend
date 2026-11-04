import { useEffect, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { communitySummaryStore } from '../../Services/communitySummary'
import { readNftPoolMetrics } from '../../utils/nftPoolMetrics.js'
import AnimatedMetricValue from './AnimatedMetricValue'
import './NftPoolSummary.css'

export default function NftPoolSummary({ layout = 'compact', showDistributed = false }) {
  const { t } = useTranslation()
  const snapshot = useSyncExternalStore(communitySummaryStore.subscribe, communitySummaryStore.getSnapshot)
  useEffect(() => { communitySummaryStore.load().catch(() => {}) }, [])
  const pending = snapshot.status === 'idle' || snapshot.status === 'loading'
  const metrics = readNftPoolMetrics(pending ? null : snapshot.payload)
  const rows = [
    ['accumulated', t('nftPoolMetrics.accumulated', { defaultValue: 'Total NFT accumulated (all time)' })],
    ['current', t('nftPoolMetrics.current', { defaultValue: 'Current NFT pool balance' })],
    ...(showDistributed ? [['distributed', t('nftPoolMetrics.distributed', { defaultValue: 'Total NFT distributed' })]] : []),
  ]
  const refreshLabel = t('nftPoolMetrics.refresh', { defaultValue: 'Refresh NFT pool' })
  return (
    <div className={`nft-pool-summary nft-pool-summary--${layout}`} aria-busy={pending}>
      <div className="nft-pool-summary__heading">
        <span>{t('nftPoolMetrics.title', { defaultValue: 'NFT Pool (USDT)' })}</span>
        <button type="button" title={refreshLabel} aria-label={refreshLabel} disabled={pending}
          onClick={() => communitySummaryStore.load({ force: true }).catch(() => {})}>
          <RefreshCw size={16} />
        </button>
      </div>
      <dl>
        {rows.map(([key, label]) => <div key={key} data-pool-metric={key}>
          <dt>{label}</dt>
          <dd>{metrics[key] == null
            ? <span className="nft-pool-summary__status">{pending
                ? t('nftPoolMetrics.loading', { defaultValue: 'Loading...' })
                : t('nftPoolMetrics.unavailable', { defaultValue: 'Unavailable' })}</span>
            : <AnimatedMetricValue value={metrics[key]} prefix="$" decimals={2} />}</dd>
        </div>)}
      </dl>
    </div>
  )
}
