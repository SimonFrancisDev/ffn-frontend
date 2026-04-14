import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Col,
  Container,
  Form,
  ProgressBar,
  Row,
  Spinner,
  Tab,
  Tabs
} from 'react-bootstrap'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'
import {
  fetchActivationReceiptsApi,
  fetchAddressReceiptsApi,
  fetchOrbitCycleSnapshotApi,
  fetchOrbitLevelSnapshotApi,
  fetchOrbitLevelsApi,
  fetchOrbitPositionDetailsApi
} from '../Services/orbitsApi'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../hooks/useWallet'
import { OrbitGalaxy } from './OrbitGalaxy'
import { OrbitPositionModal } from './OrbitPositionModal'
import { RECEIPT_TYPES, levelConfig, levelToOrbitType, orbitTypeConfig } from './orbitConstants'
import {
  buildPositionInfoFromRuleView,
  buildReceiptBuckets,
  createEmptyViewerReceiptBreakdown,
  delay,
  deriveOccupantType,
  getDisplayPositionType,
  getStarConfig,
  summarizeViewerReceipts
} from './orbitHelpers'
import { createOrbitStore } from './orbitStore'
import { orbitStyles } from './orbitStyles'

export const Orbits = () => {
  const { isConnected, account } = useWallet()
  const { contracts, isLoading, error, loadContracts } = useContracts()
  const { t } = useTranslation()

  const storeRef = useRef(createOrbitStore())
  const fetchIdRef = useRef(0)
  const galaxyRef = useRef(null)
  const resizeObserverRef = useRef(null)

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

  const starConfig = useMemo(() => getStarConfig(40), [])

  const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
    try {
      return await fn()
    } catch (err) {
      const code = err?.code || err?.info?.error?.code
      const msg = String(err?.message || '')
      const isRateLimited =
        code === -32005 ||
        err?.status === 429 ||
        msg.includes('rate limited') ||
        msg.includes('429')

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
    if (storeRef.current.referrerCache.has(key)) {
      return storeRef.current.referrerCache.get(key)
    }
    const referrer = await withRetry(() => contracts.registration.getReferrer(address))
    storeRef.current.referrerCache.set(key, referrer)
    return referrer
  }, [contracts, withRetry])

  const resolveOccupantReferrer = useCallback(async (occupantAddress, backendItem = {}) => {
    if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return ethers.ZeroAddress
    const existingReferrer =
      backendItem?.referrer ||
      backendItem?.originalReferrer ||
      backendItem?.occupantReferrer ||
      ethers.ZeroAddress

    if (existingReferrer && existingReferrer !== ethers.ZeroAddress) {
      return existingReferrer
    }

    try {
      return await getCachedReferrer(occupantAddress)
    } catch {
      return ethers.ZeroAddress
    }
  }, [getCachedReferrer])

  const fetchViewedLevels = useCallback(async (forceRefresh = false) => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) return
    const key = viewAddress.toLowerCase()

    if (!forceRefresh && storeRef.current.viewedLevelsCache.has(key)) {
      setViewedLevels(storeRef.current.viewedLevelsCache.get(key))
      return
    }

    try {
      const result = await fetchOrbitLevelsApi(viewAddress)
      const levels = Object.fromEntries((result?.levels || []).map((item) => [item.level, !!item.isActive]))
      storeRef.current.viewedLevelsCache.set(key, levels)
      setViewedLevels(levels)
    } catch (err) {
      console.error('Error fetching viewed levels from backend:', err)
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
    if (!forceRefresh && storeRef.current.receiptCache.has(cacheKey)) {
      const cachedReceipts = storeRef.current.receiptCache.get(cacheKey)
      setViewAddressReceipts(cachedReceipts)
      setReceiptBucketsByLevel(buildReceiptBuckets(cachedReceipts))
      setReceiptsSupported(true)
      return
    }

    try {
      const result = await fetchAddressReceiptsApi(viewAddress)
      const receipts = Array.isArray(result?.receipts)
        ? result.receipts.map((receipt) => ({
          ...receipt,
          activationId: Number(receipt.activationId || 0),
          receiptType: Number(receipt.receiptType || 0),
          level: Number(receipt.level || 0),
          timestamp: Number(receipt.timestamp || 0),
          sourcePosition: Number(receipt.sourcePosition || 0),
          sourceCycle: Number(receipt.sourceCycle || 0),
          mirroredPosition: Number(receipt.mirroredPosition || 0),
          mirroredCycle: Number(receipt.mirroredCycle || 0),
          routedRole: Number(receipt.routedRole || 0),
          grossAmount: Number(receipt.grossAmount || 0),
          escrowLocked: Number(receipt.escrowLocked || 0),
          liquidPaid: Number(receipt.liquidPaid || 0)
        }))
        : []

      storeRef.current.receiptCache.set(cacheKey, receipts)
      setViewAddressReceipts(receipts)
      setReceiptBucketsByLevel(buildReceiptBuckets(receipts))
      setReceiptsSupported(true)
    } catch (err) {
      console.error('Error fetching payout receipts from backend:', err)
      setViewAddressReceipts([])
      setReceiptBucketsByLevel({})
      setReceiptsSupported(false)
    }
  }, [viewAddress])

  const getActivationDetailedReceipts = useCallback(async (activationId) => {
    const numericActivationId = Number(activationId || 0)
    if (!numericActivationId) return []

    const cacheKey = String(numericActivationId)
    if (storeRef.current.activationReceiptCache.has(cacheKey)) {
      return storeRef.current.activationReceiptCache.get(cacheKey)
    }

    try {
      const result = await fetchActivationReceiptsApi(numericActivationId)
      const receipts = Array.isArray(result?.receipts)
        ? result.receipts.map((receipt) => ({
          ...receipt,
          activationId: Number(receipt.activationId || 0),
          receiptType: Number(receipt.receiptType || 0),
          level: Number(receipt.level || 0),
          timestamp: Number(receipt.timestamp || 0),
          sourcePosition: Number(receipt.sourcePosition || 0),
          sourceCycle: Number(receipt.sourceCycle || 0),
          mirroredPosition: Number(receipt.mirroredPosition || 0),
          mirroredCycle: Number(receipt.mirroredCycle || 0),
          routedRole: Number(receipt.routedRole || 0),
          grossAmount: Number(receipt.grossAmount || 0),
          escrowLocked: Number(receipt.escrowLocked || 0),
          liquidPaid: Number(receipt.liquidPaid || 0)
        }))
        : []

      storeRef.current.activationReceiptCache.set(cacheKey, receipts)
      return receipts
    } catch (err) {
      console.error(`Error fetching activation receipts for activation ${numericActivationId}:`, err)
      return []
    }
  }, [])

  const fetchStoredCycleForLevel = useCallback(async (level, cycleNumber) => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) return []
    if (!orbitData[level]) return []

    const cacheKey = `${viewAddress.toLowerCase()}-${level}-${cycleNumber}`
    if (storeRef.current.cycleHistoryCache.has(cacheKey)) {
      return storeRef.current.cycleHistoryCache.get(cacheKey)
    }

    const snapshot = await fetchOrbitCycleSnapshotApi(viewAddress, level, cycleNumber)
    const orbitType = snapshot?.orbitType || levelToOrbitType[level]

    const positions = await Promise.all((snapshot?.positions || []).map(async (pos) => {
      const occupant = pos.occupant || null
      const resolvedReferrer = await resolveOccupantReferrer(occupant, pos)
      const classificationSource = { ...pos, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer }

      const occupantType = deriveOccupantType(occupant, viewAddress, classificationSource)
      const normalizedRuleView = pos.ruleView ? {
        ...pos.ruleView,
        toOwner: Number(pos.ruleView.toOwner || 0),
        toSpillover1: Number(pos.ruleView.toSpillover1 || 0),
        toSpillover2: Number(pos.ruleView.toSpillover2 || 0),
        toEscrow: Number(pos.ruleView.toEscrow || 0),
        toRecycle: Number(pos.ruleView.toRecycle || 0)
      } : null

      const positionInfo = buildPositionInfoFromRuleView(orbitType, pos.number, level, normalizedRuleView, viewAddress)
      const indexedReceipts = Array.isArray(pos.indexedReceipts) ? pos.indexedReceipts.map((receipt) => ({
        ...receipt,
        activationId: Number(receipt.activationId || 0),
        receiptType: Number(receipt.receiptType || 0),
        level: Number(receipt.level || 0),
        timestamp: receipt.timestamp || '',
        sourcePosition: Number(receipt.sourcePosition || 0),
        sourceCycle: Number(receipt.sourceCycle || 0),
        mirroredPosition: Number(receipt.mirroredPosition || 0),
        mirroredCycle: Number(receipt.mirroredCycle || 0),
        routedRole: Number(receipt.routedRole || 0),
        grossAmount: Number(receipt.grossAmount || 0),
        escrowLocked: Number(receipt.escrowLocked || 0),
        liquidPaid: Number(receipt.liquidPaid || 0)
      })) : []

      return {
        number: pos.number,
        level,
        cycleNumber,
        isHistoricalPosition: true,
        occupantType,
        occupant,
        amount: pos.amount || '0',
        timestamp: Number(pos.timestamp || 0),
        positionInfo,
        ruleView: normalizedRuleView,
        line: pos.line || positionInfo.line,
        spillsTo: positionInfo.spillsTo,
        parentPosition: pos.parentPosition ?? positionInfo.parentPosition,
        activationId: Number(pos.activationId || 0),
        activationCycleNumber: Number(pos.activationCycleNumber || cycleNumber),
        isMirrorActivation: !!pos.isMirrorActivation,
        payoutReceipts: indexedReceipts,
        payoutReceiptSummary: {
          count: Number(pos.receiptTotals?.count || 0),
          gross: Number(pos.receiptTotals?.gross || 0),
          escrow: Number(pos.receiptTotals?.escrowLocked || 0),
          liquid: Number(pos.receiptTotals?.liquidPaid || 0),
          founderPathGross: Number(pos.receiptTotals?.founderPathGross || 0),
          directOwnerGross: Number(pos.receiptTotals?.directOwnerGross || 0),
          routedSpilloverGross: Number(pos.receiptTotals?.routedSpilloverGross || 0),
          recycleGross: Number(pos.receiptTotals?.recycleGross || 0)
        },
        viewerReceipts: indexedReceipts.filter((receipt) => (receipt.receiver || '').toLowerCase() === viewAddress.toLowerCase()),
        viewerReceiptBreakdown: {
          count: Number(pos.viewerReceiptBreakdown?.count || 0),
          totalGross: Number(pos.viewerReceiptBreakdown?.totalGross || 0),
          totalLiquid: Number(pos.viewerReceiptBreakdown?.totalLiquid || 0),
          totalEscrow: Number(pos.viewerReceiptBreakdown?.totalEscrow || 0),
          directOwnerGross: Number(pos.viewerReceiptBreakdown?.directOwnerGross || 0),
          directOwnerLiquid: Number(pos.viewerReceiptBreakdown?.directOwnerLiquid || 0),
          directOwnerEscrow: Number(pos.viewerReceiptBreakdown?.directOwnerEscrow || 0),
          routedSpilloverGross: Number(pos.viewerReceiptBreakdown?.routedSpilloverGross || 0),
          routedSpilloverLiquid: Number(pos.viewerReceiptBreakdown?.routedSpilloverLiquid || 0),
          routedSpilloverEscrow: Number(pos.viewerReceiptBreakdown?.routedSpilloverEscrow || 0),
          founderPathGross: Number(pos.viewerReceiptBreakdown?.founderPathGross || 0),
          founderPathLiquid: Number(pos.viewerReceiptBreakdown?.founderPathLiquid || 0),
          founderPathEscrow: Number(pos.viewerReceiptBreakdown?.founderPathEscrow || 0),
          recycleGross: Number(pos.viewerReceiptBreakdown?.recycleGross || 0),
          recycleLiquid: Number(pos.viewerReceiptBreakdown?.recycleLiquid || 0),
          recycleEscrow: Number(pos.viewerReceiptBreakdown?.recycleEscrow || 0)
        },
        truthLabel: pos.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT'),
        indexedEvents: Array.isArray(pos.indexedEvents) ? pos.indexedEvents : [],
        indexedEventCount: Number(pos.indexedEventCount || 0),
        indexedReceiptCount: Number(pos.indexedReceiptCount || 0),
        receiptsHydrated: true,
        originalReferrer: resolvedReferrer,
        occupantReferrer: resolvedReferrer
      }
    }))

    storeRef.current.cycleHistoryCache.set(cacheKey, positions)
    return positions
  }, [orbitData, resolveOccupantReferrer, viewAddress])

  const loadCycleHistoryForLevel = useCallback(async (level, cycleNumber) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    if (!orbitData[level]) return

    const cycleKey = String(cycleNumber)
    const existing = cycleHistoryData[level]?.[cycleKey]
    if (existing) return

    setLoadingCycleByLevel(prev => ({ ...prev, [level]: true }))

    try {
      const positions = await fetchStoredCycleForLevel(level, cycleNumber)
      setCycleHistoryData(prev => ({
        ...prev,
        [level]: { ...(prev[level] || {}), [cycleKey]: positions }
      }))
      setCycleHistorySupportByLevel(prev => ({ ...prev, [level]: true }))
    } catch (err) {
      console.error(`Cycle history load failed for level ${level}, cycle ${cycleNumber}:`, err)
      setCycleHistorySupportByLevel(prev => ({ ...prev, [level]: false }))
    } finally {
      setLoadingCycleByLevel(prev => ({ ...prev, [level]: false }))
    }
  }, [contracts, cycleHistoryData, fetchStoredCycleForLevel, orbitData, viewAddress])

  const fetchOrbitLevelData = useCallback(async (level, options = {}) => {
    const { forceRefresh = false, silent = false } = options
    if (!viewAddress || !ethers.isAddress(viewAddress) || level < 1 || level > 10) return

    const fetchKey = `${viewAddress.toLowerCase()}-${level}`
    const requestEpoch = fetchIdRef.current

    if (forceRefresh) {
      storeRef.current.loadedLevels.delete(fetchKey)
      storeRef.current.positionDetailsCache.delete(fetchKey)
    }

    if (!forceRefresh && storeRef.current.loadedLevels.has(fetchKey)) return
    if (storeRef.current.loadingLevels.has(fetchKey)) return

    storeRef.current.loadingLevels.add(fetchKey)
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

      const positions = await Promise.all((snapshot.positions || []).map(async (pos) => {
        const occupant = pos.occupant || null
        const resolvedReferrer = await resolveOccupantReferrer(occupant, pos)
        const classificationSource = { ...pos, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer }
        const positionInfo = buildPositionInfoFromRuleView(orbitType, pos.number, level, null, viewAddress)
        const occupantType = deriveOccupantType(occupant, viewAddress, classificationSource)

        return {
          number: pos.number,
          level,
          occupantType,
          occupant,
          amount: pos.amount || '0',
          timestamp: pos.timestamp || 0,
          positionInfo,
          ruleView: null,
          line: pos.line || positionInfo.line,
          spillsTo: positionInfo.spillsTo,
          parentPosition: pos.parentPosition ?? positionInfo.parentPosition,
          activationId: pos.activationId || 0,
          activationCycleNumber: pos.activationCycleNumber || 0,
          isMirrorActivation: !!pos.isMirrorActivation,
          payoutReceipts: [],
          payoutReceiptSummary: {
            count: Number(pos.receiptTotals?.count || 0),
            gross: Number(pos.receiptTotals?.gross || 0),
            escrow: Number(pos.receiptTotals?.escrowLocked || 0),
            liquid: Number(pos.receiptTotals?.liquidPaid || 0),
            founderPathGross: Number(pos.receiptTotals?.founderPathGross || 0),
            directOwnerGross: Number(pos.receiptTotals?.directOwnerGross || 0),
            routedSpilloverGross: Number(pos.receiptTotals?.routedSpilloverGross || 0),
            recycleGross: Number(pos.receiptTotals?.recycleGross || 0)
          },
          viewerReceipts: [],
          viewerReceiptBreakdown: {
            count: Number(pos.viewerReceiptBreakdown?.count || 0),
            totalGross: Number(pos.viewerReceiptBreakdown?.totalGross || 0),
            totalLiquid: Number(pos.viewerReceiptBreakdown?.totalLiquid || 0),
            totalEscrow: Number(pos.viewerReceiptBreakdown?.totalEscrow || 0),
            directOwnerGross: Number(pos.viewerReceiptBreakdown?.directOwnerGross || 0),
            directOwnerLiquid: Number(pos.viewerReceiptBreakdown?.directOwnerLiquid || 0),
            directOwnerEscrow: Number(pos.viewerReceiptBreakdown?.directOwnerEscrow || 0),
            routedSpilloverGross: Number(pos.viewerReceiptBreakdown?.routedSpilloverGross || 0),
            routedSpilloverLiquid: Number(pos.viewerReceiptBreakdown?.routedSpilloverLiquid || 0),
            routedSpilloverEscrow: Number(pos.viewerReceiptBreakdown?.routedSpilloverEscrow || 0),
            founderPathGross: Number(pos.viewerReceiptBreakdown?.founderPathGross || 0),
            founderPathLiquid: Number(pos.viewerReceiptBreakdown?.founderPathLiquid || 0),
            founderPathEscrow: Number(pos.viewerReceiptBreakdown?.founderPathEscrow || 0),
            recycleGross: Number(pos.viewerReceiptBreakdown?.recycleGross || 0),
            recycleLiquid: Number(pos.viewerReceiptBreakdown?.recycleLiquid || 0),
            recycleEscrow: Number(pos.viewerReceiptBreakdown?.recycleEscrow || 0)
          },
          truthLabel: pos.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT'),
          receiptsHydrated: false,
          indexedEventCount: Number(pos.indexedEventCount || 0),
          indexedReceiptCount: Number(pos.indexedReceiptCount || 0),
          originalReferrer: resolvedReferrer,
          occupantReferrer: resolvedReferrer
        }
      }))

      const myPositions = positions.filter(p => p.occupantType === 'mine').map(p => p.number)
      const downlinePositions = positions
        .filter(p => p.occupantType === 'downline')
        .map(p => ({
          position: p.number,
          user: p.occupant,
          amount: p.amount,
          timestamp: Number(p.timestamp || 0) > 0 ? new Date(Number(p.timestamp) * 1000).toLocaleString() : '',
          level,
          activated: false,
          positionInfo: p.positionInfo
        }))

      const otherOccupants = positions
        .filter(p => p.occupantType === 'other')
        .map(p => ({
          position: p.number,
          user: p.occupant,
          amount: p.amount,
          timestamp: Number(p.timestamp || 0) > 0 ? new Date(Number(p.timestamp) * 1000).toLocaleString() : '',
          level,
          positionInfo: p.positionInfo,
          originalReferrer: ethers.ZeroAddress
        }))

      const structuralLinks = positions
        .filter((p) => p.parentPosition && p.occupant)
        .map((p) => ({ from: p.number, to: p.parentPosition, user: p.occupant, amount: p.amount }))

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
        linePaymentCounts: lineCounts,
        receiptCount: positions.reduce((sum, p) => sum + Number(p.payoutReceiptSummary?.count || 0), 0)
      }

      setOrbitData(prev => ({ ...prev, [level]: levelData }))
      setUserLocks(prev => ({ ...prev, [level]: snapshot.lockedForNextLevel || '0' }))
      setDownlineData(prev => ({ ...prev, [level]: downlinePositions }))
      setSpilloverData(prev => ({ ...prev, [level]: otherOccupants }))
      setLinePaymentCountsByLevel(prev => ({ ...prev, [level]: lineCounts }))
      storeRef.current.loadedLevels.add(fetchKey)
    } catch (err) {
      console.error(`Orbit backend sync error for level ${level}:`, err)
      setOrbitError(err.message || t('orbits.loadFailed'))
    } finally {
      storeRef.current.loadingLevels.delete(fetchKey)
      setLoadingLevelsMap(prev => ({ ...prev, [level]: false }))
      if (!silent) setIsLoadingOrbits(false)
    }
  }, [resolveOccupantReferrer, t, viewAddress])

  const hydrateLivePositionDetails = useCallback(async (level, position) => {
    if (!viewAddress || !ethers.isAddress(viewAddress) || !position) return position
    const positionNumber = Number(position?.number || 0)
    if (!positionNumber) return position

    const cacheKey = `${viewAddress.toLowerCase()}-${level}-${positionNumber}`
    if (position?.receiptsHydrated) {
      storeRef.current.positionDetailsCache.set(cacheKey, position)
      return position
    }

    if (storeRef.current.positionDetailsCache.has(cacheKey)) return storeRef.current.positionDetailsCache.get(cacheKey)
    if (storeRef.current.positionHydrationPromises.has(cacheKey)) return await storeRef.current.positionHydrationPromises.get(cacheKey)

    const promise = (async () => {
      const details = await fetchOrbitPositionDetailsApi(viewAddress, level, positionNumber)
      const orbitType = details?.orbitType || levelToOrbitType[level]
      const occupant = details?.occupant || null
      const resolvedReferrer = await resolveOccupantReferrer(occupant, details)
      const classificationSource = { ...details, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer }
      const occupantType = deriveOccupantType(occupant, viewAddress, classificationSource)

      const normalizedRuleView = details.ruleView ? {
        ...details.ruleView,
        toOwner: Number(details.ruleView.toOwner || 0),
        toSpillover1: Number(details.ruleView.toSpillover1 || 0),
        toSpillover2: Number(details.ruleView.toSpillover2 || 0),
        toEscrow: Number(details.ruleView.toEscrow || 0),
        toRecycle: Number(details.ruleView.toRecycle || 0)
      } : null

      const positionInfo = buildPositionInfoFromRuleView(orbitType, positionNumber, level, normalizedRuleView, viewAddress)
      const payoutReceipts = Array.isArray(details.indexedReceipts) ? details.indexedReceipts.map((receipt) => ({
        ...receipt,
        activationId: Number(receipt.activationId || 0),
        receiptType: Number(receipt.receiptType || 0),
        level: Number(receipt.level || 0),
        sourcePosition: Number(receipt.sourcePosition || 0),
        sourceCycle: Number(receipt.sourceCycle || 0),
        mirroredPosition: Number(receipt.mirroredPosition || 0),
        mirroredCycle: Number(receipt.mirroredCycle || 0),
        routedRole: Number(receipt.routedRole || 0),
        grossAmount: Number(receipt.grossAmount || 0),
        escrowLocked: Number(receipt.escrowLocked || 0),
        liquidPaid: Number(receipt.liquidPaid || 0)
      })) : []

      const viewerReceipts = payoutReceipts.filter((receipt) => (receipt.receiver || '').toLowerCase() === viewAddress.toLowerCase())

      const hydrated = {
        ...position,
        ...details,
        level,
        orbitType,
        occupantType,
        occupant,
        amount: details.amount || '0',
        timestamp: Number(details.timestamp || 0),
        positionInfo,
        ruleView: normalizedRuleView,
        line: details.line || positionInfo.line,
        spillsTo: positionInfo.spillsTo,
        parentPosition: details.parentPosition ?? positionInfo.parentPosition,
        activationId: Number(details.activationId || 0),
        activationCycleNumber: Number(details.activationCycleNumber || 0),
        isMirrorActivation: !!details.isMirrorActivation,
        payoutReceipts,
        payoutReceiptSummary: {
          count: Number(details.receiptTotals?.count || 0),
          gross: Number(details.receiptTotals?.gross || 0),
          escrow: Number(details.receiptTotals?.escrowLocked || 0),
          liquid: Number(details.receiptTotals?.liquidPaid || 0),
          founderPathGross: Number(details.receiptTotals?.founderPathGross || 0),
          directOwnerGross: Number(details.receiptTotals?.directOwnerGross || 0),
          routedSpilloverGross: Number(details.receiptTotals?.routedSpilloverGross || 0),
          recycleGross: Number(details.receiptTotals?.recycleGross || 0)
        },
        viewerReceipts,
        viewerReceiptBreakdown: {
          count: Number(details.viewerReceiptBreakdown?.count || 0),
          totalGross: Number(details.viewerReceiptBreakdown?.totalGross || 0),
          totalLiquid: Number(details.viewerReceiptBreakdown?.totalLiquid || 0),
          totalEscrow: Number(details.viewerReceiptBreakdown?.totalEscrow || 0),
          directOwnerGross: Number(details.viewerReceiptBreakdown?.directOwnerGross || 0),
          directOwnerLiquid: Number(details.viewerReceiptBreakdown?.directOwnerLiquid || 0),
          directOwnerEscrow: Number(details.viewerReceiptBreakdown?.directOwnerEscrow || 0),
          routedSpilloverGross: Number(details.viewerReceiptBreakdown?.routedSpilloverGross || 0),
          routedSpilloverLiquid: Number(details.viewerReceiptBreakdown?.routedSpilloverLiquid || 0),
          routedSpilloverEscrow: Number(details.viewerReceiptBreakdown?.routedSpilloverEscrow || 0),
          founderPathGross: Number(details.viewerReceiptBreakdown?.founderPathGross || 0),
          founderPathLiquid: Number(details.viewerReceiptBreakdown?.founderPathLiquid || 0),
          founderPathEscrow: Number(details.viewerReceiptBreakdown?.founderPathEscrow || 0),
          recycleGross: Number(details.viewerReceiptBreakdown?.recycleGross || 0),
          recycleLiquid: Number(details.viewerReceiptBreakdown?.recycleLiquid || 0),
          recycleEscrow: Number(details.viewerReceiptBreakdown?.recycleEscrow || 0)
        },
        truthLabel: details.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT'),
        indexedEvents: Array.isArray(details.indexedEvents) ? details.indexedEvents : [],
        indexedEventCount: Number(details.indexedEventCount || 0),
        indexedReceiptCount: Number(details.indexedReceiptCount || 0),
        receiptsHydrated: true,
        originalReferrer: resolvedReferrer,
        occupantReferrer: resolvedReferrer
      }

      storeRef.current.positionDetailsCache.set(cacheKey, hydrated)
      setOrbitData(prev => {
        const levelData = prev[level]
        if (!levelData?.positions) return prev
        return {
          ...prev,
          [level]: {
            ...levelData,
            positions: levelData.positions.map((item) => item.number === positionNumber ? hydrated : item)
          }
        }
      })
      return hydrated
    })()

    storeRef.current.positionHydrationPromises.set(cacheKey, promise)
    try {
      return await promise
    } finally {
      storeRef.current.positionHydrationPromises.delete(cacheKey)
    }
  }, [resolveOccupantReferrer, viewAddress])

  const hydrateHistoricalPositionDetails = useCallback(async (level, cycleNumber, position) => {
    if (!viewAddress || !ethers.isAddress(viewAddress) || !position) return position
    const positionNumber = Number(position?.number || 0)
    const numericCycle = Number(cycleNumber || 0)
    if (!positionNumber || !numericCycle) return position

    const cacheKey = `${viewAddress.toLowerCase()}-${level}-${numericCycle}-${positionNumber}-historical`
    if (position?.receiptsHydrated) {
      storeRef.current.positionDetailsCache.set(cacheKey, position)
      return position
    }
    if (storeRef.current.positionDetailsCache.has(cacheKey)) return storeRef.current.positionDetailsCache.get(cacheKey)
    if (storeRef.current.positionHydrationPromises.has(cacheKey)) return await storeRef.current.positionHydrationPromises.get(cacheKey)

    const promise = (async () => {
      const cycleSnapshot = await fetchOrbitCycleSnapshotApi(viewAddress, level, numericCycle)
      const details = Array.isArray(cycleSnapshot?.positions) ? cycleSnapshot.positions.find((item) => Number(item.number) === positionNumber) : null
      if (!details) return position

      const orbitType = details?.orbitType || levelToOrbitType[level]
      const occupant = details?.occupant || null
      const resolvedReferrer = await resolveOccupantReferrer(occupant, details)
      const classificationSource = { ...details, originalReferrer: resolvedReferrer, occupantReferrer: resolvedReferrer }
      const occupantType = deriveOccupantType(occupant, viewAddress, classificationSource)

      const normalizedRuleView = details.ruleView ? {
        ...details.ruleView,
        toOwner: Number(details.ruleView.toOwner || 0),
        toSpillover1: Number(details.ruleView.toSpillover1 || 0),
        toSpillover2: Number(details.ruleView.toSpillover2 || 0),
        toEscrow: Number(details.ruleView.toEscrow || 0),
        toRecycle: Number(details.ruleView.toRecycle || 0)
      } : null

      const positionInfo = buildPositionInfoFromRuleView(orbitType, positionNumber, level, normalizedRuleView, viewAddress)
      const payoutReceipts = Array.isArray(details.indexedReceipts) ? details.indexedReceipts.map((receipt) => ({
        ...receipt,
        activationId: Number(receipt.activationId || 0),
        receiptType: Number(receipt.receiptType || 0),
        level: Number(receipt.level || 0),
        sourcePosition: Number(receipt.sourcePosition || 0),
        sourceCycle: Number(receipt.sourceCycle || 0),
        mirroredPosition: Number(receipt.mirroredPosition || 0),
        mirroredCycle: Number(receipt.mirroredCycle || 0),
        routedRole: Number(receipt.routedRole || 0),
        grossAmount: Number(receipt.grossAmount || 0),
        escrowLocked: Number(receipt.escrowLocked || 0),
        liquidPaid: Number(receipt.liquidPaid || 0)
      })) : []

      const viewerReceipts = payoutReceipts.filter((receipt) => (receipt.receiver || '').toLowerCase() === viewAddress.toLowerCase())

      const hydrated = {
        ...position,
        ...details,
        level,
        cycleNumber: numericCycle,
        isHistoricalPosition: true,
        orbitType,
        occupantType,
        occupant,
        amount: details.amount || '0',
        timestamp: Number(details.timestamp || 0),
        positionInfo,
        ruleView: normalizedRuleView,
        line: details.line || positionInfo.line,
        spillsTo: positionInfo.spillsTo,
        parentPosition: details.parentPosition ?? positionInfo.parentPosition,
        activationId: Number(details.activationId || 0),
        activationCycleNumber: Number(details.activationCycleNumber || 0),
        isMirrorActivation: !!details.isMirrorActivation,
        payoutReceipts,
        payoutReceiptSummary: {
          count: Number(details.receiptTotals?.count || 0),
          gross: Number(details.receiptTotals?.gross || 0),
          escrow: Number(details.receiptTotals?.escrowLocked || 0),
          liquid: Number(details.receiptTotals?.liquidPaid || 0),
          founderPathGross: Number(details.receiptTotals?.founderPathGross || 0),
          directOwnerGross: Number(details.receiptTotals?.directOwnerGross || 0),
          routedSpilloverGross: Number(details.receiptTotals?.routedSpilloverGross || 0),
          recycleGross: Number(details.receiptTotals?.recycleGross || 0)
        },
        viewerReceipts,
        viewerReceiptBreakdown: {
          count: Number(details.viewerReceiptBreakdown?.count || 0),
          totalGross: Number(details.viewerReceiptBreakdown?.totalGross || 0),
          totalLiquid: Number(details.viewerReceiptBreakdown?.totalLiquid || 0),
          totalEscrow: Number(details.viewerReceiptBreakdown?.totalEscrow || 0),
          directOwnerGross: Number(details.viewerReceiptBreakdown?.directOwnerGross || 0),
          directOwnerLiquid: Number(details.viewerReceiptBreakdown?.directOwnerLiquid || 0),
          directOwnerEscrow: Number(details.viewerReceiptBreakdown?.directOwnerEscrow || 0),
          routedSpilloverGross: Number(details.viewerReceiptBreakdown?.routedSpilloverGross || 0),
          routedSpilloverLiquid: Number(details.viewerReceiptBreakdown?.routedSpilloverLiquid || 0),
          routedSpilloverEscrow: Number(details.viewerReceiptBreakdown?.routedSpilloverEscrow || 0),
          founderPathGross: Number(details.viewerReceiptBreakdown?.founderPathGross || 0),
          founderPathLiquid: Number(details.viewerReceiptBreakdown?.founderPathLiquid || 0),
          founderPathEscrow: Number(details.viewerReceiptBreakdown?.founderPathEscrow || 0),
          recycleGross: Number(details.viewerReceiptBreakdown?.recycleGross || 0),
          recycleLiquid: Number(details.viewerReceiptBreakdown?.recycleLiquid || 0),
          recycleEscrow: Number(details.viewerReceiptBreakdown?.recycleEscrow || 0)
        },
        truthLabel: details.truthLabel || (occupant ? 'UNKNOWN' : 'NO_RECEIPT'),
        indexedEvents: Array.isArray(details.indexedEvents) ? details.indexedEvents : [],
        indexedEventCount: Number(details.indexedEventCount || 0),
        indexedReceiptCount: Number(details.indexedReceiptCount || 0),
        receiptsHydrated: true,
        originalReferrer: resolvedReferrer,
        occupantReferrer: resolvedReferrer
      }

      storeRef.current.positionDetailsCache.set(cacheKey, hydrated)
      setCycleHistoryData(prev => ({
        ...prev,
        [level]: {
          ...(prev[level] || {}),
          [String(numericCycle)]: (prev[level]?.[String(numericCycle)] || []).map(item => item.number === positionNumber ? hydrated : item)
        }
      }))
      return hydrated
    })()

    storeRef.current.positionHydrationPromises.set(cacheKey, promise)
    try {
      return await promise
    } finally {
      storeRef.current.positionHydrationPromises.delete(cacheKey)
    }
  }, [resolveOccupantReferrer, viewAddress])

  const fetchAllOrbitData = useCallback(async (forceRefresh = false) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    const match = activeTab?.match(/^level(\d+)$/)
    const currentLevel = match ? Number(match[1]) : 1

    if (forceRefresh) {
      const lowerView = viewAddress.toLowerCase()
      Array.from(storeRef.current.loadedLevels).forEach((key) => {
        if (key.startsWith(`${lowerView}-`)) {
          storeRef.current.loadedLevels.delete(key)
        }
      })
    }

    await fetchOrbitLevelData(currentLevel, { forceRefresh, silent: false })
  }, [activeTab, contracts, fetchOrbitLevelData, viewAddress])

  const didViewerEarnPayment = useCallback((receiver, amount) => {
    if (!account || !viewAddress) return false
    const receiverLower = receiver.toLowerCase()
    const viewerLower = viewAddress.toLowerCase()
    const accountLower = account.toLowerCase()
    return (receiverLower === viewerLower || receiverLower === accountLower) && amount > 0
  }, [account, viewAddress])

  const getViewerReceiptsForPosition = useCallback((position) => {
    if (!position?.payoutReceipts || !Array.isArray(position.payoutReceipts)) return []
    const viewerLower = (viewAddress || '').toLowerCase()
    if (!viewerLower) return []
    return position.payoutReceipts.filter((receipt) => (receipt?.receiver || ethers.ZeroAddress).toLowerCase() === viewerLower)
  }, [viewAddress])

  const getViewerReceiptBreakdownForPosition = useCallback((position) => {
    return summarizeViewerReceipts(getViewerReceiptsForPosition(position))
  }, [getViewerReceiptsForPosition])

  const getPlanetBadgeValue = useCallback((position) => {
    if (!position?.occupant) return 0
    if (receiptsSupported && position.viewerReceiptBreakdown) return Number(position.viewerReceiptBreakdown.totalLiquid || 0)
    return Number(position?.positionInfo?.exactToOwner || 0)
  }, [receiptsSupported])

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
        if (!prev || prev.number !== position.number || Number(prev.level || 0) !== level) return prev
        return { ...hydrated, detailsLoading: false }
      })
    } catch (err) {
      console.error(`Failed to hydrate position ${position?.number} on level ${level}:`, err)
      setSelectedPosition(prev => prev ? { ...prev, detailsLoading: false } : prev)
    }
  }, [activeTab, hydrateHistoricalPositionDetails, hydrateLivePositionDetails, selectedCycleByLevel])

  const handleStructuralPreview = useCallback((position) => {
    if (position.parentPosition) {
      setShowStructuralPreview(true)
      setTimeout(() => setShowStructuralPreview(false), 2000)
    }
  }, [])

  const refreshData = useCallback(async () => {
    if (!viewAddress || !ethers.isAddress(viewAddress)) return
    setIsRefreshing(true)
    try {
      storeRef.current.activationReceiptCache.clear()
      storeRef.current.positionDetailsCache.clear()
      storeRef.current.positionHydrationPromises.clear()
      storeRef.current.receiptCache.delete(`${viewAddress.toLowerCase()}-backend-receipts`)
      storeRef.current.viewedLevelsCache.delete(viewAddress.toLowerCase())

      await fetchViewedLevels(true)
      await fetchViewedAddressReceipts(true)
      await fetchAllOrbitData(true)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchAllOrbitData, fetchViewedAddressReceipts, fetchViewedLevels, viewAddress])

  const applyViewerAddress = useCallback(() => {
    if (!inputAddress || !ethers.isAddress(inputAddress)) {
      setOrbitError(t('orbits.enterValidAddress'))
      return
    }

    setOrbitError('')
    const normalized = ethers.getAddress(inputAddress)
    storeRef.current.viewedLevelsCache.delete(normalized.toLowerCase())
    storeRef.current.receiptCache.delete(normalized.toLowerCase())
    storeRef.current.activationReceiptCache.clear()

    setInputAddress(normalized)
    setViewAddress(normalized)
    setViewMode('global')
    setSelectedCycleByLevel({})
    setCycleHistoryData({})
    setCycleHistorySupportByLevel({})
    setViewAddressReceipts([])
    setReceiptBucketsByLevel({})
    storeRef.current.cycleHistoryCache.clear()
  }, [inputAddress, t])

  const viewMyOrbit = useCallback(() => {
    if (!account) return
    storeRef.current.viewedLevelsCache.delete(account.toLowerCase())
    storeRef.current.receiptCache.delete(account.toLowerCase())
    storeRef.current.activationReceiptCache.clear()

    setOrbitError('')
    setInputAddress(account)
    setViewAddress(account)
    setViewMode('global')
    setSelectedCycleByLevel({})
    setCycleHistoryData({})
    setCycleHistorySupportByLevel({})
    setViewAddressReceipts([])
    setReceiptBucketsByLevel({})
    storeRef.current.cycleHistoryCache.clear()
  }, [account])

  const getHighestViewedActiveLevel = useCallback(() => {
    const activeLevels = Object.keys(viewedLevels).filter(level => viewedLevels[level]).map(Number).sort((a, b) => b - a)
    return activeLevels[0] || 0
  }, [viewedLevels])

  useEffect(() => {
    if (account && !viewAddress) {
      setViewAddress(account)
      setInputAddress(account)
    }
  }, [account, viewAddress])

  useEffect(() => {
    const updateSize = () => {
      if (galaxyRef.current) {
        const { width, height } = galaxyRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) {
          setContainerSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }))
        }
      }
    }

    const timer = setTimeout(updateSize, 120)
    window.addEventListener('resize', updateSize)

    if (window.ResizeObserver && !resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(updateSize)
    }
    if (resizeObserverRef.current && galaxyRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current.observe(galaxyRef.current)
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateSize)
    }
  }, [activeTab])

  useEffect(() => {
    storeRef.current.loadedLevels.clear()
    storeRef.current.loadingLevels.clear()
    storeRef.current.activationReceiptCache.clear()
    storeRef.current.positionDetailsCache.clear()
    storeRef.current.positionHydrationPromises.clear()
    fetchIdRef.current += 1
    setOrbitData({})
    setUserLocks({})
    setDownlineData({})
    setSpilloverData({})
    setLinePaymentCountsByLevel({})
    setCycleHistoryData({})
    setSelectedCycleByLevel({})
    setLoadingCycleByLevel({})
    setCycleHistorySupportByLevel({})
    setLoadingLevelsMap({})
    setIsLoadingOrbits(true)
  }, [viewAddress])

  useEffect(() => {
    if (contracts && viewAddress && ethers.isAddress(viewAddress)) fetchViewedLevels(true)
  }, [contracts, fetchViewedLevels, viewAddress])

  useEffect(() => {
    if (contracts && viewAddress && ethers.isAddress(viewAddress)) fetchAllOrbitData()
  }, [contracts, fetchAllOrbitData, viewAddress])

  useEffect(() => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    const match = activeTab?.match(/^level(\d+)$/)
    if (!match) return
    const level = Number(match[1])
    const fetchKey = `${viewAddress.toLowerCase()}-${level}`
    if (!storeRef.current.loadedLevels.has(fetchKey)) {
      fetchOrbitLevelData(level, { silent: false })
    }
  }, [activeTab, contracts, fetchOrbitLevelData, viewAddress])

  useEffect(() => {
    const match = activeTab?.match(/^level(\d+)$/)
    if (!match) return
    const level = Number(match[1])
    const selectedCycle = selectedCycleByLevel[level] || 'current'
    if (selectedCycle !== 'current') loadCycleHistoryForLevel(level, Number(selectedCycle))
  }, [activeTab, loadCycleHistoryForLevel, selectedCycleByLevel])

  useEffect(() => {
    if (isConnected) loadContracts().catch(console.error)
  }, [isConnected, loadContracts])

  useEffect(() => {
    if (viewAddress && ethers.isAddress(viewAddress)) fetchViewedAddressReceipts(true)
  }, [fetchViewedAddressReceipts, viewAddress])

  if (!isConnected) {
    return (
      <Container className="mt-5 pt-5">
        <style>{orbitStyles}</style>
        <Alert variant="primary" className="text-center p-5 lab-card shadow-lg" style={{ backgroundColor: '#002366', color: 'white', border: 'none' }}>
          <h4 className="fw-bold">{t('orbits.connectTitle')}</h4>
          <p className="m-0 opacity-75">{t('orbits.connectText')}</p>
        </Alert>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container className="mt-5 text-center">
        <style>{orbitStyles}</style>
        <Spinner animation="grow" variant="primary" />
        <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>{t('orbits.syncing')}</p>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="mt-5">
        <style>{orbitStyles}</style>
        <Alert variant="danger" className="lab-card shadow-sm border-0">
          <strong>{t('orbits.panelError')}:</strong> {error}
        </Alert>
      </Container>
    )
  }

  if (orbitError) {
    return (
      <Container className="mt-5">
        <style>{orbitStyles}</style>
        <Alert variant="danger" className="lab-card shadow-sm border-0">
          <strong className="text-danger">{t('orbits.systemAlert')}:</strong> {orbitError}
        </Alert>
      </Container>
    )
  }

  if (isLoadingOrbits) {
    return (
      <Container className="mt-5 pt-4">
        <style>{orbitStyles}</style>
        <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
          <div className="d-flex align-items-center">
            <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px' }}></div>
            <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
              {t('orbits.pageTitle')}
            </h1>
          </div>
        </div>

        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 fw-bold text-muted">{t('orbits.loading')}</p>
        </div>
      </Container>
    )
  }

  const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
  const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
  const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()
  const highestViewedActiveLevel = getHighestViewedActiveLevel()

  return (
    <Container className="mt-5 pt-4">
      <style>{orbitStyles}</style>

      <OrbitPositionModal
        t={t}
        show={showPositionModal}
        onHide={() => setShowPositionModal(false)}
        selectedPosition={selectedPosition}
        isViewingSelf={isViewingSelf}
        receiptsSupported={receiptsSupported}
        shortAddress={shortAddress}
        getNetAmount={getNetAmount}
        formatUsdtDisplay={formatUsdtDisplay}
        getDisplayPositionType={getDisplayPositionType}
        didViewerEarnPayment={didViewerEarnPayment}
      />

      <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
        <div className="d-flex align-items-center">
          <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px', borderRadius: '8px' }}></div>
          <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
            {t('orbits.pageTitle')}
          </h1>

          <div className="view-toggle">
            <Button variant={viewMode === 'global' ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setViewMode('global')} className={viewMode === 'global' ? 'active' : ''}>
              {t('orbits.orbitView')}
            </Button>
            <Button variant={viewMode === 'downline' ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setViewMode('downline')} className={viewMode === 'downline' ? 'active' : ''}>
              {t('orbits.downlineView')}
              {totalDownline > 0 && <Badge bg="warning" className="ms-1">{totalDownline}</Badge>}
              {totalSpillover > 0 && <Badge bg="info" className="ms-1">{totalSpillover} orbit</Badge>}
            </Button>
          </div>
        </div>

        <div className="d-flex align-items-center">
          <span className="text-muted small me-3">{t('orbits.lastSync')}: {lastUpdated}</span>
          <Button variant="link" className="refresh-button" onClick={refreshData} disabled={isRefreshing || !viewAddress || !ethers.isAddress(viewAddress)}>
            {isRefreshing ? t('orbits.refreshing') : t('orbits.refresh')}
          </Button>
        </div>
      </div>

      <div className="lab-card p-3 mb-4">
        <Row className="align-items-end g-3">
          <Col lg={8}>
            <Form.Group>
              <Form.Label className="fw-bold small text-uppercase text-muted">{t('orbits.addressToView')}</Form.Label>
              <Form.Control type="text" value={inputAddress} onChange={(e) => setInputAddress(e.target.value)} placeholder="0x..." />
              <div className="small text-muted mt-2">
                {t('orbits.currentlyViewing')} {viewAddress ? `${viewAddress.slice(0, 8)}...${viewAddress.slice(-6)}` : t('orbits.noAddressSelected')}
                {isViewingSelf && ` ${t('orbits.yourWallet')}`}
              </div>
              <div className="small text-muted mt-1">Receipt support: {receiptsSupported ? 'ON' : 'OFF'}</div>
            </Form.Group>
          </Col>
          <Col lg={4}>
            <div className="d-flex gap-2">
              <Button onClick={applyViewerAddress} disabled={!inputAddress || !ethers.isAddress(inputAddress)}>{t('orbits.loadAddress')}</Button>
              <Button variant="outline-secondary" onClick={viewMyOrbit} disabled={!account}>{t('orbits.viewMine')}</Button>
            </div>
          </Col>
        </Row>
      </div>

      <div className="color-legend">
        <div className="legend-item"><div className="legend-color green"></div><span><strong>{t('orbits.legendViewedOwner')}</strong></span></div>
        <div className="legend-item"><div className="legend-color orange"></div><span><strong>{t('orbits.legendDirectDownline')}</strong></span></div>
        <div className="legend-item"><div className="legend-color blue"></div><span><strong>{t('orbits.legendOtherUser')}</strong></span></div>
        <div className="legend-item"><div className="legend-color gold"></div><span><strong>STRUCTURAL PARENT LINK</strong></span></div>
        <div className="legend-item"><div className="legend-color red"></div><span><strong>{t('orbits.legendEmpty')}</strong></span></div>
        <div className="legend-item"><div className="legend-color gray"></div><span><strong>{t('orbits.legendInactive')}</strong></span></div>
      </div>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 border-0">
        {[1,2,3,4,5,6,7,8,9,10].map((level) => {
          const data = orbitData[level]
          const orbitType = data?.orbitType || levelToOrbitType[level]
          const config = data?.config || orbitTypeConfig[orbitType]
          const positions = data?.positions || []
          const currentIndex = data?.currentIndex || 1
          const autoUpgradeCompleted = !!data?.autoUpgradeCompleted
          const totalCycles = Number(data?.totalCycles || 0)
          const downlineAtLevel = downlineData[level] || []
          const spilloverAtLevel = spilloverData[level] || []
          const levelInfo = levelConfig[level]
          const isLevelActive = !!viewedLevels[level]
          const isLevelLoaded = !!data
          const isLevelLoading = !!loadingLevelsMap[level]

          if (!isLevelLoaded) {
            return (
              <Tab
                key={level}
                eventKey={`level${level}`}
                title={<span>Level {level} ({orbitType}) {!isLevelActive && <Badge bg="secondary" className="ms-2">{t('orbits.inactive')}</Badge>} {isLevelLoading && <Badge bg="primary" className="ms-2">Loading</Badge>}</span>}
              >
                <div className="lab-card mb-4 p-4 text-center">
                  <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 220 }}>
                    {activeTab === `level${level}` && isLevelLoading ? (
                      <>
                        <Spinner animation="border" className="mb-3" />
                        <div className="fw-bold">Loading Level {level} ({orbitType})...</div>
                        <div className="text-muted small mt-2">This level is fetched only when you open its tab.</div>
                      </>
                    ) : (
                      <>
                        <div className="fw-bold">Level {level} ({orbitType})</div>
                        <div className="text-muted small mt-2">Open this tab to load its data.</div>
                      </>
                    )}
                  </div>
                </div>
              </Tab>
            )
          }

          const totalCompletedCycles = Number(totalCycles || 0)
          const availableCycleNumbers = Array.from({ length: totalCompletedCycles }, (_, idx) => idx + 1)
          const selectedCycle = selectedCycleByLevel[level] || 'current'
          const isHistoricalView = selectedCycle !== 'current'
          const historicalPositions = (cycleHistoryData[level]?.[String(selectedCycle)] || []).map(pos => ({ ...pos, level }))
          const displayedPositions = isHistoricalView ? historicalPositions : positions
          const positionsByLine = {}
          displayedPositions.forEach(pos => {
            const line = pos.line
            if (!positionsByLine[line]) positionsByLine[line] = []
            positionsByLine[line].push(pos)
          })

          const filledCountForDisplay = displayedPositions.filter(p => p.occupant).length
          const currentIndexForDisplay = isHistoricalView ? Math.min(filledCountForDisplay, config.positions) : (currentIndex || 1)
          const shouldShowAutoUpgradePanel = isLevelActive && level < 10 && level === highestViewedActiveLevel
          const isLoadingCycleHistory = !!loadingCycleByLevel[level]
          const hasCycleSupport = cycleHistorySupportByLevel[level]
          const showCycleButtons = totalCompletedCycles > 0
          const lineCounts = linePaymentCountsByLevel[level] || data.linePaymentCounts || { line1: 0, line2: 0, line3: 0 }

          return (
            <Tab
              key={level}
              eventKey={`level${level}`}
              title={<span>Level {level} ({data.orbitType}) {!isLevelActive && <Badge bg="secondary" className="ms-2">{t('orbits.inactive')}</Badge>} {downlineAtLevel.length > 0 && <Badge bg="warning" className="ms-2">{downlineAtLevel.length}</Badge>} {spilloverAtLevel.length > 0 && <Badge bg="info" className="ms-2">{spilloverAtLevel.length}s</Badge>} {autoUpgradeCompleted && <Badge bg="success" className="ms-2">{t('orbits.upgraded')}</Badge>}</span>}
            >
              <Row>
                <Col lg={8}>
                  <div className="lab-card mb-4">
                    <div className="orbit-header d-flex justify-content-between align-items-center">
                      <span>
                        Level {level} ({data.orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}
                        {totalCycles > 0 && <span className="cycle-badge ms-3">{t('orbits.cycle', { count: Number(totalCycles) + 1 })}</span>}
                        {isHistoricalView && <span className="history-indicator">Viewing Cycle {selectedCycle}</span>}
                      </span>
                      <div>
                        {!isLevelActive && <Badge bg="secondary" className="me-2">{t('orbits.inactiveLevel')}</Badge>}
                        {downlineAtLevel.length > 0 && <Badge bg="warning" className="me-2">{t('orbits.downlineCount', { count: downlineAtLevel.length })}</Badge>}
                        {spilloverAtLevel.length > 0 && <Badge bg="info" className="me-2">{t('orbits.orbitCount', { count: spilloverAtLevel.length })}</Badge>}
                        <Badge bg="info">{currentIndexForDisplay}/{config.positions} filled</Badge>
                      </div>
                    </div>

                    <div className="p-4">
                      {showCycleButtons && (
                        <div className="cycle-switcher-wrap">
                          <span className="cycle-switcher-label">Cycle View</span>
                          <Button variant={selectedCycle === 'current' ? 'primary' : 'outline-secondary'} size="sm" className={`cycle-switcher-btn ${selectedCycle === 'current' ? 'active' : ''}`} onClick={() => setSelectedCycleByLevel(prev => ({ ...prev, [level]: 'current' }))}>Current</Button>
                          {availableCycleNumbers.map(cycleNumber => (
                            <Button
                              key={`cycle-btn-${level}-${cycleNumber}`}
                              variant={selectedCycle === cycleNumber ? 'primary' : 'outline-secondary'}
                              size="sm"
                              className={`cycle-switcher-btn ${selectedCycle === cycleNumber ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedCycleByLevel(prev => ({ ...prev, [level]: cycleNumber }))
                                loadCycleHistoryForLevel(level, cycleNumber)
                              }}
                            >Cycle {cycleNumber}</Button>
                          ))}
                        </div>
                      )}

                      {showCycleButtons && isLoadingCycleHistory && <div className="cycle-history-note">Loading cycle history...</div>}
                      {showCycleButtons && !isLoadingCycleHistory && isHistoricalView && hasCycleSupport === false && <div className="cycle-history-note">Stored cycle history is not available from this orbit contract build or ABI yet for this level.</div>}
                      {showCycleButtons && !isLoadingCycleHistory && availableCycleNumbers.length > 0 && !isHistoricalView && <div className="cycle-history-note">You can switch between the live orbit and any completed previous cycle for this level.</div>}

                      <OrbitGalaxy
                        t={t}
                        level={level}
                        data={{ ...data, spilloverFromPositions: isHistoricalView ? [] : data.spilloverFromPositions }}
                        orbitType={orbitType}
                        config={config}
                        positionsByLine={positionsByLine}
                        lineCounts={lineCounts}
                        isLevelActive={isLevelActive}
                        isViewingSelf={isViewingSelf}
                        viewAddress={viewAddress}
                        hoveredPosition={hoveredPosition}
                        setHoveredPosition={setHoveredPosition}
                        showStructuralPreview={showStructuralPreview}
                        handleStructuralPreview={handleStructuralPreview}
                        handlePositionClick={handlePositionClick}
                        galaxyRef={galaxyRef}
                        activeTab={activeTab}
                        containerSize={containerSize}
                        getPlanetBadgeValue={getPlanetBadgeValue}
                        starConfig={starConfig}
                        shortAddress={shortAddress}
                        formatUsdtDisplay={formatUsdtDisplay}
                        getNetAmount={getNetAmount}
                        receiptsSupported={receiptsSupported}
                      />

                      {isHistoricalView && hasCycleSupport !== false && (
                        <div className="history-summary-card">
                          <div className="history-summary-row"><span className="history-summary-label">Viewing</span><span className="history-summary-value">Cycle {selectedCycle}</span></div>
                          <div className="history-summary-row"><span className="history-summary-label">Filled positions</span><span className="history-summary-value">{filledCountForDisplay}/{config.positions}</span></div>
                          <div className="history-summary-row"><span className="history-summary-label">History source</span><span className="history-summary-value">Stored cycle data</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                </Col>

                <Col lg={4}>
                  <div className="lab-card energy-cell h-100">
                    <div className="orbit-header">{t('orbits.escrowAutoUpgrade')}</div>
                    <div className="p-4 pulse-overlay">
                      {shouldShowAutoUpgradePanel && (
                        <>
                          <div className="small fw-bold text-muted text-uppercase mb-2">{t('orbits.lockedForLevel', { level: levelInfo.nextLevel })}</div>
                          <h3 className="fw-black mb-3" style={{ color: '#002366', fontFamily: 'monospace' }}>
                            {userLocks[level] || '0'} <span className="small text-muted">/ {levelInfo.upgradeReq} USDT</span>
                          </h3>
                          <ProgressBar now={((parseFloat(userLocks[level] || '0') / levelInfo.upgradeReq) * 100) || 0} variant="primary" className="mb-3" />
                          <div className="p-3 bg-light rounded-3 small fw-bold text-center">
                            {!isLevelActive ? (
                              <span className="text-secondary">{t('orbits.levelInactiveForAddress', { level })}</span>
                            ) : parseFloat(userLocks[level] || '0') >= levelInfo.upgradeReq ? (
                              autoUpgradeCompleted ? (
                                <span className="text-success">{t('orbits.levelAlreadyActivated', { level: levelInfo.nextLevel })}</span>
                              ) : (
                                <span className="text-success">{t('orbits.autoUpgradeReady', { level: levelInfo.nextLevel })}</span>
                              )
                            ) : (
                              t('orbits.needMoreUsdt', { amount: (levelInfo.upgradeReq - parseFloat(userLocks[level] || '0')).toFixed(1) })
                            )}
                          </div>
                          <hr className="my-4" />
                        </>
                      )}

                      <div className="small fw-bold text-muted text-uppercase mb-2">Total Earned From This Level</div>
                      <h4 className="fw-bold" style={{ color: '#28a745' }}>{data.totalEarned} USDT</h4>
                      <div className="earned-caption">This comes from the orbit contract totalEarned value.</div>

                      {viewMode === 'downline' && !isHistoricalView && (
                        <>
                          {downlineAtLevel.length > 0 && (
                            <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded-3">
                              <h6 className="fw-bold mb-2">{t('orbits.directDownlineAtLevel', { level })}</h6>
                              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {downlineAtLevel.map((d, idx) => (
                                  <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
                                    <div>
                                      <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>{shortAddress(d.user)}</span>
                                      <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
                                      <small className="text-muted d-block">{t('orbits.amountShort', { amount: d.amount })}</small>
                                    </div>
                                    <Badge bg="warning">Downline</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {spilloverAtLevel.length > 0 && (
                            <div className="mt-3 p-3 bg-info bg-opacity-10 rounded-3">
                              <h6 className="fw-bold mb-2">{t('orbits.otherParticipantsAtLevel', { level })}</h6>
                              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {spilloverAtLevel.map((d, idx) => (
                                  <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
                                    <div>
                                      <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>{shortAddress(d.user)}</span>
                                      <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
                                      <small className="text-muted d-block">
                                        Referrer: {d.originalReferrer && d.originalReferrer !== ethers.ZeroAddress ? shortAddress(d.originalReferrer) : 'N/A'}
                                      </small>
                                    </div>
                                    <Badge bg="info">Other occupant</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {downlineAtLevel.length === 0 && spilloverAtLevel.length === 0 && (
                            <div className="mt-4 p-3 bg-light rounded-3 text-center text-muted small">{t('orbits.noDownlineYet')}</div>
                          )}
                        </>
                      )}

                      {isHistoricalView && (
                        <div className="mt-4 p-3 bg-light rounded-3 text-muted small">
                          Historical cycle mode is active. The orbit view is showing the stored read-only positions for Cycle {selectedCycle}. Total earned remains the current live value for this level.
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </Tab>
          )
        })}
      </Tabs>
    </Container>
  )
}
