import './OrbitsPage.css'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { ethers } from 'ethers'
import {
  fetchOrbitLevelsApi,
  fetchOrbitLevelSnapshotApi,
  fetchOrbitPositionDetailsApi,
  fetchOrbitCycleSnapshotApi,
  fetchAddressReceiptsApi,
  fetchActivationReceiptsApi
} from '../../Services/orbitsApi'

const OrbitsPage = () => {
  const { isConnected, account, connect } = useWallet()
  const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()

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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
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
  const [activeTab, setActiveTab] = useState('level1')
  const [isLoadingOrbits, setIsLoadingOrbits] = useState(true)
  const [loadingLevelsMap, setLoadingLevelsMap] = useState({})

  const galaxyRef = useRef(null)
  const modalRef = useRef(null)
  const referrerCacheRef = useRef(new Map())
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

  const getNetAmount = useCallback((grossAmount) => {
    const systemCharge = grossAmount * 0.10
    return Math.max(0, grossAmount - systemCharge)
  }, [])

  const shortAddress = useCallback((addr) => {
    if (!addr || addr === ethers.ZeroAddress) return '—'
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`
  }, [])

  const shortTx = useCallback((txHash) => {
    if (!txHash) return '—'
    return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
  }, [])

  const formatTruthLabel = useCallback((truthLabel) => {
    if (!truthLabel) return 'Unknown'
    return String(truthLabel)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }, [])

  const getCachedReferrer = useCallback(async (address) => {
    const key = address.toLowerCase()
    if (referrerCacheRef.current.has(key)) return referrerCacheRef.current.get(key)
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
          2: { 4: -138, 7: -102, 10: -66, 5: -18, 8: 18, 11: 54, 6: 102, 9: 138, 12: 174 }
        }
      },
      P39: {
        lines: [1, 2, 3],
        counts: { 1: 3, 2: 9, 3: 27 },
        positions: { 1: [1, 2, 3], 2: [4, 5, 6, 7, 8, 9, 10, 11, 12], 3: Array.from({ length: 27 }, (_, i) => i + 13) },
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
      return Number(position.viewerReceiptBreakdown.totalLiquid || 0)
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
        escrowLocked: 0,
        liquidPaid: 0
      },
      viewerReceiptBreakdown: rawPosition?.viewerReceiptBreakdown || {
        count: 0,
        totalGross: 0,
        totalLiquid: 0,
        totalEscrow: 0
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
      return
    }
    try {
      const result = await fetchOrbitLevelsApi(viewAddress)
      const levels = Object.fromEntries((result?.levels || []).map((item) => [item.level, !!item.isActive]))
      viewedLevelsCacheRef.current.set(key, levels)
      setViewedLevels(levels)
    } catch (err) {
      console.error('Error fetching viewed levels:', err)
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

    try {
      const result = await fetchAddressReceiptsApi(viewAddress)
      const receipts = Array.isArray(result?.receipts) ? result.receipts : []
      receiptCacheRef.current.set(cacheKey, receipts)
      setViewAddressReceipts(receipts)
      setReceiptsSupported(true)
    } catch (err) {
      console.error('Error fetching receipts:', err)
      setReceiptsSupported(false)
    }
  }, [viewAddress])

  const fetchStoredCycleForLevel = useCallback(async (level, cycleNumber) => {
    if (!viewAddress || !ethers.isAddress(viewAddress) || !orbitData[level]) return []
    const cacheKey = `${viewAddress.toLowerCase()}-${level}-${cycleNumber}`
    if (cycleHistoryCacheRef.current.has(cacheKey)) return cycleHistoryCacheRef.current.get(cacheKey)

    try {
      const snapshot = await fetchOrbitCycleSnapshotApi(viewAddress, level, cycleNumber)
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

  const loadCycleHistoryForLevel = useCallback(async (level, cycleNumber) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress) || !orbitData[level]) return
    const cycleKey = String(cycleNumber)
    if (cycleHistoryData[level]?.[cycleKey]) return

    setLoadingCycleByLevel(prev => ({ ...prev, [level]: true }))
    try {
      const positions = await fetchStoredCycleForLevel(level, cycleNumber)
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
  }, [contracts, viewAddress, orbitData, cycleHistoryData, fetchStoredCycleForLevel])

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
    if (!silent) {
      setOrbitError('')
      setIsLoadingOrbits(true)
    }

    try {
      const snapshot = await fetchOrbitLevelSnapshotApi(viewAddress, level)
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
        positions,
        myPositions,
        downlinePositions,
        otherOccupants,
        spilloverFromPositions: structuralLinks,
        linePaymentCounts: lineCounts
      }

      setOrbitData(prev => ({ ...prev, [level]: levelData }))
      setUserLocks(prev => ({ ...prev, [level]: snapshot.lockedForNextLevel || '0' }))
      setDownlineData(prev => ({ ...prev, [level]: downlinePositions }))
      setSpilloverData(prev => ({ ...prev, [level]: otherOccupants }))
      setLinePaymentCountsByLevel(prev => ({ ...prev, [level]: lineCounts }))
      loadedLevelsRef.current.add(fetchKey)
    } catch (err) {
      console.error(`Orbit sync error for level ${level}:`, err)
      setOrbitError(err.message || 'Failed to load orbit data')
    } finally {
      loadingLevelsRef.current.delete(fetchKey)
      setLoadingLevelsMap(prev => ({ ...prev, [level]: false }))
      if (!silent) setIsLoadingOrbits(false)
    }
  }, [viewAddress, mergePositionTruth])

  const fetchAllOrbitData = useCallback(async (forceRefresh = false) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    const match = activeTab?.match(/^level(\d+)$/)
    const currentLevel = match ? Number(match[1]) : 1

    if (forceRefresh) {
      const lowerView = viewAddress.toLowerCase()
      Array.from(loadedLevelsRef.current).forEach(key => {
        if (key.startsWith(`${lowerView}-`)) loadedLevelsRef.current.delete(key)
      })
    }

    await fetchOrbitLevelData(currentLevel, { forceRefresh, silent: false })
  }, [contracts, viewAddress, activeTab, fetchOrbitLevelData])

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
    if (!inputAddress || !ethers.isAddress(inputAddress)) {
      setOrbitError('Enter a valid wallet address')
      return
    }
    setOrbitError('')
    const normalized = ethers.getAddress(inputAddress)
    viewedLevelsCacheRef.current.delete(normalized.toLowerCase())
    receiptCacheRef.current.delete(`${normalized.toLowerCase()}-backend-receipts`)
    activationReceiptCacheRef.current.clear()
    setInputAddress(normalized)
    setViewAddress(normalized)
    setViewMode('global')
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
      activationReceiptCacheRef.current.clear()
      positionDetailsCacheRef.current.clear()
      positionHydrationPromisesRef.current.clear()
      receiptCacheRef.current.delete(`${lower}-backend-receipts`)
      viewedLevelsCacheRef.current.delete(lower)
      loadedLevelsRef.current.delete(`${lower}-${Number(activeTab.replace('level', '')) || 1}`)
      await fetchViewedLevels(true)
      await fetchViewedAddressReceipts(true)
      await fetchAllOrbitData(true)
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
        return { ...hydrated, detailsLoading: false }
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

  const getHistoricalCycleSelection = useCallback((level) => selectedCycleByLevel[level] || 'current', [selectedCycleByLevel])
  const setHistoricalCycleSelection = (level, cycleKey) => setSelectedCycleByLevel(prev => ({ ...prev, [level]: cycleKey }))

  const getHighestViewedActiveLevel = useCallback(() => {
    const active = Object.keys(viewedLevels)
      .filter(level => viewedLevels[level])
      .map(Number)
      .sort((a, b) => b - a)
    return active[0] || 0
  }, [viewedLevels])

  useEffect(() => {
    if (isConnected) loadContracts().catch(console.error)
  }, [isConnected, loadContracts])

  useEffect(() => {
    if (account && !viewAddress) {
      setViewAddress(account)
      setInputAddress(account)
    }
  }, [account, viewAddress])

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
    setIsLoadingOrbits(true)
    setIsGalaxyMeasured(false)
    setContainerSize({ width: 0, height: 0 })
  }, [normalizedViewAddress])

  useEffect(() => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    if (bootInFlightRef.current) return
    if (bootstrapAddressRef.current === normalizedViewAddress) return

    let cancelled = false
    const activeLevel = Number(activeTab.replace('level', '')) || 1

    const boot = async () => {
      bootInFlightRef.current = true
      setOrbitError('')
      setIsLoadingOrbits(true)

      try {
        await fetchViewedLevels(true)
        if (cancelled) return

        await fetchViewedAddressReceipts(true)
        if (cancelled) return

        await fetchOrbitLevelData(activeLevel, { forceRefresh: true, silent: false })
        if (cancelled) return

        bootstrapAddressRef.current = normalizedViewAddress
      } catch (err) {
        if (!cancelled) {
          console.error('Initial orbit bootstrap failed:', err)
          setOrbitError(err?.message || 'Failed to load orbit data')
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
    contracts,
    viewAddress,
    normalizedViewAddress,
    activeTab,
    fetchViewedLevels,
    fetchViewedAddressReceipts,
    fetchOrbitLevelData
  ])

  useEffect(() => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    if (!bootstrapAddressRef.current || bootstrapAddressRef.current !== normalizedViewAddress) return

    const match = activeTab?.match(/^level(\d+)$/)
    if (!match) return
    const level = Number(match[1])
    const levelKey = `${normalizedViewAddress}-${level}`

    if (loadedLevelsRef.current.has(levelKey) || loadingLevelsRef.current.has(levelKey)) return
    fetchOrbitLevelData(level, { silent: false })
  }, [activeTab, contracts, viewAddress, normalizedViewAddress, fetchOrbitLevelData])

  const activeLevelNumber = Number(activeTab.replace('level', ''))
  const activeLevelData = orbitData[activeLevelNumber]
  const activeLevelReady = !!activeLevelData?.positions

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
        if (prev.width === width && prev.height === height) return prev
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
    if (!showPositionModal) return

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modalRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowPositionModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showPositionModal])

  const renderPositionTooltip = (position) => {
    const viewerBreakdown = position.viewerReceiptBreakdown || {
      totalGross: 0,
      totalLiquid: 0,
      totalEscrow: 0
    }

    const receiptTotals = position.receiptTotals || {
      count: 0,
      gross: 0,
      liquidPaid: 0,
      escrowLocked: 0
    }

    if (!position.occupant) {
      return (
        <div className="custom-tooltip">
          <div className="custom-tooltip__title">Position #{position.number}</div>
          <div className="custom-tooltip__row">
            <span>Status</span>
            <strong>Empty</strong>
          </div>
          <div className="custom-tooltip__row">
            <span>Line</span>
            <strong>Line {position.line || 1}</strong>
          </div>
          {position.parentPosition && (
            <div className="custom-tooltip__row">
              <span>Parent</span>
              <strong>Position {position.parentPosition}</strong>
            </div>
          )}
          {position.activationCycleNumber > 0 && (
            <div className="custom-tooltip__row">
              <span>Cycle</span>
              <strong>{position.isHistoricalPosition ? `Historical ${position.activationCycleNumber}` : `Current ${position.activationCycleNumber}`}</strong>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="custom-tooltip">
        <div className="custom-tooltip__title">Position #{position.number}</div>
        <div className="custom-tooltip__row">
          <span>Occupant</span>
          <strong>{shortAddress(position.occupant)}</strong>
        </div>
        <div className="custom-tooltip__row">
          <span>Line</span>
          <strong>Line {position.line || 1}</strong>
        </div>
        <div className="custom-tooltip__row">
          <span>Truth</span>
          <strong>{formatTruthLabel(position.truthLabel)}</strong>
        </div>
        <div className="custom-tooltip__row">
          <span>Net Amount</span>
          <strong>{formatUsdtDisplay(getNetAmount(Number(position.amount || 0)))} USDT</strong>
        </div>
        {position.parentPosition && (
          <div className="custom-tooltip__row">
            <span>Parent</span>
            <strong>Position {position.parentPosition}</strong>
          </div>
        )}
        <div className="custom-tooltip__row">
          <span>You Received</span>
          <strong>{formatUsdtDisplay(viewerBreakdown.totalLiquid || 0)} USDT</strong>
        </div>
        <div className="custom-tooltip__row">
          <span>Gross Routed</span>
          <strong>{formatUsdtDisplay(receiptTotals.gross || 0)} USDT</strong>
        </div>
        {position.activationId > 0 && (
          <div className="custom-tooltip__row">
            <span>Activation</span>
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
          <div className="orbits-hero__content">
            <h1 className="orbits-hero__title">Orbits System</h1>
            <p className="orbits-hero__description">
              Connect your wallet to monitor your orbit positions and track placements.
            </p>
            <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
          </div>
        </div>
      </section>
    )
  }

  if (contractsLoading) {
    return (
      <section className="orbits-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading orbit data...</p>
        </div>
      </section>
    )
  }

  const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
  const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
  const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()
  const highestViewedActiveLevel = getHighestViewedActiveLevel()

  return (
    <section className="orbits-page">
      <div className="address-input-bar glass-panel">
        <input
          type="text"
          className="address-input"
          placeholder="Enter wallet address (0x...)"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
        />
        <button className="address-btn" onClick={applyViewerAddress}>Load Address</button>
        <button className="address-btn secondary" onClick={viewMyOrbit}>My Orbits</button>
        <button className="refresh-btn" onClick={refreshData} disabled={isRefreshing}>⟳</button>
        <span className="last-sync">Last sync: {lastUpdated}</span>
      </div>

      <div className="view-toggle-bar glass-panel">
        <button
          className={`toggle-btn ${viewMode === 'global' ? 'active' : ''}`}
          onClick={() => setViewMode('global')}
        >
          Orbit View
        </button>
        <button
          className={`toggle-btn ${viewMode === 'downline' ? 'active' : ''}`}
          onClick={() => setViewMode('downline')}
        >
          Downline View {totalDownline > 0 && <span className="badge">{totalDownline}</span>}
        </button>
        <div className="receipt-status">Receipts: {receiptsSupported ? '✓ ON' : 'OFF'}</div>
      </div>

      <div className="level-tabs glass-panel">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
          const orbitType = levelToOrbitType[level]
          const isActive = !!viewedLevels[level]
          const isLoading = loadingLevelsMap[level]
          return (
            <button
              key={level}
              className={`level-tab ${activeTab === `level${level}` ? 'active' : ''} ${!isActive ? 'inactive' : ''}`}
              onClick={() => setActiveTab(`level${level}`)}
            >
              L{level} ({orbitType})
              {!isActive && <span className="inactive-badge">off</span>}
              {isLoading && <span className="loading-dot" />}
            </button>
          )
        })}
      </div>

      <div className="orbit-tips glass-panel">
        <p>
          ⚡ You may experience a slight delay when opening <strong>P12</strong> and <strong>P39</strong> orbits.
        </p>
        <p>
          🚀 [Blinking Yellow Dots] Other orbit visuals load silently when you click the next level while viewing your current level.
        </p>
      </div>

      <div className="orbits-main-grid">
        <div className="orbits-main-grid__left">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
            if (activeTab !== `level${level}`) return null
            const data = orbitData[level]

            if (!data) {
              return (
                <div key={level} className="loading-level glass-panel orbit-loading-panel">
                  <div className="spinner"></div>
                  <p>Loading Level {level} orbit...</p>
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
            const isLevelActive = !!viewedLevels[level]
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
                <div className="orbit-header-card glass-panel">
                  <div className="orbit-header-info">
                    <span>Level {level} ({orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}</span>
                    {totalCycles > 0 && <span className="cycle-badge">Cycle {Number(totalCycles) + 1}</span>}
                    {isHistoricalView && <span className="history-badge">Stored Snapshot • Cycle {selectedCycle}</span>}
                  </div>
                  <div className="orbit-header-stats">
                    {!isLevelActive && <span className="badge-secondary">Inactive</span>}
                    {displayedDownlineCount > 0 && <span className="badge-warning">⬇ {displayedDownlineCount}</span>}
                    {displayedOtherCount > 0 && <span className="badge-info">🔄 {displayedOtherCount}</span>}
                    <span className="badge-primary">{filledCountForDisplay}/{config.positions} filled</span>
                  </div>
                </div>

                <div className={`orbit-summary-strip glass-panel ${isHistoricalView ? 'is-historical' : 'is-live'}`}>
                  <div className="orbit-summary-item">
                    <span className="orbit-summary-label">Level</span>
                    <strong className="orbit-summary-value">L{level}</strong>
                  </div>
                  <div className="orbit-summary-item">
                    <span className="orbit-summary-label">Orbit</span>
                    <strong className="orbit-summary-value">{orbitType}</strong>
                  </div>
                  <div className="orbit-summary-item">
                    <span className="orbit-summary-label">Filled</span>
                    <strong className="orbit-summary-value">{filledCountForDisplay}/{config.positions}</strong>
                  </div>
                  <div className="orbit-summary-item">
                    <span className="orbit-summary-label">{isHistoricalView ? 'Snapshot Cycle' : 'Current Cycle'}</span>
                    <strong className="orbit-summary-value">
                      {isHistoricalView ? `Cycle ${selectedCycle}` : `Cycle ${Number(totalCycles) + 1}`}
                    </strong>
                  </div>
                  <div className="orbit-summary-item">
                    <span className="orbit-summary-label">Downline</span>
                    <strong className="orbit-summary-value">{displayedDownlineCount}</strong>
                  </div>
                  <div className="orbit-summary-item">
                    <span className="orbit-summary-label">Other Occupants</span>
                    <strong className="orbit-summary-value">{displayedOtherCount}</strong>
                  </div>
                  <div className="orbit-summary-item">
                    <span className="orbit-summary-label">Total Earned</span>
                    <strong className="orbit-summary-value">{formatUsdtDisplay(data?.totalEarned || 0)} USDT</strong>
                  </div>
                  <div className="orbit-summary-item">
                    <span className="orbit-summary-label">{level < 10 ? `Locked for L${level + 1}` : 'Top Level'}</span>
                    <strong className="orbit-summary-value">
                      {level < 10 ? `${formatUsdtDisplay(userLocks[level] || 0)} USDT` : 'Complete'}
                    </strong>
                  </div>
                </div>

                {showCycleButtons && (
                  <div className="cycle-switcher glass-panel">
                    <span className="cycle-label">Cycle View:</span>
                    <button
                      className={`cycle-btn ${selectedCycle === 'current' ? 'active' : ''}`}
                      onClick={() => setHistoricalCycleSelection(level, 'current')}
                    >
                      Current
                    </button>
                    {availableCycleNumbers.map(cycleNum => (
                      <button
                        key={cycleNum}
                        className={`cycle-btn ${selectedCycle === cycleNum ? 'active' : ''}`}
                        onClick={() => {
                          setHistoricalCycleSelection(level, cycleNum)
                          loadCycleHistoryForLevel(level, cycleNum)
                        }}
                      >
                        Cycle {cycleNum}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  key={`galaxy-${activeTab}`}
                  className={`galaxy-container ${orbitType.toLowerCase()} ${!isGalaxyMeasured ? 'is-measuring' : ''}`}
                  ref={galaxyRef}
                >
                  {!isGalaxyMeasured ? (
                    <div className="galaxy-measure-loader">
                      <div className="spinner"></div>
                      <p>Preparing orbit view...</p>
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
                            viewerReceiptBreakdown: { totalLiquid: 0 },
                            receiptTotals: { gross: 0, liquidPaid: 0, escrowLocked: 0, count: 0 },
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
                                transform: 'translate(-50%, -50%)'
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
                                <span className="core-label">{isLevelActive ? 'ORBIT' : 'INACTIVE'}</span>
                                <span className="core-value">{isLevelActive ? (isViewingSelf ? 'YOU' : shortAddress(viewAddress)) : 'LOCKED'}</span>
                              </div>

                              {structure.lines.map(lineNum => {
                                const linePositions = positionsByLine[lineNum] || []
                                const filledCount = linePositions.filter(p => p.occupant).length
                                const diameter = ringRadiiPx[lineNum] * 2
                                const arrivals = lineNum === 1 ? lineCounts.line1 : lineNum === 2 ? lineCounts.line2 : lineCounts.line3
                                return (
                                  <div key={lineNum} className={`orbit-ring line${lineNum}`} style={{ width: diameter, height: diameter }}>
                                    <span className="ring-label">LINE {lineNum}</span>
                                    <span className="ring-stats">{filledCount}/{structure.positions[lineNum].length} • arrivals: {arrivals}</span>
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
                                let planetClass = 'planet-node '
                                if (pos.occupantType === 'mine') planetClass += 'mine'
                                else if (pos.occupantType === 'downline') planetClass += 'downline'
                                else if (pos.occupantType === 'other') planetClass += 'other'
                                else planetClass += 'empty'
                                if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) {
                                  planetClass += ' structural-preview'
                                }

                                const badgeValue = getPlanetBadgeValue(pos)

                                return (
                                  <div
                                    key={pos.number}
                                    className={planetClass}
                                    style={{
                                      left: coords.x,
                                      top: coords.y,
                                      width: planetSize,
                                      height: planetSize,
                                      transform: 'translate(-50%, -50%)',
                                      '--index': index
                                    }}
                                    onClick={() => handlePositionClick(pos)}
                                    onMouseEnter={() => {
                                      setHoveredPosition(pos)
                                      if (pos.parentPosition) handleStructuralPreview(pos)
                                    }}
                                    onMouseLeave={() => setHoveredPosition(null)}
                                  >
                                    <div className="planet-content">
                                      <span className="node-number">{pos.number}</span>
                                      {pos.occupant && pos.occupantType === 'mine' && <span className="planet-icon">👤</span>}
                                      {pos.occupant && pos.occupantType === 'downline' && <span className="planet-icon">⬇</span>}
                                      {pos.occupant && pos.occupantType === 'other' && <span className="planet-icon">👥</span>}
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

                <div className="orbit-legend glass-panel">
                  <div className="legend-item"><div className="legend-dot mine"></div><span>Your Position</span></div>
                  <div className="legend-item"><div className="legend-dot downline"></div><span>Downline</span></div>
                  <div className="legend-item"><div className="legend-dot other"></div><span>Other User</span></div>
                  <div className="legend-item"><div className="legend-dot empty"></div><span>Empty</span></div>
                  <div className="legend-item"><div className="legend-dot gold"></div><span>Spillover Link</span></div>
                </div>

                {hoveredPosition && (
                  <div className="orbit-hover-card glass-panel">
                    {renderPositionTooltip(hoveredPosition)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="orbits-main-grid__right">
          {(() => {
            const level = Number(activeTab.replace('level', ''))
            const data = orbitData[level]
            const isLevelActive = !!viewedLevels[level]
            const levelInfo = levelConfig[level]
            const shouldShowAutoUpgradePanel = isLevelActive && level < 10 && level === highestViewedActiveLevel
            const downlineAtLevel = downlineData[level] || []
            const spilloverAtLevel = spilloverData[level] || []
            const userLock = userLocks[level] || '0'
            const upgradeReq = levelInfo?.upgradeReq || 0
            const autoUpgradeCompleted = data?.autoUpgradeCompleted

            return (
              <>
                <div className="info-card glass-panel">
                  <h3>Escrow & Auto-Upgrade</h3>
                  {shouldShowAutoUpgradePanel ? (
                    <>
                      <div className="escrow-label">Locked for Level {levelInfo.nextLevel}</div>
                      <div className="escrow-value">
                        {formatUsdtDisplay(userLock)} / {upgradeReq} USDT
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${upgradeReq > 0 ? (parseFloat(userLock) / upgradeReq) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="escrow-status">
                        {parseFloat(userLock) >= upgradeReq
                          ? (autoUpgradeCompleted ? '✓ Auto-upgrade completed' : '✓ Ready for auto-upgrade')
                          : `Need ${(upgradeReq - parseFloat(userLock)).toFixed(2)} more USDT`}
                      </div>
                    </>
                  ) : (
                    <div className="escrow-placeholder">Auto-upgrade activates on highest active level</div>
                  )}
                  <hr />
                  <div className="total-earned">
                    Total Earned: <strong>{data?.totalEarned || '0'} USDT</strong>
                  </div>
                </div>

                {viewMode === 'downline' && !(selectedCycleByLevel[level] !== 'current') && (
                  <div className="info-card glass-panel">
                    <h3>Direct Downline</h3>
                    {downlineAtLevel.length > 0 ? (
                      <div className="user-list">
                        {downlineAtLevel.map((d, idx) => (
                          <div key={idx} className="user-item">
                            <span className="user-address">{shortAddress(d.occupant || d.user)}</span>
                            <span className="user-position">Pos {d.number || d.position}</span>
                            <span className="user-amount">{formatUsdtDisplay(d.amount)} USDT</span>
                          </div>
                        ))}
                      </div>
                    ) : <div className="empty-message">No downline yet</div>}
                  </div>
                )}

                {viewMode === 'downline' && !(selectedCycleByLevel[level] !== 'current') && (
                  <div className="info-card glass-panel">
                    <h3>Spillover / Other Occupants</h3>
                    {spilloverAtLevel.length > 0 ? (
                      <div className="user-list">
                        {spilloverAtLevel.map((d, idx) => (
                          <div key={idx} className="user-item">
                            <span className="user-address">{shortAddress(d.occupant || d.user)}</span>
                            <span className="user-position">Pos {d.number || d.position}</span>
                            <span className="user-amount">{formatUsdtDisplay(d.amount)} USDT</span>
                          </div>
                        ))}
                      </div>
                    ) : <div className="empty-message">No other occupants</div>}
                  </div>
                )}

                {selectedCycleByLevel[level] !== 'current' && (
                  <div className="info-card glass-panel historical-insight-card">
                    <h3>Historical Snapshot</h3>
                    <div className="history-note">
                      You are viewing stored orbit data for Cycle {selectedCycleByLevel[level]}.
                      Position layout and occupants reflect that cycle snapshot, while total earned remains the current cumulative value.
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>

      {showPositionModal && selectedPosition && (
        <div className="modal-overlay" onClick={() => setShowPositionModal(false)}>
          <div
            className="position-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            ref={modalRef}
          >
            <button className="modal-close" onClick={() => setShowPositionModal(false)}>×</button>
            <h3>Position #{selectedPosition.number}</h3>

            <div className="modal-detail">
              <span className="modal-label">Truth Type</span>
              <span>{formatTruthLabel(selectedPosition.truthLabel || selectedPosition.positionInfo?.type || 'Unknown')}</span>
            </div>

            <div className="modal-detail">
              <span className="modal-label">Line</span>
              <span>Line {selectedPosition.line || selectedPosition.positionInfo?.line || 1}</span>
            </div>

            {selectedPosition.parentPosition && (
              <div className="modal-detail">
                <span className="modal-label">Parent</span>
                <span>Position {selectedPosition.parentPosition}</span>
              </div>
            )}

            <div className="modal-detail">
              <span className="modal-label">Cycle View</span>
              <span>
                {selectedPosition.isHistoricalPosition
                  ? `Historical Cycle ${selectedPosition.cycleNumber || selectedPosition.activationCycleNumber || '—'}`
                  : `Current Cycle ${selectedPosition.activationCycleNumber || '—'}`}
              </span>
            </div>

            {selectedPosition.activationId > 0 && (
              <div className="modal-detail">
                <span className="modal-label">Activation ID</span>
                <span>{selectedPosition.activationId}</span>
              </div>
            )}

            <div className="modal-detail">
              <span className="modal-label">Mirror Activation</span>
              <span>{selectedPosition.isMirrorActivation ? 'Yes' : 'No'}</span>
            </div>

            {selectedPosition.occupant ? (
              <>
                <div className="modal-detail">
                  <span className="modal-label">Occupant</span>
                  <span>{shortAddress(selectedPosition.occupant)}</span>
                </div>

                {(selectedPosition.referrer || selectedPosition.originalReferrer || selectedPosition.occupantReferrer) &&
                  (selectedPosition.referrer || selectedPosition.originalReferrer || selectedPosition.occupantReferrer) !== ethers.ZeroAddress && (
                    <div className="modal-detail">
                      <span className="modal-label">Referrer</span>
                      <span>{shortAddress(selectedPosition.referrer || selectedPosition.originalReferrer || selectedPosition.occupantReferrer)}</span>
                    </div>
                  )}

                <div className="modal-detail">
                  <span className="modal-label">Gross Amount</span>
                  <span>{formatUsdtDisplay(selectedPosition.amount || 0)} USDT</span>
                </div>

                <div className="modal-detail">
                  <span className="modal-label">Net Amount</span>
                  <span>{formatUsdtDisplay(getNetAmount(Number(selectedPosition.amount || 0)))} USDT</span>
                </div>

                {selectedPosition.timestamp > 0 && (
                  <div className="modal-detail">
                    <span className="modal-label">Filled</span>
                    <span>{new Date(selectedPosition.timestamp * 1000).toLocaleString()}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="modal-detail">
                <span className="modal-label">Status</span>
                <span>Empty - Available</span>
              </div>
            )}

            <hr />

            <div className="modal-detail">
              <span className="modal-label">Indexed Events</span>
              <span>{Number(selectedPosition.indexedEventCount || 0)}</span>
            </div>

            <div className="modal-detail">
              <span className="modal-label">Indexed Receipts</span>
              <span>{Number(selectedPosition.indexedReceiptCount || 0)}</span>
            </div>

            {!!selectedPosition.receiptTotals && (
              <>
                <div className="modal-detail">
                  <span className="modal-label">Receipt Gross</span>
                  <span>{formatUsdtDisplay(selectedPosition.receiptTotals.gross || 0)} USDT</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">Liquid Paid</span>
                  <span>{formatUsdtDisplay(selectedPosition.receiptTotals.liquidPaid || 0)} USDT</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">Escrow Locked</span>
                  <span>{formatUsdtDisplay(selectedPosition.receiptTotals.escrowLocked || 0)} USDT</span>
                </div>
              </>
            )}

            {!!selectedPosition.viewerReceiptBreakdown && (
              <>
                <div className="modal-detail">
                  <span className="modal-label">You Received (Gross)</span>
                  <span>{formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.totalGross || 0)} USDT</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">You Received (Liquid)</span>
                  <span>{formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.totalLiquid || 0)} USDT</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">You Received (Escrow)</span>
                  <span>{formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.totalEscrow || 0)} USDT</span>
                </div>
              </>
            )}

            {selectedPosition.positionInfo && (
              <>
                <hr />
                <div className="modal-detail">
                  <span className="modal-label">Rule Line Payment #</span>
                  <span>{selectedPosition.positionInfo.linePaymentNumber || 0}</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">To Owner</span>
                  <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToOwner || 0)} USDT</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">To Spillover 1</span>
                  <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover1 || 0)} USDT</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">To Spillover 2</span>
                  <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover2 || 0)} USDT</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">To Escrow</span>
                  <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToEscrow || 0)} USDT</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">To Recycle</span>
                  <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToRecycle || 0)} USDT</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">Auto Upgrade Source</span>
                  <span>{selectedPosition.positionInfo.autoUpgradeEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="modal-detail">
                  <span className="modal-label">Stored Rule Data</span>
                  <span>{selectedPosition.positionInfo.hasStoredRuleData ? 'Yes' : 'No'}</span>
                </div>
              </>
            )}

            {!!selectedPosition.indexedReceipts?.length && (
              <>
                <hr />
                <div className="modal-subtitle">Indexed Receipts</div>
                <div className="modal-record-list">
                  {selectedPosition.indexedReceipts.slice(0, 6).map((receipt) => (
                    <div key={`${receipt.txHash}-${receipt.logIndex}`} className="modal-record-item">
                      <div><strong>{receipt.rawEventName || 'Receipt'}</strong> • {shortTx(receipt.txHash)}</div>
                      <div>Receiver: {shortAddress(receipt.receiver)}</div>
                      <div>Gross: {formatUsdtDisplay(receipt.grossAmount || 0)} USDT</div>
                      <div>Liquid: {formatUsdtDisplay(receipt.liquidPaid || 0)} USDT</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!!selectedPosition.indexedEvents?.length && (
              <>
                <hr />
                <div className="modal-subtitle">Indexed Events</div>
                <div className="modal-record-list">
                  {selectedPosition.indexedEvents.slice(0, 6).map((event) => (
                    <div key={`${event.txHash}-${event.logIndex}`} className="modal-record-item">
                      <div><strong>{event.eventName}</strong> • {shortTx(event.txHash)}</div>
                      {event.user && <div>User: {shortAddress(event.user)}</div>}
                      {Number(event.position || 0) > 0 && <div>Position: {event.position}</div>}
                      {Number(event.line || 0) > 0 && <div>Line: {event.line}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedPosition.detailsLoading && (
              <div className="loading-detail">Loading full details...</div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default OrbitsPage















// import './OrbitsPage.css'
// import { useEffect, useState, useCallback, useRef } from 'react'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { ethers } from 'ethers'
// import {
//   fetchOrbitLevelsApi,
//   fetchOrbitLevelSnapshotApi,
//   fetchOrbitPositionDetailsApi,
//   fetchOrbitCycleSnapshotApi,
//   fetchAddressReceiptsApi,
//   fetchActivationReceiptsApi
// } from '../../Services/orbitsApi'

// const OrbitsPage = () => {
//   const { isConnected, account, connect } = useWallet()
//   const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()

//   const [orbitData, setOrbitData] = useState({})
//   const [userLocks, setUserLocks] = useState({})
//   const [downlineData, setDownlineData] = useState({})
//   const [spilloverData, setSpilloverData] = useState({})
//   const [orbitError, setOrbitError] = useState('')
//   const [viewMode, setViewMode] = useState('global')
//   const [selectedPosition, setSelectedPosition] = useState(null)
//   const [showPositionModal, setShowPositionModal] = useState(false)
//   const [hoveredPosition, setHoveredPosition] = useState(null)
//   const [showStructuralPreview, setShowStructuralPreview] = useState(false)
//   const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
//   const [isGalaxyMeasured, setIsGalaxyMeasured] = useState(false)
//   const [viewAddress, setViewAddress] = useState('')
//   const [inputAddress, setInputAddress] = useState('')
//   const [viewedLevels, setViewedLevels] = useState({})
//   const [cycleHistoryData, setCycleHistoryData] = useState({})
//   const [selectedCycleByLevel, setSelectedCycleByLevel] = useState({})
//   const [loadingCycleByLevel, setLoadingCycleByLevel] = useState({})
//   const [cycleHistorySupportByLevel, setCycleHistorySupportByLevel] = useState({})
//   const [linePaymentCountsByLevel, setLinePaymentCountsByLevel] = useState({})
//   const [viewAddressReceipts, setViewAddressReceipts] = useState([])
//   const [receiptBucketsByLevel, setReceiptBucketsByLevel] = useState({})
//   const [receiptsSupported, setReceiptsSupported] = useState(false)
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [isRefreshing, setIsRefreshing] = useState(false)
//   const [activeTab, setActiveTab] = useState('level1')
//   const [isLoadingOrbits, setIsLoadingOrbits] = useState(true)
//   const [loadingLevelsMap, setLoadingLevelsMap] = useState({})

//   const galaxyRef = useRef(null)
//   const modalRef = useRef(null)
//   const referrerCacheRef = useRef(new Map())
//   const viewedLevelsCacheRef = useRef(new Map())
//   const fetchIdRef = useRef(0)
//   const cycleHistoryCacheRef = useRef(new Map())
//   const receiptCacheRef = useRef(new Map())
//   const activationReceiptCacheRef = useRef(new Map())
//   const loadedLevelsRef = useRef(new Set())
//   const loadingLevelsRef = useRef(new Set())
//   const positionDetailsCacheRef = useRef(new Map())
//   const positionHydrationPromisesRef = useRef(new Map())

//   const RECEIPT_TYPES = {
//     FOUNDER_PATH: 1,
//     DIRECT_OWNER: 2,
//     ROUTED_SPILLOVER: 3,
//     RECYCLE: 4
//   }

//   const orbitTypeConfig = {
//     P4: { name: 'P4', positions: 4, lines: 1, lineSizes: [4], levels: [1, 4, 7, 10] },
//     P12: { name: 'P12', positions: 12, lines: 2, lineSizes: [3, 9], levels: [2, 5, 8] },
//     P39: { name: 'P39', positions: 39, lines: 3, lineSizes: [3, 9, 27], levels: [3, 6, 9] }
//   }

//   const levelToOrbitType = {
//     1: 'P4', 2: 'P12', 3: 'P39', 4: 'P4', 5: 'P12',
//     6: 'P39', 7: 'P4', 8: 'P12', 9: 'P39', 10: 'P4'
//   }

//   const levelConfig = {
//     1: { price: 10, upgradeReq: 20, nextLevel: 2 },
//     2: { price: 20, upgradeReq: 40, nextLevel: 3 },
//     3: { price: 40, upgradeReq: 80, nextLevel: 4 },
//     4: { price: 80, upgradeReq: 160, nextLevel: 5 },
//     5: { price: 160, upgradeReq: 320, nextLevel: 6 },
//     6: { price: 320, upgradeReq: 640, nextLevel: 7 },
//     7: { price: 640, upgradeReq: 1280, nextLevel: 8 },
//     8: { price: 1280, upgradeReq: 2560, nextLevel: 9 },
//     9: { price: 2560, upgradeReq: 5120, nextLevel: 10 },
//     10: { price: 5120, upgradeReq: 10240, nextLevel: 11 }
//   }

//   const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

//   const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
//     try {
//       return await fn()
//     } catch (err) {
//       const isRateLimited =
//         err?.code === -32005 ||
//         err?.status === 429 ||
//         String(err?.message || '').includes('rate limited')
//       if (!isRateLimited || retries <= 0) throw err
//       await delay(wait)
//       return withRetry(fn, retries - 1, wait * 2)
//     }
//   }, [])

//   const formatUsdt = useCallback((value) => {
//     try {
//       return Number(ethers.formatUnits(value ?? 0, 6))
//     } catch {
//       return 0
//     }
//   }, [])

//   const formatUsdtDisplay = useCallback((value) => {
//     const num = typeof value === 'number' ? value : Number(value || 0)
//     if (!Number.isFinite(num)) return '0'
//     if (Math.abs(num % 1) < 0.000001) return String(num)
//     return num.toFixed(6).replace(/\.?0+$/, '')
//   }, [])

//   const getNetAmount = useCallback((grossAmount) => {
//     const systemCharge = grossAmount * 0.10
//     return Math.max(0, grossAmount - systemCharge)
//   }, [])

//   const shortAddress = useCallback((addr) => {
//     if (!addr || addr === ethers.ZeroAddress) return '—'
//     return `${addr.slice(0, 8)}...${addr.slice(-6)}`
//   }, [])

//   const shortTx = useCallback((txHash) => {
//     if (!txHash) return '—'
//     return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
//   }, [])

//   const formatTruthLabel = useCallback((truthLabel) => {
//     if (!truthLabel) return 'Unknown'
//     return String(truthLabel)
//       .replace(/_/g, ' ')
//       .toLowerCase()
//       .replace(/\b\w/g, (c) => c.toUpperCase())
//   }, [])

//   const getCachedReferrer = useCallback(async (address) => {
//     const key = address.toLowerCase()
//     if (referrerCacheRef.current.has(key)) return referrerCacheRef.current.get(key)
//     const referrer = await withRetry(() => contracts.registration.getReferrer(address))
//     referrerCacheRef.current.set(key, referrer)
//     return referrer
//   }, [contracts, withRetry])

//   const resolveOccupantReferrer = useCallback(async (occupantAddress, backendItem = {}) => {
//     if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return ethers.ZeroAddress
//     const existingReferrer =
//       backendItem?.referrer ||
//       backendItem?.originalReferrer ||
//       backendItem?.occupantReferrer ||
//       ethers.ZeroAddress
//     if (existingReferrer && existingReferrer !== ethers.ZeroAddress) return existingReferrer
//     try {
//       return await getCachedReferrer(occupantAddress)
//     } catch {
//       return ethers.ZeroAddress
//     }
//   }, [getCachedReferrer])

//   const getStructuralParentPosition = (orbitType, position) => {
//     if (orbitType === 'P4') return null
//     if (orbitType === 'P12') {
//       if ([4, 7, 10].includes(position)) return 1
//       if ([5, 8, 11].includes(position)) return 2
//       if ([6, 9, 12].includes(position)) return 3
//       return null
//     }
//     if (orbitType === 'P39') {
//       const parentMap = {
//         4: 1, 7: 1, 10: 1,
//         5: 2, 8: 2, 11: 2,
//         6: 3, 9: 3, 12: 3,
//         13: 4, 22: 4, 31: 4,
//         14: 5, 23: 5, 32: 5,
//         15: 6, 24: 6, 33: 6,
//         16: 7, 25: 7, 34: 7,
//         17: 8, 26: 8, 35: 8,
//         18: 9, 27: 9, 36: 9,
//         19: 10, 28: 10, 37: 10,
//         20: 11, 29: 11, 38: 11,
//         21: 12, 30: 12, 39: 12
//       }
//       return parentMap[position] || null
//     }
//     return null
//   }

//   const getLineForPosition = (orbitType, position) => {
//     if (orbitType === 'P4') return 1
//     if (orbitType === 'P12') return position <= 3 ? 1 : 2
//     if (orbitType === 'P39') return position <= 3 ? 1 : (position <= 12 ? 2 : 3)
//     return 1
//   }

//   const getOrbitStructure = (orbitType) => {
//     return {
//       P4: {
//         lines: [1],
//         counts: { 1: 4 },
//         positions: { 1: [1, 2, 3, 4] },
//         startAngles: { 1: -90 },
//         customAngles: { 1: { 1: -90, 2: 0, 3: 90, 4: 180 } }
//       },
//       P12: {
//         lines: [1, 2],
//         counts: { 1: 3, 2: 9 },
//         positions: { 1: [1, 2, 3], 2: [4, 5, 6, 7, 8, 9, 10, 11, 12] },
//         startAngles: { 1: -90, 2: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: { 4: -138, 7: -102, 10: -66, 5: -18, 8: 18, 11: 54, 6: 102, 9: 138, 12: 174 }
//         }
//       },
//       P39: {
//         lines: [1, 2, 3],
//         counts: { 1: 3, 2: 9, 3: 27 },
//         positions: { 1: [1, 2, 3], 2: [4, 5, 6, 7, 8, 9, 10, 11, 12], 3: Array.from({ length: 27 }, (_, i) => i + 13) },
//         startAngles: { 1: -90, 2: -90, 3: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: { 4: -138, 7: -102, 10: -66, 5: -18, 8: 18, 11: 54, 6: 102, 9: 138, 12: 174 },
//           3: {
//             13: -145, 22: -133, 31: -121,
//             14: -25, 23: -13, 32: -1,
//             15: 95, 24: 107, 33: 119,
//             16: -109, 25: -97, 34: -85,
//             17: 11, 26: 23, 35: 35,
//             18: 131, 27: 143, 36: 155,
//             19: -73, 28: -61, 37: -49,
//             20: 47, 29: 59, 38: 71,
//             21: 167, 30: 179, 39: 191
//           }
//         }
//       }
//     }[orbitType] || {
//       lines: [1],
//       counts: { 1: 4 },
//       positions: { 1: [1, 2, 3, 4] },
//       startAngles: { 1: -90 },
//       customAngles: { 1: { 1: -90, 2: 0, 3: 90, 4: 180 } }
//     }
//   }

//   const getStarConfig = (count = 36) => {
//     return Array.from({ length: count }, (_, i) => ({
//       id: i,
//       left: `${((i * 17.73) % 100).toFixed(2)}%`,
//       top: `${((i * 11.41 + 23) % 100).toFixed(2)}%`,
//       size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
//       delay: `${(i * 0.27).toFixed(2)}s`,
//       duration: `${(2.8 + (i % 5) * 0.7).toFixed(2)}s`,
//       drift: `${(7 + (i % 6) * 1.2).toFixed(2)}s`,
//       opacity: i % 4 === 0 ? 0.65 : 0.35
//     }))
//   }

//   const starConfig = getStarConfig(40)

//   const getPlanetSize = (orbitType, stageSize) => {
//     const base = orbitType === 'P39' ? 34 : 44
//     if (stageSize <= 260) return orbitType === 'P39' ? 22 : 30
//     if (stageSize <= 420) return orbitType === 'P39' ? 26 : 36
//     return base
//   }

//   const getCoreSize = (orbitType, stageSize) => {
//     if (stageSize <= 260) return orbitType === 'P39' ? 64 : 74
//     if (stageSize <= 420) return orbitType === 'P39' ? 72 : 82
//     return orbitType === 'P39' ? 80 : 96
//   }

//   const getPositionOnRing = (index, total, radiusPx, centerX, centerY, startAngle = -90) => {
//     const angle = (index / total) * 360 + startAngle
//     const radian = (angle * Math.PI) / 180
//     return { x: centerX + radiusPx * Math.cos(radian), y: centerY + radiusPx * Math.sin(radian), angle }
//   }

//   const getPositionOnAngle = (angle, radiusPx, centerX, centerY) => {
//     const radian = (angle * Math.PI) / 180
//     return { x: centerX + radiusPx * Math.cos(radian), y: centerY + radiusPx * Math.sin(radian), angle }
//   }

//   const deriveOccupantType = useCallback((occupantAddress, viewedAddr, backendItem = {}) => {
//     if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return 'empty'
//     if (!viewedAddr) return 'other'

//     const occupantLower = occupantAddress.toLowerCase()
//     const viewedLower = viewedAddr.toLowerCase()
//     if (occupantLower === viewedLower) return 'mine'

//     const truthLabel = String(backendItem?.truthLabel || '').toUpperCase()
//     const referrer =
//       backendItem?.referrer ||
//       backendItem?.originalReferrer ||
//       backendItem?.occupantReferrer ||
//       ethers.ZeroAddress
//     const referrerLower = String(referrer || ethers.ZeroAddress).toLowerCase()

//     const viewerReceiptBreakdown = backendItem?.viewerReceiptBreakdown || {}
//     const viewerGotSomething =
//       Number(viewerReceiptBreakdown.totalGross || 0) > 0 ||
//       Number(viewerReceiptBreakdown.totalLiquid || 0) > 0 ||
//       Number(viewerReceiptBreakdown.totalEscrow || 0) > 0

//     const isClearlyDownline = referrerLower === viewedLower || truthLabel === 'FOUNDER_PATH'
//     if (isClearlyDownline) return 'downline'
//     if (viewerGotSomething && truthLabel !== 'NO_RECEIPT') return 'other'
//     return 'other'
//   }, [])

//   const buildPositionInfoFromRuleView = (orbitType, position, level, ruleView, orbitOwnerAddress) => {
//     const parentPosition = getStructuralParentPosition(orbitType, position)

//     if (!ruleView) {
//       return {
//         type: 'unknown',
//         payout: 0,
//         escrow: 0,
//         spillover: 0,
//         description: '',
//         toUpline: false,
//         line: getLineForPosition(orbitType, position),
//         isAutoUpgradeSource: false,
//         isRecyclePosition: false,
//         spillsTo: parentPosition,
//         parentPosition,
//         linePaymentNumber: 0,
//         orbitOwner: orbitOwnerAddress,
//         spillover1Recipient: null,
//         spillover2Recipient: null,
//         exactToOwner: 0,
//         exactToSpillover1: 0,
//         exactToSpillover2: 0,
//         exactToEscrow: 0,
//         exactToRecycle: 0,
//         autoUpgradeEnabled: false,
//         isFounderNoReferrerPath: false,
//         hasStoredRuleData: false
//       }
//     }

//     const toOwner = Number(ruleView.toOwner || 0)
//     const toSpillover1 = Number(ruleView.toSpillover1 || 0)
//     const toSpillover2 = Number(ruleView.toSpillover2 || 0)
//     const toEscrow = Number(ruleView.toEscrow || 0)
//     const toRecycle = Number(ruleView.toRecycle || 0)

//     return {
//       type:
//         toRecycle > 0
//           ? 'recycle'
//           : toEscrow > 0 && toOwner > 0
//             ? 'payout-escrow'
//             : toEscrow > 0
//               ? 'escrow'
//               : toOwner > 0
//                 ? 'payout'
//                 : 'unknown',
//       payout: toOwner,
//       escrow: toEscrow,
//       spillover: toSpillover1 + toSpillover2,
//       description: `${toOwner} USDT to owner, ${toSpillover1} to spillover1, ${toSpillover2} to spillover2, ${toEscrow} to escrow, ${toRecycle} to recycle`,
//       toUpline: (toSpillover1 + toSpillover2) > 0,
//       line: ruleView.line || 1,
//       isAutoUpgradeSource: toEscrow > 0,
//       isRecyclePosition: toRecycle > 0,
//       spillsTo: parentPosition,
//       parentPosition,
//       linePaymentNumber: ruleView.linePaymentNumber || 0,
//       orbitOwner: orbitOwnerAddress,
//       spillover1Recipient: ruleView.spillover1Recipient,
//       spillover2Recipient: ruleView.spillover2Recipient,
//       exactToOwner: toOwner,
//       exactToSpillover1: toSpillover1,
//       exactToSpillover2: toSpillover2,
//       exactToEscrow: toEscrow,
//       exactToRecycle: toRecycle,
//       autoUpgradeEnabled: !!ruleView.autoUpgradeEnabled,
//       isFounderNoReferrerPath: !!ruleView.isFounderNoReferrerPath,
//       hasStoredRuleData: !!ruleView.hasStoredRuleData
//     }
//   }

//   const getPlanetBadgeValue = useCallback((position) => {
//     if (!position?.occupant) return 0
//     if (receiptsSupported && position.viewerReceiptBreakdown) {
//       return Number(position.viewerReceiptBreakdown.totalLiquid || 0)
//     }
//     return Number(position?.positionInfo?.exactToOwner || 0)
//   }, [receiptsSupported])

//   const mergePositionTruth = useCallback(async (level, rawPosition, orbitTypeOverride = null, cycleNumber = 0, isHistoricalPosition = false) => {
//     const orbitType = orbitTypeOverride || rawPosition?.orbitType || levelToOrbitType[level]
//     const occupant = rawPosition?.occupant || null
//     const resolvedReferrer = await resolveOccupantReferrer(occupant, rawPosition)

//     const enrichedBase = {
//       ...rawPosition,
//       level,
//       cycleNumber,
//       isHistoricalPosition,
//       orbitType,
//       referrer: rawPosition?.referrer || resolvedReferrer,
//       originalReferrer: rawPosition?.originalReferrer || resolvedReferrer,
//       occupantReferrer: rawPosition?.occupantReferrer || resolvedReferrer
//     }

//     const occupantType = deriveOccupantType(
//       occupant,
//       viewAddress,
//       enrichedBase
//     )

//     const positionInfo = buildPositionInfoFromRuleView(
//       orbitType,
//       rawPosition?.number,
//       level,
//       rawPosition?.ruleView || null,
//       viewAddress
//     )

//     return {
//       ...enrichedBase,
//       occupantType,
//       amount: rawPosition?.amount || '0',
//       timestamp: Number(rawPosition?.timestamp || 0),
//       line: rawPosition?.line || positionInfo.line,
//       spillsTo: positionInfo.spillsTo,
//       parentPosition: rawPosition?.parentPosition ?? positionInfo.parentPosition,
//       truthLabel: rawPosition?.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT'),
//       positionInfo,
//       activationId: Number(rawPosition?.activationId || 0),
//       activationCycleNumber: Number(rawPosition?.activationCycleNumber || cycleNumber || 0),
//       isMirrorActivation: !!rawPosition?.isMirrorActivation,
//       indexedEventCount: Number(rawPosition?.indexedEventCount || 0),
//       indexedReceiptCount: Number(rawPosition?.indexedReceiptCount || 0),
//       receiptTotals: rawPosition?.receiptTotals || {
//         count: 0,
//         gross: 0,
//         escrowLocked: 0,
//         liquidPaid: 0
//       },
//       viewerReceiptBreakdown: rawPosition?.viewerReceiptBreakdown || {
//         count: 0,
//         totalGross: 0,
//         totalLiquid: 0,
//         totalEscrow: 0
//       },
//       indexedReceipts: rawPosition?.indexedReceipts || [],
//       indexedEvents: rawPosition?.indexedEvents || [],
//       ruleView: rawPosition?.ruleView || null,
//       receiptsHydrated: !!(
//         rawPosition?.indexedReceipts ||
//         rawPosition?.indexedEvents ||
//         rawPosition?.activationId ||
//         rawPosition?.ruleView
//       )
//     }
//   }, [resolveOccupantReferrer, deriveOccupantType, viewAddress])

//   const fetchViewedLevels = useCallback(async (forceRefresh = false) => {
//     if (!viewAddress || !ethers.isAddress(viewAddress)) return
//     const key = viewAddress.toLowerCase()
//     if (!forceRefresh && viewedLevelsCacheRef.current.has(key)) {
//       setViewedLevels(viewedLevelsCacheRef.current.get(key))
//       return
//     }
//     try {
//       const result = await fetchOrbitLevelsApi(viewAddress)
//       const levels = Object.fromEntries((result?.levels || []).map((item) => [item.level, !!item.isActive]))
//       viewedLevelsCacheRef.current.set(key, levels)
//       setViewedLevels(levels)
//     } catch (err) {
//       console.error('Error fetching viewed levels:', err)
//     }
//   }, [viewAddress])

//   const fetchViewedAddressReceipts = useCallback(async (forceRefresh = false) => {
//     if (!viewAddress || !ethers.isAddress(viewAddress)) {
//       setViewAddressReceipts([])
//       setReceiptBucketsByLevel({})
//       setReceiptsSupported(false)
//       return
//     }

//     const cacheKey = `${viewAddress.toLowerCase()}-backend-receipts`
//     if (!forceRefresh && receiptCacheRef.current.has(cacheKey)) {
//       const cachedReceipts = receiptCacheRef.current.get(cacheKey)
//       setViewAddressReceipts(cachedReceipts)
//       setReceiptsSupported(true)
//       return
//     }

//     try {
//       const result = await fetchAddressReceiptsApi(viewAddress)
//       const receipts = Array.isArray(result?.receipts) ? result.receipts : []
//       receiptCacheRef.current.set(cacheKey, receipts)
//       setViewAddressReceipts(receipts)
//       setReceiptsSupported(true)
//     } catch (err) {
//       console.error('Error fetching receipts:', err)
//       setReceiptsSupported(false)
//     }
//   }, [viewAddress])

//   const fetchStoredCycleForLevel = useCallback(async (level, cycleNumber) => {
//     if (!viewAddress || !ethers.isAddress(viewAddress) || !orbitData[level]) return []
//     const cacheKey = `${viewAddress.toLowerCase()}-${level}-${cycleNumber}`
//     if (cycleHistoryCacheRef.current.has(cacheKey)) return cycleHistoryCacheRef.current.get(cacheKey)

//     try {
//       const snapshot = await fetchOrbitCycleSnapshotApi(viewAddress, level, cycleNumber)
//       const orbitType = snapshot?.orbitType || levelToOrbitType[level]

//       const positions = await Promise.all(
//         (snapshot?.positions || []).map(async (pos) => {
//           return await mergePositionTruth(level, pos, orbitType, Number(cycleNumber), true)
//         })
//       )

//       cycleHistoryCacheRef.current.set(cacheKey, positions)
//       return positions
//     } catch (err) {
//       console.error(`Failed to fetch cycle history for level ${level}, cycle ${cycleNumber}:`, err)
//       throw err
//     }
//   }, [viewAddress, orbitData, mergePositionTruth])

//   const loadCycleHistoryForLevel = useCallback(async (level, cycleNumber) => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress) || !orbitData[level]) return
//     const cycleKey = String(cycleNumber)
//     if (cycleHistoryData[level]?.[cycleKey]) return

//     setLoadingCycleByLevel(prev => ({ ...prev, [level]: true }))
//     try {
//       const positions = await fetchStoredCycleForLevel(level, cycleNumber)
//       setCycleHistoryData(prev => ({
//         ...prev,
//         [level]: { ...(prev[level] || {}), [cycleKey]: positions }
//       }))
//       setCycleHistorySupportByLevel(prev => ({ ...prev, [level]: true }))
//     } catch (err) {
//       setCycleHistorySupportByLevel(prev => ({ ...prev, [level]: false }))
//     } finally {
//       setLoadingCycleByLevel(prev => ({ ...prev, [level]: false }))
//     }
//   }, [contracts, viewAddress, orbitData, cycleHistoryData, fetchStoredCycleForLevel])

//   const fetchOrbitLevelData = useCallback(async (level, options = {}) => {
//     const { forceRefresh = false, silent = false } = options
//     if (!viewAddress || !ethers.isAddress(viewAddress) || level < 1 || level > 10) return

//     const fetchKey = `${viewAddress.toLowerCase()}-${level}`
//     const requestEpoch = fetchIdRef.current

//     if (forceRefresh) {
//       loadedLevelsRef.current.delete(fetchKey)
//       positionDetailsCacheRef.current.delete(fetchKey)
//     }
//     if (!forceRefresh && loadedLevelsRef.current.has(fetchKey)) return
//     if (loadingLevelsRef.current.has(fetchKey)) return

//     loadingLevelsRef.current.add(fetchKey)
//     setLoadingLevelsMap(prev => ({ ...prev, [level]: true }))
//     if (!silent) {
//       setOrbitError('')
//       setIsLoadingOrbits(true)
//     }

//     try {
//       const snapshot = await fetchOrbitLevelSnapshotApi(viewAddress, level)
//       if (requestEpoch !== fetchIdRef.current) return

//       const orbitType = snapshot.orbitType
//       const config = orbitTypeConfig[orbitType]

//       const positions = await Promise.all(
//         (snapshot.positions || []).map(async (pos) => {
//           return await mergePositionTruth(level, pos, orbitType, 0, false)
//         })
//       )

//       const myPositions = positions
//         .filter(p => p.occupantType === 'mine')
//         .map(p => p.number)

//       const owner = viewAddress?.toLowerCase()

//       const downlinePositions = positions.filter(p => {
//         if (!p.occupant) return false
//         const ref =
//           p.originalReferrer ||
//           p.referrer ||
//           p.occupantReferrer ||
//           ethers.ZeroAddress
//         return ref?.toLowerCase() === owner
//       })

//       const otherOccupants = positions.filter(p => {
//         if (!p.occupant) return false
//         const ref =
//           p.originalReferrer ||
//           p.referrer ||
//           p.occupantReferrer ||
//           ethers.ZeroAddress
//         return ref?.toLowerCase() !== owner &&
//           p.occupant.toLowerCase() !== owner
//       })

//       const structuralLinks = positions
//         .filter(p => p.parentPosition && p.occupant)
//         .map(p => ({ from: p.number, to: p.parentPosition, user: p.occupant }))

//       const lineCounts = {
//         line1: Number(snapshot.linePaymentCounts?.line1 || 0),
//         line2: Number(snapshot.linePaymentCounts?.line2 || 0),
//         line3: Number(snapshot.linePaymentCounts?.line3 || 0)
//       }

//       const levelData = {
//         orbitType,
//         config,
//         currentIndex: Number(snapshot.orbitSummary?.currentPosition ?? 1),
//         escrowBalance: snapshot.orbitSummary?.escrowBalance || '0',
//         autoUpgradeCompleted: !!snapshot.orbitSummary?.autoUpgradeCompleted,
//         positionsInLine1: Number(snapshot.orbitSummary?.positionsInLine1 ?? 0),
//         positionsInLine2: Number(snapshot.orbitSummary?.positionsInLine2 ?? 0),
//         positionsInLine3: Number(snapshot.orbitSummary?.positionsInLine3 ?? 0),
//         totalCycles: Number(snapshot.orbitSummary?.totalCycles ?? 0),
//         totalEarned: snapshot.orbitSummary?.totalEarned || '0',
//         positions,
//         myPositions,
//         downlinePositions,
//         otherOccupants,
//         spilloverFromPositions: structuralLinks,
//         linePaymentCounts: lineCounts
//       }

//       setOrbitData(prev => ({ ...prev, [level]: levelData }))
//       setUserLocks(prev => ({ ...prev, [level]: snapshot.lockedForNextLevel || '0' }))
//       setDownlineData(prev => ({ ...prev, [level]: downlinePositions }))
//       setSpilloverData(prev => ({ ...prev, [level]: otherOccupants }))
//       setLinePaymentCountsByLevel(prev => ({ ...prev, [level]: lineCounts }))
//       loadedLevelsRef.current.add(fetchKey)
//     } catch (err) {
//       console.error(`Orbit sync error for level ${level}:`, err)
//       setOrbitError(err.message || 'Failed to load orbit data')
//     } finally {
//       loadingLevelsRef.current.delete(fetchKey)
//       setLoadingLevelsMap(prev => ({ ...prev, [level]: false }))
//       if (!silent) setIsLoadingOrbits(false)
//     }
//   }, [viewAddress, mergePositionTruth])

//   const fetchAllOrbitData = useCallback(async (forceRefresh = false) => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
//     const match = activeTab?.match(/^level(\d+)$/)
//     const currentLevel = match ? Number(match[1]) : 1

//     if (forceRefresh) {
//       const lowerView = viewAddress.toLowerCase()
//       Array.from(loadedLevelsRef.current).forEach(key => {
//         if (key.startsWith(`${lowerView}-`)) loadedLevelsRef.current.delete(key)
//       })
//     }

//     await fetchOrbitLevelData(currentLevel, { forceRefresh, silent: false })
//   }, [contracts, viewAddress, activeTab, fetchOrbitLevelData])

//   const hydrateLivePositionDetails = useCallback(async (level, position) => {
//     if (!viewAddress || !ethers.isAddress(viewAddress) || !position) return position
//     const positionNumber = Number(position?.number || 0)
//     if (!positionNumber) return position

//     const cacheKey = `${viewAddress.toLowerCase()}-${level}-${positionNumber}`
//     if (position?.receiptsHydrated) {
//       positionDetailsCacheRef.current.set(cacheKey, position)
//       return position
//     }
//     if (positionDetailsCacheRef.current.has(cacheKey)) {
//       return positionDetailsCacheRef.current.get(cacheKey)
//     }
//     if (positionHydrationPromisesRef.current.has(cacheKey)) {
//       return await positionHydrationPromisesRef.current.get(cacheKey)
//     }

//     const promise = (async () => {
//       const details = await fetchOrbitPositionDetailsApi(viewAddress, level, positionNumber)
//       const hydrated = await mergePositionTruth(level, { ...position, ...details }, details?.orbitType || levelToOrbitType[level], 0, false)
//       const finalHydrated = { ...hydrated, receiptsHydrated: true }

//       positionDetailsCacheRef.current.set(cacheKey, finalHydrated)

//       setOrbitData(prev => {
//         const levelData = prev[level]
//         if (!levelData?.positions) return prev
//         return {
//           ...prev,
//           [level]: {
//             ...levelData,
//             positions: levelData.positions.map(item =>
//               item.number === positionNumber ? finalHydrated : item
//             )
//           }
//         }
//       })

//       return finalHydrated
//     })()

//     positionHydrationPromisesRef.current.set(cacheKey, promise)
//     try {
//       return await promise
//     } finally {
//       positionHydrationPromisesRef.current.delete(cacheKey)
//     }
//   }, [viewAddress, mergePositionTruth])

//   const hydrateHistoricalPositionDetails = useCallback(async (level, cycleNumber, position) => {
//     if (!viewAddress || !ethers.isAddress(viewAddress) || !position) return position
//     const positionNumber = Number(position?.number || 0)
//     if (!positionNumber) return position

//     const cacheKey = `${viewAddress.toLowerCase()}-${level}-${cycleNumber}-${positionNumber}`

//     if (position?.receiptsHydrated) return position
//     if (positionDetailsCacheRef.current.has(cacheKey)) return positionDetailsCacheRef.current.get(cacheKey)

//     try {
//       const cycleSnapshot = await fetchOrbitCycleSnapshotApi(viewAddress, level, cycleNumber)
//       const details = cycleSnapshot?.positions?.find(p => Number(p.number) === positionNumber)
//       if (!details) return position

//       const hydrated = await mergePositionTruth(
//         level,
//         { ...position, ...details },
//         details?.orbitType || levelToOrbitType[level],
//         Number(cycleNumber),
//         true
//       )

//       const finalHydrated = { ...hydrated, receiptsHydrated: true }
//       positionDetailsCacheRef.current.set(cacheKey, finalHydrated)
//       return finalHydrated
//     } catch (err) {
//       console.error('Error hydrating historical position:', err)
//       return position
//     }
//   }, [viewAddress, mergePositionTruth])

//   const applyViewerAddress = async () => {
//     if (!inputAddress || !ethers.isAddress(inputAddress)) {
//       setOrbitError('Enter a valid wallet address')
//       return
//     }
//     setOrbitError('')
//     const normalized = ethers.getAddress(inputAddress)
//     viewedLevelsCacheRef.current.delete(normalized.toLowerCase())
//     receiptCacheRef.current.delete(normalized.toLowerCase())
//     activationReceiptCacheRef.current.clear()
//     setInputAddress(normalized)
//     setViewAddress(normalized)
//     setViewMode('global')
//     setSelectedCycleByLevel({})
//     setCycleHistoryData({})
//     setCycleHistorySupportByLevel({})
//     setViewAddressReceipts([])
//     setReceiptBucketsByLevel({})
//     cycleHistoryCacheRef.current.clear()
//   }

//   const viewMyOrbit = () => {
//     if (!account) return
//     viewedLevelsCacheRef.current.delete(account.toLowerCase())
//     receiptCacheRef.current.delete(account.toLowerCase())
//     activationReceiptCacheRef.current.clear()
//     setOrbitError('')
//     setInputAddress(account)
//     setViewAddress(account)
//     setViewMode('global')
//     setSelectedCycleByLevel({})
//     setCycleHistoryData({})
//     setCycleHistorySupportByLevel({})
//     setViewAddressReceipts([])
//     setReceiptBucketsByLevel({})
//     cycleHistoryCacheRef.current.clear()
//   }

//   const refreshData = async () => {
//     if (!viewAddress || !ethers.isAddress(viewAddress)) return
//     setIsRefreshing(true)
//     try {
//       activationReceiptCacheRef.current.clear()
//       positionDetailsCacheRef.current.clear()
//       positionHydrationPromisesRef.current.clear()
//       receiptCacheRef.current.delete(`${viewAddress.toLowerCase()}-backend-receipts`)
//       viewedLevelsCacheRef.current.delete(viewAddress.toLowerCase())
//       await fetchViewedLevels(true)
//       await fetchViewedAddressReceipts(true)
//       await fetchAllOrbitData(true)
//       setLastUpdated(new Date().toLocaleTimeString())
//     } catch (err) {
//       console.error('Refresh error:', err)
//     } finally {
//       setIsRefreshing(false)
//     }
//   }

//   const handlePositionClick = useCallback(async (position) => {
//     const level = Number(position?.level || activeTab?.replace('level', '') || 0)
//     const selectedCycle = selectedCycleByLevel[level] || 'current'
//     const isHistorical = selectedCycle !== 'current'

//     const initialPosition = {
//       ...position,
//       level,
//       cycleNumber: isHistorical ? Number(selectedCycle) : 0,
//       isHistoricalPosition: isHistorical,
//       detailsLoading: true
//     }

//     setSelectedPosition(initialPosition)
//     setShowPositionModal(true)

//     if (level < 1 || level > 10) {
//       setSelectedPosition(prev => prev ? { ...prev, detailsLoading: false } : prev)
//       return
//     }

//     try {
//       const hydrated = isHistorical
//         ? await hydrateHistoricalPositionDetails(level, Number(selectedCycle), initialPosition)
//         : await hydrateLivePositionDetails(level, initialPosition)

//       setSelectedPosition(prev => {
//         if (!prev || prev.number !== position.number || Number(prev.level || 0) !== level) {
//           return prev
//         }
//         return { ...hydrated, detailsLoading: false }
//       })
//     } catch {
//       setSelectedPosition(prev => prev ? { ...prev, detailsLoading: false } : prev)
//     }
//   }, [activeTab, selectedCycleByLevel, hydrateHistoricalPositionDetails, hydrateLivePositionDetails])

//   const handleStructuralPreview = (position) => {
//     if (position.parentPosition) {
//       setShowStructuralPreview(true)
//       setTimeout(() => setShowStructuralPreview(false), 2000)
//     }
//   }

//   const getHistoricalCycleSelection = useCallback((level) => selectedCycleByLevel[level] || 'current', [selectedCycleByLevel])
//   const setHistoricalCycleSelection = (level, cycleKey) => setSelectedCycleByLevel(prev => ({ ...prev, [level]: cycleKey }))

//   const getHighestViewedActiveLevel = useCallback(() => {
//     const active = Object.keys(viewedLevels)
//       .filter(level => viewedLevels[level])
//       .map(Number)
//       .sort((a, b) => b - a)
//     return active[0] || 0
//   }, [viewedLevels])

//   useEffect(() => {
//     if (isConnected) loadContracts().catch(console.error)
//   }, [isConnected, loadContracts])

//   useEffect(() => {
//     if (account && !viewAddress) {
//       setViewAddress(account)
//       setInputAddress(account)
//     }
//   }, [account, viewAddress])

//   useEffect(() => {
//     if (contracts && viewAddress && ethers.isAddress(viewAddress)) fetchViewedLevels(true)
//   }, [contracts, viewAddress, fetchViewedLevels])

//   useEffect(() => {
//     if (contracts && viewAddress && ethers.isAddress(viewAddress)) fetchAllOrbitData()
//   }, [contracts, viewAddress, fetchAllOrbitData])

//   useEffect(() => {
//     if (viewAddress && ethers.isAddress(viewAddress)) fetchViewedAddressReceipts(true)
//   }, [viewAddress, fetchViewedAddressReceipts])

//   useEffect(() => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
//     const match = activeTab?.match(/^level(\d+)$/)
//     if (!match) return
//     const level = Number(match[1])
//     if (!loadedLevelsRef.current.has(`${viewAddress.toLowerCase()}-${level}`)) {
//       fetchOrbitLevelData(level, { silent: false })
//     }
//   }, [activeTab, contracts, viewAddress, fetchOrbitLevelData])

//   const activeLevelNumber = Number(activeTab.replace('level', ''))
//   const activeLevelData = orbitData[activeLevelNumber]
//   const activeLevelReady = !!activeLevelData?.positions

//   useEffect(() => {
//     if (!activeLevelReady) return

//     let rafId = 0
//     let resizeObserver = null
//     let settleTimer = null

//     const updateSize = () => {
//       if (!galaxyRef.current) return

//       const rect = galaxyRef.current.getBoundingClientRect()
//       const width = Math.round(rect.width)
//       const height = Math.round(rect.height)

//       if (width <= 0 || height <= 0) return

//       setContainerSize((prev) => {
//         if (prev.width === width && prev.height === height) return prev
//         return { width, height }
//       })

//       setIsGalaxyMeasured(true)
//     }

//     const scheduleUpdate = () => {
//       cancelAnimationFrame(rafId)
//       rafId = requestAnimationFrame(updateSize)
//     }

//     scheduleUpdate()
//     settleTimer = window.setTimeout(scheduleUpdate, 120)

//     window.addEventListener('resize', scheduleUpdate)

//     if (window.ResizeObserver && galaxyRef.current) {
//       resizeObserver = new ResizeObserver(scheduleUpdate)
//       resizeObserver.observe(galaxyRef.current)
//     }

//     return () => {
//       window.removeEventListener('resize', scheduleUpdate)
//       if (resizeObserver) resizeObserver.disconnect()
//       cancelAnimationFrame(rafId)
//       if (settleTimer) window.clearTimeout(settleTimer)
//     }
//   }, [activeTab, activeLevelReady])

//   useEffect(() => {
//     loadedLevelsRef.current.clear()
//     loadingLevelsRef.current.clear()
//     activationReceiptCacheRef.current.clear()
//     positionDetailsCacheRef.current.clear()
//     positionHydrationPromisesRef.current.clear()
//     fetchIdRef.current += 1

//     setOrbitData({})
//     setUserLocks({})
//     setDownlineData({})
//     setSpilloverData({})
//     setLinePaymentCountsByLevel({})
//     setCycleHistoryData({})
//     setSelectedCycleByLevel({})
//     setLoadingCycleByLevel({})
//     setCycleHistorySupportByLevel({})
//     setLoadingLevelsMap({})
//     setIsLoadingOrbits(true)
//     setIsGalaxyMeasured(false)
//     setContainerSize({ width: 0, height: 0 })
//   }, [viewAddress])

//   useEffect(() => {
//     if (!showPositionModal) return

//     const previousBodyOverflow = document.body.style.overflow
//     document.body.style.overflow = 'hidden'
//     modalRef.current?.focus()

//     const handleKeyDown = (event) => {
//       if (event.key === 'Escape') {
//         setShowPositionModal(false)
//       }
//     }

//     window.addEventListener('keydown', handleKeyDown)

//     return () => {
//       document.body.style.overflow = previousBodyOverflow
//       window.removeEventListener('keydown', handleKeyDown)
//     }
//   }, [showPositionModal])

//   const renderPositionTooltip = (position) => {
//     const viewerBreakdown = position.viewerReceiptBreakdown || {
//       totalGross: 0,
//       totalLiquid: 0,
//       totalEscrow: 0
//     }

//     const receiptTotals = position.receiptTotals || {
//       count: 0,
//       gross: 0,
//       liquidPaid: 0,
//       escrowLocked: 0
//     }

//     if (!position.occupant) {
//       return (
//         <div className="custom-tooltip">
//           <div className="custom-tooltip__title">Position #{position.number}</div>
//           <div className="custom-tooltip__row">
//             <span>Status</span>
//             <strong>Empty</strong>
//           </div>
//           <div className="custom-tooltip__row">
//             <span>Line</span>
//             <strong>Line {position.line || 1}</strong>
//           </div>
//           {position.parentPosition && (
//             <div className="custom-tooltip__row">
//               <span>Parent</span>
//               <strong>Position {position.parentPosition}</strong>
//             </div>
//           )}
//           {position.activationCycleNumber > 0 && (
//             <div className="custom-tooltip__row">
//               <span>Cycle</span>
//               <strong>{position.isHistoricalPosition ? `Historical ${position.activationCycleNumber}` : `Current ${position.activationCycleNumber}`}</strong>
//             </div>
//           )}
//         </div>
//       )
//     }

//     return (
//       <div className="custom-tooltip">
//         <div className="custom-tooltip__title">Position #{position.number}</div>
//         <div className="custom-tooltip__row">
//           <span>Occupant</span>
//           <strong>{shortAddress(position.occupant)}</strong>
//         </div>
//         <div className="custom-tooltip__row">
//           <span>Line</span>
//           <strong>Line {position.line || 1}</strong>
//         </div>
//         <div className="custom-tooltip__row">
//           <span>Truth</span>
//           <strong>{formatTruthLabel(position.truthLabel)}</strong>
//         </div>
//         <div className="custom-tooltip__row">
//           <span>Net Amount</span>
//           <strong>{formatUsdtDisplay(getNetAmount(Number(position.amount || 0)))} USDT</strong>
//         </div>
//         {position.parentPosition && (
//           <div className="custom-tooltip__row">
//             <span>Parent</span>
//             <strong>Position {position.parentPosition}</strong>
//           </div>
//         )}
//         <div className="custom-tooltip__row">
//           <span>You Received</span>
//           <strong>{formatUsdtDisplay(viewerBreakdown.totalLiquid || 0)} USDT</strong>
//         </div>
//         <div className="custom-tooltip__row">
//           <span>Gross Routed</span>
//           <strong>{formatUsdtDisplay(receiptTotals.gross || 0)} USDT</strong>
//         </div>
//         {position.activationId > 0 && (
//           <div className="custom-tooltip__row">
//             <span>Activation</span>
//             <strong>#{position.activationId}</strong>
//           </div>
//         )}
//       </div>
//     )
//   }

//   if (!isConnected) {
//     return (
//       <section className="orbits-page">
//         <div className="orbits-hero">
//           <div className="orbits-hero__content">
//             <h1 className="orbits-hero__title">Orbits System</h1>
//             <p className="orbits-hero__description">
//               Connect your wallet to monitor your orbit positions and track placements.
//             </p>
//             <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
//           </div>
//         </div>
//       </section>
//     )
//   }

//   if (contractsLoading) {
//     return (
//       <section className="orbits-page">
//         <div className="loading-container">
//           <div className="spinner"></div>
//           <p>Loading orbit data...</p>
//         </div>
//       </section>
//     )
//   }

//   const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
//   const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
//   const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()
//   const highestViewedActiveLevel = getHighestViewedActiveLevel()

//   return (
//     <section className="orbits-page">
//       <div className="address-input-bar glass-panel">
//         <input
//           type="text"
//           className="address-input"
//           placeholder="Enter wallet address (0x...)"
//           value={inputAddress}
//           onChange={(e) => setInputAddress(e.target.value)}
//         />
//         <button className="address-btn" onClick={applyViewerAddress}>Load Address</button>
//         <button className="address-btn secondary" onClick={viewMyOrbit}>My Orbits</button>
//         <button className="refresh-btn" onClick={refreshData} disabled={isRefreshing}>⟳</button>
//         <span className="last-sync">Last sync: {lastUpdated}</span>
//       </div>

//       <div className="view-toggle-bar glass-panel">
//         <button
//           className={`toggle-btn ${viewMode === 'global' ? 'active' : ''}`}
//           onClick={() => setViewMode('global')}
//         >
//           Orbit View
//         </button>
//         <button
//           className={`toggle-btn ${viewMode === 'downline' ? 'active' : ''}`}
//           onClick={() => setViewMode('downline')}
//         >
//           Downline View {totalDownline > 0 && <span className="badge">{totalDownline}</span>}
//         </button>
//         <div className="receipt-status">Receipts: {receiptsSupported ? '✓ ON' : 'OFF'}</div>
//       </div>

//       <div className="level-tabs glass-panel">
//         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
//           const orbitType = levelToOrbitType[level]
//           const isActive = !!viewedLevels[level]
//           const isLoading = loadingLevelsMap[level]
//           return (
//             <button
//               key={level}
//               className={`level-tab ${activeTab === `level${level}` ? 'active' : ''} ${!isActive ? 'inactive' : ''}`}
//               onClick={() => setActiveTab(`level${level}`)}
//             >
//               L{level} ({orbitType})
//               {!isActive && <span className="inactive-badge">off</span>}
//               {isLoading && <span className="loading-dot" />}
//             </button>
//           )
//         })}
//       </div>

//       <div className="orbit-tips glass-panel">
//         <p>
//           ⚡ You may experience a slight delay when opening <strong>P12</strong> and <strong>P39</strong> orbits.
//         </p>
//         <p>
//           🚀 [Blinking Yellow Dots] Other orbit visuals load silently when you click the next level while viewing your current level.
//         </p>
//       </div>

//       <div className="orbits-main-grid">
//         <div className="orbits-main-grid__left">
//           {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
//             if (activeTab !== `level${level}`) return null
//             const data = orbitData[level]

//             if (!data) {
//               return (
//                 <div key={level} className="loading-level glass-panel orbit-loading-panel">
//                   <div className="spinner"></div>
//                   <p>Loading Level {level} orbit...</p>
//                 </div>
//               )
//             }

//             const orbitType = data.orbitType
//             const config = orbitTypeConfig[orbitType]
//             const positions = data.positions || []
//             const currentIndex = data.currentIndex
//             const totalCycles = data.totalCycles
//             const autoUpgradeCompleted = data.autoUpgradeCompleted
//             const lineCounts = linePaymentCountsByLevel[level] || data.linePaymentCounts || { line1: 0, line2: 0, line3: 0 }
//             const isLevelActive = !!viewedLevels[level]
//             const levelInfo = levelConfig[level]

//             const totalCompletedCycles = Number(totalCycles || 0)
//             const availableCycleNumbers = Array.from({ length: totalCompletedCycles }, (_, idx) => idx + 1)
//             const selectedCycle = getHistoricalCycleSelection(level)
//             const isHistoricalView = selectedCycle !== 'current'
//             const historicalPositions = (cycleHistoryData[level]?.[String(selectedCycle)] || []).map(pos => ({ ...pos, level }))
//             const displayedPositions = isHistoricalView ? historicalPositions : positions

//             const ownerLower = viewAddress?.toLowerCase()

//             const displayedDownlineCount = displayedPositions.filter((p) => {
//               if (!p.occupant) return false

//               if (isHistoricalView) {
//                 const ref =
//                   p.originalReferrer ||
//                   p.referrer ||
//                   p.occupantReferrer ||
//                   ethers.ZeroAddress

//                 if (ref && ref !== ethers.ZeroAddress) {
//                   return ref.toLowerCase() === ownerLower
//                 }

//                 return p.occupantType === 'downline'
//               }

//               const ref =
//                 p.originalReferrer ||
//                 p.referrer ||
//                 p.occupantReferrer ||
//                 ethers.ZeroAddress

//               return ref.toLowerCase() === ownerLower
//             }).length

//             const displayedOtherCount = displayedPositions.filter((p) => {
//               if (!p.occupant) return false
//               if (p.occupant.toLowerCase() === ownerLower) return false

//               if (isHistoricalView) {
//                 const ref =
//                   p.originalReferrer ||
//                   p.referrer ||
//                   p.occupantReferrer ||
//                   ethers.ZeroAddress

//                 if (ref && ref !== ethers.ZeroAddress) {
//                   return ref.toLowerCase() !== ownerLower
//                 }

//                 return p.occupantType === 'other'
//               }

//               const ref =
//                 p.originalReferrer ||
//                 p.referrer ||
//                 p.occupantReferrer ||
//                 ethers.ZeroAddress

//               return ref.toLowerCase() !== ownerLower
//             }).length

//             const positionsByLine = {}
//             displayedPositions.forEach(pos => {
//               const line = pos.line
//               if (!positionsByLine[line]) positionsByLine[line] = []
//               positionsByLine[line].push(pos)
//             })

//             const structure = getOrbitStructure(orbitType)
//             const filledCountForDisplay = displayedPositions.filter(p => p.occupant).length
//             const filledCount = (data.positions || []).filter(p => p.occupant).length
//             const currentIndexForDisplay = isHistoricalView
//               ? Math.min(filledCountForDisplay, config.positions)
//               : (currentIndex || 0)

//             const shouldShowAutoUpgradePanel =
//               isLevelActive &&
//               level < 10 &&
//               level === highestViewedActiveLevel

//             const isLoadingCycleHistory = !!loadingCycleByLevel[level]
//             const showCycleButtons = totalCompletedCycles > 0

//             return (
//               <div key={level} className={`orbit-content ${loadingLevelsMap[level] ? 'is-level-loading' : ''}`}>
//                 <div className="orbit-header-card glass-panel">
//                   <div className="orbit-header-info">
//                     <span>Level {level} ({orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}</span>
//                     {totalCycles > 0 && <span className="cycle-badge">Cycle {Number(totalCycles) + 1}</span>}
//                     {isHistoricalView && <span className="history-badge">Stored Snapshot • Cycle {selectedCycle}</span>}
//                   </div>
//                   <div className="orbit-header-stats">
//                     {!isLevelActive && <span className="badge-secondary">Inactive</span>}
//                     {displayedDownlineCount > 0 && <span className="badge-warning">⬇ {displayedDownlineCount}</span>}
//                     {displayedOtherCount > 0 && <span className="badge-info">🔄 {displayedOtherCount}</span>}
//                     <span className="badge-primary">{filledCountForDisplay}/{config.positions} filled</span>
//                   </div>
//                 </div>

//                 <div className={`orbit-summary-strip glass-panel ${isHistoricalView ? 'is-historical' : 'is-live'}`}>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Level</span>
//                     <strong className="orbit-summary-value">L{level}</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Orbit</span>
//                     <strong className="orbit-summary-value">{orbitType}</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Filled</span>
//                     <strong className="orbit-summary-value">{filledCountForDisplay}/{config.positions}</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">{isHistoricalView ? 'Snapshot Cycle' : 'Current Cycle'}</span>
//                     <strong className="orbit-summary-value">
//                       {isHistoricalView ? `Cycle ${selectedCycle}` : `Cycle ${Number(totalCycles) + 1}`}
//                     </strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Downline</span>
//                     <strong className="orbit-summary-value">{displayedDownlineCount}</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Other Occupants</span>
//                     <strong className="orbit-summary-value">{displayedOtherCount}</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Total Earned</span>
//                     <strong className="orbit-summary-value">{formatUsdtDisplay(data?.totalEarned || 0)} USDT</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">{level < 10 ? `Locked for L${level + 1}` : 'Top Level'}</span>
//                     <strong className="orbit-summary-value">
//                       {level < 10 ? `${formatUsdtDisplay(userLocks[level] || 0)} USDT` : 'Complete'}
//                     </strong>
//                   </div>
//                 </div>

//                 {showCycleButtons && (
//                   <div className="cycle-switcher glass-panel">
//                     <span className="cycle-label">Cycle View:</span>
//                     <button
//                       className={`cycle-btn ${selectedCycle === 'current' ? 'active' : ''}`}
//                       onClick={() => setHistoricalCycleSelection(level, 'current')}
//                     >
//                       Current
//                     </button>
//                     {availableCycleNumbers.map(cycleNum => (
//                       <button
//                         key={cycleNum}
//                         className={`cycle-btn ${selectedCycle === cycleNum ? 'active' : ''}`}
//                         onClick={() => {
//                           setHistoricalCycleSelection(level, cycleNum)
//                           loadCycleHistoryForLevel(level, cycleNum)
//                         }}
//                       >
//                         Cycle {cycleNum}
//                       </button>
//                     ))}
//                   </div>
//                 )}

//                 <div
//                   key={`galaxy-${activeTab}`}
//                   className={`galaxy-container ${orbitType.toLowerCase()} ${!isGalaxyMeasured ? 'is-measuring' : ''}`}
//                   ref={galaxyRef}
//                 >
//                   {!isGalaxyMeasured ? (
//                     <div className="galaxy-measure-loader">
//                       <div className="spinner"></div>
//                       <p>Preparing orbit view...</p>
//                     </div>
//                   ) : (
//                     <>
//                       <div className="star-field">
//                         {starConfig.map((star) => (
//                           <span
//                             key={star.id}
//                             className="star"
//                             style={{
//                               left: star.left,
//                               top: star.top,
//                               width: star.size,
//                               height: star.size,
//                               opacity: star.opacity,
//                               animationDelay: `${star.delay}, ${star.delay}`,
//                               animationDuration: `${star.duration}, ${star.drift}`,
//                             }}
//                           />
//                         ))}
//                       </div>

//                       <div className="galaxy-inner">
//                         {(() => {
//                           const outerWidth = containerSize.width || galaxyRef.current?.clientWidth || 560
//                           const outerHeight = containerSize.height || galaxyRef.current?.clientHeight || outerWidth
//                           const usableSize = Math.max(Math.min(outerWidth, outerHeight) * 0.86, 240)
//                           const stageSize = usableSize
//                           const centerX = stageSize / 2
//                           const centerY = stageSize / 2

//                           const planetSize = getPlanetSize(orbitType, stageSize)
//                           const coreSize = getCoreSize(orbitType, stageSize)
//                           const nodePadding = planetSize / 2 + 8
//                           const coreClearance = coreSize / 2 + planetSize / 2 + 18

//                           let ringRadiiPx = { 1: Math.max(coreClearance, stageSize * 0.22), 2: stageSize * 0.34, 3: stageSize * 0.45 }
//                           if (orbitType === 'P4') ringRadiiPx = { 1: Math.max(coreClearance + 6, stageSize * 0.31) }
//                           if (orbitType === 'P12') ringRadiiPx = {
//                             1: Math.max(coreClearance + 4, stageSize * 0.19),
//                             2: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding)
//                           }
//                           if (orbitType === 'P39') ringRadiiPx = {
//                             1: Math.max(coreClearance, stageSize * 0.17),
//                             2: Math.min(stageSize * 0.32, (stageSize / 2) - nodePadding - 34),
//                             3: Math.min(stageSize * 0.47, (stageSize / 2) - nodePadding)
//                           }
//                           Object.keys(ringRadiiPx).forEach(key => {
//                             ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding)
//                           })

//                           const createEmptyPosition = (posNumber, lineNum) => ({
//                             number: posNumber,
//                             occupantType: 'empty',
//                             occupant: null,
//                             amount: '0',
//                             timestamp: 0,
//                             positionInfo: buildPositionInfoFromRuleView(orbitType, posNumber, level, null, viewAddress),
//                             line: lineNum,
//                             spillsTo: null,
//                             parentPosition: getStructuralParentPosition(orbitType, posNumber),
//                             truthLabel: 'NO_RECEIPT',
//                             payoutReceipts: [],
//                             viewerReceiptBreakdown: { totalLiquid: 0 },
//                             receiptTotals: { gross: 0, liquidPaid: 0, escrowLocked: 0, count: 0 },
//                             indexedReceiptCount: 0,
//                             indexedEventCount: 0,
//                             activationId: 0,
//                             activationCycleNumber: isHistoricalView ? Number(selectedCycle) : Number(totalCycles) + 1,
//                             isMirrorActivation: false,
//                             indexedReceipts: [],
//                             indexedEvents: [],
//                             ruleView: null
//                           })

//                           const allPositionMap = {}
//                           structure.lines.forEach(lineNum => {
//                             const linePositions = positionsByLine[lineNum] || []
//                             structure.positions[lineNum].forEach(posNumber => {
//                               allPositionMap[posNumber] =
//                                 linePositions.find(p => p.number === posNumber) ||
//                                 createEmptyPosition(posNumber, lineNum)
//                             })
//                           })

//                           const getCoordsForPosition = (posNumber, lineNum, index) => {
//                             const customAngle = structure.customAngles?.[lineNum]?.[posNumber]
//                             if (typeof customAngle === 'number') {
//                               return getPositionOnAngle(customAngle, ringRadiiPx[lineNum], centerX, centerY)
//                             }
//                             return getPositionOnRing(index, structure.counts[lineNum], ringRadiiPx[lineNum], centerX, centerY, structure.startAngles[lineNum])
//                           }

//                           const getTrimmedConnectionStyle = (fromCoords, toCoords, fromRadius, toRadius) => {
//                             const dx = toCoords.x - fromCoords.x
//                             const dy = toCoords.y - fromCoords.y
//                             const distance = Math.sqrt(dx * dx + dy * dy)

//                             if (!distance) {
//                               return {
//                                 width: 0,
//                                 left: fromCoords.x,
//                                 top: fromCoords.y,
//                                 transform: 'rotate(0deg)',
//                               }
//                             }

//                             const ux = dx / distance
//                             const uy = dy / distance

//                             const startX = fromCoords.x + ux * fromRadius
//                             const startY = fromCoords.y + uy * fromRadius
//                             const endX = toCoords.x - ux * toRadius
//                             const endY = toCoords.y - uy * toRadius

//                             const trimmedDx = endX - startX
//                             const trimmedDy = endY - startY
//                             const trimmedDistance = Math.max(0, Math.sqrt(trimmedDx * trimmedDx + trimmedDy * trimmedDy))
//                             const angle = Math.atan2(trimmedDy, trimmedDx) * 180 / Math.PI

//                             return {
//                               width: trimmedDistance,
//                               left: startX,
//                               top: startY,
//                               transform: `rotate(${angle}deg)`,
//                             }
//                           }

//                           return (
//                             <div
//                               className="galaxy-stage"
//                               style={{
//                                 width: stageSize,
//                                 height: stageSize,
//                                 left: '50%',
//                                 top: '50%',
//                                 transform: 'translate(-50%, -50%)'
//                               }}
//                             >
//                               <div
//                                 className={`orbit-core ${
//                                   !isLevelActive
//                                     ? 'inactive'
//                                     : isViewingSelf
//                                       ? 'is-self-active'
//                                       : 'is-viewing-member'
//                                 }`}
//                                 style={{ width: coreSize, height: coreSize }}
//                               >
//                                 <span className="core-label">{isLevelActive ? 'ORBIT' : 'INACTIVE'}</span>
//                                 <span className="core-value">{isLevelActive ? (isViewingSelf ? 'YOU' : shortAddress(viewAddress)) : 'LOCKED'}</span>
//                               </div>

//                               {structure.lines.map(lineNum => {
//                                 const linePositions = positionsByLine[lineNum] || []
//                                 const filledCount = linePositions.filter(p => p.occupant).length
//                                 const diameter = ringRadiiPx[lineNum] * 2
//                                 const arrivals = lineNum === 1 ? lineCounts.line1 : lineNum === 2 ? lineCounts.line2 : lineCounts.line3
//                                 return (
//                                   <div key={lineNum} className={`orbit-ring line${lineNum}`} style={{ width: diameter, height: diameter }}>
//                                     <span className="ring-label">LINE {lineNum}</span>
//                                     <span className="ring-stats">{filledCount}/{structure.positions[lineNum].length} • arrivals: {arrivals}</span>
//                                   </div>
//                                 )
//                               })}

//                               {structure.lines.map(lineNum => structure.positions[lineNum].map(posNumber => {
//                                 const parentPos = getStructuralParentPosition(orbitType, posNumber)
//                                 if (!parentPos) return null
//                                 const fromPos = allPositionMap[posNumber]
//                                 const toPos = allPositionMap[parentPos]
//                                 if (!fromPos || !toPos) return null
//                                 const fromIndex = structure.positions[fromPos.line].indexOf(fromPos.number)
//                                 const toIndex = structure.positions[toPos.line].indexOf(toPos.number)
//                                 if (fromIndex < 0 || toIndex < 0) return null
//                                 const fromCoords = getCoordsForPosition(fromPos.number, fromPos.line, fromIndex)
//                                 const toCoords = getCoordsForPosition(toPos.number, toPos.line, toIndex)

//                                 const connectionStyle = getTrimmedConnectionStyle(
//                                   fromCoords,
//                                   toCoords,
//                                   planetSize / 2,
//                                   planetSize / 2
//                                 )

//                                 return (
//                                   <div
//                                     key={`grey-conn-${posNumber}`}
//                                     className="structural-connection-grey"
//                                     style={connectionStyle}
//                                   />
//                                 )
//                               }))}

//                               {structure.lines.map(lineNum => structure.positions[lineNum].map((posNumber, index) => {
//                                 const pos = allPositionMap[posNumber]
//                                 const coords = getCoordsForPosition(posNumber, lineNum, index)
//                                 let planetClass = 'planet-node '
//                                 if (pos.occupantType === 'mine') planetClass += 'mine'
//                                 else if (pos.occupantType === 'downline') planetClass += 'downline'
//                                 else if (pos.occupantType === 'other') planetClass += 'other'
//                                 else planetClass += 'empty'
//                                 if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) {
//                                   planetClass += ' structural-preview'
//                                 }

//                                 const badgeValue = getPlanetBadgeValue(pos)

//                                 return (
//                                   <div
//                                     key={pos.number}
//                                     className={planetClass}
//                                     style={{
//                                       left: coords.x,
//                                       top: coords.y,
//                                       width: planetSize,
//                                       height: planetSize,
//                                       transform: 'translate(-50%, -50%)',
//                                       '--index': index
//                                     }}
//                                     onClick={() => handlePositionClick(pos)}
//                                     onMouseEnter={() => {
//                                       setHoveredPosition(pos)
//                                       if (pos.parentPosition) handleStructuralPreview(pos)
//                                     }}
//                                     onMouseLeave={() => setHoveredPosition(null)}
//                                   >
//                                     <div className="planet-content">
//                                       <span className="node-number">{pos.number}</span>
//                                       {pos.occupant && pos.occupantType === 'mine' && <span className="planet-icon">👤</span>}
//                                       {pos.occupant && pos.occupantType === 'downline' && <span className="planet-icon">⬇</span>}
//                                       {pos.occupant && pos.occupantType === 'other' && <span className="planet-icon">👥</span>}
//                                       {badgeValue > 0 && pos.occupantType !== 'mine' && (
//                                         <span className="planet-earn-badge">{formatUsdtDisplay(badgeValue)}</span>
//                                       )}
//                                     </div>
//                                   </div>
//                                 )
//                               }))}

//                               {!isHistoricalView && data.spilloverFromPositions?.map((conn, idx) => {
//                                 const fromPos = allPositionMap[conn.from]
//                                 const toPos = allPositionMap[conn.to]
//                                 if (!fromPos || !toPos || !fromPos.occupant) return null
//                                 const fromIndex = structure.positions[fromPos.line].indexOf(fromPos.number)
//                                 const toIndex = structure.positions[toPos.line].indexOf(toPos.number)
//                                 if (fromIndex < 0 || toIndex < 0) return null
//                                 const fromCoords = getCoordsForPosition(fromPos.number, fromPos.line, fromIndex)
//                                 const toCoords = getCoordsForPosition(toPos.number, toPos.line, toIndex)

//                                 const connectionStyle = getTrimmedConnectionStyle(
//                                   fromCoords,
//                                   toCoords,
//                                   planetSize / 2,
//                                   planetSize / 2
//                                 )

//                                 return (
//                                   <div
//                                     key={`conn-${idx}`}
//                                     className="structural-connection"
//                                     style={connectionStyle}
//                                   />
//                                 )
//                               })}
//                             </div>
//                           )
//                         })()}
//                       </div>
//                     </>
//                   )}
//                 </div>

//                 <div className="orbit-legend glass-panel">
//                   <div className="legend-item"><div className="legend-dot mine"></div><span>Your Position</span></div>
//                   <div className="legend-item"><div className="legend-dot downline"></div><span>Downline</span></div>
//                   <div className="legend-item"><div className="legend-dot other"></div><span>Other User</span></div>
//                   <div className="legend-item"><div className="legend-dot empty"></div><span>Empty</span></div>
//                   <div className="legend-item"><div className="legend-dot gold"></div><span>Spillover Link</span></div>
//                 </div>

//                 {hoveredPosition && (
//                   <div className="orbit-hover-card glass-panel">
//                     {renderPositionTooltip(hoveredPosition)}
//                   </div>
//                 )}
//               </div>
//             )
//           })}
//         </div>

//         <div className="orbits-main-grid__right">
//           {(() => {
//             const level = Number(activeTab.replace('level', ''))
//             const data = orbitData[level]
//             const isLevelActive = !!viewedLevels[level]
//             const levelInfo = levelConfig[level]
//             const shouldShowAutoUpgradePanel = isLevelActive && level < 10 && level === highestViewedActiveLevel
//             const downlineAtLevel = downlineData[level] || []
//             const spilloverAtLevel = spilloverData[level] || []
//             const userLock = userLocks[level] || '0'
//             const upgradeReq = levelInfo?.upgradeReq || 0
//             const autoUpgradeCompleted = data?.autoUpgradeCompleted

//             return (
//               <>
//                 <div className="info-card glass-panel">
//                   <h3>Escrow & Auto-Upgrade</h3>
//                   {shouldShowAutoUpgradePanel ? (
//                     <>
//                       <div className="escrow-label">Locked for Level {levelInfo.nextLevel}</div>
//                       <div className="escrow-value">
//                         {formatUsdtDisplay(userLock)} / {upgradeReq} USDT
//                       </div>
//                       <div className="progress-bar">
//                         <div
//                           className="progress-fill"
//                           style={{ width: `${(parseFloat(userLock) / upgradeReq) * 100}%` }}
//                         />
//                       </div>
//                       <div className="escrow-status">
//                         {parseFloat(userLock) >= upgradeReq
//                           ? (autoUpgradeCompleted ? '✓ Auto-upgrade completed' : '✓ Ready for auto-upgrade')
//                           : `Need ${(upgradeReq - parseFloat(userLock)).toFixed(2)} more USDT`}
//                       </div>
//                     </>
//                   ) : (
//                     <div className="escrow-placeholder">Auto-upgrade activates on highest active level</div>
//                   )}
//                   <hr />
//                   <div className="total-earned">
//                     Total Earned: <strong>{data?.totalEarned || '0'} USDT</strong>
//                   </div>
//                 </div>

//                 {viewMode === 'downline' && !(selectedCycleByLevel[level] !== 'current') && (
//                   <div className="info-card glass-panel">
//                     <h3>Direct Downline</h3>
//                     {downlineAtLevel.length > 0 ? (
//                       <div className="user-list">
//                         {downlineAtLevel.map((d, idx) => (
//                           <div key={idx} className="user-item">
//                             <span className="user-address">{shortAddress(d.occupant || d.user)}</span>
//                             <span className="user-position">Pos {d.number || d.position}</span>
//                             <span className="user-amount">{formatUsdtDisplay(d.amount)} USDT</span>
//                           </div>
//                         ))}
//                       </div>
//                     ) : <div className="empty-message">No downline yet</div>}
//                   </div>
//                 )}

//                 {viewMode === 'downline' && !(selectedCycleByLevel[level] !== 'current') && (
//                   <div className="info-card glass-panel">
//                     <h3>Spillover / Other Occupants</h3>
//                     {spilloverAtLevel.length > 0 ? (
//                       <div className="user-list">
//                         {spilloverAtLevel.map((d, idx) => (
//                           <div key={idx} className="user-item">
//                             <span className="user-address">{shortAddress(d.occupant || d.user)}</span>
//                             <span className="user-position">Pos {d.number || d.position}</span>
//                             <span className="user-amount">{formatUsdtDisplay(d.amount)} USDT</span>
//                           </div>
//                         ))}
//                       </div>
//                     ) : <div className="empty-message">No other occupants</div>}
//                   </div>
//                 )}

//                 {selectedCycleByLevel[level] !== 'current' && (
//                   <div className="info-card glass-panel historical-insight-card">
//                     <h3>Historical Snapshot</h3>
//                     <div className="history-note">
//                       You are viewing stored orbit data for Cycle {selectedCycleByLevel[level]}.
//                       Position layout and occupants reflect that cycle snapshot, while total earned remains the current cumulative value.
//                     </div>
//                   </div>
//                 )}
//               </>
//             )
//           })()}
//         </div>
//       </div>

//       {showPositionModal && selectedPosition && (
//         <div className="modal-overlay" onClick={() => setShowPositionModal(false)}>
//           <div
//             className="position-modal glass-panel"
//             onClick={(e) => e.stopPropagation()}
//             role="dialog"
//             aria-modal="true"
//             tabIndex={-1}
//             ref={modalRef}
//           >
//             <button className="modal-close" onClick={() => setShowPositionModal(false)}>×</button>
//             <h3>Position #{selectedPosition.number}</h3>

//             <div className="modal-detail">
//               <span className="modal-label">Truth Type</span>
//               <span>{formatTruthLabel(selectedPosition.truthLabel || selectedPosition.positionInfo?.type || 'Unknown')}</span>
//             </div>

//             <div className="modal-detail">
//               <span className="modal-label">Line</span>
//               <span>Line {selectedPosition.line || selectedPosition.positionInfo?.line || 1}</span>
//             </div>

//             {selectedPosition.parentPosition && (
//               <div className="modal-detail">
//                 <span className="modal-label">Parent</span>
//                 <span>Position {selectedPosition.parentPosition}</span>
//               </div>
//             )}

//             <div className="modal-detail">
//               <span className="modal-label">Cycle View</span>
//               <span>
//                 {selectedPosition.isHistoricalPosition
//                   ? `Historical Cycle ${selectedPosition.cycleNumber || selectedPosition.activationCycleNumber || '—'}`
//                   : `Current Cycle ${selectedPosition.activationCycleNumber || '—'}`}
//               </span>
//             </div>

//             {selectedPosition.activationId > 0 && (
//               <div className="modal-detail">
//                 <span className="modal-label">Activation ID</span>
//                 <span>{selectedPosition.activationId}</span>
//               </div>
//             )}

//             <div className="modal-detail">
//               <span className="modal-label">Mirror Activation</span>
//               <span>{selectedPosition.isMirrorActivation ? 'Yes' : 'No'}</span>
//             </div>

//             {selectedPosition.occupant ? (
//               <>
//                 <div className="modal-detail">
//                   <span className="modal-label">Occupant</span>
//                   <span>{shortAddress(selectedPosition.occupant)}</span>
//                 </div>

//                 {(selectedPosition.referrer || selectedPosition.originalReferrer || selectedPosition.occupantReferrer) &&
//                   (selectedPosition.referrer || selectedPosition.originalReferrer || selectedPosition.occupantReferrer) !== ethers.ZeroAddress && (
//                     <div className="modal-detail">
//                       <span className="modal-label">Referrer</span>
//                       <span>{shortAddress(selectedPosition.referrer || selectedPosition.originalReferrer || selectedPosition.occupantReferrer)}</span>
//                     </div>
//                   )}

//                 <div className="modal-detail">
//                   <span className="modal-label">Gross Amount</span>
//                   <span>{formatUsdtDisplay(selectedPosition.amount || 0)} USDT</span>
//                 </div>

//                 <div className="modal-detail">
//                   <span className="modal-label">Net Amount</span>
//                   <span>{formatUsdtDisplay(getNetAmount(Number(selectedPosition.amount || 0)))} USDT</span>
//                 </div>

//                 {selectedPosition.timestamp > 0 && (
//                   <div className="modal-detail">
//                     <span className="modal-label">Filled</span>
//                     <span>{new Date(selectedPosition.timestamp * 1000).toLocaleString()}</span>
//                   </div>
//                 )}
//               </>
//             ) : (
//               <div className="modal-detail">
//                 <span className="modal-label">Status</span>
//                 <span>Empty - Available</span>
//               </div>
//             )}

//             <hr />

//             <div className="modal-detail">
//               <span className="modal-label">Indexed Events</span>
//               <span>{Number(selectedPosition.indexedEventCount || 0)}</span>
//             </div>

//             <div className="modal-detail">
//               <span className="modal-label">Indexed Receipts</span>
//               <span>{Number(selectedPosition.indexedReceiptCount || 0)}</span>
//             </div>

//             {!!selectedPosition.receiptTotals && (
//               <>
//                 <div className="modal-detail">
//                   <span className="modal-label">Receipt Gross</span>
//                   <span>{formatUsdtDisplay(selectedPosition.receiptTotals.gross || 0)} USDT</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">Liquid Paid</span>
//                   <span>{formatUsdtDisplay(selectedPosition.receiptTotals.liquidPaid || 0)} USDT</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">Escrow Locked</span>
//                   <span>{formatUsdtDisplay(selectedPosition.receiptTotals.escrowLocked || 0)} USDT</span>
//                 </div>
//               </>
//             )}

//             {!!selectedPosition.viewerReceiptBreakdown && (
//               <>
//                 <div className="modal-detail">
//                   <span className="modal-label">You Received (Gross)</span>
//                   <span>{formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.totalGross || 0)} USDT</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">You Received (Liquid)</span>
//                   <span>{formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.totalLiquid || 0)} USDT</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">You Received (Escrow)</span>
//                   <span>{formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.totalEscrow || 0)} USDT</span>
//                 </div>
//               </>
//             )}

//             {selectedPosition.positionInfo && (
//               <>
//                 <hr />
//                 <div className="modal-detail">
//                   <span className="modal-label">Rule Line Payment #</span>
//                   <span>{selectedPosition.positionInfo.linePaymentNumber || 0}</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">To Owner</span>
//                   <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToOwner || 0)} USDT</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">To Spillover 1</span>
//                   <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover1 || 0)} USDT</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">To Spillover 2</span>
//                   <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover2 || 0)} USDT</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">To Escrow</span>
//                   <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToEscrow || 0)} USDT</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">To Recycle</span>
//                   <span>{formatUsdtDisplay(selectedPosition.positionInfo.exactToRecycle || 0)} USDT</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">Auto Upgrade Source</span>
//                   <span>{selectedPosition.positionInfo.autoUpgradeEnabled ? 'Yes' : 'No'}</span>
//                 </div>
//                 <div className="modal-detail">
//                   <span className="modal-label">Stored Rule Data</span>
//                   <span>{selectedPosition.positionInfo.hasStoredRuleData ? 'Yes' : 'No'}</span>
//                 </div>
//               </>
//             )}

//             {!!selectedPosition.indexedReceipts?.length && (
//               <>
//                 <hr />
//                 <div className="modal-subtitle">Indexed Receipts</div>
//                 <div className="modal-record-list">
//                   {selectedPosition.indexedReceipts.slice(0, 6).map((receipt) => (
//                     <div key={`${receipt.txHash}-${receipt.logIndex}`} className="modal-record-item">
//                       <div><strong>{receipt.rawEventName || 'Receipt'}</strong> • {shortTx(receipt.txHash)}</div>
//                       <div>Receiver: {shortAddress(receipt.receiver)}</div>
//                       <div>Gross: {formatUsdtDisplay(receipt.grossAmount || 0)} USDT</div>
//                       <div>Liquid: {formatUsdtDisplay(receipt.liquidPaid || 0)} USDT</div>
//                     </div>
//                   ))}
//                 </div>
//               </>
//             )}

//             {!!selectedPosition.indexedEvents?.length && (
//               <>
//                 <hr />
//                 <div className="modal-subtitle">Indexed Events</div>
//                 <div className="modal-record-list">
//                   {selectedPosition.indexedEvents.slice(0, 6).map((event) => (
//                     <div key={`${event.txHash}-${event.logIndex}`} className="modal-record-item">
//                       <div><strong>{event.eventName}</strong> • {shortTx(event.txHash)}</div>
//                       {event.user && <div>User: {shortAddress(event.user)}</div>}
//                       {Number(event.position || 0) > 0 && <div>Position: {event.position}</div>}
//                       {Number(event.line || 0) > 0 && <div>Line: {event.line}</div>}
//                     </div>
//                   ))}
//                 </div>
//               </>
//             )}

//             {selectedPosition.detailsLoading && (
//               <div className="loading-detail">Loading full details...</div>
//             )}
//           </div>
//         </div>
//       )}
//     </section>
//   )
// }

// export default OrbitsPage












//=================================
// FIRST VERSION
//=================================
// import './OrbitsPage.css'
// import { useEffect, useState, useCallback, useRef } from 'react'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { ethers } from 'ethers'
// import {
//   fetchOrbitLevelsApi,
//   fetchOrbitLevelSnapshotApi,
//   fetchOrbitPositionDetailsApi,
//   fetchOrbitCycleSnapshotApi,
//   fetchAddressReceiptsApi,
//   fetchActivationReceiptsApi
// } from '../../Services/orbitsApi'

// const OrbitsPage = () => {
//   const { isConnected, account, connect } = useWallet()
//   const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()

//   // ============================================================
//   // STATE (mirroring original Orbits.jsx)
//   // ============================================================
//   const [orbitData, setOrbitData] = useState({})
//   const [userLocks, setUserLocks] = useState({})
//   const [downlineData, setDownlineData] = useState({})
//   const [spilloverData, setSpilloverData] = useState({})
//   const [orbitError, setOrbitError] = useState('')
//   const [viewMode, setViewMode] = useState('global')
//   const [selectedPosition, setSelectedPosition] = useState(null)
//   const [showPositionModal, setShowPositionModal] = useState(false)
//   const [hoveredPosition, setHoveredPosition] = useState(null)
//   const [showStructuralPreview, setShowStructuralPreview] = useState(false)
//   // const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
//   const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
//   const [isGalaxyMeasured, setIsGalaxyMeasured] = useState(false)
//   const [viewAddress, setViewAddress] = useState('')
//   const [inputAddress, setInputAddress] = useState('')
//   const [viewedLevels, setViewedLevels] = useState({})
//   const [cycleHistoryData, setCycleHistoryData] = useState({})
//   const [selectedCycleByLevel, setSelectedCycleByLevel] = useState({})
//   const [loadingCycleByLevel, setLoadingCycleByLevel] = useState({})
//   const [cycleHistorySupportByLevel, setCycleHistorySupportByLevel] = useState({})
//   const [linePaymentCountsByLevel, setLinePaymentCountsByLevel] = useState({})
//   const [viewAddressReceipts, setViewAddressReceipts] = useState([])
//   const [receiptBucketsByLevel, setReceiptBucketsByLevel] = useState({})
//   const [receiptsSupported, setReceiptsSupported] = useState(false)
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [isRefreshing, setIsRefreshing] = useState(false)
//   const [activeTab, setActiveTab] = useState('level1')
//   const [isLoadingOrbits, setIsLoadingOrbits] = useState(true)
//   const [loadingLevelsMap, setLoadingLevelsMap] = useState({})

//   // Refs for caching
//   const galaxyRef = useRef(null)
//   const modalRef = useRef(null)
//   const referrerCacheRef = useRef(new Map())
//   const viewedLevelsCacheRef = useRef(new Map())
//   const fetchIdRef = useRef(0)
//   const cycleHistoryCacheRef = useRef(new Map())
//   const receiptCacheRef = useRef(new Map())
//   const activationReceiptCacheRef = useRef(new Map())
//   const loadedLevelsRef = useRef(new Set())
//   const loadingLevelsRef = useRef(new Set())
//   const positionDetailsCacheRef = useRef(new Map())
//   const positionHydrationPromisesRef = useRef(new Map())

//   // ============================================================
//   // CONSTANTS
//   // ============================================================
//   const RECEIPT_TYPES = {
//     FOUNDER_PATH: 1,
//     DIRECT_OWNER: 2,
//     ROUTED_SPILLOVER: 3,
//     RECYCLE: 4
//   }

//   const orbitTypeConfig = {
//     P4: { name: 'P4', positions: 4, lines: 1, lineSizes: [4], levels: [1, 4, 7, 10] },
//     P12: { name: 'P12', positions: 12, lines: 2, lineSizes: [3, 9], levels: [2, 5, 8] },
//     P39: { name: 'P39', positions: 39, lines: 3, lineSizes: [3, 9, 27], levels: [3, 6, 9] }
//   }

//   const levelToOrbitType = {
//     1: 'P4', 2: 'P12', 3: 'P39', 4: 'P4', 5: 'P12',
//     6: 'P39', 7: 'P4', 8: 'P12', 9: 'P39', 10: 'P4'
//   }

//   const levelConfig = {
//     1: { price: 10, upgradeReq: 20, nextLevel: 2 },
//     2: { price: 20, upgradeReq: 40, nextLevel: 3 },
//     3: { price: 40, upgradeReq: 80, nextLevel: 4 },
//     4: { price: 80, upgradeReq: 160, nextLevel: 5 },
//     5: { price: 160, upgradeReq: 320, nextLevel: 6 },
//     6: { price: 320, upgradeReq: 640, nextLevel: 7 },
//     7: { price: 640, upgradeReq: 1280, nextLevel: 8 },
//     8: { price: 1280, upgradeReq: 2560, nextLevel: 9 },
//     9: { price: 2560, upgradeReq: 5120, nextLevel: 10 },
//     10: { price: 5120, upgradeReq: 10240, nextLevel: 11 }
//   }

//   // ============================================================
//   // HELPER FUNCTIONS (from original)
//   // ============================================================
//   const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

//   const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
//     try {
//       return await fn()
//     } catch (err) {
//       const isRateLimited = err?.code === -32005 || err?.status === 429 || String(err?.message || '').includes('rate limited')
//       if (!isRateLimited || retries <= 0) throw err
//       await delay(wait)
//       return withRetry(fn, retries - 1, wait * 2)
//     }
//   }, [])

//   const formatUsdt = useCallback((value) => {
//     try {
//       return Number(ethers.formatUnits(value ?? 0, 6))
//     } catch {
//       return 0
//     }
//   }, [])

//   const formatUsdtDisplay = useCallback((value) => {
//     const num = typeof value === 'number' ? value : Number(value || 0)
//     if (!Number.isFinite(num)) return '0'
//     if (Math.abs(num % 1) < 0.000001) return String(num)
//     return num.toFixed(6).replace(/\.?0+$/, '')
//   }, [])

//   const getNetAmount = useCallback((grossAmount) => {
//     const systemCharge = grossAmount * 0.10
//     return Math.max(0, grossAmount - systemCharge)
//   }, [])

//   const shortAddress = useCallback((addr) => {
//     if (!addr || addr === ethers.ZeroAddress) return '—'
//     return `${addr.slice(0, 8)}...${addr.slice(-6)}`
//   }, [])

//   const getCachedReferrer = useCallback(async (address) => {
//     const key = address.toLowerCase()
//     if (referrerCacheRef.current.has(key)) return referrerCacheRef.current.get(key)
//     const referrer = await withRetry(() => contracts.registration.getReferrer(address))
//     referrerCacheRef.current.set(key, referrer)
//     return referrer
//   }, [contracts, withRetry])


// // const resolveOccupantReferrer = useCallback(async (occupantAddress, backendItem = {}) => {
// //     if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return ethers.ZeroAddress
// //     const existingReferrer = backendItem?.referrer || backendItem?.originalReferrer || backendItem?.occupantReferrer || ethers.ZeroAddress
// //     if (existingReferrer && existingReferrer !== ethers.ZeroAddress) return existingReferrer
// //     try { return await getCachedReferrer(occupantAddress) } catch { return ethers.ZeroAddress }
// //   }, [getCachedReferrer])


// const resolveOccupantReferrer = useCallback(async (occupantAddress, backendItem = {}) => {
//     if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return ethers.ZeroAddress
//     const existingReferrer = backendItem?.referrer || backendItem?.originalReferrer || backendItem?.occupantReferrer || ethers.ZeroAddress
//     if (existingReferrer && existingReferrer !== ethers.ZeroAddress) return existingReferrer
//     try { return await getCachedReferrer(occupantAddress) } catch { return ethers.ZeroAddress }
// }, [getCachedReferrer])
//   const getStructuralParentPosition = (orbitType, position) => {
//     if (orbitType === 'P4') return null
//     if (orbitType === 'P12') {
//       if ([4, 7, 10].includes(position)) return 1
//       if ([5, 8, 11].includes(position)) return 2
//       if ([6, 9, 12].includes(position)) return 3
//       return null
//     }
//     if (orbitType === 'P39') {
//       const parentMap = {
//         4:1,7:1,10:1, 5:2,8:2,11:2, 6:3,9:3,12:3,
//         13:4,22:4,31:4, 14:5,23:5,32:5, 15:6,24:6,33:6,
//         16:7,25:7,34:7, 17:8,26:8,35:8, 18:9,27:9,36:9,
//         19:10,28:10,37:10, 20:11,29:11,38:11, 21:12,30:12,39:12
//       }
//       return parentMap[position] || null
//     }
//     return null
//   }

//   const getLineForPosition = (orbitType, position) => {
//     if (orbitType === 'P4') return 1
//     if (orbitType === 'P12') return position <= 3 ? 1 : 2
//     if (orbitType === 'P39') return position <= 3 ? 1 : (position <= 12 ? 2 : 3)
//     return 1
//   }

//   const getOrbitStructure = (orbitType) => {
//     return {
//       P4: {
//         lines: [1],
//         counts: { 1: 4 },
//         positions: { 1: [1, 2, 3, 4] },
//         startAngles: { 1: -90 },
//         customAngles: { 1: { 1: -90, 2: 0, 3: 90, 4: 180 } }
//       },
//       P12: {
//         lines: [1, 2],
//         counts: { 1: 3, 2: 9 },
//         positions: { 1: [1, 2, 3], 2: [4, 5, 6, 7, 8, 9, 10, 11, 12] },
//         startAngles: { 1: -90, 2: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: { 4: -138, 7: -102, 10: -66, 5: -18, 8: 18, 11: 54, 6: 102, 9: 138, 12: 174 }
//         }
//       },
//       P39: {
//         lines: [1, 2, 3],
//         counts: { 1: 3, 2: 9, 3: 27 },
//         positions: { 1: [1, 2, 3], 2: [4, 5, 6, 7, 8, 9, 10, 11, 12], 3: Array.from({ length: 27 }, (_, i) => i + 13) },
//         startAngles: { 1: -90, 2: -90, 3: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: { 4: -138, 7: -102, 10: -66, 5: -18, 8: 18, 11: 54, 6: 102, 9: 138, 12: 174 },
//           3: {
//             13: -145, 22: -133, 31: -121, 14: -25, 23: -13, 32: -1,
//             15: 95, 24: 107, 33: 119, 16: -109, 25: -97, 34: -85,
//             17: 11, 26: 23, 35: 35, 18: 131, 27: 143, 36: 155,
//             19: -73, 28: -61, 37: -49, 20: 47, 29: 59, 38: 71,
//             21: 167, 30: 179, 39: 191
//           }
//         }
//       }
//     }[orbitType] || { lines: [1], counts: { 1: 4 }, positions: { 1: [1, 2, 3, 4] }, startAngles: { 1: -90 }, customAngles: { 1: { 1: -90, 2: 0, 3: 90, 4: 180 } } }
//   }

//   const getStarConfig = (count = 36) => {
//     return Array.from({ length: count }, (_, i) => ({
//       id: i,
//       left: `${((i * 17.73) % 100).toFixed(2)}%`,
//       top: `${((i * 11.41 + 23) % 100).toFixed(2)}%`,
//       size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
//       delay: `${(i * 0.27).toFixed(2)}s`,
//       duration: `${(2.8 + (i % 5) * 0.7).toFixed(2)}s`,
//       drift: `${(7 + (i % 6) * 1.2).toFixed(2)}s`,
//       opacity: i % 4 === 0 ? 0.65 : 0.35
//     }))
//   }

//   const starConfig = getStarConfig(40)

//   const getPlanetSize = (orbitType, stageSize) => {
//     const base = orbitType === 'P39' ? 34 : 44
//     if (stageSize <= 260) return orbitType === 'P39' ? 22 : 30
//     if (stageSize <= 420) return orbitType === 'P39' ? 26 : 36
//     return base
//   }

//   const getCoreSize = (orbitType, stageSize) => {
//     if (stageSize <= 260) return orbitType === 'P39' ? 64 : 74
//     if (stageSize <= 420) return orbitType === 'P39' ? 72 : 82
//     return orbitType === 'P39' ? 80 : 96
//   }

//   const getPositionOnRing = (index, total, radiusPx, centerX, centerY, startAngle = -90) => {
//     const angle = (index / total) * 360 + startAngle
//     const radian = (angle * Math.PI) / 180
//     return { x: centerX + radiusPx * Math.cos(radian), y: centerY + radiusPx * Math.sin(radian), angle }
//   }

//   const getPositionOnAngle = (angle, radiusPx, centerX, centerY) => {
//     const radian = (angle * Math.PI) / 180
//     return { x: centerX + radiusPx * Math.cos(radian), y: centerY + radiusPx * Math.sin(radian), angle }
//   }

//   const deriveOccupantType = useCallback((occupantAddress, viewedAddr, backendItem = {}) => {
//     if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return 'empty'
//     if (!viewedAddr) return 'other'

//     const occupantLower = occupantAddress.toLowerCase()
//     const viewedLower = viewedAddr.toLowerCase()
//     if (occupantLower === viewedLower) return 'mine'

//     const truthLabel = String(backendItem?.truthLabel || '').toUpperCase()
//     const referrer = backendItem?.referrer || backendItem?.originalReferrer || backendItem?.occupantReferrer || ethers.ZeroAddress
//     const referrerLower = String(referrer || ethers.ZeroAddress).toLowerCase()

//     const viewerReceiptBreakdown = backendItem?.viewerReceiptBreakdown || {}
//     const viewerGotSomething = Number(viewerReceiptBreakdown.totalGross || 0) > 0 || Number(viewerReceiptBreakdown.totalLiquid || 0) > 0 || Number(viewerReceiptBreakdown.totalEscrow || 0) > 0

//     const isClearlyDownline = referrerLower === viewedLower || truthLabel === 'FOUNDER_PATH'
//     if (isClearlyDownline) return 'downline'
//     if (viewerGotSomething && truthLabel !== 'NO_RECEIPT') return 'other'
//     return 'other'
//   }, [])

//   const buildPositionInfoFromRuleView = (orbitType, position, level, ruleView, orbitOwnerAddress) => {
//     const parentPosition = getStructuralParentPosition(orbitType, position)
//     if (!ruleView) {
//       return {
//         type: 'unknown', payout: 0, escrow: 0, spillover: 0, description: '', toUpline: false,
//         line: getLineForPosition(orbitType, position), isAutoUpgradeSource: false, isRecyclePosition: false,
//         spillsTo: parentPosition, parentPosition, linePaymentNumber: 0, orbitOwner: orbitOwnerAddress,
//         spillover1Recipient: null, spillover2Recipient: null, exactToOwner: 0, exactToSpillover1: 0,
//         exactToSpillover2: 0, exactToEscrow: 0, exactToRecycle: 0, autoUpgradeEnabled: false,
//         isFounderNoReferrerPath: false, hasStoredRuleData: false
//       }
//     }
//     return {
//       type: (ruleView.toRecycle || 0) > 0 ? 'recycle' : (ruleView.toEscrow || 0) > 0 && (ruleView.toOwner || 0) > 0 ? 'payout-escrow' : (ruleView.toEscrow || 0) > 0 ? 'escrow' : (ruleView.toOwner || 0) > 0 ? 'payout' : 'unknown',
//       payout: ruleView.toOwner || 0, escrow: ruleView.toEscrow || 0, spillover: (ruleView.toSpillover1 || 0) + (ruleView.toSpillover2 || 0),
//       description: `${ruleView.toOwner || 0} USDT to owner, ${ruleView.toSpillover1 || 0} to spillover1, ${ruleView.toSpillover2 || 0} to spillover2, ${ruleView.toEscrow || 0} to escrow, ${ruleView.toRecycle || 0} to recycle`,
//       toUpline: ((ruleView.toSpillover1 || 0) + (ruleView.toSpillover2 || 0)) > 0, line: ruleView.line || 1,
//       isAutoUpgradeSource: (ruleView.toEscrow || 0) > 0, isRecyclePosition: (ruleView.toRecycle || 0) > 0,
//       spillsTo: parentPosition, parentPosition, linePaymentNumber: ruleView.linePaymentNumber || 0, orbitOwner: orbitOwnerAddress,
//       spillover1Recipient: ruleView.spillover1Recipient, spillover2Recipient: ruleView.spillover2Recipient,
//       exactToOwner: ruleView.toOwner || 0, exactToSpillover1: ruleView.toSpillover1 || 0, exactToSpillover2: ruleView.toSpillover2 || 0,
//       exactToEscrow: ruleView.toEscrow || 0, exactToRecycle: ruleView.toRecycle || 0,
//       autoUpgradeEnabled: !!ruleView.autoUpgradeEnabled, isFounderNoReferrerPath: !!ruleView.isFounderNoReferrerPath,
//       hasStoredRuleData: !!ruleView.hasStoredRuleData
//     }
//   }

//   const getPlanetBadgeValue = useCallback((position) => {
//     if (!position?.occupant) return 0
//     if (receiptsSupported && position.viewerReceiptBreakdown) {
//       return Number(position.viewerReceiptBreakdown.totalLiquid || 0)
//     }
//     return Number(position?.positionInfo?.exactToOwner || 0)
//   }, [receiptsSupported])

//   // ============================================================
//   // FETCH FUNCTIONS
//   // ============================================================
//   const fetchViewedLevels = useCallback(async (forceRefresh = false) => {
//     if (!viewAddress || !ethers.isAddress(viewAddress)) return
//     const key = viewAddress.toLowerCase()
//     if (!forceRefresh && viewedLevelsCacheRef.current.has(key)) {
//       setViewedLevels(viewedLevelsCacheRef.current.get(key))
//       return
//     }
//     try {
//       const result = await fetchOrbitLevelsApi(viewAddress)
//       const levels = Object.fromEntries((result?.levels || []).map((item) => [item.level, !!item.isActive]))
//       viewedLevelsCacheRef.current.set(key, levels)
//       setViewedLevels(levels)
//     } catch (err) {
//       console.error('Error fetching viewed levels:', err)
//     }
//   }, [viewAddress])

//   const fetchViewedAddressReceipts = useCallback(async (forceRefresh = false) => {
//     if (!viewAddress || !ethers.isAddress(viewAddress)) {
//       setViewAddressReceipts([]); setReceiptBucketsByLevel({}); setReceiptsSupported(false); return
//     }
//     const cacheKey = `${viewAddress.toLowerCase()}-backend-receipts`
//     if (!forceRefresh && receiptCacheRef.current.has(cacheKey)) {
//       const cachedReceipts = receiptCacheRef.current.get(cacheKey)
//       setViewAddressReceipts(cachedReceipts)
//       setReceiptsSupported(true)
//       return
//     }
//     try {
//       const result = await fetchAddressReceiptsApi(viewAddress)
//       const receipts = Array.isArray(result?.receipts) ? result.receipts : []
//       receiptCacheRef.current.set(cacheKey, receipts)
//       setViewAddressReceipts(receipts)
//       setReceiptsSupported(true)
//     } catch (err) {
//       console.error('Error fetching receipts:', err)
//       setReceiptsSupported(false)
//     }
//   }, [viewAddress])

//   const fetchStoredCycleForLevel = useCallback(async (level, cycleNumber) => {
//     if (!viewAddress || !ethers.isAddress(viewAddress) || !orbitData[level]) return []
//     const cacheKey = `${viewAddress.toLowerCase()}-${level}-${cycleNumber}`
//     if (cycleHistoryCacheRef.current.has(cacheKey)) return cycleHistoryCacheRef.current.get(cacheKey)
//     try {
//       const snapshot = await fetchOrbitCycleSnapshotApi(viewAddress, level, cycleNumber)
//       const orbitType = snapshot?.orbitType || levelToOrbitType[level]
//       const positions = await Promise.all((snapshot?.positions || []).map(async (pos) => {
//         const occupant = pos.occupant || null
//         const resolvedReferrer = await resolveOccupantReferrer(occupant, pos)
//         const occupantType = deriveOccupantType(occupant, viewAddress, { ...pos, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer })
//         const positionInfo = buildPositionInfoFromRuleView(orbitType, pos.number, level, null, viewAddress)
//         // return {
//         //   number: pos.number, level, cycleNumber, isHistoricalPosition: true, occupantType, occupant,
//         //   amount: pos.amount || '0', timestamp: Number(pos.timestamp || 0), positionInfo,
//         //   line: pos.line || positionInfo.line, spillsTo: positionInfo.spillsTo,
//         //   parentPosition: pos.parentPosition ?? positionInfo.parentPosition, truthLabel: pos.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT')
//         // }

//         return {
//             number: pos.number,
//             level,
//             cycleNumber,
//             isHistoricalPosition: true,
//             occupantType,
//             occupant,
//             amount: pos.amount || '0',
//             timestamp: Number(pos.timestamp || 0),
//             positionInfo,
//             line: pos.line || positionInfo.line,
//             spillsTo: positionInfo.spillsTo,
//             parentPosition: pos.parentPosition ?? positionInfo.parentPosition,
//             truthLabel: pos.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT'),
//             referrer: pos.referrer || resolvedReferrer,
//             originalReferrer: pos.originalReferrer || resolvedReferrer,
//             occupantReferrer: pos.occupantReferrer || resolvedReferrer
//           }
//       }))
//       cycleHistoryCacheRef.current.set(cacheKey, positions)
//       return positions
//     } catch (err) {
//       console.error(`Failed to fetch cycle history for level ${level}, cycle ${cycleNumber}:`, err)
//       throw err
//     }
//   }, [viewAddress, orbitData, deriveOccupantType, buildPositionInfoFromRuleView])

//   const loadCycleHistoryForLevel = useCallback(async (level, cycleNumber) => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress) || !orbitData[level]) return
//     const cycleKey = String(cycleNumber)
//     if (cycleHistoryData[level]?.[cycleKey]) return
//     setLoadingCycleByLevel(prev => ({ ...prev, [level]: true }))
//     try {
//       const positions = await fetchStoredCycleForLevel(level, cycleNumber)
//       setCycleHistoryData(prev => ({ ...prev, [level]: { ...(prev[level] || {}), [cycleKey]: positions } }))
//       setCycleHistorySupportByLevel(prev => ({ ...prev, [level]: true }))
//     } catch (err) {
//       setCycleHistorySupportByLevel(prev => ({ ...prev, [level]: false }))
//     } finally {
//       setLoadingCycleByLevel(prev => ({ ...prev, [level]: false }))
//     }
//   }, [contracts, viewAddress, orbitData, cycleHistoryData, fetchStoredCycleForLevel])

//   const fetchOrbitLevelData = useCallback(async (level, options = {}) => {
//     const { forceRefresh = false, silent = false } = options
//     if (!viewAddress || !ethers.isAddress(viewAddress) || level < 1 || level > 10) return

//     const fetchKey = `${viewAddress.toLowerCase()}-${level}`
//     const requestEpoch = fetchIdRef.current

//     if (forceRefresh) { loadedLevelsRef.current.delete(fetchKey); positionDetailsCacheRef.current.delete(fetchKey) }
//     if (!forceRefresh && loadedLevelsRef.current.has(fetchKey)) return
//     if (loadingLevelsRef.current.has(fetchKey)) return

//     loadingLevelsRef.current.add(fetchKey)
//     setLoadingLevelsMap(prev => ({ ...prev, [level]: true }))
//     if (!silent) { setOrbitError(''); setIsLoadingOrbits(true) }


//     try {
//       const snapshot = await fetchOrbitLevelSnapshotApi(viewAddress, level)
//       if (requestEpoch !== fetchIdRef.current) return

//       const orbitType = snapshot.orbitType
//       const config = orbitTypeConfig[orbitType]

      

//       const positions = await Promise.all((snapshot.positions || []).map(async (pos) => {
//         const occupant = pos.occupant || null
//         const resolvedReferrer = await resolveOccupantReferrer(occupant, pos)
//         const occupantType = deriveOccupantType(occupant, viewAddress, { ...pos, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer })
//         const positionInfo = buildPositionInfoFromRuleView(orbitType, pos.number, level, null, viewAddress)
//         return {
//           number: pos.number, level, occupantType, occupant, amount: pos.amount || '0', timestamp: pos.timestamp || 0,
//           positionInfo, line: pos.line || positionInfo.line, spillsTo: positionInfo.spillsTo,
//           parentPosition: pos.parentPosition ?? positionInfo.parentPosition, truthLabel: pos.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT')
//         }
//       }))

//       const myPositions = positions.filter(p => p.occupantType === 'mine').map(p => p.number)
//       // const downlinePositions = positions.filter(p => p.occupantType === 'downline').map(p => ({ position: p.number, user: p.occupant, amount: p.amount }))
//       // const otherOccupants = positions.filter(p => p.occupantType === 'other').map(p => ({ position: p.number, user: p.occupant, amount: p.amount }))
      
      
//       const owner = viewAddress?.toLowerCase()

//       const downlinePositions = positions.filter(p => {
//         if (!p.occupant) return false

//         const ref =
//           p.originalReferrer ||
//           p.referrer ||
//           p.occupantReferrer ||
//           ethers.ZeroAddress

//         return ref?.toLowerCase() === owner
//       })

//       const otherOccupants = positions.filter(p => {
//         if (!p.occupant) return false

//         const ref =
//           p.originalReferrer ||
//           p.referrer ||
//           p.occupantReferrer ||
//           ethers.ZeroAddress

//         return ref?.toLowerCase() !== owner &&
//               p.occupant.toLowerCase() !== owner
//       })
      
//       const structuralLinks = positions.filter(p => p.parentPosition && p.occupant).map(p => ({ from: p.number, to: p.parentPosition, user: p.occupant }))
//       const lineCounts = { line1: Number(snapshot.linePaymentCounts?.line1 || 0), line2: Number(snapshot.linePaymentCounts?.line2 || 0), line3: Number(snapshot.linePaymentCounts?.line3 || 0) }

//       const levelData = {
//         orbitType, config, currentIndex: Number(snapshot.orbitSummary?.currentPosition ?? 1),
//         escrowBalance: snapshot.orbitSummary?.escrowBalance || '0', autoUpgradeCompleted: !!snapshot.orbitSummary?.autoUpgradeCompleted,
//         positionsInLine1: Number(snapshot.orbitSummary?.positionsInLine1 ?? 0), positionsInLine2: Number(snapshot.orbitSummary?.positionsInLine2 ?? 0),
//         positionsInLine3: Number(snapshot.orbitSummary?.positionsInLine3 ?? 0), totalCycles: Number(snapshot.orbitSummary?.totalCycles ?? 0),
//         totalEarned: snapshot.orbitSummary?.totalEarned || '0', positions, myPositions, downlinePositions, otherOccupants,
//         spilloverFromPositions: structuralLinks, linePaymentCounts: lineCounts
//       }

//       setOrbitData(prev => ({ ...prev, [level]: levelData }))
//       setUserLocks(prev => ({ ...prev, [level]: snapshot.lockedForNextLevel || '0' }))
//       setDownlineData(prev => ({ ...prev, [level]: downlinePositions }))
//       setSpilloverData(prev => ({ ...prev, [level]: otherOccupants }))
//       setLinePaymentCountsByLevel(prev => ({ ...prev, [level]: lineCounts }))
//       loadedLevelsRef.current.add(fetchKey)
//     } catch (err) {
//       console.error(`Orbit sync error for level ${level}:`, err)
//       setOrbitError(err.message || 'Failed to load orbit data')
//     } finally {
//       loadingLevelsRef.current.delete(fetchKey)
//       setLoadingLevelsMap(prev => ({ ...prev, [level]: false }))
//       if (!silent) setIsLoadingOrbits(false)
//     }
//   }, [viewAddress, deriveOccupantType, resolveOccupantReferrer, buildPositionInfoFromRuleView])

//   const fetchAllOrbitData = useCallback(async (forceRefresh = false) => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
//     const match = activeTab?.match(/^level(\d+)$/)
//     const currentLevel = match ? Number(match[1]) : 1
//     if (forceRefresh) {
//       const lowerView = viewAddress.toLowerCase()
//       Array.from(loadedLevelsRef.current).forEach(key => { if (key.startsWith(`${lowerView}-`)) loadedLevelsRef.current.delete(key) })
//     }
//     await fetchOrbitLevelData(currentLevel, { forceRefresh, silent: false })
//   }, [contracts, viewAddress, activeTab, fetchOrbitLevelData])



//   const hydrateLivePositionDetails = useCallback(async (level, position) => {
//     if (!viewAddress || !ethers.isAddress(viewAddress) || !position) return position
//     const positionNumber = Number(position?.number || 0)
//     if (!positionNumber) return position
//     const cacheKey = `${viewAddress.toLowerCase()}-${level}-${positionNumber}`
//     if (position?.receiptsHydrated) { positionDetailsCacheRef.current.set(cacheKey, position); return position }
//     if (positionDetailsCacheRef.current.has(cacheKey)) return positionDetailsCacheRef.current.get(cacheKey)
//     if (positionHydrationPromisesRef.current.has(cacheKey)) return await positionHydrationPromisesRef.current.get(cacheKey)

//     const promise = (async () => {
//       const details = await fetchOrbitPositionDetailsApi(viewAddress, level, positionNumber)
//       const orbitType = details?.orbitType || levelToOrbitType[level]
//       const occupant = details?.occupant || null
//       const resolvedReferrer = await resolveOccupantReferrer(occupant, details)
//       const occupantType = deriveOccupantType(occupant, viewAddress, { ...details, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer })
//       const positionInfo = buildPositionInfoFromRuleView(orbitType, positionNumber, level, null, viewAddress)
//       const hydrated = { ...position, ...details, level, orbitType, occupantType, occupant, amount: details.amount || '0', timestamp: Number(details.timestamp || 0), positionInfo, receiptsHydrated: true }
//       positionDetailsCacheRef.current.set(cacheKey, hydrated)
//       setOrbitData(prev => {
//         const levelData = prev[level]
//         if (!levelData?.positions) return prev
//         return { ...prev, [level]: { ...levelData, positions: levelData.positions.map(item => item.number === positionNumber ? hydrated : item) } }
//       })
//       return hydrated
//     })()
//     positionHydrationPromisesRef.current.set(cacheKey, promise)
//     try { return await promise } finally { positionHydrationPromisesRef.current.delete(cacheKey) }
//   }, [viewAddress, deriveOccupantType, resolveOccupantReferrer, buildPositionInfoFromRuleView])


//   const hydrateHistoricalPositionDetails = useCallback(async (level, cycleNumber, position) => {
//   if (!viewAddress || !ethers.isAddress(viewAddress) || !position) return position
//   const positionNumber = Number(position?.number || 0)
//   if (!positionNumber) return position
//   const cacheKey = `${viewAddress.toLowerCase()}-${level}-${cycleNumber}-${positionNumber}`
  
//   if (position?.receiptsHydrated) return position
//   if (positionDetailsCacheRef.current.has(cacheKey)) return positionDetailsCacheRef.current.get(cacheKey)
  
//   try {
//     const cycleSnapshot = await fetchOrbitCycleSnapshotApi(viewAddress, level, cycleNumber)
//     const details = cycleSnapshot?.positions?.find(p => Number(p.number) === positionNumber)
//     if (!details) return position
    
//     const orbitType = details?.orbitType || levelToOrbitType[level]
//     const hydrated = {
//       ...position,
//       ...details,
//       level,
//       cycleNumber,
//       isHistoricalPosition: true,
//       receiptsHydrated: true
//     }
//     positionDetailsCacheRef.current.set(cacheKey, hydrated)
//     return hydrated
//   } catch (err) {
//     console.error('Error hydrating historical position:', err)
//     return position
//   }
// }, [viewAddress])
//   // ============================================================
//   // EVENT HANDLERS
//   // ============================================================
//   const applyViewerAddress = async () => {
//     if (!inputAddress || !ethers.isAddress(inputAddress)) { setOrbitError('Enter a valid wallet address'); return }
//     setOrbitError('')
//     const normalized = ethers.getAddress(inputAddress)
//     viewedLevelsCacheRef.current.delete(normalized.toLowerCase())
//     receiptCacheRef.current.delete(normalized.toLowerCase())
//     activationReceiptCacheRef.current.clear()
//     setInputAddress(normalized)
//     setViewAddress(normalized)
//     setViewMode('global')
//     setSelectedCycleByLevel({})
//     setCycleHistoryData({})
//     setCycleHistorySupportByLevel({})
//     setViewAddressReceipts([])
//     setReceiptBucketsByLevel({})
//     cycleHistoryCacheRef.current.clear()
//   }

//   const viewMyOrbit = () => {
//     if (!account) return
//     viewedLevelsCacheRef.current.delete(account.toLowerCase())
//     receiptCacheRef.current.delete(account.toLowerCase())
//     activationReceiptCacheRef.current.clear()
//     setOrbitError('')
//     setInputAddress(account)
//     setViewAddress(account)
//     setViewMode('global')
//     setSelectedCycleByLevel({})
//     setCycleHistoryData({})
//     setCycleHistorySupportByLevel({})
//     setViewAddressReceipts([])
//     setReceiptBucketsByLevel({})
//     cycleHistoryCacheRef.current.clear()
//   }

//   const refreshData = async () => {
//     if (!viewAddress || !ethers.isAddress(viewAddress)) return
//     setIsRefreshing(true)
//     try {
//       activationReceiptCacheRef.current.clear()
//       positionDetailsCacheRef.current.clear()
//       positionHydrationPromisesRef.current.clear()
//       receiptCacheRef.current.delete(`${viewAddress.toLowerCase()}-backend-receipts`)
//       viewedLevelsCacheRef.current.delete(viewAddress.toLowerCase())
//       await fetchViewedLevels(true)
//       await fetchViewedAddressReceipts(true)
//       await fetchAllOrbitData(true)
//       setLastUpdated(new Date().toLocaleTimeString())
//     } catch (err) { console.error('Refresh error:', err) }
//     finally { setIsRefreshing(false) }
//   }

//   const handlePositionClick = useCallback(async (position) => {
//     const level = Number(position?.level || activeTab?.replace('level', '') || 0)
//     const selectedCycle = selectedCycleByLevel[level] || 'current'
//     const isHistorical = selectedCycle !== 'current'
//     const initialPosition = { ...position, level, cycleNumber: isHistorical ? Number(selectedCycle) : 0, isHistoricalPosition: isHistorical, detailsLoading: true }
//     setSelectedPosition(initialPosition)
//     setShowPositionModal(true)
//     if (level < 1 || level > 10) { setSelectedPosition(prev => prev ? { ...prev, detailsLoading: false } : prev); return }
//     try {
//       const hydrated = isHistorical ? await hydrateHistoricalPositionDetails(level, Number(selectedCycle), initialPosition) : await hydrateLivePositionDetails(level, initialPosition)
//       setSelectedPosition(prev => (!prev || prev.number !== position.number || Number(prev.level || 0) !== level) ? prev : { ...hydrated, detailsLoading: false })
//     } catch (err) { setSelectedPosition(prev => prev ? { ...prev, detailsLoading: false } : prev) }
//   }, [activeTab, selectedCycleByLevel, hydrateHistoricalPositionDetails, hydrateLivePositionDetails])

//   const handleStructuralPreview = (position) => {
//     if (position.parentPosition) { setShowStructuralPreview(true); setTimeout(() => setShowStructuralPreview(false), 2000) }
//   }

//   const getHistoricalCycleSelection = useCallback((level) => selectedCycleByLevel[level] || 'current', [selectedCycleByLevel])
//   const setHistoricalCycleSelection = (level, cycleKey) => setSelectedCycleByLevel(prev => ({ ...prev, [level]: cycleKey }))

//   const getHighestViewedActiveLevel = useCallback(() => {
//     const active = Object.keys(viewedLevels).filter(level => viewedLevels[level]).map(Number).sort((a, b) => b - a)
//     return active[0] || 0
//   }, [viewedLevels])

//   // ============================================================
//   // EFFECTS
//   // ============================================================
//   useEffect(() => { if (isConnected) loadContracts().catch(console.error) }, [isConnected, loadContracts])
//   useEffect(() => { if (account && !viewAddress) { setViewAddress(account); setInputAddress(account) } }, [account, viewAddress])
//   useEffect(() => { if (contracts && viewAddress && ethers.isAddress(viewAddress)) fetchViewedLevels(true) }, [contracts, viewAddress, fetchViewedLevels])
//   useEffect(() => { if (contracts && viewAddress && ethers.isAddress(viewAddress)) fetchAllOrbitData() }, [contracts, viewAddress, fetchAllOrbitData])
//   useEffect(() => { if (viewAddress && ethers.isAddress(viewAddress)) fetchViewedAddressReceipts(true) }, [viewAddress, fetchViewedAddressReceipts])
//   useEffect(() => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
//     const match = activeTab?.match(/^level(\d+)$/)
//     if (!match) return
//     const level = Number(match[1])
//     if (!loadedLevelsRef.current.has(`${viewAddress.toLowerCase()}-${level}`)) fetchOrbitLevelData(level, { silent: false })
//   }, [activeTab, contracts, viewAddress, fetchOrbitLevelData])

//   // Update container size for galaxy rendering
//   // useEffect(() => {
//   //   const updateSize = () => {
//   //     if (galaxyRef.current) {
//   //       const { width, height } = galaxyRef.current.getBoundingClientRect()
//   //       if (width > 0 && height > 0 && (width !== containerSize.width || height !== containerSize.height)) setContainerSize({ width, height })
//   //     }
//   //   }
//   //   const timer = setTimeout(updateSize, 120)
//   //   window.addEventListener('resize', updateSize)
//   //   let resizeObserver
//   //   if (window.ResizeObserver) { resizeObserver = new ResizeObserver(updateSize); if (galaxyRef.current) resizeObserver.observe(galaxyRef.current) }
//   //   return () => { window.removeEventListener('resize', updateSize); if (resizeObserver) resizeObserver.disconnect(); clearTimeout(timer) }
//   // }, [activeTab, orbitData, cycleHistoryData, selectedCycleByLevel, containerSize.width, containerSize.height])

// //   useEffect(() => {
// //   const updateSize = () => {
// //     if (!galaxyRef.current) return

// //     const { width, height } = galaxyRef.current.getBoundingClientRect()
// //     if (width <= 0 || height <= 0) return

// //     setContainerSize((prev) => {
// //       if (prev.width === width && prev.height === height) return prev
// //       return { width, height }
// //     })

// //     setIsGalaxyMeasured(true)
// //   }

// //   updateSize()

// //   let rafId = 0
// //   const handleResize = () => {
// //     cancelAnimationFrame(rafId)
// //     rafId = requestAnimationFrame(updateSize)
// //   }

// //   window.addEventListener('resize', handleResize)

// //   let resizeObserver
// //   if (window.ResizeObserver && galaxyRef.current) {
// //     resizeObserver = new ResizeObserver(() => {
// //       cancelAnimationFrame(rafId)
// //       rafId = requestAnimationFrame(updateSize)
// //     })
// //     resizeObserver.observe(galaxyRef.current)
// //   }

// //   return () => {
// //     window.removeEventListener('resize', handleResize)
// //     if (resizeObserver) resizeObserver.disconnect()
// //     cancelAnimationFrame(rafId)
// //   }
// // }, [activeTab])

// // const activeLevelNumber = Number(activeTab.replace('level', ''))
// // const activeLevelData = orbitData[activeLevelNumber]

// const activeLevelNumber = Number(activeTab.replace('level', ''))
// const activeLevelData = orbitData[activeLevelNumber]
// const activeLevelReady = !!activeLevelData?.positions

// // useEffect(() => {
// //   let rafId = 0
// //   let resizeObserver

// //   const updateSize = () => {
// //     if (!galaxyRef.current) return

// //     const { width, height } = galaxyRef.current.getBoundingClientRect()
// //     if (width <= 0 || height <= 0) return

// //     setContainerSize((prev) => {
// //       if (prev.width === width && prev.height === height) return prev
// //       return { width, height }
// //     })

// //     setIsGalaxyMeasured(true)
// //   }

// //   const scheduleUpdate = () => {
// //     cancelAnimationFrame(rafId)
// //     rafId = requestAnimationFrame(updateSize)
// //   }

// //   scheduleUpdate()

// //   window.addEventListener('resize', scheduleUpdate)

// //   if (window.ResizeObserver && galaxyRef.current) {
// //     resizeObserver = new ResizeObserver(scheduleUpdate)
// //     resizeObserver.observe(galaxyRef.current)
// //   }

// //   return () => {
// //     window.removeEventListener('resize', scheduleUpdate)
// //     if (resizeObserver) resizeObserver.disconnect()
// //     cancelAnimationFrame(rafId)
// //   }
// // }, [activeTab, orbitData])


// // useEffect(() => {
// //   if (!activeLevelData) return

// //   let rafId = 0
// //   let resizeObserver

// //   const updateSize = () => {
// //     if (!galaxyRef.current) return

// //     const { width, height } = galaxyRef.current.getBoundingClientRect()
// //     if (width <= 0 || height <= 0) return

// //     setContainerSize((prev) => {
// //       if (prev.width === width && prev.height === height) return prev
// //       return { width, height }
// //     })

// //     setIsGalaxyMeasured(true)
// //   }

// //   const scheduleUpdate = () => {
// //     cancelAnimationFrame(rafId)
// //     rafId = requestAnimationFrame(updateSize)
// //   }

// //   scheduleUpdate()

// //   window.addEventListener('resize', scheduleUpdate)

// //   if (window.ResizeObserver && galaxyRef.current) {
// //     resizeObserver = new ResizeObserver(scheduleUpdate)
// //     resizeObserver.observe(galaxyRef.current)
// //   }

// //   return () => {
// //     window.removeEventListener('resize', scheduleUpdate)
// //     if (resizeObserver) resizeObserver.disconnect()
// //     cancelAnimationFrame(rafId)
// //   }
// // }, [activeTab, activeLevelData])

// // useEffect(() => {
// //   if (!activeLevelData) return

// //   let rafId = 0
// //   let resizeObserver
// //   let settleTimer

// //   const updateSize = () => {
// //     if (!galaxyRef.current) return

// //     const rect = galaxyRef.current.getBoundingClientRect()
// //     const width = Math.round(rect.width)
// //     const height = Math.round(rect.height)

// //     if (width <= 0 || height <= 0) return

// //     setContainerSize((prev) => {
// //       if (prev.width === width && prev.height === height) return prev
// //       return { width, height }
// //     })

// //     setIsGalaxyMeasured(true)
// //   }

// //   const scheduleUpdate = () => {
// //     cancelAnimationFrame(rafId)
// //     rafId = requestAnimationFrame(updateSize)
// //   }

// //   setIsGalaxyMeasured(false)

// //   scheduleUpdate()
// //   settleTimer = setTimeout(() => {
// //     scheduleUpdate()
// //   }, 120)

// //   window.addEventListener('resize', scheduleUpdate)

// //   if (window.ResizeObserver) {
// //     resizeObserver = new ResizeObserver(() => {
// //       scheduleUpdate()
// //     })
// //     if (galaxyRef.current) {
// //       resizeObserver.observe(galaxyRef.current)
// //     }
// //   }

// //   return () => {
// //     window.removeEventListener('resize', scheduleUpdate)
// //     if (resizeObserver) resizeObserver.disconnect()
// //     cancelAnimationFrame(rafId)
// //     clearTimeout(settleTimer)
// //   }
// // }, [activeTab, activeLevelData])

// useEffect(() => {
//   if (!activeLevelReady) return

//   let rafId = 0
//   let resizeObserver = null
//   let settleTimer = null

//   const updateSize = () => {
//     if (!galaxyRef.current) return

//     const rect = galaxyRef.current.getBoundingClientRect()
//     const width = Math.round(rect.width)
//     const height = Math.round(rect.height)

//     if (width <= 0 || height <= 0) return

//     setContainerSize((prev) => {
//       if (prev.width === width && prev.height === height) return prev
//       return { width, height }
//     })

//     setIsGalaxyMeasured(true)
//   }

//   const scheduleUpdate = () => {
//     cancelAnimationFrame(rafId)
//     rafId = requestAnimationFrame(updateSize)
//   }

//   scheduleUpdate()
//   settleTimer = window.setTimeout(scheduleUpdate, 120)

//   window.addEventListener('resize', scheduleUpdate)

//   if (window.ResizeObserver && galaxyRef.current) {
//     resizeObserver = new ResizeObserver(scheduleUpdate)
//     resizeObserver.observe(galaxyRef.current)
//   }

//   return () => {
//     window.removeEventListener('resize', scheduleUpdate)
//     if (resizeObserver) resizeObserver.disconnect()
//     cancelAnimationFrame(rafId)
//     if (settleTimer) window.clearTimeout(settleTimer)
//   }
// }, [activeTab, activeLevelReady])

// // useEffect(() => {
// //   setIsGalaxyMeasured(false)
// //   setContainerSize({ width: 0, height: 0 })
// // }, [activeTab])

//   // Clear caches when viewAddress changes
//   useEffect(() => {
//     loadedLevelsRef.current.clear(); loadingLevelsRef.current.clear(); activationReceiptCacheRef.current.clear()
//     positionDetailsCacheRef.current.clear(); positionHydrationPromisesRef.current.clear(); fetchIdRef.current += 1
//     setOrbitData({}); setUserLocks({}); setDownlineData({}); setSpilloverData({}); setLinePaymentCountsByLevel({})
//     // setCycleHistoryData({}); setSelectedCycleByLevel({}); setLoadingCycleByLevel({}); setCycleHistorySupportByLevel({}); setLoadingLevelsMap({}); setIsLoadingOrbits(true)
//     setCycleHistoryData({})
//     setSelectedCycleByLevel({})
//     setLoadingCycleByLevel({})
//     setCycleHistorySupportByLevel({})
//     setLoadingLevelsMap({})
//     setIsLoadingOrbits(true)
//     setIsGalaxyMeasured(false)
//     setContainerSize({ width: 0, height: 0 })
//   }, [viewAddress])



//   useEffect(() => {
//     if (!showPositionModal) return

//     const previousBodyOverflow = document.body.style.overflow
//     document.body.style.overflow = 'hidden'
//     modalRef.current?.focus()

//     const handleKeyDown = (event) => {
//       if (event.key === 'Escape') {
//         setShowPositionModal(false)
//       }
//     }

//     window.addEventListener('keydown', handleKeyDown)

//     return () => {
//       document.body.style.overflow = previousBodyOverflow
//       window.removeEventListener('keydown', handleKeyDown)
//     }
//   }, [showPositionModal])

//   // ============================================================
//   // RENDER HELPERS
//   // ============================================================
//   const renderPositionTooltip = (position) => {
//     const viewerBreakdown = position.viewerReceiptBreakdown || {
//       totalGross: 0,
//       totalLiquid: 0,
//       totalEscrow: 0,
//     }

//     if (!position.occupant) {
//       return (
//         <div className="custom-tooltip">
//           <div className="custom-tooltip__title">Position #{position.number}</div>
//           <div className="custom-tooltip__row">
//             <span>Status</span>
//             <strong>Empty</strong>
//           </div>
//           <div className="custom-tooltip__row">
//             <span>Line</span>
//             <strong>Line {position.line || 1}</strong>
//           </div>
//           {position.parentPosition && (
//             <div className="custom-tooltip__row">
//               <span>Parent</span>
//               <strong>Position {position.parentPosition}</strong>
//             </div>
//           )}
//         </div>
//       )
//     }

//     return (
//       <div className="custom-tooltip">
//         <div className="custom-tooltip__title">Position #{position.number}</div>
//         <div className="custom-tooltip__row">
//           <span>Occupant</span>
//           <strong>{shortAddress(position.occupant)}</strong>
//         </div>
//         <div className="custom-tooltip__row">
//           <span>Line</span>
//           <strong>Line {position.line || 1}</strong>
//         </div>
//         <div className="custom-tooltip__row">
//           <span>Type</span>
//           <strong>{position.truthLabel || position.positionInfo?.type || 'Unknown'}</strong>
//         </div>
//         <div className="custom-tooltip__row">
//           <span>Net Amount</span>
//           <strong>{formatUsdtDisplay(getNetAmount(Number(position.amount || 0)))} USDT</strong>
//         </div>
//         {position.parentPosition && (
//           <div className="custom-tooltip__row">
//             <span>Parent</span>
//             <strong>Position {position.parentPosition}</strong>
//           </div>
//         )}
//         <div className="custom-tooltip__row">
//           <span>You Received</span>
//           <strong>{formatUsdtDisplay(viewerBreakdown.totalLiquid || 0)} USDT</strong>
//         </div>
//       </div>
//     )
//   }

//   if (!isConnected) {
//     return (
//       <section className="orbits-page">
//         <div className="orbits-hero">
//           <div className="orbits-hero__content">
//             <h1 className="orbits-hero__title">Orbits System</h1>
//             <p className="orbits-hero__description">Connect your wallet to monitor your orbit positions and track placements.</p>
//             <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
//           </div>
//         </div>
//       </section>
//     )
//   }

//   // if (contractsLoading || isLoadingOrbits) {
//   //   return (
//   //     <section className="orbits-page">
//   //       <div className="loading-container">
//   //         <div className="spinner"></div>
//   //         <p>Loading orbit data...</p>
//   //       </div>
//   //     </section>
//   //   )
//   // }

//   if (contractsLoading) {
//   return (
//     <section className="orbits-page">
//       <div className="loading-container">
//         <div className="spinner"></div>
//         <p>Loading orbit data...</p>
//       </div>
//     </section>
//   )
// }

//   const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
//   const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
//   const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()
//   const highestViewedActiveLevel = getHighestViewedActiveLevel()

//   return (
//     <section className="orbits-page">
//       {/* Address Input Bar */}
//       <div className="address-input-bar glass-panel">
//         <input type="text" className="address-input" placeholder="Enter wallet address (0x...)" value={inputAddress} onChange={(e) => setInputAddress(e.target.value)} />
//         <button className="address-btn" onClick={applyViewerAddress}>Load Address</button>
//         <button className="address-btn secondary" onClick={viewMyOrbit}>My Orbits</button>
//         <button className="refresh-btn" onClick={refreshData} disabled={isRefreshing}>⟳</button>
//         <span className="last-sync">Last sync: {lastUpdated}</span>
//       </div>

//       {/* View Toggle */}
//       <div className="view-toggle-bar glass-panel">
//         <button className={`toggle-btn ${viewMode === 'global' ? 'active' : ''}`} onClick={() => setViewMode('global')}>Orbit View</button>
//         <button className={`toggle-btn ${viewMode === 'downline' ? 'active' : ''}`} onClick={() => setViewMode('downline')}>
//           Downline View {totalDownline > 0 && <span className="badge">{totalDownline}</span>}
//         </button>
//         <div className="receipt-status">Receipts: {receiptsSupported ? '✓ ON' : 'OFF'}</div>
//       </div>

//       {/* Level Tabs */}
//       <div className="level-tabs glass-panel">
//         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
//           const orbitType = levelToOrbitType[level]
//           const isActive = !!viewedLevels[level]
//           const isLoaded = !!orbitData[level]
//           const isLoading = loadingLevelsMap[level]
//           return (
//             <button
//               key={level}
//               className={`level-tab ${activeTab === `level${level}` ? 'active' : ''} ${!isActive ? 'inactive' : ''}`}
//               onClick={() => setActiveTab(`level${level}`)}
//             >
//               L{level} ({orbitType})
//               {!isActive && <span className="inactive-badge">off</span>}
//               {isLoading && <span className="loading-dot" />}
//             </button>
//           )
//         })}
//       </div>

//       <div className="orbit-tips glass-panel">
//         <p>
//           ⚡ You may experience a slight delay when opening <strong>P12</strong> and <strong>P39</strong> orbits.
//         </p>
//         <p>
//           🚀 [Blinking Yellow Dots] Other orbit visuals load silently when you click the next level while viewing your current level.
//         </p>
//       </div>

//       {/* Main Content */}
//       <div className="orbits-main-grid">
//         <div className="orbits-main-grid__left">
//           {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
//             if (activeTab !== `level${level}`) return null
//             const data = orbitData[level]
//             // if (!data) return <div key={level} className="loading-level">Loading Level {level}...</div>
//             if (!data) {
//                 return (
//                   <div key={level} className="loading-level glass-panel orbit-loading-panel">
//                     <div className="spinner"></div>
//                     <p>Loading Level {level} orbit...</p>
//                   </div>
//                 )
//               }

//             const orbitType = data.orbitType
//             const config = orbitTypeConfig[orbitType]
//             const positions = data.positions || []
//             const currentIndex = data.currentIndex
//             const totalCycles = data.totalCycles
//             const autoUpgradeCompleted = data.autoUpgradeCompleted
//             const lineCounts = linePaymentCountsByLevel[level] || data.linePaymentCounts || { line1: 0, line2: 0, line3: 0 }
//             const isLevelActive = !!viewedLevels[level]
//             const levelInfo = levelConfig[level]

//             const totalCompletedCycles = Number(totalCycles || 0)
//             const availableCycleNumbers = Array.from({ length: totalCompletedCycles }, (_, idx) => idx + 1)
//             const selectedCycle = getHistoricalCycleSelection(level)
//             const isHistoricalView = selectedCycle !== 'current'
//             const historicalPositions = (cycleHistoryData[level]?.[String(selectedCycle)] || []).map(pos => ({ ...pos, level }))
//             const displayedPositions = isHistoricalView ? historicalPositions : positions

//               const ownerLower = viewAddress?.toLowerCase()

//               const displayedDownlineCount = displayedPositions.filter((p) => {
//                 if (!p.occupant) return false

//                 if (isHistoricalView) {
//                   const ref =
//                     p.originalReferrer ||
//                     p.referrer ||
//                     p.occupantReferrer ||
//                     ethers.ZeroAddress

//                   if (ref && ref !== ethers.ZeroAddress) {
//                     return ref.toLowerCase() === ownerLower
//                   }

//                   return p.occupantType === 'downline'
//                 }

//                 const ref =
//                   p.originalReferrer ||
//                   p.referrer ||
//                   p.occupantReferrer ||
//                   ethers.ZeroAddress

//                 return ref.toLowerCase() === ownerLower
//               }).length

//               const displayedOtherCount = displayedPositions.filter((p) => {
//                 if (!p.occupant) return false
//                 if (p.occupant.toLowerCase() === ownerLower) return false

//                 if (isHistoricalView) {
//                   const ref =
//                     p.originalReferrer ||
//                     p.referrer ||
//                     p.occupantReferrer ||
//                     ethers.ZeroAddress

//                   if (ref && ref !== ethers.ZeroAddress) {
//                     return ref.toLowerCase() !== ownerLower
//                   }

//                   return p.occupantType === 'other'
//                 }

//                 const ref =
//                   p.originalReferrer ||
//                   p.referrer ||
//                   p.occupantReferrer ||
//                   ethers.ZeroAddress

//                 return ref.toLowerCase() !== ownerLower
//               }).length

//             const positionsByLine = {}
//             displayedPositions.forEach(pos => { const line = pos.line; if (!positionsByLine[line]) positionsByLine[line] = []; positionsByLine[line].push(pos) })
//             const structure = getOrbitStructure(orbitType)
//             const filledCountForDisplay = displayedPositions.filter(p => p.occupant).length
//             const filledCount = (data.positions || []).filter(p => p.occupant).length
//             const currentIndexForDisplay = isHistoricalView ? Math.min(filledCountForDisplay, config.positions) : (currentIndex || 0)
//             const shouldShowAutoUpgradePanel = isLevelActive && level < 10 && level === highestViewedActiveLevel
//             const isLoadingCycleHistory = !!loadingCycleByLevel[level]
//             const hasCycleSupport = cycleHistorySupportByLevel[level]
//             const showCycleButtons = totalCompletedCycles > 0

//             return (
//               // <div key={level} className="orbit-content">
//               <div key={level} className={`orbit-content ${loadingLevelsMap[level] ? 'is-level-loading' : ''}`}>
//                 {/* Orbit Header */}
//                 <div className="orbit-header-card glass-panel">
//                   <div className="orbit-header-info">
//                     <span>Level {level} ({orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}</span>
//                     {totalCycles > 0 && <span className="cycle-badge">Cycle {Number(totalCycles) + 1}</span>}
//                     {isHistoricalView && <span className="history-badge">Stored Snapshot • Cycle {selectedCycle}</span>}
//                   </div>
//                   <div className="orbit-header-stats">
//                     {!isLevelActive && <span className="badge-secondary">Inactive</span>}
//                     {/* {data.downlinePositions?.length > 0 && <span className="badge-warning">⬇ {data.downlinePositions.length}</span>}
//                     {data.otherOccupants?.length > 0 && <span className="badge-info">🔄 {data.otherOccupants.length}</span>} */}
//                     {displayedDownlineCount > 0 && <span className="badge-warning">⬇ {displayedDownlineCount}</span>}
//                     {displayedOtherCount > 0 && <span className="badge-info">🔄 {displayedOtherCount}</span>}
//                     {/* <span className="badge-primary">{currentIndexForDisplay}/{config.positions} filled</span> */}
//                     <span className="badge-primary">{filledCountForDisplay}/{config.positions} filled</span>
//                   </div>
//                 </div>

//                 <div className={`orbit-summary-strip glass-panel ${isHistoricalView ? 'is-historical' : 'is-live'}`}>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Level</span>
//                     <strong className="orbit-summary-value">L{level}</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Orbit</span>
//                     <strong className="orbit-summary-value">{orbitType}</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Filled</span>
//                     {/* <strong className="orbit-summary-value">{currentIndexForDisplay}/{config.positions}</strong> */}
//                     <strong className="orbit-summary-value">{filledCountForDisplay}/{config.positions}</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">{isHistoricalView ? 'Snapshot Cycle' : 'Current Cycle'}</span>
//                     <strong className="orbit-summary-value">
//                       {isHistoricalView ? `Cycle ${selectedCycle}` : `Cycle ${Number(totalCycles) + 1}`}
//                     </strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Downline</span>
//                     {/* <strong className="orbit-summary-value">{data.downlinePositions?.length || 0}</strong> */}
//                     <strong className="orbit-summary-value">{displayedDownlineCount}</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Other Occupants</span>
//                     {/* <strong className="orbit-summary-value">{data.otherOccupants?.length || 0}</strong> */}
//                     <strong className="orbit-summary-value">{displayedOtherCount}</strong>

//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">Total Earned</span>
//                     <strong className="orbit-summary-value">{formatUsdtDisplay(data?.totalEarned || 0)} USDT</strong>
//                   </div>
//                   <div className="orbit-summary-item">
//                     <span className="orbit-summary-label">{level < 10 ? `Locked for L${level + 1}` : 'Top Level'}</span>
//                     <strong className="orbit-summary-value">
//                       {level < 10 ? `${formatUsdtDisplay(userLocks[level] || 0)} USDT` : 'Complete'}
//                     </strong>
//                   </div>
//                 </div>

//                 {/* Cycle Switcher */}
//                 {showCycleButtons && (
//                   <div className="cycle-switcher glass-panel">
//                     <span className="cycle-label">Cycle View:</span>
//                     <button className={`cycle-btn ${selectedCycle === 'current' ? 'active' : ''}`} onClick={() => setHistoricalCycleSelection(level, 'current')}>Current</button>
//                     {availableCycleNumbers.map(cycleNum => (
//                       <button key={cycleNum} className={`cycle-btn ${selectedCycle === cycleNum ? 'active' : ''}`} onClick={() => { setHistoricalCycleSelection(level, cycleNum); loadCycleHistoryForLevel(level, cycleNum) }}>Cycle {cycleNum}</button>
//                     ))}
//                   </div>
//                 )}

//                 {/* Galaxy Visualization */}
//                 {/* <div className={`galaxy-container ${orbitType.toLowerCase()} ${!isGalaxyMeasured ? 'is-measuring' : ''}`} ref={galaxyRef}> */}
//                 <div
//                     key={`galaxy-${activeTab}`}
//                     className={`galaxy-container ${orbitType.toLowerCase()} ${!isGalaxyMeasured ? 'is-measuring' : ''}`}
//                     ref={galaxyRef}
//                   >
//                   {!isGalaxyMeasured ? (
//                     <div className="galaxy-measure-loader">
//                       <div className="spinner"></div>
//                       <p>Preparing orbit view...</p>
//                     </div>
//                   ) : (
//                     <>
//                       <div className="star-field">
//                         {starConfig.map((star) => (
//                           <span
//                             key={star.id}
//                             className="star"
//                             style={{
//                               left: star.left,
//                               top: star.top,
//                               width: star.size,
//                               height: star.size,
//                               opacity: star.opacity,
//                               animationDelay: `${star.delay}, ${star.delay}`,
//                               animationDuration: `${star.duration}, ${star.drift}`,
//                             }}
//                           />
//                         ))}
//                       </div>

//                     <div className="galaxy-inner">
//                     {(() => {
//                       // const outerWidth = containerSize.width > 0 ? containerSize.width : 560
//                       // const outerHeight = containerSize.height > 0 ? containerSize.height : 560
//                       const outerWidth = containerSize.width || galaxyRef.current?.clientWidth || 560
//                       const outerHeight = containerSize.height || galaxyRef.current?.clientHeight || outerWidth
//                       const usableSize = Math.max(Math.min(outerWidth, outerHeight) * 0.86, 240)
//                       const stageSize = usableSize
//                       const centerX = stageSize / 2
//                       const centerY = stageSize / 2

//                       const planetSize = getPlanetSize(orbitType, stageSize)
//                       const coreSize = getCoreSize(orbitType, stageSize)
//                       const nodePadding = planetSize / 2 + 8
//                       const coreClearance = coreSize / 2 + planetSize / 2 + 18

//                       let ringRadiiPx = { 1: Math.max(coreClearance, stageSize * 0.22), 2: stageSize * 0.34, 3: stageSize * 0.45 }
//                       if (orbitType === 'P4') ringRadiiPx = { 1: Math.max(coreClearance + 6, stageSize * 0.31) }
//                       if (orbitType === 'P12') ringRadiiPx = { 1: Math.max(coreClearance + 4, stageSize * 0.19), 2: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding) }
//                       if (orbitType === 'P39') ringRadiiPx = { 1: Math.max(coreClearance, stageSize * 0.17), 2: Math.min(stageSize * 0.32, (stageSize / 2) - nodePadding - 34), 3: Math.min(stageSize * 0.47, (stageSize / 2) - nodePadding) }
//                       Object.keys(ringRadiiPx).forEach(key => { ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding) })

//                       const createEmptyPosition = (posNumber, lineNum) => ({
//                         number: posNumber, occupantType: 'empty', occupant: null, amount: '0', timestamp: 0,
//                         positionInfo: buildPositionInfoFromRuleView(orbitType, posNumber, level, null, viewAddress),
//                         line: lineNum, spillsTo: null, parentPosition: getStructuralParentPosition(orbitType, posNumber),
//                         truthLabel: 'NO_RECEIPT', payoutReceipts: [], viewerReceiptBreakdown: { totalLiquid: 0 }
//                       })

//                       const allPositionMap = {}
//                       structure.lines.forEach(lineNum => {
//                         const linePositions = positionsByLine[lineNum] || []
//                         structure.positions[lineNum].forEach(posNumber => {
//                           allPositionMap[posNumber] = linePositions.find(p => p.number === posNumber) || createEmptyPosition(posNumber, lineNum)
//                         })
//                       })

//                       const getCoordsForPosition = (posNumber, lineNum, index) => {
//                         const customAngle = structure.customAngles?.[lineNum]?.[posNumber]
//                         if (typeof customAngle === 'number') return getPositionOnAngle(customAngle, ringRadiiPx[lineNum], centerX, centerY)
//                         return getPositionOnRing(index, structure.counts[lineNum], ringRadiiPx[lineNum], centerX, centerY, structure.startAngles[lineNum])
//                       }

//                       const getTrimmedConnectionStyle = (fromCoords, toCoords, fromRadius, toRadius) => {
//                       const dx = toCoords.x - fromCoords.x
//                       const dy = toCoords.y - fromCoords.y
//                       const distance = Math.sqrt(dx * dx + dy * dy)

//                       if (!distance) {
//                         return {
//                           width: 0,
//                           left: fromCoords.x,
//                           top: fromCoords.y,
//                           transform: 'rotate(0deg)',
//                         }
//                       }

//                       const ux = dx / distance
//                       const uy = dy / distance

//                       const startX = fromCoords.x + ux * fromRadius
//                       const startY = fromCoords.y + uy * fromRadius
//                       const endX = toCoords.x - ux * toRadius
//                       const endY = toCoords.y - uy * toRadius

//                       const trimmedDx = endX - startX
//                       const trimmedDy = endY - startY
//                       const trimmedDistance = Math.max(0, Math.sqrt(trimmedDx * trimmedDx + trimmedDy * trimmedDy))
//                       const angle = Math.atan2(trimmedDy, trimmedDx) * 180 / Math.PI

//                       return {
//                         width: trimmedDistance,
//                         left: startX,
//                         top: startY,
//                         transform: `rotate(${angle}deg)`,
//                       }
//                     }

//                       return (
//                         <div className="galaxy-stage" style={{ width: stageSize, height: stageSize, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
//                           {/* <div className={`orbit-core ${!isLevelActive ? 'inactive' : ''}`} style={{ width: coreSize, height: coreSize }}> */}
//                           <div
//                               className={`orbit-core ${
//                                 !isLevelActive
//                                   ? 'inactive'
//                                   : isViewingSelf
//                                   ? 'is-self-active'
//                                   : 'is-viewing-member'
//                               }`}
//                               style={{ width: coreSize, height: coreSize }}
//                             >
//                             <span className="core-label">{isLevelActive ? 'ORBIT' : 'INACTIVE'}</span>
//                             <span className="core-value">{isLevelActive ? (isViewingSelf ? 'YOU' : shortAddress(viewAddress)) : 'LOCKED'}</span>
//                           </div>

//                           {structure.lines.map(lineNum => {
//                             const linePositions = positionsByLine[lineNum] || []
//                             const filledCount = linePositions.filter(p => p.occupant).length
//                             const diameter = ringRadiiPx[lineNum] * 2
//                             const arrivals = lineNum === 1 ? lineCounts.line1 : lineNum === 2 ? lineCounts.line2 : lineCounts.line3
//                             return (
//                               <div key={lineNum} className={`orbit-ring line${lineNum}`} style={{ width: diameter, height: diameter }}>
//                                 <span className="ring-label">LINE {lineNum}</span>
//                                 <span className="ring-stats">{filledCount}/{structure.positions[lineNum].length} • arrivals: {arrivals}</span>
//                               </div>
//                             )
//                           })}

//                           {/* Grey structural connections */}
//                           {structure.lines.map(lineNum => structure.positions[lineNum].map(posNumber => {
//                             const parentPos = getStructuralParentPosition(orbitType, posNumber)
//                             if (!parentPos) return null
//                             const fromPos = allPositionMap[posNumber]
//                             const toPos = allPositionMap[parentPos]
//                             if (!fromPos || !toPos) return null
//                             const fromIndex = structure.positions[fromPos.line].indexOf(fromPos.number)
//                             const toIndex = structure.positions[toPos.line].indexOf(toPos.number)
//                             if (fromIndex < 0 || toIndex < 0) return null
//                             const fromCoords = getCoordsForPosition(fromPos.number, fromPos.line, fromIndex)
//                             const toCoords = getCoordsForPosition(toPos.number, toPos.line, toIndex)
//                             // const dx = toCoords.x - fromCoords.x
//                             // const dy = toCoords.y - fromCoords.y
//                             // const distance = Math.sqrt(dx * dx + dy * dy)
//                             // const angle = Math.atan2(dy, dx) * 180 / Math.PI
//                             // return <div key={`grey-conn-${posNumber}`} className="structural-connection-grey" style={{ width: distance, left: fromCoords.x, top: fromCoords.y, transform: `rotate(${angle}deg)` }} />
                          
//                             const connectionStyle = getTrimmedConnectionStyle(
//                               fromCoords,
//                               toCoords,
//                               planetSize / 2,
//                               planetSize / 2
//                             )

//                             return (
//                               <div
//                                 key={`grey-conn-${posNumber}`}
//                                 className="structural-connection-grey"
//                                 style={connectionStyle}
//                               />
//                             )
//                           }))}

//                           {/* Position nodes */}
//                           {structure.lines.map(lineNum => structure.positions[lineNum].map((posNumber, index) => {
//                             const pos = allPositionMap[posNumber]
//                             const coords = getCoordsForPosition(posNumber, lineNum, index)
//                             let planetClass = 'planet-node '
//                             if (pos.occupantType === 'mine') planetClass += 'mine'
//                             else if (pos.occupantType === 'downline') planetClass += 'downline'
//                             else if (pos.occupantType === 'other') planetClass += 'other'
//                             else planetClass += 'empty'
//                             if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) planetClass += ' structural-preview'
//                             const badgeValue = getPlanetBadgeValue(pos)
//                             return (
//                               <div
//                                 key={pos.number}
//                                 className={planetClass}
//                                 style={{ left: coords.x, top: coords.y, width: planetSize, height: planetSize, transform: 'translate(-50%, -50%)', '--index': index }}
//                                 onClick={() => handlePositionClick(pos)}
//                                 onMouseEnter={() => { setHoveredPosition(pos); if (pos.parentPosition) handleStructuralPreview(pos) }}
//                                 onMouseLeave={() => setHoveredPosition(null)}
//                                 // title={pos.occupant ? shortAddress(pos.occupant) : 'Empty'}
//                               >
//                                 <div className="planet-content">
//                                   <span className="node-number">{pos.number}</span>
//                                   {pos.occupant && pos.occupantType === 'mine' && <span className="planet-icon">👤</span>}
//                                   {pos.occupant && pos.occupantType === 'downline' && <span className="planet-icon">⬇</span>}
//                                   {pos.occupant && pos.occupantType === 'other' && <span className="planet-icon">👥</span>}
//                                   {badgeValue > 0 && pos.occupantType !== 'mine' && <span className="planet-earn-badge">{formatUsdtDisplay(badgeValue)}</span>}
//                                 </div>
//                               </div>
//                             )
//                           }))}

//                           {/* Golden spillover connections */}
//                           {!isHistoricalView && data.spilloverFromPositions?.map((conn, idx) => {
//                             const fromPos = allPositionMap[conn.from]
//                             const toPos = allPositionMap[conn.to]
//                             if (!fromPos || !toPos || !fromPos.occupant) return null
//                             const fromIndex = structure.positions[fromPos.line].indexOf(fromPos.number)
//                             const toIndex = structure.positions[toPos.line].indexOf(toPos.number)
//                             if (fromIndex < 0 || toIndex < 0) return null
//                             const fromCoords = getCoordsForPosition(fromPos.number, fromPos.line, fromIndex)
//                             const toCoords = getCoordsForPosition(toPos.number, toPos.line, toIndex)
//                             // const dx = toCoords.x - fromCoords.x
//                             // const dy = toCoords.y - fromCoords.y
//                             // const distance = Math.sqrt(dx * dx + dy * dy)
//                             // const angle = Math.atan2(dy, dx) * 180 / Math.PI
//                             // return <div key={`conn-${idx}`} className="structural-connection" style={{ width: distance, left: fromCoords.x, top: fromCoords.y, transform: `rotate(${angle}deg)` }} />
                          
//                           const connectionStyle = getTrimmedConnectionStyle(
//                               fromCoords,
//                               toCoords,
//                               planetSize / 2,
//                               planetSize / 2
//                             )

//                             return (
//                               <div
//                                 key={`conn-${idx}`}
//                                 className="structural-connection"
//                                 style={connectionStyle}
//                               />
//                             )
//                           })}
//                         </div>
//                       )
//                     })()}
//                   </div>
//                       </>
//                   )}
//                 </div>
//                 {/* Legend */}
//                 <div className="orbit-legend glass-panel">
//                   <div className="legend-item"><div className="legend-dot mine"></div><span>Your Position</span></div>
//                   <div className="legend-item"><div className="legend-dot downline"></div><span>Downline</span></div>
//                   <div className="legend-item"><div className="legend-dot other"></div><span>Other User</span></div>
//                   <div className="legend-item"><div className="legend-dot empty"></div><span>Empty</span></div>
//                   <div className="legend-item"><div className="legend-dot gold"></div><span>Spillover Link</span></div>
//                 </div>

//                 {hoveredPosition && (
//                   <div className="orbit-hover-card glass-panel">
//                     {renderPositionTooltip(hoveredPosition)}
//                   </div>
//                 )}
//               </div>
//             )
//           })}
//         </div>

//         <div className="orbits-main-grid__right">
//           {/* Right panel content - matches original */}
//           {(() => {
//             const level = Number(activeTab.replace('level', ''))
//             const data = orbitData[level]
//             const isLevelActive = !!viewedLevels[level]
//             const levelInfo = levelConfig[level]
//             const shouldShowAutoUpgradePanel = isLevelActive && level < 10 && level === highestViewedActiveLevel
//             const downlineAtLevel = downlineData[level] || []
//             const spilloverAtLevel = spilloverData[level] || []
//             const userLock = userLocks[level] || '0'
//             const upgradeReq = levelInfo?.upgradeReq || 0
//             const autoUpgradeCompleted = data?.autoUpgradeCompleted

//             return (
//               <>
//                 {/* Escrow & Auto-Upgrade */}
//                 <div className="info-card glass-panel">
//                   <h3>Escrow & Auto-Upgrade</h3>
//                   {shouldShowAutoUpgradePanel ? (
//                     <>
//                       <div className="escrow-label">Locked for Level {levelInfo.nextLevel}</div>
//                       <div className="escrow-value">{formatUsdtDisplay(userLock)} / {upgradeReq} USDT</div>
//                       <div className="progress-bar"><div className="progress-fill" style={{ width: `${(parseFloat(userLock) / upgradeReq) * 100}%` }} /></div>
//                       <div className="escrow-status">
//                         {parseFloat(userLock) >= upgradeReq ? (autoUpgradeCompleted ? '✓ Auto-upgrade completed' : '✓ Ready for auto-upgrade') : `Need ${(upgradeReq - parseFloat(userLock)).toFixed(2)} more USDT`}
//                       </div>
//                     </>
//                   ) : (
//                     <div className="escrow-placeholder">Auto-upgrade activates on highest active level</div>
//                   )}
//                   <hr />
//                   <div className="total-earned">Total Earned: <strong>{data?.totalEarned || '0'} USDT</strong></div>
//                 </div>

//                 {/* Downline List (when in downline view) */}
//                 {viewMode === 'downline' && !(selectedCycleByLevel[level] !== 'current') && (
//                   <div className="info-card glass-panel">
//                     <h3>Direct Downline</h3>
//                     {downlineAtLevel.length > 0 ? (
//                       <div className="user-list">
//                         {downlineAtLevel.map((d, idx) => (
//                           <div key={idx} className="user-item">
//                             <span className="user-address">{shortAddress(d.user)}</span>
//                             <span className="user-position">Pos {d.position}</span>
//                             <span className="user-amount">{formatUsdtDisplay(d.amount)} USDT</span>
//                           </div>
//                         ))}
//                       </div>
//                     ) : <div className="empty-message">No downline yet</div>}
//                   </div>
//                 )}

//                 {/* Spillover List */}
//                 {viewMode === 'downline' && !(selectedCycleByLevel[level] !== 'current') && (
//                   <div className="info-card glass-panel">
//                     <h3>Spillover / Other Occupants</h3>
//                     {spilloverAtLevel.length > 0 ? (
//                       <div className="user-list">
//                         {spilloverAtLevel.map((d, idx) => (
//                           <div key={idx} className="user-item">
//                             <span className="user-address">{shortAddress(d.user)}</span>
//                             <span className="user-position">Pos {d.position}</span>
//                             <span className="user-amount">{formatUsdtDisplay(d.amount)} USDT</span>
//                           </div>
//                         ))}
//                       </div>
//                     ) : <div className="empty-message">No other occupants</div>}
//                   </div>
//                 )}

//                 {/* Historical view note */}
//                 {selectedCycleByLevel[level] !== 'current' && (
//                   <div className="info-card glass-panel historical-insight-card">
//                     <h3>Historical Snapshot</h3>
//                     <div className="history-note">
//                       You are viewing stored orbit data for Cycle {selectedCycleByLevel[level]}.
//                       Position layout and occupants reflect that cycle snapshot, while total earned remains the current cumulative value.
//                     </div>
//                   </div>
//                 )}
//               </>
//             )
//           })()}
//         </div>
//       </div>

//       {/* Position Modal */}
//       {showPositionModal && selectedPosition && (
//         <div className="modal-overlay" onClick={() => setShowPositionModal(false)}>
//           <div className="position-modal glass-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabIndex={-1} ref={modalRef}>
//             <button className="modal-close" onClick={() => setShowPositionModal(false)}>×</button>
//             <h3>Position #{selectedPosition.number}</h3>
//             <div className="modal-detail"><span className="modal-label">Type</span><span>{selectedPosition.truthLabel || selectedPosition.positionInfo?.type || 'Unknown'}</span></div>
//             <div className="modal-detail"><span className="modal-label">Line</span><span>Line {selectedPosition.positionInfo?.line || 1}</span></div>
//             {selectedPosition.parentPosition && <div className="modal-detail"><span className="modal-label">Parent</span><span>Position {selectedPosition.parentPosition}</span></div>}
//             {selectedPosition.occupant ? (
//               <>
//                 <div className="modal-detail"><span className="modal-label">Occupant</span><span>{shortAddress(selectedPosition.occupant)}</span></div>
//                 <div className="modal-detail"><span className="modal-label">Amount (net)</span><span>{formatUsdtDisplay(getNetAmount(Number(selectedPosition.amount)))} USDT</span></div>
//                 {selectedPosition.timestamp > 0 && <div className="modal-detail"><span className="modal-label">Filled</span><span>{new Date(selectedPosition.timestamp * 1000).toLocaleString()}</span></div>}
//               </>
//             ) : <div className="modal-detail"><span className="modal-label">Status</span><span>Empty - Available</span></div>}
//             {selectedPosition.detailsLoading && <div className="loading-detail">Loading full details...</div>}
//           </div>
//         </div>
//       )}
//     </section>
//   )
// }

// export default OrbitsPage
