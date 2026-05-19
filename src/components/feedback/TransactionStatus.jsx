import { CheckCircle2, Clock, Loader2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react'
import { Button, InlineAlert } from '../ui'
import './TransactionStatus.css'

const STAGE_CONFIG = {
  idle: { icon: Clock, tone: 'info', label: 'Ready' },
  preflight: { icon: ShieldCheck, tone: 'info', label: 'Checking requirements' },
  signing: { icon: Loader2, tone: 'info', label: 'Waiting for signature' },
  pending: { icon: Loader2, tone: 'warning', label: 'Confirming transaction' },
  submitted: { icon: CheckCircle2, tone: 'success', label: 'Submitted' },
  complete: { icon: CheckCircle2, tone: 'success', label: 'Confirmed' },
  error: { icon: XCircle, tone: 'danger', label: 'Action needed' },
}

export function TransactionStatus({ txState, onReset, explorerBaseUrl = '', className = '' }) {
  if (!txState || txState.status === 'idle') return null

  const config = STAGE_CONFIG[txState.stage] || STAGE_CONFIG[txState.status] || STAGE_CONFIG.pending
  const Icon = config.icon
  const isRunning = txState.status === 'running'
  const explorerUrl = txState.hash && explorerBaseUrl
    ? `${explorerBaseUrl.replace(/\/$/, '')}/${txState.hash}`
    : ''

  return (
    <InlineAlert tone={config.tone} className={`ffn-transaction-status ${className}`} icon={Icon}>
      <div className="ffn-transaction-status__body">
        <strong>{txState.error?.title || config.label}</strong>
        <p>{txState.error?.message || txState.note || 'Your request is being processed.'}</p>
        {txState.error?.action ? <p>{txState.error.action}</p> : null}
        <div className="ffn-transaction-status__actions">
          {isRunning ? <Loader2 size={15} className="ffn-spin" aria-hidden="true" /> : null}
          {txState.hash ? <code>{txState.hash}</code> : null}
          {explorerUrl ? (
            <a href={explorerUrl} target="_blank" rel="noreferrer">
              View transaction
            </a>
          ) : null}
          {txState.status === 'error' && onReset ? (
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset}>
              Reset
            </Button>
          ) : null}
        </div>
      </div>
    </InlineAlert>
  )
}
