import { useEffect, useState } from 'react'
import { Modal } from 'react-bootstrap'
import { Check, Download, ExternalLink, LoaderCircle, RefreshCw, Share2, X } from 'lucide-react'
import { loadNftReceipt } from '../../Services/freedomPlus'
import { formatReceiptWallet, receiptDate } from '../../utils/nftReceipt.js'
import { createNftReceiptImage, downloadReceiptImage, receiptFilename, receiptTierImage } from '../../utils/nftReceiptImage.js'
import './FreedomNftReceipt.css'

export function NftReceiptCard({ receipt }) {
  return <div className="fn-payment-card">
    <div className="fn-payment-card__brand">Fin Freedom Network</div>
    <div className="fn-payment-card__heading">
      <div><span>NFT payment receipt</span><h2>{receipt.amount} <small>USDT</small></h2><p>{receipt.tierName} / Cycle {receipt.periodId}</p><strong><Check aria-hidden="true"/> Payment confirmed</strong></div>
      <img src={receiptTierImage(receipt.tier)} alt={`${receipt.tierName} NFT`}/>
    </div>
    <dl>
      <div><dt>FFN ID</dt><dd>{receipt.ffnId || 'Not available'}</dd></div>
      <div><dt>Wallet</dt><dd className="fn-payment-card__address">{formatReceiptWallet(receipt.wallet)}</dd></div>
      <div><dt>Paid at</dt><dd>{receiptDate(receipt.paidAt)}</dd></div>
      <div><dt>Cycle scheduled for</dt><dd>{receiptDate(receipt.distributionAt)}</dd></div>
      <div><dt>Network</dt><dd>{receipt.network}</dd></div>
      <div><dt>Transaction</dt><dd><a href={receipt.explorerUrl} target="_blank" rel="noopener noreferrer">{receipt.txHash}<ExternalLink size={16} aria-label="Open transaction"/></a></dd></div>
      <div><dt>Block</dt><dd>{receipt.blockNumber}</dd></div>
    </dl>
    <p className="fn-payment-card__note">NFT reward only. Verified against the payout and USDT transfer.</p>
  </div>
}

export default function FreedomNftReceipt({ period, wallet, ffnId, onClose, loadReceipt = loadNftReceipt }) {
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [exporting, setExporting] = useState('')
  const [exportError, setExportError] = useState('')
  const [image, setImage] = useState(null)
  useEffect(() => {
    let current = true
    const timeout = setTimeout(() => {
      current = false
      setError('Verification took too long. Please retry shortly. No receipt has been generated.')
    }, 30000)
    loadReceipt({ period, wallet, ffnId }).then(result => {
      if (current) setReceipt(result)
    }).catch(() => {
      if (current) setError('The payment receipt could not be verified yet. Please retry shortly. No receipt has been generated.')
    }).finally(() => clearTimeout(timeout))
    return () => { current = false; clearTimeout(timeout) }
  }, [period, wallet, ffnId, attempt, loadReceipt])
  // Prepare the file after verification so mobile sharing retains the button's user gesture.
  useEffect(() => {
    let current = true
    if (receipt) createNftReceiptImage(receipt).then(blob => { if (current) setImage(blob) }).catch(() => {
      if (current) setExportError('Image generation failed. Close the receipt and try again.')
    })
    return () => { current = false }
  }, [receipt])
  const saveOrShare = async (mode) => {
    if (!image || exporting) return
    setExporting(mode)
    setExportError('')
    try {
      const name = receiptFilename(receipt)
      const file = new File([image], name, { type: 'image/png' })
      if (mode === 'share' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Freedom NFT / Cycle ${receipt.periodId}` })
      } else downloadReceiptImage(image, name)
    } catch (failure) {
      if (failure.name !== 'AbortError') setExportError('Unable to share this receipt. Please use Download instead.')
    } finally { setExporting('') }
  }
  return <Modal show onHide={onClose} centered scrollable animation={false} className="fn-payment-modal" backdropClassName="fn-payment-backdrop" aria-labelledby="fn-payment-title">
    <Modal.Header><Modal.Title id="fn-payment-title">NFT receipt</Modal.Title><button type="button" className="fn-payment-close" onClick={onClose} title="Close receipt" aria-label="Close receipt"><X/></button></Modal.Header>
    <Modal.Body>{receipt ? <NftReceiptCard receipt={receipt}/> : <div className="fn-payment-state" role="status">
      {error ? <><p>{error}</p><button type="button" onClick={() => { setError(''); setAttempt(value => value + 1) }}><RefreshCw/>Retry verification</button></> : <><LoaderCircle className="fn-payment-loading"/><p>Verifying payment...</p></>}
    </div>}</Modal.Body>
    {receipt && <Modal.Footer>{exportError && <p className="fn-payment-export-error" role="alert">{exportError}</p>}
      <button type="button" disabled={!image || Boolean(exporting)} onClick={() => saveOrShare('download')}><Download/>{image ? 'Download receipt' : 'Preparing image...'}</button>
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <button type="button" className="secondary" disabled={!image || Boolean(exporting)} onClick={() => saveOrShare('share')}><Share2/>Share</button>}
    </Modal.Footer>}
  </Modal>
}
