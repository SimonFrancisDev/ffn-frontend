import { formatReceiptWallet, receiptDate } from './nftReceipt.js'

export const receiptTierImage = (tier) => `/images/freedom-nft/official-cards/${['foundation', 'intermediate', 'advance'][tier - 1]}-tier.png`
export const receiptFilename = (receipt) => `freedom-nft-cycle-${receipt.periodId}-${receipt.ffnId || 'receipt'}.png`

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

export async function createNftReceiptImage(receipt) {
  const canvas = document.createElement('canvas')
  canvas.width = 1400
  canvas.height = 1360
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image download is unavailable in this browser.')
  const image = await loadImage(receiptTierImage(receipt.tier))
  ctx.fillStyle = '#111b1a'
  ctx.fillRect(0, 0, 1400, 1360)
  ctx.fillStyle = '#4fdfb1'
  ctx.fillRect(0, 0, 1400, 12)
  const text = (value, x, y, font, color = '#ffffff', maxWidth = 1216) => {
    ctx.fillStyle = color
    ctx.font = font
    ctx.fillText(value, x, y, maxWidth)
  }
  text('FIN FREEDOM NETWORK', 80, 100, '700 30px Arial', '#4fdfb1')
  text('NFT PAYMENT RECEIPT', 80, 164, '700 20px Arial', '#c0ceca')
  text(`${receipt.amount} USDT`, 80, 278, '700 66px Arial', '#ffffff', 960)
  text(`${receipt.tierName} / Cycle ${receipt.periodId}`, 80, 340, '28px Arial', '#c0ceca', 960)
  text(`${receipt.network} / Payment confirmed`, 80, 394, '24px Arial', '#4fdfb1', 960)
  if (image) {
    const scale = Math.min(190 / image.width, 270 / image.height)
    ctx.drawImage(image, 1130, 155, image.width * scale, image.height * scale)
  }
  const rows = [
    ['FFN ID', receipt.ffnId || 'Not available'],
    ['WALLET', formatReceiptWallet(receipt.wallet)],
    ['PAID AT', receiptDate(receipt.paidAt)],
    ['CYCLE SCHEDULED FOR', receiptDate(receipt.distributionAt)],
    ['TRANSACTION', receipt.txHash],
    ['BLOCK', String(receipt.blockNumber)],
  ]
  rows.forEach(([label, value], index) => {
    const top = 465 + index * 116
    ctx.fillStyle = '#354340'
    ctx.fillRect(80, top, 1240, 1)
    text(label, 80, top + 35, '700 18px Arial', '#92aaa2')
    text(value, 80, top + 80, label === 'TRANSACTION' ? '24px monospace' : '28px Arial')
  })
  text('NFT reward only. Verified against the payout and USDT transfer.', 80, 1224, '22px Arial', '#c0ceca')
  text(receipt.explorerUrl, 80, 1280, '20px monospace', '#4fdfb1')
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not generate the receipt image.')), 'image/png'))
}

export function downloadReceiptImage(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
