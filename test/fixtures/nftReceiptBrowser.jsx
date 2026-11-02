import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import FreedomNftReceipt from '../../src/Pages/FreedomPlus/FreedomNftReceipt.jsx'

const receipt = {
  chainId: 137, network: 'Browser test fixture (not a payment)',
  wallet: '0x1111111111111111111111111111111111111111', ffnId: 'FFN-SAMPLE',
  periodId: '1', tier: 1, tierName: 'Foundational', amount: '123.456789', amountRaw: '123456789',
  paidAt: '2026-11-02T05:00:00Z', distributionAt: '2026-11-02T00:00:00Z',
  txHash: `0x${'a'.repeat(64)}`, blockNumber: 100,
  explorerUrl: `https://polygonscan.com/tx/0x${'a'.repeat(64)}`,
}
const period = { periodId: 1, claimed: true, status: 'published' }
const loadReceipt = async () => {
  await new Promise(resolve => setTimeout(resolve, 50))
  if (window.failReceipt) throw new Error('Fixture verification failure')
  return receipt
}
function Fixture() {
  const [open, setOpen] = useState(false)
  const [wallet, setWallet] = useState(receipt.wallet)
  window.changeReceiptWallet = () => { window.failReceipt = true; setWallet('0x2222222222222222222222222222222222222222') }
  return <main style={{ minHeight: '150vh', background: '#e8eee9', padding: 24 }}>
    <h1 style={{ fontSize: 20 }}>NFT receipt browser fixture</h1><p>Synthetic data. No payment has been made.</p>
    <button onClick={() => setOpen(true)}>Generate receipt</button>
    {open && <FreedomNftReceipt key={wallet} period={period} wallet={wallet} ffnId="FFN-SAMPLE" onClose={() => setOpen(false)} loadReceipt={loadReceipt}/>}
  </main>
}
createRoot(document.getElementById('root')).render(<Fixture/>)
