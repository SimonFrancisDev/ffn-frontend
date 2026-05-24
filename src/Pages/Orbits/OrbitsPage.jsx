import './OrbitsPage.css'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { useTxFlow } from '../../hooks/useTxFlow'
import { useLocation, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { InlineAlert, Skeleton } from '../../components/ui'
import { TransactionStatus, useToast } from '../../components/feedback'
import { resolveIdentity } from '../../utils/identityResolver'
import { getApiUrl } from '../../Services/apiConfig'
import {
  fetchOrbitLevelsApi,
  fetchOrbitLevelSnapshotApi,
  fetchOrbitPositionDetailsApi,
  fetchOrbitCycleSnapshotApi,
  fetchAddressReceiptsApi,
  fetchActivationReceiptsApi,
  clearAddressScopedOrbitsApiCache
} from '../../Services/orbitsApi'
// Skeleton Loader Components
const SkeletonOrbitLevel = () => (
  <div className="skeleton-orbit-level glass-panel">
    <div className="skeleton-header">
      <div className="skeleton-line" style={{ width: '60%' }}></div>
      <div className="skeleton-line" style={{ width: '30%' }}></div>
    </div>
    <div className="skeleton-summary-strip">
      <div className="skeleton-item"></div>
      <div className="skeleton-item"></div>
      <div className="skeleton-item"></div>
      <div className="skeleton-item"></div>
    </div>
    <div className="skeleton-galaxy">
      <div className="skeleton-core"></div>
      <div className="skeleton-ring"></div>
      <div className="skeleton-ring"></div>
      <div className="skeleton-ring"></div>
    </div>
  </div>
)

const SkeletonInfoCard = () => (
  <div className="skeleton-info-card glass-panel">
    <div className="skeleton-line" style={{ width: '50%', marginBottom: '16px' }}></div>
    <div className="skeleton-line" style={{ width: '70%', marginBottom: '12px' }}></div>
    <div className="skeleton-progress"></div>
    <div className="skeleton-line" style={{ width: '80%', marginTop: '12px' }}></div>
  </div>
)

const SkeletonUserList = () => (
  <div className="skeleton-user-list">
    <div className="skeleton-user-item"></div>
    <div className="skeleton-user-item"></div>
    <div className="skeleton-user-item"></div>
  </div>
)

const toFiniteNumber = (value) => {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}

const pickMoneyNumber = (source, keys) => {
  if (!source) return 0
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      return toFiniteNumber(source[key])
    }
  }
  return 0
}

const getReceiptGeneratedGross = (receipt) =>
  pickMoneyNumber(receipt, ['generatedGross', 'grossAmount', 'gross', 'amount'])

const getReceiptWalletCredited = (receipt) =>
  pickMoneyNumber(receipt, ['walletCreditedLiquid', 'liquidPaid', 'totalLiquid'])

const getReceiptEscrowLocked = (receipt) =>
  pickMoneyNumber(receipt, ['receiptEscrowLocked', 'escrowLocked', 'totalEscrow'])

const getReceiptRecycleLiquid = (receipt) =>
  pickMoneyNumber(receipt, ['recyclePaidLiquid'])

const getReceiptRecycleEscrow = (receipt) =>
  pickMoneyNumber(receipt, ['recycleEscrowLocked'])

const getTotalsGeneratedGross = (totals) =>
  pickMoneyNumber(totals, ['generatedGross', 'gross'])

const getTotalsWalletCredited = (totals) =>
  pickMoneyNumber(totals, ['walletCreditedLiquid', 'liquidPaid'])

const getTotalsEscrowLocked = (totals) =>
  pickMoneyNumber(totals, ['receiptEscrowLocked', 'escrowLocked'])

const getViewerGeneratedGross = (breakdown) =>
  pickMoneyNumber(breakdown, ['generatedGross', 'totalGross'])

const getViewerWalletCredited = (breakdown) =>
  pickMoneyNumber(breakdown, ['walletCreditedLiquid', 'totalLiquid'])

const getViewerEscrowLocked = (breakdown) =>
  pickMoneyNumber(breakdown, ['receiptEscrowLocked', 'totalEscrow'])

const getPositionGeneratedGross = (position) => {
  const viewerGross = getViewerGeneratedGross(position?.viewerReceiptBreakdown)
  if (viewerGross > 0) return viewerGross

  const receiptGross = getTotalsGeneratedGross(position?.receiptTotals)
  if (receiptGross > 0) return receiptGross

  return toFiniteNumber(position?.amount)
}

const getPositionWalletCredited = (position) =>
  getViewerWalletCredited(position?.viewerReceiptBreakdown)

export function buildOrbitFinancialSummary({
  level,
  levelData,
  userLock = 0,
  receipts = [],
}) {
  const positions = Array.isArray(levelData?.positions) ? levelData.positions : []
  const indexedReceipts = Array.isArray(receipts) ? receipts : []

  const receiptGross = indexedReceipts.reduce((sum, receipt) => {
    return sum + getReceiptGeneratedGross(receipt)
  }, 0)

  const receiptLiquid = indexedReceipts.reduce((sum, receipt) => {
    return sum + getReceiptWalletCredited(receipt)
  }, 0)

  const receiptEscrow = indexedReceipts.reduce((sum, receipt) => {
    return sum + getReceiptEscrowLocked(receipt)
  }, 0)

  const positionLiquid = positions.reduce((sum, position) => {
    return sum + getViewerWalletCredited(position?.viewerReceiptBreakdown)
  }, 0)

  const positionEscrow = positions.reduce((sum, position) => {
    const viewerEscrow = getViewerEscrowLocked(position?.viewerReceiptBreakdown)
    const receiptTotalsEscrow = getTotalsEscrowLocked(position?.receiptTotals)
    const ruleEscrow = toFiniteNumber(position?.positionInfo?.exactToEscrow)

    return sum + Math.max(viewerEscrow, receiptTotalsEscrow, ruleEscrow)
  }, 0)

  const positionGross = positions.reduce((sum, position) => {
    const viewerGross = getViewerGeneratedGross(position?.viewerReceiptBreakdown)
    const receiptTotalsGross = getTotalsGeneratedGross(position?.receiptTotals)
    const ruleOwner = toFiniteNumber(position?.positionInfo?.exactToOwner)
    const ruleEscrow = toFiniteNumber(position?.positionInfo?.exactToEscrow)

    return sum + Math.max(viewerGross, receiptTotalsGross, ruleOwner + ruleEscrow)
  }, 0)

  /*
    Truth priority:
    1. Receipts if available, because they represent indexed payment truth.
    2. Position-level viewer breakdowns if receipts are not available.
    3. levelData.totalEarned/userLock as fallback.
  */
  const grossFromReceipts = receiptGross
  const grossFromPositions = Math.max(positionGross, positionLiquid + positionEscrow)
  const grossFromSnapshot = toFiniteNumber(levelData?.totalEarned)

  const totalGenerated = Math.max(
    grossFromReceipts,
    grossFromPositions,
    grossFromSnapshot
  )

  const escrowUsed = Math.max(
    receiptEscrow,
    positionEscrow,
    toFiniteNumber(userLock)
  )

 const walletCredited = Math.max(
  receiptLiquid,
  positionLiquid
  )

  const unclassifiedAmount = Math.max(
    0,
    totalGenerated - escrowUsed - walletCredited
  )

  return {
    level,
    orbitType: levelData?.orbitType || '',
    totalGenerated: Math.max(0, totalGenerated),
    totalEarned: Math.max(0, totalGenerated),
    escrowUsed: Math.max(0, escrowUsed),
    totalEscrowUsed: Math.max(0, escrowUsed),
    walletCredited: Math.max(0, walletCredited),
    estimatedWalletReceived: Math.max(0, walletCredited),
    unclassifiedAmount: Math.max(0, unclassifiedAmount),
    isComplete: unclassifiedAmount <= 0.000001,
    receiptGross,
    receiptLiquid,
    receiptEscrow,
    positionGross,
    positionLiquid,
    positionEscrow,
    receiptCount: indexedReceipts.length,
    positionCount: positions.length,
    filledPositions: positions.filter((position) => position?.occupant).length,
    source:
      indexedReceipts.length > 0
        ? 'indexed_receipts'
        : positions.length > 0
          ? 'position_breakdown_estimate'
          : 'level_snapshot_estimate',
  }
}

const OrbitsPage = () => {
  const { t } = useTranslation()
  const orbitsT = useCallback((key, fallback, options) => t(`orbitsPage.${key}`, fallback, options), [t])
  const toast = useToast()
  const { isConnected, account, connect } = useWallet()
  const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()
  const { txState: orbitTxState } = useTxFlow()
  const location = useLocation()
  const navigate = useNavigate()
  const routedLevel = Number(location.state?.level || 0)
  const routedAddress = location.state?.address || ''
  const routedDisplayId = location.state?.displayId || ''
  const focusedOnly = location.state?.focusedOnly === true && routedLevel >= 1 && routedLevel <= 10
  const visibleLevels = focusedOnly ? [routedLevel] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const [orbitData, setOrbitData] = useState({})
  const [userLocks, setUserLocks] = useState({})
  const [downlineData, setDownlineData] = useState({})
  const [spilloverData, setSpilloverData] = useState({})
  const [orbitError, setOrbitError] = useState('')
  const [viewMode, setViewMode] = useState('global')
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [showPositionModal, setShowPositionModal] = useState(false)
  const [hoveredPosition, setHoveredPosition] = useState(null)
  const [showStructuralPreview, setShowStructuralPreview] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 640, height: 640 })
  const [orbitPan, setOrbitPan] = useState({ x: 0, y: 0 })
  const [isOrbitPanning, setIsOrbitPanning] = useState(false)
  const [isGalaxyMeasured, setIsGalaxyMeasured] = useState(false)
  const [viewAddress, setViewAddress] = useState('')
  const [inputAddress, setInputAddress] = useState('')
  const [viewedLevels, setViewedLevels] = useState({})
  const [cycleHistoryData, setCycleHistoryData] = useState({})
  const [selectedCycleByLevel, setSelectedCycleByLevel] = useState({})
  const [loadingCycleByLevel, setLoadingCycleByLevel] = useState({})
  const [cycleHistorySupportByLevel, setCycleHistorySupportByLevel] = useState({})
  const [linePaymentCountsByLevel, setLinePaymentCountsByLevel] = useState({})
  const [viewAddressReceipts, setViewAddressReceipts] = useState([])
  const [receiptBucketsByLevel, setReceiptBucketsByLevel] = useState({})
  const [receiptsSupported, setReceiptsSupported] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState(
    focusedOnly ? `level${routedLevel}` : 'level1'
  )
  const [isLoadingOrbits, setIsLoadingOrbits] = useState(true)
  const [loadingLevelsMap, setLoadingLevelsMap] = useState({})
  const [orbitZoom, setOrbitZoom] = useState(1)

  const [isOrbitToolsOpen, setIsOrbitToolsOpen] = useState(false)
  const [orbitCockpitTab, setOrbitCockpitTab] = useState('overview')

  const [orbitDisplayOptions, setOrbitDisplayOptions] = useState({
    orbitHeaderCard: false,
    summaryStrip: false,
    cycleSwitcher: false,
    legend: false,
    hoverCard: false,
    structureLines: false,
  })

  const [viewedLevelsReady, setViewedLevelsReady] = useState(false)
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [resolvedMemberIds, setResolvedMemberIds] = useState({})
  const [identityLookupState, setIdentityLookupState] = useState({ status: 'idle', message: '' })

  const galaxyRef = useRef(null)
  const modalRef = useRef(null)
  const orbitDragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    didDrag: false
  })
  const referrerCacheRef = useRef(new Map())
  const directDownlineSetRef = useRef(new Set())
  const viewedLevelsCacheRef = useRef(new Map())
  const fetchIdRef = useRef(0)
  const cycleHistoryCacheRef = useRef(new Map())
  const receiptCacheRef = useRef(new Map())
  const activationReceiptCacheRef = useRef(new Map())
  const loadedLevelsRef = useRef(new Set())
  const loadingLevelsRef = useRef(new Set())
  const positionDetailsCacheRef = useRef(new Map())
  const positionHydrationPromisesRef = useRef(new Map())
  const lastResetAddressRef = useRef('')
  const bootstrapAddressRef = useRef('')
  const bootInFlightRef = useRef(false)
  const memberIdCacheRef = useRef(new Map())
  const identityAbortRef = useRef(null)

  const RECEIPT_TYPES = {
    FOUNDER_PATH: 1,
    DIRECT_OWNER: 2,
    ROUTED_SPILLOVER: 3,
    RECYCLE: 4
  }

  const orbitTypeConfig = {
    P4: { name: 'P4', positions: 4, lines: 1, lineSizes: [4], levels: [1, 4, 7, 10] },
    P12: { name: 'P12', positions: 12, lines: 2, lineSizes: [3, 9], levels: [2, 5, 8] },
    P39: { name: 'P39', positions: 39, lines: 3, lineSizes: [3, 9, 27], levels: [3, 6, 9] }
  }

  const levelToOrbitType = {
    1: 'P4', 2: 'P12', 3: 'P39', 4: 'P4', 5: 'P12',
    6: 'P39', 7: 'P4', 8: 'P12', 9: 'P39', 10: 'P4'
  }

  const levelConfig = {
    1: { price: 10, upgradeReq: 20, nextLevel: 2 },
    2: { price: 20, upgradeReq: 40, nextLevel: 3 },
    3: { price: 40, upgradeReq: 80, nextLevel: 4 },
    4: { price: 80, upgradeReq: 160, nextLevel: 5 },
    5: { price: 160, upgradeReq: 320, nextLevel: 6 },
    6: { price: 320, upgradeReq: 640, nextLevel: 7 },
    7: { price: 640, upgradeReq: 1280, nextLevel: 8 },
    8: { price: 1280, upgradeReq: 2560, nextLevel: 9 },
    9: { price: 2560, upgradeReq: 5120, nextLevel: 10 },
    10: { price: 5120, upgradeReq: 10240, nextLevel: 11 }
  }

  const normalizedViewAddress = useMemo(() => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) return ''
    return viewAddress.toLowerCase()
  }, [viewAddress])

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
    try {
      return await fn()
    } catch (err) {
      const isRateLimited =
        err?.code === -32005 ||
        err?.status === 429 ||
        String(err?.message || '').includes('rate limited')
      if (!isRateLimited || retries <= 0) throw err
      await delay(wait)
      return withRetry(fn, retries - 1, wait * 2)
    }
  }, [])

  const formatUsdt = useCallback((value) => {
    try {
      return Number(ethers.formatUnits(value ?? 0, 6))
    } catch {
      return 0
    }
  }, [])

  const formatUsdtDisplay = useCallback((value) => {
    const num = typeof value === 'number' ? value : Number(value || 0)
    if (!Number.isFinite(num)) return '0'
    if (Math.abs(num % 1) < 0.000001) return String(num)
    return num.toFixed(6).replace(/\.?0+$/, '')
  }, [])

  const getEstimatedNetAmount = useCallback((grossAmount) => {
    const systemCharge = grossAmount * 0.10
    return Math.max(0, grossAmount - systemCharge)
  }, [])

  const clampOrbitPan = useCallback((nextPan, zoomValue = orbitZoom) => {
    if (zoomValue <= 1) return { x: 0, y: 0 }

    const extraX = Math.max(0, (containerSize.width * (zoomValue - 1)) / 2)
    const extraY = Math.max(0, (containerSize.height * (zoomValue - 1)) / 2)
    const limitX = extraX + 96
    const limitY = extraY + 96

    return {
      x: Math.max(-limitX, Math.min(limitX, nextPan.x)),
      y: Math.max(-limitY, Math.min(limitY, nextPan.y))
    }
  }, [containerSize.height, containerSize.width, orbitZoom])

  const shortAddress = useCallback((addr) => {
    if (!addr || addr === ethers.ZeroAddress) return '—'
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`
  }, [])

  const shortTx = useCallback((txHash) => {
    if (!txHash) return '—'
    return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
  }, [])

  const getReceiptTypeLabel = (receipt) => {
    const type = Number(receipt?.receiptType || 0)
    if (type === RECEIPT_TYPES.FOUNDER_PATH) return orbitsT('receiptTypes.founderPath', 'Founder Path')
    if (type === RECEIPT_TYPES.DIRECT_OWNER) return orbitsT('receiptTypes.directOwner', 'Direct Owner')
    if (type === RECEIPT_TYPES.ROUTED_SPILLOVER) return orbitsT('receiptTypes.routedSpillover', 'Routed Spillover')
    if (type === RECEIPT_TYPES.RECYCLE) return orbitsT('receiptTypes.recycle', 'Recycle')
    return receipt?.rawEventName || orbitsT('receiptTypes.unknown', 'Receipt')
  }

  const getMemberLabel = useCallback((address) => {
    if (!address || address === ethers.ZeroAddress) return orbitsT('modal.memberIdUnavailable', 'ID unavailable')
    return resolvedMemberIds[address?.toLowerCase?.()] || shortAddress(address)
  }, [orbitsT, resolvedMemberIds, shortAddress])

  const handleOrbitPointerDown = useCallback((event) => {
    if (orbitZoom <= 1) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    orbitDragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: orbitPan.x,
      startPanY: orbitPan.y,
      didDrag: false
    }
    setIsOrbitPanning(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }, [orbitPan.x, orbitPan.y, orbitZoom])

  const handleOrbitPointerMove = useCallback((event) => {
    const drag = orbitDragRef.current
    if (!drag.active) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      drag.didDrag = true
    }

    setOrbitPan(clampOrbitPan({
      x: drag.startPanX + dx,
      y: drag.startPanY + dy
    }))
    event.preventDefault()
  }, [clampOrbitPan])

  const handleOrbitPointerEnd = useCallback((event) => {
    if (!orbitDragRef.current.active) return

    const hadDrag = orbitDragRef.current.didDrag
    orbitDragRef.current.active = false
    setIsOrbitPanning(false)
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {
      // Pointer may already be released by the browser.
    }

    window.setTimeout(() => {
      orbitDragRef.current.didDrag = false
    }, hadDrag ? 80 : 0)
  }, [])

  const getSpilloverReceiptRows = useCallback((position) => {
    const receipts = Array.isArray(position?.indexedReceipts) ? position.indexedReceipts : []
    return receipts
      .filter((receipt) => Number(receipt.receiptType || 0) === 3)
      .map((receipt, index) => {
        const roleText = String(receipt.routedRole || '').toLowerCase()
        const spilloverNumber = roleText.includes('2') ? 2 : index + 1
        return {
          key: `${receipt.txHash}-${receipt.logIndex}-${index}`,
          label: spilloverNumber === 2 ? 'Spillover 2' : 'Spillover 1',
          receiver: receipt.receiver,
          amount: getReceiptGeneratedGross(receipt) || getReceiptWalletCredited(receipt),
          txHash: receipt.txHash,
        }
      })
      .slice(0, 2)
  }, [])

  const formatTruthLabel = useCallback((truthLabel) => {
    if (!truthLabel) return orbitsT('truth.unknown', 'Unknown')
    return String(truthLabel)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }, [])

  const fetchMemberId = useCallback(async (address) => {
    if (!address || !ethers.isAddress(address)) return '—'

    const key = address.toLowerCase()
    if (memberIdCacheRef.current.has(key)) {
      return memberIdCacheRef.current.get(key)
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''}/api/referral/code/${address}`)
      const data = await res.json()

      const displayId = data?.shortCode || shortAddress(address)
      memberIdCacheRef.current.set(key, displayId)
      return displayId
    } catch {
      memberIdCacheRef.current.set(key, shortAddress(address))
      return shortAddress(address)
    }
  }, [shortAddress])

  const getExecutedEscrowLocked = useCallback((position) => {
    if (!position) return 0

    const viewerEscrow = getViewerEscrowLocked(position.viewerReceiptBreakdown)
    if (viewerEscrow > 0) return viewerEscrow

    const receiptEscrow = getTotalsEscrowLocked(position.receiptTotals)
    if (receiptEscrow > 0) return receiptEscrow

    return Number(position.positionInfo?.exactToEscrow || 0)
  }, [])

  const getCachedReferrer = useCallback(async (address) => {
    const key = address.toLowerCase()
    if (referrerCacheRef.current.has(key)) return referrerCacheRef.current.get(key)
    if (!contracts?.registration) return ethers.ZeroAddress
    const referrer = await withRetry(() => contracts.registration.getReferrer(address))
    referrerCacheRef.current.set(key, referrer)
    return referrer
  }, [contracts, withRetry])

  const resolveOccupantReferrer = useCallback(async (occupantAddress, backendItem = {}) => {
    if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return ethers.ZeroAddress
    const existingReferrer =
      backendItem?.referrer ||
      backendItem?.originalReferrer ||
      backendItem?.occupantReferrer ||
      ethers.ZeroAddress
    if (existingReferrer && existingReferrer !== ethers.ZeroAddress) return existingReferrer
    try {
      return await getCachedReferrer(occupantAddress)
    } catch {
      return ethers.ZeroAddress
    }
  }, [getCachedReferrer])

  const refreshDirectDownlineSet = useCallback(async (address) => {
    if (!address || !ethers.isAddress(address)) {
      directDownlineSetRef.current = new Set()
      return directDownlineSetRef.current
    }

    try {
      const res = await fetch(getApiUrl(`/api/community/member/${encodeURIComponent(address)}/referrals`))
      const payload = await res.json().catch(() => null)
      const rows = payload?.data?.directReferrals || []
      directDownlineSetRef.current = new Set(
        rows
          .map((item) => String(item.user || '').toLowerCase())
          .filter(Boolean)
      )
    } catch {
      directDownlineSetRef.current = new Set()
    }

    return directDownlineSetRef.current
  }, [])

  useEffect(() => {
    setShowStructuralPreview(Boolean(orbitDisplayOptions.structureLines))
  }, [orbitDisplayOptions.structureLines])

  const getStructuralParentPosition = (orbitType, position) => {
    if (orbitType === 'P4') return null
    if (orbitType === 'P12') {
      if ([4, 7, 10].includes(position)) return 1
      if ([5, 8, 11].includes(position)) return 2
      if ([6, 9, 12].includes(position)) return 3
      return null
    }
    if (orbitType === 'P39') {
      const parentMap = {
        4: 1, 7: 1, 10: 1,
        5: 2, 8: 2, 11: 2,
        6: 3, 9: 3, 12: 3,
        13: 4, 22: 4, 31: 4,
        14: 5, 23: 5, 32: 5,
        15: 6, 24: 6, 33: 6,
        16: 7, 25: 7, 34: 7,
        17: 8, 26: 8, 35: 8,
        18: 9, 27: 9, 36: 9,
        19: 10, 28: 10, 37: 10,
        20: 11, 29: 11, 38: 11,
        21: 12, 30: 12, 39: 12
      }
      return parentMap[position] || null
    }
    return null
  }

  const getLineForPosition = (orbitType, position) => {
    if (orbitType === 'P4') return 1
    if (orbitType === 'P12') return position <= 3 ? 1 : 2
    if (orbitType === 'P39') return position <= 3 ? 1 : (position <= 12 ? 2 : 3)
    return 1
  }

  const getOrbitStructure = (orbitType) => {
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
          2: { 4: -138, 7: -120, 10: -102, 5: -18, 8: 0, 11: 18, 6: 102, 9: 120, 12: 138 }
        }
      },
      P39: {
        lines: [1, 2, 3],
        counts: { 1: 3, 2: 9, 3: 27 },
        positions: { 1: [1, 2, 3], 2: [4, 5, 6, 7, 8, 9, 10, 11, 12], 3: Array.from({ length: 27 }, (_, i) => i + 13) },
        startAngles: { 1: -90, 2: -90, 3: -90 },
        customAngles: {
          1: { 1: -90, 2: 30, 3: 150 },
          2: { 4: -138, 7: -120, 10: -102, 5: -18, 8: 0, 11: 18, 6: 102, 9: 120, 12: 138 },
          3: {
            13: -168, 22: -160, 31: -152,
            14: -128, 23: -120, 32: -112,
            15: -88, 24: -80, 33: -72,
            16: -48, 25: -40, 34: -32,
            17: -8, 26: 0, 35: 8,
            18: 32, 27: 40, 36: 48,
            19: 72, 28: 80, 37: 88,
            20: 112, 29: 120, 38: 128,
            21: 152, 30: 160, 39: 168
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

  const getStarConfig = (count = 36) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${((i * 17.73) % 100).toFixed(2)}%`,
      top: `${((i * 11.41 + 23) % 100).toFixed(2)}%`,
      size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
      delay: `${(i * 0.27).toFixed(2)}s`,
      duration: `${(2.8 + (i % 5) * 0.7).toFixed(2)}s`,
      drift: `${(7 + (i % 6) * 1.2).toFixed(2)}s`,
      opacity: i % 4 === 0 ? 0.65 : 0.35
    }))
  }

  const starConfig = getStarConfig(40)

  const getPlanetSize = (orbitType, stageSize) => {
    const base = orbitType === 'P39' ? 34 : 44
    if (stageSize <= 260) return orbitType === 'P39' ? 22 : 30
    if (stageSize <= 420) return orbitType === 'P39' ? 26 : 36
    return base
  }

  const getCoreSize = (orbitType, stageSize) => {
    if (stageSize <= 260) return orbitType === 'P39' ? 64 : 74
    if (stageSize <= 420) return orbitType === 'P39' ? 72 : 82
    return orbitType === 'P39' ? 80 : 96
  }

  const getPositionOnRing = (index, total, radiusPx, centerX, centerY, startAngle = -90) => {
    const angle = (index / total) * 360 + startAngle
    const radian = (angle * Math.PI) / 180
    return { x: centerX + radiusPx * Math.cos(radian), y: centerY + radiusPx * Math.sin(radian), angle }
  }

  const getPositionOnAngle = (angle, radiusPx, centerX, centerY) => {
    const radian = (angle * Math.PI) / 180
    return { x: centerX + radiusPx * Math.cos(radian), y: centerY + radiusPx * Math.sin(radian), angle }
  }

  const deriveOccupantType = useCallback((occupantAddress, viewedAddr, backendItem = {}) => {
    if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return 'empty'
    if (!viewedAddr) return 'other'

    const occupantLower = occupantAddress.toLowerCase()
    const viewedLower = viewedAddr.toLowerCase()
    if (occupantLower === viewedLower) return 'mine'
    if (directDownlineSetRef.current.has(occupantLower)) return 'downline'

    const truthLabel = String(backendItem?.truthLabel || '').toUpperCase()
    const referrer =
      backendItem?.referrer ||
      backendItem?.originalReferrer ||
      backendItem?.occupantReferrer ||
      ethers.ZeroAddress
    const referrerLower = String(referrer || ethers.ZeroAddress).toLowerCase()

    const viewerReceiptBreakdown = backendItem?.viewerReceiptBreakdown || {}
    const viewerGotSomething =
      getViewerGeneratedGross(viewerReceiptBreakdown) > 0 ||
      getViewerWalletCredited(viewerReceiptBreakdown) > 0 ||
      getViewerEscrowLocked(viewerReceiptBreakdown) > 0

    const isClearlyDownline = referrerLower === viewedLower || truthLabel === 'FOUNDER_PATH'
    if (isClearlyDownline) return 'downline'
    if (viewerGotSomething && truthLabel !== 'NO_RECEIPT') return 'other'
    return 'other'
  }, [])

  const buildPositionInfoFromRuleView = (orbitType, position, level, ruleView, orbitOwnerAddress) => {
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

    const toOwner = Number(ruleView.toOwner || 0)
    const toSpillover1 = Number(ruleView.toSpillover1 || 0)
    const toSpillover2 = Number(ruleView.toSpillover2 || 0)
    const toEscrow = Number(ruleView.toEscrow || 0)
    const toRecycle = Number(ruleView.toRecycle || 0)

    return {
      type:
        toRecycle > 0
          ? 'recycle'
          : toEscrow > 0 && toOwner > 0
            ? 'payout-escrow'
            : toEscrow > 0
              ? 'escrow'
              : toOwner > 0
                ? 'payout'
                : 'unknown',
      payout: toOwner,
      escrow: toEscrow,
      spillover: toSpillover1 + toSpillover2,
      description: `${toOwner} USDT to owner, ${toSpillover1} to spillover1, ${toSpillover2} to spillover2, ${toEscrow} to escrow, ${toRecycle} to recycle`,
      toUpline: (toSpillover1 + toSpillover2) > 0,
      line: ruleView.line || 1,
      isAutoUpgradeSource: toEscrow > 0,
      isRecyclePosition: toRecycle > 0,
      spillsTo: parentPosition,
      parentPosition,
      linePaymentNumber: ruleView.linePaymentNumber || 0,
      orbitOwner: orbitOwnerAddress,
      spillover1Recipient: ruleView.spillover1Recipient,
      spillover2Recipient: ruleView.spillover2Recipient,
      exactToOwner: toOwner,
      exactToSpillover1: toSpillover1,
      exactToSpillover2: toSpillover2,
      exactToEscrow: toEscrow,
      exactToRecycle: toRecycle,
      autoUpgradeEnabled: !!ruleView.autoUpgradeEnabled,
      isFounderNoReferrerPath: !!ruleView.isFounderNoReferrerPath,
      hasStoredRuleData: !!ruleView.hasStoredRuleData
    }
  }

  const getPlanetBadgeValue = useCallback((position) => {
    if (!position?.occupant) return 0
    if (receiptsSupported && position.viewerReceiptBreakdown) {
      return getViewerWalletCredited(position.viewerReceiptBreakdown)
    }
    return Number(position?.positionInfo?.exactToOwner || 0)
  }, [receiptsSupported])

  const mergePositionTruth = useCallback(async (level, rawPosition, orbitTypeOverride = null, cycleNumber = 0, isHistoricalPosition = false) => {
    const orbitType = orbitTypeOverride || rawPosition?.orbitType || levelToOrbitType[level]
    const occupant = rawPosition?.occupant || null
    const resolvedReferrer = await resolveOccupantReferrer(occupant, rawPosition)

    const enrichedBase = {
      ...rawPosition,
      level,
      cycleNumber,
      isHistoricalPosition,
      orbitType,
      referrer: rawPosition?.referrer || resolvedReferrer,
      originalReferrer: rawPosition?.originalReferrer || resolvedReferrer,
      occupantReferrer: rawPosition?.occupantReferrer || resolvedReferrer
    }

    const occupantType = deriveOccupantType(
      occupant,
      viewAddress,
      enrichedBase
    )

    const positionInfo = buildPositionInfoFromRuleView(
      orbitType,
      rawPosition?.number,
      level,
      rawPosition?.ruleView || null,
      viewAddress
    )

    return {
      ...enrichedBase,
      occupantType,
      amount: rawPosition?.amount || '0',
      timestamp: Number(rawPosition?.timestamp || 0),
      line: rawPosition?.line || positionInfo.line,
      spillsTo: positionInfo.spillsTo,
      parentPosition: rawPosition?.parentPosition ?? positionInfo.parentPosition,
      truthLabel: rawPosition?.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT'),
      positionInfo,
      activationId: Number(rawPosition?.activationId || 0),
      activationCycleNumber: Number(rawPosition?.activationCycleNumber || cycleNumber || 0),
      isMirrorActivation: !!rawPosition?.isMirrorActivation,
      indexedEventCount: Number(rawPosition?.indexedEventCount || 0),
      indexedReceiptCount: Number(rawPosition?.indexedReceiptCount || 0),
      receiptTotals: rawPosition?.receiptTotals || {
        count: 0,
        gross: 0,
        generatedGross: 0,
        escrowLocked: 0,
        receiptEscrowLocked: 0,
        liquidPaid: 0,
        walletCreditedLiquid: 0,
        recyclePaidLiquid: 0,
        recycleEscrowLocked: 0
      },
      viewerReceiptBreakdown: rawPosition?.viewerReceiptBreakdown || {
        count: 0,
        totalGenerated: 0,
        totalLiquid: 0,
        totalEscrow: 0,
        generatedGross: 0,
        walletCreditedLiquid: 0,
        receiptEscrowLocked: 0,
        recyclePaidLiquid: 0,
        recycleEscrowLocked: 0
      },
      indexedReceipts: rawPosition?.indexedReceipts || [],
      indexedEvents: rawPosition?.indexedEvents || [],
      ruleView: rawPosition?.ruleView || null,
      receiptsHydrated: !!(
        rawPosition?.indexedReceipts ||
        rawPosition?.indexedEvents ||
        rawPosition?.activationId ||
        rawPosition?.ruleView
      )
    }
  }, [resolveOccupantReferrer, deriveOccupantType, viewAddress])

  const fetchViewedLevels = useCallback(async (forceRefresh = false) => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) return
    const key = viewAddress.toLowerCase()
    if (!forceRefresh && viewedLevelsCacheRef.current.has(key)) {
      setViewedLevels(viewedLevelsCacheRef.current.get(key))
      setViewedLevelsReady(true)
      return
    }
    try {
      const result = await fetchOrbitLevelsApi(viewAddress)
      const levels = Object.fromEntries((result?.levels || []).map((item) => [item.level, !!item.isActive]))
      viewedLevelsCacheRef.current.set(key, levels)
      setViewedLevels(levels)
      setViewedLevelsReady(true)
    } catch (err) {
      console.error('Error fetching viewed levels:', err)
      setViewedLevelsReady(true)
    }
  }, [viewAddress])

  const fetchViewedAddressReceipts = useCallback(async (forceRefresh = false) => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) {
      setViewAddressReceipts([])
      setReceiptBucketsByLevel({})
      setReceiptsSupported(false)
      return
    }

    const cacheKey = `${viewAddress.toLowerCase()}-backend-receipts`
    if (!forceRefresh && receiptCacheRef.current.has(cacheKey)) {
      const cachedReceipts = receiptCacheRef.current.get(cacheKey)
      setViewAddressReceipts(cachedReceipts)
      setReceiptsSupported(true)
      return
    }

    setReceiptsLoading(true)
    try {
      const result = await fetchAddressReceiptsApi(viewAddress)
      const receipts = Array.isArray(result?.receipts) ? result.receipts : []
      receiptCacheRef.current.set(cacheKey, receipts)
      setViewAddressReceipts(receipts)
      setReceiptsSupported(true)
    } catch (err) {
      console.error('Error fetching receipts:', err)
      setReceiptsSupported(false)
    } finally {
      setReceiptsLoading(false)
    }
  }, [viewAddress])

 const fetchStoredCycleForLevel = useCallback(async (level, cycleNumber, forceRefresh = false) => {
    if (!viewAddress || !ethers.isAddress(viewAddress) || !orbitData[level]) return []
    const cacheKey = `${viewAddress.toLowerCase()}-${level}-${cycleNumber}`
    if (!forceRefresh && cycleHistoryCacheRef.current.has(cacheKey)) {
        return cycleHistoryCacheRef.current.get(cacheKey)
      }

      if (forceRefresh) {
        cycleHistoryCacheRef.current.delete(cacheKey)
      }

    try {
      const snapshot = await fetchOrbitCycleSnapshotApi(viewAddress, level, cycleNumber, {
          forceRefresh,
        })
      const orbitType = snapshot?.orbitType || levelToOrbitType[level]

      const positions = await Promise.all(
        (snapshot?.positions || []).map(async (pos) => {
          return await mergePositionTruth(level, pos, orbitType, Number(cycleNumber), true)
        })
      )

      cycleHistoryCacheRef.current.set(cacheKey, positions)
      return positions
    } catch (err) {
      console.error(`Failed to fetch cycle history for level ${level}, cycle ${cycleNumber}:`, err)
      throw err
    }
  }, [viewAddress, orbitData, mergePositionTruth])

  const loadCycleHistoryForLevel = useCallback(async (level, cycleNumber, forceRefresh = false) => {
    if (!viewAddress || !ethers.isAddress(viewAddress) || !orbitData[level]) return
    const cycleKey = String(cycleNumber)
    if (!forceRefresh && cycleHistoryData[level]?.[cycleKey]) return

    setLoadingCycleByLevel(prev => ({ ...prev, [level]: true }))
    try {
      const positions = await fetchStoredCycleForLevel(level, cycleNumber, forceRefresh)
      setCycleHistoryData(prev => ({
        ...prev,
        [level]: { ...(prev[level] || {}), [cycleKey]: positions }
      }))
      setCycleHistorySupportByLevel(prev => ({ ...prev, [level]: true }))
    } catch (err) {
      setCycleHistorySupportByLevel(prev => ({ ...prev, [level]: false }))
    } finally {
      setLoadingCycleByLevel(prev => ({ ...prev, [level]: false }))
    }
  }, [viewAddress, orbitData, cycleHistoryData, fetchStoredCycleForLevel])

  const fetchOrbitLevelData = useCallback(async (level, options = {}) => {
    const { forceRefresh = false, silent = false } = options
    if (!viewAddress || !ethers.isAddress(viewAddress) || level < 1 || level > 10) return

    const fetchKey = `${viewAddress.toLowerCase()}-${level}`
    const requestEpoch = fetchIdRef.current

    if (forceRefresh) {
      loadedLevelsRef.current.delete(fetchKey)
      positionDetailsCacheRef.current.delete(fetchKey)
    }
    if (!forceRefresh && loadedLevelsRef.current.has(fetchKey)) return
    if (loadingLevelsRef.current.has(fetchKey)) return

    loadingLevelsRef.current.add(fetchKey)
    setLoadingLevelsMap(prev => ({ ...prev, [level]: true }))

    try {
      await refreshDirectDownlineSet(viewAddress)

        const snapshot = await fetchOrbitLevelSnapshotApi(viewAddress, level, {
          forceRefresh,
        })
      if (requestEpoch !== fetchIdRef.current) return

      const orbitType = snapshot.orbitType
      const config = orbitTypeConfig[orbitType]

      const positions = await Promise.all(
        (snapshot.positions || []).map(async (pos) => {
          return await mergePositionTruth(level, pos, orbitType, 0, false)
        })
      )

      const myPositions = positions
        .filter(p => p.occupantType === 'mine')
        .map(p => p.number)

      const owner = viewAddress?.toLowerCase()

      const downlinePositions = positions.filter(p => {
        if (!p.occupant) return false
        const ref =
          p.originalReferrer ||
          p.referrer ||
          p.occupantReferrer ||
          ethers.ZeroAddress
        return ref?.toLowerCase() === owner
      })

      const otherOccupants = positions.filter(p => {
        if (!p.occupant) return false
        const ref =
          p.originalReferrer ||
          p.referrer ||
          p.occupantReferrer ||
          ethers.ZeroAddress
        return ref?.toLowerCase() !== owner &&
          p.occupant.toLowerCase() !== owner
      })

      const structuralLinks = positions
        .filter(p => p.parentPosition && p.occupant)
        .map(p => ({ from: p.number, to: p.parentPosition, user: p.occupant }))

      const lineCounts = {
        line1: Number(snapshot.linePaymentCounts?.line1 || 0),
        line2: Number(snapshot.linePaymentCounts?.line2 || 0),
        line3: Number(snapshot.linePaymentCounts?.line3 || 0)
      }

      const levelData = {
        orbitType,
        config,
        currentIndex: Number(snapshot.orbitSummary?.currentPosition ?? 1),
        escrowBalance: snapshot.orbitSummary?.escrowBalance || '0',
        autoUpgradeCompleted: !!snapshot.orbitSummary?.autoUpgradeCompleted,
        positionsInLine1: Number(snapshot.orbitSummary?.positionsInLine1 ?? 0),
        positionsInLine2: Number(snapshot.orbitSummary?.positionsInLine2 ?? 0),
        positionsInLine3: Number(snapshot.orbitSummary?.positionsInLine3 ?? 0),
        totalCycles: Number(snapshot.orbitSummary?.totalCycles ?? 0),
        totalEarned: snapshot.orbitSummary?.totalEarned || '0',
        currentEscrowLocked:
          snapshot.currentEscrowLocked ??
          snapshot.orbitSummary?.currentEscrowLocked ??
          snapshot.lockedForNextLevel ??
          '0',
        autoUpgradeUsed:
          snapshot.autoUpgradeUsed ??
          snapshot.orbitSummary?.autoUpgradeUsed ??
          '0',
        positions,
        myPositions,
        downlinePositions,
        otherOccupants,
        spilloverFromPositions: structuralLinks,
        linePaymentCounts: lineCounts
      }

      setOrbitData(prev => ({ ...prev, [level]: levelData }))
      setUserLocks(prev => ({
        ...prev,
        [level]: (
          snapshot.currentEscrowLocked ??
          snapshot.orbitSummary?.currentEscrowLocked ??
          snapshot.lockedForNextLevel
        ) ||
          '0'
      }))
      setDownlineData(prev => ({ ...prev, [level]: downlinePositions }))
      setSpilloverData(prev => ({ ...prev, [level]: otherOccupants }))
      setLinePaymentCountsByLevel(prev => ({ ...prev, [level]: lineCounts }))
      loadedLevelsRef.current.add(fetchKey)
    } catch (err) {
      console.error(`Orbit sync error for level ${level}:`, err)
      if (!silent) {
        const existingData = orbitData[level]
        if (!existingData) {
          setOrbitError(orbitsT('errors.showingLastAvailable', 'Showing last available data'))
        }
      }
    } finally {
      loadingLevelsRef.current.delete(fetchKey)
      setLoadingLevelsMap(prev => ({ ...prev, [level]: false }))
      if (!silent && !orbitData[level]) {
        setIsLoadingOrbits(false)
      }
    }
  }, [viewAddress, mergePositionTruth, orbitData, orbitsT, refreshDirectDownlineSet])

  const fetchAllOrbitData = useCallback(async (forceRefresh = false) => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) return
    const match = activeTab?.match(/^level(\d+)$/)
    const currentLevel = focusedOnly
      ? routedLevel
      : match
        ? Number(match[1])
        : 1

    if (forceRefresh) {
      const lowerView = viewAddress.toLowerCase()
      Array.from(loadedLevelsRef.current).forEach(key => {
        if (key.startsWith(`${lowerView}-`)) loadedLevelsRef.current.delete(key)
      })
    }

    await fetchOrbitLevelData(currentLevel, { forceRefresh, silent: false })
  }, [viewAddress, activeTab, fetchOrbitLevelData, focusedOnly, routedLevel])

  const hydrateLivePositionDetails = useCallback(async (level, position) => {
    if (!viewAddress || !ethers.isAddress(viewAddress) || !position) return position
    const positionNumber = Number(position?.number || 0)
    if (!positionNumber) return position

    const cacheKey = `${viewAddress.toLowerCase()}-${level}-${positionNumber}`
    if (position?.receiptsHydrated) {
      positionDetailsCacheRef.current.set(cacheKey, position)
      return position
    }
    if (positionDetailsCacheRef.current.has(cacheKey)) {
      return positionDetailsCacheRef.current.get(cacheKey)
    }
    if (positionHydrationPromisesRef.current.has(cacheKey)) {
      return await positionHydrationPromisesRef.current.get(cacheKey)
    }

    const promise = (async () => {
      const details = await fetchOrbitPositionDetailsApi(viewAddress, level, positionNumber)
      const hydrated = await mergePositionTruth(level, { ...position, ...details }, details?.orbitType || levelToOrbitType[level], 0, false)
      const finalHydrated = { ...hydrated, receiptsHydrated: true }

      positionDetailsCacheRef.current.set(cacheKey, finalHydrated)

      setOrbitData(prev => {
        const levelData = prev[level]
        if (!levelData?.positions) return prev
        return {
          ...prev,
          [level]: {
            ...levelData,
            positions: levelData.positions.map(item =>
              item.number === positionNumber ? finalHydrated : item
            )
          }
        }
      })

      return finalHydrated
    })()

    positionHydrationPromisesRef.current.set(cacheKey, promise)
    try {
      return await promise
    } finally {
      positionHydrationPromisesRef.current.delete(cacheKey)
    }
  }, [viewAddress, mergePositionTruth])

  const hydrateHistoricalPositionDetails = useCallback(async (level, cycleNumber, position) => {
    if (!viewAddress || !ethers.isAddress(viewAddress) || !position) return position
    const positionNumber = Number(position?.number || 0)
    if (!positionNumber) return position

    const cacheKey = `${viewAddress.toLowerCase()}-${level}-${cycleNumber}-${positionNumber}`

    if (position?.receiptsHydrated) return position
    if (positionDetailsCacheRef.current.has(cacheKey)) return positionDetailsCacheRef.current.get(cacheKey)

    try {
      const cycleSnapshot = await fetchOrbitCycleSnapshotApi(viewAddress, level, cycleNumber)
      const details = cycleSnapshot?.positions?.find(p => Number(p.number) === positionNumber)
      if (!details) return position

      const hydrated = await mergePositionTruth(
        level,
        { ...position, ...details },
        details?.orbitType || levelToOrbitType[level],
        Number(cycleNumber),
        true
      )

      const finalHydrated = { ...hydrated, receiptsHydrated: true }
      positionDetailsCacheRef.current.set(cacheKey, finalHydrated)
      return finalHydrated
    } catch (err) {
      console.error('Error hydrating historical position:', err)
      return position
    }
  }, [viewAddress, mergePositionTruth])

  const applyViewerAddress = async () => {
    identityAbortRef.current?.abort?.()
    const controller = new AbortController()
    identityAbortRef.current = controller

    setIdentityLookupState({
      status: 'loading',
        message: orbitsT('identity.resolving', 'Resolving wallet address or Referral ID...'),
    })

    try {
      const identity = await resolveIdentity(inputAddress, { signal: controller.signal })

      if (!identity.ok || !identity.walletAddress) {
        const message = identity.message || orbitsT('errors.invalidWalletOrReferral', 'Enter a valid wallet address or Referral ID')
        setOrbitError(message)
        setIdentityLookupState({ status: 'error', message })
        toast.warning(message, { dedupeKey: 'orbit-identity-invalid' })
        return
      }

      setOrbitError('')
      const normalized = ethers.getAddress(identity.walletAddress)
      viewedLevelsCacheRef.current.delete(normalized.toLowerCase())
      receiptCacheRef.current.delete(`${normalized.toLowerCase()}-backend-receipts`)
      activationReceiptCacheRef.current.clear()
      setInputAddress(identity.referralId || identity.input || normalized)
      setViewAddress(normalized)
      setViewMode('global')
      setIdentityLookupState({
        status: 'success',
        message: identity.type === 'referralId'
          ? orbitsT('identity.resolvedReferral', 'Referral ID resolved to wallet view.')
          : orbitsT('identity.resolvedWallet', 'Wallet view loaded.'),
      })
    } catch (error) {
      if (error?.name === 'AbortError') return
      const message = orbitsT('identity.resolveFailed', 'Unable to resolve that identity right now.')
      setOrbitError(message)
      setIdentityLookupState({ status: 'error', message })
      toast.danger(message, { dedupeKey: 'orbit-identity-error' })
    }
  }

  const viewMyOrbit = () => {
    if (!account) return
    viewedLevelsCacheRef.current.delete(account.toLowerCase())
    receiptCacheRef.current.delete(`${account.toLowerCase()}-backend-receipts`)
    activationReceiptCacheRef.current.clear()
    setOrbitError('')
    setInputAddress(account)
    setViewAddress(account)
    setViewMode('global')
  }

  const refreshData = async () => {
  if (!viewAddress || !ethers.isAddress(viewAddress)) return
  setIsRefreshing(true)

  try {
    const lower = viewAddress.toLowerCase()
    const activeLevel = Number(activeTab.replace('level', '')) || 1
    clearAddressScopedOrbitsApiCache(viewAddress)

    activationReceiptCacheRef.current.clear()
    positionDetailsCacheRef.current.clear()
    positionHydrationPromisesRef.current.clear()
    receiptCacheRef.current.delete(`${lower}-backend-receipts`)
    viewedLevelsCacheRef.current.delete(lower)

    cycleHistoryCacheRef.current.clear()
    setCycleHistoryData({})
    setCycleHistorySupportByLevel({})
    setLoadingCycleByLevel({})

    loadedLevelsRef.current.delete(`${lower}-${activeLevel}`)

    await fetchViewedLevels(true)
    await fetchViewedAddressReceipts(true)
    await fetchAllOrbitData(true)

    const selectedCycle = selectedCycleByLevel[activeLevel]
    if (selectedCycle && selectedCycle !== 'current') {
      await loadCycleHistoryForLevel(activeLevel, Number(selectedCycle), true)
    }

    setLastUpdated(new Date().toLocaleTimeString())
  } catch (err) {
    console.error('Refresh error:', err)
  } finally {
    setIsRefreshing(false)
  }
}

  const handlePositionClick = useCallback(async (position) => {
    const level = Number(position?.level || activeTab?.replace('level', '') || 0)
    const selectedCycle = selectedCycleByLevel[level] || 'current'
    const isHistorical = selectedCycle !== 'current'

    const initialPosition = {
      ...position,
      level,
      cycleNumber: isHistorical ? Number(selectedCycle) : 0,
      isHistoricalPosition: isHistorical,
      detailsLoading: true
    }

    setSelectedPosition(initialPosition)
    setShowPositionModal(true)

    if (level < 1 || level > 10) {
      setSelectedPosition(prev => prev ? { ...prev, detailsLoading: false } : prev)
      return
    }

    try {
      const hydrated = isHistorical
        ? await hydrateHistoricalPositionDetails(level, Number(selectedCycle), initialPosition)
        : await hydrateLivePositionDetails(level, initialPosition)

      setSelectedPosition(prev => {
        if (!prev || prev.number !== position.number || Number(prev.level || 0) !== level) {
          return prev
        }
        return {
          ...prev,
          ...hydrated,
          occupant: hydrated?.occupant || prev.occupant,
          user: hydrated?.user || prev.user,
          referrer: hydrated?.referrer || prev.referrer,
          originalReferrer: hydrated?.originalReferrer || prev.originalReferrer,
          occupantReferrer: hydrated?.occupantReferrer || prev.occupantReferrer,
          detailsLoading: false
        }
      })
    } catch {
      setSelectedPosition(prev => prev ? { ...prev, detailsLoading: false } : prev)
    }
  }, [activeTab, selectedCycleByLevel, hydrateHistoricalPositionDetails, hydrateLivePositionDetails])

  const handleStructuralPreview = (position) => {
    if (position.parentPosition) {
      setShowStructuralPreview(true)
      setTimeout(() => setShowStructuralPreview(false), 2000)
    }
  }

  const getHistoricalCycleSelection = useCallback(
    (level) => selectedCycleByLevel[level] || 'current',
    [selectedCycleByLevel]
  )

  const setHistoricalCycleSelection = useCallback((level, cycleKey) => {
    setSelectedCycleByLevel((prev) => ({ ...prev, [level]: cycleKey }))
  }, [])

  const selectOrbitCycle = useCallback(
    async (level, cycleKey) => {
      setHistoricalCycleSelection(level, cycleKey)

      if (cycleKey !== 'current') {
        await loadCycleHistoryForLevel(level, Number(cycleKey))
      }
    },
    [loadCycleHistoryForLevel, setHistoricalCycleSelection]
  )

  const getHighestViewedActiveLevel = useCallback(() => {
    const active = Object.keys(viewedLevels)
      .filter(level => viewedLevels[level])
      .map(Number)
      .sort((a, b) => b - a)
    return active[0] || 0
  }, [viewedLevels])

  // Effect to resolve member IDs for display
  useEffect(() => {
    const run = async () => {
      const addresses = new Set()

      Object.values(orbitData).forEach((levelData) => {
        ;(levelData?.positions || []).forEach((p) => {
          if (p?.occupant && ethers.isAddress(p.occupant)) {
            addresses.add(p.occupant.toLowerCase())
          }
        })
      })

      const next = {}

      await Promise.all(
        [...addresses].map(async (addr) => {
          next[addr] = await fetchMemberId(addr)
        })
      )

      setResolvedMemberIds(next)
    }

    run()
  }, [orbitData, fetchMemberId])

  useEffect(() => {
    if (focusedOnly && routedLevel >= 1 && routedLevel <= 10) {
      setActiveTab(`level${routedLevel}`)
      return
    }

    if (!focusedOnly) {
      setActiveTab('level1')
    }
  }, [focusedOnly, routedLevel])

  useEffect(() => {
    if (focusedOnly) {
      setIsOrbitToolsOpen(false)
    }
  }, [focusedOnly, routedLevel])

  useEffect(() => {
  setIsGalaxyMeasured(false)
}, [activeTab, viewAddress])

  useEffect(() => {
    if (isConnected) loadContracts().catch(console.error)
  }, [isConnected, loadContracts])

  useEffect(() => {
    if (focusedOnly && routedAddress && ethers.isAddress(routedAddress)) {
      setViewAddress(routedAddress)
      setInputAddress(routedDisplayId || routedAddress)
      return
    }

    if (account && !viewAddress) {
      setViewAddress(account)
      setInputAddress(account)
    }
  }, [account, viewAddress, focusedOnly, routedAddress, routedDisplayId])

  useEffect(() => {
    if (!normalizedViewAddress) return
    if (lastResetAddressRef.current === normalizedViewAddress) return

    lastResetAddressRef.current = normalizedViewAddress
    bootstrapAddressRef.current = ''
    bootInFlightRef.current = false
    fetchIdRef.current += 1

    loadedLevelsRef.current.clear()
    loadingLevelsRef.current.clear()
    activationReceiptCacheRef.current.clear()
    positionDetailsCacheRef.current.clear()
    positionHydrationPromisesRef.current.clear()
    cycleHistoryCacheRef.current.clear()

    setOrbitData({})
    setUserLocks({})
    setDownlineData({})
    setSpilloverData({})
    setLinePaymentCountsByLevel({})
    setCycleHistoryData({})
    setSelectedCycleByLevel({})
    setLoadingCycleByLevel({})
    setCycleHistorySupportByLevel({})
    setViewAddressReceipts([])
    setReceiptBucketsByLevel({})
    setLoadingLevelsMap({})
    setViewedLevelsReady(false)
    setReceiptsLoading(false)
    setIsLoadingOrbits(true)
    setIsGalaxyMeasured(false)
    setContainerSize({ width: 640, height: 640 })
  }, [normalizedViewAddress])

  useEffect(() => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) return
    if (bootInFlightRef.current) return
    if (bootstrapAddressRef.current === normalizedViewAddress) return

    let cancelled = false
    const activeLevel = Number(activeTab.replace('level', '')) || 1

    const boot = async () => {
      bootInFlightRef.current = true
      setOrbitError('')

      try {
        await Promise.allSettled([
          fetchViewedLevels(true),
          fetchViewedAddressReceipts(true),
          fetchOrbitLevelData(activeLevel || 1, { forceRefresh: true, silent: false })
        ])

        if (cancelled) return

        bootstrapAddressRef.current = normalizedViewAddress
      } catch (err) {
        if (!cancelled) {
          console.error('Initial orbit bootstrap failed:', err)
          if (!orbitData[activeLevel]) {
            setOrbitError(orbitsT('errors.showingLastAvailable', 'Showing last available data'))
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOrbits(false)
        }
        bootInFlightRef.current = false
      }
    }

    boot()

    return () => {
      cancelled = true
    }
  }, [
    viewAddress,
    normalizedViewAddress,
    activeTab,
    fetchViewedLevels,
    fetchViewedAddressReceipts,
    fetchOrbitLevelData,
    orbitData,
    orbitsT
  ])

  useEffect(() => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) return
    if (!bootstrapAddressRef.current || bootstrapAddressRef.current !== normalizedViewAddress) return

    const match = activeTab?.match(/^level(\d+)$/)
    if (!match) return
    const level = Number(match[1])
    const levelKey = `${normalizedViewAddress}-${level}`

    if (loadedLevelsRef.current.has(levelKey) || loadingLevelsRef.current.has(levelKey)) return
    fetchOrbitLevelData(level, { silent: false })
  }, [activeTab, viewAddress, normalizedViewAddress, fetchOrbitLevelData])

   const activeLevelNumberForEffect = Number(activeTab.replace('level', ''))
  const activeLevelDataForEffect = orbitData[activeLevelNumberForEffect]
  const activeLevelReady = !!activeLevelDataForEffect?.positions
  useEffect(() => {
    if (!activeLevelReady) return

    let rafId = 0
    let resizeObserver = null
    let settleTimer = null

    const updateSize = () => {
      if (!galaxyRef.current) return

      const rect = galaxyRef.current.getBoundingClientRect()
      const width = Math.round(rect.width)
      const height = Math.round(rect.height)

      if (width <= 0 || height <= 0) return

      setContainerSize((prev) => {
        if (Math.abs(prev.width - width) < 2 && Math.abs(prev.height - height) < 2) return prev
        return { width, height }
      })

      setIsGalaxyMeasured(true)
    }

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateSize)
    }

    scheduleUpdate()
    settleTimer = window.setTimeout(scheduleUpdate, 120)

    window.addEventListener('resize', scheduleUpdate)

    if (window.ResizeObserver && galaxyRef.current) {
      resizeObserver = new ResizeObserver(scheduleUpdate)
      resizeObserver.observe(galaxyRef.current)
    }

    return () => {
      window.removeEventListener('resize', scheduleUpdate)
      if (resizeObserver) resizeObserver.disconnect()
      cancelAnimationFrame(rafId)
      if (settleTimer) window.clearTimeout(settleTimer)
    }
  }, [activeTab, activeLevelReady])

  useEffect(() => {
    if (orbitZoom <= 1) {
      setOrbitPan({ x: 0, y: 0 })
      return
    }

    setOrbitPan((current) => clampOrbitPan(current, orbitZoom))
  }, [activeTab, clampOrbitPan, orbitZoom])

  const renderPositionTooltip = (position) => {
    const viewerBreakdown = position.viewerReceiptBreakdown || {
      totalGenerated: 0,
      totalLiquid: 0,
      totalEscrow: 0,
      generatedGross: 0,
      walletCreditedLiquid: 0,
      receiptEscrowLocked: 0
    }

    const receiptTotals = position.receiptTotals || {
      count: 0,
      gross: 0,
      liquidPaid: 0,
      escrowLocked: 0,
      generatedGross: 0,
      walletCreditedLiquid: 0,
      receiptEscrowLocked: 0
    }

    // Get display name for occupant (ID if available, otherwise shortened address)
    const occupantDisplay = position.occupant && ethers.isAddress(position.occupant)
      ? resolvedMemberIds[position.occupant.toLowerCase()] || shortAddress(position.occupant)
      : shortAddress(position.occupant)

    if (!position.occupant) {
      return (
        <div className="custom-tooltip">
          <div className="custom-tooltip__title">{orbitsT('position.title', 'Position #{{number}}', { number: position.number })}</div>
          <div className="custom-tooltip__row">
            <span>{orbitsT('tooltip.status', 'Status')}</span>
            <strong>{orbitsT('status.empty', 'Empty')}</strong>
          </div>
          <div className="custom-tooltip__row">
            <span>{orbitsT('tooltip.line', 'Line')}</span>
            <strong>{orbitsT('line.value', 'Line {{line}}', { line: position.line || 1 })}</strong>
          </div>
          {position.parentPosition && (
            <div className="custom-tooltip__row">
              <span>{orbitsT('tooltip.parent', 'Parent')}</span>
              <strong>{orbitsT('position.value', 'Position {{position}}', { position: position.parentPosition })}</strong>
            </div>
          )}
          {position.activationCycleNumber > 0 && (
            <div className="custom-tooltip__row">
              <span>{orbitsT('tooltip.cycle', 'Cycle')}</span>
              <strong>{position.isHistoricalPosition ? orbitsT('cycle.historical', 'Historical {{cycle}}', { cycle: position.activationCycleNumber }) : orbitsT('cycle.currentNumber', 'Current {{cycle}}', { cycle: position.activationCycleNumber })}</strong>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="custom-tooltip">
        <div className="custom-tooltip__title">{orbitsT('position.title', 'Position #{{number}}', { number: position.number })}</div>
        <div className="custom-tooltip__row">
          <span>{orbitsT('tooltip.occupant', 'Position Holder')}</span>
          <strong>{occupantDisplay}</strong>
        </div>
        <div className="custom-tooltip__row">
          <span>{orbitsT('tooltip.line', 'Line')}</span>
          <strong>{orbitsT('line.value', 'Line {{line}}', { line: position.line || 1 })}</strong>
        </div>
        <div className="custom-tooltip__row">
          <span>{orbitsT('tooltip.truth', 'Truth')}</span>
          <strong>{formatTruthLabel(position.truthLabel)}</strong>
        </div>
        <div className="custom-tooltip__row">
          <span>{getPositionWalletCredited(position) > 0 ? orbitsT('tooltip.walletCredited', 'Wallet Credited') : orbitsT('tooltip.netAmountEstimate', 'Net Amount Estimate')}</span>
          <strong>{formatUsdtDisplay(getPositionWalletCredited(position) || getEstimatedNetAmount(Number(position.amount || 0)))} USDT</strong>
        </div>
        {position.parentPosition && (
          <div className="custom-tooltip__row">
            <span>{orbitsT('tooltip.parent', 'Parent')}</span>
            <strong>{orbitsT('position.value', 'Position {{position}}', { position: position.parentPosition })}</strong>
          </div>
        )}
        <div className="custom-tooltip__row">
          <span>{orbitsT('tooltip.youReceived', 'You Received')}</span>
          <strong>{formatUsdtDisplay(getViewerWalletCredited(viewerBreakdown))} USDT</strong>
        </div>
        <div className="custom-tooltip__row">
          <span>{orbitsT('tooltip.grossRouted', 'Generated Routed')}</span>
          <strong>{formatUsdtDisplay(getTotalsGeneratedGross(receiptTotals))} USDT</strong>
        </div>
        {position.activationId > 0 && (
          <div className="custom-tooltip__row">
            <span>{orbitsT('tooltip.activation', 'Activation')}</span>
            <strong>#{position.activationId}</strong>
          </div>
        )}
      </div>
    )
  }

  if (!isConnected) {
    return (
      <section className="orbits-page">
        <div className="orbits-hero">
          <div className="orbits-hero__content safe-content-zone content-left-safe preserve-visual-composition">
            <h1 className="orbits-hero__title">{orbitsT('connect.title', 'Orbits System')}</h1>
            <p className="orbits-hero__description">
              {orbitsT('connect.description', 'Connect your wallet to monitor your orbit positions and track placements.')}
            </p>
            <button onClick={connect} className="connect-wallet-btn">{orbitsT('actions.connectWallet', 'Connect Wallet')}</button>
          </div>
        </div>
      </section>
    )
  }

 if (contractsLoading) {
  return (
    <section className="orbits-page">
      <div className="loading-container">
        <div className="skeleton skeleton-text" style={{ width: '60%', margin: '0 auto 20px' }}></div>
        <div className="skeleton skeleton-text-sm" style={{ width: '40%', margin: '0 auto' }}></div>
        <p style={{ marginTop: 20 }}>{orbitsT('states.loadingOrbitData', 'Loading orbit data...')}</p>
      </div>
    </section>
  )
}
  const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
  const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
  const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()
  const highestViewedActiveLevel = getHighestViewedActiveLevel()

  const activeLevelNumber = Number(activeTab?.replace('level', '')) || routedLevel || 1
  const activeOrbitType = levelToOrbitType[activeLevelNumber] || 'P4'
  const activeLevelData = orbitData[activeLevelNumber] || null
  const activeCycleSelection = selectedCycleByLevel[activeLevelNumber] || 'current'
  const activeLevelReceipts = receiptBucketsByLevel[activeLevelNumber] || []
  const activeDownlines = downlineData[activeLevelNumber] || []
  const activeSpillovers = spilloverData[activeLevelNumber] || []
  const activeLineCounts = linePaymentCountsByLevel[activeLevelNumber] || activeLevelData?.linePaymentCounts || {}

  const activeLevelPrice = levelConfig[activeLevelNumber]?.price || 0
  const activeFilledPositions = activeLevelData?.positions?.filter((p) => p?.occupant).length || 0
  const activeTotalPositions = orbitTypeConfig[activeOrbitType]?.positions || 0
  const activeAutoUpgradeLocked =
    activeLevelData?.currentEscrowLocked ||
    userLocks[activeLevelNumber] ||
    0



  // const activeUpgradeRequired = levelConfig[activeLevelNumber]?.upgradeReq || 0
  // const activeNextLevel = levelConfig[activeLevelNumber]?.nextLevel || null
  // const activeCurrentLocked = Number(userLocks[activeLevelNumber] || 0)
  // const activeRemainingToUpgrade =
  //   activeLevelNumber >= 10 || !activeUpgradeRequired
  //     ? 0
  //     : Math.max(0, activeUpgradeRequired - activeCurrentLocked)

  // const activeUpgradeProgress =
  //   activeUpgradeRequired > 0
  //     ? Math.min(100, (activeCurrentLocked / activeUpgradeRequired) * 100)
  //     : 100


    const activeUpgradeRequired = levelConfig[activeLevelNumber]?.upgradeReq || 0
    const activeNextLevel = levelConfig[activeLevelNumber]?.nextLevel || null
    const activeCurrentLocked = Number(
      activeLevelData?.currentEscrowLocked ||
      userLocks[activeLevelNumber] ||
      0
    )

    const isActiveLevelActivated = viewedLevelsReady
      ? !!viewedLevels[activeLevelNumber]
      : true

    const isNextLevelActivated =
      activeNextLevel && viewedLevelsReady
        ? !!viewedLevels[activeNextLevel]
        : false

    const shouldShowCurrentUpgradeLock =
      isActiveLevelActivated &&
      activeLevelNumber < 10 &&
      !!activeNextLevel &&
      !isNextLevelActivated &&
      activeUpgradeRequired > 0

    const activeRemainingToUpgrade = shouldShowCurrentUpgradeLock
      ? Math.max(0, activeUpgradeRequired - activeCurrentLocked)
      : 0

    const activeUpgradeProgress =
    shouldShowCurrentUpgradeLock && activeUpgradeRequired > 0
    ? Math.min(100, (activeCurrentLocked / activeUpgradeRequired) * 100)
    : 0

  const focusedMemberLabel =
    routedDisplayId ||
    resolvedMemberIds[viewAddress?.toLowerCase?.()] ||
    shortAddress(viewAddress)

  const activeFinancialSummary = buildOrbitFinancialSummary({
    level: activeLevelNumber,
    levelData: activeLevelData,
    userLock: userLocks[activeLevelNumber],
    receipts: activeLevelReceipts,
  })
  const activeAutoUpgradeUsed = toFiniteNumber(activeLevelData?.autoUpgradeUsed)
  const activeEscrowAutoUpgradeValue =
    activeAutoUpgradeUsed > 0
      ? activeAutoUpgradeUsed
      : activeFinancialSummary.escrowUsed

  const activeOrbitExportData = {
    memberId: focusedMemberLabel,
    address: viewAddress,
    level: activeLevelNumber,
    orbitType: activeOrbitType,
    cycle: activeCycleSelection,
    financials: {
      totalGenerated: activeFinancialSummary.totalGenerated,
      escrowUsed: activeEscrowAutoUpgradeValue,
      autoUpgradeUsed: activeAutoUpgradeUsed,
      walletCredited: activeFinancialSummary.walletCredited,
      generatedGross: activeFinancialSummary.totalGenerated,
      receiptEscrowLocked: activeFinancialSummary.receiptEscrow,
      walletCreditedLiquid: activeFinancialSummary.walletCredited,
      receiptGross: activeFinancialSummary.receiptGross,
      receiptLiquid: activeFinancialSummary.receiptLiquid,
      receiptEscrow: activeFinancialSummary.receiptEscrow,
      source: activeFinancialSummary.source,
    },
    receipts: activeLevelReceipts,
    downlines: activeDownlines,
    spillovers: activeSpillovers,
    lineCounts: activeLineCounts,
    lastUpdated,
  }

  const cockpitTabs = [
    { id: 'overview', label: orbitsT('cockpit.tabs.overview', 'Overview') },
    { id: 'controls', label: orbitsT('cockpit.tabs.controls', 'Controls') },
    { id: 'cycles', label: orbitsT('cockpit.tabs.cycles', 'Cycles') },
    { id: 'receipts', label: orbitsT('cockpit.tabs.receipts', 'Receipts') },
    { id: 'members', label: orbitsT('cockpit.tabs.members', 'Members') },
    { id: 'guide', label: orbitsT('cockpit.tabs.guide', 'Guide') },
  ]

  const getPositionSemanticState = (position, currentFillTarget, newestFilledPosition) => {
    if (!position?.occupant) {
      return position?.number === currentFillTarget ? 'target' : 'empty'
    }

    if (position?.number === newestFilledPosition) return 'newly-filled'
    if (position?.occupantType === 'mine') return 'owner'

    const info = position.positionInfo || {}
    const truthLabel = String(position.truthLabel || '').toUpperCase()
    const hasSpillover1 = Number(info.exactToSpillover1 || 0) > 0
    const hasSpillover2 = Number(info.exactToSpillover2 || 0) > 0
    const hasRecycle = Number(info.exactToRecycle || 0) > 0 || truthLabel === 'RECYCLE'
    const hasEscrow = Number(info.exactToEscrow || 0) > 0 || getExecutedEscrowLocked(position) > 0
    const autoUpgrade = Boolean(info.autoUpgradeEnabled || info.isAutoUpgradeSource || hasEscrow)

    if (hasRecycle) return 'recycle'
    if (autoUpgrade) return 'auto-upgrade'
    if (hasEscrow) return 'escrow'
    if (hasSpillover2) return 'spillover2'
    if (hasSpillover1) return 'spillover1'
    if (position?.occupantType === 'downline') return 'spillover1'
    return 'filled'
  }

  const getOrbitNarration = (position) => {
    if (!position) {
      return {
        tone: 'info',
        title: orbitsT('narration.emptyTitle', 'No position selected'),
        message: orbitsT('narration.emptyMessage', 'Choose a position to see routing context.'),
      }
    }

    const info = position.positionInfo || {}
    const truthLabel = String(position.truthLabel || '').toUpperCase()
    const line = position.line || info.line || 1
    const gross = formatUsdtDisplay(getPositionGeneratedGross(position))
    const liquid = formatUsdtDisplay(getPositionWalletCredited(position) || getEstimatedNetAmount(Number(position.amount || 0)))
    const escrow = formatUsdtDisplay(getExecutedEscrowLocked(position))

    if (!position.occupant) {
      return {
        tone: 'info',
        title: orbitsT('narration.targetTitle', 'Open fill target'),
        message: orbitsT('narration.targetMessage', 'Position {{position}} on Line {{line}} is empty and ready for the next qualifying placement.', {
          position: position.number,
          line,
        }),
      }
    }

    if (Number(info.exactToRecycle || 0) > 0 || truthLabel === 'RECYCLE') {
      return {
        tone: 'warning',
        title: orbitsT('narration.recycleTitle', 'Recycle route recorded'),
        message: orbitsT('narration.recycleMessage', 'Position {{position}} generated {{gross}} USDT and routed recycle value according to the stored orbit rule.', {
          position: position.number,
          gross,
        }),
      }
    }

    if (Number(info.exactToEscrow || 0) > 0 || getExecutedEscrowLocked(position) > 0) {
      return {
        tone: 'warning',
        title: orbitsT('narration.escrowTitle', 'Escrow and auto-upgrade path'),
        message: orbitsT('narration.escrowMessage', 'Position {{position}} credited {{liquid}} USDT and locked {{escrow}} USDT toward auto-upgrade rules.', {
          position: position.number,
          liquid,
          escrow,
        }),
      }
    }

    if (Number(info.exactToSpillover2 || 0) > 0) {
      return {
        tone: 'info',
        title: orbitsT('narration.spillover2Title', 'Second spillover route'),
        message: orbitsT('narration.spillover2Message', 'Position {{position}} routed value through spillover recipient 2 because the line rule selected the second upline path.', {
          position: position.number,
        }),
      }
    }

    if (Number(info.exactToSpillover1 || 0) > 0 || position.occupantType === 'downline') {
      return {
        tone: 'info',
        title: orbitsT('narration.spillover1Title', 'Spillover route'),
        message: orbitsT('narration.spillover1Message', 'Position {{position}} is connected to spillover routing for this orbit line.', {
          position: position.number,
        }),
      }
    }

    return {
      tone: 'success',
      title: orbitsT('narration.payoutTitle', 'Owner payout route'),
      message: orbitsT('narration.payoutMessage', 'Position {{position}} generated {{gross}} USDT with {{liquid}} USDT shown as wallet credited or estimated net.', {
        position: position.number,
        gross,
        liquid,
      }),
    }
  }

  const toggleOrbitDisplayOption = (key) => {
    setOrbitDisplayOptions((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const renderFocusedCockpitBody = () => {
    if (!focusedOnly) return null

    if (orbitCockpitTab === 'overview') {
      return (
        <div className="ffn-orbit-cockpit__section">
          <div className="ffn-orbit-cockpit__metric-grid">
            <div>
              <span>{orbitsT('cockpit.overview.orbit', 'Orbit')}</span>
              <strong>{activeOrbitType}</strong>
            </div>
            <div>
              <span>{orbitsT('cockpit.overview.level', 'Level')}</span>
              <strong>{activeLevelNumber}</strong>
            </div>
            <div>
              <span>{orbitsT('cockpit.overview.levelPrice', 'Level price')}</span>
              <strong>{activeLevelPrice} USDT</strong>
            </div>
            <div>
              <span>{orbitsT('cockpit.overview.cycle', 'Cycle')}</span>
              <strong>{activeCycleSelection === 'current' ? orbitsT('cycle.current', 'Current') : orbitsT('cycle.value', 'Cycle {{cycle}}', { cycle: activeCycleSelection })}</strong>
            </div>
            <div className="ffn-orbit-cockpit__money-card is-total">
              <span>{orbitsT('cockpit.overview.totalGenerated', 'Total generated')}</span>
              <strong>{formatUsdtDisplay(activeFinancialSummary.totalGenerated)} USDT</strong>
            </div>
            <div>
              <span>{orbitsT('cockpit.overview.filled', 'Filled')}</span>
              <strong>{activeFilledPositions}/{activeTotalPositions}</strong>
            </div>
            <div className="ffn-orbit-cockpit__money-card is-escrow">
              <span>{orbitsT('cockpit.overview.escrowAutoUpgrade', 'Escrow / auto-upgrade')}</span>
              <strong>{formatUsdtDisplay(activeEscrowAutoUpgradeValue)} USDT</strong>
            </div>
            <div className="ffn-orbit-cockpit__money-card is-wallet">
              <span>{orbitsT('cockpit.overview.walletCredited', 'Wallet credited')}</span>
              <strong>{formatUsdtDisplay(activeFinancialSummary.walletCredited)} USDT</strong>
            </div>
            <div className="ffn-orbit-cockpit__money-card is-source">
              <span>{orbitsT('cockpit.overview.dataSource', 'Data source')}</span>
              <strong>{activeFinancialSummary.source === 'indexed_receipts' ? orbitsT('sources.receipts', 'Receipts') : activeFinancialSummary.source === 'position_breakdown_estimate' ? orbitsT('sources.positionsEstimate', 'Positions estimate') : orbitsT('sources.snapshotEstimate', 'Snapshot estimate')}</strong>
            </div>
          </div>

          <div className="ffn-orbit-cockpit__note">
            {orbitsT('cockpit.overview.focusedNote', 'This focused view is showing only the level requested from Activation Center.')}
          </div>

          {shouldShowCurrentUpgradeLock && (
            <div className="ffn-orbit-cockpit__upgrade-card">
              <div className="ffn-orbit-cockpit__upgrade-top">
                <div>
                  <span>{orbitsT('cockpit.overview.currentAutoUpgradeLock', 'Current Auto-upgrade Lock')}</span>
                  <strong>
                    Level {activeLevelNumber} → Level {activeNextLevel}
                  </strong>
                </div>

                <strong className="ffn-orbit-cockpit__upgrade-amount">
                  {formatUsdtDisplay(activeCurrentLocked)} / {formatUsdtDisplay(activeUpgradeRequired)} USDT
                </strong>
              </div>

              <div className="ffn-orbit-cockpit__upgrade-track">
                <div
                  className="ffn-orbit-cockpit__upgrade-fill"
                  style={{ width: `${activeUpgradeProgress}%` }}
                />
              </div>

              <p>
                {activeRemainingToUpgrade <= 0
                  ? orbitsT('cockpit.overview.readyAutoUpgrade', 'Ready for auto-upgrade when protocol conditions are met.')
                  : orbitsT('cockpit.overview.remainingBeforeLevel', '{{amount}} USDT remaining before Level {{level}}.', { amount: formatUsdtDisplay(activeRemainingToUpgrade), level: activeNextLevel })}
              </p>
            </div>
          )}

          {isActiveLevelActivated && activeNextLevel && isNextLevelActivated && (
            <div className="ffn-orbit-cockpit__note">
              {orbitsT('cockpit.overview.noPendingLock', 'Level {{nextLevel}} is already activated, so there is no pending auto-upgrade lock for Level {{level}}.', { nextLevel: activeNextLevel, level: activeLevelNumber })}
            </div>
          )}
        </div>
      )
    }

    if (orbitCockpitTab === 'controls') {
      return (
        <div className="ffn-orbit-cockpit__section">
          <button
            type="button"
            className="ffn-orbit-cockpit__action is-primary"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? orbitsT('states.refreshingOrbit', 'Refreshing orbit...') : orbitsT('actions.refreshOrbitData', 'Refresh orbit data')}
          </button>

          <div className="ffn-orbit-cockpit__switch-list">
            <button
              type="button"
              className={`ffn-orbit-cockpit__switch ${orbitDisplayOptions.orbitHeaderCard ? 'is-on' : ''}`}
              onClick={() => toggleOrbitDisplayOption('orbitHeaderCard')}
            >
              <span>{orbitsT('cockpit.controls.orbitStatusCard', 'Orbit status card')}</span>
              <strong>{orbitDisplayOptions.orbitHeaderCard ? orbitsT('states.on', 'On') : orbitsT('states.off', 'Off')}</strong>
            </button>

            <button
              type="button"
              className={`ffn-orbit-cockpit__switch ${orbitDisplayOptions.cycleSwitcher ? 'is-on' : ''}`}
              onClick={() => toggleOrbitDisplayOption('cycleSwitcher')}
            >
              <span>{orbitsT('cockpit.controls.pageCycleSwitcher', 'Page cycle switcher')}</span>
              <strong>{orbitDisplayOptions.cycleSwitcher ? orbitsT('states.on', 'On') : orbitsT('states.off', 'Off')}</strong>
            </button>

            <button
              type="button"
              className={`ffn-orbit-cockpit__switch ${orbitDisplayOptions.summaryStrip ? 'is-on' : ''}`}
              onClick={() => toggleOrbitDisplayOption('summaryStrip')}
            >
              <span>{orbitsT('cockpit.controls.levelSummaryStrip', 'Level summary strip')}</span>
              <strong>{orbitDisplayOptions.summaryStrip ? orbitsT('states.on', 'On') : orbitsT('states.off', 'Off')}</strong>
            </button>

            <button
              type="button"
              className={`ffn-orbit-cockpit__switch ${orbitDisplayOptions.legend ? 'is-on' : ''}`}
              onClick={() => toggleOrbitDisplayOption('legend')}
            >
              <span>{orbitsT('cockpit.controls.orbitLegend', 'Orbit legend')}</span>
              <strong>{orbitDisplayOptions.legend ? orbitsT('states.on', 'On') : orbitsT('states.off', 'Off')}</strong>
            </button>

            <button
              type="button"
              className={`ffn-orbit-cockpit__switch ${orbitDisplayOptions.hoverCard ? 'is-on' : ''}`}
              onClick={() => toggleOrbitDisplayOption('hoverCard')}
            >
              <span>{orbitsT('cockpit.controls.hoverDetailCard', 'Hover detail card')}</span>
              <strong>{orbitDisplayOptions.hoverCard ? orbitsT('states.on', 'On') : orbitsT('states.off', 'Off')}</strong>
            </button>

            <button
              type="button"
              className={`ffn-orbit-cockpit__switch ${orbitDisplayOptions.structureLines ? 'is-on' : ''}`}
              onClick={() => toggleOrbitDisplayOption('structureLines')}
            >
              <span>{orbitsT('cockpit.controls.showStructureLines', 'Show structure lines')}</span>
              <strong>{orbitDisplayOptions.structureLines ? orbitsT('states.on', 'On') : orbitsT('states.off', 'Off')}</strong>
            </button>
          </div>

          <button
            type="button"
            className="ffn-orbit-cockpit__action"
            onClick={() => setViewMode((current) => current === 'global' ? 'downline' : 'global')}
          >
            {viewMode === 'global' ? orbitsT('cockpit.controls.highlightDownlines', 'Highlight my downlines') : orbitsT('cockpit.controls.showFullOrbit', 'Show full orbit view')}
          </button>

          <div className="ffn-orbit-cockpit__note">
            {orbitsT('cockpit.controls.note', 'These controls change what appears on the orbit screen. Planet click details remain unchanged.')}
          </div>
        </div>
      )
    }

    if (orbitCockpitTab === 'cycles') {
      const totalCycles = Number(activeLevelData?.totalCycles || 0)
      const cycleButtons = ['current', ...Array.from({ length: totalCycles }, (_, i) => String(i + 1))]

      return (
        <div className="ffn-orbit-cockpit__section">
          <div className="ffn-orbit-cockpit__cycle-grid">
            {cycleButtons.map((cycleKey) => (
              <button
                key={cycleKey}
                type="button"
                className={`ffn-orbit-cockpit__chip ${
                  activeCycleSelection === cycleKey ? 'is-active' : ''
                }`}
                onClick={() => selectOrbitCycle(activeLevelNumber, cycleKey)}
                disabled={loadingCycleByLevel[activeLevelNumber]}
              >
                {cycleKey === 'current' ? orbitsT('cycle.current', 'Current') : orbitsT('cycle.value', 'Cycle {{cycle}}', { cycle: cycleKey })}
              </button>
            ))}
          </div>

          <div className="ffn-orbit-cockpit__note">
            {orbitsT('cockpit.cycles.note', 'Historical cycle mode changes the orbit snapshot while keeping the planet modal behavior.')}
          </div>
        </div>
      )
    }

    if (orbitCockpitTab === 'receipts') {
      return (
        <div className="ffn-orbit-cockpit__section">
          <div className="ffn-orbit-cockpit__status-row">
            <span>{orbitsT('cockpit.receipts.status', 'Receipt status')}</span>
            <strong>{receiptsLoading ? orbitsT('states.checking', 'Checking...') : receiptsSupported ? orbitsT('states.available', 'Available') : orbitsT('states.unavailable', 'Unavailable')}</strong>
          </div>

          {activeLevelReceipts.length > 0 ? (
            <div className="ffn-orbit-cockpit__list">
              {activeLevelReceipts.slice(0, 8).map((receipt, index) => (
                <div key={`${receipt.txHash || index}-${index}`} className="ffn-orbit-cockpit__list-item">
                  <strong>{receipt.receiptTypeLabel || receipt.receiptType || orbitsT('cockpit.receipts.receipt', 'Receipt')}</strong>
                  <span>{formatUsdtDisplay(getReceiptWalletCredited(receipt))} USDT</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ffn-orbit-cockpit__empty">
              {orbitsT('cockpit.receipts.empty', 'No routed receipts found for this level yet.')}
            </div>
          )}
        </div>
      )
    }

    if (orbitCockpitTab === 'members') {
      return (
        <div className="ffn-orbit-cockpit__section">
          <div className="ffn-orbit-cockpit__split">
            <div>
              <span>{orbitsT('cockpit.members.downlines', 'Downlines')}</span>
              <strong>{activeDownlines.length}</strong>
            </div>
            <div>
              <span>{orbitsT('cockpit.members.otherOccupants', 'Other position holders')}</span>
              <strong>{activeSpillovers.length}</strong>
            </div>
          </div>

          <div className="ffn-orbit-cockpit__list">
            {[...activeDownlines, ...activeSpillovers].slice(0, 8).map((item, index) => {
              const address = item?.occupant || item?.user || ''
              const key = address?.toLowerCase?.() || `${index}`
              const displayId = resolvedMemberIds[key] || shortAddress(address)

              return (
                <div key={`${key}-${index}`} className="ffn-orbit-cockpit__list-item">
                  <strong>{displayId}</strong>
                  <span>{orbitsT('cockpit.members.position', 'Position {{position}}', { position: item?.number || item?.position || '-' })}</span>
                </div>
              )
            })}
          </div>

          {!activeDownlines.length && !activeSpillovers.length && (
            <div className="ffn-orbit-cockpit__empty">
              {orbitsT('cockpit.members.empty', 'No member movement is visible for this level yet.')}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="ffn-orbit-cockpit__section">
        <div className="ffn-orbit-cockpit__guide">
          <p><strong>{orbitsT('guide.green', 'Green')}</strong> {orbitsT('guide.greenText', 'means your position.')}</p>
          <p><strong>{orbitsT('guide.orange', 'Orange')}</strong> {orbitsT('guide.orangeText', 'means downline.')}</p>
          <p><strong>{orbitsT('guide.blue', 'Blue')}</strong> {orbitsT('guide.blueText', 'means another participant.')}</p>
          <p><strong>{orbitsT('guide.dashed', 'Dashed')}</strong> {orbitsT('guide.dashedText', 'means empty position.')}</p>
          <p>{orbitsT('guide.clickPlanet', 'Click any planet to open the existing detailed position modal.')}</p>
        </div>
      </div>
    )
  }

  return (
    <section className={`orbits-page ${focusedOnly ? 'orbits-page--focused' : ''}`}>
      {!focusedOnly && (
        <div className="orbits-control-shell">
          <div className="address-input-bar glass-panel">
            <input
              type="text"
              className="address-input"
              placeholder={orbitsT('controls.identityPlaceholder', 'Wallet address or Referral ID')}
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
            />
            <button className="address-btn" onClick={applyViewerAddress} disabled={identityLookupState.status === 'loading'}>
              {identityLookupState.status === 'loading' ? orbitsT('actions.resolving', 'Resolving...') : orbitsT('actions.loadAddress', 'Load Address')}
            </button>
            <button className="address-btn secondary" onClick={viewMyOrbit}>{orbitsT('actions.myOrbits', 'My Orbits')}</button>
            <button className="address-btn secondary" onClick={() => navigate('/activation')}>
              {orbitsT('actions.activationCenter', 'Activation Center')}
            </button>
            <button className="refresh-btn" onClick={refreshData} disabled={isRefreshing}>{orbitsT('actions.refresh', 'Refresh')}</button>
            <span className="last-sync">{orbitsT('controls.lastSync', 'Last sync: {{time}}', { time: lastUpdated })}</span>
          </div>

          {identityLookupState.message && identityLookupState.status !== 'idle' && (
            <InlineAlert
              tone={identityLookupState.status === 'error' ? 'danger' : identityLookupState.status === 'success' ? 'success' : 'info'}
              className="orbit-identity-alert"
            >
              {identityLookupState.message}
            </InlineAlert>
          )}

          <TransactionStatus txState={orbitTxState} />

          <div className="view-toggle-bar glass-panel">
            <button
              className={`toggle-btn ${viewMode === 'global' ? 'active' : ''}`}
              onClick={() => setViewMode('global')}
            >
              {orbitsT('view.orbitView', 'Orbit View')}
            </button>
            <button
              className={`toggle-btn ${viewMode === 'downline' ? 'active' : ''}`}
              onClick={() => setViewMode('downline')}
            >
              {orbitsT('view.downlineView', 'Downline View')} {totalDownline > 0 && <span className="badge">{totalDownline}</span>}
            </button>
            <div className="receipt-status">
              {orbitsT('controls.receiptsStatus', 'Receipts: {{status}}', {
                status: receiptsLoading
                  ? orbitsT('states.checking', 'Checking...')
                  : receiptsSupported
                    ? orbitsT('states.on', 'On')
                    : orbitsT('states.off', 'Off'),
              })}
            </div>
          </div>
        </div>
      )}

      {!focusedOnly && (
        <div className="level-tabs glass-panel">
          {visibleLevels.map(level => {
            const orbitType = levelToOrbitType[level]
            const isActive = viewedLevelsReady ? !!viewedLevels[level] : true
            const isLoading = loadingLevelsMap[level]
            return (
              <button
                key={level}
                className={`level-tab ${activeTab === `level${level}` ? 'active' : ''} ${!isActive ? 'inactive' : ''}`}
                onClick={() => setActiveTab(`level${level}`)}
              >
                L{level} ({orbitType})
                {viewedLevelsReady && !isActive && <span className="inactive-badge">{orbitsT('states.off', 'Off')}</span>}
                {isLoading && <span className="loading-dot" />}
              </button>
            )
          })}
        </div>
      )}

      {!focusedOnly && (
        <div className="orbit-tips glass-panel">
          <p>
            ⚡ You may experience a slight delay when opening <strong>P12</strong> and <strong>P39</strong> orbits.
          </p>
          <p>
            🚀 [Blinking Yellow Dots] Other orbit visuals load silently when you click the next level while viewing your current level.
          </p>
        </div>
      )}

      {focusedOnly && (
        <div className="ffn-orbit-focus__header">
          <div className="ffn-orbit-focus__title">
            <span>{orbitsT('focused.eyebrow', 'Focused Orbit View')}</span>
            <h1>{orbitsT('focused.title', 'Level {{level}} - {{orbit}}', { level: activeLevelNumber, orbit: activeOrbitType })}</h1>
            <p>
              {orbitsT('focused.description', 'Viewing {{member}}. The orbit visual is the main screen; open the cockpit for controls and reports.', { member: focusedMemberLabel })}
            </p>
          </div>

          <div className="ffn-orbit-focus__status">
            <div>
              <span>{orbitsT('focused.memberId', 'Member ID')}</span>
              <strong>{focusedMemberLabel || '—'}</strong>
            </div>
            <div>
              <span>{orbitsT('focused.address', 'Address')}</span>
              <strong>{shortAddress(viewAddress)}</strong>
            </div>
            <div>
              <span>{orbitsT('focused.cycle', 'Cycle')}</span>
              <strong>{activeCycleSelection === 'current' ? orbitsT('cycle.current', 'Current') : orbitsT('cycle.value', 'Cycle {{cycle}}', { cycle: activeCycleSelection })}</strong>
            </div>
            <div>
              <span>{orbitsT('focused.lastSync', 'Last sync')}</span>
              <strong>{lastUpdated}</strong>
            </div>
          </div>

          <button
            type="button"
            className="ffn-orbit-focus__open ffn-orbit-focus__open--desktop"
            onClick={() => setIsOrbitToolsOpen(true)}
          >
            {orbitsT('actions.openCockpit', 'Open Cockpit')}
          </button>
        </div>
      )}

      <div className={`ffn-orbit-command-layout ${focusedOnly && isOrbitToolsOpen ? 'is-cockpit-open' : ''}`}>
        <div className={`orbits-main-grid orbit-first-grid ${focusedOnly ? 'ffn-orbit-focus' : ''}`}>
          <div className="orbits-main-grid__left">
            {visibleLevels.map(level => {
              if (activeTab !== `level${level}`) return null
              const data = orbitData[level]
              const isLevelActive = viewedLevelsReady ? !!viewedLevels[level] : true

              if (!focusedOnly && viewedLevelsReady && !isLevelActive) {
                return (
                  <div key={level} className="loading-level glass-panel orbit-loading-panel">
                    <h3>{orbitsT('inactive.title', 'Level {{level}} is not active yet', { level })}</h3>
                    <p>
                      {orbitsT('inactive.text', 'This wallet has not activated Level {{level}}. Activate Level 1 first to begin viewing orbit activity.', { level })}
                    </p>
                  </div>
                )
              }

              if (!data) {
              return (
                <div key={level} className="loading-level glass-panel orbit-loading-panel">
                  <div className="skeleton-card" style={{ width: '100%' }}>
                    <div className="skeleton skeleton-title"></div>
                    <div className="skeleton-grid">
                      <div className="skeleton skeleton-grid-item"></div>
                      <div className="skeleton skeleton-grid-item"></div>
                      <div className="skeleton skeleton-grid-item"></div>
                      <div className="skeleton skeleton-grid-item"></div>
                    </div>
                    <div className="skeleton skeleton-orbit"></div>
                  </div>
                </div>
              )
            }

              const orbitType = data.orbitType
              const config = orbitTypeConfig[orbitType]
              const positions = data.positions || []
              const currentIndex = data.currentIndex
              const totalCycles = data.totalCycles
              const autoUpgradeCompleted = data.autoUpgradeCompleted
              const lineCounts = linePaymentCountsByLevel[level] || data.linePaymentCounts || { line1: 0, line2: 0, line3: 0 }
              const levelInfo = levelConfig[level]

              const totalCompletedCycles = Number(totalCycles || 0)
              const availableCycleNumbers = Array.from({ length: totalCompletedCycles }, (_, idx) => idx + 1)
              const selectedCycle = getHistoricalCycleSelection(level)
              const isHistoricalView = selectedCycle !== 'current'
              const historicalPositions = (cycleHistoryData[level]?.[String(selectedCycle)] || []).map(pos => ({ ...pos, level }))
              const displayedPositions = isHistoricalView ? historicalPositions : positions

              const ownerLower = viewAddress?.toLowerCase()

              const displayedDownlineCount = displayedPositions.filter((p) => {
                if (!p.occupant) return false

                if (isHistoricalView) {
                  const ref =
                    p.originalReferrer ||
                    p.referrer ||
                    p.occupantReferrer ||
                    ethers.ZeroAddress

                  if (ref && ref !== ethers.ZeroAddress) {
                    return ref.toLowerCase() === ownerLower
                  }

                  return p.occupantType === 'downline'
                }

                const ref =
                  p.originalReferrer ||
                  p.referrer ||
                  p.occupantReferrer ||
                  ethers.ZeroAddress

                return ref.toLowerCase() === ownerLower
              }).length

              const displayedOtherCount = displayedPositions.filter((p) => {
                if (!p.occupant) return false
                if (p.occupant.toLowerCase() === ownerLower) return false

                if (isHistoricalView) {
                  const ref =
                    p.originalReferrer ||
                    p.referrer ||
                    p.occupantReferrer ||
                    ethers.ZeroAddress

                  if (ref && ref !== ethers.ZeroAddress) {
                    return ref.toLowerCase() !== ownerLower
                  }

                  return p.occupantType === 'other'
                }

                const ref =
                  p.originalReferrer ||
                  p.referrer ||
                  p.occupantReferrer ||
                  ethers.ZeroAddress

                return ref.toLowerCase() !== ownerLower
              }).length

              const positionsByLine = {}
              displayedPositions.forEach(pos => {
                const line = pos.line
                if (!positionsByLine[line]) positionsByLine[line] = []
                positionsByLine[line].push(pos)
              })

              const structure = getOrbitStructure(orbitType)
              const filledCountForDisplay = displayedPositions.filter(p => p.occupant).length
              const currentIndexForDisplay = isHistoricalView
                ? Math.min(filledCountForDisplay, config.positions)
                : (currentIndex || 0)

              const shouldShowAutoUpgradePanel =
                isLevelActive &&
                level < 10 &&
                level === highestViewedActiveLevel

              const showCycleButtons = totalCompletedCycles > 0

              return (
                <div key={level} className={`orbit-content ${loadingLevelsMap[level] ? 'is-level-loading' : ''}`}>
                  {(!focusedOnly || orbitDisplayOptions.orbitHeaderCard) && (
                    <div className="orbit-header-card glass-panel">
                      <div className="orbit-header-info">
                        <span>{orbitsT('orbitHeader.title', 'Level {{level}} ({{orbit}}) - {{view}}', { level, orbit: orbitType, view: viewMode === 'global' ? orbitsT('view.orbitView', 'Orbit View') : orbitsT('view.downlineView', 'Downline View') })}</span>
                        {totalCycles > 0 && <span className="cycle-badge">{orbitsT('cycle.value', 'Cycle {{cycle}}', { cycle: Number(totalCycles) + 1 })}</span>}
                        {isHistoricalView && <span className="history-badge">{orbitsT('cycle.storedSnapshot', 'Stored Snapshot - Cycle {{cycle}}', { cycle: selectedCycle })}</span>}
                      </div>
                      <div className="orbit-header-stats">
                        {!isLevelActive && <span className="badge-secondary">{orbitsT('states.inactive', 'Inactive')}</span>}
                        {displayedDownlineCount > 0 && <span className="badge-warning">⬇ {displayedDownlineCount}</span>}
                        {displayedOtherCount > 0 && <span className="badge-info">🔄 {displayedOtherCount}</span>}
                        <span className="badge-primary">{orbitsT('orbitHeader.filled', '{{filled}}/{{total}} filled', { filled: filledCountForDisplay, total: config.positions })}</span>
                      </div>
                    </div>
                  )}

                  {(!focusedOnly || orbitDisplayOptions.summaryStrip) && (
                    <div className={`orbit-summary-strip glass-panel ${isHistoricalView ? 'is-historical' : 'is-live'}`}>
                      <div className="orbit-summary-item">
                        <span className="orbit-summary-label">{orbitsT('summary.orbitType', 'Orbit Type')}</span>
                        <strong className="orbit-summary-value">{orbitType}</strong>
                      </div>

                      <div className="orbit-summary-item">
                        <span className="orbit-summary-label">{orbitsT('summary.levelPrice', 'Level Price')}</span>
                        <strong className="orbit-summary-value">{levelConfig[level]?.price || 0} USDT</strong>
                      </div>

                      <div className="orbit-summary-item">
                        <span className="orbit-summary-label">{isHistoricalView ? orbitsT('summary.snapshotCycle', 'Snapshot Cycle') : orbitsT('summary.currentCycle', 'Current Cycle')}</span>
                        <strong className="orbit-summary-value">
                          {isHistoricalView ? orbitsT('cycle.value', 'Cycle {{cycle}}', { cycle: selectedCycle }) : orbitsT('cycle.value', 'Cycle {{cycle}}', { cycle: Number(totalCycles) + 1 })}
                        </strong>
                      </div>

                      <div className="orbit-summary-item">
                        <span className="orbit-summary-label">{orbitsT('summary.filledPositions', 'Filled Positions')}</span>
                        <strong className="orbit-summary-value">{filledCountForDisplay}/{config.positions}</strong>
                      </div>

                      <div className="orbit-summary-item">
                        <span className="orbit-summary-label">{orbitsT('summary.totalEarned', 'Total Earned')}</span>
                        <strong className="orbit-summary-value">{formatUsdtDisplay(data?.totalEarned || 0)} USDT</strong>
                      </div>

                      <div className="orbit-summary-item">
                        <span className="orbit-summary-label">{level < 10 ? orbitsT('summary.autoUpgradeLocked', 'Auto-upgrade Locked') : orbitsT('summary.topLevel', 'Top Level')}</span>
                        <strong className="orbit-summary-value">
                          {level < 10 ? `${formatUsdtDisplay(userLocks[level] || 0)} USDT` : orbitsT('states.complete', 'Complete')}
                        </strong>
                      </div>
                    </div>
                  )}

                  {showCycleButtons && (!focusedOnly || orbitDisplayOptions.cycleSwitcher) && (
                    <div className="cycle-switcher glass-panel">
                      <span className="cycle-label">{orbitsT('cycle.viewLabel', 'Cycle View:')}</span>
                      <button
                        className={`cycle-btn ${selectedCycle === 'current' ? 'active' : ''}`}
                        onClick={() => selectOrbitCycle(level, 'current')}
                      >
                        {orbitsT('cycle.current', 'Current')}
                      </button>
                      {availableCycleNumbers.map(cycleNum => (
                        <button
                          key={cycleNum}
                          className={`cycle-btn ${selectedCycle === cycleNum ? 'active' : ''}`}
                          onClick={() => selectOrbitCycle(level, cycleNum)}
                        >
                          {orbitsT('cycle.value', 'Cycle {{cycle}}', { cycle: cycleNum })}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="orbit-zoom-controls glass-panel" aria-label={orbitsT('zoom.controls', 'Orbit zoom controls')}>
                    <button
                      type="button"
                      onClick={() => setOrbitZoom((current) => Math.max(0.75, Number((current - 0.1).toFixed(2))))}
                      aria-label={orbitsT('zoom.out', 'Zoom out')}
                    >
                      -
                    </button>
                    <span>{Math.round(orbitZoom * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setOrbitZoom((current) => Math.min(1.7, Number((current + 0.1).toFixed(2))))}
                      aria-label={orbitsT('zoom.in', 'Zoom in')}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrbitZoom(1)
                        setOrbitPan({ x: 0, y: 0 })
                      }}
                      aria-label={orbitsT('zoom.reset', 'Reset zoom')}
                    >
                      {orbitsT('zoom.reset', 'Reset')}
                    </button>
                  </div>

                  <div
                    key={`galaxy-${activeTab}`}
                    className={`galaxy-container ${orbitType.toLowerCase()} ${orbitZoom > 1 ? 'is-pannable' : ''} ${isOrbitPanning ? 'is-panning' : ''} ${!isGalaxyMeasured ? 'is-measuring' : ''}`}
                    ref={galaxyRef}
                    onPointerDown={handleOrbitPointerDown}
                    onPointerMove={handleOrbitPointerMove}
                    onPointerUp={handleOrbitPointerEnd}
                    onPointerCancel={handleOrbitPointerEnd}
                    onPointerLeave={handleOrbitPointerEnd}
                  >
                   {!isGalaxyMeasured ? (
                      <div className="galaxy-measure-loader">
                        <div className="skeleton skeleton-orbit" style={{ width: '200px', height: '200px', margin: '0 auto' }}></div>
                        <p style={{ marginTop: 20 }}>{orbitsT('states.preparingOrbitView', 'Preparing orbit view...')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="star-field">
                          {starConfig.map((star) => (
                            <span
                              key={star.id}
                              className="star"
                              style={{
                                left: star.left,
                                top: star.top,
                                width: star.size,
                                height: star.size,
                                opacity: star.opacity,
                                animationDelay: `${star.delay}, ${star.delay}`,
                                animationDuration: `${star.duration}, ${star.drift}`,
                              }}
                            />
                          ))}
                        </div>

                        <div className="galaxy-inner">
                          {(() => {
                            const outerWidth = containerSize.width || galaxyRef.current?.clientWidth || 560
                            const outerHeight = containerSize.height || galaxyRef.current?.clientHeight || outerWidth
                            const usableSize = Math.max(Math.min(outerWidth, outerHeight) * 0.86, 240)
                            const stageSize = usableSize
                            const centerX = stageSize / 2
                            const centerY = stageSize / 2

                            const planetSize = getPlanetSize(orbitType, stageSize)
                            const coreSize = getCoreSize(orbitType, stageSize)
                            const nodePadding = planetSize / 2 + 8
                            const coreClearance = coreSize / 2 + planetSize / 2 + 18

                            let ringRadiiPx = { 1: Math.max(coreClearance, stageSize * 0.22), 2: stageSize * 0.34, 3: stageSize * 0.45 }
                            if (orbitType === 'P4') ringRadiiPx = { 1: Math.max(coreClearance + 6, stageSize * 0.31) }
                            if (orbitType === 'P12') ringRadiiPx = {
                              1: Math.max(coreClearance + 4, stageSize * 0.19),
                              2: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding)
                            }
                            if (orbitType === 'P39') ringRadiiPx = {
                              1: Math.max(coreClearance, stageSize * 0.17),
                              2: Math.min(stageSize * 0.32, (stageSize / 2) - nodePadding - 34),
                              3: Math.min(stageSize * 0.47, (stageSize / 2) - nodePadding)
                            }
                            Object.keys(ringRadiiPx).forEach(key => {
                              ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding)
                            })

                            const createEmptyPosition = (posNumber, lineNum) => ({
                              number: posNumber,
                              occupantType: 'empty',
                              occupant: null,
                              amount: '0',
                              timestamp: 0,
                              positionInfo: buildPositionInfoFromRuleView(orbitType, posNumber, level, null, viewAddress),
                              line: lineNum,
                              spillsTo: null,
                              parentPosition: getStructuralParentPosition(orbitType, posNumber),
                              truthLabel: 'NO_RECEIPT',
                              payoutReceipts: [],
                              viewerReceiptBreakdown: {
                                generatedGross: 0,
                                walletCreditedLiquid: 0,
                                receiptEscrowLocked: 0,
                                totalLiquid: 0
                              },
                              receiptTotals: {
                                generatedGross: 0,
                                walletCreditedLiquid: 0,
                                receiptEscrowLocked: 0,
                                gross: 0,
                                liquidPaid: 0,
                                escrowLocked: 0,
                                count: 0
                              },
                              indexedReceiptCount: 0,
                              indexedEventCount: 0,
                              activationId: 0,
                              activationCycleNumber: isHistoricalView ? Number(selectedCycle) : Number(totalCycles) + 1,
                              isMirrorActivation: false,
                              indexedReceipts: [],
                              indexedEvents: [],
                              ruleView: null
                            })

                             const allPositionMap = {}
                             structure.lines.forEach(lineNum => {
                               const linePositions = positionsByLine[lineNum] || []
                               structure.positions[lineNum].forEach(posNumber => {
                                 allPositionMap[posNumber] =
                                   linePositions.find(p => p.number === posNumber) ||
                                   createEmptyPosition(posNumber, lineNum)
                               })
                             })

                            const allPositions = Object.values(allPositionMap)
                            const currentFillTarget =
                              allPositions
                                .filter((position) => !position?.occupant)
                                .sort((a, b) => a.number - b.number)[0]?.number || 0
                            const newestFilledPosition =
                              allPositions
                                .filter((position) => position?.occupant && Number(position?.timestamp || 0) > 0)
                                .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))[0]?.number || 0

                             const getCoordsForPosition = (posNumber, lineNum, index) => {
                              const customAngle = structure.customAngles?.[lineNum]?.[posNumber]
                              if (typeof customAngle === 'number') {
                                return getPositionOnAngle(customAngle, ringRadiiPx[lineNum], centerX, centerY)
                              }
                              return getPositionOnRing(index, structure.counts[lineNum], ringRadiiPx[lineNum], centerX, centerY, structure.startAngles[lineNum])
                            }

                            const getTrimmedConnectionStyle = (fromCoords, toCoords, fromRadius, toRadius) => {
                              const dx = toCoords.x - fromCoords.x
                              const dy = toCoords.y - fromCoords.y
                              const distance = Math.sqrt(dx * dx + dy * dy)

                              if (!distance) {
                                return {
                                  width: 0,
                                  left: fromCoords.x,
                                  top: fromCoords.y,
                                  transform: 'rotate(0deg)',
                                }
                              }

                              const ux = dx / distance
                              const uy = dy / distance

                              const startX = fromCoords.x + ux * fromRadius
                              const startY = fromCoords.y + uy * fromRadius
                              const endX = toCoords.x - ux * toRadius
                              const endY = toCoords.y - uy * toRadius

                              const trimmedDx = endX - startX
                              const trimmedDy = endY - startY
                              const trimmedDistance = Math.max(0, Math.sqrt(trimmedDx * trimmedDx + trimmedDy * trimmedDy))
                              const angle = Math.atan2(trimmedDy, trimmedDx) * 180 / Math.PI

                              return {
                                width: trimmedDistance,
                                left: startX,
                                top: startY,
                                transform: `rotate(${angle}deg)`,
                              }
                            }

                            return (
                              <div
                                className="galaxy-stage"
                                style={{
                                  width: stageSize,
                                  height: stageSize,
                                  left: '50%',
                                  top: '50%',
                                  transform: `translate(calc(-50% + ${orbitPan.x}px), calc(-50% + ${orbitPan.y}px)) scale(${orbitZoom})`
                                }}
                              >
                                <div
                                  className={`orbit-core ${
                                    !isLevelActive
                                      ? 'inactive'
                                      : isViewingSelf
                                        ? 'is-self-active'
                                        : 'is-viewing-member'
                                  }`}
                                  style={{ width: coreSize, height: coreSize }}
                                >
                                  <span className="core-label">{isLevelActive ? orbitsT('core.orbit', 'ORBIT') : orbitsT('states.inactive', 'INACTIVE')}</span>
                                  <span className="core-value">{isLevelActive ? (isViewingSelf ? orbitsT('core.you', 'YOU') : (resolvedMemberIds[viewAddress?.toLowerCase()] || shortAddress(viewAddress))) : orbitsT('states.locked', 'LOCKED')}</span>
                                </div>

                                {structure.lines.map(lineNum => {
                                  const linePositions = positionsByLine[lineNum] || []
                                  const filledCount = linePositions.filter(p => p.occupant).length
                                  const diameter = ringRadiiPx[lineNum] * 2
                                  const arrivals = lineNum === 1 ? lineCounts.line1 : lineNum === 2 ? lineCounts.line2 : lineCounts.line3
                                  return (
                                    <div key={lineNum} className={`orbit-ring line${lineNum}`} style={{ width: diameter, height: diameter }}>
                                      <span className="ring-label">{orbitsT('line.upper', 'LINE {{line}}', { line: lineNum })}</span>
                                      <span className="ring-stats">{orbitsT('line.stats', '{{filled}}/{{total}} - arrivals: {{arrivals}}', { filled: filledCount, total: structure.positions[lineNum].length, arrivals })}</span>
                                    </div>
                                  )
                                })}

                                {structure.lines.map(lineNum => structure.positions[lineNum].map(posNumber => {
                                  const parentPos = getStructuralParentPosition(orbitType, posNumber)
                                  if (!parentPos) return null
                                  const fromPos = allPositionMap[posNumber]
                                  const toPos = allPositionMap[parentPos]
                                  if (!fromPos || !toPos) return null
                                  const fromIndex = structure.positions[fromPos.line].indexOf(fromPos.number)
                                  const toIndex = structure.positions[toPos.line].indexOf(toPos.number)
                                  if (fromIndex < 0 || toIndex < 0) return null
                                  const fromCoords = getCoordsForPosition(fromPos.number, fromPos.line, fromIndex)
                                  const toCoords = getCoordsForPosition(toPos.number, toPos.line, toIndex)

                                  const connectionStyle = getTrimmedConnectionStyle(
                                    fromCoords,
                                    toCoords,
                                    planetSize / 2,
                                    planetSize / 2
                                  )

                                  return (
                                    <div
                                      key={`grey-conn-${posNumber}`}
                                      className="structural-connection-grey"
                                      style={connectionStyle}
                                    />
                                  )
                                }))}

                                {structure.lines.map(lineNum => structure.positions[lineNum].map((posNumber, index) => {
                                   const pos = allPositionMap[posNumber]
                                   const coords = getCoordsForPosition(posNumber, lineNum, index)
                                  const semanticState = getPositionSemanticState(pos, currentFillTarget, newestFilledPosition)
                                   let planetClass = 'planet-node '
                                  if (pos.occupantType === 'mine') planetClass += 'mine'
                                  else if (pos.occupantType === 'downline') planetClass += 'downline'
                                  else if (pos.occupantType === 'other') planetClass += 'other'
                                  else planetClass += 'empty'
                                   if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) {
                                     planetClass += ' structural-preview'
                                   }
                                  planetClass += ` orbit-state-${semanticState}`

                                  const badgeValue = getPlanetBadgeValue(pos)
                                  const occupantDisplay = pos.occupant && ethers.isAddress(pos.occupant)
                                    ? resolvedMemberIds[pos.occupant.toLowerCase()] || shortAddress(pos.occupant)
                                    : null

                                  return (
                                    <div
                                      key={pos.number}
                                      className={planetClass}
                                      data-orbit-state={semanticState}
                                      data-line={lineNum}
                                      role="button"
                                      tabIndex={0}
                                      aria-label={orbitsT('position.nodeAriaLabel', 'Position {{position}}, {{state}}', {
                                        position: pos.number,
                                        state: semanticState.replace(/-/g, ' '),
                                      })}
                                      style={{
                                        left: coords.x,
                                        top: coords.y,
                                        width: planetSize,
                                        height: planetSize,
                                        transform: 'translate(-50%, -50%)',
                                        '--index': index
                                      }}
                                      onClick={() => {
                                        if (orbitDragRef.current.didDrag) return
                                        handlePositionClick(pos)
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault()
                                          handlePositionClick(pos)
                                        }
                                      }}
                                      onMouseEnter={() => {
                                        setHoveredPosition(pos)
                                        if (pos.parentPosition) handleStructuralPreview(pos)
                                      }}
                                      onMouseLeave={() => setHoveredPosition(null)}
                                    >
                                      <div className="planet-content">
                                        <span className="node-number">{pos.number}</span>
                                        {pos.occupant && pos.occupantType === 'mine' && <span className="planet-icon">👤</span>}
                                        {pos.occupant && pos.occupantType === 'downline' && occupantDisplay && <span className="planet-icon-short">{occupantDisplay.slice(0, 3)}</span>}
                                        {pos.occupant && pos.occupantType === 'other' && occupantDisplay && <span className="planet-icon-short">{occupantDisplay.slice(0, 3)}</span>}
                                        {badgeValue > 0 && pos.occupantType !== 'mine' && (
                                          <span className="planet-earn-badge">{formatUsdtDisplay(badgeValue)}</span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                }))}

                                {!isHistoricalView && data.spilloverFromPositions?.map((conn, idx) => {
                                  const fromPos = allPositionMap[conn.from]
                                  const toPos = allPositionMap[conn.to]
                                  if (!fromPos || !toPos || !fromPos.occupant) return null
                                  const fromIndex = structure.positions[fromPos.line].indexOf(fromPos.number)
                                  const toIndex = structure.positions[toPos.line].indexOf(toPos.number)
                                  if (fromIndex < 0 || toIndex < 0) return null
                                  const fromCoords = getCoordsForPosition(fromPos.number, fromPos.line, fromIndex)
                                  const toCoords = getCoordsForPosition(toPos.number, toPos.line, toIndex)

                                  const connectionStyle = getTrimmedConnectionStyle(
                                    fromCoords,
                                    toCoords,
                                    planetSize / 2,
                                    planetSize / 2
                                  )

                                  return (
                                    <div
                                      key={`conn-${idx}`}
                                      className="structural-connection"
                                      style={connectionStyle}
                                    />
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </div>
                      </>
                    )}
                  </div>

                  {(!focusedOnly || orbitDisplayOptions.legend) && (
                    <div className="orbit-legend glass-panel">
                      <div className="legend-item"><div className="legend-dot mine"></div><span>{orbitsT('legend.yourPosition', 'Your Position')}</span></div>
                      <div className="legend-item"><div className="legend-dot downline"></div><span>{orbitsT('legend.downline', 'Downline')}</span></div>
                      <div className="legend-item"><div className="legend-dot other"></div><span>{orbitsT('legend.otherUser', 'Other User')}</span></div>
                      <div className="legend-item"><div className="legend-dot empty"></div><span>{orbitsT('legend.empty', 'Empty')}</span></div>
                      <div className="legend-item"><div className="legend-dot gold"></div><span>{orbitsT('legend.spilloverLink', 'Spillover Link')}</span></div>
                    </div>
                  )}

                  {(!focusedOnly || orbitDisplayOptions.hoverCard) && hoveredPosition && (
                    <div className="orbit-hover-card glass-panel">
                      {renderPositionTooltip(hoveredPosition)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {focusedOnly && (
          <>
            <button
              type="button"
              className={`ffn-orbit-cockpit-toggle ${isOrbitToolsOpen ? 'is-open' : ''}`}
              onClick={() => setIsOrbitToolsOpen((current) => !current)}
              aria-expanded={isOrbitToolsOpen}
            >
              <span>{isOrbitToolsOpen ? orbitsT('actions.closeCockpit', 'Close Cockpit') : orbitsT('cockpit.title', 'Orbit Cockpit')}</span>
              <strong>{activeOrbitType}</strong>
            </button>

            {isOrbitToolsOpen && (
              <button
                type="button"
                className="ffn-orbit-cockpit-backdrop"
                onClick={() => setIsOrbitToolsOpen(false)}
                aria-label={orbitsT('cockpit.closeAriaLabel', 'Close orbit cockpit')}
              />
            )}

            <aside
              className={`ffn-orbit-cockpit ${isOrbitToolsOpen ? 'is-open' : ''}`}
              aria-hidden={!isOrbitToolsOpen}
            >
              <div className="ffn-orbit-cockpit__top">
                <div>
                  <span>{orbitsT('cockpit.title', 'Orbit Cockpit')}</span>
                  <strong>Level {activeLevelNumber} • {activeOrbitType}</strong>
                </div>

                <button
                  type="button"
                  className="ffn-orbit-cockpit__close"
                  onClick={() => setIsOrbitToolsOpen(false)}
                  aria-label={orbitsT('cockpit.closeAriaLabel', 'Close orbit cockpit')}
                >
                  ×
                </button>
              </div>

              <div className="ffn-orbit-cockpit__tabs">
                {cockpitTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={orbitCockpitTab === tab.id ? 'is-active' : ''}
                    onClick={() => setOrbitCockpitTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="ffn-orbit-cockpit__body">
                {renderFocusedCockpitBody()}
              </div>
            </aside>
          </>
        )}
      </div>

      {showPositionModal && selectedPosition && (
        <div
          className="orbit-position-local-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={orbitsT('position.title', 'Position #{{number}}', { number: selectedPosition.number })}
        >
          <div
            className="position-modal position-modal--shared position-modal--earnings"
            ref={modalRef}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="position-modal__heading">
              <h3>{orbitsT('position.title', 'Position #{{number}}', { number: selectedPosition.number })}</h3>
              <p>{getOrbitNarration(selectedPosition).title}</p>
              <button
                type="button"
                className="position-modal__close"
                onClick={() => {
                  setShowPositionModal(false)
                  setSelectedPosition(null)
                }}
                aria-label={orbitsT('position.closeAriaLabel', 'Close position details')}
              >
                ×
              </button>
            </div>
            <button
              type="button"
              className="modal-close position-modal__legacy-close"
              onClick={() => {
                setShowPositionModal(false)
                setSelectedPosition(null)
              }}
            aria-label={orbitsT('position.closeAriaLabel', 'Close position details')}
            >
              ×
            </button>
            <InlineAlert tone={getOrbitNarration(selectedPosition).tone} className="orbit-narration-panel">
              <strong>{getOrbitNarration(selectedPosition).title}</strong>
              <p>{getOrbitNarration(selectedPosition).message}</p>
            </InlineAlert>

           {selectedPosition.detailsLoading ? (
          <div className="orbit-modal-skeleton">
            <Skeleton height={14} />
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="80%" />
            <Skeleton height={14} width="70%" />
            <Skeleton height={14} width="60%" />
          </div>
        ) : (
              <>
                <div className="orbit-earnings-summary">
                  <div className="modal-subtitle modal-subtitle--visible">{orbitsT('modal.summaryTitle', 'Transaction Summary')}</div>

                  {selectedPosition.occupant ? (
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.occupant', 'Position Holder')}</span>
                      <span>{resolvedMemberIds[selectedPosition.occupant?.toLowerCase()] || orbitsT('modal.memberIdUnavailable', 'ID unavailable')}</span>
                    </div>
                  ) : (
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.status', 'Status')}</span>
                      <span>{orbitsT('status.emptyAvailable', 'Empty - Available')}</span>
                    </div>
                  )}

                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.generatedForViewer', 'Generated for Viewed Wallet')}</span>
                    <span>{formatUsdtDisplay(getPositionGeneratedGross(selectedPosition))} USDT</span>
                  </div>

                  <div className="modal-detail">
                    <span className="modal-label">
                      {getPositionWalletCredited(selectedPosition) > 0
                        ? orbitsT('modal.creditedToViewedWallet', 'Credited to Viewed Wallet')
                        : orbitsT('modal.netAmountEstimate', 'Net Amount Estimate')}
                    </span>
                    <span>
                      {formatUsdtDisplay(getPositionWalletCredited(selectedPosition) || getEstimatedNetAmount(Number(selectedPosition.amount || 0)))} USDT
                    </span>
                  </div>

                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.lockedForAutoUpgrade', 'Locked for Auto-upgrade')}</span>
                    <span>{formatUsdtDisplay(getExecutedEscrowLocked(selectedPosition))} USDT</span>
                  </div>

                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.totalTransactionGenerated', 'Total Transaction Generated')}</span>
                    <span>{formatUsdtDisplay(getTotalsGeneratedGross(selectedPosition.receiptTotals))} USDT</span>
                  </div>

                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.totalTransactionCredited', 'Total Transaction Credited')}</span>
                    <span>{formatUsdtDisplay(getTotalsWalletCredited(selectedPosition.receiptTotals))} USDT</span>
                  </div>

                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.totalTransactionLocked', 'Total Transaction Locked')}</span>
                    <span>{formatUsdtDisplay(getTotalsEscrowLocked(selectedPosition.receiptTotals))} USDT</span>
                  </div>

                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.truthType', 'Truth Type')}</span>
                    <span>{formatTruthLabel(selectedPosition.truthLabel || selectedPosition.positionInfo?.type || 'Unknown')}</span>
                  </div>

                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.receiptProof', 'Receipt Proof')}</span>
                    <span>
                      {Number(selectedPosition.indexedReceiptCount || selectedPosition.indexedReceipts?.length || 0)}
                      {' '}
                      {orbitsT('modal.receiptsIndexed', 'indexed receipt(s)')}
                    </span>
                  </div>

                  {selectedPosition.activationId > 0 && (
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.activationId', 'Activation ID')}</span>
                      <span>#{selectedPosition.activationId}</span>
                    </div>
                  )}

                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.activationPath', 'Activation Path')}</span>
                    <span>{selectedPosition.isMirrorActivation ? orbitsT('modal.paths.mirror', 'Mirror activation') : orbitsT('modal.paths.direct', 'Direct activation')}</span>
                  </div>

                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.lineAndCycle', 'Line / Cycle')}</span>
                    <span>
                      {orbitsT('line.value', 'Line {{line}}', { line: selectedPosition.line || selectedPosition.positionInfo?.line || 1 })}
                      {' - '}
                      {selectedPosition.isHistoricalPosition
                        ? `Historical ${selectedPosition.cycleNumber || selectedPosition.activationCycleNumber || '—'}`
                        : `Current ${selectedPosition.activationCycleNumber || '—'}`}
                    </span>
                  </div>

                  {selectedPosition.positionInfo && Number(selectedPosition.positionInfo.exactToRecycle || 0) > 0 && (
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.toRecycle', 'To Recycle')}</span>
                      <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToRecycle || 0)} USDT</span>
                    </div>
                  )}

                  {selectedPosition.positionInfo && (
                    <>
                      <div className="modal-subtitle modal-subtitle--visible">{orbitsT('modal.routingTitle', 'Routing Rule Snapshot')}</div>
                      {Number(selectedPosition.positionInfo.exactToOwner || 0) > 0 && (
                        <div className="modal-detail">
                          <span className="modal-label">{orbitsT('modal.toOwner', 'To Owner')}</span>
                          <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToOwner || 0)} USDT</span>
                        </div>
                      )}
                      {Number(selectedPosition.positionInfo.exactToSpillover1 || 0) > 0 && (
                        <div className="modal-detail">
                          <span className="modal-label">{orbitsT('modal.toSpillover1', 'To Spillover 1')}</span>
                          <span>
                            {getMemberLabel(selectedPosition.positionInfo.spillover1Recipient)} - {formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover1 || 0)} USDT
                          </span>
                        </div>
                      )}
                      {Number(selectedPosition.positionInfo.exactToSpillover2 || 0) > 0 && (
                        <div className="modal-detail">
                          <span className="modal-label">{orbitsT('modal.toSpillover2', 'To Spillover 2')}</span>
                          <span>
                            {getMemberLabel(selectedPosition.positionInfo.spillover2Recipient)} - {formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover2 || 0)} USDT
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {getSpilloverReceiptRows(selectedPosition).map((row) => (
                    <div className="modal-detail modal-detail--spillover" key={row.key}>
                      <span className="modal-label">{row.label}</span>
                      <span className="spillover-rich-value">
                        <strong>{getMemberLabel(row.receiver)}</strong>
                        <em>{formatUsdtDisplay(row.amount)} USDT</em>
                        {row.txHash ? <small>{shortTx(row.txHash)}</small> : null}
                      </span>
                    </div>
                  ))}

                  {!!selectedPosition.indexedReceipts?.length && (
                    <div className="modal-record-list modal-record-list--proof">
                      <div className="modal-subtitle modal-subtitle--visible">{orbitsT('modal.transactionProofTitle', 'Transaction Proof')}</div>
                      {selectedPosition.indexedReceipts.slice(0, 8).map((receipt) => (
                        <div key={`${receipt.txHash}-${receipt.logIndex}`} className="modal-record-item">
                          <div><strong>{getReceiptTypeLabel(receipt)}</strong> - {shortTx(receipt.txHash)}</div>
                          <div>{orbitsT('modal.receiver', 'Receiver')}: {resolvedMemberIds[receipt.receiver?.toLowerCase?.()] || shortAddress(receipt.receiver)}</div>
                          <div>{orbitsT('modal.activationId', 'Activation ID')}: #{receipt.activationId || selectedPosition.activationId || '—'}</div>
                          <div>{orbitsT('modal.sourcePosition', 'Source Position')}: {receipt.sourcePosition || selectedPosition.number || '—'}</div>
                          {Number(receipt.receiptType || 0) === 3 && (
                            <div>{orbitsT('modal.spilloverReceiver', 'Spillover Receiver')}: {getMemberLabel(receipt.receiver)}</div>
                          )}
                          <div>{orbitsT('modal.gross', 'Generated')}: {formatUsdtDisplay(getReceiptGeneratedGross(receipt))} USDT</div>
                          <div>{orbitsT('modal.walletCredited', 'Wallet Credited')}: {formatUsdtDisplay(getReceiptWalletCredited(receipt))} USDT</div>
                          {getReceiptEscrowLocked(receipt) > 0 && <div>{orbitsT('modal.escrowLocked', 'Escrow Locked')}: {formatUsdtDisplay(getReceiptEscrowLocked(receipt))} USDT</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.truthType', 'Truth Type')}</span>
                  <span>{formatTruthLabel(selectedPosition.truthLabel || selectedPosition.positionInfo?.type || 'Unknown')}</span>
                </div>

                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.line', 'Line')}</span>
                  <span>{orbitsT('line.value', 'Line {{line}}', { line: selectedPosition.line || selectedPosition.positionInfo?.line || 1 })}</span>
                </div>

                {selectedPosition.parentPosition && (
                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.parent', 'Parent')}</span>
                    <span>{orbitsT('position.value', 'Position {{position}}', { position: selectedPosition.parentPosition })}</span>
                  </div>
                )}

                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.cycleView', 'Cycle View')}</span>
                  <span>
                    {selectedPosition.isHistoricalPosition
                      ? `Historical Cycle ${selectedPosition.cycleNumber || selectedPosition.activationCycleNumber || '—'}`
                      : `Current Cycle ${selectedPosition.activationCycleNumber || '—'}`}
                  </span>
                </div>

                {selectedPosition.activationId > 0 && (
                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.activationId', 'Activation ID')}</span>
                    <span>{selectedPosition.activationId}</span>
                  </div>
                )}

                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.mirrorActivation', 'Mirror Activation')}</span>
                  <span>{selectedPosition.isMirrorActivation ? orbitsT('states.yes', 'Yes') : orbitsT('states.no', 'No')}</span>
                </div>

                {selectedPosition.occupant ? (
                  <>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.occupant', 'Position Holder')}</span>
                      <span>{resolvedMemberIds[selectedPosition.occupant?.toLowerCase()] || shortAddress(selectedPosition.occupant)}</span>
                    </div>

                    {(selectedPosition.referrer || selectedPosition.originalReferrer || selectedPosition.occupantReferrer) &&
                      (selectedPosition.referrer || selectedPosition.originalReferrer || selectedPosition.occupantReferrer) !== ethers.ZeroAddress && (
                        <div className="modal-detail">
                          <span className="modal-label">{orbitsT('modal.referrer', 'Referrer')}</span>
                          <span>{shortAddress(selectedPosition.referrer || selectedPosition.originalReferrer || selectedPosition.occupantReferrer)}</span>
                        </div>
                      )}

                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.grossAmount', 'Generated Amount')}</span>
                      <span>{formatUsdtDisplay(getPositionGeneratedGross(selectedPosition))} USDT</span>
                    </div>

                    <div className="modal-detail">
                      <span className="modal-label">{getPositionWalletCredited(selectedPosition) > 0 ? orbitsT('modal.walletCredited', 'Wallet Credited') : orbitsT('modal.netAmountEstimate', 'Net Amount Estimate')}</span>
                      <span>{formatUsdtDisplay(getPositionWalletCredited(selectedPosition) || getEstimatedNetAmount(Number(selectedPosition.amount || 0)))} USDT</span>
                    </div>

                    {selectedPosition.timestamp > 0 && (
                      <div className="modal-detail">
                        <span className="modal-label">{orbitsT('modal.filled', 'Filled')}</span>
                        <span>{new Date(selectedPosition.timestamp * 1000).toLocaleString()}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="modal-detail">
                    <span className="modal-label">{orbitsT('modal.status', 'Status')}</span>
                    <span>{orbitsT('status.emptyAvailable', 'Empty - Available')}</span>
                  </div>
                )}

                <hr />

                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.indexedEvents', 'Indexed Events')}</span>
                  <span>{Number(selectedPosition.indexedEventCount || 0)}</span>
                </div>

                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.indexedReceipts', 'Indexed Receipts')}</span>
                  <span>{Number(selectedPosition.indexedReceiptCount || 0)}</span>
                </div>

                {!!selectedPosition.receiptTotals && (
                  <>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.receiptGross', 'Receipt Generated')}</span>
                      <span>{formatUsdtDisplay(getTotalsGeneratedGross(selectedPosition.receiptTotals))} USDT</span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.liquidPaid', 'Wallet Credited')}</span>
                      <span>{formatUsdtDisplay(getTotalsWalletCredited(selectedPosition.receiptTotals))} USDT</span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.escrowLocked', 'Escrow Locked')}</span>
                      <span>{formatUsdtDisplay(getTotalsEscrowLocked(selectedPosition.receiptTotals))} USDT</span>
                    </div>
                  </>
                )}

                {!!selectedPosition.viewerReceiptBreakdown && (
                  <>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.youReceivedGenerated', 'You Received (Generated)')}</span>
                      <span>{formatUsdtDisplay(getViewerGeneratedGross(selectedPosition.viewerReceiptBreakdown))} USDT</span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.youReceivedLiquid', 'You Received (Liquid)')}</span>
                      <span>{formatUsdtDisplay(getViewerWalletCredited(selectedPosition.viewerReceiptBreakdown))} USDT</span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.youReceivedEscrow', 'You Received (Escrow)')}</span>
                      <span>{formatUsdtDisplay(getViewerEscrowLocked(selectedPosition.viewerReceiptBreakdown))} USDT</span>
                    </div>
                  </>
                )}

                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.executedGenerated', 'Executed Generated')}</span>
                  <span>{formatUsdtDisplay(getViewerGeneratedGross(selectedPosition.viewerReceiptBreakdown))} USDT</span>
                </div>

                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.liquidPaid', 'Wallet Credited')}</span>
                  <span>{formatUsdtDisplay(getViewerWalletCredited(selectedPosition.viewerReceiptBreakdown))} USDT</span>
                </div>

                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.escrowLocked', 'Escrow Locked')}</span>
                  <span>{formatUsdtDisplay(getExecutedEscrowLocked(selectedPosition))} USDT</span>
                </div>

                <div className="modal-detail">
                  <span className="modal-label">{orbitsT('modal.escrowSource', 'Escrow Source')}</span>
                  <span>
                    {getViewerEscrowLocked(selectedPosition.viewerReceiptBreakdown) > 0
                      ? orbitsT('modal.escrowSources.executedReceipt', 'Executed receipt')
                      : getTotalsEscrowLocked(selectedPosition.receiptTotals) > 0
                        ? orbitsT('modal.escrowSources.indexedReceiptTotal', 'Indexed receipt total')
                        : selectedPosition.positionInfo?.hasStoredRuleData
                          ? orbitsT('modal.escrowSources.storedRuleSnapshot', 'Stored rule snapshot')
                          : orbitsT('modal.escrowSources.none', 'No escrow recorded')}
                  </span>
                </div>

                {selectedPosition.positionInfo && (
                  <>
                    <hr />
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.ruleLinePayment', 'Rule Line Payment #')}</span>
                      <span>{selectedPosition.positionInfo.linePaymentNumber || 0}</span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.toOwner', 'To Owner')}</span>
                      <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToOwner || 0)} USDT</span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.toSpillover1', 'To Spillover 1')}</span>
                      <span>
                        {getMemberLabel(selectedPosition.positionInfo.spillover1Recipient)} - {formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover1 || 0)} USDT
                      </span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.toSpillover2', 'To Spillover 2')}</span>
                      <span>
                        {getMemberLabel(selectedPosition.positionInfo.spillover2Recipient)} - {formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover2 || 0)} USDT
                      </span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.toEscrow', 'To Escrow')}</span>
                      <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToEscrow || 0)} USDT</span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.toRecycle', 'To Recycle')}</span>
                      <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToRecycle || 0)} USDT</span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.autoUpgradeSource', 'Auto Upgrade Source')}</span>
                      <span>{selectedPosition.positionInfo.autoUpgradeEnabled ? orbitsT('states.yes', 'Yes') : orbitsT('states.no', 'No')}</span>
                    </div>
                    <div className="modal-detail">
                      <span className="modal-label">{orbitsT('modal.storedRuleData', 'Stored Rule Data')}</span>
                      <span>{selectedPosition.positionInfo.hasStoredRuleData ? orbitsT('states.yes', 'Yes') : orbitsT('states.no', 'No')}</span>
                    </div>
                  </>
                )}

                {!!selectedPosition.indexedReceipts?.length && (
                  <>
                    <hr />
                    <div className="modal-subtitle">{orbitsT('modal.indexedReceipts', 'Indexed Receipts')}</div>
                    <div className="modal-record-list">
                      {selectedPosition.indexedReceipts.slice(0, 6).map((receipt) => (
                        <div key={`${receipt.txHash}-${receipt.logIndex}`} className="modal-record-item">
                          <div><strong>{receipt.rawEventName || orbitsT('cockpit.receipts.receipt', 'Receipt')}</strong> • {shortTx(receipt.txHash)}</div>
                          <div>{orbitsT('modal.receiver', 'Receiver')}: {shortAddress(receipt.receiver)}</div>
                          {Number(receipt.receiptType || 0) === 3 && (
                            <div>{orbitsT('modal.spilloverReceiver', 'Spillover Receiver')}: {getMemberLabel(receipt.receiver)}</div>
                          )}
                          <div>{orbitsT('modal.gross', 'Generated')}: {formatUsdtDisplay(getReceiptGeneratedGross(receipt))} USDT</div>
                          <div>{orbitsT('modal.liquid', 'Liquid')}: {formatUsdtDisplay(getReceiptWalletCredited(receipt))} USDT</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!!selectedPosition.indexedEvents?.length && (
                  <>
                    <hr />
                    <div className="modal-subtitle">{orbitsT('modal.indexedEvents', 'Indexed Events')}</div>
                    <div className="modal-record-list">
                      {selectedPosition.indexedEvents.slice(0, 6).map((event) => (
                        <div key={`${event.txHash}-${event.logIndex}`} className="modal-record-item">
                          <div><strong>{event.eventName}</strong> • {shortTx(event.txHash)}</div>
                          {event.user && <div>{orbitsT('modal.user', 'User')}: {shortAddress(event.user)}</div>}
                          {Number(event.position || 0) > 0 && <div>{orbitsT('modal.position', 'Position')}: {event.position}</div>}
                          {Number(event.line || 0) > 0 && <div>{orbitsT('modal.line', 'Line')}: {event.line}</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default OrbitsPage
