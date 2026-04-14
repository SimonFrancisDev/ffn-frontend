
import { ethers } from 'ethers'
import { RECEIPT_TYPES } from './orbitConstants'

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const chunkArray = (arr, size) => {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export const getStructuralParentPosition = (orbitType, position) => {
  if (orbitType === 'P4') return null

  if (orbitType === 'P12') {
    if (position === 4 || position === 7 || position === 10) return 1
    if (position === 5 || position === 8 || position === 11) return 2
    if (position === 6 || position === 9 || position === 12) return 3
    return null
  }

  if (orbitType === 'P39') {
    if (position === 4 || position === 7 || position === 10) return 1
    if (position === 5 || position === 8 || position === 11) return 2
    if (position === 6 || position === 9 || position === 12) return 3
    if (position === 13 || position === 22 || position === 31) return 4
    if (position === 14 || position === 23 || position === 32) return 5
    if (position === 15 || position === 24 || position === 33) return 6
    if (position === 16 || position === 25 || position === 34) return 7
    if (position === 17 || position === 26 || position === 35) return 8
    if (position === 18 || position === 27 || position === 36) return 9
    if (position === 19 || position === 28 || position === 37) return 10
    if (position === 20 || position === 29 || position === 38) return 11
    if (position === 21 || position === 30 || position === 39) return 12
    return null
  }

  return null
}

export const getLineForPosition = (orbitType, position) => {
  if (orbitType === 'P4') return 1
  if (orbitType === 'P12') return position <= 3 ? 1 : 2
  if (orbitType === 'P39') return position <= 3 ? 1 : (position <= 12 ? 2 : 3)
  return 1
}

export const normalizeRuleView = (ruleResult) => {
  if (!ruleResult) return null

  const isHistorical =
    ruleResult.hasStoredRuleData !== undefined ||
    (Array.isArray(ruleResult) && ruleResult.length >= 13)

  if (isHistorical) {
    return {
      cycleNumber: Number(ruleResult.cycleNumber ?? ruleResult[0] ?? 0),
      position: Number(ruleResult.position ?? ruleResult[1] ?? 0),
      line: Number(ruleResult.line ?? ruleResult[2] ?? 0),
      linePaymentNumber: Number(ruleResult.linePaymentNumber ?? ruleResult[3] ?? 0),
      autoUpgradeEnabled: Boolean(ruleResult.autoUpgradeEnabled ?? ruleResult[4] ?? false),
      hasStoredRuleData: Boolean(ruleResult.hasStoredRuleData ?? ruleResult[5] ?? false),
      isFounderNoReferrerPath: false,
      toOwner: Number(ethers.formatUnits(ruleResult.toOwner ?? ruleResult[6] ?? 0, 6)),
      toSpillover1: Number(ethers.formatUnits(ruleResult.toSpillover1 ?? ruleResult[7] ?? 0, 6)),
      toSpillover2: Number(ethers.formatUnits(ruleResult.toSpillover2 ?? ruleResult[8] ?? 0, 6)),
      toEscrow: Number(ethers.formatUnits(ruleResult.toEscrow ?? ruleResult[9] ?? 0, 6)),
      toRecycle: Number(ethers.formatUnits(ruleResult.toRecycle ?? ruleResult[10] ?? 0, 6)),
      spillover1Recipient: ruleResult.spillover1Recipient ?? ruleResult[11] ?? ethers.ZeroAddress,
      spillover2Recipient: ruleResult.spillover2Recipient ?? ruleResult[12] ?? ethers.ZeroAddress
    }
  }

  return {
    position: Number(ruleResult.position ?? ruleResult[0] ?? 0),
    line: Number(ruleResult.line ?? ruleResult[1] ?? 0),
    linePaymentNumber: Number(ruleResult.linePaymentNumber ?? ruleResult[2] ?? 0),
    autoUpgradeEnabled: Boolean(ruleResult.autoUpgradeEnabled ?? ruleResult[3] ?? false),
    isFounderNoReferrerPath: Boolean(ruleResult.isFounderNoReferrerPath ?? ruleResult[4] ?? false),
    hasStoredRuleData: false,
    toOwner: Number(ethers.formatUnits(ruleResult.toOwner ?? ruleResult[5] ?? 0, 6)),
    toSpillover1: Number(ethers.formatUnits(ruleResult.toSpillover1 ?? ruleResult[6] ?? 0, 6)),
    toSpillover2: Number(ethers.formatUnits(ruleResult.toSpillover2 ?? ruleResult[7] ?? 0, 6)),
    toEscrow: Number(ethers.formatUnits(ruleResult.toEscrow ?? ruleResult[8] ?? 0, 6)),
    toRecycle: Number(ethers.formatUnits(ruleResult.toRecycle ?? ruleResult[9] ?? 0, 6)),
    spillover1Recipient: ruleResult.spillover1Recipient ?? ruleResult[10] ?? ethers.ZeroAddress,
    spillover2Recipient: ruleResult.spillover2Recipient ?? ruleResult[11] ?? ethers.ZeroAddress
  }
}

export const buildPositionInfoFromRuleView = (orbitType, position, level, ruleView, orbitOwnerAddress) => {
  const parentPosition = getStructuralParentPosition(orbitType, position)

  if (!ruleView) {
    return {
      type: 'unknown',
      payout: 0,
      escrow: 0,
      spillover: 0,
      description: '',
      toUpline: false,
      line: getLineForPosition(orbitType, position),
      isAutoUpgradeSource: false,
      isRecyclePosition: false,
      spillsTo: parentPosition,
      parentPosition,
      linePaymentNumber: 0,
      orbitOwner: orbitOwnerAddress,
      spillover1Recipient: null,
      spillover2Recipient: null,
      exactToOwner: 0,
      exactToSpillover1: 0,
      exactToSpillover2: 0,
      exactToEscrow: 0,
      exactToRecycle: 0,
      autoUpgradeEnabled: false,
      isFounderNoReferrerPath: false,
      hasStoredRuleData: false
    }
  }

  const totalRouted = (ruleView.toSpillover1 || 0) + (ruleView.toSpillover2 || 0)
  let type = 'unknown'

  if ((ruleView.toRecycle || 0) > 0) type = 'recycle'
  else if ((ruleView.toEscrow || 0) > 0 && (ruleView.toOwner || 0) > 0) type = 'payout-escrow'
  else if ((ruleView.toEscrow || 0) > 0) type = 'escrow'
  else if ((ruleView.toOwner || 0) > 0) type = 'payout'

  const parts = []
  if (ruleView.isFounderNoReferrerPath) {
    parts.push('Founder no-referrer path')
  } else {
    if (ruleView.toOwner > 0) parts.push(`${ruleView.toOwner} USDT to orbit owner`)
    if (ruleView.toSpillover1 > 0) parts.push(`${ruleView.toSpillover1} USDT to spillover recipient 1`)
    if (ruleView.toSpillover2 > 0) parts.push(`${ruleView.toSpillover2} USDT to spillover recipient 2`)
    if (ruleView.toEscrow > 0) parts.push(`${ruleView.toEscrow} USDT to escrow`)
    if (ruleView.toRecycle > 0) parts.push(`${ruleView.toRecycle} USDT to recycle`)
  }

  return {
    type,
    payout: ruleView.toOwner || 0,
    escrow: ruleView.toEscrow || 0,
    spillover: totalRouted,
    description: parts.length ? parts.join(', ') : 'No payout rule data available.',
    toUpline: totalRouted > 0,
    line: ruleView.line || 1,
    isAutoUpgradeSource: (ruleView.toEscrow || 0) > 0,
    isRecyclePosition: (ruleView.toRecycle || 0) > 0,
    spillsTo: parentPosition,
    parentPosition,
    linePaymentNumber: ruleView.linePaymentNumber || 0,
    orbitOwner: orbitOwnerAddress,
    spillover1Recipient: ruleView.spillover1Recipient,
    spillover2Recipient: ruleView.spillover2Recipient,
    exactToOwner: ruleView.toOwner || 0,
    exactToSpillover1: ruleView.toSpillover1 || 0,
    exactToSpillover2: ruleView.toSpillover2 || 0,
    exactToEscrow: ruleView.toEscrow || 0,
    exactToRecycle: ruleView.toRecycle || 0,
    autoUpgradeEnabled: !!ruleView.autoUpgradeEnabled,
    isFounderNoReferrerPath: !!ruleView.isFounderNoReferrerPath,
    hasStoredRuleData: !!ruleView.hasStoredRuleData
  }
}

export const deriveOccupantType = (occupantAddress, viewedAddr, backendItem = {}) => {
  if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return 'empty'
  if (!viewedAddr) return 'other'

  const occupantLower = occupantAddress.toLowerCase()
  const viewedLower = viewedAddr.toLowerCase()

  if (occupantLower === viewedLower) return 'mine'

  const truthLabel = String(backendItem?.truthLabel || '').toUpperCase()
  const referrer =
    backendItem?.referrer ||
    backendItem?.originalReferrer ||
    backendItem?.occupantReferrer ||
    ethers.ZeroAddress

  const referrerLower = String(referrer || ethers.ZeroAddress).toLowerCase()
  const viewerReceiptBreakdown = backendItem?.viewerReceiptBreakdown || {}
  const viewerGotSomething =
    Number(viewerReceiptBreakdown.totalGross || 0) > 0 ||
    Number(viewerReceiptBreakdown.totalLiquid || 0) > 0 ||
    Number(viewerReceiptBreakdown.totalEscrow || 0) > 0

  const isClearlyDownline =
    referrerLower === viewedLower ||
    truthLabel === 'FOUNDER_PATH'

  if (isClearlyDownline) return 'downline'
  if (viewerGotSomething && truthLabel !== 'NO_RECEIPT') return 'other'
  return 'other'
}

export const classifyOccupantType = (occupantAddress, viewedAddr, referrer, truthLabel, payoutReceipts = []) => {
  if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return 'empty'
  if (!viewedAddr) return 'other'

  const occupantLower = occupantAddress.toLowerCase()
  const viewedLower = viewedAddr.toLowerCase()
  const referrerLower = (referrer || ethers.ZeroAddress).toLowerCase()

  if (occupantLower === viewedLower) return 'mine'

  const isFounderPathReceipt =
    truthLabel === 'FOUNDER_PATH' ||
    (payoutReceipts || []).some(r => Number(r?.receiptType) === RECEIPT_TYPES.FOUNDER_PATH)

  if (referrerLower === viewedLower || isFounderPathReceipt) return 'downline'
  return 'other'
}

export const buildReceiptBuckets = (receipts) => {
  const buckets = {}

  for (let level = 1; level <= 10; level++) {
    buckets[level] = {
      receipts: [],
      byFromUser: {},
      byActivationId: {},
      totals: {
        gross: 0,
        escrow: 0,
        liquid: 0,
        founderPathGross: 0,
        founderPathEscrow: 0,
        founderPathLiquid: 0,
        directOwnerGross: 0,
        directOwnerEscrow: 0,
        directOwnerLiquid: 0,
        routedSpilloverGross: 0,
        routedSpilloverEscrow: 0,
        routedSpilloverLiquid: 0,
        recycleGross: 0,
        recycleEscrow: 0,
        recycleLiquid: 0
      }
    }
  }

  for (const receipt of receipts) {
    const level = Number(receipt.level || 0)
    if (!buckets[level]) continue

    const bucket = buckets[level]
    bucket.receipts.push(receipt)

    const fromKey = (receipt.fromUser || ethers.ZeroAddress).toLowerCase()
    if (!bucket.byFromUser[fromKey]) bucket.byFromUser[fromKey] = []
    bucket.byFromUser[fromKey].push(receipt)

    const activationId = Number(receipt.activationId || 0)
    if (activationId > 0) {
      if (!bucket.byActivationId[activationId]) bucket.byActivationId[activationId] = []
      bucket.byActivationId[activationId].push(receipt)
    }

    bucket.totals.gross += receipt.grossAmount || 0
    bucket.totals.escrow += receipt.escrowLocked || 0
    bucket.totals.liquid += receipt.liquidPaid || 0

    if (receipt.receiptType === RECEIPT_TYPES.FOUNDER_PATH) {
      bucket.totals.founderPathGross += receipt.grossAmount || 0
      bucket.totals.founderPathEscrow += receipt.escrowLocked || 0
      bucket.totals.founderPathLiquid += receipt.liquidPaid || 0
    } else if (receipt.receiptType === RECEIPT_TYPES.DIRECT_OWNER) {
      bucket.totals.directOwnerGross += receipt.grossAmount || 0
      bucket.totals.directOwnerEscrow += receipt.escrowLocked || 0
      bucket.totals.directOwnerLiquid += receipt.liquidPaid || 0
    } else if (receipt.receiptType === RECEIPT_TYPES.ROUTED_SPILLOVER) {
      bucket.totals.routedSpilloverGross += receipt.grossAmount || 0
      bucket.totals.routedSpilloverEscrow += receipt.escrowLocked || 0
      bucket.totals.routedSpilloverLiquid += receipt.liquidPaid || 0
    } else if (receipt.receiptType === RECEIPT_TYPES.RECYCLE) {
      bucket.totals.recycleGross += receipt.grossAmount || 0
      bucket.totals.recycleEscrow += receipt.escrowLocked || 0
      bucket.totals.recycleLiquid += receipt.liquidPaid || 0
    }
  }

  return buckets
}

export const createEmptyReceiptSummary = () => ({
  count: 0,
  gross: 0,
  escrow: 0,
  liquid: 0,
  founderPathGross: 0,
  directOwnerGross: 0,
  routedSpilloverGross: 0,
  recycleGross: 0
})

export const createEmptyViewerReceiptBreakdown = () => ({
  count: 0,
  totalGross: 0,
  totalLiquid: 0,
  totalEscrow: 0,
  directOwnerGross: 0,
  directOwnerLiquid: 0,
  directOwnerEscrow: 0,
  routedSpilloverGross: 0,
  routedSpilloverLiquid: 0,
  routedSpilloverEscrow: 0,
  founderPathGross: 0,
  founderPathLiquid: 0,
  founderPathEscrow: 0,
  recycleGross: 0,
  recycleLiquid: 0,
  recycleEscrow: 0
})

export const summarizeReceipts = (receipts = []) => {
  const summary = createEmptyReceiptSummary()
  for (const receipt of receipts) {
    summary.count += 1
    summary.gross += Number(receipt?.grossAmount || 0)
    summary.escrow += Number(receipt?.escrowLocked || 0)
    summary.liquid += Number(receipt?.liquidPaid || 0)

    const type = Number(receipt?.receiptType || 0)
    if (type === RECEIPT_TYPES.FOUNDER_PATH) summary.founderPathGross += Number(receipt?.grossAmount || 0)
    else if (type === RECEIPT_TYPES.DIRECT_OWNER) summary.directOwnerGross += Number(receipt?.grossAmount || 0)
    else if (type === RECEIPT_TYPES.ROUTED_SPILLOVER) summary.routedSpilloverGross += Number(receipt?.grossAmount || 0)
    else if (type === RECEIPT_TYPES.RECYCLE) summary.recycleGross += Number(receipt?.grossAmount || 0)
  }
  return summary
}

export const summarizeViewerReceipts = (viewerReceipts = []) => {
  const breakdown = createEmptyViewerReceiptBreakdown()

  for (const receipt of viewerReceipts) {
    const gross = Number(receipt?.grossAmount || 0)
    const liquid = Number(receipt?.liquidPaid || 0)
    const escrow = Number(receipt?.escrowLocked || 0)
    const type = Number(receipt?.receiptType || 0)

    breakdown.count += 1
    breakdown.totalGross += gross
    breakdown.totalLiquid += liquid
    breakdown.totalEscrow += escrow

    if (type === RECEIPT_TYPES.DIRECT_OWNER) {
      breakdown.directOwnerGross += gross
      breakdown.directOwnerLiquid += liquid
      breakdown.directOwnerEscrow += escrow
    } else if (type === RECEIPT_TYPES.ROUTED_SPILLOVER) {
      breakdown.routedSpilloverGross += gross
      breakdown.routedSpilloverLiquid += liquid
      breakdown.routedSpilloverEscrow += escrow
    } else if (type === RECEIPT_TYPES.FOUNDER_PATH) {
      breakdown.founderPathGross += gross
      breakdown.founderPathLiquid += liquid
      breakdown.founderPathEscrow += escrow
    } else if (type === RECEIPT_TYPES.RECYCLE) {
      breakdown.recycleGross += gross
      breakdown.recycleLiquid += liquid
      breakdown.recycleEscrow += escrow
    }
  }

  return breakdown
}

export const getPositionTruthLabel = (positionReceipts) => {
  if (!positionReceipts || positionReceipts.length === 0) return 'NO_RECEIPT'
  const typeSet = new Set(positionReceipts.map(r => r.receiptType))
  if (typeSet.has(RECEIPT_TYPES.FOUNDER_PATH)) return 'FOUNDER_PATH'
  if (typeSet.has(RECEIPT_TYPES.DIRECT_OWNER) && typeSet.has(RECEIPT_TYPES.ROUTED_SPILLOVER)) return 'DIRECT_AND_ROUTED'
  if (typeSet.has(RECEIPT_TYPES.DIRECT_OWNER)) return 'DIRECT_OWNER'
  if (typeSet.has(RECEIPT_TYPES.ROUTED_SPILLOVER)) return 'ROUTED_SPILLOVER'
  if (typeSet.has(RECEIPT_TYPES.RECYCLE)) return 'RECYCLE'
  return 'UNKNOWN'
}

export const getDisplayPositionType = (position) => {
  const truthLabel = String(position?.truthLabel || '').toUpperCase()
  const fallbackType = String(position?.positionInfo?.type || '').toUpperCase()

  if (truthLabel && truthLabel !== 'UNKNOWN') return truthLabel
  if (fallbackType && fallbackType !== 'UNKNOWN') return fallbackType
  if (!position?.occupant) return 'NO_RECEIPT'
  return 'UNKNOWN'
}

export const getPositionOnRing = (index, total, radiusPx, centerX, centerY, startAngle = -90) => {
  const angle = (index / total) * 360 + startAngle
  const radian = (angle * Math.PI) / 180
  return {
    x: centerX + radiusPx * Math.cos(radian),
    y: centerY + radiusPx * Math.sin(radian),
    angle
  }
}

export const getPositionOnAngle = (angle, radiusPx, centerX, centerY) => {
  const radian = (angle * Math.PI) / 180
  return {
    x: centerX + radiusPx * Math.cos(radian),
    y: centerY + radiusPx * Math.sin(radian),
    angle
  }
}

export const getPlanetSize = (orbitType, stageSize) => {
  const base = orbitType === 'P39' ? 34 : 44
  if (stageSize <= 260) return orbitType === 'P39' ? 22 : 30
  if (stageSize <= 420) return orbitType === 'P39' ? 26 : 36
  return base
}

export const getCoreSize = (orbitType, stageSize) => {
  if (stageSize <= 260) return orbitType === 'P39' ? 64 : 74
  if (stageSize <= 420) return orbitType === 'P39' ? 72 : 82
  return orbitType === 'P39' ? 80 : 96
}

export const getOrbitStructure = (orbitType) => {
  return {
    P4: {
      lines: [1],
      counts: { 1: 4 },
      positions: { 1: [1, 2, 3, 4] },
      startAngles: { 1: -90 },
      customAngles: { 1: { 1: -90, 2: 0, 3: 90, 4: 180 } }
    },
    P12: {
      lines: [1, 2],
      counts: { 1: 3, 2: 9 },
      positions: { 1: [1, 2, 3], 2: [4, 5, 6, 7, 8, 9, 10, 11, 12] },
      startAngles: { 1: -90, 2: -90 },
      customAngles: {
        1: { 1: -90, 2: 30, 3: 150 },
        2: { 4: -138, 7: -102, 10: -66, 5: -18, 8: 18, 11: 54, 6: 102, 9: 138, 12: 174 }
      }
    },
    P39: {
      lines: [1, 2, 3],
      counts: { 1: 3, 2: 9, 3: 27 },
      positions: {
        1: [1, 2, 3],
        2: [4, 5, 6, 7, 8, 9, 10, 11, 12],
        3: Array.from({ length: 27 }, (_, i) => i + 13)
      },
      startAngles: { 1: -90, 2: -90, 3: -90 },
      customAngles: {
        1: { 1: -90, 2: 30, 3: 150 },
        2: { 4: -138, 7: -102, 10: -66, 5: -18, 8: 18, 11: 54, 6: 102, 9: 138, 12: 174 },
        3: {
          13: -145, 22: -133, 31: -121,
          14: -25, 23: -13, 32: -1,
          15: 95, 24: 107, 33: 119,
          16: -109, 25: -97, 34: -85,
          17: 11, 26: 23, 35: 35,
          18: 131, 27: 143, 36: 155,
          19: -73, 28: -61, 37: -49,
          20: 47, 29: 59, 38: 71,
          21: 167, 30: 179, 39: 191
        }
      }
    }
  }[orbitType] || {
    lines: [1],
    counts: { 1: 4 },
    positions: { 1: [1, 2, 3, 4] },
    startAngles: { 1: -90 },
    customAngles: { 1: { 1: -90, 2: 0, 3: 90, 4: 180 } }
  }
}

export const getStarConfig = (count = 36) => (
  Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${((i * 17.73) % 100).toFixed(2)}%`,
    top: `${((i * 11.41 + 23) % 100).toFixed(2)}%`,
    size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
    delay: `${(i * 0.27).toFixed(2)}s`,
    duration: `${(2.8 + (i % 5) * 0.7).toFixed(2)}s`,
    drift: `${(7 + (i % 6) * 1.2).toFixed(2)}s`,
    opacity: i % 4 === 0 ? 0.65 : 0.35
  }))
)
