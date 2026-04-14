import './OrbitsPage.css'
import { useEffect, useState, useCallback, useRef } from 'react'
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

  // ============================================================
  // STATE (mirroring original Orbits.jsx)
  // ============================================================
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

  // Refs for caching
  const galaxyRef = useRef(null)
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

  // ============================================================
  // CONSTANTS
  // ============================================================
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

  // ============================================================
  // HELPER FUNCTIONS (from original)
  // ============================================================
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
    try {
      return await fn()
    } catch (err) {
      const isRateLimited = err?.code === -32005 || err?.status === 429 || String(err?.message || '').includes('rate limited')
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

  const getCachedReferrer = useCallback(async (address) => {
    const key = address.toLowerCase()
    if (referrerCacheRef.current.has(key)) return referrerCacheRef.current.get(key)
    const referrer = await withRetry(() => contracts.registration.getReferrer(address))
    referrerCacheRef.current.set(key, referrer)
    return referrer
  }, [contracts, withRetry])


// const resolveOccupantReferrer = useCallback(async (occupantAddress, backendItem = {}) => {
//     if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return ethers.ZeroAddress
//     const existingReferrer = backendItem?.referrer || backendItem?.originalReferrer || backendItem?.occupantReferrer || ethers.ZeroAddress
//     if (existingReferrer && existingReferrer !== ethers.ZeroAddress) return existingReferrer
//     try { return await getCachedReferrer(occupantAddress) } catch { return ethers.ZeroAddress }
//   }, [getCachedReferrer])


const resolveOccupantReferrer = useCallback(async (occupantAddress, backendItem = {}) => {
    if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return ethers.ZeroAddress
    const existingReferrer = backendItem?.referrer || backendItem?.originalReferrer || backendItem?.occupantReferrer || ethers.ZeroAddress
    if (existingReferrer && existingReferrer !== ethers.ZeroAddress) return existingReferrer
    try { return await getCachedReferrer(occupantAddress) } catch { return ethers.ZeroAddress }
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
        4:1,7:1,10:1, 5:2,8:2,11:2, 6:3,9:3,12:3,
        13:4,22:4,31:4, 14:5,23:5,32:5, 15:6,24:6,33:6,
        16:7,25:7,34:7, 17:8,26:8,35:8, 18:9,27:9,36:9,
        19:10,28:10,37:10, 20:11,29:11,38:11, 21:12,30:12,39:12
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
            13: -145, 22: -133, 31: -121, 14: -25, 23: -13, 32: -1,
            15: 95, 24: 107, 33: 119, 16: -109, 25: -97, 34: -85,
            17: 11, 26: 23, 35: 35, 18: 131, 27: 143, 36: 155,
            19: -73, 28: -61, 37: -49, 20: 47, 29: 59, 38: 71,
            21: 167, 30: 179, 39: 191
          }
        }
      }
    }[orbitType] || { lines: [1], counts: { 1: 4 }, positions: { 1: [1, 2, 3, 4] }, startAngles: { 1: -90 }, customAngles: { 1: { 1: -90, 2: 0, 3: 90, 4: 180 } } }
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
    const referrer = backendItem?.referrer || backendItem?.originalReferrer || backendItem?.occupantReferrer || ethers.ZeroAddress
    const referrerLower = String(referrer || ethers.ZeroAddress).toLowerCase()

    const viewerReceiptBreakdown = backendItem?.viewerReceiptBreakdown || {}
    const viewerGotSomething = Number(viewerReceiptBreakdown.totalGross || 0) > 0 || Number(viewerReceiptBreakdown.totalLiquid || 0) > 0 || Number(viewerReceiptBreakdown.totalEscrow || 0) > 0

    const isClearlyDownline = referrerLower === viewedLower || truthLabel === 'FOUNDER_PATH'
    if (isClearlyDownline) return 'downline'
    if (viewerGotSomething && truthLabel !== 'NO_RECEIPT') return 'other'
    return 'other'
  }, [])

  const buildPositionInfoFromRuleView = (orbitType, position, level, ruleView, orbitOwnerAddress) => {
    const parentPosition = getStructuralParentPosition(orbitType, position)
    if (!ruleView) {
      return {
        type: 'unknown', payout: 0, escrow: 0, spillover: 0, description: '', toUpline: false,
        line: getLineForPosition(orbitType, position), isAutoUpgradeSource: false, isRecyclePosition: false,
        spillsTo: parentPosition, parentPosition, linePaymentNumber: 0, orbitOwner: orbitOwnerAddress,
        spillover1Recipient: null, spillover2Recipient: null, exactToOwner: 0, exactToSpillover1: 0,
        exactToSpillover2: 0, exactToEscrow: 0, exactToRecycle: 0, autoUpgradeEnabled: false,
        isFounderNoReferrerPath: false, hasStoredRuleData: false
      }
    }
    return {
      type: (ruleView.toRecycle || 0) > 0 ? 'recycle' : (ruleView.toEscrow || 0) > 0 && (ruleView.toOwner || 0) > 0 ? 'payout-escrow' : (ruleView.toEscrow || 0) > 0 ? 'escrow' : (ruleView.toOwner || 0) > 0 ? 'payout' : 'unknown',
      payout: ruleView.toOwner || 0, escrow: ruleView.toEscrow || 0, spillover: (ruleView.toSpillover1 || 0) + (ruleView.toSpillover2 || 0),
      description: `${ruleView.toOwner || 0} USDT to owner, ${ruleView.toSpillover1 || 0} to spillover1, ${ruleView.toSpillover2 || 0} to spillover2, ${ruleView.toEscrow || 0} to escrow, ${ruleView.toRecycle || 0} to recycle`,
      toUpline: ((ruleView.toSpillover1 || 0) + (ruleView.toSpillover2 || 0)) > 0, line: ruleView.line || 1,
      isAutoUpgradeSource: (ruleView.toEscrow || 0) > 0, isRecyclePosition: (ruleView.toRecycle || 0) > 0,
      spillsTo: parentPosition, parentPosition, linePaymentNumber: ruleView.linePaymentNumber || 0, orbitOwner: orbitOwnerAddress,
      spillover1Recipient: ruleView.spillover1Recipient, spillover2Recipient: ruleView.spillover2Recipient,
      exactToOwner: ruleView.toOwner || 0, exactToSpillover1: ruleView.toSpillover1 || 0, exactToSpillover2: ruleView.toSpillover2 || 0,
      exactToEscrow: ruleView.toEscrow || 0, exactToRecycle: ruleView.toRecycle || 0,
      autoUpgradeEnabled: !!ruleView.autoUpgradeEnabled, isFounderNoReferrerPath: !!ruleView.isFounderNoReferrerPath,
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

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================
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
      setViewAddressReceipts([]); setReceiptBucketsByLevel({}); setReceiptsSupported(false); return
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
      const positions = await Promise.all((snapshot?.positions || []).map(async (pos) => {
        const occupant = pos.occupant || null
        const resolvedReferrer = await resolveOccupantReferrer(occupant, pos)
        const occupantType = deriveOccupantType(occupant, viewAddress, { ...pos, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer })
        const positionInfo = buildPositionInfoFromRuleView(orbitType, pos.number, level, null, viewAddress)
        return {
          number: pos.number, level, cycleNumber, isHistoricalPosition: true, occupantType, occupant,
          amount: pos.amount || '0', timestamp: Number(pos.timestamp || 0), positionInfo,
          line: pos.line || positionInfo.line, spillsTo: positionInfo.spillsTo,
          parentPosition: pos.parentPosition ?? positionInfo.parentPosition, truthLabel: pos.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT')
        }
      }))
      cycleHistoryCacheRef.current.set(cacheKey, positions)
      return positions
    } catch (err) {
      console.error(`Failed to fetch cycle history for level ${level}, cycle ${cycleNumber}:`, err)
      throw err
    }
  }, [viewAddress, orbitData, deriveOccupantType, buildPositionInfoFromRuleView])

  const loadCycleHistoryForLevel = useCallback(async (level, cycleNumber) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress) || !orbitData[level]) return
    const cycleKey = String(cycleNumber)
    if (cycleHistoryData[level]?.[cycleKey]) return
    setLoadingCycleByLevel(prev => ({ ...prev, [level]: true }))
    try {
      const positions = await fetchStoredCycleForLevel(level, cycleNumber)
      setCycleHistoryData(prev => ({ ...prev, [level]: { ...(prev[level] || {}), [cycleKey]: positions } }))
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

    if (forceRefresh) { loadedLevelsRef.current.delete(fetchKey); positionDetailsCacheRef.current.delete(fetchKey) }
    if (!forceRefresh && loadedLevelsRef.current.has(fetchKey)) return
    if (loadingLevelsRef.current.has(fetchKey)) return

    loadingLevelsRef.current.add(fetchKey)
    setLoadingLevelsMap(prev => ({ ...prev, [level]: true }))
    if (!silent) { setOrbitError(''); setIsLoadingOrbits(true) }


    try {
      const snapshot = await fetchOrbitLevelSnapshotApi(viewAddress, level)
      if (requestEpoch !== fetchIdRef.current) return

      const orbitType = snapshot.orbitType
      const config = orbitTypeConfig[orbitType]

      

      const positions = await Promise.all((snapshot.positions || []).map(async (pos) => {
        const occupant = pos.occupant || null
        const resolvedReferrer = await resolveOccupantReferrer(occupant, pos)
        const occupantType = deriveOccupantType(occupant, viewAddress, { ...pos, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer })
        const positionInfo = buildPositionInfoFromRuleView(orbitType, pos.number, level, null, viewAddress)
        return {
          number: pos.number, level, occupantType, occupant, amount: pos.amount || '0', timestamp: pos.timestamp || 0,
          positionInfo, line: pos.line || positionInfo.line, spillsTo: positionInfo.spillsTo,
          parentPosition: pos.parentPosition ?? positionInfo.parentPosition, truthLabel: pos.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT')
        }
      }))

      const myPositions = positions.filter(p => p.occupantType === 'mine').map(p => p.number)
      const downlinePositions = positions.filter(p => p.occupantType === 'downline').map(p => ({ position: p.number, user: p.occupant, amount: p.amount }))
      const otherOccupants = positions.filter(p => p.occupantType === 'other').map(p => ({ position: p.number, user: p.occupant, amount: p.amount }))
      const structuralLinks = positions.filter(p => p.parentPosition && p.occupant).map(p => ({ from: p.number, to: p.parentPosition, user: p.occupant }))
      const lineCounts = { line1: Number(snapshot.linePaymentCounts?.line1 || 0), line2: Number(snapshot.linePaymentCounts?.line2 || 0), line3: Number(snapshot.linePaymentCounts?.line3 || 0) }

      const levelData = {
        orbitType, config, currentIndex: Number(snapshot.orbitSummary?.currentPosition ?? 1),
        escrowBalance: snapshot.orbitSummary?.escrowBalance || '0', autoUpgradeCompleted: !!snapshot.orbitSummary?.autoUpgradeCompleted,
        positionsInLine1: Number(snapshot.orbitSummary?.positionsInLine1 ?? 0), positionsInLine2: Number(snapshot.orbitSummary?.positionsInLine2 ?? 0),
        positionsInLine3: Number(snapshot.orbitSummary?.positionsInLine3 ?? 0), totalCycles: Number(snapshot.orbitSummary?.totalCycles ?? 0),
        totalEarned: snapshot.orbitSummary?.totalEarned || '0', positions, myPositions, downlinePositions, otherOccupants,
        spilloverFromPositions: structuralLinks, linePaymentCounts: lineCounts
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
  }, [viewAddress, deriveOccupantType, resolveOccupantReferrer, buildPositionInfoFromRuleView])

  const fetchAllOrbitData = useCallback(async (forceRefresh = false) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    const match = activeTab?.match(/^level(\d+)$/)
    const currentLevel = match ? Number(match[1]) : 1
    if (forceRefresh) {
      const lowerView = viewAddress.toLowerCase()
      Array.from(loadedLevelsRef.current).forEach(key => { if (key.startsWith(`${lowerView}-`)) loadedLevelsRef.current.delete(key) })
    }
    await fetchOrbitLevelData(currentLevel, { forceRefresh, silent: false })
  }, [contracts, viewAddress, activeTab, fetchOrbitLevelData])



  const hydrateLivePositionDetails = useCallback(async (level, position) => {
    if (!viewAddress || !ethers.isAddress(viewAddress) || !position) return position
    const positionNumber = Number(position?.number || 0)
    if (!positionNumber) return position
    const cacheKey = `${viewAddress.toLowerCase()}-${level}-${positionNumber}`
    if (position?.receiptsHydrated) { positionDetailsCacheRef.current.set(cacheKey, position); return position }
    if (positionDetailsCacheRef.current.has(cacheKey)) return positionDetailsCacheRef.current.get(cacheKey)
    if (positionHydrationPromisesRef.current.has(cacheKey)) return await positionHydrationPromisesRef.current.get(cacheKey)

    const promise = (async () => {
      const details = await fetchOrbitPositionDetailsApi(viewAddress, level, positionNumber)
      const orbitType = details?.orbitType || levelToOrbitType[level]
      const occupant = details?.occupant || null
      const resolvedReferrer = await resolveOccupantReferrer(occupant, details)
      const occupantType = deriveOccupantType(occupant, viewAddress, { ...details, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer })
      const positionInfo = buildPositionInfoFromRuleView(orbitType, positionNumber, level, null, viewAddress)
      const hydrated = { ...position, ...details, level, orbitType, occupantType, occupant, amount: details.amount || '0', timestamp: Number(details.timestamp || 0), positionInfo, receiptsHydrated: true }
      positionDetailsCacheRef.current.set(cacheKey, hydrated)
      setOrbitData(prev => {
        const levelData = prev[level]
        if (!levelData?.positions) return prev
        return { ...prev, [level]: { ...levelData, positions: levelData.positions.map(item => item.number === positionNumber ? hydrated : item) } }
      })
      return hydrated
    })()
    positionHydrationPromisesRef.current.set(cacheKey, promise)
    try { return await promise } finally { positionHydrationPromisesRef.current.delete(cacheKey) }
  }, [viewAddress, deriveOccupantType, resolveOccupantReferrer, buildPositionInfoFromRuleView])


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
    
    const orbitType = details?.orbitType || levelToOrbitType[level]
    const hydrated = {
      ...position,
      ...details,
      level,
      cycleNumber,
      isHistoricalPosition: true,
      receiptsHydrated: true
    }
    positionDetailsCacheRef.current.set(cacheKey, hydrated)
    return hydrated
  } catch (err) {
    console.error('Error hydrating historical position:', err)
    return position
  }
}, [viewAddress])
  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  const applyViewerAddress = async () => {
    if (!inputAddress || !ethers.isAddress(inputAddress)) { setOrbitError('Enter a valid wallet address'); return }
    setOrbitError('')
    const normalized = ethers.getAddress(inputAddress)
    viewedLevelsCacheRef.current.delete(normalized.toLowerCase())
    receiptCacheRef.current.delete(normalized.toLowerCase())
    activationReceiptCacheRef.current.clear()
    setInputAddress(normalized)
    setViewAddress(normalized)
    setViewMode('global')
    setSelectedCycleByLevel({})
    setCycleHistoryData({})
    setCycleHistorySupportByLevel({})
    setViewAddressReceipts([])
    setReceiptBucketsByLevel({})
    cycleHistoryCacheRef.current.clear()
  }

  const viewMyOrbit = () => {
    if (!account) return
    viewedLevelsCacheRef.current.delete(account.toLowerCase())
    receiptCacheRef.current.delete(account.toLowerCase())
    activationReceiptCacheRef.current.clear()
    setOrbitError('')
    setInputAddress(account)
    setViewAddress(account)
    setViewMode('global')
    setSelectedCycleByLevel({})
    setCycleHistoryData({})
    setCycleHistorySupportByLevel({})
    setViewAddressReceipts([])
    setReceiptBucketsByLevel({})
    cycleHistoryCacheRef.current.clear()
  }

  const refreshData = async () => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) return
    setIsRefreshing(true)
    try {
      activationReceiptCacheRef.current.clear()
      positionDetailsCacheRef.current.clear()
      positionHydrationPromisesRef.current.clear()
      receiptCacheRef.current.delete(`${viewAddress.toLowerCase()}-backend-receipts`)
      viewedLevelsCacheRef.current.delete(viewAddress.toLowerCase())
      await fetchViewedLevels(true)
      await fetchViewedAddressReceipts(true)
      await fetchAllOrbitData(true)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) { console.error('Refresh error:', err) }
    finally { setIsRefreshing(false) }
  }

  const handlePositionClick = useCallback(async (position) => {
    const level = Number(position?.level || activeTab?.replace('level', '') || 0)
    const selectedCycle = selectedCycleByLevel[level] || 'current'
    const isHistorical = selectedCycle !== 'current'
    const initialPosition = { ...position, level, cycleNumber: isHistorical ? Number(selectedCycle) : 0, isHistoricalPosition: isHistorical, detailsLoading: true }
    setSelectedPosition(initialPosition)
    setShowPositionModal(true)
    if (level < 1 || level > 10) { setSelectedPosition(prev => prev ? { ...prev, detailsLoading: false } : prev); return }
    try {
      const hydrated = isHistorical ? await hydrateHistoricalPositionDetails(level, Number(selectedCycle), initialPosition) : await hydrateLivePositionDetails(level, initialPosition)
      setSelectedPosition(prev => (!prev || prev.number !== position.number || Number(prev.level || 0) !== level) ? prev : { ...hydrated, detailsLoading: false })
    } catch (err) { setSelectedPosition(prev => prev ? { ...prev, detailsLoading: false } : prev) }
  }, [activeTab, selectedCycleByLevel, hydrateHistoricalPositionDetails, hydrateLivePositionDetails])

  const handleStructuralPreview = (position) => {
    if (position.parentPosition) { setShowStructuralPreview(true); setTimeout(() => setShowStructuralPreview(false), 2000) }
  }

  const getHistoricalCycleSelection = useCallback((level) => selectedCycleByLevel[level] || 'current', [selectedCycleByLevel])
  const setHistoricalCycleSelection = (level, cycleKey) => setSelectedCycleByLevel(prev => ({ ...prev, [level]: cycleKey }))

  const getHighestViewedActiveLevel = useCallback(() => {
    const active = Object.keys(viewedLevels).filter(level => viewedLevels[level]).map(Number).sort((a, b) => b - a)
    return active[0] || 0
  }, [viewedLevels])

  // ============================================================
  // EFFECTS
  // ============================================================
  useEffect(() => { if (isConnected) loadContracts().catch(console.error) }, [isConnected, loadContracts])
  useEffect(() => { if (account && !viewAddress) { setViewAddress(account); setInputAddress(account) } }, [account, viewAddress])
  useEffect(() => { if (contracts && viewAddress && ethers.isAddress(viewAddress)) fetchViewedLevels(true) }, [contracts, viewAddress, fetchViewedLevels])
  useEffect(() => { if (contracts && viewAddress && ethers.isAddress(viewAddress)) fetchAllOrbitData() }, [contracts, viewAddress, fetchAllOrbitData])
  useEffect(() => { if (viewAddress && ethers.isAddress(viewAddress)) fetchViewedAddressReceipts(true) }, [viewAddress, fetchViewedAddressReceipts])
  useEffect(() => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    const match = activeTab?.match(/^level(\d+)$/)
    if (!match) return
    const level = Number(match[1])
    if (!loadedLevelsRef.current.has(`${viewAddress.toLowerCase()}-${level}`)) fetchOrbitLevelData(level, { silent: false })
  }, [activeTab, contracts, viewAddress, fetchOrbitLevelData])

  // Update container size for galaxy rendering
  useEffect(() => {
    const updateSize = () => {
      if (galaxyRef.current) {
        const { width, height } = galaxyRef.current.getBoundingClientRect()
        if (width > 0 && height > 0 && (width !== containerSize.width || height !== containerSize.height)) setContainerSize({ width, height })
      }
    }
    const timer = setTimeout(updateSize, 120)
    window.addEventListener('resize', updateSize)
    let resizeObserver
    if (window.ResizeObserver) { resizeObserver = new ResizeObserver(updateSize); if (galaxyRef.current) resizeObserver.observe(galaxyRef.current) }
    return () => { window.removeEventListener('resize', updateSize); if (resizeObserver) resizeObserver.disconnect(); clearTimeout(timer) }
  }, [activeTab, orbitData, cycleHistoryData, selectedCycleByLevel, containerSize.width, containerSize.height])

  // Clear caches when viewAddress changes
  useEffect(() => {
    loadedLevelsRef.current.clear(); loadingLevelsRef.current.clear(); activationReceiptCacheRef.current.clear()
    positionDetailsCacheRef.current.clear(); positionHydrationPromisesRef.current.clear(); fetchIdRef.current += 1
    setOrbitData({}); setUserLocks({}); setDownlineData({}); setSpilloverData({}); setLinePaymentCountsByLevel({})
    setCycleHistoryData({}); setSelectedCycleByLevel({}); setLoadingCycleByLevel({}); setCycleHistorySupportByLevel({}); setLoadingLevelsMap({}); setIsLoadingOrbits(true)
  }, [viewAddress])

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderPositionTooltip = (position) => {
    if (!position.occupant) {
      return (
        <div className="custom-tooltip">
          <strong>Empty Position</strong>
          <div>Available to be filled</div>
          {position.parentPosition && <div className="text-warning">Structural parent: Position {position.parentPosition}</div>}
        </div>
      )
    }
    const viewerBreakdown = position.viewerReceiptBreakdown || { totalGross: 0, totalLiquid: 0, totalEscrow: 0 }
    return (
      <div className="custom-tooltip">
        <div><strong>Position #{position.number}</strong> (Line {position.line})</div>
        <div><strong>Occupant:</strong> {shortAddress(position.occupant)}</div>
        <div><strong>Amount:</strong> {formatUsdtDisplay(getNetAmount(Number(position.amount)))} USDT</div>
        {position.parentPosition && <div className="text-warning">Parent: Position {position.parentPosition}</div>}
        <hr />
        <div><strong>You received:</strong> {formatUsdtDisplay(viewerBreakdown.totalLiquid)} USDT</div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <section className="orbits-page">
        <div className="orbits-hero">
          <div className="orbits-hero__content">
            <h1 className="orbits-hero__title">Orbits System</h1>
            <p className="orbits-hero__description">Connect your wallet to monitor your orbit positions and track placements.</p>
            <button onClick={connect} className="connect-wallet-btn">Connect Wallet</button>
          </div>
        </div>
      </section>
    )
  }

  if (contractsLoading || isLoadingOrbits) {
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
      {/* Address Input Bar */}
      <div className="address-input-bar glass-panel">
        <input type="text" className="address-input" placeholder="Enter wallet address (0x...)" value={inputAddress} onChange={(e) => setInputAddress(e.target.value)} />
        <button className="address-btn" onClick={applyViewerAddress}>Load Address</button>
        <button className="address-btn secondary" onClick={viewMyOrbit}>My Orbits</button>
        <button className="refresh-btn" onClick={refreshData} disabled={isRefreshing}>⟳</button>
        <span className="last-sync">Last sync: {lastUpdated}</span>
      </div>

      {/* View Toggle */}
      <div className="view-toggle-bar glass-panel">
        <button className={`toggle-btn ${viewMode === 'global' ? 'active' : ''}`} onClick={() => setViewMode('global')}>Orbit View</button>
        <button className={`toggle-btn ${viewMode === 'downline' ? 'active' : ''}`} onClick={() => setViewMode('downline')}>
          Downline View {totalDownline > 0 && <span className="badge">{totalDownline}</span>}
        </button>
        <div className="receipt-status">Receipts: {receiptsSupported ? '✓ ON' : 'OFF'}</div>
      </div>

      {/* Level Tabs */}
      <div className="level-tabs glass-panel">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
          const orbitType = levelToOrbitType[level]
          const isActive = !!viewedLevels[level]
          const isLoaded = !!orbitData[level]
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

      {/* Main Content */}
      <div className="orbits-main-grid">
        <div className="orbits-main-grid__left">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
            if (activeTab !== `level${level}`) return null
            const data = orbitData[level]
            if (!data) return <div key={level} className="loading-level">Loading Level {level}...</div>

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

            const positionsByLine = {}
            displayedPositions.forEach(pos => { const line = pos.line; if (!positionsByLine[line]) positionsByLine[line] = []; positionsByLine[line].push(pos) })
            const structure = getOrbitStructure(orbitType)
            const filledCountForDisplay = displayedPositions.filter(p => p.occupant).length
            const currentIndexForDisplay = isHistoricalView ? Math.min(filledCountForDisplay, config.positions) : (currentIndex || 1)
            const shouldShowAutoUpgradePanel = isLevelActive && level < 10 && level === highestViewedActiveLevel
            const isLoadingCycleHistory = !!loadingCycleByLevel[level]
            const hasCycleSupport = cycleHistorySupportByLevel[level]
            const showCycleButtons = totalCompletedCycles > 0

            return (
              <div key={level} className="orbit-content">
                {/* Orbit Header */}
                <div className="orbit-header-card glass-panel">
                  <div className="orbit-header-info">
                    <span>Level {level} ({orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}</span>
                    {totalCycles > 0 && <span className="cycle-badge">Cycle {Number(totalCycles) + 1}</span>}
                    {isHistoricalView && <span className="history-badge">Viewing Cycle {selectedCycle}</span>}
                  </div>
                  <div className="orbit-header-stats">
                    {!isLevelActive && <span className="badge-secondary">Inactive</span>}
                    {data.downlinePositions?.length > 0 && <span className="badge-warning">⬇ {data.downlinePositions.length}</span>}
                    {data.otherOccupants?.length > 0 && <span className="badge-info">🔄 {data.otherOccupants.length}</span>}
                    <span className="badge-primary">{currentIndexForDisplay}/{config.positions} filled</span>
                  </div>
                </div>

                {/* Cycle Switcher */}
                {showCycleButtons && (
                  <div className="cycle-switcher glass-panel">
                    <span className="cycle-label">Cycle View:</span>
                    <button className={`cycle-btn ${selectedCycle === 'current' ? 'active' : ''}`} onClick={() => setHistoricalCycleSelection(level, 'current')}>Current</button>
                    {availableCycleNumbers.map(cycleNum => (
                      <button key={cycleNum} className={`cycle-btn ${selectedCycle === cycleNum ? 'active' : ''}`} onClick={() => { setHistoricalCycleSelection(level, cycleNum); loadCycleHistoryForLevel(level, cycleNum) }}>Cycle {cycleNum}</button>
                    ))}
                  </div>
                )}

                {/* Galaxy Visualization */}
                <div className={`galaxy-container ${orbitType.toLowerCase()}`} ref={galaxyRef}>
                  <div className="star-field">
                    {starConfig.map((star) => (<span key={star.id} className="star" style={{ left: star.left, top: star.top, width: star.size, height: star.size, opacity: star.opacity, animationDelay: `${star.delay}, ${star.delay}`, animationDuration: `${star.duration}, ${star.drift}` }} />))}
                  </div>
                  <div className="galaxy-inner">
                    {(() => {
                      const outerWidth = containerSize.width > 0 ? containerSize.width : 560
                      const outerHeight = containerSize.height > 0 ? containerSize.height : 560
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
                      if (orbitType === 'P12') ringRadiiPx = { 1: Math.max(coreClearance + 4, stageSize * 0.19), 2: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding) }
                      if (orbitType === 'P39') ringRadiiPx = { 1: Math.max(coreClearance, stageSize * 0.17), 2: Math.min(stageSize * 0.32, (stageSize / 2) - nodePadding - 34), 3: Math.min(stageSize * 0.47, (stageSize / 2) - nodePadding) }
                      Object.keys(ringRadiiPx).forEach(key => { ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding) })

                      const createEmptyPosition = (posNumber, lineNum) => ({
                        number: posNumber, occupantType: 'empty', occupant: null, amount: '0', timestamp: 0,
                        positionInfo: buildPositionInfoFromRuleView(orbitType, posNumber, level, null, viewAddress),
                        line: lineNum, spillsTo: null, parentPosition: getStructuralParentPosition(orbitType, posNumber),
                        truthLabel: 'NO_RECEIPT', payoutReceipts: [], viewerReceiptBreakdown: { totalLiquid: 0 }
                      })

                      const allPositionMap = {}
                      structure.lines.forEach(lineNum => {
                        const linePositions = positionsByLine[lineNum] || []
                        structure.positions[lineNum].forEach(posNumber => {
                          allPositionMap[posNumber] = linePositions.find(p => p.number === posNumber) || createEmptyPosition(posNumber, lineNum)
                        })
                      })

                      const getCoordsForPosition = (posNumber, lineNum, index) => {
                        const customAngle = structure.customAngles?.[lineNum]?.[posNumber]
                        if (typeof customAngle === 'number') return getPositionOnAngle(customAngle, ringRadiiPx[lineNum], centerX, centerY)
                        return getPositionOnRing(index, structure.counts[lineNum], ringRadiiPx[lineNum], centerX, centerY, structure.startAngles[lineNum])
                      }

                      return (
                        <div className="galaxy-stage" style={{ width: stageSize, height: stageSize, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                          <div className={`orbit-core ${!isLevelActive ? 'inactive' : ''}`} style={{ width: coreSize, height: coreSize }}>
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

                          {/* Grey structural connections */}
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
                            const dx = toCoords.x - fromCoords.x
                            const dy = toCoords.y - fromCoords.y
                            const distance = Math.sqrt(dx * dx + dy * dy)
                            const angle = Math.atan2(dy, dx) * 180 / Math.PI
                            return <div key={`grey-conn-${posNumber}`} className="structural-connection-grey" style={{ width: distance, left: fromCoords.x, top: fromCoords.y, transform: `rotate(${angle}deg)` }} />
                          }))}

                          {/* Position nodes */}
                          {structure.lines.map(lineNum => structure.positions[lineNum].map((posNumber, index) => {
                            const pos = allPositionMap[posNumber]
                            const coords = getCoordsForPosition(posNumber, lineNum, index)
                            let planetClass = 'planet-node '
                            if (pos.occupantType === 'mine') planetClass += 'mine'
                            else if (pos.occupantType === 'downline') planetClass += 'downline'
                            else if (pos.occupantType === 'other') planetClass += 'other'
                            else planetClass += 'empty'
                            if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) planetClass += ' structural-preview'
                            const badgeValue = getPlanetBadgeValue(pos)
                            return (
                              <div
                                key={pos.number}
                                className={planetClass}
                                style={{ left: coords.x, top: coords.y, width: planetSize, height: planetSize, transform: 'translate(-50%, -50%)', '--index': index }}
                                onClick={() => handlePositionClick(pos)}
                                onMouseEnter={() => { setHoveredPosition(pos); if (pos.parentPosition) handleStructuralPreview(pos) }}
                                onMouseLeave={() => setHoveredPosition(null)}
                                title={pos.occupant ? shortAddress(pos.occupant) : 'Empty'}
                              >
                                <div className="planet-content">
                                  <span className="node-number">{pos.number}</span>
                                  {pos.occupant && pos.occupantType === 'mine' && <span className="planet-icon">👤</span>}
                                  {pos.occupant && pos.occupantType === 'downline' && <span className="planet-icon">⬇</span>}
                                  {pos.occupant && pos.occupantType === 'other' && <span className="planet-icon">👥</span>}
                                  {badgeValue > 0 && pos.occupantType !== 'mine' && <span className="planet-earn-badge">{formatUsdtDisplay(badgeValue)}</span>}
                                </div>
                              </div>
                            )
                          }))}

                          {/* Golden spillover connections */}
                          {!isHistoricalView && data.spilloverFromPositions?.map((conn, idx) => {
                            const fromPos = allPositionMap[conn.from]
                            const toPos = allPositionMap[conn.to]
                            if (!fromPos || !toPos || !fromPos.occupant) return null
                            const fromIndex = structure.positions[fromPos.line].indexOf(fromPos.number)
                            const toIndex = structure.positions[toPos.line].indexOf(toPos.number)
                            if (fromIndex < 0 || toIndex < 0) return null
                            const fromCoords = getCoordsForPosition(fromPos.number, fromPos.line, fromIndex)
                            const toCoords = getCoordsForPosition(toPos.number, toPos.line, toIndex)
                            const dx = toCoords.x - fromCoords.x
                            const dy = toCoords.y - fromCoords.y
                            const distance = Math.sqrt(dx * dx + dy * dy)
                            const angle = Math.atan2(dy, dx) * 180 / Math.PI
                            return <div key={`conn-${idx}`} className="structural-connection" style={{ width: distance, left: fromCoords.x, top: fromCoords.y, transform: `rotate(${angle}deg)` }} />
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Legend */}
                <div className="orbit-legend glass-panel">
                  <div className="legend-item"><div className="legend-dot mine"></div><span>Your Position</span></div>
                  <div className="legend-item"><div className="legend-dot downline"></div><span>Downline</span></div>
                  <div className="legend-item"><div className="legend-dot other"></div><span>Other User</span></div>
                  <div className="legend-item"><div className="legend-dot empty"></div><span>Empty</span></div>
                  <div className="legend-item"><div className="legend-dot gold"></div><span>Spillover Link</span></div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="orbits-main-grid__right">
          {/* Right panel content - matches original */}
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
                {/* Escrow & Auto-Upgrade */}
                <div className="info-card glass-panel">
                  <h3>Escrow & Auto-Upgrade</h3>
                  {shouldShowAutoUpgradePanel ? (
                    <>
                      <div className="escrow-label">Locked for Level {levelInfo.nextLevel}</div>
                      <div className="escrow-value">{formatUsdtDisplay(userLock)} / {upgradeReq} USDT</div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${(parseFloat(userLock) / upgradeReq) * 100}%` }} /></div>
                      <div className="escrow-status">
                        {parseFloat(userLock) >= upgradeReq ? (autoUpgradeCompleted ? '✓ Auto-upgrade completed' : '✓ Ready for auto-upgrade') : `Need ${(upgradeReq - parseFloat(userLock)).toFixed(2)} more USDT`}
                      </div>
                    </>
                  ) : (
                    <div className="escrow-placeholder">Auto-upgrade activates on highest active level</div>
                  )}
                  <hr />
                  <div className="total-earned">Total Earned: <strong>{data?.totalEarned || '0'} USDT</strong></div>
                </div>

                {/* Downline List (when in downline view) */}
                {viewMode === 'downline' && !(selectedCycleByLevel[level] !== 'current') && (
                  <div className="info-card glass-panel">
                    <h3>Direct Downline</h3>
                    {downlineAtLevel.length > 0 ? (
                      <div className="user-list">
                        {downlineAtLevel.map((d, idx) => (
                          <div key={idx} className="user-item">
                            <span className="user-address">{shortAddress(d.user)}</span>
                            <span className="user-position">Pos {d.position}</span>
                            <span className="user-amount">{formatUsdtDisplay(d.amount)} USDT</span>
                          </div>
                        ))}
                      </div>
                    ) : <div className="empty-message">No downline yet</div>}
                  </div>
                )}

                {/* Spillover List */}
                {viewMode === 'downline' && !(selectedCycleByLevel[level] !== 'current') && (
                  <div className="info-card glass-panel">
                    <h3>Spillover / Other Occupants</h3>
                    {spilloverAtLevel.length > 0 ? (
                      <div className="user-list">
                        {spilloverAtLevel.map((d, idx) => (
                          <div key={idx} className="user-item">
                            <span className="user-address">{shortAddress(d.user)}</span>
                            <span className="user-position">Pos {d.position}</span>
                            <span className="user-amount">{formatUsdtDisplay(d.amount)} USDT</span>
                          </div>
                        ))}
                      </div>
                    ) : <div className="empty-message">No other occupants</div>}
                  </div>
                )}

                {/* Historical view note */}
                {selectedCycleByLevel[level] !== 'current' && (
                  <div className="info-card glass-panel">
                    <h3>Historical View</h3>
                    <div className="history-note">Showing stored data for Cycle {selectedCycleByLevel[level]}. Total earned reflects current value.</div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>

      {/* Position Modal */}
      {showPositionModal && selectedPosition && (
        <div className="modal-overlay" onClick={() => setShowPositionModal(false)}>
          <div className="position-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPositionModal(false)}>×</button>
            <h3>Position #{selectedPosition.number}</h3>
            <div className="modal-detail"><span className="modal-label">Type</span><span>{selectedPosition.truthLabel || selectedPosition.positionInfo?.type || 'Unknown'}</span></div>
            <div className="modal-detail"><span className="modal-label">Line</span><span>Line {selectedPosition.positionInfo?.line || 1}</span></div>
            {selectedPosition.parentPosition && <div className="modal-detail"><span className="modal-label">Parent</span><span>Position {selectedPosition.parentPosition}</span></div>}
            {selectedPosition.occupant ? (
              <>
                <div className="modal-detail"><span className="modal-label">Occupant</span><span>{shortAddress(selectedPosition.occupant)}</span></div>
                <div className="modal-detail"><span className="modal-label">Amount (net)</span><span>{formatUsdtDisplay(getNetAmount(Number(selectedPosition.amount)))} USDT</span></div>
                {selectedPosition.timestamp > 0 && <div className="modal-detail"><span className="modal-label">Filled</span><span>{new Date(selectedPosition.timestamp * 1000).toLocaleString()}</span></div>}
              </>
            ) : <div className="modal-detail"><span className="modal-label">Status</span><span>Empty - Available</span></div>}
            {selectedPosition.detailsLoading && <div className="loading-detail">Loading full details...</div>}
          </div>
        </div>
      )}

      <style>{`
        .orbits-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
        .glass-panel { background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); }
        .address-input-bar { display: flex; gap: 12px; padding: 16px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .address-input { flex: 1; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; font-family: monospace; }
        .address-btn { padding: 12px 20px; border-radius: 12px; background: linear-gradient(135deg, #1de9b6, #1a9b7a); color: #07111f; font-weight: bold; border: none; cursor: pointer; }
        .address-btn.secondary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
        .refresh-btn { padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.1); border: none; color: white; cursor: pointer; font-size: 18px; }
        .last-sync { font-size: 12px; color: rgba(255,255,255,0.5); margin-left: auto; }
        .view-toggle-bar { display: flex; gap: 12px; padding: 12px 20px; margin-bottom: 20px; align-items: center; }
        .toggle-btn { padding: 8px 20px; border-radius: 30px; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: white; cursor: pointer; }
        .toggle-btn.active { background: #1de9b6; color: #07111f; border-color: #1de9b6; }
        .receipt-status { margin-left: auto; font-size: 12px; color: #1de9b6; }
        .level-tabs { display: flex; gap: 8px; padding: 12px; margin-bottom: 20px; overflow-x: auto; flex-wrap: wrap; }
        .level-tab { padding: 8px 16px; border-radius: 30px; background: rgba(255,255,255,0.1); border: none; color: white; cursor: pointer; font-size: 13px; position: relative; }
        .level-tab.active { background: #1de9b6; color: #07111f; }
        .level-tab.inactive { opacity: 0.5; }
        .inactive-badge { font-size: 9px; margin-left: 5px; }
        .loading-dot { position: absolute; top: -4px; right: -4px; width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; animation: pulse 1s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .orbit-header-card { display: flex; justify-content: space-between; padding: 16px 20px; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .orbit-header-info { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .cycle-badge, .history-badge { background: #f59e0b; color: #07111f; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: bold; }
        .history-badge { background: #8b5cf6; color: white; }
        .badge-warning { background: #f59e0b; color: #07111f; padding: 2px 8px; border-radius: 20px; font-size: 11px; }
        .badge-info { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 20px; font-size: 11px; }
        .badge-primary { background: #1de9b6; color: #07111f; padding: 2px 8px; border-radius: 20px; font-size: 11px; }
        .badge-secondary { background: #6c757d; color: white; padding: 2px 8px; border-radius: 20px; font-size: 11px; }
        .cycle-switcher { display: flex; gap: 8px; padding: 12px 16px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .cycle-label { font-size: 12px; color: rgba(255,255,255,0.6); }
        .cycle-btn { padding: 6px 14px; border-radius: 30px; background: rgba(255,255,255,0.1); border: none; color: white; cursor: pointer; font-size: 12px; }
        .cycle-btn.active { background: #1de9b6; color: #07111f; }
        .galaxy-container { position: relative; width: 100%; aspect-ratio: 1/1; margin: 20px auto; border-radius: 34px; overflow: hidden; background: radial-gradient(circle at 50% 50%, rgba(27,75,196,0.08), rgba(2,10,33,0.98)); border: 1px solid rgba(255,255,255,0.08); }
        .star-field { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
        .star { position: absolute; border-radius: 50%; background: white; animation: twinkle 3s infinite, drift 8s infinite; }
        @keyframes twinkle { 0%,100% { opacity: 0.2; } 50% { opacity: 0.8; } }
        @keyframes drift { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-3px) translateX(2px); } }
        .galaxy-inner { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2; }
        .galaxy-stage { position: absolute; border-radius: 50%; }
        .orbit-ring { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border-radius: 50%; pointer-events: none; border: 2px solid rgba(89,150,255,0.36); }
        .orbit-ring.line1 { border: 2px solid rgba(89,150,255,0.36); animation: rotate-slow 30s linear infinite; }
        .orbit-ring.line2 { border: 2px dashed rgba(89,150,255,0.26); animation: rotate-reverse 48s linear infinite; }
        .orbit-ring.line3 { border: 2px dotted rgba(89,150,255,0.2); animation: rotate-slow 75s linear infinite; }
        @keyframes rotate-slow { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes rotate-reverse { from { transform: translate(-50%, -50%) rotate(360deg); } to { transform: translate(-50%, -50%) rotate(0deg); } }
        .ring-label { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.6); padding: 4px 12px; border-radius: 20px; font-size: 10px; white-space: nowrap; }
        .ring-stats { position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.6); padding: 4px 12px; border-radius: 20px; font-size: 9px; white-space: nowrap; }
        .orbit-core { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: radial-gradient(circle at 30% 30%, #4da3ff, #002366); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px solid white; z-index: 20; }
        .orbit-core.inactive { background: radial-gradient(circle at 30% 30%, #6c757d, #495057); }
        .core-label { font-size: 10px; opacity: 0.8; }
        .core-value { font-size: 14px; font-weight: bold; }
        .planet-node { position: absolute; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white; z-index: 10; animation: float 4s ease-in-out infinite; }
        .planet-node:hover { transform: translate(-50%, -50%) scale(1.15); z-index: 100; }
        @keyframes float { 0%,100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-4px); } }
        .planet-node.mine { background: linear-gradient(135deg, #28a745, #20c997); }
        .planet-node.downline { background: linear-gradient(135deg, #fd7e14, #ffc107); }
        .planet-node.other { background: linear-gradient(135deg, #0066cc, #4da3ff); }
        .planet-node.empty { background: rgba(255,255,255,0.1); border: 2px dashed rgba(255,255,255,0.3); }
        .planet-node.structural-preview { animation: structural-pulse 1s infinite; }
        @keyframes structural-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,193,7,0.7); } 50% { box-shadow: 0 0 0 10px rgba(255,193,7,0); } }
        .planet-content { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; position: relative; }
        .node-number { font-size: 14px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
        .planet-node.empty .node-number { color: rgba(255,255,255,0.5); }
        .planet-icon { position: absolute; top: -8px; right: -8px; background: rgba(0,0,0,0.5); border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; }
        .planet-earn-badge { position: absolute; top: -8px; left: -8px; background: #28a745; border-radius: 12px; padding: 2px 5px; font-size: 8px; font-weight: bold; white-space: nowrap; }
        .structural-connection { position: absolute; background: linear-gradient(90deg, #ffd54f, #ffb300); height: 2px; transform-origin: 0 0; z-index: 5; pointer-events: none; border-radius: 2px; }
        .structural-connection-grey { position: absolute; background: rgba(22,253,5,0.5); height: 1px; transform-origin: 0 0; z-index: 4; pointer-events: none; }
        .orbit-legend { display: flex; gap: 20px; padding: 12px 20px; margin-top: 20px; flex-wrap: wrap; justify-content: center; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; }
        .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
        .legend-dot.mine { background: #28a745; }
        .legend-dot.downline { background: #fd7e14; }
        .legend-dot.other { background: #0066cc; }
        .legend-dot.empty { background: transparent; border: 1px dashed rgba(255,255,255,0.5); width: 10px; height: 10px; }
        .legend-dot.gold { background: #ffb300; }
        .orbits-main-grid { display: grid; grid-template-columns: 1fr 320px; gap: 20px; margin-top: 20px; }
        @media (max-width: 900px) { .orbits-main-grid { grid-template-columns: 1fr; } }
        .info-card { padding: 20px; margin-bottom: 20px; }
        .info-card h3 { margin: 0 0 16px 0; font-size: 16px; }
        .escrow-label { font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
        .escrow-value { font-size: 20px; font-weight: bold; margin-bottom: 12px; }
        .progress-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); border-radius: 3px; transition: width 0.3s ease; }
        .escrow-status { font-size: 12px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 8px; text-align: center; }
        .total-earned { text-align: center; font-size: 14px; margin-top: 16px; }
        .total-earned strong { color: #1de9b6; font-size: 18px; }
        .user-list { max-height: 300px; overflow-y: auto; }
        .user-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 12px; flex-wrap: wrap; gap: 8px; }
        .user-address { font-family: monospace; }
        .user-position { color: #f59e0b; }
        .user-amount { color: #1de9b6; }
        .empty-message { text-align: center; padding: 30px; color: rgba(255,255,255,0.4); }
        .history-note { font-size: 12px; color: #8b5cf6; text-align: center; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .position-modal { position: relative; max-width: 450px; width: 90%; padding: 24px; background: rgba(0,0,0,0.95); border-radius: 24px; }
        .modal-close { position: absolute; top: 16px; right: 20px; background: none; border: none; color: white; font-size: 28px; cursor: pointer; }
        .modal-detail { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .modal-label { color: rgba(255,255,255,0.5); }
        .loading-detail { text-align: center; padding: 20px; color: rgba(255,255,255,0.5); }
        .connect-wallet-btn { padding: 12px 28px; border-radius: 12px; background: linear-gradient(135deg, #1de9b6, #1a9b7a); color: #07111f; font-weight: bold; border: none; cursor: pointer; font-size: 16px; }
        .loading-container { text-align: center; padding: 60px; }
        .spinner { width: 40px; height: 40px; border: 3px solid rgba(77,163,255,0.2); border-top-color: #4da3ff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-level { text-align: center; padding: 60px; color: rgba(255,255,255,0.5); }
        .custom-tooltip { background: #1a1a2e; padding: 12px; border-radius: 12px; max-width: 300px; font-size: 12px; border: 1px solid rgba(255,255,255,0.1); }
        .text-warning { color: #f59e0b; }
        @media (max-width: 768px) {
          .orbits-page { padding: 16px; }
          .planet-node { width: 30px !important; height: 30px !important; }
          .planet-node.p39 { width: 24px !important; height: 24px !important; }
          .node-number { font-size: 10px !important; }
          .planet-earn-badge { display: none; }
          .ring-label, .ring-stats { font-size: 8px; padding: 2px 6px; }
          .orbit-core { width: 50px !important; height: 50px !important; }
          .core-value { font-size: 10px; }
        }
      `}</style>
    </section>
  )
}

export default OrbitsPage
